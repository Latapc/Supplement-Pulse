import { Supplement, UserProfile } from '../types/supplement';

export interface CalendarEventSummary {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  profileId?: string;
  supplementId?: string;
}

/**
 * Fetch calendar events created by SuppleTrack
 */
export async function getSuppleTrackCalendarEvents(accessToken: string): Promise<CalendarEventSummary[]> {
  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('q', 'SuppleTrack');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('singleEvents', 'false'); // Return master recurring events

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Google Calendar authorization expired. Please sign in again.');
      }
      throw new Error(`Failed to load calendar events (HTTP ${res.status})`);
    }

    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => ({
      id: item.id,
      summary: item.summary || 'SuppleTrack Dose',
      description: item.description,
      start: item.start || {},
      end: item.end || {},
      htmlLink: item.htmlLink,
      profileId: item.extendedProperties?.private?.profileId,
      supplementId: item.extendedProperties?.private?.supplementId,
    }));
  } catch (err: any) {
    console.error('Error fetching calendar events:', err);
    throw err;
  }
}

/**
 * Create a recurring dose event on user's primary Google Calendar
 */
export async function createSupplementCalendarEvent(
  accessToken: string,
  supplement: Supplement,
  profile: UserProfile
): Promise<CalendarEventSummary> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  // Determine dose time (default 09:00 if not set)
  const timeStr = supplement.doseTime || '09:00';
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '9', 10);
  const minute = parseInt(minuteStr || '0', 10);

  // Set start time for today or next cycle start
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000); // 15 minute duration

  // Format ISO strings without milliseconds
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatIsoNoMs = (d: Date) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Build recurrence rule
  let recurrence: string[] = ['RRULE:FREQ=DAILY'];
  if (supplement.frequencyType === 'weekly' && supplement.selectedDays && supplement.selectedDays.length > 0) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDays = supplement.selectedDays.map((d) => dayMap[d]).join(',');
    recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${byDays}`];
  } else if (supplement.frequencyType === 'monthly') {
    const day = supplement.monthlyDayOfMonth || 1;
    recurrence = [`RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`];
  } else if (supplement.frequencyType === 'interval' && supplement.intervalDays) {
    recurrence = [`RRULE:FREQ=DAILY;INTERVAL=${supplement.intervalDays}`];
  }

  // Build event description
  const foodTimingLabel = supplement.foodTiming
    ? supplement.foodTiming.replace(/_/g, ' ').toUpperCase()
    : 'ANYTIME';

  const description = [
    `💊 SuppleTrack Regimen Reminder`,
    `Profile: ${profile.name} (${profile.relationship})`,
    `Supplement: ${supplement.name}`,
    `Dose: ${supplement.doseAmount.toLocaleString()} ${supplement.unit} (${supplement.form})`,
    `Schedule: ${supplement.frequencyType.toUpperCase()} at ${timeStr}`,
    `Meal Timing: ${foodTimingLabel}`,
    supplement.notes ? `Clinical / Intake Notes: ${supplement.notes}` : '',
    supplement.cycleConfig?.isCyclic ? `Cycle Protocol: ${supplement.cycleConfig.patternDescription || `${supplement.cycleConfig.onDays}d ON / ${supplement.cycleConfig.offDays}d OFF`}` : '',
    `\n---\nSynced automatically by SuppleTrack Web & Mobile Application.`,
  ]
    .filter(Boolean)
    .join('\n');

  const eventPayload = {
    summary: `💊 [SuppleTrack] ${profile.name}: ${supplement.name} (${supplement.doseAmount} ${supplement.unit})`,
    description,
    start: {
      dateTime: `${formatIsoNoMs(startDate)}`,
      timeZone,
    },
    end: {
      dateTime: `${formatIsoNoMs(endDate)}`,
      timeZone,
    },
    recurrence,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 0 },
      ],
    },
    colorId: supplement.colorTag === 'rose' ? '11' : supplement.colorTag === 'amber' ? '5' : supplement.colorTag === 'sky' ? '7' : '2', // 2=Sage/Green, 11=Red, 5=Yellow, 7=Cyan
    extendedProperties: {
      private: {
        app: 'suppletrack',
        profileId: profile.id,
        supplementId: supplement.id,
      },
    },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create calendar event (${res.status}): ${errorText}`);
  }

  const created = await res.json();
  return {
    id: created.id,
    summary: created.summary,
    description: created.description,
    start: created.start,
    end: created.end,
    htmlLink: created.htmlLink,
    profileId: profile.id,
    supplementId: supplement.id,
  };
}

/**
 * Delete a specific calendar event
 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete event: ${res.status}`);
  }
  return true;
}

/**
 * Sync entire regimen for active profile or all profiles
 */
export async function syncRegimenToCalendar(
  accessToken: string,
  supplements: Supplement[],
  profile: UserProfile,
  onProgress?: (current: number, total: number, itemName: string) => void
): Promise<{ added: number; existingDeleted: number }> {
  // 1. Fetch current SuppleTrack events for this profile to prevent duplicates
  const existingEvents = await getSuppleTrackCalendarEvents(accessToken);
  const profileEvents = existingEvents.filter(
    (e) => !e.profileId || e.profileId === profile.id
  );

  let existingDeleted = 0;
  for (const ev of profileEvents) {
    try {
      await deleteCalendarEvent(accessToken, ev.id);
      existingDeleted++;
    } catch (e) {
      console.warn('Could not clean existing event:', ev.id);
    }
  }

  // 2. Filter active supplements for this profile
  const suppsToSync = supplements.filter(
    (s) => !s.archived && (!s.profileId || s.profileId === profile.id)
  );

  let added = 0;
  for (let i = 0; i < suppsToSync.length; i++) {
    const supp = suppsToSync[i];
    if (onProgress) {
      onProgress(i + 1, suppsToSync.length, supp.name);
    }
    try {
      await createSupplementCalendarEvent(accessToken, supp, profile);
      added++;
    } catch (e) {
      console.error(`Failed to sync ${supp.name}:`, e);
    }
  }

  return { added, existingDeleted };
}
