import { useState, useMemo } from 'react';
import { Trade } from '../../types/trade';
import { buildCalendarHeatmapData } from '../../lib/calculations';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarHeatmapProps {
  trades: Trade[];
  currency?: string;
}

export function CalendarHeatmap({ trades, currency = '$' }: CalendarHeatmapProps) {
  // Current active viewed month
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hoveredDay, setHoveredDay] = useState<{ date: string; pnl: number; count: number } | null>(null);

  const heatmapData = useMemo(() => {
    return buildCalendarHeatmapData(trades);
  }, [trades]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const resetToToday = () => setCurrentDate(new Date());

  // Generate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Monthly summary metrics
  const monthlyMetrics = useMemo(() => {
    let monthPnl = 0;
    let winningDays = 0;
    let losingDays = 0;
    let totalTrades = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = heatmapData[dayStr];
      if (entry) {
        monthPnl += entry.pnl;
        totalTrades += entry.count;
        if (entry.pnl > 0) winningDays++;
        else if (entry.pnl < 0) losingDays++;
      }
    }

    return { monthPnl, winningDays, losingDays, totalTrades };
  }, [heatmapData, year, month, daysInMonth]);

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Performance Calendar</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Color-coded trading session results
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={resetToToday}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-medium cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* Month Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between text-xs p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 mb-4 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Month Net P&L:</span>
          <span className={`font-bold font-mono ${monthlyMetrics.monthPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {monthlyMetrics.monthPnl >= 0 ? '+' : ''}{currency}{monthlyMetrics.monthPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>{monthlyMetrics.winningDays} Green Days</span>
          <span>{monthlyMetrics.losingDays} Red Days</span>
          <span>{monthlyMetrics.totalTrades} Trades Logged</span>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
        {weekDayLabels.map((lbl) => (
          <div key={lbl} className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {lbl}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Leading blank slots for previous month overflow */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} className="h-12 sm:h-14 md:h-16 rounded-xl bg-transparent" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayData = heatmapData[dateStr];

          const isToday =
            new Date().toISOString().split('T')[0] === dateStr;

          let cellBg = 'bg-slate-100/80 dark:bg-slate-900/40 hover:bg-slate-200/60 dark:hover:bg-slate-800/50';
          let borderStyle = 'border border-slate-200/60 dark:border-slate-800/60';
          let pnlTextColor = 'text-slate-400';

          if (dayData) {
            if (dayData.pnl > 0) {
              cellBg = 'bg-emerald-500/10 hover:bg-emerald-500/20';
              borderStyle = 'border border-emerald-500/30';
              pnlTextColor = 'text-emerald-600 dark:text-emerald-400';
            } else if (dayData.pnl < 0) {
              cellBg = 'bg-rose-500/10 hover:bg-rose-500/20';
              borderStyle = 'border border-rose-500/30';
              pnlTextColor = 'text-rose-600 dark:text-rose-400';
            }
          }

          if (isToday) {
            borderStyle += ' ring-2 ring-indigo-500/50';
          }

          return (
            <div
              key={dateStr}
              onClick={() => dayData ? setHoveredDay(prev => prev?.date === dateStr ? null : { date: dateStr, ...dayData }) : setHoveredDay(null)}
              onMouseEnter={() => dayData ? setHoveredDay({ date: dateStr, ...dayData }) : setHoveredDay(null)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`h-12 sm:h-14 md:h-16 p-1 sm:p-1.5 rounded-xl flex flex-col justify-between transition-all duration-150 cursor-pointer ${cellBg} ${borderStyle}`}
            >
              <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                <span className={`font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'}`}>
                  {dayNum}
                </span>
                {dayData && (
                  <span className="text-[8px] sm:text-[9px] px-0.5 sm:px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {dayData.count}t
                  </span>
                )}
              </div>

              {dayData ? (
                <div className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold font-mono truncate text-right ${pnlTextColor}`}>
                  {dayData.pnl >= 0 ? '+' : ''}{currency}{dayData.pnl.toFixed(0)}
                </div>
              ) : (
                <div className="text-[9px] text-slate-300 dark:text-slate-700 text-right">—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 text-xs flex items-center justify-between animate-in fade-in duration-100 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="font-bold">{hoveredDay.date}</span>
            <span className="text-slate-400">• {hoveredDay.count} trade(s)</span>
          </div>
          <div className="font-mono font-bold">
            <span className={hoveredDay.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {hoveredDay.pnl >= 0 ? '+' : ''}{currency}{hoveredDay.pnl.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
