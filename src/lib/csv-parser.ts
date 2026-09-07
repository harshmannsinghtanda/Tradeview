import { Trade, AssetClass, TradeDirection, TradeStatus } from '../types/trade';
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
 * Strips UTF-8 / UTF-16 Byte Order Mark (BOM) if present
 */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Normalizes broker CSV text:
 * 1. Replaces newlines inside quotes with spaces so cells like "1,475.20\n" do not break rows
 * 2. Stitches wrapped continuation lines that start with commas (common in Dhan, Excel, Zerodha exports)
 */
function normalizeCsvText(csvText: string): string {
  const clean = stripBom(csvText);

  // Step 1: Replace newlines inside quotes
  let insideQuotes = false;
  const cleanChars: string[] = [];

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      insideQuotes = !insideQuotes;
      cleanChars.push(ch);
    } else if ((ch === '\n' || ch === '\r') && insideQuotes) {
      cleanChars.push(' ');
    } else {
      cleanChars.push(ch);
    }
  }

  const sanitized = cleanChars.join('');

  // Step 2: Merge continuation lines that start with a comma (fixes Dhan unquoted line breaks)
  let standardNewlines = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  standardNewlines = standardNewlines.replace(/\n,/g, ',');

  const rawLines = standardNewlines.split('\n');
  return rawLines.map(l => l.trim()).filter(l => l).join('\n');
}

/**
 * Detects the most likely delimiter (comma, semicolon, tab, pipe)
 */
