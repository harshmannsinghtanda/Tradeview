import { useState, useMemo } from 'react';
import { Trade } from '../../types/trade';
import { buildCumulativePnlSeries } from '../../lib/calculations';
import { TrendingUp } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface PnlChartProps {
  trades: Trade[];
}

export function PnlChart({ trades }: PnlChartProps) {
  const { formatCurrency } = useCurrency();
  const [timeframe, setTimeframe] = useState<'ALL' | '30D' | '7D'>('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series = useMemo(() => {
    const rawSeries = buildCumulativePnlSeries(trades);
    if (timeframe === 'ALL' || rawSeries.length <= 1) return rawSeries;

    const now = Date.now();
    const days = timeframe === '30D' ? 30 : 7;
    const cutoff = now - days * 86400000;

    const filtered = rawSeries.filter(p => new Date(p.date).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : rawSeries;
  }, [trades, timeframe]);

  // Chart dimensions & calculations
  const width = 800;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { points, maxVal, zeroY, pathD, areaD, isOverallPositive } = useMemo(() => {
    if (series.length === 0) {
      return {
        points: [],
        maxVal: 100,
        zeroY: height / 2,
        pathD: '',
        areaD: '',
        isOverallPositive: true,
      };
    }

    const values = series.map(s => s.cumulative);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);

    // Give 10% breathing headroom
    const range = max - min || 100;
    min -= range * 0.08;
    max += range * 0.08;

    const getY = (val: number) => {
      const normalized = (val - min) / (max - min);
      return padding.top + chartHeight - normalized * chartHeight;
    };

    const getX = (idx: number) => {
      if (series.length === 1) return padding.left + chartWidth / 2;
      return padding.left + (idx / (series.length - 1)) * chartWidth;
    };

    const zeroY = getY(0);

    const calculatedPoints = series.map((s, i) => ({
      x: getX(i),
      y: getY(s.cumulative),
      data: s,
    }));

    // SVG path string
    const pathSegments = calculatedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const pathD = pathSegments.join(' ');

    const lastX = calculatedPoints[calculatedPoints.length - 1].x;
    const firstX = calculatedPoints[0].x;
    const areaD = `${pathD} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    const lastCumulative = series[series.length - 1].cumulative;

    return {
      points: calculatedPoints,
      minVal: min,
      maxVal: max,
      zeroY,
      pathD,
      areaD,
      isOverallPositive: lastCumulative >= 0,
    };
  }, [series, chartWidth, chartHeight]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  if (series.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-3">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Closed Trades Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Add or close your first trade to generate your real-time cumulative equity curve and performance chart.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative">
      {/* Top Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Cumulative Equity Curve</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isOverallPositive 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {isOverallPositive ? 'Profitable Phase' : 'Drawdown Phase'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Net realized cumulative returns over trade chronological sequence
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          {(['ALL', '30D', '7D'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                timeframe === t
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-slate-300 dark:text-slate-700"
            strokeWidth="1.5"
          />

          {/* Zero baseline label */}
          <text
            x={padding.left - 10}
            y={zeroY + 4}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono font-medium"
          >
            {formatCurrency(0)}
          </text>

          {/* Top peak label */}
          <text
            x={padding.left - 10}
            y={padding.top + 5}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-mono font-medium"
          >
            {formatCurrency(maxVal)}
          </text>

          {/* Area fill */}
          {areaD && (
            <path
              d={areaD}
              fill={isOverallPositive ? 'url(#profitGradient)' : 'url(#lossGradient)'}
            />
          )}

          {/* Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={isOverallPositive ? '#10b981' : '#f43f5e'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points and interactive hover hit areas */}
          {points.map((p, idx) => (
            <g key={idx}>
              {/* Invisible wide mouse hit column */}
              <rect
                x={p.x - 15}
                y={padding.top}
                width={30}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
              />

              {/* Point circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? 6 : 3.5}
                fill={p.data.pnl >= 0 ? '#10b981' : '#f43f5e'}
                className="transition-all duration-150 stroke-white dark:stroke-[#0a0c14]"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Active Crosshair indicator */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={height - padding.bottom}
                stroke="currentColor"
                strokeDasharray="2 2"
                className="text-indigo-400/80"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && (
          <div
            className="absolute pointer-events-none z-20 bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 rounded-xl px-3 py-2 text-xs shadow-xl backdrop-blur-md transition-all duration-100 -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <span className="text-slate-300">{activePoint.data.symbol}</span>
              <span className="text-[10px] text-slate-400 font-mono">{activePoint.data.date}</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Trade P&L:</span>
                <span className={`font-mono font-bold ${activePoint.data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activePoint.data.pnl >= 0 ? '+' : ''}{formatCurrency(activePoint.data.pnl)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Cumulative:</span>
                <span className="font-mono font-bold text-white">
                  {activePoint.data.cumulative >= 0 ? '+' : ''}{formatCurrency(activePoint.data.cumulative)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer trade timeline points indicator */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-2">
        <span>Start: {series[0]?.date}</span>
        <span>{series.length} Closed Trades Sampled</span>
        <span>Latest: {series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
