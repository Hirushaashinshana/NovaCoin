import { Activity, Radio, RefreshCw, Smartphone, TrendingUp, Briefcase, Sun, Moon, Sparkles } from 'lucide-react';

interface NavbarProps {
  socketConnected: boolean;
  secondsToNextTick: number;
  activeTab: 'dashboard' | 'portfolio';
  onTabChange: (tab: 'dashboard' | 'portfolio') => void;
  theme: 'dark' | 'light' | 'cyberpunk';
  onThemeChange: (theme: 'dark' | 'light' | 'cyberpunk') => void;
}

export default function Navbar({ 
  socketConnected, 
  secondsToNextTick,
  activeTab,
  onTabChange,
  theme,
  onThemeChange
}: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand Logo & Tabs Group */}
          <div className="flex items-center space-x-3 md:space-x-6 min-w-0">
            {/* Visual Brand Logo */}
            <div 
              onClick={() => onTabChange('dashboard')}
              className="flex items-center space-x-2 cursor-pointer group select-none"
              title="Return to Main Market Feed"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/25 group-hover:scale-105 group-hover:rotate-2 transition-all">
                <TrendingUp className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col select-none">
                <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent leading-none">
                  NovaCoin
                </span>
                <span className="text-[9px] hidden sm:block font-mono text-slate-500 tracking-widest mt-1">REALTIME FEED</span>
              </div>
            </div>

            {/* Touch-Friendly Navigation tab capsule */}
            <nav className="flex items-center bg-slate-900/60 p-1 border border-slate-800/60 rounded-xl space-x-1 shadow-inner">
              <button
                onClick={() => onTabChange('dashboard')}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all outline-none cursor-pointer flex items-center space-x-2 select-none ${
                  activeTab === 'dashboard'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-905 border border-transparent'
                }`}
                title="Markets Ticker"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Markets</span>
              </button>
              <button
                onClick={() => onTabChange('portfolio')}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all outline-none cursor-pointer flex items-center space-x-2 select-none ${
                  activeTab === 'portfolio'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-905 border border-transparent'
                }`}
                title="Financial Portfolio Hub"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Portfolio</span>
              </button>
            </nav>
          </div>

          {/* Center Column: Core Market Telemetry Info */}
          <div className="hidden lg:flex items-center space-x-4 text-xs font-mono select-none">
            <div className="flex items-center space-x-1.5 bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-colors">
              <span className="text-slate-500">GLOBAL MCAP:</span>
              <span className="text-emerald-400 font-bold">$2.45T</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-colors">
              <span className="text-slate-500">GAS FEE:</span>
              <span className="text-amber-400 font-bold">18 GWEI</span>
            </div>
          </div>

          {/* Right Column: Real-time system telemetry and Theme Controls */}
          <div className="flex items-center space-x-2.5 ml-auto sm:ml-0">
            {/* Round Theme Toggle */}
            <button
              onClick={() => {
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                onThemeChange(nextTheme);
              }}
              className="flex items-center justify-center h-10 w-10 min-w-[40px] rounded-full bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-all cursor-pointer outline-none select-none text-slate-300 hover:text-cyan-400"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-cyan-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            {/* Smart mini interval sync badge */}
            <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2.5 sm:px-3 rounded-xl border border-slate-800/80 text-[11px] font-mono select-none h-10" title="Automatic Stream Sync Intervall">
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${secondsToNextTick <= 1 ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline text-slate-400">SYNC IN:</span>
              <span className="text-cyan-400 font-semibold w-5 text-right">{secondsToNextTick}s</span>
            </div>

            {/* WS state pulse dot/badge */}
            <div className="flex items-center">
              <div className={`flex items-center space-x-1.5 rounded-xl px-2.5 sm:px-3 text-[11px] font-mono leading-none font-semibold transition-all duration-300 h-10 border ${
                socketConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
              }`} title={socketConnected ? 'Secure real-time web socket live connection established' : 'Searching for server signal...'}>
                <Radio className={`h-3.5 w-3.5 ${socketConnected ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">{socketConnected ? 'LIVE FEED' : 'RECONNECTING'}</span>
                <span className="sm:hidden">{socketConnected ? 'LIVE' : 'SYNC'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
