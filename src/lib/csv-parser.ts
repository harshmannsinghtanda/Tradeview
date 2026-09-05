import { Trade, AssetClass, TradeDirection, TradeStatus, TradeEmotion } from '../types/trade';
import { calculateTradeFinancials } from './calculations';

export interface ParseCsvResult {
  trades: Trade[];
  errors: string[];
  brokerDetected?: string;
  summary?: {
    totalParsed: number;
    closedCount: number;
    openCount: number;
    winRate: number;
    netPnl: number;
    dateStart?: string;
    dateEnd?: string;
  };
}

/**
 * Strips UTF-8 Byte Order Mark (BOM) if present
 */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Detects the most likely delimiter (comma, semicolon, tab, pipe)
 */
function detectDelimiter(text: string): string {
  const sampleLines = text.split(/\r?\n/).slice(0, 10).filter(l => l.trim().length > 0);
  if (sampleLines.length === 0) return ',';

  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const line of sampleLines) {
    for (const d of Object.keys(counts)) {
      // Count delimiters outside quotes
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === d && !inQuotes) counts[d]++;
      }
    }
  }

  let bestDelimiter = ',';
  let maxCount = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }

  return maxCount > 0 ? bestDelimiter : ',';
}

/**
 * Universal CSV Line Splitter supporting arbitrary delimiters, quotes, escaped quotes
 */
function parseCsvLines(csvText: string, delimiter: string = ','): string[][] {
  const cleanText = stripBom(csvText);
  const lines: string[][] = [];
  const rawLines = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of rawLines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim().replace(/^"|"$/g, ''));
    lines.push(row);
  }
  return lines;
}

/**
 * Cleans monetary/numeric strings:
 * Removes currency symbols ($ € £ ₹ ¥ USDT), thousand commas, accounting parentheses '(100)' -> '-100'
 */
export function parseCleanNumber(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val || typeof val !== 'string') return fallback;

  let s = val.trim();
  if (!s) return fallback;

  // Handle accounting parentheses: '(120.50)' -> '-120.50'
  const isParenNegative = /^\((.*)\)$/.test(s);
  if (isParenNegative) {
    s = '-' + s.replace(/^\(|\)$/g, '');
  }

  // Remove currency symbols, commas, spaces, quotes
  s = s.replace(/[$€£₹¥]|USDT|USD|EUR|GBP|INR/gi, '');
  s = s.replace(/,/g, '');
  s = s.trim();

  const num = parseFloat(s);
  return isNaN(num) ? fallback : num;
}

/**
 * Resilient multi-format Date parser
 * Supports:
 * - ISO string: 2024-08-15T14:30:00Z
 * - YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD (with optional time)
 * - DD/MM/YYYY / DD-MM-YYYY / DD.MM.YYYY (Zerodha, UK, India, Europe)
 * - MM/DD/YYYY / MM-DD-YYYY (US)
 * - Timestamps in seconds (10 digits) or ms (13 digits)
 * NEVER throws RangeError: Invalid time value
 */
export function parseRobustDate(raw: any): string {
  if (!raw) return new Date().toISOString();

  if (typeof raw === 'number' && !isNaN(raw)) {
    const ms = raw < 1e11 ? raw * 1000 : raw;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  const s = String(raw).trim();
  if (!s) return new Date().toISOString();

  // Numeric timestamp as string (e.g. "1723714200000" or "1723714200")
  if (/^\d{10,13}$/.test(s)) {
    const num = parseInt(s, 10);
    const ms = s.length === 10 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Replace dots with hyphens or slashes for MetaTrader: "2024.08.15 14:30:00" -> "2024-08-15 14:30:00"
  const normalized = s.replace(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/, '$1-$2-$3');

  // Try standard parsing first
  try {
    const directDate = new Date(normalized);
    if (!isNaN(directDate.getTime())) {
      return directDate.toISOString();
    }
  } catch {
    // Ignore and proceed to regex matchers
  }

  // Check for DD/MM/YYYY or DD-MM-YYYY (e.g. 15/08/2024 or 15-08-2024)
  const dmyMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    // If day > 12, it is definitely DD/MM/YYYY
    // If month > 12, it was MM/DD/YYYY
    let actualDay = day;
    let actualMonth = month;
    if (day <= 12 && month > 11) {
      actualDay = month + 1;
      actualMonth = day - 1;
    }

    const constructed = new Date(Date.UTC(year, actualMonth, actualDay, hour, minute, sec));
    if (!isNaN(constructed.getTime())) {
      return constructed.toISOString();
    }
  }

  // Check for YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 12;
    const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;

    const constructed = new Date(Date.UTC(year, month, day, hour, minute, sec));
    if (!isNaN(constructed.getTime())) {
      return constructed.toISOString();
    }
  }

  // Final fallback: return current date rather than crashing
  return new Date().toISOString();
}

