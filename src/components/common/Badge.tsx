import React from 'react';
import { AssetClass, TradeDirection, TradeEmotion, TradeStatus } from '../../types/trade';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'profit' | 'loss' | 'warning' | 'info' | 'purple' | 'pink';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60',
    profit: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    loss: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25',
    pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/25',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: TradeDirection }) {
  return (
    <Badge variant={direction === 'Long' ? 'profit' : 'loss'}>
      {direction === 'Long' ? '▲ Long' : '▼ Short'}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: TradeStatus }) {
  return (
    <Badge variant={status === 'Open' ? 'warning' : 'default'}>
      {status === 'Open' ? '● Open' : '✓ Closed'}
    </Badge>
  );
}

export function AssetBadge({ assetClass }: { assetClass: AssetClass }) {
  const map: Record<AssetClass, 'purple' | 'info' | 'profit' | 'warning' | 'pink'> = {
    Crypto: 'purple',
    Stocks: 'info',
    Forex: 'profit',
    Futures: 'warning',
    Options: 'pink',
  };
  return <Badge variant={map[assetClass]}>{assetClass}</Badge>;
}

export function EmotionBadge({ emotion }: { emotion: TradeEmotion }) {
  let variant: 'profit' | 'warning' | 'loss' | 'default' = 'default';
  if (['Disciplined', 'Patient', 'Calm'].includes(emotion)) variant = 'profit';
  else if (['FOMO', 'Greedy', 'Overconfident'].includes(emotion)) variant = 'warning';
  else if (['Revenge', 'Fearful', 'Hesitant'].includes(emotion)) variant = 'loss';

  return <Badge variant={variant}>{emotion}</Badge>;
}
