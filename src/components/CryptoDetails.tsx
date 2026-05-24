import React, { useState } from 'react';
import { AlertCircle, ArrowUpRight, Award, CircleDollarSign, Coins, TrendingUp, HelpCircle, BellRing, Trash } from 'lucide-react';
import { Coin, PriceAlert } from '../types';

interface CryptoDetailsProps {
  coin: Coin;
  alerts: PriceAlert[];
  onAddAlert: (coinId: string, targetPrice: number, condition: 'above' | 'below') => void;
  onRemoveAlert: (alertId: string) => void;
}

export default function CryptoDetails({ coin, alerts, onAddAlert, onRemoveAlert }: CryptoDetailsProps) {
  const [targetPriceInput, setTargetPriceInput] = useState('');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Human-friendly formats
  const formatPrice = (val: number) => {
    if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return val.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  const formatLargeNum = (num: number | null) => {
    if (num === null || num === undefined) return 'Infinite/Uncapped';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  // Safe percentage calculation for 24h progress bar
  const priceProgressPercent = (() => {
    const range = coin.high_24h - coin.low_24h;
    if (range <= 0) return 50;
    const progress = coin.current_price - coin.low_24h;
    return Math.min(Math.max((progress / range) * 100, 0), 100);
  })();

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPriceInput);
    if (isNaN(price) || price <= 0) return;

    onAddAlert(coin.id, price, alertCondition);
    setTargetPriceInput('');
    setAlertSuccess(true);
    setTimeout(() => setAlertSuccess(false), 3000);
  };

  const coinAlerts = alerts.filter(a => a.coinId === coin.id);

  return (
    <div className="space-y-6">
      
      {/* 24-Hour Range Gradient Progress Slider */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h4 className="text-xs font-mono font-medium text-slate-500 tracking-wider mb-4">24H PERFORMANCE RANGE BAR</h4>
        
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-1.5">
          <span>LOW: ${formatPrice(coin.low_24h)}</span>
          <span>HIGH: ${formatPrice(coin.high_24h)}</span>
        </div>
        
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
          <div 
            className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${priceProgressPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
          <span>0%</span>
          <span className="text-cyan-400 font-semibold uppercase">Current: ${formatPrice(coin.current_price)}</span>
          <span>100%</span>
        </div>
      </div>

      {/* Grid of Key Analytical Metrics */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Circulating Supply card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 mb-1">
            <Coins className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-mono tracking-wider uppercase">Circulating Supply</span>
          </div>
          <p className="text-sm font-bold font-mono text-slate-200">
            {formatLargeNum(coin.circulating_supply)} <span className="text-[10px] text-slate-500 uppercase">{coin.symbol}</span>
          </p>
          {coin.max_supply && (
            <p className="text-[9px] font-mono text-slate-500 mt-1.5">
              Percent Circulated: {(((coin.circulating_supply ?? 0) / (coin.max_supply || 1)) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        {/* Max Supply Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 mb-1">
            <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-mono tracking-wider uppercase">Max Total Supply</span>
          </div>
          <p className="text-sm font-bold font-mono text-slate-200">
            {coin.max_supply ? `${formatLargeNum(coin.max_supply)} ` : 'Infinite '} 
            <span className="text-[10px] text-slate-500 uppercase">{coin.symbol}</span>
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-1.5">
            Hard cap restriction status
          </p>
        </div>

        {/* All Time High Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-500 mb-1">
            <Award className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">All Time High</span>
          </div>
          <p className="text-sm font-bold font-mono text-emerald-400">
            ${formatPrice(coin.ath)}
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-1">
            Down {Math.abs(coin.ath_change_percentage ?? 0).toFixed(1)}% from ATH
          </p>
        </div>

        {/* All Time Low Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-red-500 mb-1">
            <CircleDollarSign className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">All Time Low</span>
          </div>
          <p className="text-sm font-bold font-mono text-red-400">
            ${formatPrice(coin.atl)}
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-1">
            Up {Math.abs(coin.atl_change_percentage).toLocaleString()}% from ATL
          </p>
        </div>

      </div>

      {/* Target Price Alerting Setting Module */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <BellRing className="h-4 w-4 text-cyan-400 animate-swing" />
          <h4 className="text-xs font-mono font-medium text-slate-300 tracking-wider">SET LOCAL PRICE ALERTS</h4>
        </div>

        <form onSubmit={handleCreateAlert} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAlertCondition('above')}
              className={`py-2 text-[11px] font-mono border rounded-xl transition-all ${
                alertCondition === 'above'
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              GOES ABOVE (📈)
            </button>
            <button
              type="button"
              onClick={() => setAlertCondition('below')}
              className={`py-2 text-[11px] font-mono border rounded-xl transition-all ${
                alertCondition === 'below'
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              FALLS BELOW (📉)
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">$</span>
            <input
              type="number"
              step="any"
              required
              placeholder={`Trigger (Current: ${coin.current_price})`}
              value={targetPriceInput}
              onChange={(e) => setTargetPriceInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 pl-8 pr-20 py-2.5 text-xs rounded-xl font-mono outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-semibold font-mono text-[10px] px-3 py-1.5 rounded-lg transition-all"
            >
              ADD ALERT
            </button>
          </div>
        </form>

        {alertSuccess && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-[10px] font-mono text-center">
            ✔ Target trigger alert programmed successfully!
          </div>
        )}

        {/* Existing active alerts list for this specific coin */}
        {coinAlerts.length > 0 && (
          <div className="mt-5 border-t border-slate-800/60 pt-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2.5">Active Alerts Scheduled ({coinAlerts.length})</span>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {coinAlerts.map(alert => (
                <div key={alert.id} className="bg-slate-950 border border-slate-850 rounded-xl p-2.5 flex justify-between items-center text-[10px] font-mono">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${alert.condition === 'above' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-slate-400">
                      Price {alert.condition === 'above' ? '≥' : '≤'} <span className="text-slate-100 font-bold">${alert.targetPrice.toLocaleString()}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveAlert(alert.id)}
                    className="p-1 hover:text-red-400 text-slate-600 transition-all rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800"
                  >
                    <Trash className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
