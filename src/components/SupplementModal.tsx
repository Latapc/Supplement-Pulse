import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  Check, 
  Info,
  Package,
  AlertTriangle,
  Bell,
  Infinity as InfinityIcon,
  Repeat
} from 'lucide-react';
import { Supplement, DoseUnit, FrequencyType, DayOfWeek, FoodTiming } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { formatDateToYYYYMMDD, calculateEndDate, getDayShortName } from '../utils/dates';

interface SupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplement: Supplement) => void;
  editingSupplement?: Supplement | null;
  onOpenSpecialAi?: () => void;
  profiles?: UserProfile[];
  activeProfileId?: string;
}

const PRESET_TEMPLATES = [
  {
    name: 'Vitamin D3 (60,000 IU For Life - Infinity)',
    doseAmount: 60000,
    unit: 'IU' as DoseUnit,
    form: 'capsule' as const,
    category: 'vitamins' as const,
    frequencyType: 'weekly' as FrequencyType,
    selectedDays: [1] as DayOfWeek[], // Monday
    durationType: 'infinity' as const,
    periodValue: 3,
    periodUnit: 'months' as const,
    trackStock: true,
    currentStock: 12,
    bottleSize: 24,
    lowStockThreshold: 4,
    notes: 'Permanent lifetime protocol. Reminders stay active indefinitely without expiring.',
  },
  {
    name: 'Boron 6 mg (Special: 2w ON / 1w OFF Cycle)',
    doseAmount: 6,
    unit: 'mg' as DoseUnit,
    form: 'capsule' as const,
    category: 'minerals' as const,
    frequencyType: 'daily' as FrequencyType,
    durationType: 'infinity' as const,
    isCyclic: true,
    onDays: 14,
    offDays: 7,
    trackStock: true,
    currentStock: 60,
    bottleSize: 90,
    lowStockThreshold: 14,
    notes: 'Special cyclic intake: 2 weeks on, 1 week off. Automatically cycles for life.',
  },
  {
    name: 'Vitamin D3 (Weekly 60,000 IU for 8 Weeks)',
    doseAmount: 60000,
    unit: 'IU' as DoseUnit,
    form: 'capsule' as const,
    category: 'vitamins' as const,
    frequencyType: 'weekly' as FrequencyType,
    selectedDays: [1] as DayOfWeek[], // Monday
    durationType: 'fixed' as const,
    periodValue: 8,
    periodUnit: 'weeks' as const,
    trackStock: true,
    currentStock: 8,
    bottleSize: 12,
    lowStockThreshold: 3,
    notes: 'High-dose weekly booster for optimal vitamin D levels.',
  },
  {
    name: 'Vitamin B12 (Weekly 1,500 mg for 3 Months)',
    doseAmount: 1500,
    unit: 'mg' as DoseUnit,
    form: 'tablet' as const,
    category: 'vitamins' as const,
    frequencyType: 'weekly' as FrequencyType,
    selectedDays: [1] as DayOfWeek[], // Monday
    durationType: 'fixed' as const,
    periodValue: 3,
    periodUnit: 'months' as const,
    trackStock: true,
    currentStock: 12,
    bottleSize: 30,
    lowStockThreshold: 4,
    notes: '3-month restoration course. Stops reminders automatically upon completion.',
  },
  {
    name: 'Magnesium Glycinate (400 mg Daily For Life)',
    doseAmount: 400,
    unit: 'mg' as DoseUnit,
    form: 'capsule' as const,
    category: 'minerals' as const,
    frequencyType: 'daily' as FrequencyType,
    durationType: 'infinity' as const,
    periodValue: 1,
    periodUnit: 'months' as const,
    trackStock: true,
    currentStock: 50,
    bottleSize: 60,
    lowStockThreshold: 10,
    notes: 'Deep sleep and muscle recovery support.',
  },
];

