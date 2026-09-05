import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Sun, 
  Moon, 
  Plus, 
  FileSpreadsheet, 
  BarChart2, 
  ListOrdered, 
  BrainCircuit,
  Sparkles,
  Zap,
  IndianRupee,
  DollarSign
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Button } from '../common/Button';

export type NavTab = 'dashboard' | 'trades' | 'analytics';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTrade: () => void;
  onOpenImportExport: () => void;
  onLoadSampleData?: () => void;
  hasTrades: boolean;
  isScalperMode: boolean;
  onToggleScalperMode: () => void;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenNewTrade,
  onOpenImportExport,
  onLoadSampleData,
  hasTrades,
  isScalperMode,
  onToggleScalperMode,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, usdToInrRate, setUsdToInrRate } = useCurrency();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'trades', label: 'Trade Log', icon: ListOrdered },
    { id: 'analytics', label: 'Psychology & Setups', icon: BrainCircuit },
  ];

  const handleCurrencyClick = () => {
    setCurrency(currency === 'INR' ? 'USD' : 'INR');
  };

  const handleCurrencyContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const newRate = window.prompt(`Enter USD to INR conversion rate (Current: ${usdToInrRate}):`, String(usdToInrRate));
    if (newRate && !isNaN(Number(newRate)) && Number(newRate) > 0) {
      setUsdToInrRate(Number(newRate));
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#0a0c14]/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-glow-brand flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Trade<span className="text-indigo-500">View</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Trading Terminal & Journal
              </p>
            </div>
          </div>

          {/* Navigation Tabs with Emil Kowalski Layout Transition */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as NavTab)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer select-none ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Sample Data Demo button if needed */}
            {onLoadSampleData && !hasTrades && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadSampleData}
                icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                className="hidden sm:inline-flex text-xs"
              >
                Load Sample Trades
              </Button>
            )}

            {/* Import / Export */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenImportExport}
              icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              className="px-2.5 sm:px-3.5 text-xs"
              title="Import CSV or Export Data"
            >
              <span className="hidden md:inline">Data & CSV</span>
            </Button>

            {/* ⚡ Scalper Mode Toggle */}
            <button
              onClick={onToggleScalperMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isScalperMode
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isScalperMode ? 'Scalper Mode Active' : 'Switch to Scalper Mode'}
            >
              <Zap className={`w-3.5 h-3.5 ${isScalperMode ? 'fill-amber-400 text-amber-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">
                {isScalperMode ? '⚡ Scalp Mode' : 'Scalper Mode'}
              </span>
            </button>

            {/* Currency Toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCurrencyClick}
              onContextMenu={handleCurrencyContextMenu}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch Currency (Right click to set rate)`}
              aria-label="Toggle currency"
            >
              {currency === 'INR' ? (
                <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </motion.button>

            {/* Light / Dark Mode Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </motion.button>

            {/* Primary Log Trade Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenNewTrade}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="px-2.5 sm:px-3.5 text-xs font-semibold shadow-glow-brand"
            >
              <span className="hidden xs:inline">Log Trade</span>
              <span className="xs:hidden">Log</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-1.5 border-t border-slate-200/50 dark:border-slate-800/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as NavTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
