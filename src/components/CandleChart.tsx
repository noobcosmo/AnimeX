import React, { useState, useId } from 'react';
import { AnimeStock, PricePoint } from '../types/market.ts';

interface CandleChartProps {
  stock: AnimeStock;
}

export const CandleChart: React.FC<CandleChartProps> = ({ stock }) => {
  const [chartMode, setChartMode] = useState<'TICK' | 'CANDLE'>('CANDLE');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartId = useId();

  const data: PricePoint[] = stock.priceHistory.length > 0 ? stock.priceHistory : [
    {
      time: '10:00',
      open: stock.previousClose,
      high: stock.highPrice,
      low: stock.lowPrice,
      close: stock.currentPrice,
      volume: stock.volume,
    }
  ];

  // SVG dimensions
  const width = 800;
  const height = 340;
  const padding = { top: 24, right: 70, bottom: 50, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Split area: main price chart 75%, volume 20%
  const priceHeight = chartHeight * 0.72;
  const volumeHeight = chartHeight * 0.22;
  const volumeTop = padding.top + priceHeight + chartHeight * 0.06;

  // Find min/max for scale (include limit prices for full frame context)
  const prices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
  prices.push(stock.currentPrice, stock.limitUpPrice, stock.limitDownPrice);

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const priceMargin = (rawMax - rawMin) * 0.08 || 1;
  const minPrice = Math.max(0.1, rawMin - priceMargin);
  const maxPrice = rawMax + priceMargin;

  const maxVolume = Math.max(...data.map(d => d.volume), 1000);

  const getY = (val: number) => {
    return padding.top + priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;
  };

  const getVolY = (vol: number) => {
    return volumeTop + volumeHeight - (vol / maxVolume) * volumeHeight;
  };

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  // Moving average MA5 & MA10
  const ma5 = data.map((_, i) => {
    if (i < 4) return null;
    const slice = data.slice(i - 4, i + 1);
    const avg = slice.reduce((sum, item) => sum + item.close, 0) / 5;
    return avg;
  });

  const ma10 = data.map((_, i) => {
    if (i < 9) return null;
    const slice = data.slice(i - 9, i + 1);
    const avg = slice.reduce((sum, item) => sum + item.close, 0) / 10;
    return avg;
  });

  // Tick line path
  const tickPoints = data.map((d, i) => `${getX(i)},${getY(d.close)}`).join(' ');
  const areaPath = `${tickPoints} L${getX(data.length - 1)},${padding.top + priceHeight} L${getX(0)},${padding.top + priceHeight} Z`;

  // MA paths
  const ma5Points = ma5
    .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
    .filter(Boolean)
    .join(' ');

  const ma10Points = ma10
    .map((val, i) => (val !== null ? `${getX(i)},${getY(val)}` : null))
    .filter(Boolean)
    .join(' ');

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Chart Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-md border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setChartMode('CANDLE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                chartMode === 'CANDLE'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              日K蜡烛线
            </button>
            <button
              onClick={() => setChartMode('TICK')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                chartMode === 'TICK'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              分时走势图
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400 ml-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400"></span>
              <span>MA5: {ma5[ma5.length - 1]?.toFixed(2) || '--'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-cyan-400"></span>
              <span>MA10: {ma10[ma10.length - 1]?.toFixed(2) || '--'}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Readout */}
        {activePoint && (
          <div className="flex items-center gap-3 font-mono tabular-nums text-slate-300">
            <span>开: <b className="text-white">{activePoint.open.toFixed(2)}</b></span>
            <span>高: <b className="text-rose-400">{activePoint.high.toFixed(2)}</b></span>
            <span>低: <b className="text-emerald-400">{activePoint.low.toFixed(2)}</b></span>
            <span>收: <b className={activePoint.close >= activePoint.open ? 'text-rose-400' : 'text-emerald-400'}>{activePoint.close.toFixed(2)}</b></span>
            <span>量: <b className="text-slate-200">{activePoint.volume.toLocaleString()}</b></span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clientX = e.clientX - rect.left;
            const svgX = (clientX / rect.width) * width;
            const relativeX = svgX - padding.left;
            const index = Math.round((relativeX / chartWidth) * (data.length - 1));
            if (index >= 0 && index < data.length) {
              setHoverIndex(index);
            }
          }}
        >
          <defs>
            <linearGradient id={`${chartId}-areaGradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={getY(stock.limitUpPrice)}
            x2={padding.left + chartWidth}
            y2={getY(stock.limitUpPrice)}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.7"
          />
          <text
            x={padding.left + chartWidth + 6}
            y={getY(stock.limitUpPrice) + 4}
            fill="#f43f5e"
            fontSize="10"
            fontFamily="monospace"
          >
            涨停: {stock.limitUpPrice.toFixed(2)}
          </text>

          <line
            x1={padding.left}
            y1={getY(stock.limitDownPrice)}
            x2={padding.left + chartWidth}
            y2={getY(stock.limitDownPrice)}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.7"
          />
          <text
            x={padding.left + chartWidth + 6}
            y={getY(stock.limitDownPrice) + 4}
            fill="#10b981"
            fontSize="10"
            fontFamily="monospace"
          >
            跌停: {stock.limitDownPrice.toFixed(2)}
          </text>

          {/* Horizontal middle grid lines */}
          {[0.25, 0.5, 0.75].map((pct, i) => {
            const p = minPrice + (maxPrice - minPrice) * pct;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={getY(p)}
                  x2={padding.left + chartWidth}
                  y2={getY(p)}
                  stroke="#334155"
                  strokeDasharray="2 4"
                  strokeWidth="0.8"
                />
                <text
                  x={padding.left + chartWidth + 6}
                  y={getY(p) + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {p.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Volume baseline */}
          <line
            x1={padding.left}
            y1={volumeTop}
            x2={padding.left + chartWidth}
            y2={volumeTop}
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            x={padding.left + 4}
            y={volumeTop - 4}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
          >
            成交量 VOLUME
          </text>

          {/* Volume Bars */}
          {data.map((d, i) => {
            const x = getX(i);
            const y = getVolY(d.volume);
            const h = Math.max(2, volumeTop + volumeHeight - y);
            const isUp = d.close >= d.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - 4}
                y={y}
                width={8}
                height={h}
                fill={isUp ? '#f43f5e' : '#10b981'}
                opacity={hoverIndex === i ? 1 : 0.65}
              />
            );
          })}

          {/* Price Representation: Candle vs Tick */}
          {chartMode === 'TICK' ? (
            <>
              <path d={areaPath} fill={`url(#${chartId}-areaGradient)`} />
              <polyline
                points={tickPoints}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            data.map((d, i) => {
              const x = getX(i);
              const isUp = d.close >= d.open;
              const color = isUp ? '#f43f5e' : '#10b981';
              const yOpen = getY(d.open);
              const yClose = getY(d.close);
              const yHigh = getY(d.high);
              const yLow = getY(d.low);

              const candleTop = Math.min(yOpen, yClose);
              const candleHeight = Math.max(2, Math.abs(yClose - yOpen));

              return (
                <g key={`candle-${i}`}>
                  {/* High - Low shadow line */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Candle body */}
                  <rect
                    x={x - 4.5}
                    y={candleTop}
                    width={9}
                    height={candleHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* MA lines */}
          {ma5Points && (
            <polyline
              points={ma5Points}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {ma10Points && (
            <polyline
              points={ma10Points}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={volumeTop + volumeHeight}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={getY(data[hoverIndex].close)}
                x2={padding.left + chartWidth}
                y2={getY(data[hoverIndex].close)}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].close)}
                r="4"
                fill="#ffffff"
                stroke="#38bdf8"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Time Labels */}
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={`time-${i}`}
                x={getX(i)}
                y={height - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {d.time}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Circuit breaker indicators */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>今日涨停限制: +10% ({stock.limitUpPrice.toFixed(2)})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>今日跌停限制: -10% ({stock.limitDownPrice.toFixed(2)})</span>
          </span>
        </div>

        {stock.isLimitUp && (
          <span className="text-rose-400 font-bold bg-rose-950/70 border border-rose-800 px-2 py-0.5 rounded">
            🔴 当前已触及涨停板 (买盘封死)
          </span>
        )}
        {stock.isLimitDown && (
          <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
            🟢 当前已触及跌停板 (卖盘封死)
          </span>
        )}
      </div>
    </div>
  );
};
