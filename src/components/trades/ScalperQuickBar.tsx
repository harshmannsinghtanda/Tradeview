import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trade, AssetClass, TradeDirection, TradeEmotion } from '../../types/trade';
import { calculateTradeFinancials } from '../../lib/calculations';
import { Button } from '../common/Button';

interface ScalperQuickBarProps {
  onSaveTrade: (trade: Trade) => void;
  currency?: string;
}

export function ScalperQuickBar({ onSaveTrade, currency = '$' }: ScalperQuickBarProps) {
  const [symbol, setSymbol] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Futures');
  const [direction, setDirection] = useState<TradeDirection>('Long');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [fees] = useState('1.5');
  const [emotion, setEmotion] = useState<TradeEmotion>('Disciplined');

  const symbolInputRef = useRef<HTMLInputElement>(null);

  // Live P&L preview
  const livePnl = useMemo(() => {
    if (!entryPrice || !exitPrice) return null;
    return calculateTradeFinancials({
      entryPrice: parseFloat(entryPrice) || 0,
      exitPrice: parseFloat(exitPrice) || 0,
      quantity: parseFloat(quantity) || 1,
      fees: parseFloat(fees) || 0,
      direction,
    });
  }, [entryPrice, exitPrice, quantity, fees, direction]);

  const handleQuickSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol.trim() || !entryPrice || !exitPrice) return;

    const parsedEntry = parseFloat(entryPrice);
    const parsedExit = parseFloat(exitPrice);
    const parsedQty = parseFloat(quantity) || 1;
    const parsedFees = parseFloat(fees) || 0;

    const fin = calculateTradeFinancials({
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      quantity: parsedQty,
      fees: parsedFees,
      direction,
    });

    const now = new Date().toISOString();

    const newTrade: Trade = {
      id: 'scalp_' + Math.random().toString(36).substring(2, 9),
      symbol: symbol.trim().toUpperCase(),
      assetClass,
      direction,
      status: 'Closed',
      entryDate: now,
      exitDate: now,
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      quantity: parsedQty,
      fees: parsedFees,
      grossPnl: fin.grossPnl,
      netPnl: fin.netPnl,
      pnlPercentage: fin.pnlPercentage,
      rMultiple: fin.rMultiple,
      strategy: '⚡ Scalp Execution',
      emotion,
      notes: `Quick Scalp (${direction} ${parsedQty}x @ ${parsedEntry} → ${parsedExit})`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (fin.netPnl > 30) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    onSaveTrade(newTrade);

    // Reset price fields but keep symbol or ready for next scalp
    setExitPrice('');
    setEntryPrice('');
    // Auto focus symbol input for rapid continuous logging
    symbolInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 dark:border-amber-400/30 shadow-sm backdrop-blur-md"
    >
      {/* Top Banner with Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400">
            <Zap className="w-4 h-4 fill-amber-500/30 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            ⚡ Quick-Strike Scalper Bar
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
            Sub-3s Logging
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-300 dark:border-slate-700">Enter</kbd> to log
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-300 dark:border-slate-700">Tab</kbd> to next field
          </span>
        </div>
      </div>

      {/* Inputs Form Strip */}
      <form onSubmit={handleQuickSubmit} onKeyDown={handleKeyDown}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-center">
          
          {/* Symbol */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Symbol
            </label>
            <input
              ref={symbolInputRef}
              type="text"
              required
              placeholder="e.g. NQ, BTC"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>

          {/* Asset Class */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Market
            </label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as AssetClass)}
              className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
            >
              <option value="Futures">Futures</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Forex">Forex</option>
              <option value="Options">Options</option>
            </select>
          </div>

          {/* Direction Toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Side
            </label>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/80 dark:bg-slate-900 rounded-xl border border-slate-300/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDirection('Long')}
                className={`py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-0.5 ${
                  direction === 'Long'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" /> L
              </button>
              <button
                type="button"
                onClick={() => setDirection('Short')}
                className={`py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-0.5 ${
                  direction === 'Short'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3 h-3" /> S
              </button>
            </div>
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Entry Price
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="Entry"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>

          {/* Exit Price */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Exit Price
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="Exit"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>

          {/* Size / Qty */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Size / Lots
            </label>
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>

          {/* Emotion Quick Tag */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              Mindset
            </label>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value as TradeEmotion)}
              className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
            >
              <option value="Disciplined">Disciplined</option>
              <option value="Patient">Patient</option>
              <option value="Calm">Calm</option>
              <option value="FOMO">FOMO</option>
              <option value="Revenge">Revenge</option>
              <option value="Hesitant">Hesitant</option>
              <option value="Greedy">Greedy</option>
            </select>
          </div>

          {/* Submit Action & Live PnL Pill */}
          <div className="flex flex-col justify-end">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
              {livePnl ? (
                <span className={livePnl.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {livePnl.netPnl >= 0 ? '+' : ''}{currency}{livePnl.netPnl.toFixed(1)}
                </span>
              ) : 'Action'}
            </span>
            <Button
              type="submit"
              variant="profit"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
              className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 border-amber-600/40 text-slate-950"
            >
              Log Scalp
            </Button>
          </div>

        </div>
      </form>
    </motion.div>
  );
}
