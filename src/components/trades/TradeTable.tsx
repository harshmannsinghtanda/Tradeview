import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  Eye, 
  Clock, 
  Plus
} from 'lucide-react';
import { Trade } from '../../types/trade';
import { DirectionBadge, StatusBadge, AssetBadge, EmotionBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { useCurrency } from '../../context/CurrencyContext';

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onView: (trade: Trade) => void;
  onOpenNewTrade: () => void;
}

type SortField = 'date' | 'symbol' | 'netPnl' | 'rMultiple' | 'status';
type SortDirection = 'asc' | 'desc';

export function TradeTable({
  trades,
  onEdit,
  onDelete,
  onView,
  onOpenNewTrade,
}: TradeTableProps) {
  const { formatCurrency } = useCurrency();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'date') {
        valA = new Date(a.exitDate || a.entryDate).getTime();
        valB = new Date(b.exitDate || b.entryDate).getTime();
      } else if (sortField === 'symbol') {
        valA = a.symbol;
        valB = b.symbol;
      } else if (sortField === 'netPnl') {
        valA = a.netPnl ?? -999999;
        valB = b.netPnl ?? -999999;
      } else if (sortField === 'rMultiple') {
        valA = a.rMultiple ?? -999;
        valB = b.rMultiple ?? -999;
      } else {
        valA = a.status;
        valB = b.status;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trades, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedTrades.length / pageSize) || 1;
  const paginatedTrades = sortedTrades.slice((page - 1) * pageSize, page * pageSize);

  if (trades.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-slate-200 dark:border-slate-800/80 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Trades Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
          No records match your active search or filters. Try adjusting criteria or log a new trade entry.
        </p>
        <Button onClick={onOpenNewTrade} icon={<Plus className="w-4 h-4" />}>
          Log Trade
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
      {/* Desktop Table View (≥ 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
              <th
                onClick={() => handleSort('date')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Date / Time</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              <th
                onClick={() => handleSort('symbol')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Symbol & Market</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              <th className="py-3 px-4">Direction</th>
              <th className="py-3 px-4">Entry / Exit</th>
              <th className="py-3 px-4">Size / SL</th>

              <th
                onClick={() => handleSort('netPnl')}
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net P&L</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              <th
                onClick={() => handleSort('rMultiple')}
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>R-Mult</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>

              <th className="py-3 px-4">Setup & Emotion</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
            {paginatedTrades.map((t) => {
              const hasPnl = t.netPnl !== undefined;
              const isProfit = (t.netPnl ?? 0) > 0;
              const isLoss = (t.netPnl ?? 0) < 0;

              const dateFormatted = (t.exitDate || t.entryDate).replace('T', ' ').substring(0, 16);

              return (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {dateFormatted}
                  </td>

                  {/* Symbol & Asset */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                        {t.symbol}
                      </span>
                      <AssetBadge assetClass={t.assetClass} />
                    </div>
                  </td>

                  {/* Direction */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <DirectionBadge direction={t.direction} />
                  </td>

                  {/* Entry / Exit */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                    <div className="text-slate-800 dark:text-slate-200 font-semibold">
                      {formatCurrency(t.entryPrice)}
                    </div>
                    {t.exitPrice ? (
                      <div className="text-[11px] text-slate-400">
                        → {formatCurrency(t.exitPrice)}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-500 italic">Holding</span>
                    )}
                  </td>

                  {/* Size & Stop Loss */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    <div>Qty: {t.quantity}</div>
                    {t.stopLoss && (
                      <div className="text-[10px] text-rose-500/80">
                        SL: {formatCurrency(t.stopLoss)}
                      </div>
                    )}
                  </td>

                  {/* Net P&L */}
                  <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-bold">
                    {hasPnl && t.status === 'Closed' ? (
                      <div>
                        <span className={isProfit ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'}>
                          {isProfit ? '+' : ''}{formatCurrency(t.netPnl ?? 0)}
                        </span>
                        {t.pnlPercentage !== undefined && (
                          <div className={`text-[10px] ${isProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                            ({isProfit ? '+' : ''}{t.pnlPercentage.toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic">Open</span>
                    )}
                  </td>

                  {/* R-Multiple */}
                  <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums">
                    {t.rMultiple !== undefined && t.rMultiple !== 0 ? (
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        t.rMultiple > 0 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {t.rMultiple > 0 ? '+' : ''}{t.rMultiple.toFixed(2)}R
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Setup & Emotion */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {t.strategy || 'General'}
                      </span>
                      <EmotionBadge emotion={t.emotion} />
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    <StatusBadge status={t.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => onView(t)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Details & Notes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                        title="Edit Trade"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                        title="Delete Trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based Feed (< 768px) */}
      <div className="block md:hidden divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {paginatedTrades.map((t) => {
          const hasPnl = t.netPnl !== undefined;
          const isProfit = (t.netPnl ?? 0) > 0;
          const isLoss = (t.netPnl ?? 0) < 0;
          const dateFormatted = (t.exitDate || t.entryDate).replace('T', ' ').substring(0, 16);

          return (
            <div key={t.id} className="p-3.5 space-y-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.symbol}
                  </span>
                  <DirectionBadge direction={t.direction} />
                  <AssetBadge assetClass={t.assetClass} />
                </div>

                <div className="text-right">
                  {hasPnl && t.status === 'Closed' ? (
                    <span className={`text-sm font-bold font-mono ${isProfit ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'}`}>
                      {isProfit ? '+' : ''}{formatCurrency(t.netPnl ?? 0)}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-semibold">Active</span>
                  )}
                </div>
              </div>

              {/* Card Grid Info */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Entry → Exit</span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(t.entryPrice)} → {t.exitPrice ? `${formatCurrency(t.exitPrice)}` : 'Open'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Size & R:R</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>{t.quantity}x</span>
                    {t.rMultiple !== undefined && t.rMultiple !== 0 && (
                      <span className={`text-[10px] font-bold px-1 rounded ${t.rMultiple > 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                        {t.rMultiple > 0 ? '+' : ''}{t.rMultiple}R
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Setup, Emotion & Quick Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {t.strategy || 'General'}
                  </span>
                  <EmotionBadge emotion={t.emotion} />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onView(t)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEdit(t)}
                    className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="p-2 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                {dateFormatted}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          <span className="text-slate-500 text-center sm:text-left">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedTrades.length)} of {sortedTrades.length} trades
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-mono font-bold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
