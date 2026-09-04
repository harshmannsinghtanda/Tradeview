import { Search, RotateCcw } from 'lucide-react';
import { TradeFiltersState, AssetClass, TradeDirection, TradeStatus, TradeEmotion } from '../../types/trade';

interface TradeFiltersProps {
  filters: TradeFiltersState;
  onChange: (updated: Partial<TradeFiltersState>) => void;
  onReset: () => void;
  strategies: string[];
}

export function TradeFilters({ filters, onChange, onReset, strategies }: TradeFiltersProps) {
  const assetClasses: (AssetClass | 'All')[] = ['All', 'Crypto', 'Stocks', 'Forex', 'Futures', 'Options'];
  const directions: (TradeDirection | 'All')[] = ['All', 'Long', 'Short'];
  const statuses: (TradeStatus | 'All')[] = ['All', 'Closed', 'Open'];
  const emotions: (TradeEmotion | 'All')[] = [
    'All',
    'Disciplined',
    'Patient',
    'Calm',
    'FOMO',
    'Revenge',
    'Hesitant',
    'Greedy',
    'Fearful',
  ];

  const hasActiveFilters =
    filters.search !== '' ||
    filters.assetClass !== 'All' ||
    filters.direction !== 'All' ||
    filters.status !== 'All' ||
    filters.emotion !== 'All' ||
    filters.strategy !== 'All';

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by symbol, setup, notes (e.g. BTC, Breakout, NVDA)..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
          />
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Filter Selectors Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
        {/* Asset Class */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Asset Class
          </label>
          <select
            value={filters.assetClass}
            onChange={(e) => onChange({ assetClass: e.target.value as any })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {assetClasses.map((ac) => (
              <option key={ac} value={ac}>{ac}</option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Direction
          </label>
          <select
            value={filters.direction}
            onChange={(e) => onChange({ direction: e.target.value as any })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {directions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as any })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Emotion */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Emotion
          </label>
          <select
            value={filters.emotion}
            onChange={(e) => onChange({ emotion: e.target.value as any })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {emotions.map((em) => (
              <option key={em} value={em}>{em}</option>
            ))}
          </select>
        </div>

        {/* Strategy / Setup */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Setup Strategy
          </label>
          <select
            value={filters.strategy}
            onChange={(e) => onChange({ strategy: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="All">All Setups</option>
            {strategies.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