export const SupplementModal: React.FC<SupplementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSupplement,
  onOpenSpecialAi,
  profiles = [],
  activeProfileId = 'profile_self',
}) => {
  const todayStr = formatDateToYYYYMMDD(new Date());

  const [profileId, setProfileId] = useState<string>(activeProfileId);
  const [name, setName] = useState('');
  const [doseAmount, setDoseAmount] = useState<number>(60000);
  const [unit, setUnit] = useState<DoseUnit>('IU');
  const [form, setForm] = useState<'capsule' | 'tablet' | 'softgel' | 'liquid' | 'powder' | 'gummy'>('capsule');
  const [category, setCategory] = useState<'vitamins' | 'minerals' | 'herbs' | 'amino_acids' | 'omega' | 'general'>('vitamins');
  
  // Frequency
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('weekly');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([1]); // default Monday
  const [monthlyDayOfMonth, setMonthlyDayOfMonth] = useState<number>(1);
  const [intervalDays, setIntervalDays] = useState<number>(2);

  // Special Cyclic Intake (e.g. Boron 2 weeks on, 1 week off)
  const [isCyclic, setIsCyclic] = useState<boolean>(false);
  const [onDays, setOnDays] = useState<number>(14);
  const [offDays, setOffDays] = useState<number>(7);

  // Inventory / Stock
  const [trackStock, setTrackStock] = useState<boolean>(true);
  const [currentStock, setCurrentStock] = useState<number>(30);
  const [bottleSize, setBottleSize] = useState<number>(60);
  const [stockUnit, setStockUnit] = useState<string>('capsules');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(7);

  // Course Duration
  const [durationType, setDurationType] = useState<'continuous' | 'fixed' | 'infinity'>('infinity');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [periodValue, setPeriodValue] = useState<number>(3);
  const [periodUnit, setPeriodUnit] = useState<'days' | 'weeks' | 'months'>('months');
  
  // Expiry Date (YYYY-MM-DD)
  const [expiryDate, setExpiryDate] = useState<string>('');

  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (editingSupplement) {
      setProfileId(editingSupplement.profileId || activeProfileId || 'profile_self');
      setName(editingSupplement.name);
      setDoseAmount(editingSupplement.doseAmount);
      setUnit(editingSupplement.unit);
      setForm(editingSupplement.form);
      setCategory(editingSupplement.category);
      setFrequencyType(editingSupplement.frequencyType);
      setSelectedDays(editingSupplement.selectedDays || [1]);
      setMonthlyDayOfMonth(editingSupplement.monthlyDayOfMonth || 1);
      setIntervalDays(editingSupplement.intervalDays || 2);
      
      // Cyclic
      setIsCyclic(editingSupplement.cycleConfig?.isCyclic ?? false);
      setOnDays(editingSupplement.cycleConfig?.onDays ?? 14);
      setOffDays(editingSupplement.cycleConfig?.offDays ?? 7);

      // Inventory
      if (editingSupplement.inventory) {
        setTrackStock(editingSupplement.inventory.trackStock);
        setCurrentStock(editingSupplement.inventory.currentStock);
        setBottleSize(editingSupplement.inventory.bottleSize);
        setStockUnit(editingSupplement.inventory.unit || 'capsules');
        setLowStockThreshold(editingSupplement.inventory.lowStockThreshold || 7);
      } else {
        setTrackStock(true);
        setCurrentStock(30);
        setBottleSize(60);
        setStockUnit('capsules');
        setLowStockThreshold(7);
      }

      setExpiryDate(editingSupplement.expiryDate || '');
      setDurationType(editingSupplement.duration.type);
      setStartDate(editingSupplement.duration.startDate || todayStr);
      setPeriodValue(editingSupplement.duration.periodValue || 3);
      setPeriodUnit(editingSupplement.duration.periodUnit || 'months');
      setNotes(editingSupplement.notes || '');
    } else {
      // Defaults for new
      setName('');
      setDoseAmount(60000);
      setUnit('IU');
      setForm('capsule');
      setCategory('vitamins');
      setFrequencyType('weekly');
      setSelectedDays([1]);
      setMonthlyDayOfMonth(1);
      setIntervalDays(2);
      setIsCyclic(false);
      setOnDays(14);
      setOffDays(7);
      setTrackStock(true);
      setCurrentStock(30);
      setBottleSize(60);
      setStockUnit('capsules');
      setLowStockThreshold(7);
      setExpiryDate('');
      setDurationType('infinity'); // Default to infinity for lifetime peace of mind
      setStartDate(todayStr);
      setPeriodValue(3);
      setPeriodUnit('months');
      setNotes('');
    }
  }, [editingSupplement, isOpen]);

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Always ensure modal starts scrolled to the very top when opened
      if (modalContainerRef.current) {
        modalContainerRef.current.scrollTop = 0;
      }
      // Disable background body scroll while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setName(preset.name);
    setDoseAmount(preset.doseAmount);
    setUnit(preset.unit);
    setForm(preset.form);
    setCategory(preset.category);
    setFrequencyType(preset.frequencyType);
    if (preset.selectedDays) setSelectedDays(preset.selectedDays);
    setDurationType(preset.durationType);
    setPeriodValue(preset.periodValue || 3);
    setPeriodUnit(preset.periodUnit || 'months');
    setTrackStock(preset.trackStock);
    setCurrentStock(preset.currentStock);
    setBottleSize(preset.bottleSize);
    setLowStockThreshold(preset.lowStockThreshold);
    setNotes(preset.notes);
    if ('isCyclic' in preset && preset.isCyclic) {
      setIsCyclic(true);
      setOnDays(preset.onDays || 14);
      setOffDays(preset.offDays || 7);
    } else {
      setIsCyclic(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const calculatedEndDate = durationType === 'fixed'
    ? calculateEndDate(startDate, periodValue, periodUnit)
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const supplement: Supplement = {
      id: editingSupplement ? editingSupplement.id : `supp-${Date.now()}`,
      profileId: profileId || 'profile_self',
      name: name.trim(),
      doseAmount: Number(doseAmount) || 1,
      unit,
      form,
      category,
      colorTag: category === 'vitamins' ? 'amber' : category === 'minerals' ? 'indigo' : 'emerald',
      frequencyType,
      selectedDays: frequencyType === 'weekly' ? selectedDays : undefined,
      monthlyDayOfMonth: frequencyType === 'monthly' ? Number(monthlyDayOfMonth) : undefined,
      intervalDays: frequencyType === 'interval' ? Number(intervalDays) : undefined,
      cycleConfig: isCyclic ? {
        isCyclic: true,
        onDays: Math.max(1, Number(onDays) || 14),
        offDays: Math.max(1, Number(offDays) || 7),
        cycleStartDate: startDate,
        patternDescription: `${Number(onDays) >= 7 ? `${Math.round(Number(onDays)/7)}w` : `${onDays}d`} ON / ${Number(offDays) >= 7 ? `${Math.round(Number(offDays)/7)}w` : `${offDays}d`} OFF (repeating cycle)`
      } : undefined,
      inventory: trackStock ? {
        trackStock: true,
        currentStock: Number(currentStock),
        bottleSize: Number(bottleSize),
        unit: stockUnit || 'capsules',
        lowStockThreshold: Number(lowStockThreshold),
        lastRestockedDate: todayStr,
      } : undefined,
      expiryDate: expiryDate ? expiryDate : undefined,
      duration: {
        type: durationType,
        startDate,
        endDate: durationType === 'fixed' ? calculatedEndDate : undefined,
        periodValue: durationType === 'fixed' ? Number(periodValue) : undefined,
        periodUnit: durationType === 'fixed' ? periodUnit : undefined,
      },
      notes: notes.trim(),
      createdAt: editingSupplement ? editingSupplement.createdAt : new Date().toISOString(),
    };

    onSave(supplement);
    onClose();
  };

  return (
    <div 
      ref={modalContainerRef}
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs overflow-y-auto overscroll-contain"
    >
      <div className="min-h-full w-full flex items-start justify-center p-3 sm:p-6 py-4 sm:py-8">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-auto">
        
        {/* Header */}
        <div className="sticky -top-5 sm:-top-8 bg-white/95 backdrop-blur-md z-20 pb-4 mb-4 border-b border-stone-100 flex items-center justify-between -mt-1 pt-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-display">
              {editingSupplement ? 'Edit Supplement Regimen' : 'Add New Supplement'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Set dosage, schedule (daily/weekly/monthly), quantity inventory, and duration timer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors shrink-0 ml-2"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        {!editingSupplement && (
          <div className="mt-4 mb-6">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended Presets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TEMPLATES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 transition text-xs"
                >
                  <div className="font-semibold text-stone-900 truncate">{p.name}</div>
                  <div className="text-stone-500">
                    {p.doseAmount.toLocaleString()} {p.unit} · {p.frequencyType}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Assignment (Google TV Style) */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Assign to Family / Care Profile
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profiles.map((p) => {
                  const isSelected = profileId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfileId(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition text-left ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${p.themeGradient} text-white flex items-center justify-center text-[10px] shrink-0`}>
                        {p.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="truncate">{p.name}</div>
                        <div className="text-[10px] opacity-70 font-normal">{p.relation}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 1: Supplement Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Supplement Name & Compound
            </label>
            <input
              type="text"
              placeholder="e.g. Vitamin D3 (Cholecalciferol) or Vitamin B12"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          {/* Row 2: Dose Amount & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Dose Amount
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={doseAmount}
                onChange={(e) => setDoseAmount(Number(e.target.value))}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as DoseUnit)}
                className="w-full h-11 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              >
                <option value="IU">IU (International Units)</option>
                <option value="mg">mg (Milligrams)</option>
                <option value="mcg">mcg / µg (Micrograms)</option>
                <option value="g">g (Grams)</option>
                <option value="capsules">Capsules</option>
                <option value="tablets">Tablets</option>
                <option value="ml">ml (Milliliters)</option>
                <option value="drops">Drops</option>
              </select>
            </div>
          </div>

          {/* Row 3: Form & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Supplement Form
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
              >
                <option value="capsule">Capsule</option>
                <option value="tablet">Tablet</option>
                <option value="softgel">Softgel</option>
                <option value="liquid">Liquid / Drops</option>
                <option value="powder">Powder</option>
                <option value="gummy">Gummy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm capitalize"
              >
                <option value="vitamins">Vitamins</option>
                <option value="minerals">Minerals</option>
                <option value="omega">Omega & Essential Fats</option>
                <option value="herbs">Herbs & Botanicals</option>
                <option value="amino_acids">Amino Acids</option>
                <option value="general">General Wellness</option>
              </select>
            </div>
          </div>

          {/* Row 4: Recommended Intake Schedule (daily, weekly, monthly, interval) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-2">
                Recommended Intake Schedule
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequencyType('daily')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    frequencyType === 'daily'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType('weekly')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    frequencyType === 'weekly'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType('monthly')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    frequencyType === 'monthly'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType('interval')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    frequencyType === 'interval'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Interval
                </button>
              </div>
            </div>

            {/* Weekly Day of Week Picker */}
            {frequencyType === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  Select Days of Week (e.g. Monday for high-dose Vitamin D or B12)
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const isSelected = selectedDays.includes(d as DayOfWeek);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d as DayOfWeek)}
                        className={`h-10 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {getDayShortName(d as DayOfWeek)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Day of Month Picker */}
            {frequencyType === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Day of the Month (e.g. 1st of every month)
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={monthlyDayOfMonth}
                    onChange={(e) => setMonthlyDayOfMonth(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl border border-stone-300 text-stone-900 text-sm font-semibold"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        Day {day} of each month
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-stone-500">
                    Triggers on day {monthlyDayOfMonth} of every calendar month
                  </span>
                </div>
              </div>
            )}

            {/* Interval Days */}
            {frequencyType === 'interval' && (
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Interval Frequency (Take every X days)
                </label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-stone-300 text-stone-900 text-sm font-mono"
                />
              </div>
            )}
          </div>

          {/* Row 5: Remaining Quantity & Low Stock Alert Tracking */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-stone-900">
                  Remaining Quantity & Low-Stock Alerts
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-stone-700">Track Quantity</span>
              </label>
            </div>

            {trackStock && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-stone-600 mb-1">
                    Remaining in Bottle
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-600 mb-1">
                    Full Bottle / Pack Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bottleSize}
                    onChange={(e) => setBottleSize(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-600 mb-1">
                    Low Stock Alert At
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                    placeholder="e.g. 7"
                    required
                  />
                </div>

                <div className="sm:col-span-3 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    When remaining units drop to <strong>{lowStockThreshold} or fewer</strong>, the system will alert you to refill your supply.
                  </span>
                </div>
              </div>
            )}

            {/* Bottle Expiry Date & Shelf Life Alert */}
            <div className="pt-3 border-t border-stone-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bottle Expiry Date</span>
                  <span className="text-[10px] font-normal text-stone-500">(Optional)</span>
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-stone-400">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 6);
                      setExpiryDate(formatDateToYYYYMMDD(d));
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-200 text-stone-700 font-medium border border-stone-200 shadow-2xs"
                  >
                    +6 Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      setExpiryDate(formatDateToYYYYMMDD(d));
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-200 text-stone-700 font-medium border border-stone-200 shadow-2xs"
                  >
                    +1 Yr
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 2);
                      setExpiryDate(formatDateToYYYYMMDD(d));
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-200 text-stone-700 font-medium border border-stone-200 shadow-2xs"
                  >
                    +2 Yrs
                  </button>
                  {expiryDate && (
                    <button
                      type="button"
                      onClick={() => setExpiryDate('')}
                      className="px-1.5 py-0.5 rounded-md text-stone-400 hover:text-rose-600 font-medium ml-1"
                      title="Clear expiry date"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono w-full bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  {expiryDate ? (
                    (() => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const [y, m, d] = expiryDate.split('-').map(Number);
                      const exp = new Date(y, m - 1, d);
                      const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        return (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span><strong>Expired!</strong> Expired {Math.abs(diffDays)} day(s) ago.</span>
                          </div>
                        );
                      } else if (diffDays <= 30) {
                        return (
                          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span><strong>Expiring soon!</strong> {diffDays} day(s) left.</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Fresh stock: Good for {diffDays} days ({Math.round(diffDays / 30)} months).</span>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div className="text-[11px] text-stone-500 italic flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Set bottle expiry to receive proactive alerts before potency fades.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 6: Course Duration & Automatic Deactivation Timer */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Course Duration & Lifetime Settings</span>
                </div>
                <p className="text-xs text-stone-500">
                  Choose whether this regimen runs for life or stops after a fixed period
                </p>
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDurationType('infinity')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                    durationType === 'infinity'
                      ? 'bg-amber-600 text-white font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>For Life (Infinity)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDurationType('fixed')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    durationType === 'fixed'
                      ? 'bg-stone-900 text-white font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Fixed Course
                </button>
                <button
                  type="button"
                  onClick={() => setDurationType('continuous')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    durationType === 'continuous'
                      ? 'bg-stone-900 text-white font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Ongoing
                </button>
              </div>
            </div>

            {durationType === 'infinity' && (
              <div className="text-xs text-amber-900 bg-amber-100/70 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                <InfinityIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Permanent Regimen (Active For Life)</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    This supplement will never expire, stop after 3 months, or automatically deactivate. Dosing schedules and stock tracking will stay permanently active.
                  </p>
                </div>
              </div>
            )}

            {durationType === 'fixed' && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      Duration Value
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={periodValue}
                      onChange={(e) => setPeriodValue(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      Period Unit
                    </label>
                    <select
                      value={periodUnit}
                      onChange={(e) => setPeriodUnit(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900"
                    >
                      <option value="months">Months (e.g. 3 months)</option>
                      <option value="weeks">Weeks (e.g. 8 weeks)</option>
                      <option value="days">Days (e.g. 30 days)</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Reminders are active until <strong>{calculatedEndDate}</strong>. On <strong>{calculatedEndDate}</strong>, notifications automatically deactivate.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 7: Special Cyclic Regimen (e.g. Boron 2 weeks ON, 1 week OFF) */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Special Cyclic Protocol (Pulsed Dosing)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    E.g. Take daily for 2 weeks, then rest for 1 week, and repeat
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCyclic}
                  onChange={(e) => setIsCyclic(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-indigo-900">Enable Cycling</span>
              </label>
            </div>

            {isCyclic && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-700 font-medium mb-1">
                      Active Dosing Period (Days)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={onDays}
                        onChange={(e) => setOnDays(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                      />
                      <span className="text-xs text-stone-500 whitespace-nowrap">
                        ({Math.round(onDays / 7)} wks)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-700 font-medium mb-1">
                      Rest / Pause Period (Days)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={offDays}
                        onChange={(e) => setOffDays(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono"
                      />
                      <span className="text-xs text-stone-500 whitespace-nowrap">
                        ({Math.round(offDays / 7)} wks)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-indigo-900 bg-white/80 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      Pattern: Take for <strong>{onDays} days</strong>, then pause for <strong>{offDays} days</strong>, repeating continuously.
                    </span>
                  </div>

                  {onOpenSpecialAi && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSpecialAi();
                      }}
                      className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline whitespace-nowrap ml-2"
                    >
                      Ask Gemini AI
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 7: Physician / Personal Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Doctor Instructions or Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Prescribed for 3 months to treat deficiency; take after breakfast."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="sticky -bottom-5 sm:-bottom-8 bg-white/95 backdrop-blur-md pt-4 pb-2 border-t border-stone-100 flex items-center justify-end gap-3 -mx-1 px-1 mt-6 z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs active:scale-[0.98] transition"
            >
              {editingSupplement ? 'Save Changes' : 'Create Regimen'}
            </button>
          </div>

        </form>
      </div>
    </div>
  </div>
  );
};
