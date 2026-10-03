import React, { useState, useMemo } from 'react';
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  ShoppingBag,
  Percent,
} from 'lucide-react';
import { Transaction, formatCurrency, formatNumber } from '../../data/analyticsEngine';
import { HorizontalBarChart } from '../Charts';

interface ProductPageProps {
  transactions: Transaction[];
}

export function ProductPage({ transactions }: ProductPageProps) {
  const [activeView, setActiveView] = useState<'revenue' | 'quantity' | 'profit' | 'lowMargin'>('revenue');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'revenue' | 'profit' | 'units' | 'margin'>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const valid = useMemo(
    () => transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'),
    [transactions]
  );

  const categories = useMemo(() => ['All', ...Array.from(new Set(transactions.map((t) => t.category)))], [transactions]);

  // Aggregate by product
  const products = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: string;
      subCategory: string;
      price: number;
      cost: number;
      revenue: number;
      profit: number;
      units: number;
      orders: Set<string>;
      discountedUnits: number;
    }>();

    for (const t of valid) {
      if (!map.has(t.product_id)) {
        map.set(t.product_id, {
          id: t.product_id,
          name: t.product_name,
          category: t.category,
          subCategory: t.sub_category,
          price: t.unit_price,
          cost: t.unit_cost,
          revenue: 0,
          profit: 0,
          units: 0,
          orders: new Set(),
          discountedUnits: 0,
        });
      }
      const p = map.get(t.product_id)!;
      p.revenue += t.net_revenue;
      p.profit += t.profit;
      p.units += t.quantity;
      p.orders.add(t.order_id);
      if (t.discount_percent > 0) p.discountedUnits += t.quantity;
    }

    return Array.from(map.values()).map((p) => {
      const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      return {
        ...p,
        orderCount: p.orders.size,
        margin,
      };
    });
  }, [valid]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        const factor = sortAsc ? 1 : -1;
        if (sortField === 'revenue') return (a.revenue - b.revenue) * factor;
        if (sortField === 'profit') return (a.profit - b.profit) * factor;
        if (sortField === 'units') return (a.units - b.units) * factor;
        if (sortField === 'margin') return (a.margin - b.margin) * factor;
        return 0;
      });
  }, [products, categoryFilter, searchQuery, sortField, sortAsc]);

  // Rankings for View Modes
  const topByRevenue = useMemo(
    () => [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    [products]
  );
  const topByQuantity = useMemo(
    () => [...products].sort((a, b) => b.units - a.units).slice(0, 8),
    [products]
  );
  const topByProfit = useMemo(
    () => [...products].sort((a, b) => b.profit - a.profit).slice(0, 8),
    [products]
  );
  const lowMarginAlerts = useMemo(
    () => [...products].filter((p) => p.margin < 30).sort((a, b) => a.margin - b.margin).slice(0, 8),
    [products]
  );

  // Category comparison table data
  const categoryStats = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; units: number; skus: Set<string> }>();
    for (const p of products) {
      const cur = map.get(p.category) || { revenue: 0, profit: 0, units: 0, skus: new Set() };
      cur.revenue += p.revenue;
      cur.profit += p.profit;
      cur.units += p.units;
      cur.skus.add(p.id);
      map.set(p.category, cur);
    }

    const totalRev = products.reduce((s, p) => s + p.revenue, 0);

    return Array.from(map.entries())
      .map(([cat, d]) => ({
        category: cat,
        revenue: d.revenue,
        profit: d.profit,
        units: d.units,
        skuCount: d.skus.size,
        margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
        share: totalRev > 0 ? (d.revenue / totalRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [products]);

  const handleSort = (field: 'revenue' | 'profit' | 'units' | 'margin') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Product & Catalog Performance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Product velocity, margin contribution, discount sensitivity, and underperforming SKU diagnostics
        </p>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveView('revenue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeView === 'revenue'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Highest Revenue Products
        </button>
        <button
          onClick={() => setActiveView('quantity')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeView === 'quantity'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Top Selling by Quantity
        </button>
        <button
          onClick={() => setActiveView('profit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeView === 'profit'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Highest Profit Products
        </button>
        <button
          onClick={() => setActiveView('lowMargin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeView === 'lowMargin'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low-Margin / Underperformer Alerts
        </button>
      </div>

      {/* Featured Ranking View */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          {activeView === 'revenue' && 'Top Revenue Champions'}
          {activeView === 'quantity' && 'Top Sales Velocity (Unit Volume)'}
          {activeView === 'profit' && 'Top Gross Profit Generators'}
          {activeView === 'lowMargin' && 'Products with Thin Gross Margins (<30%)'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {activeView === 'revenue' && 'Ranked by total net revenue dollars.'}
          {activeView === 'quantity' && 'Ranked by total unit volume purchased across all baskets.'}
          {activeView === 'profit' && 'Ranked by net dollar profit after subtracting unit production cost.'}
          {activeView === 'lowMargin' && 'Candidates for price increases, bundle re-structuring, or supplier cost renegotiation.'}
        </p>

        {activeView === 'revenue' && (
          <HorizontalBarChart
            items={topByRevenue.map((p) => ({
              id: p.id,
              name: p.name,
              value: p.revenue,
              subValue: `${formatNumber(p.units)} units • ${p.margin.toFixed(1)}% margin`,
              badge: p.category,
            }))}
            barColor="bg-indigo-600"
          />
        )}

        {activeView === 'quantity' && (
          <HorizontalBarChart
            items={topByQuantity.map((p) => ({
              id: p.id,
              name: p.name,
              value: p.units,
              subValue: `${formatCurrency(p.revenue)} sales`,
              badge: p.category,
            }))}
            valueFormatter={(v) => `${formatNumber(v)} units`}
            barColor="bg-blue-600"
          />
        )}

        {activeView === 'profit' && (
          <HorizontalBarChart
            items={topByProfit.map((p) => ({
              id: p.id,
              name: p.name,
              value: p.profit,
              subValue: `${p.margin.toFixed(1)}% margin • ${formatCurrency(p.revenue)} rev`,
              badge: p.category,
            }))}
            barColor="bg-emerald-600"
          />
        )}

        {activeView === 'lowMargin' && (
          <HorizontalBarChart
            items={lowMarginAlerts.map((p) => ({
              id: p.id,
              name: p.name,
              value: p.margin,
              subValue: `${formatCurrency(p.profit)} profit on ${formatCurrency(p.revenue)} sales`,
              badge: p.category,
            }))}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
            barColor="bg-rose-500"
          />
        )}
      </div>

      {/* Category Benchmarking Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          Category Performance Comparison
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Compare revenue contribution, profit margins, active SKUs, and unit velocity across product categories
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Product Category</th>
                <th className="py-2.5 px-3 text-right">Active SKUs</th>
                <th className="py-2.5 px-3 text-right">Total Units</th>
                <th className="py-2.5 px-3 text-right">Net Revenue</th>
                <th className="py-2.5 px-3 text-right">Revenue Share</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
                <th className="py-2.5 px-3 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryStats.map((c) => (
                <tr key={c.category} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{c.category}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{c.skuCount}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatNumber(c.units)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(c.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{c.share.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 font-mono">
                    {formatCurrency(c.profit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      c.margin >= 45 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {c.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Product Catalog Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Product SKU Catalog Directory
            </h2>
            <p className="text-xs text-slate-500">
              Complete unit economics, list prices, wholesale costs, and margins for all {filteredProducts.length} items
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[460px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">SKU ID</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th
                  onClick={() => handleSort('units')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-indigo-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Units</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-indigo-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('profit')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-indigo-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Profit</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('margin')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-indigo-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-mono text-slate-500">{p.id}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 max-w-[240px] truncate" title={p.name}>
                    {p.name}
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">${p.price.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">${p.cost.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-800">{formatNumber(p.units)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-emerald-600 font-mono">
                    {formatCurrency(p.profit)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      p.margin >= 45 ? 'bg-emerald-50 text-emerald-700' : p.margin >= 30 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
