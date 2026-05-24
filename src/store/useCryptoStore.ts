import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Coin, PriceAlert, PortfolioHolding } from '../types';

interface CryptoState {
  // Raw and mapped state
  coins: Coin[];
  coinIds: string[];
  coinsMap: Record<string, Coin>;
  selectedCoinId: string | null;
  searchTerm: string;
  socketConnected: boolean;
  secondsToNextTick: number;
  alerts: PriceAlert[];
  triggeredAlerts: { id: string; message: string; timestamp: number }[];
  portfolio: PortfolioHolding[];
  theme: 'dark' | 'light' | 'cyberpunk';
  
  // Actions
  setCoins: (coins: Coin[]) => void;
  updateCoins: (coins: Coin[]) => void;
  setSelectedCoinId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSecondsToNextTick: (seconds: number) => void;
  decrementSeconds: () => void;
  addAlert: (coinId: string, targetPrice: number, condition: 'above' | 'below') => void;
  removeAlert: (alertId: string) => void;
  dismissTriggeredAlert: (id: string) => void;
  addHolding: (coinId: string, amount: number, avgBuyPrice: number) => void;
  updateHolding: (holdingId: string, amount: number, avgBuyPrice: number) => void;
  removeHolding: (holdingId: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'cyberpunk') => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

const getInitialPortfolio = (): PortfolioHolding[] => {
  try {
    const saved = localStorage.getItem('coinmetric_portfolio');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading portfolio from localStorage', e);
    return [];
  }
};

let socket: Socket | null = null;

export const useCryptoStore = create<CryptoState>((set, get) => ({
  coins: [],
  coinIds: [],
  coinsMap: {},
  selectedCoinId: null,
  searchTerm: '',
  socketConnected: false,
  secondsToNextTick: 15,
  alerts: [],
  triggeredAlerts: [],
  portfolio: getInitialPortfolio(),
  theme: (localStorage.getItem('coinmetric_theme') as any) || 'dark',

  setCoins: (coins) => {
    const coinsMap = coins.reduce((acc, coin) => {
      acc[coin.id] = coin;
      return acc;
    }, {} as Record<string, Coin>);
    
    set({
      coins,
      coinIds: coins.map(c => c.id),
      coinsMap,
    });
  },

  updateCoins: (updatedCoins) => {
    const currentMap = { ...get().coinsMap };
    let hasAlertCheck = false;
    const activeAlerts = [...get().alerts];
    const triggered: { id: string; message: string; timestamp: number }[] = [];
    const elementsToRemove: string[] = [];

    updatedCoins.forEach(coin => {
      const prevCoin = currentMap[coin.id];
      currentMap[coin.id] = coin;

      // Realtime alert breaching validator logic inside state manager
      activeAlerts.forEach((alert) => {
        if (alert.coinId === coin.id) {
          const currentPrice = coin.current_price;
          let isBreached = false;
          if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
            isBreached = true;
          } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
            isBreached = true;
          }

          if (isBreached) {
            triggered.push({
              id: `${alert.id}_fired_${Date.now()}`,
              message: `🚨 ALERT BRIDGED! ${alert.coinName} has matching target value of $${alert.targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
              timestamp: Date.now()
            });
            elementsToRemove.push(alert.id);
            hasAlertCheck = true;
          }
        }
      });
    });

    const nextAlerts = hasAlertCheck 
      ? activeAlerts.filter(a => !elementsToRemove.includes(a.id))
      : activeAlerts;

    set(state => ({
      coins: updatedCoins,
      coinsMap: currentMap,
      coinIds: updatedCoins.map(c => c.id),
      alerts: nextAlerts,
      triggeredAlerts: triggered.length > 0 ? [...triggered, ...state.triggeredAlerts] : state.triggeredAlerts,
      secondsToNextTick: 15
    }));
  },

  setSelectedCoinId: (id) => set({ selectedCoinId: id }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSecondsToNextTick: (seconds) => set({ secondsToNextTick: seconds }),
  decrementSeconds: () => set(state => ({
    secondsToNextTick: state.secondsToNextTick <= 1 ? 15 : state.secondsToNextTick - 1
  })),

  addAlert: (coinId, targetPrice, condition) => {
    const coin = get().coinsMap[coinId];
    if (!coin) return;

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coinId,
      coinName: coin.name,
      targetPrice,
      condition,
      createdAt: Date.now(),
      isActive: true
    };
    
    set(state => ({
      alerts: [newAlert, ...state.alerts]
    }));
  },

  removeAlert: (alertId) => set(state => ({
    alerts: state.alerts.filter(a => a.id !== alertId)
  })),

  dismissTriggeredAlert: (id) => set(state => ({
    triggeredAlerts: state.triggeredAlerts.filter(x => x.id !== id)
  })),

  connectSocket: () => {
    if (socket) return;

    // Connect automatically to the current origin host matching reverse proxy
    socket = io();

    socket.on('connect', () => {
      set({ socketConnected: true });
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
    });

    socket.on('initial_prices', (initialCoins: Coin[]) => {
      get().setCoins(initialCoins);
      if (!get().selectedCoinId && initialCoins.length > 0) {
        set({ selectedCoinId: initialCoins[0].id });
      }
    });

    socket.on('price_updates', (updatedCoins: Coin[]) => {
      get().updateCoins(updatedCoins);
    });
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      set({ socketConnected: false });
    }
  },

  addHolding: (coinId, amount, avgBuyPrice) => {
    const coin = get().coinsMap[coinId];
    if (!coin) return;

    const currentPortfolio = get().portfolio;
    const existingIndex = currentPortfolio.findIndex(h => h.coinId === coinId);
    let updatedPortfolio: PortfolioHolding[];

    if (existingIndex > -1) {
      const existing = currentPortfolio[existingIndex];
      const newAmount = existing.amount + amount;
      const newAvgPrice = ((existing.amount * existing.avgBuyPrice) + (amount * avgBuyPrice)) / (newAmount || 1);
      
      updatedPortfolio = [...currentPortfolio];
      updatedPortfolio[existingIndex] = {
        ...existing,
        amount: newAmount,
        avgBuyPrice: Number(newAvgPrice.toFixed(6))
      };
    } else {
      const newHolding: PortfolioHolding = {
        id: `holding_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        coinId,
        coinName: coin.name,
        coinSymbol: coin.symbol,
        coinImage: coin.image,
        amount,
        avgBuyPrice,
        addedAt: Date.now()
      };
      updatedPortfolio = [newHolding, ...currentPortfolio];
    }

    try {
      localStorage.setItem('coinmetric_portfolio', JSON.stringify(updatedPortfolio));
    } catch (e) {
      console.error('Error saving portfolio to localStorage', e);
    }
    set({ portfolio: updatedPortfolio });
  },

  updateHolding: (holdingId, amount, avgBuyPrice) => {
    const updatedPortfolio = get().portfolio.map(h => {
      if (h.id === holdingId) {
        return { ...h, amount, avgBuyPrice };
      }
      return h;
    });

    try {
      localStorage.setItem('coinmetric_portfolio', JSON.stringify(updatedPortfolio));
    } catch (e) {
      console.error('Error saving portfolio to localStorage', e);
    }
    set({ portfolio: updatedPortfolio });
  },

  removeHolding: (holdingId) => {
    const updatedPortfolio = get().portfolio.filter(h => h.id !== holdingId);
    try {
      localStorage.setItem('coinmetric_portfolio', JSON.stringify(updatedPortfolio));
    } catch (e) {
      console.error('Error saving portfolio to localStorage', e);
    }
    set({ portfolio: updatedPortfolio });
  },

  setTheme: (theme) => {
    try {
      localStorage.setItem('coinmetric_theme', theme);
    } catch (e) {
      console.error('Error saving theme to localStorage', e);
    }
    set({ theme });
  }
}));
