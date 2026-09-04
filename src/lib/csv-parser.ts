import { Trade, AssetClass, TradeDirection, TradeStatus, TradeEmotion } from '../types/trade';
import { calculateTradeFinancials } from './calculations';

/**
 * Universal CSV Line Splitter handling quotes and commas
 */
function parseCsvLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of rawLines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
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
 * Parses generic or broker CSV data into Trade models
 */
export function parseTradesFromCsv(csvContent: string): { trades: Trade[]; errors: string[] } {
  const parsedRows = parseCsvLines(csvContent);
  if (parsedRows.length < 2) {
    return { trades: [], errors: ['CSV file is empty or has no header row.'] };
  }

  const rawHeaders = parsedRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (row: string[], ...aliases: string[]): string | undefined => {
    for (const a of aliases) {
      const cleanAlias = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = headerMap[cleanAlias];
      if (idx !== undefined && row[idx] !== undefined) {
        return row[idx];
      }
    }
    return undefined;
  };

  const trades: Trade[] = [];
  const errors: string[] = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || row.every(cell => !cell)) continue;

    try {
      const symbol = getCol(row, 'symbol', 'ticker', 'instrument', 'market', 'pair') || 'UNKNOWN';
      const dirRaw = (getCol(row, 'direction', 'side', 'type', 'action') || 'BUY').toUpperCase();
      const direction: TradeDirection = dirRaw.includes('SHORT') || dirRaw.includes('SELL') ? 'Short' : 'Long';

      const entryPrice = parseFloat(getCol(row, 'entryprice', 'entry', 'price', 'buyprice', 'avgprice') || '0') || 1;
      const exitPriceVal = getCol(row, 'exitprice', 'exit', 'sellprice', 'closeprice');
      const exitPrice = exitPriceVal ? parseFloat(exitPriceVal) : undefined;
      const quantity = Math.abs(parseFloat(getCol(row, 'quantity', 'qty', 'shares', 'contracts', 'lots', 'size') || '1')) || 1;

      const stopLossVal = getCol(row, 'stoploss', 'sl', 'stop');
      const stopLoss = stopLossVal ? parseFloat(stopLossVal) : undefined;

      const takeProfitVal = getCol(row, 'takeprofit', 'tp', 'target');
      const takeProfit = takeProfitVal ? parseFloat(takeProfitVal) : undefined;

      const fees = parseFloat(getCol(row, 'fees', 'fee', 'commission', 'charges') || '0') || 0;

      // Asset Class detection
      const rawAsset = (getCol(row, 'assetclass', 'asset', 'category', 'segment') || '').toUpperCase();
      let assetClass: AssetClass = 'Crypto';
      if (rawAsset.includes('STOCK') || rawAsset.includes('EQUITY')) assetClass = 'Stocks';
      else if (rawAsset.includes('FOREX') || rawAsset.includes('FX')) assetClass = 'Forex';
      else if (rawAsset.includes('FUT')) assetClass = 'Futures';
      else if (rawAsset.includes('OPT')) assetClass = 'Options';
      else {
        if (symbol.includes('/') || symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) assetClass = 'Crypto';
        else if (symbol.length === 6 && (symbol.includes('EUR') || symbol.includes('USD') || symbol.includes('GBP'))) assetClass = 'Forex';
        else assetClass = 'Stocks';
      }

      // Date Parsing
      const entryDateRaw = getCol(row, 'entrydate', 'date', 'datetime', 'time', 'opened') || new Date().toISOString();
      let entryDate = new Date(entryDateRaw).toISOString();
      if (isNaN(new Date(entryDate).getTime())) {
        entryDate = new Date().toISOString();
      }

      const exitDateRaw = getCol(row, 'exitdate', 'closedate', 'closed');
      let exitDate: string | undefined = undefined;
      if (exitDateRaw) {
        const d = new Date(exitDateRaw);
        if (!isNaN(d.getTime())) exitDate = d.toISOString();
      }

      const status: TradeStatus = exitPrice !== undefined ? 'Closed' : 'Open';
      const strategy = getCol(row, 'strategy', 'setup', 'tag') || 'General';
      const emotionRaw = (getCol(row, 'emotion', 'psychology', 'mindset') || 'Disciplined') as TradeEmotion;
      const notes = getCol(row, 'notes', 'comment', 'reflection') || '';

      const financials = calculateTradeFinancials({
        entryPrice,
        exitPrice,
        quantity,
        fees,
        direction,
        stopLoss,
      });

      const trade: Trade = {
        id: 'trade_' + Math.random().toString(36).substring(2, 9),
        symbol: symbol.toUpperCase(),
        assetClass,
        direction,
        status,
        entryDate,
        exitDate: exitDate || (status === 'Closed' ? entryDate : undefined),
        entryPrice,
        exitPrice,
        quantity,
        stopLoss,
        takeProfit,
        fees,
        grossPnl: financials.grossPnl,
        netPnl: financials.netPnl,
        pnlPercentage: financials.pnlPercentage,
        rMultiple: financials.rMultiple,
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

  return { trades, errors };
}