/**
 * Finds the actual table header row in CSV by checking rows 0..15 for trading keywords
 */
function findHeaderRowIndex(rows: string[][]): number {
  const tradingKeywords = [
    'symbol', 'ticker', 'instrument', 'tradingsymbol', 'item', 'market', 'pair', 'asset',
    'date', 'time', 'datetime', 'tradedate', 'opentime',
    'price', 'entry', 'entryprice', 'buyprice', 'avgprice', 'buyaverage',
    'exit', 'exitprice', 'sellprice', 'sellaverage', 'closeprice',
    'qty', 'quantity', 'shares', 'contracts', 'size', 'lots',
    'pnl', 'pl', 'profit', 'netpnl', 'realizedpl', 'realizedpnl',
    'side', 'direction', 'type', 'action', 'tradetype'
  ];

  let bestRowIdx = 0;
  let maxScore = -1;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    let score = 0;
    for (const cell of row) {
      const clean = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (tradingKeywords.some(kw => clean.includes(kw) || kw.includes(clean))) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestRowIdx = i;
    }
  }

  return maxScore >= 2 ? bestRowIdx : 0;
}

/**
 * Detects the broker format based on headers and column names
 */
function detectBrokerFormat(headerMap: Record<string, number>): string {
  const keys = Object.keys(headerMap);

  if (keys.includes('tradingsymbol') || keys.includes('buyaverage') || keys.includes('realizedpl') || (keys.includes('tradetype') && keys.includes('isin'))) {
    return 'Zerodha (Kite)';
  }
  if (keys.includes('dateutc') && (keys.includes('fee') || keys.includes('feecoin') || keys.includes('market'))) {
    return 'Binance';
  }
  if ((keys.includes('item') || keys.includes('ticket')) && (keys.includes('opentime') || keys.includes('closetime') || keys.includes('sl'))) {
    return 'MetaTrader 4 / 5';
  }
  if (keys.includes('tprice') || keys.includes('cprice') || keys.includes('datadis不思議') || keys.includes('realizedpl') && keys.includes('basis')) {
    return 'Interactive Brokers (IBKR)';
  }
  if (keys.includes('rmultiple') || (keys.includes('strategy') && keys.includes('emotion'))) {
    return 'TradeView Journal Format';
  }
  return 'Standard / Broker CSV';
}

/**
 * Parses generic or broker CSV data into Trade models
 */
