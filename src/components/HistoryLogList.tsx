import React, { useState } from 'react';
import { 
  History, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Plus, 
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Cloud,
  CloudCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DoseLog, Supplement } from '../types/supplement';
import { exportBackupData, importBackupData } from '../utils/storage';
import { formatDateToYYYYMMDD } from '../utils/dates';

interface HistoryLogListProps {
  logs: DoseLog[];
  supplements: Supplement[];
  onDeleteLog: (logId: string) => void;
  onAddManualLog: (log: Omit<DoseLog, 'id'>) => void;
  onRefreshData: () => void;
  googleUser?: User | null;
  hasDriveAccess?: boolean;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  onOpenGoogleSync?: () => void;
  onQuickSyncToDrive?: () => Promise<void>;
}

export const HistoryLogList: React.FC<HistoryLogListProps> = ({
  logs,
  supplements,
  onDeleteLog,
  onAddManualLog,
  onRefreshData,
  googleUser,
  hasDriveAccess = false,
  isSyncing = false,
  lastSyncedTime,
  onOpenGoogleSync,
  onQuickSyncToDrive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSuppId, setFilterSuppId] = useState<string>('all');
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Manual log form states
  const [manualSuppId, setManualSuppId] = useState<string>(supplements[0]?.id || '');
  const [manualAmount, setManualAmount] = useState<number>(supplements[0]?.doseAmount || 100);
  const [manualDate, setManualDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [manualTime, setManualTime] = useState<string>('09:00');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [importMessage, setImportMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Filter logs
  const filteredLogs = logs
    .filter((l) => {
      if (filterSuppId !== 'all' && l.supplementId !== filterSuppId) return false;
      if (searchTerm.trim() && !l.supplementName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleExport = () => {
    const dataStr = exportBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suppletrack_backup_${formatDateToYYYYMMDD(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBackupData(content);
      if (res.success) {
        setImportMessage({ text: res.message });
        onRefreshData();
      } else {
        setImportMessage({ text: res.message, isError: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectManualSupp = (suppId: string) => {
    setManualSuppId(suppId);
    const found = supplements.find((s) => s.id === suppId);
    if (found) {
      setManualAmount(found.doseAmount);
    }
  };

  const handleSaveManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const found = supplements.find((s) => s.id === manualSuppId);
    if (!found) return;

    onAddManualLog({
      supplementId: found.id,
      supplementName: found.name,
      amountTaken: Number(manualAmount) || found.doseAmount,
      unit: found.unit,
      timestamp: `${manualDate}T${manualTime}:00.000Z`,
      date: manualDate,
      time: manualTime,
      notes: manualNotes.trim() || undefined,
    });

    setIsAddingManual(false);
    setManualNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white font-display">
            Consumption History & Logs
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Audit trail of all logged doses, dates, and observational notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Google Account Sync Button */}
          {onOpenGoogleSync && (
            <button
              onClick={onOpenGoogleSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs ${
                googleUser
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{googleUser ? (isSyncing ? 'Syncing...' : 'Google Synced') : 'Sync with Google'}</span>
            </button>
          )}

          {/* Manual Log Button */}
          <button
            onClick={() => setIsAddingManual(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Past Dose</span>
          </button>

          {/* Secondary manual export (kept for offline files) */}
          <button
            onClick={handleExport}
            title="Download an offline JSON file copy"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline File</span>
          </button>

          {/* Secondary manual import */}
          <label 
            title="Import an offline JSON file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload JSON</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Google Account Cloud Sync Callout Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        googleUser 
          ? 'bg-emerald-50/70 dark:bg-emerald-950/70 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
          : 'bg-stone-50 dark:bg-stone-900 border-stone-200/90 dark:border-stone-800 text-stone-800 dark:text-stone-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              googleUser ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}>
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold font-display text-stone-900 dark:text-white">
                  {googleUser ? 'Google Drive Cloud Sync Active' : 'Automate Your Data with Google Account Sync'}
                </h4>
                {googleUser && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-mono">
                    {googleUser.email}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                {googleUser
                  ? `Your supplement protocols, daily doses, and history are automatically backed up to Google Drive (suppletrack_data.json). No manual files needed.`
                  : `Skip manual file export/import. Connect your Google Account to automatically store and sync your supplement regimen across all your devices.`}
              </p>
              {lastSyncedTime && googleUser && (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                  Last cloud sync: {lastSyncedTime}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {googleUser ? (
              <>
                {onQuickSyncToDrive && (
                  <button
                    type="button"
                    onClick={onQuickSyncToDrive}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}
                {onOpenGoogleSync && (
                  <button
                    type="button"
                    onClick={onOpenGoogleSync}
                    className="px-3 py-1.5 bg-white text-stone-700 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold transition"
                  >
                    Manage
                  </button>
                )}
              </>
            ) : (
              onOpenGoogleSync && (
                <button
                  type="button"
                  onClick={onOpenGoogleSync}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Connect Google Account</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {importMessage && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
          importMessage.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <span>{importMessage.text}</span>
          <button onClick={() => setImportMessage(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search supplement name or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterSuppId}
          onChange={(e) => setFilterSuppId(e.target.value)}
          className="h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-medium text-stone-700 dark:text-stone-200"
        >
          <option value="all">All Supplements ({logs.length})</option>
          {supplements.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Manual Entry Drawer/Modal */}
      {isAddingManual && (
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-3 font-display">
            Record Past or Untracked Intake
          </h3>

          <form onSubmit={handleSaveManualLog} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Supplement
              </label>
              <select
                value={manualSuppId}
                onChange={(e) => handleSelectManualSupp(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                required
              >
                {supplements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.doseAmount} {s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Amount Taken
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white font-mono"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Optional notes: e.g. taken with glass of milk"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white placeholder-stone-400"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsAddingManual(false)}
                className="px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white rounded-xl shadow-xs"
              >
                Add Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Log Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-xs">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {filteredLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={log.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          {log.supplementName}
                        </h4>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-md tabular-nums">
                          {log.amountTaken.toLocaleString()} {log.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                          <span>{formattedDate}</span>
                        </span>
                        {log.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="italic text-stone-600 dark:text-stone-300">"{log.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteLog(log.id)}
                    title="Delete this dosage entry"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900/80 active:bg-rose-200 border border-rose-200/80 dark:border-rose-800/80 rounded-xl transition-colors shadow-2xs shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Dosage</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <History className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-stone-700">No log entries found</p>
            <p className="text-xs text-stone-400 mt-0.5">
              Logged doses and historical intakes will show up here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
