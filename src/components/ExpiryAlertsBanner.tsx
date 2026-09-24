import React, { useState } from 'react';
import { AlertTriangle, Calendar, Clock, RefreshCw, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { TodaySupplementStatus, Supplement } from '../types/supplement';

interface ExpiryAlertsBannerProps {
  expiredList: TodaySupplementStatus[];
  nearingExpiryList: TodaySupplementStatus[];
  onOpenEdit: (supplement: Supplement) => void;
  onRefillStock?: (supplementId: string) => void;
}

export const ExpiryAlertsBanner: React.FC<ExpiryAlertsBannerProps> = ({
  expiredList,
  nearingExpiryList,
  onOpenEdit,
  onRefillStock,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (expiredList.length === 0 && nearingExpiryList.length === 0) {
    return null;
  }

  const hasExpired = expiredList.length > 0;
  const totalCount = expiredList.length + nearingExpiryList.length;

  return (
    <div
      className={`rounded-3xl border shadow-sm transition-all overflow-hidden ${
        hasExpired
          ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200/70 text-rose-950'
          : 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200/70 text-amber-950'
      }`}
    >
      {/* Header bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${
              hasExpired ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold font-display">
                {hasExpired
                  ? 'Expired Bottle Alert — Manage Stock'
                  : 'Expiring Stock Notice — Freshness Alerts'}
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  hasExpired
                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                    : 'bg-amber-200 text-amber-900 border border-amber-300'
                }`}
              >
                {totalCount} {totalCount === 1 ? 'bottle needs attention' : 'bottles need attention'}
              </span>
            </div>
            <p className="text-xs mt-1 text-stone-700">
              {hasExpired
                ? 'One or more supplement bottles in your active tracker have passed their expiry date. Potency may decline. Consider replacing or updating bottle info.'
                : 'Some supplement bottles are nearing expiration (within 30 days). Check your inventory to plan timely refills.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-stone-600 hover:text-stone-900 hover:bg-black/5 rounded-xl transition"
          aria-label={isExpanded ? 'Collapse alerts' : 'Expand alerts'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded item details list */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2.5 pt-1 border-t border-black/5">
          {/* Expired list */}
          {expiredList.map((item) => (
            <div
              key={`expired-${item.supplement.id}`}
              className="bg-white/95 rounded-2xl p-3.5 border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900 text-sm">
                      {item.supplement.name}
                    </span>
                    <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
                      Expired {Math.abs(item.expiryStatus?.daysUntilExpiry ?? 0)} days ago
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                    <span>Expiry: <strong>{item.supplement.expiryDate}</strong></span>
                    {item.remainingStock !== undefined && (
                      <span>· {item.remainingStock} {item.stockUnit} left in bottle</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenEdit(item.supplement)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Expiry</span>
                </button>
                {onRefillStock && (
                  <button
                    type="button"
                    onClick={() => onRefillStock(item.supplement.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Stock</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Nearing expiry list */}
          {nearingExpiryList.map((item) => (
            <div
              key={`expiring-${item.supplement.id}`}
              className="bg-white/95 rounded-2xl p-3.5 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900 text-sm">
                      {item.supplement.name}
                    </span>
                    <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                      Expiring in {item.expiryStatus?.daysUntilExpiry} days
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                    <span>Expiry: <strong>{item.supplement.expiryDate}</strong></span>
                    {item.remainingStock !== undefined && (
                      <span>· {item.remainingStock} {item.stockUnit} remaining</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenEdit(item.supplement)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Expiry</span>
                </button>
                {onRefillStock && (
                  <button
                    type="button"
                    onClick={() => onRefillStock(item.supplement.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Plan Refill</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
