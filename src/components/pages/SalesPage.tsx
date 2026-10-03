import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  MapPin,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  ArrowUpDown,
  ShoppingBag,
  Globe2,
} from 'lucide-react';
import { Transaction, formatCurrency, formatNumber } from '../../data/analyticsEngine';
import { TrendAreaChart } from '../Charts';

interface SalesPageProps {
  transactions: Transaction[];
}

export function SalesPage({ transactions }: SalesPageProps) {
  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'All' | '2024' | '2023' | 'Q4'>('All');
  const [timeGrain, setTimeGrain] = useState<'monthly' | 'daily'>('monthly');
  const [citySearch, setCitySearch] = useState('');

  // Extract unique countries, categories & cities
  const countries = useMemo(
    () => ['All', ...Array.from(new Set(transactions.map((t) => t.country || 'USA'))).sort()],
    [transactions]
  );
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(transactions.map((t) => t.category)))].sort(),
    [transactions]
  );
  const cities = useMemo(() => {
    const list = transactions
      .filter((t) => selectedCountry === 'All' || (t.country || 'USA') === selectedCountry)
      .map((t) => t.city);
    return ['All', ...Array.from(new Set(list))].sort();
  }, [transactions, selectedCountry]);

  // Apply filters
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedCountry !== 'All' && (t.country || 'USA') !== selectedCountry) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (selectedCity !== 'All' && t.city !== selectedCity) return false;

      if (dateFilter === '2024' && !t.order_date.startsWith('2024')) return false;
      if (dateFilter === '2023' && !t.order_date.startsWith('2023')) return false;
      if (dateFilter === 'Q4') {
        const m = parseInt(t.order_date.split('-')[1], 10);
        if (m < 10) return false;
      }
      return true;
    });
  }, [transactions, selectedCountry, selectedCategory, selectedCity, dateFilter]);

  const valid = useMemo(
    () => filtered.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'),
    [filtered]
  );

  // KPI aggregates
  const totalRevenue = valid.reduce((s, t) => s + t.net_revenue, 0);
  const totalProfit = valid.reduce((s, t) => s + t.profit, 0);
  const totalCost = valid.reduce((s, t) => s + t.total_cost, 0);
  const totalUnits = valid.reduce((s, t) => s + t.quantity, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const orderCount = new Set(valid.map((t) => t.order_id)).size;

  // Trend data aggregation
  const trendData = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; cost: number }>();

    for (const t of valid) {
      let key = t.order_date.substring(0, 7); // monthly default '2023-01'
      if (timeGrain === 'daily') {
        key = t.order_date; // '2023-01-15'
      }

      const cur = map.get(key) || { revenue: 0, profit: 0, cost: 0 };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.cost += t.total_cost;
      map.set(key, cur);
    }

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map((k) => {
      let label = k;
      if (timeGrain === 'monthly') {
        const [year, month] = k.split('-');
        label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
      } else {
        const parts = k.split('-');
        label = `${parts[1]}/${parts[2]}`;
      }

      const d = map.get(k)!;
      return {
        label,
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit),
        cost: Math.round(d.cost),
      };
    });
  }, [valid, timeGrain]);

  // Payment Method Analysis
  const paymentStats = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: Set<string>; items: number }>();
    for (const t of valid) {
      const cur = map.get(t.payment_method) || { revenue: 0, orders: new Set(), items: 0 };
      cur.revenue += t.net_revenue;
      cur.orders.add(t.order_id);
      cur.items += t.quantity;
      map.set(t.payment_method, cur);
    }

    return Array.from(map.entries())
      .map(([method, d]) => ({
        method,
        revenue: d.revenue,
        orderCount: d.orders.size,
        aov: d.orders.size > 0 ? d.revenue / d.orders.size : 0,
        share: totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [valid, totalRevenue]);

  // City Performance Breakdown
  const cityStats = useMemo(() => {
    const map = new Map<string, { state: string; country: string; revenue: number; profit: number; orders: Set<string>; units: number }>();
    for (const t of valid) {
      const cur = map.get(t.city) || { state: t.state, country: t.country || 'USA', revenue: 0, profit: 0, orders: new Set(), units: 0 };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.orders.add(t.order_id);
      cur.units += t.quantity;
      map.set(t.city, cur);
    }

    return Array.from(map.entries())
      .map(([city, d]) => ({
        city,
        state: d.state,
        country: d.country,
        revenue: d.revenue,
        profit: d.profit,
        orders: d.orders.size,
        units: d.units,
        margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
        aov: d.orders.size > 0 ? d.revenue / d.orders.size : 0,
      }))
      .filter((c) => c.city.toLowerCase().includes(citySearch.toLowerCase()))
      .sort((a, b) => b.revenue - a.revenue);
  }, [valid, citySearch]);

  return (
    <div className="space-y-6">
      {/* Top Title & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sales & Financial Performance Analysis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyze daily/monthly revenue trajectory, payment methods, regional velocity, and order margins
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedCountry('All');
              setSelectedCategory('All');
              setSelectedCity('All');
              setDateFilter('All');
              setTimeGrain('monthly');
              setCitySearch('');
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Country Dropdown */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedCity('All');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Countries' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Filter */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Time Horizon</label>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['All', '2024', '2023', 'Q4'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDateFilter(preset)}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                    dateFilter === preset
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Product Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Cities' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Time Grain Toggle */}
          <div>
            <label className="block text-slate-500 font-medium mb-1">Chart Granularity</label>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setTimeGrain('monthly')}
                className={`flex-1 py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                  timeGrain === 'monthly'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeGrain('daily')}
                className={`flex-1 py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                  timeGrain === 'daily'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Filtered Net Sales</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{formatNumber(orderCount)} checkouts</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Net Profit</div>
          <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">{formatCurrency(totalProfit)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total Cost: {formatCurrency(totalCost)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Average Profit Margin</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{avgMargin.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across active filter scope</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Units Shipped</div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{formatNumber(totalUnits)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">AOV: {formatCurrency(orderCount > 0 ? totalRevenue / orderCount : 0)}</div>
        </div>
      </div>

      {/* Interactive Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Filtered Sales & Profit Timeline ({timeGrain === 'monthly' ? 'Monthly' : 'Daily'})
            </h2>
            <p className="text-xs text-slate-500">
              Interactive time series tracking financial output for selected criteria
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
              Revenue
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
              Profit
            </span>
          </div>
        </div>

        <TrendAreaChart data={trendData} height={280} showProfit={true} />
      </div>

      {/* Payment Method Analysis & Regional City Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Payment Method Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Channel share, order frequency, and average order value per tender
            </p>

            <div className="space-y-3">
              {paymentStats.map((item) => (
                <div key={item.method} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>{item.method}</span>
                    <span className="text-slate-900">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${item.share}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.share.toFixed(1)}% share</span>
                    <span>{item.orderCount} checkouts</span>
                    <span className="font-semibold text-slate-700">AOV: {formatCurrency(item.aov)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regional City Performance Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Regional City Performance Table
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed financial metrics across active territories
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search city..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[340px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">City & Country</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cityStats.map((c) => (
                    <tr key={`${c.city}-${c.country}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {c.city}, <span className="text-slate-400">{c.country}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-600 font-mono">
                        {formatCurrency(c.profit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          c.margin >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">{c.orders}</td>
                      <td className="py-2 px-3 text-right text-slate-700 font-mono font-medium">
                        {formatCurrency(c.aov)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
