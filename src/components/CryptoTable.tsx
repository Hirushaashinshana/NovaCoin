import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Coin } from '../types';
import { useCryptoStore } from '../store/useCryptoStore';

interface CryptoTableProps {
  onSelectCoin: (coin: Coin) => void;
  isLoading: boolean;
}

// Standalone row item that subscribes directly to its slice of Zustand state,
// preventing full table re-renders during high-frequency updates!
const CryptoRow = React.memo(({ 
  coinId, 
  isSelected, 
  onClick 
}: { 
  coinId: string; 
  isSelected: boolean; 
  onClick: (coin: Coin) => void;
}) => {
  // Subscribe specifically to only this coin's data slice
  const coin = useCryptoStore((state) => state.coinsMap[coinId]);
  
  // Track previous prices to trigger immediate local flash highlights
  const prevPriceRef = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!coin) return;
    const currentPrice = coin.current_price;
    const prevPrice = prevPriceRef.current;

    if (prevPrice !== undefined && prevPrice !== currentPrice) {
      setFlash(currentPrice > prevPrice ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [coin?.current_price]);

  if (!coin) return null;

  const changeIsPos = coin.price_change_percentage_24h >= 0;

  // Custom mini static sparkline
  const renderSparkline = (prices: number[] | undefined, isPositive: boolean) => {
    if (!prices || prices.length < 2) return null;
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    const width = 85;
    const height = 28;
    const padding = 2;
    
    const points = prices.map((price, i) => {
      const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((price - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isPositive ? '#10b981' : '#ef4444';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return price.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  const formatLargeNum = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '$0';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <tr
      onClick={() => onClick(coin)}
      className={`cursor-pointer hover:bg-slate-800/25 transition-colors group ${
        isSelected ? 'bg-gradient-to-r from-cyan-950/20 via-slate-850 to-transparent' : ''
      }`}
    >
      {/* Rank */}
      <td className="py-4 px-5 text-center font-mono text-slate-500 font-semibold group-hover:text-cyan-400 transition-colors">
        {coin.market_cap_rank}
      </td>

      {/* Name and Logo */}
      <td className="py-4 px-4">
        <div className="flex items-center space-x-3">
          <img 
            src={coin.image} 
            alt={coin.name} 
            className="w-7 h-7 object-contain rounded-full bg-slate-950/50 p-0.5 border border-slate-800/60"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
            }}
          />
          <div>
            <span className="font-bold text-slate-200 group-hover:text-white block transition-colors leading-none">
              {coin.name}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1.5 block">
              {coin.symbol}
            </span>
          </div>
        </div>
      </td>

      {/* Price with specific cell pulse highlight animation */}
      <td className={`py-4 px-4 text-right font-mono font-medium text-slate-200 border-r border-transparent transition-all duration-300 ${
        flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
      }`}>
        ${formatPrice(coin.current_price)}
      </td>

      {/* 24h Change */}
      <td className="py-4 px-4 text-right">
        <span className={`inline-flex items-center font-mono font-semibold ${
          changeIsPos ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {changeIsPos ? <ChevronUp className="h-3 w-3 mr-0.5" /> : <ChevronDown className="h-3 w-3 mr-0.5" />}
          {changeIsPos ? '+' : ''}{(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
        </span>
      </td>

      {/* Volume */}
      <td className="py-4 px-4 text-right font-mono text-slate-300">
        {formatLargeNum(coin.total_volume)}
      </td>

      {/* Market Cap */}
      <td className="py-4 px-4 text-right font-mono text-slate-300">
        {formatLargeNum(coin.market_cap)}
      </td>

      {/* Mini Trend Graph sparkline preview */}
      <td className="py-2 px-4 flex items-center justify-center">
        <div className="opacity-80 group-hover:opacity-100 transition-opacity">
          {renderSparkline(coin.sparkline_in_7d?.price, changeIsPos)}
        </div>
      </td>
    </tr>
  );
});

CryptoRow.displayName = 'CryptoRow';

type SortField = 'market_cap_rank' | 'name' | 'current_price' | 'price_change_percentage_24h' | 'total_volume';
type SortOrder = 'asc' | 'desc';

export default function CryptoTable({
  onSelectCoin,
  isLoading
}: CryptoTableProps) {
  // Pull states from global store
  const coins = useCryptoStore((state) => state.coins);
  const selectedCoinId = useCryptoStore((state) => state.selectedCoinId);
  const searchTerm = useCryptoStore((state) => state.searchTerm);
  const setSearchTerm = useCryptoStore((state) => state.setSearchTerm);

  const [sortField, setSortField] = useState<SortField>('market_cap_rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Handle column sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Perform client-side filter + sort
  const sortedAndFilteredCoinIds = useMemo(() => {
    const criteria = searchTerm.toLowerCase().trim();
    return coins
      .filter(coin => {
        if (!criteria) return true;
        return (
          coin.name.toLowerCase().includes(criteria) ||
          coin.symbol.toLowerCase().includes(criteria)
        );
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      })
      .map(c => c.id);
  }, [coins, searchTerm, sortField, sortOrder]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search coin or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-500 pl-10 pr-4 py-2 text-sm rounded-xl font-medium outline-none transition-all font-mono"
          />
        </div>
        
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <span>SHOWING {sortedAndFilteredCoinIds.length} ACTIVE PAIRS</span>
        </div>
      </div>

      {/* Main Stats Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-slate-400">
          <thead>
            <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-500 font-mono tracking-wider">
              <th className="py-4 px-5 text-center w-14">#</th>
              
              <th 
                className="py-4 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1.5">
                  <span>COIN NAME</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th 
                className="py-4 px-4 cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => handleSort('current_price')}
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>PRICE (USD)</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th 
                className="py-4 px-4 cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => handleSort('price_change_percentage_24h')}
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>24H CHANGE</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th 
                className="py-4 px-4 cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => handleSort('total_volume')}
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>24H VOLUME</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th className="py-4 px-4 text-right">MARKET CAP</th>
              
              <th className="py-4 px-4 text-center w-28">LAST 24H TREND</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-800/40">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <span>REFRESHING LIVE TICKER SYSTEM...</span>
                  </div>
                </td>
              </tr>
            ) : sortedAndFilteredCoinIds.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  NO MATCHING CRYPTO PAIRS DETECTED
                </td>
              </tr>
            ) : (
              sortedAndFilteredCoinIds.map((id) => (
                <CryptoRow
                  key={id}
                  coinId={id}
                  isSelected={id === selectedCoinId}
                  onClick={onSelectCoin}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