function detectDelimiter(text: string): string {
  const sampleLines = text.split(/\r?\n/).slice(0, 20).filter(l => l.trim().length > 0);
  if (sampleLines.length === 0) return ',';

  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const line of sampleLines) {
    for (const d of Object.keys(counts)) {
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
 * Universal CSV Line Splitter supporting quotes and escaped quotes
 */
function parseCsvLines(csvText: string, delimiter: string = ','): string[][] {
  const normalized = normalizeCsvText(csvText);
  const lines: string[][] = [];
  const rawLines = normalized.split('\n');

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

  // Remove currency symbols, commas, quotes
  s = s.replace(/[$€£₹¥]|USDT|USD|EUR|GBP|INR/gi, '');
  s = s.replace(/,/g, '');
  s = s.trim();

  const num = parseFloat(s);
  return isNaN(num) ? fallback : num;
}

/**
 * Resilient multi-format Date parser
 */
export function parseRobustDate(raw: any, fallbackDate?: string): string {
  const defaultFallback = fallbackDate || new Date().toISOString();
  if (!raw) return defaultFallback;

  if (typeof raw === 'number' && !isNaN(raw)) {
    const ms = raw < 1e11 ? raw * 1000 : raw;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? defaultFallback : d.toISOString();
  }

  const s = String(raw).trim();
  if (!s) return defaultFallback;

  // Numeric timestamp as string
  if (/^\d{10,13}$/.test(s)) {
    const num = parseInt(s, 10);
    const ms = s.length === 10 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Replace dots with hyphens for MetaTrader: "2024.08.15 14:30:00" -> "2024-08-15 14:30:00"
  const normalized = s.replace(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/, '$1-$2-$3');

  try {
    const directDate = new Date(normalized);
    if (!isNaN(directDate.getTime())) {
      return directDate.toISOString();
    }
  } catch {}

  // Check for DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

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

  return defaultFallback;
}

/**
 * Checks if a row looks like a header containing trading/financial keywords
 */
function isRowAHeader(row: string[]): boolean {
  if (!row || row.length < 2) return false;
  const keywords = [
    'symbol', 'scrip', 'security', 'tradingsymbol', 'ticker', 'instrument', 'item', 'pair', 'isin',
    'buyqty', 'sellqty', 'avgbuyprice', 'avgsellprice', 'buyprice', 'sellprice', 'buyvalue', 'sellvalue',
    'realisedpl', 'realizedpl', 'realisedpnl', 'realizedpnl', 'grosspl', 'grosspnl', 'netpl', 'netpnl', 'profit', 'pnl',
    'date', 'tradedate', 'time', 'datetime', 'opentime', 'closetime', 'orderdate',
    'brokerage', 'gst', 'stt', 'stampduty', 'turnovertax', 'charges', 'fees', 'ipft',
    'quantity', 'qty', 'shares', 'contracts', 'type', 'side', 'direction', 'tradetype'
  ];
  let score = 0;
  for (const cell of row) {
    const clean = (cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) continue;
    if (keywords.some(k => clean === k || clean.includes(k))) score++;
  }
  return score >= 2;
}

/**
 * Detects if a CSV file contains vertically chunked / wrapped column tables
 * (such as Dhan Scripwise Comprehensive / Capital Gains Reports where tables are printed
 * in separate horizontal chunks of columns across consecutive blocks)
 * and stitches them into a unified horizontal tabular structure.
 */
function detectAndStitchChunkedTables(parsedRows: string[][]): string[][] | null {
  const headerIndices: number[] = [];
  parsedRows.forEach((row, idx) => {
    if (isRowAHeader(row)) {
      headerIndices.push(idx);
    }
  });

  if (headerIndices.length <= 1) return null;

  const headerDetails = headerIndices.map(hIdx => {
    const cleanCells = parsedRows[hIdx].map(c => (c || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasSymbol = cleanCells.some(c => 
      c.includes('symbol') || c.includes('scrip') || c.includes('security') || c.includes('ticker') || c.includes('instrument')
    );
    const hasPricing = cleanCells.some(c => 
      c.includes('buyvalue') || c.includes('sellvalue') || c.includes('gross') || c.includes('brokerage') || c.includes('charges') || c.includes('pnl')
    );
    return { hIdx, cleanCells, hasSymbol, hasPricing };
  });

  const hasSymbolBlocks = headerDetails.filter(h => h.hasSymbol);
  const hasPricingOnlyBlocks = headerDetails.filter(h => !h.hasSymbol && h.hasPricing);

  // If there are pricing-only continuation blocks that complement symbol blocks, this is a chunked table!
  if (hasSymbolBlocks.length === 0 || hasPricingOnlyBlocks.length === 0) {
    return null;
  }

  // Collect data rows for each block
  const blocks = headerIndices.map((hIdx, i) => {
    const nextHIdx = i + 1 < headerIndices.length ? headerIndices[i + 1] : parsedRows.length;
    const headerRow = parsedRows[hIdx];
    const dataRows: string[][] = [];

    for (let r = hIdx + 1; r < nextHIdx; r++) {
      const row = parsedRows[r];
      if (!row || row.length === 0 || row.every(c => !c)) continue;
      const first = (row[0] || '').toLowerCase().trim();

      // Stop on total row, section marker, or disclaimer
      if (
        first === 'total' ||
        first.startsWith('total,') ||
        first.includes('disclaimer') ||
        first.includes('shares getting auctioned') ||
        first.includes('client, including') ||
        first.includes('calculation of') ||
        first.includes('clients who offer') ||
        first.includes('impact of corporate') ||
        (first.includes('pnl') && !first.includes('scrip') && !first.includes('symbol'))
      ) {
        break;
      }

      // Check if this row is a numerical summary row without symbol (e.g. 386545.63,,441893.1,55347.47)
      if (row.length >= 2 && !isNaN(parseFloat(row[0])) && (row[1] === '' || !isNaN(parseFloat(row[1])))) {
        if (row.filter(c => c !== '').length <= 4 && row[1] === '') {
          break;
        }
      }

      dataRows.push(row);
    }

    return {
      hIdx,
      headerRow,
      dataRows,
      cleanHeaders: headerRow.map(c => (c || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    };
  });

  const symbolBlocks = blocks.filter(b => b.cleanHeaders.some(c => c.includes('symbol') || c.includes('scrip') || c.includes('security')));
  const nonSymbolBlocks = blocks.filter(b => !b.cleanHeaders.some(c => c.includes('symbol') || c.includes('scrip') || c.includes('security')));

  const stitchedTables: { headers: string[]; rows: string[][] }[] = [];

  for (let sIdx = 0; sIdx < symbolBlocks.length; sIdx++) {
    const sBlock = symbolBlocks[sIdx];
    const targetCount = sBlock.dataRows.length;
    if (targetCount === 0) continue;

    const matchingContinuationBlocks = nonSymbolBlocks.filter(b => 
      b.dataRows.length === targetCount || (b.dataRows.length >= targetCount && Math.abs(b.dataRows.length - targetCount) <= 2)
    );

    if (matchingContinuationBlocks.length > 0) {
      const blocksForThisSection = [sBlock];

      // Group continuation blocks by header signature
      const byHeader: Record<string, typeof blocks> = {};
      matchingContinuationBlocks.forEach(b => {
        const sig = b.cleanHeaders.slice(0, 2).join('_');
        if (!byHeader[sig]) byHeader[sig] = [];
        byHeader[sig].push(b);
      });

      Object.values(byHeader).forEach(group => {
        if (group[sIdx]) {
          blocksForThisSection.push(group[sIdx]);
        } else if (group[0]) {
          blocksForThisSection.push(group[0]);
        }
      });

      const combinedHeaders: string[] = [];
      blocksForThisSection.forEach(b => combinedHeaders.push(...b.headerRow));

      const combinedRows: string[][] = [];
      for (let r = 0; r < targetCount; r++) {
        const combinedRow: string[] = [];
        blocksForThisSection.forEach(b => {
          const rowData = b.dataRows[r] || [];
          combinedRow.push(...rowData);
        });
        combinedRows.push(combinedRow);
      }

      stitchedTables.push({
        headers: combinedHeaders,
        rows: combinedRows,
      });
    }
  }

  if (stitchedTables.length > 0) {
    const masterHeaders = stitchedTables[0].headers;
    const allStitchedRows: string[][] = [];
    stitchedTables.forEach(t => allStitchedRows.push(...t.rows));
    return [masterHeaders, ...allStitchedRows];
  }

  return null;
}

/**
 * Finds the primary table header row index in CSV rows
 */
function findHeaderRowIndex(rows: string[][]): number {
  let bestRowIdx = 0;
  let maxScore = -1;

  for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const cleanCells = row.map(cell => cell.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Check if row has an instrument identifier column
    const hasSymbolCol = cleanCells.some(c => 
      c.includes('symbol') || c.includes('security') || c.includes('scrip') || c.includes('ticker') || c.includes('instrument') || c.includes('tradingsymbol') || c.includes('item')
    );

    let score = 0;
    for (const clean of cleanCells) {
      if (!clean) continue;
      if (isRowAHeader([clean])) {
        score++;
      }
    }

    // Heavy bonus if the row actually has a symbol/instrument column (avoiding summary segment overview rows)
    if (hasSymbolCol) {
      score += 15;
    }

    if (score > maxScore) {
      maxScore = score;
      bestRowIdx = i;
    }
  }

  return maxScore >= 2 ? bestRowIdx : 0;
}

/**
 * Detects the broker format based on text and headers
 */
function detectBrokerFormat(headerMap: Record<string, number>, rawText: string): string {
  const textLower = rawText.toLowerCase();

  if (
    textLower.includes('dhan.co') ||
    textLower.includes('moneylicious') ||
    textLower.includes('raise securities') ||
    textLower.includes('delivery pnl') ||
    (headerMap['scripsymbol'] !== undefined && headerMap['avgbuyprice'] !== undefined) ||
    (textLower.includes('equity segment') && headerMap['isin'] !== undefined)
  ) {
    return 'Dhan';
  }
  if (textLower.includes('zerodha') || (headerMap['tradingsymbol'] !== undefined && headerMap['isin'] !== undefined)) {
    return 'Zerodha (Kite)';
  }
  if (textLower.includes('groww')) {
    return 'Groww';
  }
  if (
    textLower.includes('angelone') ||
    textLower.includes('angel one') ||
    textLower.includes('angel broking') ||
    textLower.includes('angel_one') ||
    (headerMap['scripname'] !== undefined && (headerMap['isin'] !== undefined || headerMap['orderid'] !== undefined))
  ) {
    return 'Angel One';
  }
  if (textLower.includes('upstox')) {
    return 'Upstox';
  }
  if (textLower.includes('icici direct') || textLower.includes('icicidirect')) {
    return 'ICICI Direct';
  }
  if (textLower.includes('kotak')) {
    return 'Kotak Securities';
  }
  if (textLower.includes('5paisa')) {
    return '5Paisa';
  }
  if (textLower.includes('fyers')) {
    return 'Fyers';
  }
  if (headerMap['dateutc'] !== undefined && (headerMap['fee'] !== undefined || headerMap['feecoin'] !== undefined || headerMap['market'] !== undefined)) {
    return 'Binance';
  }
  if ((headerMap['item'] !== undefined || headerMap['ticket'] !== undefined) && (headerMap['opentime'] !== undefined || headerMap['closetime'] !== undefined)) {
    return 'MetaTrader 4 / 5';
  }
  if (headerMap['tprice'] !== undefined || headerMap['cprice'] !== undefined || (headerMap['realizedpl'] !== undefined && headerMap['basis'] !== undefined)) {
    return 'Interactive Brokers (IBKR)';
  }
  if (headerMap['rmultiple'] !== undefined || (headerMap['strategy'] !== undefined && headerMap['emotion'] !== undefined)) {
    return 'TradeView Journal Format';
  }
  return 'Standard / Universal CSV';
}

/**
 * Extracts default report date from header metadata if available
 */
function extractReportDate(csvText: string): string {
  const fromMatch = csvText.match(/from\s*(?:date)?\s*[:,-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
  if (fromMatch) {
    const parts = fromMatch[1].split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, 10, 0, 0));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const toMatch = csvText.match(/to\s*(?:date)?\s*[:,-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
  if (toMatch) {
    const parts = toMatch[1].split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, 10, 0, 0));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const genMatch = csvText.match(/(?:generated\s+on|date\s+of\s+download)\s*[:,-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
  if (genMatch) {
    const parts = genMatch[1].split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, 10, 0, 0));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Parses generic or broker CSV data into Trade models
 */
export function parseTradesFromCsv(csvContent: string): ParseCsvResult {
  if (!csvContent || !csvContent.trim()) {
    return { trades: [], errors: ['CSV content is empty.'] };
  }

  const delimiter = detectDelimiter(csvContent);
  let parsedRows = parseCsvLines(csvContent, delimiter);

  if (parsedRows.length < 2) {
    return { trades: [], errors: ['CSV file has no valid trade rows.'] };
  }

  // Check if this CSV has chunked/wrapped vertical blocks (like Dhan Scripwise Report)
  const stitchedRows = detectAndStitchChunkedTables(parsedRows);
  if (stitchedRows && stitchedRows.length > 1) {
    parsedRows = stitchedRows;
  }

  const headerRowIdx = findHeaderRowIndex(parsedRows);
  const rawHeaders = parsedRows[headerRowIdx].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

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

  const brokerDetected = detectBrokerFormat(headerMap, csvContent);
  const reportDefaultDate = extractReportDate(csvContent);

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

  // Check if this is a raw order execution log needing FIFO pairing
  const isExecutionLog = (
    headerMap['tradetype'] !== undefined ||
    headerMap['type'] !== undefined ||
    headerMap['side'] !== undefined ||
    headerMap['action'] !== undefined ||
    headerMap['buysell'] !== undefined ||
    headerMap['buy/sell'] !== undefined ||
    headerMap['order'] !== undefined ||
    headerMap['ordertype'] !== undefined
  ) &&
    headerMap['exitprice'] === undefined &&
    headerMap['sellaverage'] === undefined &&
    headerMap['avgsellprice'] === undefined &&
    headerMap['sellprice'] === undefined &&
    headerMap['sellrate'] === undefined &&
    headerMap['realizedpl'] === undefined &&
    headerMap['realisedpl'] === undefined &&
    headerMap['realizedgainloss'] === undefined &&
    headerMap['realisedgainloss'] === undefined &&
    headerMap['profit'] === undefined &&
    headerMap['pnl'] === undefined;

  if (isExecutionLog) {
    const pairedResult = pairExecutionLogTrades(parsedRows.slice(headerRowIdx + 1), getCol, brokerDetected, reportDefaultDate);
    if (pairedResult.trades.length > 0) {
      return pairedResult;
    }
  }

  const trades: Trade[] = [];
  const errors: string[] = [];
  let currentSectionSegment = 'Equity';

  for (let i = headerRowIdx + 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || row.every(cell => !cell)) continue;

    const firstCell = (row[0] || '').toLowerCase().trim();

    // Check for section dividers
    if (firstCell.includes('f&o') || firstCell.includes('futures and options') || firstCell.includes('derivative')) {
      currentSectionSegment = 'F&O';
      continue;
    }
    if (firstCell.includes('commodit')) {
      currentSectionSegment = 'Commodities';
      continue;
    }
    if (firstCell.includes('currency') || firstCell.includes('forex')) {
      currentSectionSegment = 'Currency';
      continue;
    }
    if (firstCell.includes('equity segment') || firstCell.includes('delivery pnl')) {
      currentSectionSegment = 'Equity';
      continue;
    }
    if (firstCell.includes('intraday pnl')) {
      currentSectionSegment = 'Intraday';
      continue;
    }

    // Check if row is a section divider or footer line
    if (
      firstCell.includes('segment') ||
      firstCell.includes('notes') ||
      firstCell.includes('total') ||
      firstCell.includes('report') ||
      firstCell.includes('disclaimer') ||
      firstCell.includes('securities') ||
      firstCell.includes('raise securities')
    ) {
      continue;
    }

    try {
      // Symbol / Instrument Name
      let symbol = (
        getCol(
          row,
          'securityname', 'security', 'tradingsymbol', 'symbol', 'ticker',
          'scripsymbol', 'scrip', 'scripname', 'companyname', 'company', 'instrument', 'item', 'market', 'pair', 'asset', 'description', 'name'
        ) || ''
      ).replace(/['"]/g, '').trim().toUpperCase();

      // If symbol is empty, check row[1] if row[0] was a row number (e.g. "1, Reliance Industries")
      if (!symbol && /^\d+$/.test(row[0]) && row[1] && row[1].length > 1) {
        symbol = row[1].trim().toUpperCase();
      }

      if (
        !symbol ||
        symbol === 'UNKNOWN' ||
        symbol === 'SECURITY NAME' ||
        symbol === 'SECURITY' ||
        symbol === 'SYMBOL' ||
        symbol === 'SCRIP SYMBOL' ||
        symbol === 'TOTAL' ||
        symbol === 'SR' ||
        symbol === 'SR.'
      ) {
        continue;
      }

      // Direction
      const dirRaw = (
        getCol(row, 'direction', 'side', 'type', 'action', 'tradetype', 'buysell', 'buy/sell', 'order', 'ordertype') || 'BUY'
      ).toUpperCase();
      const direction: TradeDirection = dirRaw.includes('SHORT') || dirRaw.includes('SELL') ? 'Short' : 'Long';

      // MetaTrader dual 'Price' columns
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
            getCol(
              row,
              'avgbuyprice', 'buyavg', 'buyaverage', 'buyprice', 'buyrate', 'purchaserate', 'openavgprice',
              'entryprice', 'entry', 'price', 'openprice', 'tprice', 'costprice', 'fillprice', 'rate', 'tradeprice', 'averageprice'
            ),
            0
          );

      // Exit Price
      let exitPriceVal: number | undefined = mt4ExitPrice !== undefined && mt4ExitPrice > 0
        ? mt4ExitPrice
        : undefined;

      if (exitPriceVal === undefined) {
        const exitCol = getCol(
          row,
          'avgsellprice', 'sellavg', 'sellaverage', 'sellprice', 'sellrate', 'salerate', 'closingrate',
          'exitprice', 'exit', 'closeprice', 'cprice', 'settlementprice'
        );
        if (exitCol !== undefined && exitCol !== '0.00' && exitCol !== '0') {
          exitPriceVal = parseCleanNumber(exitCol);
        }
      }

      // Quantity: Sell Qty takes precedence for closed trades, otherwise Buy Qty or Open Qty
      const sellQtyVal = parseCleanNumber(getCol(row, 'sellqty', 'soldqty', 'sellquantity'), 0);
      const buyQtyVal = parseCleanNumber(getCol(row, 'buyqty', 'quantity', 'qty', 'shares', 'contracts', 'lots', 'size', 'volume', 'amount', 'openqty', 'filledqty', 'buyquantity', 'tradequantity'), 0);
      const quantity = Math.abs(sellQtyVal > 0 ? sellQtyVal : (buyQtyVal > 0 ? buyQtyVal : 1));

      // Realized P&L / Profit
      const pnlVal = getCol(
        row,
        'netpnl', 'realisedpl', 'realisedpnl', 'realizedpl', 'realizedpnl',
        'realizedgainloss', 'realisedgainloss', 'realizedprofitloss', 'realisedprofitloss', 'gainloss', 'profitloss',
        'intradaypnl', 'deliverypnl', 'grosspl', 'grosspnl', 'pnl', 'pl', 'profit', 'netprofit', 'grossprofit', 'proceeds'
      );
      const unrealisedVal = getCol(row, 'unrealisedpl', 'unrealisedpnl', 'unrealizedpl', 'unrealizedpnl');

      let directPnl: number | undefined = pnlVal !== undefined ? parseCleanNumber(pnlVal) : undefined;
      const unrealizedPnl: number | undefined = unrealisedVal !== undefined ? parseCleanNumber(unrealisedVal) : undefined;

      // Fees & Charges breakdown
      const brokerage = parseCleanNumber(getCol(row, 'brokerage', 'brokeragecharges'), 0);
      const gst = parseCleanNumber(getCol(row, 'gst'), 0);
      const stt = parseCleanNumber(getCol(row, 'stt'), 0);
      const stampDuty = parseCleanNumber(getCol(row, 'stampduty', 'stamp'), 0);
      const sebiFees = parseCleanNumber(getCol(row, 'sebifees', 'sebi', 'sebicharges'), 0);
      const exchCharges = parseCleanNumber(getCol(row, 'exchcharges', 'exchangecharges', 'turnovertax'), 0);
      const otherCharges = parseCleanNumber(getCol(row, 'othercharges', 'ipftcharges', 'ipft'), 0);
      const totalExplicitCharges = parseCleanNumber(getCol(row, 'totalcharges', 'charges', 'fees', 'fee', 'commission', 'commfee', 'tax', 'taxes'), 0);

      const computedCharges = brokerage + gst + stt + stampDuty + sebiFees + exchCharges + otherCharges;
      const fees = Math.abs(computedCharges > 0 ? computedCharges : totalExplicitCharges);

      // Dates
      const entryDateRaw = getCol(
        row,
        'buydate', 'tradedate', 'entrydate', 'date', 'datetime', 'time',
        'opened', 'opentime', 'orderdate', 'executiontime', 'dateutc'
      );
      const entryDate = parseRobustDate(entryDateRaw, reportDefaultDate);

      const exitDateRaw = getCol(row, 'selldate', 'exitdate', 'closedate', 'closed', 'closetime');
      const exitDate = exitDateRaw ? parseRobustDate(exitDateRaw, reportDefaultDate) : undefined;

      // Status determination:
      // A trade is CLOSED if Sell Qty > 0 or Realised P&L != 0 or exitPrice was an executed sell price
      let status: TradeStatus = 'Open';
      if (
        (sellQtyVal > 0 && directPnl !== undefined) ||
        (directPnl !== undefined && directPnl !== 0) ||
        (exitPriceVal !== undefined && exitDate !== undefined) ||
        (exitPriceVal !== undefined && getCol(row, 'avgsellprice', 'sellavg', 'sellaverage', 'sellprice') !== undefined)
      ) {
        status = 'Closed';
      }

      // If trade is Open (holding), use unrealized P&L if available
      if (status === 'Open' && directPnl === 0 && unrealizedPnl !== undefined && unrealizedPnl !== 0) {
        directPnl = unrealizedPnl;
      }

      // Asset Class detection
      const rawAsset = (getCol(row, 'assetclass', 'asset', 'category', 'segment', 'securitytype') || currentSectionSegment).toUpperCase();
      let assetClass: AssetClass = 'Stocks';
      if (rawAsset.includes('CRYPTO') || rawAsset.includes('COIN')) assetClass = 'Crypto';
      else if (rawAsset.includes('FOREX') || rawAsset.includes('FX') || rawAsset.includes('CURRENCY')) assetClass = 'Forex';
      else if (rawAsset.includes('COMMODIT')) assetClass = 'Futures';
      else if (rawAsset.includes('FUT') || rawAsset.includes('FO') || rawAsset.includes('DERIVATIVE')) {
        assetClass = symbol.includes(' CE') || symbol.includes(' PE') ? 'Options' : 'Futures';
      } else if (rawAsset.includes('OPT')) {
        assetClass = 'Options';
      } else if (rawAsset.includes('STOCK') || rawAsset.includes('EQUITY') || rawAsset.includes('EQ') || rawAsset.includes('DELIVERY') || rawAsset.includes('INTRADAY')) {
        assetClass = 'Stocks';
      } else {
        if (symbol.includes('/') || symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) assetClass = 'Crypto';
        else if (symbol.length === 6 && (symbol.includes('EUR') || symbol.includes('USD') || symbol.includes('GBP') || symbol.includes('JPY'))) assetClass = 'Forex';
        else if (symbol.endsWith('FUT') || symbol.includes('_FUT')) assetClass = 'Futures';
        else if (symbol.includes(' CE') || symbol.includes(' PE') || symbol.startsWith('OPT ')) assetClass = 'Options';
        else assetClass = 'Stocks';
      }

      // Financial calculations
      let effectiveExitPrice = exitPriceVal;
      let calculatedGrossPnl = 0;
      let calculatedNetPnl = 0;
      let pnlPercentage = 0;
      let rMultiple = 0;

      if (directPnl !== undefined) {
        calculatedNetPnl = directPnl;
        calculatedGrossPnl = directPnl + (status === 'Closed' ? fees : 0);
        if (effectiveExitPrice === undefined && entryPriceVal > 0 && quantity > 0) {
          effectiveExitPrice = direction === 'Long'
            ? entryPriceVal + (calculatedGrossPnl / quantity)
            : entryPriceVal - (calculatedGrossPnl / quantity);
        }
        const totalCost = (entryPriceVal || 1) * quantity;
        pnlPercentage = totalCost > 0 ? (calculatedNetPnl / totalCost) * 100 : 0;
      } else {
        const fin = calculateTradeFinancials({
          entryPrice: entryPriceVal,
          exitPrice: effectiveExitPrice,
          quantity,
          fees,
          direction,
        });
        calculatedGrossPnl = fin.grossPnl;
        calculatedNetPnl = status === 'Closed' ? fin.netPnl : 0;
        pnlPercentage = fin.pnlPercentage;
        rMultiple = fin.rMultiple;
      }

      const trade: Trade = {
        id: 'trade_' + Math.random().toString(36).substring(2, 9),
        symbol,
        assetClass,
        direction,
        status,
        entryDate,
        exitDate: exitDate || (status === 'Closed' ? entryDate : undefined),
        entryPrice: entryPriceVal || (effectiveExitPrice !== undefined ? effectiveExitPrice : 1),
        exitPrice: effectiveExitPrice,
        quantity,
        fees: Number(fees.toFixed(2)),
        grossPnl: Number(calculatedGrossPnl.toFixed(2)),
        netPnl: Number(calculatedNetPnl.toFixed(2)),
        pnlPercentage: Number(pnlPercentage.toFixed(2)),
        rMultiple,
        strategy: brokerDetected !== 'Standard / Universal CSV' ? `${brokerDetected} Import` : 'General Setup',
        emotion: 'Disciplined',
        notes: `Imported from ${brokerDetected}${currentSectionSegment !== 'Equity' ? ` (${currentSectionSegment})` : ''}`,
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
 */
function pairExecutionLogTrades(
  dataRows: string[][],
  getCol: (row: string[], ...aliases: string[]) => string | undefined,
  brokerDetected: string,
  reportDefaultDate: string
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
      getCol(row, 'symbol', 'ticker', 'tradingsymbol', 'instrument', 'item', 'market', 'pair', 'scripname', 'scrip', 'securityname', 'security') || ''
    ).toUpperCase().trim();
    if (!symbol) continue;

    const sideRaw = (getCol(row, 'tradetype', 'type', 'side', 'action', 'buysell', 'buy/sell', 'order', 'ordertype') || '').toUpperCase();
    const side: 'BUY' | 'SELL' = sideRaw.includes('SELL') || sideRaw.includes('SHORT') ? 'SELL' : 'BUY';

    const price = parseCleanNumber(getCol(row, 'price', 'entryprice', 'avgprice', 'rate', 'fillprice', 'tradeprice', 'averageprice', 'buyrate', 'sellrate'), 0);
    const qty = Math.abs(parseCleanNumber(getCol(row, 'quantity', 'qty', 'shares', 'contracts', 'size', 'lots', 'tradequantity', 'filledqty', 'executedqty'), 0));
    const fees = Math.abs(parseCleanNumber(getCol(row, 'fees', 'fee', 'commission', 'charges', 'brokerage', 'totalcharges'), 0));
    const date = parseRobustDate(getCol(row, 'tradedate', 'date', 'datetime', 'time', 'orderdate', 'executiontime'), reportDefaultDate);

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
    execs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const buyQueue: Execution[] = [];
    const sellQueue: Execution[] = [];

    for (const exec of execs) {
      if (exec.side === 'BUY') {
        let remainingQty = exec.qty;
        while (sellQueue.length > 0 && remainingQty > 0) {
          const shortExec = sellQueue[0];
          const matchedQty = Math.min(remainingQty, shortExec.qty);

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
        let remainingQty = exec.qty;
        while (buyQueue.length > 0 && remainingQty > 0) {
          const longExec = buyQueue[0];
          const matchedQty = Math.min(remainingQty, longExec.qty);

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
