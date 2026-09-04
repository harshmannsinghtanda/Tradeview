import { useState, useEffect, useMemo } from 'react';
import { Trade, TradeFiltersState } from './types/trade';
import { 
  loadTradesFromStorage, 
  saveTradesToStorage,
  isStorageInitialized,
  setStorageInitialized
} from './lib/storage';
import { SAMPLE_TRADES } from './lib/mock-data';
import { calculatePerformanceMetrics } from './lib/calculations';

// Layout & Common
import { Navbar, NavTab } from './components/layout/Navbar';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { PnlChart } from './components/dashboard/PnlChart';
import { CalendarHeatmap } from './components/dashboard/CalendarHeatmap';
import { AssetDistribution } from './components/dashboard/AssetDistribution';

// Trades
import { TradeTable } from './components/trades/TradeTable';
import { TradeFilters } from './components/trades/TradeFilters';
import { TradeFormModal } from './components/trades/TradeFormModal';
import { TradeDetailModal } from './components/trades/TradeDetailModal';
import { ScalperQuickBar } from './components/trades/ScalperQuickBar';
import { TiltCircuitBreaker } from './components/trades/TiltCircuitBreaker';

// Analytics
import { PsychologyAnalytics } from './components/analytics/PsychologyAnalytics';
import { StrategyAnalytics } from './components/analytics/StrategyAnalytics';

// Import / Export
import { ImportExportModal } from './components/import-export/ImportExportModal';

export default function App() {
  // Primary trade data state
  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = loadTradesFromStorage();
    if (isStorageInitialized()) {
      return saved;
    }
    setStorageInitialized(true);
    return SAMPLE_TRADES;
  });

  // Save to storage on any modification
  useEffect(() => {
    saveTradesToStorage(trades);
  }, [trades]);

  // Tab State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Scalper Mode State
  const [isScalperMode, setIsScalperMode] = useState<boolean>(() => {
    return localStorage.getItem('tradeview_scalper_mode') === 'true';
  });

  const toggleScalperMode = () => {
    setIsScalperMode((prev) => {
      const next = !prev;
      localStorage.setItem('tradeview_scalper_mode', String(next));
      return next;
    });
  };

  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Filters State
  const initialFilters: TradeFiltersState = {
    search: '',
    assetClass: 'All',
    direction: 'All',
    status: 'All',
    emotion: 'All',
    strategy: 'All',
    dateRange: 'All',
  };
  const [filters, setFilters] = useState<TradeFiltersState>(initialFilters);

  // Filtered trades computation
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(q);
        const matchStrategy = t.strategy?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        if (!matchSymbol && !matchStrategy && !matchNotes) return false;
      }

      // Asset Class
      if (filters.assetClass !== 'All' && t.assetClass !== filters.assetClass) {
        return false;
      }

      // Direction
      if (filters.direction !== 'All' && t.direction !== filters.direction) {
        return false;
      }

      // Status
      if (filters.status !== 'All' && t.status !== filters.status) {
        return false;
      }

      // Emotion
      if (filters.emotion !== 'All' && t.emotion !== filters.emotion) {
        return false;
      }

      // Strategy
      if (filters.strategy !== 'All' && t.strategy !== filters.strategy) {
        return false;
      }

      return true;
    });
  }, [trades, filters]);

  // Metrics computation
  const metrics = useMemo(() => {
    return calculatePerformanceMetrics(filteredTrades);
  }, [filteredTrades]);

  // Distinct strategies list for filtering dropdown
  const uniqueStrategies = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      if (t.strategy) set.add(t.strategy);
    });
    return Array.from(set);
  }, [trades]);

  // Trade CRUD Handlers
  const handleSaveTrade = (trade: Trade) => {
    setTrades((prev) => {
      const idx = prev.findIndex((t) => t.id === trade.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = trade;
        return next;
      } else {
        return [trade, ...prev];
      }
    });
  };

  const handleDeleteTrade = (tradeId: string) => {
    if (window.confirm('Delete this trade record?')) {
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    }
  };

  const handleImportTrades = (newTrades: Trade[]) => {
    setTrades((prev) => {
      // deduplicate by id if matching
      const existingIds = new Set(prev.map((t) => t.id));
      const filteredNew = newTrades.filter((t) => !existingIds.has(t.id));
      return [...filteredNew, ...prev];
    });
  };

  const handleLoadSampleData = () => {
    setTrades(SAMPLE_TRADES);
  };

  const handleClearAllTrades = () => {
    setTrades([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar with TradeView branding and Theme toggle */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTrade={() => {
          setEditingTrade(null);
          setIsTradeModalOpen(true);
        }}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        hasTrades={trades.length > 0}
        isScalperMode={isScalperMode}
        onToggleScalperMode={toggleScalperMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* KPI Metrics Ribbon (Always visible across all tabs) */}
        <section>
          <MetricsGrid metrics={metrics} />
        </section>

        {/* ⚡ Dedicated Scalper Terminal Suite (Appears seamlessly when Scalper Mode is ON) */}
        {isScalperMode && (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <TiltCircuitBreaker trades={trades} />
            <ScalperQuickBar onSaveTrade={handleSaveTrade} />
          </section>
        )}

        {/* Tab 1: Terminal Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Chart Area */}
            <PnlChart trades={filteredTrades} />

            {/* Middle Grid: Calendar Heatmap & Asset Exposure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CalendarHeatmap trades={filteredTrades} />
              </div>
              <div>
                <AssetDistribution trades={filteredTrades} />
              </div>
            </div>

            {/* Recent Executions Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Journal Entries</h3>
                <button
                  onClick={() => setActiveTab('trades')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View All ({filteredTrades.length}) →
                </button>
              </div>

              <TradeTable
                trades={filteredTrades.slice(0, 5)}
                onEdit={(t) => {
                  setEditingTrade(t);
                  setIsTradeModalOpen(true);
                }}
                onDelete={handleDeleteTrade}
                onView={(t) => setViewingTrade(t)}
                onOpenNewTrade={() => {
                  setEditingTrade(null);
                  setIsTradeModalOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Full Trade Log & Filtering */}
        {activeTab === 'trades' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <TradeFilters
              filters={filters}
              onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
              onReset={() => setFilters(initialFilters)}
              strategies={uniqueStrategies}
            />

            <TradeTable
              trades={filteredTrades}
              onEdit={(t) => {
                setEditingTrade(t);
                setIsTradeModalOpen(true);
              }}
              onDelete={handleDeleteTrade}
              onView={(t) => setViewingTrade(t)}
              onOpenNewTrade={() => {
                setEditingTrade(null);
                setIsTradeModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Psychology & Setups Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PsychologyAnalytics trades={filteredTrades} />
            <StrategyAnalytics trades={filteredTrades} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>TradeView</strong> — High-Performance Trading Journal & Terminal
          </span>
          <span>
            100% Private • Stored On-Device
          </span>
        </div>
      </footer>

      {/* Trade Entry / Edit Modal */}
      <TradeFormModal
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setEditingTrade(null);
        }}
        onSave={handleSaveTrade}
        initialTrade={editingTrade}
      />

      {/* Trade Inspection Modal */}
      <TradeDetailModal
        trade={viewingTrade}
        onClose={() => setViewingTrade(null)}
        onEdit={(t) => {
          setViewingTrade(null);
          setEditingTrade(t);
          setIsTradeModalOpen(true);
        }}
      />

      {/* Import / Export & Backup Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        trades={trades}
        onImportTrades={handleImportTrades}
        onLoadSampleTrades={handleLoadSampleData}
        onClearTrades={handleClearAllTrades}
      />

    </div>
  );
}
