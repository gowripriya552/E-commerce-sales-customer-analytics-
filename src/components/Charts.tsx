import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '../data/analyticsEngine';
import { ForecastPoint } from '../data/forecasting';

// ==========================================
// 1. Dual Line / Area Trend Chart (Revenue & Profit)
// ==========================================
interface TrendPoint {
  label: string;
  revenue: number;
  profit?: number;
  cost?: number;
}

export function TrendAreaChart({
  data,
  height = 280,
  showProfit = true,
}: {
  data: TrendPoint[];
  height?: number;
  showProfit?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No trend data available</div>;
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = 800; // SVG viewBox coordinate width
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.profit || 0))) * 1.15 || 1000;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, data.length - 1)) * plotWidth;
  const getY = (val: number) => padding.top + plotHeight - (val / maxVal) * plotHeight;

  // Build SVG path strings
  const revenuePoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const revenueArea = `${getX(0)},${getY(0)} ${revenuePoints} ${getX(data.length - 1)},${getY(0)}`;

  let profitPoints = '';
  let profitArea = '';
  if (showProfit) {
    profitPoints = data.map((d, i) => `${getX(i)},${getY(d.profit || 0)}`).join(' ');
    profitArea = `${getX(0)},${getY(0)} ${profitPoints} ${getX(data.length - 1)},${getY(0)}`;
  }

  // Y-axis grid ticks
  const ticksCount = 5;
  const yTicks = Array.from({ length: ticksCount + 1 }, (_, i) => Math.round((maxVal / ticksCount) * i));

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible font-sans"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[11px] fill-slate-400"
              >
                ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Revenue Area & Line */}
        <polygon points={revenueArea} fill="url(#revenueGrad)" />
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2.5"
          points={revenuePoints}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Profit Area & Line */}
        {showProfit && (
          <>
            <polygon points={profitArea} fill="url(#profitGrad)" />
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              points={profitPoints}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* X-axis labels (render every 2nd or 3rd label if too many) */}
        {data.map((d, i) => {
          const step = data.length > 15 ? 3 : data.length > 8 ? 2 : 1;
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - 12}
              textAnchor="middle"
              className="text-[11px] fill-slate-500 font-medium"
            >
              {d.label}
            </text>
          );
        })}

        {/* Interactive Hover Vertical Line & Dots */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <g>
            <line
              x1={getX(hoveredIdx)}
              y1={padding.top}
              x2={getX(hoveredIdx)}
              y2={padding.top + plotHeight}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Revenue Circle */}
            <circle
              cx={getX(hoveredIdx)}
              cy={getY(data[hoveredIdx].revenue)}
              r="5"
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Profit Circle */}
            {showProfit && data[hoveredIdx].profit !== undefined && (
              <circle
                cx={getX(hoveredIdx)}
                cy={getY(data[hoveredIdx].profit || 0)}
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
          </g>
        )}

        {/* Invisible hitboxes for hovering */}
        {data.map((_, i) => {
          const colWidth = plotWidth / data.length;
          return (
            <rect
              key={i}
              x={getX(i) - colWidth / 2}
              y={padding.top}
              width={colWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg shadow-xl p-2.5 text-xs border border-slate-700 space-y-1 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${(getY(data[hoveredIdx].revenue) / height) * 100 - 8}%`,
          }}
        >
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
            {data[hoveredIdx].label}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Revenue:
            </span>
            <span className="font-bold">{formatCurrency(data[hoveredIdx].revenue)}</span>
          </div>
          {showProfit && data[hoveredIdx].profit !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Profit:
              </span>
              <span className="font-bold text-emerald-300">
                {formatCurrency(data[hoveredIdx].profit || 0)}
              </span>
            </div>
          )}
          {data[hoveredIdx].profit !== undefined && data[hoveredIdx].revenue > 0 && (
            <div className="text-[10px] text-slate-400 pt-0.5">
              Margin:{' '}
              <span className="text-emerald-400 font-medium">
                {(((data[hoveredIdx].profit || 0) / data[hoveredIdx].revenue) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. Horizontal Bar Chart (Top Products / Top Cities)
// ==========================================
interface BarItem {
  id?: string;
  name: string;
  value: number;
  subValue?: string;
  secondaryValue?: number;
  badge?: string;
}

export function HorizontalBarChart({
  items,
  valueFormatter = formatCurrency,
  barColor = 'bg-indigo-600',
}: {
  items: BarItem[];
  valueFormatter?: (val: number) => string;
  barColor?: string;
}) {
  if (!items || items.length === 0) {
    return <div className="p-4 text-center text-xs text-slate-400">No records found</div>;
  }

  const maxValue = Math.max(...items.map((i) => i.value)) || 1;

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const percent = Math.min(100, Math.max(3, (item.value / maxValue) * 100));

        return (
          <div key={item.id || item.name} className="group">
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 font-mono text-[11px] w-4 shrink-0">
                  {idx + 1}.
                </span>
                <span className="font-medium text-slate-800 truncate" title={item.name}>
                  {item.name}
                </span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-slate-900">{valueFormatter(item.value)}</span>
                {item.subValue && (
                  <span className="text-slate-500 text-[11px] ml-1.5">({item.subValue})</span>
                )}
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 3. Category Donut / Progress Breakdown Chart
// ==========================================
interface CategoryItem {
  category: string;
  revenue: number;
  profit: number;
  quantity: number;
}

export function CategoryBreakdownChart({
  items,
  totalRevenue,
}: {
  items: CategoryItem[];
  totalRevenue: number;
}) {
  const COLORS = [
    'bg-indigo-600 border-indigo-700',
    'bg-emerald-600 border-emerald-700',
    'bg-amber-500 border-amber-600',
    'bg-sky-500 border-sky-600',
    'bg-purple-600 border-purple-700',
  ];

  return (
    <div className="space-y-4">
      {/* Visual Stacked Progress Bar */}
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
        {items.map((cat, i) => {
          const share = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
          return (
            <div
              key={cat.category}
              className={`h-full ${COLORS[i % COLORS.length].split(' ')[0]} transition-all duration-300`}
              style={{ width: `${share}%` }}
              title={`${cat.category}: ${share.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Category List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {items.map((cat, i) => {
          const share = totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : '0';
          const margin = cat.revenue > 0 ? ((cat.profit / cat.revenue) * 100).toFixed(1) : '0';

          return (
            <div
              key={cat.category}
              className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length].split(' ')[0]}`}></span>
                  <span className="text-xs font-bold text-slate-800">{cat.category}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{formatCurrency(cat.revenue)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>{share}% of sales</span>
                <span className="font-medium text-emerald-600">{margin}% margin</span>
                <span>{formatNumber(cat.quantity)} units</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 4. Sales Forecast Chart with 95% Confidence Band
// ==========================================
export function ForecastChart({
  points,
  height = 300,
}: {
  points: ForecastPoint[];
  height?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No forecast data</div>;
  }

  const padding = { top: 25, right: 30, bottom: 45, left: 65 };
  const width = 850;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = points.flatMap((p) => [
    p.actual ?? 0,
    p.forecast ?? 0,
    p.upperBound ?? 0,
  ]);
  const maxVal = Math.max(...allValues) * 1.15 || 5000;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, points.length - 1)) * plotWidth;
  const getY = (val: number) => padding.top + plotHeight - (val / maxVal) * plotHeight;

  // Split historical and forecast
  const histPoints = points.filter((p) => !p.isForecast);
  const fcPoints = points.filter((p) => p.isForecast);

  // Transition point from historical to forecast
  const lastHistIdx = histPoints.length - 1;
  const bridgeForecast = lastHistIdx >= 0
    ? [{ ...histPoints[lastHistIdx], isForecast: true, forecast: histPoints[lastHistIdx].actual, lowerBound: histPoints[lastHistIdx].actual, upperBound: histPoints[lastHistIdx].actual }, ...fcPoints]
    : fcPoints;

  // Historical line
  const histPath = histPoints
    .map((p, i) => `${getX(i)},${getY(p.actual || 0)}`)
    .join(' ');

  // Forecast line
  const fcPath = bridgeForecast
    .map((p) => {
      const idx = points.findIndex((pt) => pt.monthKey === p.monthKey);
      return `${getX(idx)},${getY(p.forecast || 0)}`;
    })
    .join(' ');

  // Confidence Interval Band polygon
  const ciUpper = fcPoints.map((p) => {
    const idx = points.findIndex((pt) => pt.monthKey === p.monthKey);
    return `${getX(idx)},${getY(p.upperBound || 0)}`;
  });
  const ciLower = [...fcPoints].reverse().map((p) => {
    const idx = points.findIndex((pt) => pt.monthKey === p.monthKey);
    return `${getX(idx)},${getY(p.lowerBound || 0)}`;
  });

  const ciPolygon = [...ciUpper, ...ciLower].join(' ');

  // Y-axis grid ticks
  const ticksCount = 5;
  const yTicks = Array.from({ length: ticksCount + 1 }, (_, i) => Math.round((maxVal / ticksCount) * i));

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible font-sans"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="ciBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[11px] fill-slate-400"
              >
                ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Historical vs Forecast Separation Line */}
        {lastHistIdx >= 0 && (
          <g>
            <line
              x1={getX(lastHistIdx)}
              y1={padding.top}
              x2={getX(lastHistIdx)}
              y2={padding.top + plotHeight}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={getX(lastHistIdx) - 8}
              y={padding.top - 8}
              textAnchor="end"
              className="text-[10px] font-bold fill-slate-500 uppercase tracking-wider"
            >
              Historical Actuals
            </text>
            <text
              x={getX(lastHistIdx) + 8}
              y={padding.top - 8}
              textAnchor="start"
              className="text-[10px] font-bold fill-sky-600 uppercase tracking-wider"
            >
              Future Forecast Horizon
            </text>
          </g>
        )}

        {/* 95% Confidence Interval Area */}
        {ciPolygon && <polygon points={ciPolygon} fill="url(#ciBandGrad)" />}

        {/* Historical Line */}
        {histPath && (
          <polyline
            fill="none"
            stroke="#1e293b"
            strokeWidth="2.5"
            points={histPath}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Forecast Line (Dashed Cyan/Blue) */}
        {fcPath && (
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            points={fcPath}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Historical Dots */}
        {histPoints.map((p) => {
          const idx = points.findIndex((pt) => pt.monthKey === p.monthKey);
          return (
            <circle
              key={p.monthKey}
              cx={getX(idx)}
              cy={getY(p.actual || 0)}
              r="3.5"
              fill="#1e293b"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Forecast Dots */}
        {fcPoints.map((p) => {
          const idx = points.findIndex((pt) => pt.monthKey === p.monthKey);
          return (
            <circle
              key={p.monthKey}
              cx={getX(idx)}
              cy={getY(p.forecast || 0)}
              r="4"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}

        {/* X-axis labels */}
        {points.map((p, i) => {
          const step = points.length > 18 ? 3 : points.length > 10 ? 2 : 1;
          if (i % step !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={p.monthKey}
              x={getX(i)}
              y={height - 12}
              textAnchor="middle"
              className={`text-[10px] font-medium ${p.isForecast ? 'fill-sky-700 font-bold' : 'fill-slate-500'}`}
            >
              {p.displayMonth}
            </text>
          );
        })}

        {/* Invisible hitboxes */}
        {points.map((_, i) => {
          const colWidth = plotWidth / points.length;
          return (
            <rect
              key={i}
              x={getX(i) - colWidth / 2}
              y={padding.top}
              width={colWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}
      </svg>

      {/* Forecast Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg shadow-xl p-3 text-xs border border-slate-700 space-y-1 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${(getY(points[hoveredIdx].actual || points[hoveredIdx].forecast || 0) / height) * 100 - 8}%`,
          }}
        >
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
            <span>{points[hoveredIdx].displayMonth}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                points[hoveredIdx].isForecast ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {points[hoveredIdx].isForecast ? 'Forecast' : 'Actual'}
            </span>
          </div>

          {!points[hoveredIdx].isForecast ? (
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-slate-400">Actual Revenue:</span>
              <span className="font-bold text-white">
                {formatCurrency(points[hoveredIdx].actual || 0)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-sky-300 font-medium">Expected Sales:</span>
                <span className="font-bold text-white">
                  {formatCurrency(points[hoveredIdx].forecast || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pt-0.5">
                <span>95% CI Range:</span>
                <span className="font-mono text-slate-300">
                  {formatCurrency(points[hoveredIdx].lowerBound || 0)} –{' '}
                  {formatCurrency(points[hoveredIdx].upperBound || 0)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
