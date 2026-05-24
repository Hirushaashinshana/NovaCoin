import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, ArrowLeftRight, TrendingUp, TrendingDown, ChevronDown, CheckCheck, Loader2 } from 'lucide-react';
import { Coin, CoinHistoryPoint } from '../types';

interface CryptoCompareChartProps {
  coins: Coin[];
}

export default function CryptoCompareChart({ coins }: CryptoCompareChartProps) {
  const [coinIdA, setCoinIdA] = useState('bitcoin');
  const [coinIdB, setCoinIdB] = useState('ethereum');
  const [days, setDays] = useState<number>(7);
  
  const [pricesA, setPricesA] = useState<CoinHistoryPoint[]>([]);
  const [pricesB, setPricesB] = useState<CoinHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Memoize ranked coins list so top rankings display first for convenience
  const sortedDropdownCoins = useMemo(() => {
    return [...coins].sort((a, b) => a.market_cap_rank - b.market_cap_rank);
  }, [coins]);

  const coinA = useMemo(() => coins.find(c => c.id === coinIdA), [coins, coinIdA]);
  const coinB = useMemo(() => coins.find(c => c.id === coinIdB), [coins, coinIdB]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(entry.contentRect.width, 300),
          height: 320
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch histories in parallel
  useEffect(() => {
    let active = true;
    async function fetchComparativeData() {
      setIsLoading(true);
      setError(null);
      try {
        const [resA, resB] = await Promise.all([
          fetch(`/api/trends/${coinIdA}?days=${days}`),
          fetch(`/api/trends/${coinIdB}?days=${days}`)
        ]);
        
        const jsonA = await resA.json();
        const jsonB = await resB.json();

        if (!active) return;

        if (jsonA.success && jsonB.success) {
          setPricesA(jsonA.prices || []);
          setPricesB(jsonB.prices || []);
        } else {
          setError('Failed to fetch historical comparative sequence.');
        }
      } catch (err) {
        console.error('Error fetching comparative history:', err);
        if (active) setError('Network error loading trend lines.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchComparativeData();
    return () => {
      active = false;
    };
  }, [coinIdA, coinIdB, days]);

  // Compute normalized datasets (centered around 0% at initial timestamp)
  const chartData = useMemo(() => {
    if (pricesA.length === 0 || pricesB.length === 0) {
      return { coordsA: [], coordsB: [], minY: 0, maxY: 0, minX: 0, maxX: 0 };
    }

    // Baseline prices
    const baseA = pricesA[0].price || 1;
    const baseB = pricesB[0].price || 1;

    // Convert prices to relative percentage performance
    const pctA = pricesA.map(p => ({
      timestamp: p.timestamp,
      price: p.price,
      pctChange: ((p.price - baseA) / baseA) * 100
    }));

    const pctB = pricesB.map(p => ({
      timestamp: p.timestamp,
      price: p.price,
      pctChange: ((p.price - baseB) / baseB) * 100
    }));

    const minXA = Math.min(...pctA.map(p => p.timestamp));
    const maxXA = Math.max(...pctA.map(p => p.timestamp));
    const minXB = Math.min(...pctB.map(p => p.timestamp));
    const maxXB = Math.max(...pctB.map(p => p.timestamp));

    const minX = Math.min(minXA, minXB);
    const maxX = Math.max(maxXA, maxXB);

    const minYA = Math.min(...pctA.map(p => p.pctChange));
    const maxYA = Math.max(...pctA.map(p => p.pctChange));
    const minYB = Math.min(...pctB.map(p => p.pctChange));
    const maxYB = Math.max(...pctB.map(p => p.pctChange));

    const realMinY = Math.min(minYA, minYB);
    const realMaxY = Math.max(maxYA, maxYB);

    // Apply 10% vertical buffers to percentage grid
    const rangeY = realMaxY - realMinY;
    const buffer = rangeY === 0 ? 5 : rangeY * 0.1;
    const minY = realMinY - buffer;
    const maxY = realMaxY + buffer;

    return {
      coordsA: pctA,
      coordsB: pctB,
      minY,
      maxY,
      minX,
      maxX
    };
  }, [pricesA, pricesB]);

  // Build SVG layout paths
  const padding = { left: 55, right: 15, top: 25, bottom: 40 };
  const svgData = useMemo(() => {
    if (chartData.coordsA.length === 0 || chartData.coordsB.length === 0) {
      return { pathA: '', pathB: '', pointsA: [], pointsB: [] };
    }

    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const scaleX = (ts: number) => {
      const denom = chartData.maxX - chartData.minX;
      return padding.left + (denom === 0 ? 0 : ((ts - chartData.minX) / denom) * chartWidth);
    };

    const scaleY = (pct: number) => {
      const denom = chartData.maxY - chartData.minY;
      return padding.top + chartHeight - (denom === 0 ? 0 : ((pct - chartData.minY) / denom) * chartHeight);
    };

    const ptsA = chartData.coordsA.map(pt => ({
      x: scaleX(pt.timestamp),
      y: scaleY(pt.pctChange),
      pct: pt.pctChange,
      price: pt.price,
      timestamp: pt.timestamp
    }));

    const ptsB = chartData.coordsB.map(pt => ({
      x: scaleX(pt.timestamp),
      y: scaleY(pt.pctChange),
      pct: pt.pctChange,
      price: pt.price,
      timestamp: pt.timestamp
    }));

    const buildPath = (pts: typeof ptsA) => {
      return pts.reduce((acc, curr, idx) => {
        return acc + (idx === 0 ? `M ${curr.x} ${curr.y}` : ` L ${curr.x} ${curr.y}`);
      }, '');
    };

    return {
      pathA: buildPath(ptsA),
      pathB: buildPath(ptsB),
      pointsA: ptsA,
      pointsB: ptsB
    };
  }, [chartData, dimensions]);

  // Handle interactive mouse hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgData.pointsA.length === 0 || !containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let minDistance = Infinity;

    svgData.pointsA.forEach((pt, index) => {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = index;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Extract selected points of hover
  const hoveredInfo = useMemo(() => {
    if (hoveredIndex === null || svgData.pointsA.length === 0) return null;
    
    const ptA = svgData.pointsA[hoveredIndex];
    // Find matched timestamp index or closest in B
    let ptB = svgData.pointsB[hoveredIndex];
    if (ptB && Math.abs(ptB.timestamp - ptA.timestamp) > 3600000) {
      // Find exact closest
      let bestIdx = 0;
      let bestDist = Infinity;
      svgData.pointsB.forEach((b, idx) => {
        const dist = Math.abs(b.timestamp - ptA.timestamp);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      ptB = svgData.pointsB[bestIdx];
    }

    return {
      timestamp: ptA.timestamp,
      ptA,
      ptB: ptB || ptA // Fallback check
    };
  }, [hoveredIndex, svgData]);

  // Calculate final delta performance indicator
  const performanceStatus = useMemo(() => {
    if (pricesA.length === 0 || pricesB.length === 0) return null;
    const lastA = chartData.coordsA[chartData.coordsA.length - 1];
    const lastB = chartData.coordsB[chartData.coordsB.length - 1];

    if (!lastA || !lastB) return null;

    const finalPctA = lastA.pctChange;
    const finalPctB = lastB.pctChange;
    const diff = finalPctA - finalPctB;

    return {
      nameA: coinA?.name || 'Asset A',
      nameB: coinB?.name || 'Asset B',
      pctA: finalPctA,
      pctB: finalPctB,
      diff: Math.abs(diff),
      winner: diff > 0 ? 'A' : 'B'
    };
  }, [pricesA, pricesB, chartData, coinA, coinB]);

  // Pricing formatting helpers
  const formatPriceVal = (val: number) => {
    if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return val.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  const formatDateLabel = (timestamp: number) => {
    const d = new Date(timestamp);
    if (days === 1) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-cyan-400" />
            Comparative Asset Trends
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Overlay relative performance dynamics normalized to a 0% baseline
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 shadow-md">
          {[1, 7, 30].map((tDays) => (
            <button
              key={tDays}
              onClick={() => setDays(tDays)}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                days === tDays
                  ? 'bg-gradient-to-tr from-cyan-500/10 to-blue-600/10 text-cyan-400 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {tDays === 1 ? '1D' : tDays === 7 ? '7D' : '30D'}
            </button>
          ))}
        </div>
      </div>

      {/* Selectors Module */}
      <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 mb-5 select-none">
        
        {/* Dropdown 1 */}
        <div className="sm:col-span-2 relative">
          <label className="block text-[9 px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1.5">Primary Asset</label>
          <div className="relative">
            <select
              value={coinIdA}
              onChange={(e) => setCoinIdA(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-cyan-500/20"
            >
              {sortedDropdownCoins.map((coinItem) => (
                <option key={coinItem.id} value={coinItem.id}>
                  Rank #{coinItem.market_cap_rank} • {coinItem.name} ({coinItem.symbol.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Middle decorative linkage */}
        <div className="flex justify-center items-center sm:col-span-1 pt-4 sm:pt-0">
          <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-mono text-slate-500 font-bold">VS</span>
          </div>
        </div>

        {/* Dropdown 2 */}
        <div className="sm:col-span-2 relative">
          <label className="block text-[9 px] font-mono font-bold text-purple-400 uppercase tracking-widest mb-1.5">Comparative Asset</label>
          <div className="relative">
            <select
              value={coinIdB}
              onChange={(e) => setCoinIdB(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-purple-500/20"
            >
              {sortedDropdownCoins.map((coinItem) => (
                <option key={coinItem.id} value={coinItem.id} disabled={coinItem.id === coinIdA}>
                  Rank #{coinItem.market_cap_rank} • {coinItem.name} ({coinItem.symbol.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Live Hover Float Info */}
      {hoveredInfo && (
        <div className="absolute top-24 sm:top-5 right-5 bg-slate-950/95 border border-slate-800 px-3.5 py-2.5 rounded-xl text-right z-10 shadow-xl pointer-events-none flex flex-col gap-1 min-w-[200px] text-xs font-mono">
          <p className="text-[9px] text-slate-500 uppercase">Interactive Coordinates</p>
          <p className="text-[10px] text-slate-400 font-bold mb-1 border-b border-slate-800/80 pb-1">{formatDateLabel(hoveredInfo.timestamp)}</p>
          
          <div className="flex justify-between items-center text-cyan-400 font-bold gap-3">
            <span>{coinA?.symbol.toUpperCase() || 'A'}:</span>
            <span>${formatPriceVal(hoveredInfo.ptA.price)} ({hoveredInfo.ptA.pct >= 0 ? '+' : ''}{hoveredInfo.ptA.pct.toFixed(2)}%)</span>
          </div>
          
          <div className="flex justify-between items-center text-purple-400 font-bold gap-3">
            <span>{coinB?.symbol.toUpperCase() || 'B'}:</span>
            <span>${formatPriceVal(hoveredInfo.ptB.price)} ({hoveredInfo.ptB.pct >= 0 ? '+' : ''}{hoveredInfo.ptB.pct.toFixed(2)}%)</span>
          </div>
        </div>
      )}

      {/* SVG Drawing Block */}
      <div ref={containerRef} className="w-full select-none relative mt-2">
        {isLoading ? (
          <div className="h-[240px] flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
            <Loader2 className="h-7 w-7 text-cyan-400 animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Compiling relative performance graphs...</span>
          </div>
        ) : error ? (
          <div className="h-[240px] flex items-center justify-center border border-slate-800/80 bg-slate-950/20 text-red-400 font-mono text-xs text-center px-4 rounded-xl">
            {error}
          </div>
        ) : svgData.pointsA.length > 1 ? (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair overflow-visible"
          >
            {/* Grid Line Coordinates */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const h = dimensions.height - padding.top - padding.bottom;
              const y = padding.top + ratio * h;
              const val = chartData.maxY - ratio * (chartData.maxY - chartData.minY);
              
              // Highlight the 0% baseline specifically!
              const isBaseline = Math.abs(val) < 0.3; // close to 0

              return (
                <g key={index}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={dimensions.width - padding.right}
                    y2={y}
                    stroke={isBaseline ? '#475569' : '#1e293b'}
                    strokeWidth={isBaseline ? '1.5' : '1'}
                    strokeDasharray={isBaseline ? 'none' : '4,4'}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3.5}
                    fill={isBaseline ? '#94a3b8' : '#64748b'}
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight={isBaseline ? 'bold' : 'normal'}
                  >
                    {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {/* Path A Line (Cyan) */}
            <path
              d={svgData.pathA}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_rgba(6,182,212,0.35)]"
            />

            {/* Path B Line (Purple) */}
            <path
              d={svgData.pathB}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_rgba(168,85,247,0.35)] animate-fade-in"
            />

            {/* Horizontal timeline scale Labels */}
            {[0, 0.33, 0.66, 1].map((ratio, index) => {
              const w = dimensions.width - padding.left - padding.right;
              const x = padding.left + ratio * w;
              const timestamp = chartData.minX + ratio * (chartData.maxX - chartData.minX);
              return (
                <text
                  key={index}
                  x={x}
                  y={dimensions.height - 12}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor={index === 0 ? 'start' : index === 3 ? 'end' : 'middle'}
                >
                  {formatDateLabel(timestamp)}
                </text>
              );
            })}

            {/* Interactive Tracker Cursor Line */}
            {hoveredInfo && (
              <g>
                <line
                  x1={hoveredInfo.ptA.x}
                  y1={padding.top}
                  x2={hoveredInfo.ptA.x}
                  y2={dimensions.height - padding.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />

                {/* Marker Pin A circle */}
                <circle
                  cx={hoveredInfo.ptA.x}
                  cy={hoveredInfo.ptA.y}
                  r="5"
                  fill="#06b6d4"
                  stroke="#0b0f19"
                  strokeWidth="1.5"
                />

                {/* Marker Pin B circle */}
                <circle
                  cx={hoveredInfo.ptB.x}
                  cy={hoveredInfo.ptB.y}
                  r="5"
                  fill="#a855f7"
                  stroke="#0b0f19"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        ) : (
          <div className="h-[240px] flex items-center justify-center border border-slate-800/80 rounded-xl bg-slate-950/20 text-xs font-mono text-slate-500">
            CHOOSE CRYPTO CURRENCIES TO GENERATE COMPARISON OVERLAYS
          </div>
        )}
      </div>

      {/* Smart Analytical Summary Footer */}
      {performanceStatus && !isLoading && !error && (
        <div className="mt-4 p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-inner" />
            <span className="text-slate-400">{performanceStatus.nameA}:</span>
            <span className={`font-bold ${performanceStatus.pctA >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {performanceStatus.pctA >= 0 ? '+' : ''}{performanceStatus.pctA.toFixed(2)}%
            </span>
            <span className="text-slate-600 px-1">|</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-inner" />
            <span className="text-slate-400">{performanceStatus.nameB}:</span>
            <span className={`font-bold ${performanceStatus.pctB >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {performanceStatus.pctB >= 0 ? '+' : ''}{performanceStatus.pctB.toFixed(2)}%
            </span>
          </div>

          <div className="text-xs font-mono text-slate-300">
            Delta Spread:{' '}
            <span className="font-bold text-cyan-400">{performanceStatus.diff.toFixed(2)}%</span>{' '}
            in favor of{' '}
            <span className="font-bold underline text-white">
              {performanceStatus.winner === 'A' ? performanceStatus.nameA : performanceStatus.nameB}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
