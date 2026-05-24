import { useState, useEffect, useRef } from 'react';
import { Bell, Coins, RefreshCw, Terminal, TrendingUp, AlertTriangle, Play, X, Heart, Globe, Settings, HelpCircle, Flame } from 'lucide-react';

import { useCryptoStore } from './store/useCryptoStore';
import { Coin, CoinHistoryPoint } from './types';
import { generateClientHistoricalFallbackData } from './utils/fallback';
import Navbar from './components/Navbar';
import CryptoTable from './components/CryptoTable';
import CryptoChart from './components/CryptoChart';
import CryptoDetails from './components/CryptoDetails';
import CryptoPortfolio from './components/CryptoPortfolio';
import CryptoDetailPage from './components/CryptoDetailPage';
import CryptoCompareChart from './components/CryptoCompareChart';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio'>('dashboard');

  // Select state slices from the Zustand store
  const coins = useCryptoStore((state) => state.coins);
  const coinsMap = useCryptoStore((state) => state.coinsMap);
  const selectedCoinId = useCryptoStore((state) => state.selectedCoinId);
  const setSelectedCoinId = useCryptoStore((state) => state.setSelectedCoinId);
  
  const socketConnected = useCryptoStore((state) => state.socketConnected);
  const secondsToNextTick = useCryptoStore((state) => state.secondsToNextTick);
  const connectSocket = useCryptoStore((state) => state.connectSocket);
  const disconnectSocket = useCryptoStore((state) => state.disconnectSocket);
  const decrementSeconds = useCryptoStore((state) => state.decrementSeconds);
  const setCoins = useCryptoStore((state) => state.setCoins);
  const updateCoins = useCryptoStore((state) => state.updateCoins);

  const alerts = useCryptoStore((state) => state.alerts);
  const addAlert = useCryptoStore((state) => state.addAlert);
  const removeAlert = useCryptoStore((state) => state.removeAlert);
  const triggeredAlerts = useCryptoStore((state) => state.triggeredAlerts);
  const dismissTriggeredAlert = useCryptoStore((state) => state.dismissTriggeredAlert);
  
  const theme = useCryptoStore((state) => state.theme);
  const setTheme = useCryptoStore((state) => state.setTheme);

  const [historicalPrices, setHistoricalPrices] = useState<CoinHistoryPoint[]>([]);
  const [chartDays, setChartDays] = useState<number>(7);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  // Derive active selected coin object
  const selectedCoin = selectedCoinId ? coinsMap[selectedCoinId] : null;

  // 1. Establish real-time WebSockets feed inside the Zustand store on mount
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  // 2. Local countdown ticker decrements the store count every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      decrementSeconds();
    }, 1000);

    return () => clearInterval(timer);
  }, [decrementSeconds]);

  // 3. Fallback Initial Rest queries + Robust Background Polling fallback when Socket is disconnected
  useEffect(() => {
    let active = true;
    async function loadCoinData(isFirstFetch: boolean) {
      try {
        const res = await fetch('/api/coins?limit=150');
        const json = await res.json();
        if (active && json.success && json.data && json.data.length > 0) {
          if (isFirstFetch) {
            setCoins(json.data);
          } else {
            updateCoins(json.data);
          }
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('Fallback REST loader error. Offline fallback mechanism remains active.', e);
      }
    }

    // Call on mount immediately for instant bootstrap
    loadCoinData(true);

    // If socket.io is disconnected, keep fetching via HTTP polling in the background (every 15 seconds)
    const interval = setInterval(() => {
      if (!socketConnected) {
        console.log('Socket connection offline or checking. Polling rest endpoint to trigger updates.');
        loadCoinData(false);
      }
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [setCoins, updateCoins, socketConnected]);

  // Set isLoading to false as soon as we have coins in state from either Socket or fetch
  useEffect(() => {
    if (coins.length > 0) {
      setIsLoading(false);
    }
  }, [coins]);

  // 4. Load historical analytics whenever active Selection or days filter changes
  useEffect(() => {
    if (!selectedCoinId) return;

    let active = true;
    async function loadHistory() {
      setIsLoadingChart(true);
      try {
        const res = await fetch(`/api/trends/${selectedCoinId}?days=${chartDays}`);
        const json = await res.json();
        if (active && json.success) {
          setHistoricalPrices(json.prices || []);
        } else if (active) {
          // If response status was successful but JSON says success is false, generate fallback
          const activeCoin = coins.find(c => c.id === selectedCoinId);
          const currentPrice = activeCoin ? activeCoin.current_price : 100;
          const fallbackData = generateClientHistoricalFallbackData(currentPrice, chartDays);
          setHistoricalPrices(fallbackData);
        }
      } catch (err) {
        console.warn('Failure requesting price charts from backend, leveraging client-side fallback engine.', err);
        if (active) {
          const activeCoin = coins.find(c => c.id === selectedCoinId);
          const currentPrice = activeCoin ? activeCoin.current_price : 100;
          const fallbackData = generateClientHistoricalFallbackData(currentPrice, chartDays);
          setHistoricalPrices(fallbackData);
        }
      } finally {
        if (active) setIsLoadingChart(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [selectedCoinId, chartDays]);

  // 5. Active selection transitions to a dedicated sub-view automatically
  // No scroll-to-bottom side effects

  return (
    <div className={`min-h-screen flex flex-col bg-[#080b11] text-slate-100 transition-colors duration-300 ${
      theme === 'light' ? 'theme-light' : theme === 'cyberpunk' ? 'theme-cyberpunk' : ''
    }`}>
      
      {/* 1. Header component containing status counters and connection badges */}
      <Navbar 
        socketConnected={socketConnected} 
        secondsToNextTick={secondsToNextTick} 
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedCoinId(null); // Clear active coin search on tab switch
        }}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Triggered floating notifications display area */}
      {triggeredAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 md:right-8 z-50 w-full max-w-sm px-4 md:px-0 space-y-3 pointer-events-none">
          {triggeredAlerts.map(fired => (
            <div 
              key={fired.id} 
              className="bg-gradient-to-tr from-cyan-950/95 to-slate-900/95 border-2 border-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] text-white p-4.5 rounded-2xl flex items-start space-x-3 pointer-events-auto shadow-2xl animate-pulse"
            >
              <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">TELEMETRY NOTIFICATION</h5>
                <p className="text-xs font-mono font-medium mt-1 leading-relaxed text-slate-100">{fired.message}</p>
                <span className="text-[9px] font-mono text-slate-500 mt-2 block">Trigger Time: {new Date(fired.timestamp).toLocaleTimeString()}</span>
              </div>
              <button 
                onClick={() => dismissTriggeredAlert(fired.id)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner Welcome Info */}
        {!selectedCoin && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl animate-fade-in">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Flame className="h-24 w-24 text-cyan-500" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-1 rounded-full font-bold mb-3 select-none">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2 animate-ping" />
                {activeTab === 'dashboard' ? 'NOVACOIN V2 PROTOCOL LIVE FEED' : 'MY CRYPTO INVESTMENT VALUATION'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {activeTab === 'dashboard' ? 'Live Cryptocurrency Ticker & Analytics' : 'Personal Asset Portfolio Ledger'}
              </h1>
              <p className="text-xs text-slate-400 font-medium font-mono leading-relaxed mt-2">
                {activeTab === 'dashboard' 
                  ? 'Connect to websocket streaming nodes instantly to capture high-frequency fluctuations. Program targets values alerts, analyze market trends, and prevent rating limits using unified proxy systems.'
                  : 'Manage and evaluate your virtual holdings dynamically. Track aggregate acquisition cost, absolute current market valuation, aggregate daily delta variations, and profit yield margins.'}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center space-y-3 font-mono">
            <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-sm font-semibold text-slate-300">ESTABLISHING CRYPTO GRAPH HANDSHAKES...</h3>
            <span className="text-[11px] text-slate-500">Retrieving secure caches from CoinGecko nodes</span>
          </div>
        ) : selectedCoin ? (
          <CryptoDetailPage
            coin={selectedCoin}
            historicalPrices={historicalPrices}
            chartDays={chartDays}
            onDaysChange={setChartDays}
            alerts={alerts}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onBack={() => setSelectedCoinId(null)}
          />
        ) : activeTab === 'portfolio' ? (
          <CryptoPortfolio onSelectCoin={(coinId) => {
            setSelectedCoinId(coinId);
            setActiveTab('dashboard');
          }} />
        ) : (
          <div className="space-y-8 animate-fade-in">
            <CryptoTable
              onSelectCoin={(coin) => setSelectedCoinId(coin.id)}
              isLoading={isLoading}
            />

            {!isLoading && coins.length > 0 && (
              <CryptoCompareChart coins={coins} />
            )}
          </div>
        )}
      </main>

      {/* Clean Aesthetic Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center font-mono text-[10px] text-slate-600 space-y-2">
          <p>© {new Date().getFullYear()} NOVACOIN SYSTEMS INC. ALL RIGHTS RESERVED.</p>
          <p className="flex justify-center items-center space-x-1">
            <span>Power Level: Standard Node Feed</span>
            <span>•</span>
            <span className="text-cyan-500">Latency: ~15s interval</span>
            <span>•</span>
            <span>Ref: CoinGecko Sandbox</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
