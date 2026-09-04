import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Trade, 
  AssetClass, 
  TradeDirection, 
  TradeStatus, 
  TradeEmotion 
} from '../../types/trade';
import { calculateTradeFinancials } from '../../lib/calculations';
import { Button } from '../common/Button';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  initialTrade?: Trade | null;
  currency?: string;
}

export function TradeFormModal({
  isOpen,
  onClose,
  onSave,
  initialTrade,
  currency = '$',
}: TradeFormModalProps) {
  // Form State
  const [symbol, setSymbol] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Crypto');
  const [direction, setDirection] = useState<TradeDirection>('Long');
  const [status, setStatus] = useState<TradeStatus>('Closed');

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().substring(0, 16));
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().substring(0, 16));

  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [fees, setFees] = useState<string>('0');

  const [strategy, setStrategy] = useState('Breakout');
  const [customStrategy, setCustomStrategy] = useState('');
  const [emotion, setEmotion] = useState<TradeEmotion>('Disciplined');
  const [notes, setNotes] = useState('');
  const [lessons, setLessons] = useState('');

  // Hydrate when editing
  useEffect(() => {
    if (initialTrade) {
      setSymbol(initialTrade.symbol);
      setAssetClass(initialTrade.assetClass);
      setDirection(initialTrade.direction);
      setStatus(initialTrade.status);
      setEntryDate(initialTrade.entryDate.substring(0, 16));
      setExitDate(initialTrade.exitDate ? initialTrade.exitDate.substring(0, 16) : '');
      setEntryPrice(String(initialTrade.entryPrice));
      setExitPrice(initialTrade.exitPrice ? String(initialTrade.exitPrice) : '');
      setQuantity(String(initialTrade.quantity));
      setStopLoss(initialTrade.stopLoss ? String(initialTrade.stopLoss) : '');
      setTakeProfit(initialTrade.takeProfit ? String(initialTrade.takeProfit) : '');
      setFees(String(initialTrade.fees || 0));
      setStrategy(initialTrade.strategy || 'Breakout');
      setEmotion(initialTrade.emotion || 'Disciplined');
      setNotes(initialTrade.notes || '');
      setLessons(initialTrade.lessons || '');
    } else {
      // Reset defaults
      setSymbol('');
      setAssetClass('Crypto');
      setDirection('Long');
      setStatus('Closed');
      const nowStr = new Date().toISOString().substring(0, 16);
      setEntryDate(nowStr);
      setExitDate(nowStr);
      setEntryPrice('');
      setExitPrice('');
      setQuantity('1');
      setStopLoss('');
      setTakeProfit('');
      setFees('0');
      setStrategy('Breakout');
      setCustomStrategy('');
      setEmotion('Disciplined');
      setNotes('');
      setLessons('');
    }
  }, [initialTrade, isOpen]);

  // Real-time financial calculations
  const financials = useMemo(() => {
    return calculateTradeFinancials({
      entryPrice: parseFloat(entryPrice) || 0,
      exitPrice: status === 'Closed' ? (parseFloat(exitPrice) || 0) : undefined,
      quantity: parseFloat(quantity) || 0,
      fees: parseFloat(fees) || 0,
      direction,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    });
  }, [entryPrice, exitPrice, quantity, fees, direction, stopLoss, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !entryPrice) return;

    const parsedEntry = parseFloat(entryPrice);
    const parsedExit = status === 'Closed' ? (parseFloat(exitPrice) || parsedEntry) : undefined;
    const parsedQty = parseFloat(quantity) || 1;
    const parsedFees = parseFloat(fees) || 0;
    const parsedStopLoss = stopLoss ? parseFloat(stopLoss) : undefined;
    const parsedTakeProfit = takeProfit ? parseFloat(takeProfit) : undefined;

    const finalTrade: Trade = {
      id: initialTrade ? initialTrade.id : 'tr_' + Math.random().toString(36).substring(2, 9),
      symbol: symbol.trim().toUpperCase(),
      assetClass,
      direction,
      status,
      entryDate: new Date(entryDate).toISOString(),
      exitDate: status === 'Closed' ? (exitDate ? new Date(exitDate).toISOString() : new Date().toISOString()) : undefined,
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      quantity: parsedQty,
      stopLoss: parsedStopLoss,
      takeProfit: parsedTakeProfit,
      fees: parsedFees,
      grossPnl: financials.grossPnl,
      netPnl: financials.netPnl,
      pnlPercentage: financials.pnlPercentage,
      rMultiple: financials.rMultiple,
      strategy: customStrategy.trim() || strategy,
      emotion,
      notes: notes.trim(),
      lessons: lessons.trim(),
      createdAt: initialTrade ? initialTrade.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    // Confetti celebration if big win!
    if (finalTrade.netPnl && finalTrade.netPnl > 50) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }

    onSave(finalTrade);
    onClose();
  };

  if (!isOpen) return null;

  const strategiesList = [
    'Breakout',
    'Pullback / Retest',
    'Supply & Demand',
    'ICT / SMC',
    'Trend Following',
    'Range Bound',
    'VWAP Reclaim',
    'Earnings Momentum',
    'Scalp',
    'Custom...',
  ];

  const emotionList: TradeEmotion[] = [
    'Disciplined',
    'Patient',
    'Calm',
    'FOMO',
    'Revenge',
    'Hesitant',
    'Greedy',
    'Fearful',
    'Overconfident',
    'Boredom',
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window with Emil Kowalski spring motion */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#101422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-4 sm:my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialTrade ? 'Edit Trade Entry' : 'Log New Execution'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Record exact execution prices, parameters, and psychological state
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[82vh] sm:max-h-[80vh] overflow-y-auto">
            
            {/* Top Row: Symbol, Asset Class, Direction, Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ticker / Symbol *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BTC, AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Market
                </label>
                <select
                  value={assetClass}
                  onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Forex">Forex</option>
                  <option value="Futures">Futures</option>
                  <option value="Options">Options</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDirection('Long')}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      direction === 'Long'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('Short')}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      direction === 'Short'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Short
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TradeStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="Closed">Closed</option>
                  <option value="Open">Open (Active)</option>
                </select>
              </div>
            </div>

            {/* Pricing & Sizing Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entry Price *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exit Price {status === 'Open' && '(Optional)'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  disabled={status === 'Open'}
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums disabled:opacity-40 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity / Size
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fees / Commissions
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>

            {/* Risk Management: SL & TP */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stop Loss (For R:R calculation)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 95.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-rose-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Take Profit Target
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 115.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
              </div>
            </div>

            {/* Live Financial Outcome Preview Card */}
            {status === 'Closed' && entryPrice && exitPrice && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Live Outcome:</span>
                </div>

                <div className="flex items-center gap-4 font-mono font-bold">
                  <span className={financials.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    Net P&L: {financials.netPnl >= 0 ? '+' : ''}{currency}{financials.netPnl.toFixed(2)} ({financials.pnlPercentage.toFixed(2)}%)
                  </span>

                  {financials.rMultiple !== 0 && (
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      financials.rMultiple > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {financials.rMultiple > 0 ? '+' : ''}{financials.rMultiple}R
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entry Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exit Date & Time {status === 'Open' && '(Auto-disabled)'}
                </label>
                <input
                  type="datetime-local"
                  disabled={status === 'Open'}
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>

            {/* Strategy / Setup & Custom input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Setup / Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  {strategiesList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {strategy === 'Custom...' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom strategy name"
                    value={customStrategy}
                    onChange={(e) => setCustomStrategy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                )}
              </div>
            </div>

            {/* Emotional State Chips */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mindset & Psychology State
              </label>
              <div className="flex flex-wrap gap-1.5">
                {emotionList.map((em) => {
                  const isSelected = emotion === em;
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmotion(em)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes & Reflections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entry Rationale & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="What was the catalyst? Key levels respected..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lessons & Review
                </label>
                <textarea
                  rows={2}
                  placeholder="Did you follow trading rules? What to do better next time?"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                {initialTrade ? 'Update Trade' : 'Save Execution'}
              </Button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
