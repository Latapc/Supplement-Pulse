import { Supplement } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { formatDateToYYYYMMDD } from './dates';

export interface CalendarSyncEvent {
  id?: string;
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export interface SyncDosePlan {
  supplement: Supplement;
  profile: UserProfile;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  summary: string;
  description: string;
  durationMinutes: number;
}

/**
 * Generate calendar event proposals for the given supplements and profiles for the next N days
 */
export function generateDoseEventProposals(
  supplements: Supplement[],
  profiles: UserProfile[],
  daysAhead: number = 7
): SyncDosePlan[] {
  const profileMap = new Map<string, UserProfile>();
  profiles.forEach(p => profileMap.set(p.id, p));

  const plans: SyncDosePlan[] = [];
  const today = new Date();

  for (let offset = 0; offset < daysAhead; offset++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + offset);
    const dateStr = formatDateToYYYYMMDD(targetDate);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday...
    const dayOfMonth = targetDate.getDate();

    for (const supp of supplements) {
      if (supp.archived) continue;

      const profile = profileMap.get(supp.profileId || 'profile_self') || profiles[0];

      // Check if scheduled on this day
      let isScheduled = false;
      if (supp.frequencyType === 'daily') {
        isScheduled = true;
      } else if (supp.frequencyType === 'weekly') {
        if (supp.selectedDays && supp.selectedDays.includes(dayOfWeek as any)) {
          isScheduled = true;
        }
      } else if (supp.frequencyType === 'monthly') {
        if (supp.monthlyDayOfMonth === dayOfMonth) {
          isScheduled = true;
        }
      } else if (supp.frequencyType === 'interval') {
        isScheduled = true; // simplified interval
      }

      // Check cyclic config
      if (isScheduled && supp.cycleConfig?.isCyclic) {
        const cycleStart = new Date(supp.cycleConfig.cycleStartDate || supp.duration.startDate);
        const diffMs = targetDate.getTime() - cycleStart.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          const totalCycle = supp.cycleConfig.onDays + supp.cycleConfig.offDays;
          const posInCycle = diffDays % totalCycle;
          if (posInCycle >= supp.cycleConfig.onDays) {
            isScheduled = false; // In OFF phase!
          }
        }
      }

      if (isScheduled) {
        const timeStr = supp.doseTime || (
          supp.form === 'gummy' ? '08:30' :
          supp.notes?.toLowerCase().includes('bed') ? '21:30' :
          supp.notes?.toLowerCase().includes('lunch') ? '13:00' : '09:00'
        );

        const summary = `💊 Take ${supp.name} (${supp.doseAmount} ${supp.unit}) - ${profile.name}`;
        const description = [
          `Supplement Tracker Reminder`,
          `Profile: ${profile.name} (${profile.relation})`,
          `Dosage: ${supp.doseAmount} ${supp.unit} (${supp.form})`,
          supp.foodTiming ? `Instructions: ${supp.foodTiming.replace('_', ' ')}` : '',
          supp.notes ? `Regimen Note: ${supp.notes}` : '',
          `Managed via SuppleTrack`,
        ].filter(Boolean).join('\n');

        plans.push({
          supplement: supp,
          profile,
          dateStr,
          timeStr,
          summary,
          description,
          durationMinutes: 15,
        });
      }
    }
  }

  return plans;
}

/**
 * Fetch events from Google Calendar (primary)
 */
export async function fetchCalendarEvents(accessToken: string, daysAhead: number = 7): Promise<any[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&q=SuppleTrack`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a single dose event in Google Calendar
 */
export async function createCalendarEvent(accessToken: string, plan: SyncDosePlan): Promise<any> {
  const [hours, minutes] = plan.timeStr.split(':').map(Number);
  
  // Create localized start/end date
  const startDateTime = new Date(`${plan.dateStr}T${plan.timeStr}:00`);
  const endDateTime = new Date(startDateTime.getTime() + plan.durationMinutes * 60 * 1000);

  const body: CalendarSyncEvent = {
    summary: plan.summary,
    description: plan.description,
    start: {
      dateTime: startDateTime.toISOString(),
    },
    end: {
      dateTime: endDateTime.toISOString(),
    },
    colorId: plan.profile.calendarColorId || '10',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 0 },
      ],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create calendar event (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Bulk sync dose events to Google Calendar with rate-limit pacing
 */
export async function syncDosesToCalendar(
  accessToken: string,
  plans: SyncDosePlan[],
  onProgress?: (current: number, total: number) => void
): Promise<{ createdCount: number; errors: string[] }> {
  let createdCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < plans.length; i++) {
    try {
      await createCalendarEvent(accessToken, plans[i]);
      createdCount++;
      if (onProgress) {
        onProgress(createdCount, plans.length);
      }
      // Small 100ms pause to respect API quotas
      await new Promise(r => setTimeout(r, 100));
    } catch (e: any) {
      errors.push(`${plans[i].supplement.name} (${plans[i].dateStr}): ${e.message}`);
    }
  }

  return { createdCount, errors };
}
