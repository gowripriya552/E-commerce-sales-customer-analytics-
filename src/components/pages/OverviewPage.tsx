import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Percent,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  Globe2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  calculatePeriodComparison,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';
import { TrendAreaChart, HorizontalBarChart, CategoryBreakdownChart } from '../Charts';

interface OverviewPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
  onNavigate: (page: string) => void;
}

export function OverviewPage({ transactions, customers, onNavigate }: OverviewPageProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('All');

  const countries = useMemo(() => {
    return ['All', ...Array.from(new Set(transactions.map((t) => t.country || 'USA'))).sort()];
  }, [transactions]);

  // Filtered by country if selected
  const activeTransactions = useMemo(() => {
    if (selectedCountry === 'All') return transactions;
    return transactions.filter((t) => (t.country || 'USA') === selectedCountry);
  }, [transactions, selectedCountry]);

  const validTrans = activeTransactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped');

  // KPI Calculations
  const totalRevenue = validTrans.reduce((s, t) => s + t.net_revenue, 0);
  const totalProfit = validTrans.reduce((s, t) => s + t.profit, 0);
  const totalCost = validTrans.reduce((s, t) => s + t.total_cost, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const uniqueOrders = new Set(validTrans.map((t) => t.order_id)).size;
  const activeCustomers = useMemo(() => {
    const custIds = new Set(validTrans.map((t) => t.customer_id));
    return customers.filter((c) => custIds.has(c.customer_id));
  }, [validTrans, customers]);

  const totalCustomers = activeCustomers.length || customers.length;
  const avgOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;

  // Period comparison (MoM)
  const periodComp = useMemo(() => calculatePeriodComparison(activeTransactions), [activeTransactions]);

  // Monthly Sales Trend Data
  const monthlyMap = new Map<string, { revenue: number; profit: number }>();
  for (const t of validTrans) {
    const key = t.order_date.substring(0, 7); // '2023-01'
    const cur = monthlyMap.get(key) || { revenue: 0, profit: 0 };
    cur.revenue += t.net_revenue;
    cur.profit += t.profit;
    monthlyMap.set(key, cur);
  }

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return {
        label,
        revenue: Math.round(data.revenue),
        profit: Math.round(data.profit),
      };
    });

  // Sales by Category
  const categoryMap = new Map<string, { revenue: number; profit: number; quantity: number }>();
  for (const t of validTrans) {
    const cur = categoryMap.get(t.category) || { revenue: 0, profit: 0, quantity: 0 };
    cur.revenue += t.net_revenue;
    cur.profit += t.profit;
    cur.quantity += t.quantity;
    categoryMap.set(t.category, cur);
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([category, d]) => ({ category, ...d }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top 10 Products by Revenue
  const productMap = new Map<string, { name: string; revenue: number; units: number; category: string }>();
  for (const t of validTrans) {
    const cur = productMap.get(t.product_id) || {
      name: t.product_name,
      revenue: 0,
      units: 0,
      category: t.category,
    };
    cur.revenue += t.net_revenue;
    cur.units += t.quantity;
    productMap.set(t.product_id, cur);
  }

  const top10Products = Array.from(productMap.entries())
    .map(([id, p]) => ({
      id,
      name: p.name,
      value: p.revenue,
      subValue: `${formatNumber(p.units)} units`,
      badge: p.category,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top 6 Cities by Sales
  const cityMap = new Map<string, { revenue: number; state: string; country: string; orders: number }>();
  for (const t of validTrans) {
    const cur = cityMap.get(t.city) || { revenue: 0, state: t.state, country: t.country || 'USA', orders: 0 };
    cur.revenue += t.net_revenue;
    cur.orders += 1;
    cityMap.set(t.city, cur);
  }
  const topCities = Array.from(cityMap.entries())
    .map(([city, d]) => ({
      name: `${city}, ${d.country}`,
      value: d.revenue,
      subValue: `${d.orders} items`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Customer Segment Summary
  const segmentCounts: { [key: string]: number } = {};
  activeCustomers.forEach((c) => {
    segmentCounts[c.rfm_segment] = (segmentCounts[c.rfm_segment] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Executive Performance Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time aggregate performance, gross margins, customer cohorts, and worldwide sales velocity
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Country Filter Pill */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'Worldwide (All Countries)' : c}
                </option>
              ))}
            </select>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Engine
          </span>
        </div>
      </div>

      {/* KPI Cards Grid with Period Comparisons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Revenue</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1">
            {periodComp.revChangePct >= 0 ? (
              <span className="text-emerald-600 flex items-center font-mono">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{periodComp.revChangePct}% MoM
              </span>
            ) : (
              <span className="text-rose-600 flex items-center font-mono">
                <ArrowDownRight className="w-3.5 h-3.5" /> {periodComp.revChangePct}% MoM
              </span>
            )}
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Profit</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 font-mono">
            {formatCurrency(totalProfit)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1">
            {periodComp.profitChangePct >= 0 ? (
              <span className="text-emerald-600 flex items-center font-mono">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{periodComp.profitChangePct}%
              </span>
            ) : (
              <span className="text-rose-600 flex items-center font-mono">
                <ArrowDownRight className="w-3.5 h-3.5" /> {periodComp.profitChangePct}%
              </span>
            )}
            <span className="text-slate-400 text-[10px]">vs prev</span>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Profit Margin</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cost: {formatCurrency(totalCost)}
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Orders</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {formatNumber(uniqueOrders)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1">
            {periodComp.ordersChangePct >= 0 ? (
              <span className="text-emerald-600 flex items-center font-mono">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{periodComp.ordersChangePct}%
              </span>
            ) : (
              <span className="text-rose-600 flex items-center font-mono">
                <ArrowDownRight className="w-3.5 h-3.5" /> {periodComp.ordersChangePct}%
              </span>
            )}
            <span className="text-slate-400 text-[10px]">MoM</span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Customers</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {formatNumber(totalCustomers)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {((activeCustomers.filter((c) => c.total_orders > 1).length / Math.max(1, totalCustomers)) * 100).toFixed(0)}% repeat rate
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Avg Order Value</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(avgOrderValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Per completed checkout
          </div>
        </div>
      </div>

      {/* Row 2: Sales & Profit Trend (Dual Area) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Monthly Net Revenue & Profit Trajectory {selectedCountry !== 'All' ? `(${selectedCountry})` : '(Global)'}
            </h2>
            <p className="text-xs text-slate-500">
              Historical monthly trends showing seasonal demand peaks and gross profit stability
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
              Net Revenue
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
              Gross Profit
            </span>
          </div>
        </div>

        <TrendAreaChart data={monthlyTrend} height={280} showProfit={true} />
      </div>

      {/* Row 3: Two Columns (Category Breakdown & Customer Segments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Sales by Product Category
              </h2>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Deep Dive <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Category contribution share, revenue volume, and product margin performance
            </p>
            <CategoryBreakdownChart items={categoryData} totalRevenue={totalRevenue} />
          </div>
        </div>

        {/* Customer RFM Segments Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Customer RFM Segments
              </h2>
              <button
                onClick={() => onNavigate('segmentation')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                View RFM Matrix <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Behavioral clusters derived from Recency, Frequency, and Monetary scores
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'Champions / VIP', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                { name: 'Loyal Customers', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                { name: 'Potential Loyal Customers', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                { name: 'New Customers', color: 'bg-sky-50 text-sky-800 border-sky-200' },
                { name: 'At-Risk Customers', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                { name: 'Inactive Customers', color: 'bg-rose-50 text-rose-800 border-rose-200' },
              ].map((seg) => {
                const count = segmentCounts[seg.name] || 0;
                const pct = totalCustomers > 0 ? ((count / totalCustomers) * 100).toFixed(0) : '0';

                return (
                  <div
                    key={seg.name}
                    onClick={() => onNavigate('segmentation')}
                    className={`p-3 rounded-lg border ${seg.color} flex items-center justify-between cursor-pointer hover:shadow-xs transition-shadow`}
                  >
                    <div>
                      <div className="text-xs font-bold leading-tight">{seg.name}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{pct}% of cohort</div>
                    </div>
                    <div className="text-base font-extrabold">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Top 10 Products & Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Products by Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">
              Top 10 Products by Revenue
            </h2>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              All Products <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Ranked by gross sales volume and total units shipped
          </p>
          <HorizontalBarChart items={top10Products} barColor="bg-indigo-600" />
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">
              Top Regional Metropolitan Hubs
            </h2>
            <button
              onClick={() => onNavigate('geo')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              World Map <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Cities generating the highest transaction volume
          </p>
          <HorizontalBarChart items={topCities} barColor="bg-emerald-600" />
        </div>
      </div>
    </div>
  );
}
