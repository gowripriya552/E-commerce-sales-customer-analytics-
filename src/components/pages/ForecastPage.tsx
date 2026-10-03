import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  AlertCircle,
  BarChart2,
  DollarSign,
  ShoppingBag,
  Percent,
  Download,
  Info,
  Sliders,
  Filter,
  Search,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Transaction, formatCurrency, formatNumber } from '../../data/analyticsEngine';

interface ForecastPageProps {
  transactions: Transaction[];
}

export function ForecastPage({ transactions }: ForecastPageProps) {
  // Period selector: 30 Days (Default), 60 Days, 90 Days
  const [forecastDays, setForecastDays] = useState<30 | 60 | 90>(30);
  const [countryFilter, setCountryFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // 11. Data Validation & Compatibility Check
  const validation = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { isValid: false, message: 'No transactions found in the active dataset.' };
    }

    const first = transactions[0];
    const missing: string[] = [];
    if (!('order_date' in first)) missing.push('Order_Date');
    if (!('net_revenue' in first) && !('gross_sales' in first)) missing.push('Net_Revenue / Gross_Sales');

    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required time-series columns: ${missing.join(', ')}. Please verify the dataset contains valid transaction dates and revenue values.`,
      };
    }

    return { isValid: true, message: '' };
  }, [transactions]);

  // Available countries & categories
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.country) set.add(t.country);
    });
    return ['All', ...Array.from(set).sort()];
  }, [transactions]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [transactions]);

  // Filtered transactions based on country & category
  const filteredTransactions = useMemo(() => {
    let list = transactions.filter(
      (t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'
    );

    if (countryFilter !== 'All') {
      list = list.filter((t) => t.country === countryFilter);
    }
    if (categoryFilter !== 'All') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    return list;
  }, [transactions, countryFilter, categoryFilter]);

  // 1. Historical Sales Aggregation (by date)
  const historicalDaily = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; orders: Set<string>; units: number }>();

    for (const t of filteredTransactions) {
      if (!t.order_date || isNaN(new Date(t.order_date).getTime())) continue;

      const dateKey = t.order_date.substring(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, { revenue: 0, profit: 0, orders: new Set(), units: 0 });
      }
      const entry = map.get(dateKey)!;
      entry.revenue += t.net_revenue;
      entry.profit += t.profit;
      entry.orders.add(t.order_id);
      entry.units += t.quantity;
    }

    const sortedDates = Array.from(map.keys()).sort();

    return sortedDates.map((dateStr) => {
      const data = map.get(dateStr)!;
      return {
        date: dateStr,
        revenue: Math.round(data.revenue),
        profit: Math.round(data.profit),
        orders: data.orders.size,
        units: data.units,
      };
    });
  }, [filteredTransactions]);

  // Historical Summary Metrics
  const historicalSummary = useMemo(() => {
    const totalRev = historicalDaily.reduce((s, d) => s + d.revenue, 0);
    const totalProf = historicalDaily.reduce((s, d) => s + d.profit, 0);
    const totalOrders = historicalDaily.reduce((s, d) => s + d.orders, 0);
    const dayCount = historicalDaily.length;
    const avgDailyRev = dayCount > 0 ? totalRev / dayCount : 0;
    const profitMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;

    return {
      totalRevenue: totalRev,
      totalProfit: totalProf,
      totalOrders,
      dayCount,
      avgDailyRevenue: avgDailyRev,
      profitMargin: Number(profitMargin.toFixed(1)),
    };
  }, [historicalDaily]);

  // 3. Time-Series Forecasting Model (Linear Trend Regression with Residual Confidence Bounds)
  const forecastResults = useMemo(() => {
    const n = historicalDaily.length;
    if (n < 5) {
      return {
        isValid: false,
        message: 'Insufficient historical data points (minimum 5 days required).',
        forecastTable: [],
        chartPoints: [],
        forecastRevenue: 0,
        forecastProfit: 0,
        avgDailyForecast: 0,
        growthPct: 0,
        priorComparableRevenue: 0,
      };
    }

    // Linear regression on historical daily sales (y = slope * t + intercept)
    let sumT = 0;
    let sumY = 0;
    let sumTY = 0;
    let sumT2 = 0;

    for (let t = 0; t < n; t++) {
      sumT += t;
      sumY += historicalDaily[t].revenue;
      sumTY += t * historicalDaily[t].revenue;
      sumT2 += t * t;
    }

    const denom = n * sumT2 - sumT * sumT;
    const slope = denom !== 0 ? (n * sumTY - sumT * sumY) / denom : 0;
    const intercept = (sumY - slope * sumT) / n;

    // Calculate residuals and standard error for uncertainty range
    let residualSumSq = 0;
    for (let t = 0; t < n; t++) {
      const fitted = slope * t + intercept;
      const res = historicalDaily[t].revenue - fitted;
      residualSumSq += res * res;
    }
    const stdErr = Math.sqrt(residualSumSq / Math.max(1, n - 2));

    // Historical profit margin ratio to estimate forecast profit
    const marginRatio = historicalSummary.profitMargin / 100;

    // Prior comparable period revenue for growth calculation
    // e.g., if forecasting 30 days, take the last 30 historical days
    const priorWindowDays = Math.min(forecastDays, n);
    const priorHistoricalSubset = historicalDaily.slice(n - priorWindowDays);
    const priorComparableRevenue = priorHistoricalSubset.reduce((s, d) => s + d.revenue, 0);

    // Generate daily forecast points
    const lastDateStr = historicalDaily[n - 1].date;
    const lastDateTime = new Date(lastDateStr).getTime();

    const forecastTable: Array<{
      date: string;
      revenue: number;
      profit: number;
      lowerBound: number;
      upperBound: number;
      uncertaintyMargin: number;
    }> = [];

    let totalForecastRev = 0;
    let totalForecastProf = 0;

    for (let day = 1; day <= forecastDays; day++) {
      const t = n + day - 1;
      const futureTime = lastDateTime + day * 86400000;
      const futureDateStr = new Date(futureTime).toISOString().split('T')[0];

      // Regression projection (floor at 0)
      const baseProjected = Math.max(0, slope * t + intercept);

      // Uncertainty grows as forecast horizon expands
      const horizonUncertaintyMultiplier = 1 + 0.08 * Math.sqrt(day);
      const uncertaintyMargin = Math.round(1.96 * stdErr * horizonUncertaintyMultiplier);

      const projectedRev = Math.round(baseProjected);
      const lower = Math.max(0, projectedRev - uncertaintyMargin);
      const upper = projectedRev + uncertaintyMargin;
      const projectedProf = Math.round(projectedRev * marginRatio);

      totalForecastRev += projectedRev;
      totalForecastProf += projectedProf;

      forecastTable.push({
        date: futureDateStr,
        revenue: projectedRev,
        profit: projectedProf,
        lowerBound: lower,
        upperBound: upper,
        uncertaintyMargin,
      });
    }

    const avgDailyForecast = totalForecastRev / forecastDays;
    const growthPct = priorComparableRevenue > 0
      ? ((totalForecastRev - priorComparableRevenue) / priorComparableRevenue) * 100
      : 0;

    // 4. Construct Chart Points (Historical + Forecast)
    // To ensure a readable chart, downsample or aggregate to weekly bins if history is very long
    const isLongHistory = n > 45;
    const chartPoints: Array<{
      label: string;
      date: string;
      actual?: number;
      forecast?: number;
      lowerBound?: number;
      upperBound?: number;
      isForecast: boolean;
    }> = [];

    // Add recent historical window (last 60 days of history for high resolution)
    const historyToShow = isLongHistory ? historicalDaily.slice(n - 60) : historicalDaily;
    historyToShow.forEach((h) => {
      chartPoints.push({
        label: h.date.substring(5), // 'MM-DD'
        date: h.date,
        actual: h.revenue,
        isForecast: false,
      });
    });

    // Add forecast points
    forecastTable.forEach((f) => {
      chartPoints.push({
        label: f.date.substring(5),
        date: f.date,
        forecast: f.revenue,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
        isForecast: true,
      });
    });

    return {
      isValid: true,
      message: '',
      forecastTable,
      chartPoints,
      forecastRevenue: totalForecastRev,
      forecastProfit: totalForecastProf,
      avgDailyForecast,
      growthPct: Number(growthPct.toFixed(1)),
      priorComparableRevenue,
    };
  }, [historicalDaily, forecastDays, historicalSummary]);

  // 7. Dynamic Forecast Insights
  const forecastInsights = useMemo(() => {
    if (!forecastResults.isValid) return [];

    const insights = [];
    const { forecastRevenue, priorComparableRevenue, growthPct, avgDailyForecast, forecastTable } = forecastResults;

    // Insight 1: Projected Volume vs Prior Period
    const direction = growthPct >= 0 ? 'increase' : 'decrease';
    insights.push({
      title: `${forecastDays}-Day Revenue Outlook`,
      text: `Projected ${forecastDays}-day revenue is ${formatCurrency(forecastRevenue)}, representing a ${Math.abs(growthPct)}% ${direction} compared to the previous ${forecastDays}-day baseline (${formatCurrency(priorComparableRevenue)}).`,
      icon: TrendingUp,
      color: growthPct >= 0 ? 'emerald' : 'amber',
    });

    // Insight 2: Daily Sales Run-Rate
    const dailyDiff = avgDailyForecast - historicalSummary.avgDailyRevenue;
    const dailyDirection = dailyDiff >= 0 ? 'above' : 'below';
    insights.push({
      title: 'Projected Daily Run-Rate',
      text: `Forecast models an average daily run-rate of ${formatCurrency(avgDailyForecast)}/day, which is ${formatCurrency(Math.abs(dailyDiff))}/day ${dailyDirection} your overall historical daily average (${formatCurrency(historicalSummary.avgDailyRevenue)}/day).`,
      icon: DollarSign,
      color: 'indigo',
    });

    // Insight 3: Peak Forecasted Period
    if (forecastTable.length > 0) {
      let peak = forecastTable[0];
      for (const f of forecastTable) {
        if (f.revenue > peak.revenue) peak = f;
      }
      insights.push({
        title: 'Peak Forecasted Sales Day',
        text: `Highest forecasted demand occurs on ${peak.date} with an expected ${formatCurrency(peak.revenue)} (range: ${formatCurrency(peak.lowerBound)} – ${formatCurrency(peak.upperBound)}).`,
        icon: Sparkles,
        color: 'sky',
      });
    }

    // Insight 4: Gross Profit Estimate
    insights.push({
      title: 'Estimated Gross Profit',
      text: `Projected gross profit over the ${forecastDays}-day window is ${formatCurrency(forecastResults.forecastProfit)}, grounded on a historical gross profit margin of ${historicalSummary.profitMargin}%.`,
      icon: Percent,
      color: 'emerald',
    });

    return insights;
  }, [forecastResults, forecastDays, historicalSummary]);

  // Filtered Forecast Table by search
  const filteredForecastTable = useMemo(() => {
    if (!forecastResults.isValid) return [];
    return forecastResults.forecastTable.filter((row) => {
      if (!searchTableQuery) return true;
      return row.date.includes(searchTableQuery);
    });
  }, [forecastResults, searchTableQuery]);

  // Export Forecast Table to CSV
  const handleExportCSV = () => {
    if (!forecastResults.isValid) return;

    const headers = [
      'Forecast_Date',
      'Forecast_Revenue',
      'Forecast_Profit',
      'Lower_Bound_95',
      'Upper_Bound_95',
      'Uncertainty_Margin',
    ];

    const rows = forecastResults.forecastTable.map((f) => [
      f.date,
      f.revenue,
      f.profit,
      f.lowerBound,
      f.upperBound,
      f.uncertaintyMargin,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_forecast_${forecastDays}days_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If missing columns or invalid data
  if (!validation.isValid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Sales Forecast
          </h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            Dataset Compatibility Notice
          </div>
          <p className="text-sm leading-relaxed text-amber-800">
            {validation.message}
          </p>
        </div>
      </div>
    );
  }

  // Calculate SVG Dimensions for Historical vs. Forecast Chart
  const svgWidth = 840;
  const svgHeight = 290;
  const pad = { top: 30, right: 35, bottom: 45, left: 65 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  const points = forecastResults.chartPoints;
  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.actual || 0, p.forecast || 0, p.upperBound || 0))
  ) * 1.15 || 5000;

  const getX = (idx: number) => pad.left + (idx / Math.max(1, points.length - 1)) * plotW;
  const getY = (val: number) => pad.top + plotH - (val / maxVal) * plotH;

  const histPoints = points.filter((p) => !p.isForecast);
  const fcPoints = points.filter((p) => p.isForecast);
  const firstFcIdx = points.findIndex((p) => p.isForecast);

  return (
    <div className="space-y-6">
      {/* Page Title & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              Sales Forecast
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Statistical Modeler
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Predictive time-series modeling projecting future daily sales trajectories based on verified historical sales
          </p>
        </div>

        {/* Forecast Period Selector & Filters */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* 2. Forecast Period Selector: 30 Days (Default), 60 Days, 90 Days */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
            {([30, 60, 90] as const).map((period) => (
              <button
                key={period}
                onClick={() => setForecastDays(period)}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer text-xs ${
                  forecastDays === period
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period} Days {period === 30 && '(Default)'}
              </button>
            ))}
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableCountries.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Forecast (CSV)</span>
          </button>
        </div>
      </div>

      {/* 5. Forecast & Historical KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Forecast Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Forecast Revenue</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">
            {formatCurrency(forecastResults.forecastRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Next {forecastDays} Days Expected
          </div>
        </div>

        {/* Avg Daily Forecast Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Daily Forecast Run-Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(forecastResults.avgDailyForecast)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Average revenue / day</div>
        </div>

        {/* Forecast Growth % */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Forecast Growth %</span>
            {forecastResults.growthPct >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              forecastResults.growthPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {forecastResults.growthPct >= 0 ? `+${forecastResults.growthPct}%` : `${forecastResults.growthPct}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">vs prior {forecastDays} days</div>
        </div>

        {/* Historical Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Historical Revenue</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(historicalSummary.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total observed revenue</div>
        </div>

        {/* Historical Profit */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Historical Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {formatCurrency(historicalSummary.totalProfit)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {historicalSummary.profitMargin}% gross margin
          </div>
        </div>

        {/* Historical Orders */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Historical Orders</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatNumber(historicalSummary.totalOrders)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {historicalSummary.dayCount} dates</div>
        </div>
      </div>

      {/* 4. Historical vs. Forecast Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Historical Sales vs. {forecastDays}-Day Forecasted Demand</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified historical sales trend compared with forward-looking linear regression projection and 95% uncertainty interval
            </p>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-800 font-medium">
              <span className="w-3 h-1.5 rounded-xs bg-slate-900" />
              Historical Sales (Verified)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <span className="w-3 h-1.5 rounded-xs bg-indigo-600" />
              Forecast / Estimated ({forecastDays} Days)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <span className="w-3 h-2 rounded-xs bg-indigo-100 border border-indigo-300" />
              95% Uncertainty Range
            </span>
          </div>
        </div>

        {/* SVG Chart Canvas */}
        <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200 p-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none font-sans overflow-visible"
            onMouseLeave={() => setHoveredPointIdx(null)}
          >
            <defs>
              <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid Ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const val = Math.round(maxVal * ratio);
              const y = getY(val);
              return (
                <g key={ratio}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={svgWidth - pad.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Dividing Line separating Historical from Forecast */}
            {firstFcIdx > 0 && (
              <g>
                <line
                  x1={getX(firstFcIdx)}
                  y1={pad.top}
                  x2={getX(firstFcIdx)}
                  y2={pad.top + plotH}
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                {/* Foreground Badges */}
                <rect
                  x={getX(firstFcIdx) - 55}
                  y={pad.top + 4}
                  width="110"
                  height="18"
                  rx="4"
                  fill="#4338ca"
                />
                <text
                  x={getX(firstFcIdx)}
                  y={pad.top + 16}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-white uppercase tracking-wider"
                >
                  Forecast / Estimated →
                </text>
              </g>
            )}

            {/* 95% Confidence Interval Shaded Polygon for Forecast */}
            {fcPoints.length > 0 && (
              (() => {
                const upperPoints = fcPoints.map((p) => {
                  const idx = points.findIndex((pt) => pt.date === p.date);
                  return `${getX(idx)},${getY(p.upperBound || 0)}`;
                });
                const lowerPoints = [...fcPoints].reverse().map((p) => {
                  const idx = points.findIndex((pt) => pt.date === p.date);
                  return `${getX(idx)},${getY(p.lowerBound || 0)}`;
                });
                const polygonStr = [...upperPoints, ...lowerPoints].join(' ');

                return <polygon points={polygonStr} fill="url(#forecastAreaGrad)" />;
              })()
            )}

            {/* Historical Actuals Polyline */}
            {histPoints.length > 0 && (
              <polyline
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
                points={histPoints
                  .map((p) => {
                    const idx = points.findIndex((pt) => pt.date === p.date);
                    return `${getX(idx)},${getY(p.actual || 0)}`;
                  })
                  .join(' ')}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Forecast Projected Polyline (Dashed Sky/Indigo) */}
            {fcPoints.length > 0 && (
              (() => {
                // Bridge from last historical point to first forecast point
                const lastHist = histPoints[histPoints.length - 1];
                const linePoints = lastHist
                  ? [{ ...lastHist, isForecast: true, forecast: lastHist.actual }, ...fcPoints]
                  : fcPoints;

                return (
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    points={linePoints
                      .map((p) => {
                        const idx = points.findIndex((pt) => pt.date === p.date);
                        return `${getX(idx)},${getY(p.forecast || 0)}`;
                      })
                      .join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })()
            )}

            {/* Interactive Nodes & Tooltip Hitboxes */}
            {points.map((p, idx) => {
              const cx = getX(idx);
              const val = p.isForecast ? p.forecast || 0 : p.actual || 0;
              const cy = getY(val);
              const isHovered = hoveredPointIdx === idx;

              return (
                <g key={idx}>
                  {isHovered && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      fill={p.isForecast ? '#6366f1' : '#0f172a'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}

                  {/* Invisible Hitbox */}
                  <rect
                    x={cx - plotW / (points.length * 2)}
                    y={pad.top}
                    width={plotW / points.length}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                  />
                </g>
              );
            })}

            {/* X-axis Date Labels */}
            {points.map((p, idx) => {
              const step = Math.max(1, Math.floor(points.length / 8));
              if (idx % step !== 0 && idx !== points.length - 1 && idx !== firstFcIdx) return null;

              return (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] ${
                    p.isForecast ? 'fill-indigo-600 font-bold' : 'fill-slate-500 font-medium'
                  }`}
                >
                  {p.label}
                </text>
              );
            })}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPointIdx !== null && points[hoveredPointIdx] && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl flex items-center gap-4 pointer-events-none z-10 border border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  {points[hoveredPointIdx].isForecast ? 'Forecast / Estimated' : 'Historical Actual'}
                </span>
                <span className="font-bold text-slate-200">{points[hoveredPointIdx].date}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-[10px] text-slate-400 block uppercase">Revenue</span>
                <span className="font-bold font-mono text-indigo-400">
                  {formatCurrency(
                    points[hoveredPointIdx].isForecast
                      ? points[hoveredPointIdx].forecast || 0
                      : points[hoveredPointIdx].actual || 0
                  )}
                </span>
              </div>
              {points[hoveredPointIdx].isForecast && (
                <div className="border-l border-slate-700 pl-3 text-[10px] font-mono text-slate-300">
                  <div>Lower: {formatCurrency(points[hoveredPointIdx].lowerBound || 0)}</div>
                  <div>Upper: {formatCurrency(points[hoveredPointIdx].upperBound || 0)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7. Forecast Insights */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Factual Forecast Insights (Derived Mathematically from Timeline)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {forecastInsights.map((ins, idx) => {
            const Icon = ins.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-700 text-indigo-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-200">{ins.title}</h3>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{ins.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Forecast Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {forecastDays}-Day Forward Projections Table
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily revenue, expected gross profit, and empirical 95% confidence intervals
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search forecast date (YYYY-MM-DD)..."
              value={searchTableQuery}
              onChange={(e) => setSearchTableQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[460px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Forecast Date</th>
                <th className="py-2.5 px-3 text-right">Conservative Lower Bound (95%)</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-700">Forecast Revenue</th>
                <th className="py-2.5 px-3 text-right">Optimistic Upper Bound (95%)</th>
                <th className="py-2.5 px-3 text-right">Estimated Gross Profit</th>
                <th className="py-2.5 px-3 text-center">Uncertainty Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredForecastTable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No forecast rows matching search query.
                  </td>
                </tr>
              ) : (
                filteredForecastTable.map((row, idx) => (
                  <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">
                      {row.date}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500 font-medium">
                      {formatCurrency(row.lowerBound)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-700">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 font-medium">
                      {formatCurrency(row.upperBound)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          idx < 15
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : idx < 45
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        ±{formatCurrency(row.uncertaintyMargin)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
          * Note: The Lower and Upper bounds represent the estimated 95% uncertainty interval. As the forecast horizon extends further into the future, the prediction interval widens to account for real-world variance.
        </div>
      </div>

      {/* 8. Mandatory Forecast Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="block text-amber-950 font-bold mb-0.5">Forecast Disclaimer:</strong>
          Forecasts are estimates based on historical data and should not be treated as guaranteed future results.
        </div>
      </div>
    </div>
  );
}
