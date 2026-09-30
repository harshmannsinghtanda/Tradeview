export type AssetClass = 'Crypto' | 'Stocks' | 'Forex' | 'Futures' | 'Options';

export type TradeDirection = 'Long' | 'Short';

export type TradeStatus = 'Closed' | 'Open';

export type TradeEmotion = 
  | 'Disciplined' 
  | 'Patient' 
  | 'Calm' 
  | 'FOMO' 
  | 'Revenge' 
  | 'Hesitant' 
  | 'Greedy' 
  | 'Fearful' 
  | 'Overconfident' 
  | 'Boredom';

export type BehavioralPatternFlag = 
  | 'Revenge Trading'
  | 'Overtrading Streak'
  | 'Oversized Risk'
  | 'Premature Exit'
  | 'FOMO Chase'
  | 'Zombie Bag-Holding'
  | 'Midday Chop Trap'
  | 'Martingale Escalation';

export const POPULAR_PATTERNS = [
  // Candlestick Patterns
  'Hammer / Pin Bar',
  'Bullish Engulfing',
  'Bearish Engulfing',
  'Morning Star',
  'Evening Star',
  'Doji / Reversal',
  'Inside Bar',
  // Classical Chart Patterns
  'Breakout & Retest',
  'Double Bottom (W)',
  'Double Top (M)',
  'Head & Shoulders',
  'Inverse Head & Shoulders',
  'Bull Flag',
  'Bear Flag',
  'Ascending Triangle',
  'Descending Triangle',
  // Modern Market Structure / SMC
  'Fair Value Gap (FVG)',
  'Liquidity Sweep',
  'Order Block',
  'CHoCH (Change of Character)',
  'Opening Range Breakout (ORB)',
  'VWAP Pullback',
  'Supply / Demand Flip'
] as const;

export type TradingPattern = typeof POPULAR_PATTERNS[number] | string;

export interface Trade {
  id: string;
  symbol: string;               // e.g. BTC/USDT, AAPL, EUR/USD, NIFTY24OCTFUT
  assetClass: AssetClass;
  direction: TradeDirection;
  status: TradeStatus;
  
  // Dates
  entryDate: string;            // ISO String e.g. 2026-09-01T14:30
  exitDate?: string;            // ISO String e.g. 2026-09-01T16:45

  // Sizing & Prices
  entryPrice: number;
  exitPrice?: number;
  quantity: number;             // shares, coins, contracts, or lots
  stopLoss?: number;
  takeProfit?: number;
  fees: number;                 // commission, slippage, exchange fees

  // Derived / Calculated
  grossPnl?: number;            // before fees
  netPnl?: number;              // after fees
  pnlPercentage?: number;       // return %
  rMultiple?: number;           // Realized R:R relative to initial stop loss risk

  // Context & Qualitative
  strategy: string;             // e.g. Breakout, Pullback, Supply/Demand, ICT, Scalp
  patterns?: string[];          // Chart & Candlestick patterns identified
  behavioralFlags?: BehavioralPatternFlag[]; // Auto-detected or manual behavioral habits
  emotion: TradeEmotion;
  rating?: number;              // 1 to 5 stars self-review execution rating
  notes?: string;               // Key reflections, entry reasoning
  lessons?: string;             // What to improve next time
  imageUrl?: string;            // Chart screenshot URL or base64 preview

  createdAt: number;            // timestamp
  updatedAt: number;            // timestamp
}

export interface TradeFiltersState {
  search: string;
  assetClass: AssetClass | 'All';
  direction: TradeDirection | 'All';
  status: TradeStatus | 'All';
  pattern?: string;
  emotion: TradeEmotion | 'All';
  strategy: string;
  dateRange: 'All' | 'Today' | '7d' | '30d' | '90d' | 'YTD' | 'Custom';
  customStartDate?: string;
  customEndDate?: string;
}

export interface PerformanceMetrics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;

  winRate: number;              // in % (0 - 100)
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;         // grossProfit / abs(grossLoss)

  avgWin: number;
  avgLoss: number;
  winLossRatio: number;         // avgWin / abs(avgLoss)

  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;          // absolute peak-to-trough
  maxDrawdownPercent: number;   // % peak-to-trough

  avgRMultiple: number;
  totalFees: number;
}
