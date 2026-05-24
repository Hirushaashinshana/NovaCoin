import React from 'react';
import { ChevronLeft, ArrowUpRight, ArrowDownRight, Award, CircleDollarSign, Coins, BellRing, Sparkles, Activity } from 'lucide-react';
import { Coin, CoinHistoryPoint, PriceAlert } from '../types';
import CryptoChart from './CryptoChart';
import CryptoDetails from './CryptoDetails';

interface CryptoDetailPageProps {
  coin: Coin;
  historicalPrices: CoinHistoryPoint[];
  chartDays: number;
  onDaysChange: (days: number) => void;
  alerts: PriceAlert[];
  onAddAlert: (coinId: string, targetPrice: number, condition: 'above' | 'below') => void;
  onRemoveAlert: (alertId: string) => void;
  onBack: () => void;
}

export default function CryptoDetailPage({
  coin,
  historicalPrices,
  chartDays,
  onDaysChange,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onBack
}: CryptoDetailPageProps) {
  const isPos = coin.price_change_percentage_24h >= 0;

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
    <div className="space-y-6 animate-fade-in">
      
      {/* Back button and breadcrumbs row */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
        <button
          onClick={onBack}
          className="group flex items-center space-x-2 bg-slate-900 hover:bg-slate-800/80 hover:text-cyan-400 border border-slate-800 hover:border-slate-705 px-4 py-2 rounded-xl text-xs font-mono transition-all text-slate-300 select-none cursor-pointer outline-none"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>BACK TO MARKETS</span>
        </button>

        <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-500 uppercase">
          <span>Markets</span>
          <span>/</span>
          <span className="text-cyan-400 font-bold">{coin.name} Detail Page</span>
        </div>
      </div>

      {/* Main Identity Banner Card */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <img
              src={coin.image}
              alt={coin.name}
              className="w-14 h-14 object-contain rounded-2xl bg-slate-950 p-1 border border-slate-800 shadow-inner"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
              }}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-0">{coin.name}</h2>
                <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-750 font-mono px-2 py-0.5 rounded uppercase font-semibold">
                  {coin.symbol}
                </span>
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 font-mono px-2 py-0.5 rounded font-bold uppercase">
                  Rank #{coin.market_cap_rank}
                </span>
              </div>

              <div className="flex items-center space-x-4 mt-1.5 font-mono text-xs text-slate-400">
                <span>VOL: <span className="text-slate-200 font-semibold">{formatLargeNum(coin.total_volume)}</span></span>
                <span>•</span>
                <span>MCAP: <span className="text-slate-200 font-semibold">{formatLargeNum(coin.market_cap)}</span></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">REAL-TIME VALUATION</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">${formatPrice(coin.current_price)}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                isPos ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
              }`}>
                {isPos ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                {isPos ? '+' : ''}{(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of details: Chart on top, specifications below */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Full-width interactive neon line chart */}
        <div className="lg:col-span-12">
          <CryptoChart
            prices={historicalPrices}
            coinName={coin.name}
            selectedDays={chartDays}
            onDaysChange={onDaysChange}
            currentPrice={coin.current_price}
            priceChangePercent={coin.price_change_percentage_24h}
          />
        </div>

        {/* Detailed analytical indicators and price-alerts scheduler */}
        <div className="lg:col-span-12">
          <CryptoDetails
            coin={coin}
            alerts={alerts}
            onAddAlert={onAddAlert}
            onRemoveAlert={onRemoveAlert}
          />
        </div>
      </div>

    </div>
  );
}
