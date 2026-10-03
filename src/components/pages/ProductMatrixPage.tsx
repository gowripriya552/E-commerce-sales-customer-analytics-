import React, { useState, useMemo } from 'react';
import {
  Grid,
  TrendingUp,
  Award,
  AlertTriangle,
  Sparkles,
  ArrowDownRight,
  Filter,
  Search,
  Percent,
  DollarSign,
  Package,
  ShoppingBag,
  ArrowUpDown,
  Download,
  Eye,
  X,
  Calendar,
  Layers,
  BarChart3,
  Flame,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { Transaction, formatCurrency, formatNumber } from '../../data/analyticsEngine';

interface ProductPerformancePageProps {
  transactions: Transaction[];
}

export function ProductMatrixPage({ transactions }: ProductPerformancePageProps) {
  // Filters
  const [selectedQuadrant, setSelectedQuadrant] = useState<
    'All' | 'Strong Performers' | 'High Sales / Low Profit' | 'Low Sales / High Profit' | 'Low Performers'
  >('All');
  const [timeframe, setTimeframe] = useState<'all' | '2024' | '2023' | 'last12m'>('all');
  const [countryFilter, setCountryFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'margin' | 'units' | 'orders' | 'name'>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [topRankingsTab, setTopRankingsTab] = useState<'revenue' | 'profit' | 'units'>('revenue');
  const [selectedProductDrillDown, setSelectedProductDrillDown] = useState<any | null>(null);

  // 10. Defensive Column & Dataset Compatibility Check
  const compatibilityCheck = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { isValid: false, message: 'No transactions found in the active dataset.' };
    }

    const first = transactions[0];
    const missing: string[] = [];
    if (!('product_id' in first)) missing.push('Product_ID');
    if (!('product_name' in first) && !('product' in first)) missing.push('Product / Product_Name');
    if (!('category' in first)) missing.push('Category');
    if (!('net_revenue' in first) && !('gross_sales' in first)) missing.push('Revenue / Sales');
    if (!('profit' in first) && !('unit_cost' in first)) missing.push('Profit / Cost');
    if (!('quantity' in first)) missing.push('Quantity');

    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required product columns: ${missing.join(', ')}. Please verify the dataset contains valid product, sales, and profit information.`,
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

  // Filter transactions based on date preset & country
  const filteredTransactions = useMemo(() => {
    let list = transactions.filter(
      (t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'
    );

    if (countryFilter !== 'All') {
      list = list.filter((t) => t.country === countryFilter);
    }

    if (timeframe === '2024') {
      list = list.filter((t) => t.order_date.startsWith('2024'));
    } else if (timeframe === '2023') {
      list = list.filter((t) => t.order_date.startsWith('2023'));
    } else if (timeframe === 'last12m') {
      let maxDate = '';
      list.forEach((t) => {
        if (!maxDate || t.order_date > maxDate) maxDate = t.order_date;
      });
      if (maxDate) {
        const d = new Date(maxDate);
        d.setFullYear(d.getFullYear() - 1);
        const cutoff = d.toISOString().split('T')[0];
        list = list.filter((t) => t.order_date >= cutoff);
      }
    }

    return list;
  }, [transactions, countryFilter, timeframe]);

  // Aggregate Product Performance Records
  const products = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: string;
      subCategory: string;
      revenue: number;
      profit: number;
      cost: number;
      units: number;
      orders: Set<string>;
      firstDate: string;
      lastDate: string;
    }>();

    for (const t of filteredTransactions) {
      if (!map.has(t.product_id)) {
        map.set(t.product_id, {
          id: t.product_id,
          name: t.product_name,
          category: t.category,
          subCategory: t.sub_category || t.category,
          revenue: 0,
          profit: 0,
          cost: 0,
          units: 0,
          orders: new Set(),
          firstDate: t.order_date,
          lastDate: t.order_date,
        });
      }
      const cur = map.get(t.product_id)!;
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.cost += t.total_cost;
      cur.units += t.quantity;
      cur.orders.add(t.order_id);
      if (t.order_date < cur.firstDate) cur.firstDate = t.order_date;
      if (t.order_date > cur.lastDate) cur.lastDate = t.order_date;
    }

    return Array.from(map.values()).map((p) => {
      const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      const orderCount = p.orders.size;
      const avgPrice = p.units > 0 ? p.revenue / p.units : 0;
      const avgCost = p.units > 0 ? p.cost / p.units : 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        subCategory: p.subCategory,
        revenue: Number(p.revenue.toFixed(2)),
        profit: Number(p.profit.toFixed(2)),
        cost: Number(p.cost.toFixed(2)),
        units: p.units,
        orderCount,
        margin: Number(margin.toFixed(1)),
        avgPrice: Number(avgPrice.toFixed(2)),
        avgCost: Number(avgCost.toFixed(2)),
        firstDate: p.firstDate,
        lastDate: p.lastDate,
      };
    });
  }, [filteredTransactions]);

  // Dynamic Median Thresholds for Revenue and Profit
  const medianRevenue = useMemo(() => {
    if (products.length === 0) return 0;
    const sorted = [...products].map((p) => p.revenue).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }, [products]);

  const medianProfit = useMemo(() => {
    if (products.length === 0) return 0;
    const sorted = [...products].map((p) => p.profit).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }, [products]);

  // Section 2: Dynamically Classify Products into the 4 Quadrants
  const classifiedProducts = useMemo(() => {
    return products.map((p) => {
      let quadrant: 'Strong Performers' | 'High Sales / Low Profit' | 'Low Sales / High Profit' | 'Low Performers' = 'Low Performers';

      if (p.revenue >= medianRevenue && p.profit >= medianProfit) {
        quadrant = 'Strong Performers';
      } else if (p.revenue >= medianRevenue && p.profit < medianProfit) {
        quadrant = 'High Sales / Low Profit';
      } else if (p.revenue < medianRevenue && p.profit >= medianProfit) {
        quadrant = 'Low Sales / High Profit';
      } else {
        quadrant = 'Low Performers';
      }

      return {
        ...p,
        quadrant,
      };
    });
  }, [products, medianRevenue, medianProfit]);

  // Section 1: Product Performance KPIs
  const kpis = useMemo(() => {
    const totalCount = classifiedProducts.length;
    const totalRev = classifiedProducts.reduce((s, p) => s + p.revenue, 0);
    const totalProf = classifiedProducts.reduce((s, p) => s + p.profit, 0);
    const avgRev = totalCount > 0 ? totalRev / totalCount : 0;
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;

    let bestRev = classifiedProducts[0] || null;
    let bestProf = classifiedProducts[0] || null;

    for (const p of classifiedProducts) {
      if (!bestRev || p.revenue > bestRev.revenue) bestRev = p;
      if (!bestProf || p.profit > bestProf.profit) bestProf = p;
    }

    return {
      totalProducts: totalCount,
      totalRevenue: totalRev,
      totalProfit: totalProf,
      avgProductRevenue: avgRev,
      avgProfitMargin: avgMargin.toFixed(1),
      bestRevenueProduct: bestRev,
      bestProfitProduct: bestProf,
    };
  }, [classifiedProducts]);

  // Quadrant Breakdown Counts
  const strongPerformers = useMemo(() => classifiedProducts.filter((p) => p.quadrant === 'Strong Performers'), [classifiedProducts]);
  const highSalesLowProfit = useMemo(() => classifiedProducts.filter((p) => p.quadrant === 'High Sales / Low Profit'), [classifiedProducts]);
  const lowSalesHighProfit = useMemo(() => classifiedProducts.filter((p) => p.quadrant === 'Low Sales / High Profit'), [classifiedProducts]);
  const lowPerformers = useMemo(() => classifiedProducts.filter((p) => p.quadrant === 'Low Performers'), [classifiedProducts]);

  // Section 4: Top 10 Rankings
  const top10Revenue = useMemo(() => [...classifiedProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [classifiedProducts]);
  const top10Profit = useMemo(() => [...classifiedProducts].sort((a, b) => b.profit - a.profit).slice(0, 10), [classifiedProducts]);
  const top10Quantity = useMemo(() => [...classifiedProducts].sort((a, b) => b.units - a.units).slice(0, 10), [classifiedProducts]);

  // Section 5: Low Performing Products Identification
  const lowPerformingProducts = useMemo(() => {
    return classifiedProducts
      .filter((p) => p.quadrant === 'Low Performers' || p.margin < 15 || p.profit < 0)
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 6)
      .map((p) => {
        let reason = '';
        if (p.profit < 0) {
          reason = `Negative gross profit: Cost (${formatCurrency(p.cost)}) exceeds sales (${formatCurrency(p.revenue)}), generating a net loss of ${formatCurrency(Math.abs(p.profit))}.`;
        } else if (p.margin < 15) {
          reason = `Thin profit margin of only ${p.margin}% with ${p.units} units sold. Vulnerable to discounting and promotional overhead.`;
        } else if (p.revenue < medianRevenue && p.profit < medianProfit) {
          reason = `Below median sales volume (${formatCurrency(p.revenue)}) and below median profit (${formatCurrency(p.profit)}). Low buyer demand.`;
        } else {
          reason = `Sluggish inventory turnaround with only ${p.orderCount} orders recorded in the active period.`;
        }

        return { ...p, reason };
      });
  }, [classifiedProducts, medianRevenue, medianProfit]);

  // Section 6: Category-Level Product Analysis
  const categoryAnalysis = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; products: Set<string>; units: number }>();

    for (const p of classifiedProducts) {
      if (!map.has(p.category)) {
        map.set(p.category, { revenue: 0, profit: 0, products: new Set(), units: 0 });
      }
      const cur = map.get(p.category)!;
      cur.revenue += p.revenue;
      cur.profit += p.profit;
      cur.units += p.units;
      cur.products.add(p.id);
    }

    return Array.from(map.entries())
      .map(([cat, data]) => {
        const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        return {
          category: cat,
          revenue: data.revenue,
          profit: data.profit,
          units: data.units,
          productCount: data.products.size,
          margin: Number(margin.toFixed(1)),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [classifiedProducts]);

  // Section 7: Profit Margin Extremes (Highest and Lowest)
  const marginAnalysis = useMemo(() => {
    const sorted = [...classifiedProducts].filter((p) => p.revenue > 0).sort((a, b) => b.margin - a.margin);
    return {
      highest: sorted.slice(0, 5),
      lowest: [...sorted].reverse().slice(0, 5),
    };
  }, [classifiedProducts]);

  // Section 3: Filtered & Sorted Product Table
  const filteredProducts = useMemo(() => {
    let list = classifiedProducts.filter((p) => {
      if (selectedQuadrant !== 'All' && p.quadrant !== selectedQuadrant) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'revenue') diff = a.revenue - b.revenue;
      else if (sortBy === 'profit') diff = a.profit - b.profit;
      else if (sortBy === 'margin') diff = a.margin - b.margin;
      else if (sortBy === 'units') diff = a.units - b.units;
      else if (sortBy === 'orders') diff = a.orderCount - b.orderCount;
      else if (sortBy === 'name') diff = a.name.localeCompare(b.name);

      return sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [classifiedProducts, selectedQuadrant, categoryFilter, searchQuery, sortBy, sortDirection]);

  // Export Product Table to CSV
  const handleExportCSV = () => {
    const headers = [
      'Product_ID',
      'Product_Name',
      'Category',
      'Sub_Category',
      'Total_Quantity_Sold',
      'Revenue',
      'Cost',
      'Profit',
      'Profit_Margin_Pct',
      'Number_Of_Orders',
      'Performance_Quadrant',
    ];

    const rows = filteredProducts.map((p) => [
      p.id,
      `"${p.name}"`,
      `"${p.category}"`,
      `"${p.subCategory}"`,
      p.units,
      p.revenue,
      p.cost,
      p.profit,
      p.margin,
      p.orderCount,
      `"${p.quadrant}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `product_performance_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If missing columns or incompatible dataset
  if (!compatibilityCheck.isValid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Grid className="w-6 h-6 text-indigo-600" />
            Product Performance
          </h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            Dataset Compatibility Alert
          </div>
          <p className="text-sm leading-relaxed text-amber-800">
            {compatibilityCheck.message}
          </p>
          <div className="text-xs text-amber-700 bg-amber-100/60 p-3 rounded-lg border border-amber-300 font-mono">
            Expected columns: Product_ID, Product_Name, Category, Quantity, Net_Revenue, Profit (or Unit_Price & Unit_Cost)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Global Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Grid className="w-6 h-6 text-indigo-600" />
              Product Performance
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Revenue vs. Profit Matrix
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Four-quadrant SKU portfolio rationalization, profit margin rankings, category performance, and unit economics
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Timeframe Preset */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
            {(['all', '2024', '2023', 'last12m'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  timeframe === t
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Time' : t === '2024' ? '2024' : t === '2023' ? '2023' : 'Last 12M'}
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
                <option key={c} value={c}>
                  {c === 'All' ? 'Worldwide (All)' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Matrix CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Product Performance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Products */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Products</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatNumber(kpis.totalProducts)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active catalog SKUs</div>
        </div>

        {/* Total Product Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(kpis.totalRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gross net volume</div>
        </div>

        {/* Total Product Profit */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(kpis.totalProfit)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Net gross profit</div>
        </div>

        {/* Average Product Revenue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Avg Product Rev</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(kpis.avgProductRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Revenue per SKU</div>
        </div>

        {/* Average Profit Margin */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Avg Profit Margin</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">{kpis.avgProfitMargin}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Profit / Revenue × 100</div>
        </div>

        {/* Best Revenue Product */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Best Revenue</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={kpis.bestRevenueProduct?.name}>
            {kpis.bestRevenueProduct?.name || 'N/A'}
          </div>
          <div className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
            {formatCurrency(kpis.bestRevenueProduct?.revenue || 0)}
          </div>
        </div>

        {/* Best Profit Product */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Best Profit</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={kpis.bestProfitProduct?.name}>
            {kpis.bestProfitProduct?.name || 'N/A'}
          </div>
          <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
            {formatCurrency(kpis.bestProfitProduct?.profit || 0)}
          </div>
        </div>
      </div>

      {/* 2. Quadrants Overview & Interactive Scatter Plot Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quadrant 1: Strong Performers */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'Strong Performers' ? 'All' : 'Strong Performers')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedQuadrant === 'Strong Performers'
              ? 'ring-2 ring-emerald-600 bg-white border-emerald-500'
              : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Strong Performers</span>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
              {strongPerformers.length} SKUs
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-900 mb-1">
            High Revenue + High Profit
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Commercial powerhouses. Maintain top inventory priority, optimize supply chain, and avoid steep discount erosion.
          </p>
        </div>

        {/* Quadrant 2: High Sales / Low Profit */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'High Sales / Low Profit' ? 'All' : 'High Sales / Low Profit')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedQuadrant === 'High Sales / Low Profit'
              ? 'ring-2 ring-amber-600 bg-white border-amber-500'
              : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>High Sales / Low Profit</span>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
              {highSalesLowProfit.length} SKUs
            </span>
          </div>
          <div className="text-[11px] font-semibold text-amber-900 mb-1">
            High Revenue + Low Profit
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            High volume but thin margins. Re-negotiate supplier cost, bundle with high-margin items, or pare back coupons.
          </p>
        </div>

        {/* Quadrant 3: Low Sales / High Profit */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'Low Sales / High Profit' ? 'All' : 'Low Sales / High Profit')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedQuadrant === 'Low Sales / High Profit'
              ? 'ring-2 ring-blue-600 bg-white border-blue-500'
              : 'bg-blue-50/60 border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Low Sales / High Profit</span>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full border border-blue-300">
              {lowSalesHighProfit.length} SKUs
            </span>
          </div>
          <div className="text-[11px] font-semibold text-blue-900 mb-1">
            Low Revenue + High Profit
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            High margin potential. Increase marketing exposure, feature on search hero banners, and drive customer awareness.
          </p>
        </div>

        {/* Quadrant 4: Low Performers */}
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'Low Performers' ? 'All' : 'Low Performers')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedQuadrant === 'Low Performers'
              ? 'ring-2 ring-slate-600 bg-white border-slate-500'
              : 'bg-slate-100/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
              <ArrowDownRight className="w-4 h-4 text-slate-600" />
              <span>Low Performers</span>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full border border-slate-300">
              {lowPerformers.length} SKUs
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-800 mb-1">
            Low Revenue + Low Profit
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Sluggish inventory. Review demand, run promotional liquidations, or phase out in favor of faster-turning catalog lines.
          </p>
        </div>
      </div>

      {/* Interactive Revenue vs. Profit Scatter Plot */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Revenue vs. Profit Matrix (Interactive Scatter Plot)
            </h2>
            <p className="text-xs text-slate-500">
              Quadrant lines positioned at Median Revenue ({formatCurrency(medianRevenue)}) and Median Profit ({formatCurrency(medianProfit)})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Strong Performers
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High Sales / Low Profit
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Low Sales / High Profit
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Low Performers
            </span>
          </div>
        </div>

        {/* SVG Scatter Plot */}
        <div className="relative w-full overflow-hidden bg-slate-50/60 rounded-xl border border-slate-200 p-2">
          {(() => {
            const maxRev = Math.max(...products.map((p) => p.revenue)) * 1.1 || 10000;
            const maxProf = Math.max(...products.map((p) => p.profit)) * 1.1 || 5000;

            const w = 840;
            const h = 340;
            const pad = { top: 25, right: 30, bottom: 45, left: 65 };
            const plotW = w - pad.left - pad.right;
            const plotH = h - pad.top - pad.bottom;

            const getX = (val: number) => pad.left + (val / maxRev) * plotW;
            const getY = (val: number) => pad.top + plotH - (val / maxProf) * plotH;

            const medX = getX(medianRevenue);
            const medY = getY(medianProfit);

            return (
              <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto select-none font-sans">
                {/* Quadrant Background Tints */}
                <rect x={medX} y={pad.top} width={w - pad.right - medX} height={medY - pad.top} fill="#10b981" fillOpacity="0.04" />
                <rect x={medX} y={medY} width={w - pad.right - medX} height={pad.top + plotH - medY} fill="#f59e0b" fillOpacity="0.04" />
                <rect x={pad.left} y={pad.top} width={medX - pad.left} height={medY - pad.top} fill="#0284c7" fillOpacity="0.04" />
                <rect x={pad.left} y={medY} width={medX - pad.left} height={pad.top + plotH - medY} fill="#64748b" fillOpacity="0.04" />

                {/* Median Crosshair Lines */}
                <line x1={medX} y1={pad.top} x2={medX} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1={pad.left} y1={medY} x2={w - pad.right} y2={medY} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* Quadrant Labels */}
                <text x={w - pad.right - 10} y={pad.top + 18} textAnchor="end" className="text-[11px] font-bold fill-emerald-700/80 uppercase">
                  Strong Performers (High Rev / High Profit)
                </text>
                <text x={w - pad.right - 10} y={pad.top + plotH - 12} textAnchor="end" className="text-[11px] font-bold fill-amber-700/80 uppercase">
                  High Sales / Low Profit
                </text>
                <text x={pad.left + 15} y={pad.top + 18} textAnchor="start" className="text-[11px] font-bold fill-blue-700/80 uppercase">
                  Low Sales / High Profit
                </text>
                <text x={pad.left + 15} y={pad.top + plotH - 12} textAnchor="start" className="text-[11px] font-bold fill-slate-500/80 uppercase">
                  Low Performers
                </text>

                {/* Dots for Each Product */}
                {classifiedProducts.map((p) => {
                  const cx = getX(p.revenue);
                  const cy = getY(p.profit);
                  const color =
                    p.quadrant === 'Strong Performers'
                      ? '#10b981'
                      : p.quadrant === 'High Sales / Low Profit'
                      ? '#f59e0b'
                      : p.quadrant === 'Low Sales / High Profit'
                      ? '#0284c7'
                      : '#64748b';

                  return (
                    <g
                      key={p.id}
                      onClick={() => setSelectedProductDrillDown(p)}
                      className="cursor-pointer group"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        opacity="0.85"
                        className="hover:scale-125 transition-transform"
                      />
                      <title>{`${p.name} (${p.category})\nRevenue: ${formatCurrency(p.revenue)}\nProfit: ${formatCurrency(p.profit)}\nMargin: ${p.margin}%\nUnits: ${formatNumber(p.units)}\nClick to view full drill-down`}</title>
                    </g>
                  );
                })}

                {/* Axis Labels */}
                <text x={w / 2} y={h - 10} textAnchor="middle" className="text-[11px] font-bold fill-slate-500 uppercase tracking-wider">
                  Total Revenue ($) →
                </text>
                <text
                  x={18}
                  y={h / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 18,${h / 2})`}
                  className="text-[11px] font-bold fill-slate-500 uppercase tracking-wider"
                >
                  Total Profit ($) →
                </text>
              </svg>
            );
          })()}
        </div>
      </div>

      {/* 4. Top Products Rankings (Separate Rankings) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              Top 10 Product Leaderboards
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rankings generated dynamically across Revenue, Profit, and Quantity Sold
            </p>
          </div>

          {/* Ranking Tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTopRankingsTab('revenue')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                topRankingsTab === 'revenue'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Top 10 by Revenue
            </button>
            <button
              onClick={() => setTopRankingsTab('profit')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                topRankingsTab === 'profit'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Top 10 by Profit
            </button>
            <button
              onClick={() => setTopRankingsTab('units')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                topRankingsTab === 'units'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Top 10 by Quantity Sold
            </button>
          </div>
        </div>

        {/* Selected Leaderboard List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(topRankingsTab === 'revenue'
            ? top10Revenue
            : topRankingsTab === 'profit'
            ? top10Profit
            : top10Quantity
          ).map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setSelectedProductDrillDown(item)}
              className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                    idx < 3 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <div>
                  <div className="font-semibold text-xs text-slate-900 truncate max-w-[220px]" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.category} • {item.id}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-xs font-mono text-slate-900">
                  {topRankingsTab === 'revenue'
                    ? formatCurrency(item.revenue)
                    : topRankingsTab === 'profit'
                    ? formatCurrency(item.profit)
                    : `${formatNumber(item.units)} units`}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {topRankingsTab === 'revenue'
                    ? `${item.margin}% margin`
                    : topRankingsTab === 'profit'
                    ? `${formatCurrency(item.revenue)} sales`
                    : `${formatCurrency(item.revenue)} rev`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Low Performing Products Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Low-Performing Products (Action Items)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies SKUs with sluggish sales, razor-thin or negative profit margins, and inventory drain
            </p>
          </div>
          <span className="text-[10px] text-slate-400">Calculated Diagnostics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lowPerformingProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProductDrillDown(p)}
              className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px]" title={p.name}>
                    {p.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{p.id} • {p.category}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                  {p.margin}% margin
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-white rounded-lg border border-rose-100 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Sales</span>
                  <span className="font-bold font-mono text-slate-800 text-[11px]">{formatCurrency(p.revenue)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Profit</span>
                  <span className={`font-bold font-mono text-[11px] ${p.profit < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(p.profit)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Units</span>
                  <span className="font-bold font-mono text-slate-800 text-[11px]">{p.units}</span>
                </div>
              </div>

              <p className="text-[11px] text-rose-900/90 leading-relaxed">
                <strong>Diagnosis: </strong>{p.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6 & 7. Category-Level Analysis & Profit Margin Extremes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Category-Level Analysis */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Category-Level Product Performance</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Revenue, profit contribution, margin %, and product count across catalog categories
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Products</th>
                  <th className="py-2 px-3 text-right">Revenue</th>
                  <th className="py-2 px-3 text-right">Profit</th>
                  <th className="py-2 px-3 text-center">Avg Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryAnalysis.map((cat) => (
                  <tr key={cat.category} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-900">{cat.category}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{cat.productCount}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(cat.revenue)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(cat.profit)}</td>
                    <td className="py-2 px-3 text-center font-mono">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          cat.margin >= 40
                            ? 'bg-emerald-100 text-emerald-800'
                            : cat.margin >= 25
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cat.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Profit Margin Analysis: Highest & Lowest Margins */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Profit Margin Spectrum</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated as Profit / Revenue × 100 with safe zero-revenue division
            </p>
          </div>

          {/* Highest Margin SKUs */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Top 5 Highest Margin SKUs
            </h3>
            <div className="space-y-1.5">
              {marginAnalysis.highest.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductDrillDown(p)}
                  className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs flex items-center justify-between cursor-pointer hover:bg-emerald-50"
                >
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">{p.name}</span>
                  <span className="font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                    {p.margin}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest Margin SKUs */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Top 5 Lowest Margin SKUs
            </h3>
            <div className="space-y-1.5">
              {marginAnalysis.lowest.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductDrillDown(p)}
                  className="p-2 rounded-lg bg-rose-50/50 border border-rose-200 text-xs flex items-center justify-between cursor-pointer hover:bg-rose-50"
                >
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">{p.name}</span>
                  <span className="font-bold font-mono text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                    {p.margin}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {selectedQuadrant === 'All' ? 'All Product Records' : `${selectedQuadrant} SKU Cohort`}
              </h2>
              {selectedQuadrant !== 'All' && (
                <button
                  onClick={() => setSelectedQuadrant('All')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Clear Quadrant Filter
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredProducts.length} of {classifiedProducts.length} catalog products
            </p>
          </div>

          {/* Table Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="revenue">Sort by Revenue</option>
                <option value="profit">Sort by Profit</option>
                <option value="margin">Sort by Profit Margin</option>
                <option value="units">Sort by Quantity Sold</option>
                <option value="orders">Sort by Number of Orders</option>
                <option value="name">Sort by Product Name</option>
              </select>

              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                title="Toggle Sort Direction"
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-xs font-mono font-bold"
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU ID, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-52"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[460px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Product ID</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3 text-right">Cost</th>
                <th className="py-2.5 px-3 text-right">Profit</th>
                <th className="py-2.5 px-3 text-center">Profit Margin %</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3">Performance Quadrant</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No products found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
                  if (p.quadrant === 'Strong Performers') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  else if (p.quadrant === 'High Sales / Low Profit') badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                  else if (p.quadrant === 'Low Sales / High Profit') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{p.id}</td>
                      <td className="py-2 px-3 font-medium text-slate-900 max-w-[200px] truncate" title={p.name}>
                        {p.name}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{p.category}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800 font-mono">
                        {formatNumber(p.units)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(p.cost)}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold font-mono ${p.profit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatCurrency(p.profit)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            p.margin >= 40
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.margin >= 20
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.margin}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{p.orderCount}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                          {p.quadrant}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setSelectedProductDrillDown(p)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Product Drill-Down"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Product Drill-Down Modal */}
      {selectedProductDrillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedProductDrillDown.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedProductDrillDown.quadrant}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedProductDrillDown.id} • Category: {selectedProductDrillDown.category}
                </div>
              </div>

              <button
                onClick={() => setSelectedProductDrillDown(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Financial Drilldown Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Revenue</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatCurrency(selectedProductDrillDown.revenue)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
                <span className="text-base font-bold font-mono text-slate-600">
                  {formatCurrency(selectedProductDrillDown.cost)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Net Profit</span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  {formatCurrency(selectedProductDrillDown.profit)}
                </span>
              </div>
            </div>

            {/* Granular Unit Economics */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Orders</span>
                <strong className="text-slate-800 font-mono text-sm">{selectedProductDrillDown.orderCount}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Units Sold</span>
                <strong className="text-slate-800 font-mono text-sm">{formatNumber(selectedProductDrillDown.units)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Profit Margin</span>
                <strong className="text-indigo-700 font-mono text-sm">{selectedProductDrillDown.margin}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Avg Selling Price</span>
                <strong className="text-slate-800 font-mono text-sm">{formatCurrency(selectedProductDrillDown.avgPrice)}</strong>
              </div>
            </div>

            {/* Sale Dates */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">First Recorded Sale</span>
                <span className="font-mono font-medium text-slate-800">{selectedProductDrillDown.firstDate}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Most Recent Sale</span>
                <span className="font-mono font-medium text-slate-800">{selectedProductDrillDown.lastDate}</span>
              </div>
            </div>

            {/* Strategic Recommendation */}
            <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
              <strong className="text-indigo-950 font-bold block">Quadrant Strategic Recommendation:</strong>
              <p className="text-indigo-900 text-[11px] leading-relaxed">
                {selectedProductDrillDown.quadrant === 'Strong Performers'
                  ? 'Core commercial anchor. Protect inventory levels, prioritize fulfillment, and avoid discounting.'
                  : selectedProductDrillDown.quadrant === 'High Sales / Low Profit'
                  ? 'High volume but low margins. Consider reducing promotional discounts or renegotiating vendor procurement costs.'
                  : selectedProductDrillDown.quadrant === 'Low Sales / High Profit'
                  ? 'High margin potential. Increase digital marketing exposure and feature in cross-sell recommendations.'
                  : 'Low volume and low profit. Review whether to discontinue, bundle with stars, or liquidate.'}
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedProductDrillDown(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export alias for seamless compatibility
export const ProductPerformancePage = ProductMatrixPage;
