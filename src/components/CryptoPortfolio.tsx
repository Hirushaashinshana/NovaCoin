import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, DollarSign, PieChart, Briefcase, Info } from 'lucide-react';
import { useCryptoStore } from '../store/useCryptoStore';
import { PortfolioHolding } from '../types';

interface CryptoPortfolioProps {
  onSelectCoin?: (coinId: string) => void;
}

export default function CryptoPortfolio({ onSelectCoin }: CryptoPortfolioProps) {
  const coins = useCryptoStore((state) => state.coins);
  const coinsMap = useCryptoStore((state) => state.coinsMap);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const addHolding = useCryptoStore((state) => state.addHolding);
  const updateHolding = useCryptoStore((state) => state.updateHolding);
  const removeHolding = useCryptoStore((state) => state.removeHolding);

  // Form states for manual additions
  const [selectedCoinId, setSelectedCoinId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [buyPriceStr, setBuyPriceStr] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [editingBuyPrice, setEditingBuyPrice] = useState<string>('');

  // Default selection if coins load
  React.useEffect(() => {
    if (coins.length > 0 && !selectedCoinId) {
      setSelectedCoinId(coins[0].id);
    }
  }, [coins, selectedCoinId]);

  // Handle manual input submission
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCoinId) {
      setFormError('Please select a cryptocurrency token.');
      return;
    }

    const amt = parseFloat(amountStr);
    const price = parseFloat(buyPriceStr);

    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount owned must be a positive number.');
      return;
    }

    if (isNaN(price) || price < 0) {
      setFormError('Average buy price must be a non-negative number.');
      return;
    }

    addHolding(selectedCoinId, amt, price);
    setAmountStr('');
    setBuyPriceStr('');
  };

  // Start edit flow
  const startEditing = (holding: PortfolioHolding) => {
    setEditingId(holding.id);
    setEditingAmount(holding.amount.toString());
    setEditingBuyPrice(holding.avgBuyPrice.toString());
  };

  // Save edit flow
  const saveEdit = (id: string) => {
    const amt = parseFloat(editingAmount);
    const price = parseFloat(editingBuyPrice);

    if (isNaN(amt) || amt <= 0 || isNaN(price) || price < 0) {
      return;
    }

    updateHolding(id, amt, price);
    setEditingId(null);
  };

  // Calculations
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let dailyChangeSum = 0;
    let startDayValueSum = 0;

    portfolio.forEach((holding) => {
      const liveCoinData = coinsMap[holding.coinId];
      const livePrice = liveCoinData ? liveCoinData.current_price : holding.avgBuyPrice;
      const change24hPercent = liveCoinData ? liveCoinData.price_change_percentage_24h : 0;
      
      const holdingValue = holding.amount * livePrice;
      const holdingCost = holding.amount * holding.avgBuyPrice;

      totalValue += holdingValue;
      totalCost += holdingCost;

      // Daily Performance Math:
      // Weight the 24h coin change rate over the current holding value to determine aggregate portfolio 24h change
      if (liveCoinData) {
        const changeFactor = change24hPercent / 100;
        // Invert to find yesterday value: starting value = liveValue / (1 + changeFactor)
        // Check to prevent division by zero or errors
        const startVal = changeFactor !== -1 ? holdingValue / (1 + changeFactor) : holdingValue;
        
        dailyChangeSum += (holdingValue - startVal);
        startDayValueSum += startVal;
      } else {
        startDayValueSum += holdingValue;
      }
    });

    const netPnL = totalValue - totalCost;
    const netPnLPercent = totalCost > 0 ? (netPnL / totalCost) * 100 : 0;
    
    // Relative 24h change calculation
    const dailyChangePercent = startDayValueSum > 0 ? (dailyChangeSum / startDayValueSum) * 100 : 0;

    return {
      totalValue,
      totalCost,
      netPnL,
      netPnLPercent,
      dailyChangeValue: dailyChangeSum,
      dailyChangePercent
    };
  }, [portfolio, coinsMap]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return price.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  return (
    <div id="crypto-portfolio-view" className="space-y-6">
      
      {/* 1. Header Balance Summary Cards (Bento Grid Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Real-time Balance Card */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Briefcase className="h-16 w-16 text-cyan-400" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">TOTAL PORTFOLIO SAVINGS</span>
          <h2 className="text-3xl font-bold font-mono text-white mt-1 border-b border-slate-800/40 pb-3">
            ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className="flex items-center justify-between text-xs font-mono mt-3">
            <span className="text-slate-500">ACQUISITION COST:</span>
            <span className="text-slate-300 font-medium">${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Real-time Profit and Loss */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            {summary.netPnL >= 0 ? (
              <TrendingUp className="h-16 w-16 text-emerald-400" />
            ) : (
              <TrendingDown className="h-16 w-16 text-red-400" />
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">ALL-TIME PROFIT &amp; LOSS</span>
          <h2 className={`text-3xl font-bold font-mono mt-1 border-b border-slate-800/40 pb-3 flex items-baseline ${
            summary.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <span>{summary.netPnL >= 0 ? '+' : ''}${summary.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </h2>
          <div className="flex items-center justify-between text-xs font-mono mt-3">
            <span className="text-slate-500">NET RETURN:</span>
            <span className={`font-semibold ${summary.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.netPnL >= 0 ? '+' : ''}{summary.netPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24H Volatility Daily Change Performance */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PieChart className="h-16 w-16 text-indigo-400" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">DAILY PERFORMANCE (24H)</span>
          <h2 className={`text-3xl font-bold font-mono mt-1 border-b border-slate-800/40 pb-3 ${
            summary.dailyChangeValue >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {summary.dailyChangeValue >= 0 ? '+' : ''}${summary.dailyChangeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className="flex items-center justify-between text-xs font-mono mt-3">
            <span className="text-slate-500">AGGREGATE DELTA:</span>
            <span className={`font-semibold ${summary.dailyChangeValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.dailyChangePercent >= 0 ? '+' : ''}{summary.dailyChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Holdings List Table (8 spans) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          
          <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-cyan-400" />
              <h3 className="font-bold text-slate-200 uppercase tracking-wide font-mono text-sm">SECURED HOLDINGS</h3>
            </div>
            <span className="text-slate-500 font-mono text-xs">{portfolio.length} UNIQUE ASSETS RECORDED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-400">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-500 font-mono tracking-wider">
                  <th className="py-4 px-5">ASSET</th>
                  <th className="py-4 px-4 text-right">PRICE (LIVE)</th>
                  <th className="py-4 px-4 text-right">AMOUNT OWNED</th>
                  <th className="py-4 px-4 text-right">AVG BUY PRICE</th>
                  <th className="py-4 px-4 text-right">CURRENT VALUE</th>
                  <th className="py-4 px-4 text-right">NET RETURN (PNL)</th>
                  <th className="py-4 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <Info className="h-5 w-5 text-slate-600" />
                        <span>NO HOLDINGS ADDED YET</span>
                        <span className="text-[10px] text-slate-700">Use the right-side form to records assets manually</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  portfolio.map((holding) => {
                    const liveData = coinsMap[holding.coinId];
                    const livePrice = liveData ? liveData.current_price : holding.avgBuyPrice;
                    const currentValue = holding.amount * livePrice;
                    const overallHoldingCost = holding.amount * holding.avgBuyPrice;
                    const holdingPnL = currentValue - overallHoldingCost;
                    const holdingPnLPercent = overallHoldingCost > 0 ? (holdingPnL / overallHoldingCost) * 100 : 0;

                    const isEditing = editingId === holding.id;

                    return (
                      <tr key={holding.id} className="hover:bg-slate-800/10 transition-colors">
                        {/* Image / Icon and Name */}
                        <td className="py-4 px-5">
                          <div 
                            onClick={() => onSelectCoin?.(holding.coinId)}
                            className={`flex items-center space-x-2.5 ${onSelectCoin ? 'cursor-pointer group' : ''}`}
                            title={onSelectCoin ? "Click to view detailed cryptocurrency page" : undefined}
                          >
                            <img 
                              src={holding.coinImage} 
                              alt={holding.coinName} 
                              className="w-5 h-5 rounded-full object-contain group-hover:scale-110 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
                              }}
                            />
                            <div>
                              <span className="font-bold text-slate-200 block leading-tight group-hover:text-cyan-400 transition-colors">{holding.coinName}</span>
                              <span className="text-[10px] text-slate-500 uppercase">{holding.coinSymbol}</span>
                            </div>
                          </div>
                        </td>

                        {/* Live Price */}
                        <td className="py-4 px-4 text-right font-medium text-slate-300">
                          ${formatPrice(livePrice)}
                        </td>

                        {/* Amount Owned (Editable) */}
                        <td className="py-4 px-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-right text-slate-100 max-w-[90px] text-xs outline-none focus:border-cyan-500"
                            />
                          ) : (
                            <span className="font-semibold text-slate-200">{holding.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                          )}
                        </td>

                        {/* Avg Buy Price (Editable) */}
                        <td className="py-4 px-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editingBuyPrice}
                              onChange={(e) => setEditingBuyPrice(e.target.value)}
                              className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-right text-slate-100 max-w-[90px] text-xs outline-none focus:border-cyan-500"
                            />
                          ) : (
                            <span>${formatPrice(holding.avgBuyPrice)}</span>
                          )}
                        </td>

                        {/* Current Value */}
                        <td className="py-4 px-4 text-right font-bold text-white">
                          ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Return */}
                        <td className={`py-4 px-4 text-right font-semibold ${
                          holdingPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          <div className="flex flex-col items-end leading-none">
                            <span>{holdingPnL >= 0 ? '+' : ''}{holdingPnLPercent.toFixed(2)}%</span>
                            <span className="text-[10px] text-slate-500 mt-1 font-medium">
                              {holdingPnL >= 0 ? '+' : '-'}${Math.abs(holdingPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(holding.id)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Save changes"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                  title="Cancel editing"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(holding)}
                                  className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
                                  title="Edit entry"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => removeHolding(holding.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                  title="Delete holding"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Hand: Addition Form Panel (4 spans) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-1 border-b border-slate-800">
            <Plus className="h-4 w-4 text-cyan-400" />
            <h4 className="font-bold text-slate-200 uppercase tracking-wide font-mono text-xs">RECORD AN ASSET</h4>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-mono">
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[11px] leading-relaxed">
                ⚠️ {formError}
              </div>
            )}

            {/* Cryptocurrency Select */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block font-medium">1. SELECT SOURCE PAIR</label>
              <select
                value={selectedCoinId}
                onChange={(e) => setSelectedCoinId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 outline-none px-3 py-2.5 rounded-xl transition-all"
              >
                {coins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol.toUpperCase()}) — ${c.current_price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount owned */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block font-medium">2. AMOUNT RUNNING</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 0.35"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 placeholder-slate-600 outline-none px-3 py-2.5 rounded-xl transition-all"
              />
            </div>

            {/* Average buy path */}
            <div className="space-y-1.5 border-b border-slate-800/40 pb-4">
              <label className="text-slate-400 block font-medium">3. AVG BUY PRICE (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 62500"
                  value={buyPriceStr}
                  onChange={(e) => setBuyPriceStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 placeholder-slate-600 outline-none pl-7 pr-3 py-2.5 rounded-xl transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] transition-all text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>COMMIT TO HOLDING</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