export function parseTradesFromCsv(csvContent: string): ParseCsvResult {
  if (!csvContent || !csvContent.trim()) {
    return { trades: [], errors: ['CSV content is empty.'] };
  }

  const delimiter = detectDelimiter(csvContent);
  const parsedRows = parseCsvLines(csvContent, delimiter);

  if (parsedRows.length < 2) {
    return { trades: [], errors: ['CSV file has no valid trade rows.'] };
  }

  const headerRowIdx = findHeaderRowIndex(parsedRows);
  const rawHeaders = parsedRows[headerRowIdx].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Header map supporting multi-column duplicates like MetaTrader's two 'Price' columns
  const headerMap: Record<string, number> = {};
  const duplicateHeaderIndices: Record<string, number[]> = {};

  rawHeaders.forEach((h, idx) => {
    if (headerMap[h] === undefined) {
      headerMap[h] = idx;
      duplicateHeaderIndices[h] = [idx];
    } else {
      duplicateHeaderIndices[h].push(idx);
    }
  });

  const brokerDetected = detectBrokerFormat(headerMap);

  const getCol = (row: string[], ...aliases: string[]): string | undefined => {
    for (const a of aliases) {
      const cleanAlias = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = headerMap[cleanAlias];
      if (idx !== undefined && row[idx] !== undefined && row[idx].trim() !== '') {
        return row[idx].trim();
      }
    }
    return undefined;
  };

  // Check if we need to pair separate Buy & Sell order executions (e.g. Zerodha Tradebook)
  const isExecutionLog = (headerMap['tradetype'] !== undefined || headerMap['type'] !== undefined) &&
    headerMap['exitprice'] === undefined &&
    headerMap['sellaverage'] === undefined &&
    headerMap['realizedpl'] === undefined &&
    headerMap['profit'] === undefined &&
    headerMap['pnl'] === undefined;

  if (isExecutionLog) {
    const pairedResult = pairExecutionLogTrades(parsedRows.slice(headerRowIdx + 1), getCol, brokerDetected);
    if (pairedResult.trades.length > 0) {
      return pairedResult;
    }
  }

  const trades: Trade[] = [];
  const errors: string[] = [];

  for (let i = headerRowIdx + 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || row.every(cell => !cell)) continue;

    try {
      // Symbol
      const symbol = (
        getCol(row, 'symbol', 'ticker', 'tradingsymbol', 'instrument', 'item', 'market', 'pair', 'asset', 'security', 'description') || 'UNKNOWN'
      ).replace(/['"]/g, '').trim().toUpperCase();

      if (symbol === 'UNKNOWN' && row.length <= 2) {
        continue; // skip trailing footer lines or blank rows
      }

      // Direction
      const dirRaw = (
        getCol(row, 'direction', 'side', 'type', 'action', 'tradetype', 'buysell', 'order') || 'BUY'
      ).toUpperCase();
      const direction: TradeDirection = dirRaw.includes('SHORT') || dirRaw.includes('SELL') ? 'Short' : 'Long';

      // Special handling for MetaTrader's two 'Price' columns (Open Price = 1st, Close Price = 2nd)
      let mt4EntryPrice: number | undefined;
      let mt4ExitPrice: number | undefined;
      if (duplicateHeaderIndices['price'] && duplicateHeaderIndices['price'].length >= 2) {
        mt4EntryPrice = parseCleanNumber(row[duplicateHeaderIndices['price'][0]]);
        mt4ExitPrice = parseCleanNumber(row[duplicateHeaderIndices['price'][1]]);
      }

      // Entry Price
      const entryPriceVal = mt4EntryPrice !== undefined && mt4EntryPrice > 0
        ? mt4EntryPrice
        : parseCleanNumber(
            getCol(row, 'entryprice', 'entry', 'price', 'buyprice', 'avgprice', 'buyavg', 'buyaverage', 'openprice', 'tprice', 'costprice', 'fillprice', 'rate'),
            0
          );

      // Exit Price
      let exitPriceVal: number | undefined = mt4ExitPrice !== undefined && mt4ExitPrice > 0
        ? mt4ExitPrice
        : undefined;

      if (exitPriceVal === undefined) {
        const exitCol = getCol(row, 'exitprice', 'exit', 'sellprice', 'closeprice', 'sellavg', 'sellaverage', 'cprice', 'settlementprice');
        if (exitCol !== undefined) {
          exitPriceVal = parseCleanNumber(exitCol);
        }
      }

      // Quantity
      const quantity = Math.abs(
        parseCleanNumber(getCol(row, 'quantity', 'qty', 'shares', 'contracts', 'lots', 'size', 'volume', 'amount', 'filledqty'), 1)
      ) || 1;

      // Realized P&L / Profit
      const pnlVal = getCol(
        row,
        'pnl', 'netpnl', 'pl', 'profit', 'realizedpl', 'realizedpnl', 'gainloss', 'netprofit', 'grossprofit', 'proceeds'
      );
      const directPnl = pnlVal !== undefined ? parseCleanNumber(pnlVal) : undefined;

      // Stop Loss & Take Profit
      const stopLossVal = getCol(row, 'stoploss', 'sl', 'stop');
      const stopLoss = stopLossVal ? parseCleanNumber(stopLossVal) : undefined;

      const takeProfitVal = getCol(row, 'takeprofit', 'tp', 'target');
      const takeProfit = takeProfitVal ? parseCleanNumber(takeProfitVal) : undefined;

      // Fees & Commissions
      const fees = Math.abs(
        parseCleanNumber(getCol(row, 'fees', 'fee', 'commission', 'charges', 'commfee', 'tax', 'brokerage', 'taxes', 'swap'), 0)
      );

      // Dates
      const entryDateRaw = getCol(row, 'entrydate', 'date', 'datetime', 'time', 'opened', 'opentime', 'tradedate', 'orderdate', 'executiontime', 'buydate', 'dateutc');
      const entryDate = parseRobustDate(entryDateRaw);

      const exitDateRaw = getCol(row, 'exitdate', 'closedate', 'closed', 'closetime', 'selldate');
      const exitDate = exitDateRaw ? parseRobustDate(exitDateRaw) : undefined;

      // Status determination
      const statusRaw = (getCol(row, 'status', 'state', 'result') || '').toLowerCase();
      let status: TradeStatus = 'Open';
      if (
        directPnl !== undefined ||
        exitPriceVal !== undefined ||
        exitDate !== undefined ||
        statusRaw.includes('close') ||
        statusRaw.includes('win') ||
        statusRaw.includes('loss') ||
        statusRaw.includes('complete')
      ) {
        status = 'Closed';
      }

      // Asset Class detection
      const rawAsset = (getCol(row, 'assetclass', 'asset', 'category', 'segment', 'securitytype') || '').toUpperCase();
      let assetClass: AssetClass = 'Stocks';
      if (rawAsset.includes('CRYPTO') || rawAsset.includes('COIN')) assetClass = 'Crypto';
      else if (rawAsset.includes('FOREX') || rawAsset.includes('FX') || rawAsset.includes('CURRENCY')) assetClass = 'Forex';
      else if (rawAsset.includes('FUT') || rawAsset.includes('FO')) assetClass = 'Futures';
      else if (rawAsset.includes('OPT')) assetClass = 'Options';
      else if (rawAsset.includes('STOCK') || rawAsset.includes('EQUITY') || rawAsset.includes('EQ')) assetClass = 'Stocks';
      else {
        if (symbol.includes('/') || symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) assetClass = 'Crypto';
        else if (symbol.length === 6 && (symbol.includes('EUR') || symbol.includes('USD') || symbol.includes('GBP') || symbol.includes('JPY'))) assetClass = 'Forex';
        else if (symbol.endsWith('FUT') || symbol.includes('_FUT')) assetClass = 'Futures';
        else if (symbol.includes(' CE') || symbol.includes(' PE')) assetClass = 'Options';
        else assetClass = 'Stocks';
      }

      // Strategy, Emotion, Notes
      const strategy = getCol(row, 'strategy', 'setup', 'tag', 'model', 'system') || 'General Setup';
      const emotionRaw = (getCol(row, 'emotion', 'psychology', 'mindset', 'mood') || 'Disciplined') as TradeEmotion;
      const notes = getCol(row, 'notes', 'comment', 'comments', 'reflection', 'remarks') || '';

      // Financial calculations
      let effectiveExitPrice = exitPriceVal;
      let calculatedGrossPnl = 0;
      let calculatedNetPnl = 0;
      let pnlPercentage = 0;
      let rMultiple = 0;

      if (directPnl !== undefined) {
        // Direct PnL from broker statement
        calculatedNetPnl = directPnl;
        calculatedGrossPnl = directPnl + fees;
        if (effectiveExitPrice === undefined && entryPriceVal > 0 && quantity > 0) {
          effectiveExitPrice = direction === 'Long'
            ? entryPriceVal + (calculatedGrossPnl / quantity)
            : entryPriceVal - (calculatedGrossPnl / quantity);
        }
        const totalCost = (entryPriceVal || 1) * quantity;
        pnlPercentage = totalCost > 0 ? (calculatedNetPnl / totalCost) * 100 : 0;

        if (stopLoss && stopLoss !== entryPriceVal) {
          const riskPerUnit = direction === 'Long' ? entryPriceVal - stopLoss : stopLoss - entryPriceVal;
          if (riskPerUnit > 0) {
            const totalRisk = riskPerUnit * quantity;
            if (totalRisk > 0) rMultiple = Number((calculatedNetPnl / totalRisk).toFixed(2));
          }
        }
      } else {
        // Compute from entry, exit, quantity, fees
        const fin = calculateTradeFinancials({
          entryPrice: entryPriceVal,
          exitPrice: effectiveExitPrice,
          quantity,
          fees,
          direction,
          stopLoss,
        });
        calculatedGrossPnl = fin.grossPnl;
        calculatedNetPnl = status === 'Closed' ? fin.netPnl : 0;
        pnlPercentage = fin.pnlPercentage;
        rMultiple = fin.rMultiple;
      }

      const trade: Trade = {
        id: 'trade_' + Math.random().toString(36).substring(2, 9),
        symbol: symbol || 'STOCK',
        assetClass,
        direction,
        status,
        entryDate,
        exitDate: exitDate || (status === 'Closed' ? entryDate : undefined),
        entryPrice: entryPriceVal || (effectiveExitPrice !== undefined ? effectiveExitPrice : 1),
        exitPrice: effectiveExitPrice,
        quantity,
        stopLoss,
        takeProfit,
        fees,
        grossPnl: Number(calculatedGrossPnl.toFixed(2)),
        netPnl: Number(calculatedNetPnl.toFixed(2)),
        pnlPercentage: Number(pnlPercentage.toFixed(2)),
        rMultiple,
        strategy,
        emotion: emotionRaw || 'Disciplined',
        notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      trades.push(trade);
    } catch (e: any) {
      errors.push(`Row ${i + 1}: ${e.message || 'Error processing row'}`);
    }
  }

  // Generate Analysis Summary
  const closed = trades.filter(t => t.status === 'Closed');
  const wins = closed.filter(t => (t.netPnl || 0) > 0);
  const totalNet = closed.reduce((acc, t) => acc + (t.netPnl || 0), 0);

  const dates = trades.map(t => new Date(t.entryDate).getTime()).filter(t => !isNaN(t));
  const dateStart = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().split('T')[0] : undefined;
  const dateEnd = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().split('T')[0] : undefined;

  return {
    trades,
    errors,
    brokerDetected,
    summary: {
      totalParsed: trades.length,
      closedCount: closed.length,
      openCount: trades.length - closed.length,
      winRate: closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0,
      netPnl: Number(totalNet.toFixed(2)),
      dateStart,
      dateEnd,
    },
  };
}

/**
 * Handles raw execution logs (e.g. Zerodha Tradebook or Binance order logs)
 * FIFO matches BUY and SELL executions for each symbol to produce completed round-trip trades
 */
function pairExecutionLogTrades(
  dataRows: string[][],
  getCol: (row: string[], ...aliases: string[]) => string | undefined,
  brokerDetected: string
): ParseCsvResult {
  interface Execution {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    qty: number;
    date: string;
    fees: number;
    notes: string;
  }

  const executionsBySymbol: Record<string, Execution[]> = {};

  for (const row of dataRows) {
    if (row.length < 2 || row.every(c => !c)) continue;

    const symbol = (
      getCol(row, 'symbol', 'ticker', 'tradingsymbol', 'instrument', 'item', 'market', 'pair') || ''
    ).toUpperCase().trim();
    if (!symbol) continue;

    const sideRaw = (getCol(row, 'tradetype', 'type', 'side', 'action', 'buysell') || '').toUpperCase();
    const side: 'BUY' | 'SELL' = sideRaw.includes('SELL') || sideRaw.includes('SHORT') ? 'SELL' : 'BUY';

    const price = parseCleanNumber(getCol(row, 'price', 'entryprice', 'avgprice', 'rate', 'fillprice'), 0);
    const qty = Math.abs(parseCleanNumber(getCol(row, 'quantity', 'qty', 'shares', 'contracts', 'size', 'lots'), 0));
    const fees = Math.abs(parseCleanNumber(getCol(row, 'fees', 'fee', 'commission', 'charges', 'brokerage'), 0));
    const date = parseRobustDate(getCol(row, 'tradedate', 'date', 'datetime', 'time', 'orderdate', 'executiontime'));

    if (price <= 0 || qty <= 0) continue;

    if (!executionsBySymbol[symbol]) {
      executionsBySymbol[symbol] = [];
    }
    executionsBySymbol[symbol].push({
      symbol,
      side,
      price,
      qty,
      date,
      fees,
      notes: `Matched execution from ${brokerDetected}`,
    });
  }

  const pairedTrades: Trade[] = [];

  for (const [symbol, execs] of Object.entries(executionsBySymbol)) {
    // Sort chronologically
    execs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const buyQueue: Execution[] = [];
    const sellQueue: Execution[] = [];

    for (const exec of execs) {
      if (exec.side === 'BUY') {
        let remainingQty = exec.qty;
        while (sellQueue.length > 0 && remainingQty > 0) {
          const shortExec = sellQueue[0];
          const matchedQty = Math.min(remainingQty, shortExec.qty);

          // Short closed by Buy
          const grossPnl = (shortExec.price - exec.price) * matchedQty;
          const matchedFees = exec.fees + shortExec.fees;
          const netPnl = grossPnl - matchedFees;

          pairedTrades.push({
            id: 'trade_' + Math.random().toString(36).substring(2, 9),
            symbol,
            assetClass: symbol.includes('USDT') || symbol.includes('BTC') ? 'Crypto' : 'Stocks',
            direction: 'Short',
            status: 'Closed',
            entryDate: shortExec.date,
            exitDate: exec.date,
            entryPrice: shortExec.price,
            exitPrice: exec.price,
            quantity: matchedQty,
            fees: Number(matchedFees.toFixed(2)),
            grossPnl: Number(grossPnl.toFixed(2)),
            netPnl: Number(netPnl.toFixed(2)),
            pnlPercentage: Number(((netPnl / (shortExec.price * matchedQty)) * 100).toFixed(2)),
            strategy: 'Order Execution Match',
            emotion: 'Disciplined',
            notes: `Auto-paired execution from ${brokerDetected}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          remainingQty -= matchedQty;
          shortExec.qty -= matchedQty;
          if (shortExec.qty <= 0.000001) sellQueue.shift();
        }
        if (remainingQty > 0) {
          buyQueue.push({ ...exec, qty: remainingQty });
        }
      } else {
        // SELL execution
        let remainingQty = exec.qty;
        while (buyQueue.length > 0 && remainingQty > 0) {
          const longExec = buyQueue[0];
          const matchedQty = Math.min(remainingQty, longExec.qty);

          // Long closed by Sell
          const grossPnl = (exec.price - longExec.price) * matchedQty;
          const matchedFees = exec.fees + longExec.fees;
          const netPnl = grossPnl - matchedFees;

          pairedTrades.push({
            id: 'trade_' + Math.random().toString(36).substring(2, 9),
            symbol,
            assetClass: symbol.includes('USDT') || symbol.includes('BTC') ? 'Crypto' : 'Stocks',
            direction: 'Long',
            status: 'Closed',
            entryDate: longExec.date,
            exitDate: exec.date,
            entryPrice: longExec.price,
            exitPrice: exec.price,
            quantity: matchedQty,
            fees: Number(matchedFees.toFixed(2)),
            grossPnl: Number(grossPnl.toFixed(2)),
            netPnl: Number(netPnl.toFixed(2)),
            pnlPercentage: Number(((netPnl / (longExec.price * matchedQty)) * 100).toFixed(2)),
            strategy: 'Order Execution Match',
            emotion: 'Disciplined',
            notes: `Auto-paired execution from ${brokerDetected}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          remainingQty -= matchedQty;
          longExec.qty -= matchedQty;
          if (longExec.qty <= 0.000001) buyQueue.shift();
        }
        if (remainingQty > 0) {
          sellQueue.push({ ...exec, qty: remainingQty });
        }
      }
    }

    // Remaining open positions
    for (const openLong of buyQueue) {
      pairedTrades.push({
        id: 'trade_' + Math.random().toString(36).substring(2, 9),
        symbol,
        assetClass: symbol.includes('USDT') || symbol.includes('BTC') ? 'Crypto' : 'Stocks',
        direction: 'Long',
        status: 'Open',
        entryDate: openLong.date,
        entryPrice: openLong.price,
        quantity: openLong.qty,
        fees: openLong.fees,
        grossPnl: 0,
        netPnl: -openLong.fees,
        pnlPercentage: 0,
        strategy: 'Order Execution Match',
        emotion: 'Disciplined',
        notes: `Open position from ${brokerDetected}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    for (const openShort of sellQueue) {
      pairedTrades.push({
        id: 'trade_' + Math.random().toString(36).substring(2, 9),
        symbol,
        assetClass: symbol.includes('USDT') || symbol.includes('BTC') ? 'Crypto' : 'Stocks',
        direction: 'Short',
        status: 'Open',
        entryDate: openShort.date,
        entryPrice: openShort.price,
        quantity: openShort.qty,
        fees: openShort.fees,
        grossPnl: 0,
        netPnl: -openShort.fees,
        pnlPercentage: 0,
        strategy: 'Order Execution Match',
        emotion: 'Disciplined',
        notes: `Open position from ${brokerDetected}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  const closed = pairedTrades.filter(t => t.status === 'Closed');
  const wins = closed.filter(t => (t.netPnl || 0) > 0);
  const totalNet = closed.reduce((acc, t) => acc + (t.netPnl || 0), 0);

  const dates = pairedTrades.map(t => new Date(t.entryDate).getTime()).filter(t => !isNaN(t));
  const dateStart = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().split('T')[0] : undefined;
  const dateEnd = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().split('T')[0] : undefined;

  return {
    trades: pairedTrades,
    errors: [],
    brokerDetected: `${brokerDetected} (Matched Executions)`,
    summary: {
      totalParsed: pairedTrades.length,
      closedCount: closed.length,
      openCount: pairedTrades.length - closed.length,
      winRate: closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0,
      netPnl: Number(totalNet.toFixed(2)),
      dateStart,
      dateEnd,
    },
  };
}
