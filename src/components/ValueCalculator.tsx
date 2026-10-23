import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Calendar, 
  RefreshCw, 
  X, 
  Check, 
  Pill, 
  PieChart, 
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { Supplement } from '../types/supplement';
import { 
  calculateStockDaysRemaining, 
  calculateValueMetrics, 
  getDailyIntakeRate,
  StockCalculationResult,
  ValueMetrics 
} from '../utils/inventory';

interface ValueCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  supplements: Supplement[];
  onUpdateSupplement?: (supplement: Supplement) => void;
  onRefillStock?: (supplementId: string) => void;
}

export const ValueCalculator: React.FC<ValueCalculatorProps> = ({
  isOpen,
  onClose,
  supplements,
  onUpdateSupplement,
  onRefillStock,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'restock' | 'costs'>('overview');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  // Calculate metrics for all supplements
  const supplementMetrics = useMemo(() => {
    return supplements.map((s) => {
      const stock = calculateStockDaysRemaining(s);
      const value = calculateValueMetrics(s);
      return {
        supplement: s,
        stock,
        value,
      };
    });
  }, [supplements]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    let totalMonthlyCost = 0;
    let totalDailyCost = 0;
    let itemsWithPrice = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryBreakdown: Record<string, { count: number; monthly: number }> = {};

    supplementMetrics.forEach(({ supplement, stock, value }) => {
      if (value.hasPriceData) {
        totalMonthlyCost += value.monthlyInvestment;
        totalDailyCost += value.costPerDay;
        itemsWithPrice++;

        const cat = supplement.category || 'general';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { count: 0, monthly: 0 };
        }
        categoryBreakdown[cat].count++;
        categoryBreakdown[cat].monthly += value.monthlyInvestment;
      }

      if (stock.isOutOfStock) outOfStockCount++;
      else if (stock.isLowStock) lowStockCount++;
    });

    return {
      totalMonthlyCost,
      totalDailyCost,
      itemsWithPrice,
      totalItems: supplements.length,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
    };
  }, [supplementMetrics, supplements.length]);

  // Items needing refill soon (sorted by days remaining)
  const restockQueue = useMemo(() => {
    return supplementMetrics
      .filter(({ stock, supplement }) => supplement.inventory?.trackStock)
      .sort((a, b) => {
        const aDays = a.stock.daysRemaining ?? 9999;
        const bDays = b.stock.daysRemaining ?? 9999;
        return aDays - bDays;
      });
  }, [supplementMetrics]);

  if (!isOpen) return null;

  const handleStartEditPrice = (s: Supplement) => {
    setEditingPriceId(s.id);
    setPriceInput(s.costPerBottle ? s.costPerBottle.toString() : '');
  };

  const handleSavePrice = (s: Supplement) => {
    const num = parseFloat(priceInput);
    if (!isNaN(num) && num >= 0 && onUpdateSupplement) {
      onUpdateSupplement({
        ...s,
        costPerBottle: num,
      });
    }
    setEditingPriceId(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="value-calculator-title"
    >
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 id="value-calculator-title" className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>Value & Refill Predictor</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Smart Stash ROI
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Track cost-per-serving, monthly supplement outlay, and automatic run-out dates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Investment Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restock')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'restock'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Refill Predictor</span>
            {(aggregates.lowStockCount > 0 || aggregates.outOfStockCount > 0) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                {aggregates.lowStockCount + aggregates.outOfStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('costs')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'costs'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Cost Per Serving ({aggregates.itemsWithPrice}/{aggregates.totalItems})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Top Stats Trio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Monthly Investment
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 font-mono tabular-nums">
                    ${aggregates.totalMonthlyCost.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    ~${aggregates.totalDailyCost.toFixed(2)} / day across {aggregates.itemsWithPrice} priced items
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800">
                  <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Annual Protocol Cost
                  </div>
                  <div className="text-2xl font-black text-stone-900 dark:text-white mt-1 font-mono tabular-nums">
                    ${(aggregates.totalMonthlyCost * 12).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Estimated 365-day wellness allocation
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Stock Urgency
                  </div>
                  <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1 font-mono tabular-nums">
                    {aggregates.lowStockCount + aggregates.outOfStockCount}{' '}
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">items</span>
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {aggregates.outOfStockCount > 0 ? `${aggregates.outOfStockCount} out of stock · ` : ''}
                    {aggregates.lowStockCount} below 7-day reserve
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  Monthly Outlay by Category
                </h4>
                <div className="space-y-2">
                  {Object.entries(aggregates.categoryBreakdown).map(([cat, data]) => {
                    const percent = aggregates.totalMonthlyCost > 0
                      ? Math.round((data.monthly / aggregates.totalMonthlyCost) * 100)
                      : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize font-semibold text-stone-700 dark:text-stone-300">
                            {cat} ({data.count} items)
                          </span>
                          <span className="font-mono font-bold text-stone-900 dark:text-white">
                            ${data.monthly.toFixed(2)} / mo ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(aggregates.categoryBreakdown).length === 0 && (
                    <p className="text-xs text-stone-500 italic py-2">
                      No bottle purchase prices entered yet. Add bottle prices under the "Cost Per Serving" tab to see your category allocation.
                    </p>
                  )}
                </div>
              </div>

              {/* Informational Card */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Smart Run-Out Prediction:</strong> Supple Pulse continuously calculates daily intake rates based on your dosage rules (daily, weekly intervals, and active/rest cycle lengths). It predicts exact calendar dates when each bottle will run dry.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: REFILL PREDICTOR */}
          {activeTab === 'restock' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Sorted by urgency: items running out first appear at the top.
                </p>
              </div>

              <div className="space-y-2.5">
                {restockQueue.map(({ supplement, stock, value }) => {
                  const currentStock = supplement.inventory?.currentStock ?? 0;
                  const bottleSize = supplement.inventory?.bottleSize ?? 60;
                  const unit = supplement.inventory?.unit || 'units';

                  return (
                    <div 
                      key={supplement.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        stock.isOutOfStock
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/30'
                          : stock.isLowStock
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-850/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                            {supplement.name}
                          </h4>
                          {stock.isOutOfStock ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Out of Stock
                            </span>
                          ) : stock.isLowStock ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Low Stock ({stock.daysRemaining}d left)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {stock.daysRemaining} days of supply
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">
                            {currentStock} / {bottleSize} {unit} left
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-stone-500">
                            <Calendar className="w-3.5 h-3.5" />
                            Predicted Refill: <strong className="text-stone-800 dark:text-stone-200">{stock.refillDateFormatted || 'N/A'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {onRefillStock && (
                          <button
                            type="button"
                            onClick={() => onRefillStock(supplement.id)}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Refill Bottle ({bottleSize} {unit})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {restockQueue.length === 0 && (
                  <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs">
                    No supplements currently have inventory tracking enabled. Enable bottle stock tracking in any supplement's edit modal to activate the refill predictor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COST PER SERVING */}
          {activeTab === 'costs' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Click any price to update bottle cost and recalculate cost per serving.
              </p>

              <div className="space-y-2">
                {supplementMetrics.map(({ supplement, value }) => {
                  const isEditing = editingPriceId === supplement.id;

                  return (
                    <div 
                      key={supplement.id}
                      className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                          {supplement.name}
                        </h4>
                        <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                          <span>{supplement.doseAmount} {supplement.unit} per dose</span>
                          <span>·</span>
                          <span className="capitalize">{supplement.frequencyType}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-stone-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              placeholder="24.99"
                              autoFocus
                              className="w-20 px-2 py-1 text-xs border border-emerald-500 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePrice(supplement)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPriceId(null)}
                              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEditPrice(supplement)}
                              title="Click to edit bottle purchase cost"
                              className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg transition font-mono tabular-nums"
                            >
                              {supplement.costPerBottle ? `$${supplement.costPerBottle.toFixed(2)}/btl` : '+ Set Price'}
                            </button>
                            {value.hasPriceData && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono mt-0.5">
                                ${value.costPerServing.toFixed(2)}/serving · ${value.monthlyInvestment.toFixed(2)}/mo
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500">
            {aggregates.itemsWithPrice} of {aggregates.totalItems} supplements have pricing data
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
