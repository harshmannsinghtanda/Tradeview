import { Trade } from '../types/trade';
import { calculateTradeFinancials } from './calculations';

interface RawSampleTrade {
  id: string;
  symbol: string;
  assetClass: 'Crypto' | 'Stocks' | 'Forex' | 'Futures' | 'Options';
  direction: 'Long' | 'Short';
  status: 'Closed' | 'Open';
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  fees: number;
  strategy: string;
  emotion: 'Disciplined' | 'Patient' | 'Calm' | 'FOMO' | 'Revenge' | 'Hesitant' | 'Greedy' | 'Fearful' | 'Overconfident' | 'Boredom';
  rating?: number;
  notes?: string;
  lessons?: string;
  createdAt: number;
  updatedAt: number;
}

const RAW_SAMPLES: RawSampleTrade[] = [
  {
    id: 'tr_101',
    symbol: 'NVDA',
    assetClass: 'Stocks',
    direction: 'Long',
    status: 'Closed',
    entryDate: '2026-08-18T14:30:00.000Z',
    exitDate: '2026-08-18T19:45:00.000Z',
    entryPrice: 124.50,
    exitPrice: 131.20,
    quantity: 100,
    stopLoss: 121.50,
    takeProfit: 132.00,
    fees: 2.50,
    strategy: 'Earnings Momentum',
    emotion: 'Disciplined',
    rating: 5,
    notes: 'Clean continuation above opening range high after strong datacenter guidance.',
    lessons: 'Held winners to target without micro-managing.',
    createdAt: Date.now() - 15 * 86400000,
    updatedAt: Date.now() - 15 * 86400000,
  },
  {
    id: 'tr_102',
    symbol: 'BTC/USDT',
    assetClass: 'Crypto',
    direction: 'Long',
    status: 'Closed',
    entryDate: '2026-08-20T08:15:00.000Z',
    exitDate: '2026-08-21T11:00:00.000Z',
    entryPrice: 62400,
    exitPrice: 64850,
    quantity: 0.5,
    stopLoss: 61500,
    takeProfit: 65000,
    fees: 12.40,
    strategy: 'Daily Demand Zone',
    emotion: 'Patient',
    rating: 5,
    notes: 'Waited for 4H sweep of liquidity below weekly low. Immediate impulse candle confirmation.',
    lessons: 'Patience paid off instead of buying the initial wick.',
    createdAt: Date.now() - 13 * 86400000,
    updatedAt: Date.now() - 13 * 86400000,
  },
  {
    id: 'tr_103',
    symbol: 'TSLA',
    assetClass: 'Stocks',
    direction: 'Short',
    status: 'Closed',
    entryDate: '2026-08-22T15:00:00.000Z',
    exitDate: '2026-08-22T16:15:00.000Z',
    entryPrice: 220.00,
    exitPrice: 225.80,
    quantity: 80,
    stopLoss: 224.00,
    takeProfit: 212.00,
    fees: 3.00,
    strategy: 'Gap & Crap Fade',
    emotion: 'FOMO',
    rating: 2,
    notes: 'Entered too early without waiting for 15m rejection candle. Slipped past my stop loss.',
    lessons: 'Do not anticipate rejections before price actually turns.',
    createdAt: Date.now() - 11 * 86400000,
    updatedAt: Date.now() - 11 * 86400000,
  },
  {
    id: 'tr_104',
    symbol: 'EUR/USD',
    assetClass: 'Forex',
    direction: 'Short',
    status: 'Closed',
    entryDate: '2026-08-25T07:30:00.000Z',
    exitDate: '2026-08-25T14:20:00.000Z',
    entryPrice: 1.0890,
    exitPrice: 1.0825,
    quantity: 100000,
    stopLoss: 1.0915,
    takeProfit: 1.0810,
    fees: 6.00,
    strategy: 'London Session Breakout',
    emotion: 'Calm',
    rating: 4,
    notes: 'ECB dovish comments triggered sharp dollar surge during London open.',
    lessons: 'Trailing stop protected 75% of profit when volatility expanded.',
    createdAt: Date.now() - 8 * 86400000,
    updatedAt: Date.now() - 8 * 86400000,
  },
  {
    id: 'tr_105',
    symbol: 'NQ_FUT',
    assetClass: 'Futures',
    direction: 'Long',
    status: 'Closed',
    entryDate: '2026-08-27T13:45:00.000Z',
    exitDate: '2026-08-27T14:30:00.000Z',
    entryPrice: 19820,
    exitPrice: 19740,
    quantity: 2,
    stopLoss: 19750,
    takeProfit: 19950,
    fees: 8.50,
    strategy: 'ICT Fair Value Gap',
    emotion: 'Revenge',
    rating: 1,
    notes: 'Tried to catch a falling knife right before Fed speech. Violated daily rule of max 2 trades.',
    lessons: 'Stop trading completely after a red session. Revenge trades always bleed capital.',
    createdAt: Date.now() - 6 * 86400000,
    updatedAt: Date.now() - 6 * 86400000,
  },
  {
    id: 'tr_106',
    symbol: 'SOL/USDT',
    assetClass: 'Crypto',
    direction: 'Long',
    status: 'Closed',
    entryDate: '2026-08-29T10:00:00.000Z',
    exitDate: '2026-08-30T18:00:00.000Z',
    entryPrice: 142.50,
    exitPrice: 156.80,
    quantity: 35,
    stopLoss: 137.00,
    takeProfit: 158.00,
    fees: 7.20,
    strategy: 'Bull Flag Breakout',
    emotion: 'Disciplined',
    rating: 5,
    notes: 'Clean multi-day consolidation break with rising spot volume.',
    lessons: 'Executions aligned with plan. Trimmed 50% at +2R and let runner hit 156.80.',
    createdAt: Date.now() - 4 * 86400000,
    updatedAt: Date.now() - 4 * 86400000,
  },
  {
    id: 'tr_107',
    symbol: 'AAPL',
    assetClass: 'Stocks',
    direction: 'Long',
    status: 'Closed',
    entryDate: '2026-09-01T14:00:00.000Z',
    exitDate: '2026-09-02T18:30:00.000Z',
    entryPrice: 226.00,
    exitPrice: 232.50,
    quantity: 75,
    stopLoss: 223.00,
    takeProfit: 234.00,
    fees: 2.00,
    strategy: 'VWAP Reclaim',
    emotion: 'Calm',
    rating: 4,
    notes: 'Market opened weak, tech names caught bids at 200 EMA on 1H chart.',
    lessons: 'Stuck to plan with zero stress.',
    createdAt: Date.now() - 2 * 86400000,
    updatedAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'tr_108',
    symbol: 'ETH/USDT',
    assetClass: 'Crypto',
    direction: 'Long',
    status: 'Open',
    entryDate: '2026-09-03T16:00:00.000Z',
    entryPrice: 2480,
    quantity: 2.5,
    stopLoss: 2390,
    takeProfit: 2680,
    fees: 4.50,
    strategy: 'Weekly Key Level Bounce',
    emotion: 'Disciplined',
    notes: 'Swing position targeting previous range highs. Currently holding.',
    createdAt: Date.now() - 1 * 86400000,
    updatedAt: Date.now() - 1 * 86400000,
  }
];

export const SAMPLE_TRADES: Trade[] = RAW_SAMPLES.map(t => {
  const fin = calculateTradeFinancials(t);
  const trade: Trade = {
    ...t,
    grossPnl: fin.grossPnl,
    netPnl: fin.netPnl,
    pnlPercentage: fin.pnlPercentage,
    rMultiple: fin.rMultiple,
  };
  return trade;
});
