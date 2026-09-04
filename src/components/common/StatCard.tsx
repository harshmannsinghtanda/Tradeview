import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  tone?: 'profit' | 'loss' | 'neutral' | 'brand';
  tooltip?: string;
}

export function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
  tone = 'neutral',
  tooltip,
}: StatCardProps) {
  const toneBorder = {
    profit: 'hover:border-emerald-500/40 border-emerald-500/20',
    loss: 'hover:border-rose-500/40 border-rose-500/20',
    brand: 'hover:border-indigo-500/40 border-indigo-500/20',
    neutral: 'hover:border-slate-300 dark:hover:border-slate-700/80 border-slate-200 dark:border-slate-800/80',
  };

  const toneText = {
    profit: 'text-emerald-500 dark:text-emerald-400',
    loss: 'text-rose-500 dark:text-rose-400',
    brand: 'text-indigo-600 dark:text-indigo-400',
    neutral: 'text-slate-900 dark:text-slate-100',
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`glass-panel relative rounded-2xl p-3.5 sm:p-5 border transition-all duration-200 overflow-hidden group shadow-sm ${toneBorder[tone]}`}
      title={tooltip}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{title}</span>
        {icon && (
          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition-transform group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
        <span className={`text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums ${toneText[tone]}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-[10px] sm:text-xs font-semibold ${
              trend === 'up'
                ? 'text-emerald-500'
                : trend === 'down'
                ? 'text-rose-500'
                : 'text-slate-400'
            }`}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
          </span>
        )}
      </div>

      {subValue && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {subValue}
        </p>
      )}
    </motion.div>
  );
}
