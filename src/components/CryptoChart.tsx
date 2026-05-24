import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { CoinHistoryPoint } from '../types';

interface CryptoChartProps {
  prices: CoinHistoryPoint[];
  coinName: string;
  selectedDays: number;
  onDaysChange: (days: number) => void;
  currentPrice: number;
  priceChangePercent: number;
}

// Relative Strength Index (RSI) calculation helper
function calculateRSI(prices: { price: number }[], period: number = 14): number[] {
  if (prices.length === 0) return [];
  
  const rsis: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i].price - prices[i - 1].price;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // Neutral start
  rsis.push(50);
  
  let avgGain = 0;
  let avgLoss = 0;
  
  const limit = Math.min(period, gains.length);
  for (let i = 0; i < limit; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  
  avgGain = limit > 0 ? avgGain / limit : 0;
  avgLoss = limit > 0 ? avgLoss / limit : 0;
  
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  
  // Fill the warmup phase
  for (let i = 1; i < Math.min(period + 1, prices.length); i++) {
    rsis.push(rsiValue);
  }
  
  // Smooth the rest using Wilder's technique
  for (let i = period + 1; i < prices.length; i++) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsis.push(rsiValue);
  }
  
  return rsis;
}

export default function CryptoChart({
  prices,
  coinName,
  selectedDays,
  onDaysChange,
  currentPrice,
  priceChangePercent
}: CryptoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 360 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Resize observer to ensure the SVG is 100% responsive
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: 360 // Aspect height for standard price + RSI layout
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { points, minX, maxX, minY, maxY } = useMemo(() => {
    if (!prices || prices.length === 0) {
      return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const priceValues = prices.map(p => p.price);
    const minVal = Math.min(...priceValues);
    const maxVal = Math.max(...priceValues);
    const minPrice = minVal - (maxVal - minVal) * 0.05; // 5% padding bottom
    const maxPrice = maxVal + (maxVal - minVal) * 0.05; // 5% padding top
    
    const timestamps = prices.map(p => p.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    return {
      points: prices,
      minX: minTime,
      maxX: maxTime,
      minY: minPrice === maxPrice ? minPrice - 1 : minPrice,
      maxY: minPrice === maxPrice ? maxPrice + 1 : maxPrice
    };
  }, [prices]);

  const padding = { left: 55, right: 15, top: 20, bottom: 45 };

  // Generate RSI values array in tandem with prices sequence
  const rsiValues = useMemo(() => {
    return calculateRSI(points);
  }, [points]);

  // Generate SVG path coordinates
  const svgData = useMemo(() => {
    if (points.length < 2) return { path: '', area: '', rsiPath: '', coordinateList: [] };

    const chartWidth = dimensions.width - padding.left - padding.right;
    const priceChartHeight = 175;
    const priceChartBottom = 195;
    const rsiChartHeight = 85;
    const rsiChartBottom = 315;

    const coords = points.map((p, index) => {
      const x = padding.left + ((p.timestamp - minX) / (maxX - minX)) * chartWidth;
      const y = priceChartBottom - ((p.price - minY) / (maxY - minY)) * priceChartHeight;
      const rsiVal = rsiValues[index] !== undefined ? rsiValues[index] : 50;
      const rsiY = rsiChartBottom - (rsiVal / 100) * rsiChartHeight;
      return { x, y, rsiY, rsi: rsiVal, raw: p };
    });

    const pathD = coords.reduce((accum, curr, index) => {
      return accum + (index === 0 ? `M ${curr.x} ${curr.y}` : ` L ${curr.x} ${curr.y}`);
    }, '');

    // Area path closing at baseline representing price graph
    const priceBaselineY = priceChartBottom;
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${priceBaselineY} L ${coords[0].x} ${priceBaselineY} Z`;

    const rsiPathD = coords.reduce((accum, curr, index) => {
      return accum + (index === 0 ? `M ${curr.x} ${curr.rsiY}` : ` L ${curr.x} ${curr.rsiY}`);
    }, '');

    return { 
      path: pathD, 
      area: areaD, 
      rsiPath: rsiPathD,
      coordinateList: coords 
    };
  }, [points, dimensions, minX, maxX, minY, maxY, rsiValues]);

  // Handle pointer tracking over the SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgData.coordinateList.length === 0 || !containerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest point by X coordinate
    let closestIdx = 0;
    let minDistance = Infinity;

    svgData.coordinateList.forEach((coord, index) => {
      const dist = Math.abs(coord.x - mouseX);
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

  const hoveredPoint = hoveredIndex !== null ? svgData.coordinateList[hoveredIndex] : null;

  // Format Helper
  const formatPriceVal = (val: number) => {
    if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return val.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  const formatDateLabel = (timestamp: number) => {
    const d = new Date(timestamp);
    if (selectedDays === 1) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      
      {/* Chart Mini Header info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded uppercase">{coinName} Live Data</span>
            <span>•</span>
            <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {selectedDays}d Historical Analytics &amp; RSI</span>
          </div>
          
          <div className="flex items-baseline space-x-3 mt-1">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white">${formatPriceVal(currentPrice)}</h3>
            <span className={`text-sm font-semibold flex items-center ${priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {priceChangePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {priceChangePercent >= 0 ? '+' : ''}{(priceChangePercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeframe selector button array */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          {[1, 7, 30].map((days) => (
            <button
              key={days}
              onClick={() => onDaysChange(days)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                selectedDays === days
                  ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 text-cyan-400 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              {days === 1 ? '24 HOURS' : days === 7 ? '7 DAYS' : '30 DAYS'}
            </button>
          ))}
        </div>
      </div>

      {hoveredPoint && (
        <div className="absolute top-2.5 right-5 bg-slate-950/95 border border-slate-800/80 px-3.5 py-2.5 rounded-xl text-right z-10 shadow-lg pointer-events-none transition-all flex flex-col gap-0.5">
          <p className="text-[10px] font-mono text-slate-500">HOVER DATA POINT</p>
          <p className="text-sm font-bold font-mono text-cyan-400 leading-none">${formatPriceVal(hoveredPoint.raw.price)}</p>
          <p className="text-[11px] font-bold font-mono text-purple-400 leading-normal">
            RSI (14): {(hoveredPoint.rsi ?? 50).toFixed(2)}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${
              hoveredPoint.rsi >= 70 
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold' 
                : hoveredPoint.rsi <= 30 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold' 
                  : 'bg-slate-800/85 text-slate-400 border border-slate-700/50'
            }`}>
              {hoveredPoint.rsi >= 70 ? 'OVERBOUGHT' : hoveredPoint.rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL'}
            </span>
          </p>
          <p className="text-[9px] font-mono text-slate-400 mt-0.5">{formatDateLabel(hoveredPoint.raw.timestamp)}</p>
        </div>
      )}

      {/* SVG Canvas drawing */}
      <div ref={containerRef} className="w-full relative select-none">
        {points.length > 1 ? (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair overflow-visible"
          >
            {/* Definitions for area gradients */}
            <defs>
              <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines for PRICE Chart */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const priceChartHeight = 175;
              const y = padding.top + ratio * priceChartHeight;
              const val = maxY - ratio * (maxY - minY);
              return (
                <g key={index}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={dimensions.width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  {/* Axis labels values */}
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    ${formatPriceVal(val)}
                  </text>
                </g>
              );
            })}

            {/* Neon Area Fill Under Curve */}
            <path d={svgData.area} fill="url(#areaGlow)" />

            {/* High Definition Line Path for PRICE Graph */}
            <path
              d={svgData.path}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />

            {/* RSI Levels Shaded Band and Dash Lines */}
            <g>
              {/* Shaded Oversold/Overbought zone (30 - 70) */}
              <rect
                x={padding.left}
                y={255.5}
                width={dimensions.width - padding.left - padding.right}
                height={34}
                fill="rgba(168, 85, 247, 0.04)"
                stroke="rgba(168, 85, 247, 0.12)"
                strokeWidth="1"
              />

              {/* RSI 70 Line */}
              <line
                x1={padding.left}
                y1={255.5}
                x2={dimensions.width - padding.right}
                y2={255.5}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 8}
                y={255.5 + 3.5}
                fill="#f43f5e"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                70 OB
              </text>

              {/* RSI 50 Line */}
              <line
                x1={padding.left}
                y1={272.5}
                x2={dimensions.width - padding.right}
                y2={272.5}
                stroke="#475569"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 8}
                y={272.5 + 3.5}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                50 MID
              </text>

              {/* RSI 30 Line */}
              <line
                x1={padding.left}
                y1={289.5}
                x2={dimensions.width - padding.right}
                y2={289.5}
                stroke="#10b981"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 8}
                y={289.5 + 3.5}
                fill="#10b981"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                30 OS
              </text>
            </g>

            {/* Real-time calculated RSI Indicator Line */}
            <path
              d={svgData.rsiPath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]"
            />

            {/* Sub-Panel Partition Label */}
            <text
              x={padding.left + 5}
              y={225}
              fill="#c084fc"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="0.1em"
              fillOpacity="0.75"
            >
              INDICATOR: RSI (14) INTRA-CYCLE
            </text>

            {/* Time labels axis */}
            {points.length > 1 && [0, 0.33, 0.66, 1].map((ratio, index) => {
              const w = dimensions.width - padding.left - padding.right;
              const x = padding.left + ratio * w;
              const timestamp = minX + ratio * (maxX - minX);
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

            {/* Hover Interactive Crosshair lines and coordinate circle pins */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={315}
                  stroke="#0891b2"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                />
                
                {/* Price marker */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="6"
                  fill="#06b6d4"
                  stroke="#0b0f19"
                  strokeWidth="2"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="4.5"
                  fill="#22d3ee"
                  stroke="#0b0f19"
                  strokeWidth="1.5"
                />

                {/* RSI marker */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.rsiY}
                  r="5"
                  fill="#a855f7"
                  stroke="#0b0f19"
                  strokeWidth="2"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.rsiY}
                  r="3.5"
                  fill="#f3e8ff"
                  stroke="#0b0f19"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        ) : (
          <div className="h-[360px] flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <span className="text-xs font-mono text-slate-500 animate-pulse">GENERATING HISTORICAL MARKET CURVES...</span>
          </div>
        )}
      </div>

    </div>
  );
}
