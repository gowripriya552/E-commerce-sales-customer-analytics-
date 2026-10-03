import React, { useState, useMemo } from 'react';
import {
  Award,
  Users,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertCircle,
  Info,
  Sparkles,
  Layers,
  BarChart3,
  MapPin,
  Eye,
  X,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';

interface ClvPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

export interface CustomerClvProfile {
  customer_id: string;
  customer_name: string;
  country: string;
  city: string;
  total_orders: number;
  total_revenue: number;
  total_profit: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  lifespan_days: number;
  lifespan_years: number;
  purchase_frequency: number;
  estimated_clv: number;
  clv_segment: 'High Value' | 'Medium Value' | 'Low Value';
  rfm_segment: string;
  customer_type: 'Returning' | 'New';
  recency_days: number;
}

export function ClvPage({ transactions, customers }: ClvPageProps) {
  // Global & Table Filters
  const [timeframe, setTimeframe] = useState<'all' | '2024' | '2023' | 'last12m'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [clvSegmentFilter, setClvSegmentFilter] = useState<'All' | 'High Value' | 'Medium Value' | 'Low Value'>('All');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'All' | 'Returning' | 'New'>('All');
  const [rfmFilter, setRfmFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'estimated_clv' | 'total_revenue' | 'total_orders' | 'avg_order_value' | 'purchase_frequency' | 'lifespan_days'
  >('estimated_clv');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [topTableSortBy, setTopTableSortBy] = useState<
    'estimated_clv' | 'total_revenue' | 'total_orders' | 'avg_order_value' | 'lifespan_days'
  >('estimated_clv');
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<CustomerClvProfile | null>(null);

  // 10. Uploaded Dataset Compatibility & Defensive Column Check
  const compatibilityCheck = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { isValid: false, message: 'No transactions found in the active dataset.' };
    }

    const first = transactions[0];
    const missing: string[] = [];
    if (!('customer_id' in first)) missing.push('Customer_ID');
    if (!('order_id' in first)) missing.push('Order_ID');
    if (!('order_date' in first)) missing.push('Order_Date');
    if (!('net_revenue' in first) && !('gross_sales' in first)) missing.push('Revenue / Sales');

    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required columns for Customer Lifetime Value analysis: ${missing.join(', ')}. Please upload a dataset containing customer, order date, and revenue fields.`,
      };
    }

    return { isValid: true, message: '' };
  }, [transactions]);

  // Available Countries & RFM Segments
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.country) set.add(t.country);
    });
    return ['All', ...Array.from(set).sort()];
  }, [transactions]);

  const availableRfmSegments = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.rfm_segment) set.add(c.rfm_segment);
    });
    return ['All', ...Array.from(set).sort()];
  }, [customers]);

  // Filtered Transactions based on global filters
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

  // 2, 3 & 4. Customer-Level CLV Calculation & Dynamic Percentile Segmentation
  const clvProfiles = useMemo((): CustomerClvProfile[] => {
    if (filteredTransactions.length === 0) return [];

    // Map existing RFM segments from CustomerSummary
    const rfmLookup = new Map<string, { segment: string; recency: number }>();
    customers.forEach((c) => {
      rfmLookup.set(c.customer_id, { segment: c.rfm_segment, recency: c.recency_days });
    });

    // Aggregate per customer
    const custMap = new Map<
      string,
      {
        customer_id: string;
        customer_name: string;
        country: string;
        city: string;
        orders: Set<string>;
        revenue: number;
        profit: number;
        firstDate: string;
        lastDate: string;
      }
    >();

    let datasetMaxDate = '';
    for (const t of filteredTransactions) {
      if (!datasetMaxDate || t.order_date > datasetMaxDate) {
        datasetMaxDate = t.order_date;
      }

      if (!custMap.has(t.customer_id)) {
        custMap.set(t.customer_id, {
          customer_id: t.customer_id,
          customer_name: t.customer_name,
          country: t.country || 'USA',
          city: t.city,
          orders: new Set(),
          revenue: 0,
          profit: 0,
          firstDate: t.order_date,
          lastDate: t.order_date,
        });
      }

      const entry = custMap.get(t.customer_id)!;
      entry.orders.add(t.order_id);
      entry.revenue += t.net_revenue;
      entry.profit += t.profit;
      if (t.order_date < entry.firstDate) entry.firstDate = t.order_date;
      if (t.order_date > entry.lastDate) entry.lastDate = t.order_date;
    }

    const snapshotTime = datasetMaxDate
      ? new Date(datasetMaxDate).getTime() + 86400000
      : new Date().getTime();

    // Compute raw CLV metrics for each customer
    // Formula: Customer Value = Average Order Value × Purchase Frequency × Customer Lifespan
    // Where:
    // - Average Order Value (AOV) = Total Revenue / Total Orders
    // - Purchase Frequency = Total Orders (observed order count in active tenure)
    // - Customer Lifespan Factor = 1 + (observed tenure in years), reflecting repeat tenure longevity
    const rawProfiles = Array.from(custMap.values()).map((c) => {
      const totalOrders = Math.max(1, c.orders.size);
      const totalRevenue = Number(c.revenue.toFixed(2));
      const totalProfit = Number(c.profit.toFixed(2));
      const aov = Number((totalRevenue / totalOrders).toFixed(2));

      const firstTime = new Date(c.firstDate).getTime();
      const lastTime = new Date(c.lastDate).getTime();
      const rawSpanDays = Math.max(0, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24)));
      const recencyDays = Math.max(0, Math.floor((snapshotTime - lastTime) / (1000 * 60 * 60 * 24)));

      // Effective lifespan in years (1.00 baseline + observed multi-order span in years)
      const lifespanYears = Number((1 + rawSpanDays / 365.25).toFixed(2));
      // Purchase frequency (total orders placed)
      const purchaseFrequency = totalOrders;

      // Estimated Analytical CLV = AOV * Purchase Frequency * Customer Lifespan (Years)
      const estimatedClv = Number((aov * purchaseFrequency * lifespanYears).toFixed(2));

      const isReturning = totalOrders > 1;
      const rfmInfo = rfmLookup.get(c.customer_id);

      return {
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        country: c.country,
        city: c.city,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        avg_order_value: aov,
        first_order_date: c.firstDate,
        last_order_date: c.lastDate,
        lifespan_days: rawSpanDays,
        lifespan_years: lifespanYears,
        purchase_frequency: purchaseFrequency,
        estimated_clv: estimatedClv,
        rfm_segment: rfmInfo?.segment || (isReturning ? 'Loyal Customers' : 'New Customers'),
        customer_type: isReturning ? ('Returning' as const) : ('New' as const),
        recency_days: rfmInfo?.recency ?? recencyDays,
      };
    });

    // Calculate dynamic percentile thresholds (75th percentile = High Value, 25th percentile = Medium Value)
    const sortedClvs = [...rawProfiles].map((p) => p.estimated_clv).sort((a, b) => a - b);
    const p75 = sortedClvs[Math.floor(sortedClvs.length * 0.75)] || 0;
    const p25 = sortedClvs[Math.floor(sortedClvs.length * 0.25)] || 0;

    return rawProfiles.map((p) => {
      let clv_segment: 'High Value' | 'Medium Value' | 'Low Value' = 'Low Value';
      if (p.estimated_clv >= p75 && p.estimated_clv > 0) {
        clv_segment = 'High Value';
      } else if (p.estimated_clv >= p25 && p.estimated_clv > 0) {
        clv_segment = 'Medium Value';
      }
      return {
        ...p,
        clv_segment,
      };
    });
  }, [filteredTransactions, customers]);

  // 1. CLV Overview KPIs
  const kpis = useMemo(() => {
    const totalCust = clvProfiles.length;
    if (totalCust === 0) {
      return {
        totalCustomers: 0,
        avgClv: 0,
        totalClv: 0,
        highestClvCustomer: null as CustomerClvProfile | null,
        medianClv: 0,
        avgCustomerSpend: 0,
        totalHistoricalRevenue: 0,
      };
    }

    const totalClv = clvProfiles.reduce((s, c) => s + c.estimated_clv, 0);
    const totalRev = clvProfiles.reduce((s, c) => s + c.total_revenue, 0);
    const avgClv = totalClv / totalCust;
    const avgSpend = totalRev / totalCust;

    const sortedByClv = [...clvProfiles].sort((a, b) => b.estimated_clv - a.estimated_clv);
    const highestClvCustomer = sortedByClv[0];

    const midIdx = Math.floor(sortedByClv.length / 2);
    const medianClv =
      sortedByClv.length % 2 !== 0
        ? sortedByClv[midIdx].estimated_clv
        : (sortedByClv[midIdx - 1].estimated_clv + sortedByClv[midIdx].estimated_clv) / 2;

    return {
      totalCustomers: totalCust,
      avgClv,
      totalClv,
      highestClvCustomer,
      medianClv,
      avgCustomerSpend: avgSpend,
      totalHistoricalRevenue: totalRev,
    };
  }, [clvProfiles]);

  // 5. CLV Distribution (Customer Count & Revenue Contribution by CLV Segment)
  const segmentDistribution = useMemo(() => {
    const tiers: Array<'High Value' | 'Medium Value' | 'Low Value'> = [
      'High Value',
      'Medium Value',
      'Low Value',
    ];

    const totalCust = Math.max(1, clvProfiles.length);
    const totalRev = Math.max(1, kpis.totalHistoricalRevenue);
    const totalClvSum = Math.max(1, kpis.totalClv);

    return tiers.map((tier) => {
      const subset = clvProfiles.filter((c) => c.clv_segment === tier);
      const count = subset.length;
      const rev = subset.reduce((s, c) => s + c.total_revenue, 0);
      const clvSum = subset.reduce((s, c) => s + c.estimated_clv, 0);
      const avgClv = count > 0 ? clvSum / count : 0;

      return {
        segment: tier,
        count,
        countPct: ((count / totalCust) * 100).toFixed(1),
        revenue: rev,
        revenuePct: ((rev / totalRev) * 100).toFixed(1),
        totalClv: clvSum,
        clvPct: ((clvSum / totalClvSum) * 100).toFixed(1),
        avgClv,
      };
    });
  }, [clvProfiles, kpis]);

  // 6. Top Customers by CLV (Top 10 Leaderboard)
  const topCustomersByClv = useMemo(() => {
    return [...clvProfiles]
      .sort((a, b) => {
        if (topTableSortBy === 'estimated_clv') return b.estimated_clv - a.estimated_clv;
        if (topTableSortBy === 'total_revenue') return b.total_revenue - a.total_revenue;
        if (topTableSortBy === 'total_orders') return b.total_orders - a.total_orders;
        if (topTableSortBy === 'avg_order_value') return b.avg_order_value - a.avg_order_value;
        return b.lifespan_days - a.lifespan_days;
      })
      .slice(0, 10);
  }, [clvProfiles, topTableSortBy]);

  // 7. CLV + RFM Segment Integration
  const clvByRfmSegment = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalClv: number; totalRevenue: number; totalOrders: number }
    >();

    for (const c of clvProfiles) {
      const seg = c.rfm_segment;
      if (!map.has(seg)) {
        map.set(seg, { count: 0, totalClv: 0, totalRevenue: 0, totalOrders: 0 });
      }
      const entry = map.get(seg)!;
      entry.count += 1;
      entry.totalClv += c.estimated_clv;
      entry.totalRevenue += c.total_revenue;
      entry.totalOrders += c.total_orders;
    }

    return Array.from(map.entries())
      .map(([segment, data]) => ({
        segment,
        count: data.count,
        totalClv: data.totalClv,
        avgClv: data.count > 0 ? data.totalClv / data.count : 0,
        totalRevenue: data.totalRevenue,
        avgRevenue: data.count > 0 ? data.totalRevenue / data.count : 0,
        avgOrders: data.count > 0 ? (data.totalOrders / data.count).toFixed(1) : '0',
      }))
      .sort((a, b) => b.avgClv - a.avgClv);
  }, [clvProfiles]);

  // 8. CLV + Retention Integration (New vs Returning Customers)
  const clvByRetentionType = useMemo(() => {
    const returningList = clvProfiles.filter((c) => c.customer_type === 'Returning');
    const newList = clvProfiles.filter((c) => c.customer_type === 'New');

    const calcStats = (list: CustomerClvProfile[]) => {
      const count = list.length;
      const totalClv = list.reduce((s, c) => s + c.estimated_clv, 0);
      const totalRev = list.reduce((s, c) => s + c.total_revenue, 0);
      const avgClv = count > 0 ? totalClv / count : 0;
      const avgRev = count > 0 ? totalRev / count : 0;
      const avgOrders = count > 0 ? list.reduce((s, c) => s + c.total_orders, 0) / count : 0;
      const avgLifespan = count > 0 ? list.reduce((s, c) => s + c.lifespan_days, 0) / count : 0;

      return {
        count,
        totalClv,
        totalRev,
        avgClv,
        avgRev,
        avgOrders: avgOrders.toFixed(1),
        avgLifespan: Math.round(avgLifespan),
      };
    };

    const returningStats = calcStats(returningList);
    const newStats = calcStats(newList);
    const clvMultiplier =
      newStats.avgClv > 0 ? (returningStats.avgClv / newStats.avgClv).toFixed(1) : '1.0';

    return {
      returning: returningStats,
      newCust: newStats,
      clvMultiplier,
    };
  }, [clvProfiles]);

  // 9. Customer Explorer Filtered & Sorted List
  const filteredCustomers = useMemo(() => {
    const list = clvProfiles.filter((c) => {
      if (clvSegmentFilter !== 'All' && c.clv_segment !== clvSegmentFilter) return false;
      if (customerTypeFilter !== 'All' && c.customer_type !== customerTypeFilter) return false;
      if (rfmFilter !== 'All' && c.rfm_segment !== rfmFilter) return false;

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchId = c.customer_id.toLowerCase().includes(q);
        const matchName = c.customer_name.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        const matchCountry = c.country.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchCity && !matchCountry) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'estimated_clv') diff = a.estimated_clv - b.estimated_clv;
      else if (sortBy === 'total_revenue') diff = a.total_revenue - b.total_revenue;
      else if (sortBy === 'total_orders') diff = a.total_orders - b.total_orders;
      else if (sortBy === 'avg_order_value') diff = a.avg_order_value - b.avg_order_value;
      else if (sortBy === 'purchase_frequency') diff = a.purchase_frequency - b.purchase_frequency;
      else if (sortBy === 'lifespan_days') diff = a.lifespan_days - b.lifespan_days;

      return sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [clvProfiles, clvSegmentFilter, customerTypeFilter, rfmFilter, searchQuery, sortBy, sortDirection]);

  // Export CLV Table to CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer_ID',
      'Customer_Name',
      'Country',
      'City',
      'Customer_Type',
      'Total_Orders',
      'Total_Revenue',
      'Average_Order_Value',
      'Purchase_Frequency',
      'Lifespan_Days',
      'Lifespan_Factor_Years',
      'Estimated_Analytical_CLV',
      'CLV_Segment',
      'RFM_Segment',
    ];

    const rows = filteredCustomers.map((c) => [
      c.customer_id,
      `"${c.customer_name}"`,
      `"${c.country}"`,
      `"${c.city}"`,
      c.customer_type,
      c.total_orders,
      c.total_revenue,
      c.avg_order_value,
      c.purchase_frequency,
      c.lifespan_days,
      c.lifespan_years,
      c.estimated_clv,
      `"${c.clv_segment}"`,
      `"${c.rfm_segment}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_lifetime_value_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!compatibilityCheck.isValid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Customer Lifetime Value
          </h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            Dataset Compatibility Notice
          </div>
          <p className="text-sm leading-relaxed text-amber-800">
            {compatibilityCheck.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600" />
              Customer Lifetime Value (CLV)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Estimated Analytical CLV
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Evaluating long-term customer monetary worth across purchase frequency, basket size, tenure lifespan, and RFM segments
          </p>
        </div>

        {/* Global Controls */}
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
            <span>Export CLV CSV</span>
          </button>
        </div>
      </div>

      {/* 1. CLV Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Customers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatNumber(kpis.totalCustomers)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active accounts analyzed</div>
        </div>

        {/* Average CLV */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Average CLV</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">
            {formatCurrency(kpis.avgClv)}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Mean analytical CLV</div>
        </div>

        {/* Total Customer Value */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Customer Value</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {formatCurrency(kpis.totalClv)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Cumulative portfolio CLV</div>
        </div>

        {/* Highest-Value Customer */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Highest-Value Account</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div
            className="text-sm font-bold text-slate-900 truncate"
            title={kpis.highestClvCustomer?.customer_name}
          >
            {kpis.highestClvCustomer?.customer_name || 'N/A'}
          </div>
          <div className="text-xs font-mono font-bold text-amber-700 mt-0.5">
            {formatCurrency(kpis.highestClvCustomer?.estimated_clv || 0)}
          </div>
        </div>

        {/* Median CLV */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Median CLV</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(kpis.medianClv)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">50th percentile baseline</div>
        </div>

        {/* Average Customer Spend */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Avg Customer Spend</span>
            <ShoppingBag className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(kpis.avgCustomerSpend)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Realized historical spend</div>
        </div>
      </div>

      {/* 3 & 13. Explainability & Analytical CLV Methodology Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4 text-indigo-400" />
            Estimated Historical / Analytical CLV Methodology
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
            Customer Value = Average Order Value × Purchase Frequency × Customer Lifespan
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Explainability Note:</strong> CLV is an analytical estimate based on observed customer purchasing behavior in the available dataset. It is not a guaranteed prediction of future revenue. For each customer, <strong>Average Order Value</strong> (Total Revenue ÷ Total Orders) is multiplied by <strong>Purchase Frequency</strong> (Total Orders) and the observed <strong>Customer Lifespan Factor</strong> (1 + tenure span in years between first and last recorded purchase).
        </p>
      </div>

      {/* 4 & 5. CLV Segments & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Count by CLV Segment */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Customer Count by CLV Segment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Segmented dynamically via dataset quartiles (High ≥75th, Medium 25th–75th, Low &lt;25th)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {segmentDistribution.map((seg) => {
              const isSelected = clvSegmentFilter === seg.segment;
              const cardStyle =
                seg.segment === 'High Value'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : seg.segment === 'Medium Value'
                  ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900';

              const badgeStyle =
                seg.segment === 'High Value'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : seg.segment === 'Medium Value'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  : 'bg-slate-200 text-slate-700 border-slate-300';

              return (
                <div
                  key={seg.segment}
                  onClick={() =>
                    setClvSegmentFilter(isSelected ? 'All' : seg.segment)
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${cardStyle} ${
                    isSelected ? 'ring-2 ring-indigo-600' : 'hover:opacity-95'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{seg.segment}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                      {seg.countPct}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {formatNumber(seg.count)}
                  </div>
                  <div className="text-[11px] opacity-80 pt-1 border-t border-current/10 flex justify-between">
                    <span>Avg CLV:</span>
                    <strong className="font-mono">{formatCurrency(seg.avgClv)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Customer Distribution Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              {segmentDistribution.map((s) => (
                <span key={s.segment} className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      s.segment === 'High Value'
                        ? 'bg-emerald-500'
                        : s.segment === 'Medium Value'
                        ? 'bg-indigo-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {s.segment}: {s.count} ({s.countPct}%)
                </span>
              ))}
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {segmentDistribution.map((s) => (
                <div
                  key={s.segment}
                  className={`h-full transition-all duration-300 ${
                    s.segment === 'High Value'
                      ? 'bg-emerald-500'
                      : s.segment === 'Medium Value'
                      ? 'bg-indigo-500'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${s.countPct}%` }}
                  title={`${s.segment}: ${s.count} customers (${s.countPct}%)`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Contribution by CLV Segment */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Revenue & Value Contribution by CLV Segment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares realized revenue and analytical CLV concentration across value tiers
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {segmentDistribution.map((seg) => {
              const barColor =
                seg.segment === 'High Value'
                  ? 'bg-emerald-500'
                  : seg.segment === 'Medium Value'
                  ? 'bg-indigo-500'
                  : 'bg-slate-400';

              return (
                <div key={seg.segment} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{seg.segment} Tier</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-600">
                        Revenue: <strong className="text-slate-900">{formatCurrency(seg.revenue)}</strong> ({seg.revenuePct}%)
                      </span>
                      <span className="text-indigo-700 font-bold">
                        CLV: {formatCurrency(seg.totalClv)} ({seg.clvPct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${seg.revenuePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
            <span>Top 25% High-Value Customer Revenue Share:</span>
            <span className="font-bold font-mono text-emerald-800">
              {segmentDistribution[0]?.revenuePct || '0'}% of total store revenue
            </span>
          </div>
        </div>
      </div>

      {/* 7 & 8. CLV + Retention Analysis & CLV + RFM Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 8. CLV + Retention Analysis (New vs Returning) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              CLV + Retention Cohort Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares lifetime value of One-Time New Customers vs. Multi-Order Returning Customers
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Returning Customers CLV */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Returning Buyers</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {formatNumber(clvByRetentionType.returning.count)} Accounts
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Average CLV</span>
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {formatCurrency(clvByRetentionType.returning.avgClv)}
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
                <div className="flex justify-between">
                  <span>Total Cohort CLV:</span>
                  <strong className="font-mono">{formatCurrency(clvByRetentionType.returning.totalClv)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Realized Spend:</span>
                  <strong className="font-mono">{formatCurrency(clvByRetentionType.returning.totalRev)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Avg Orders / Tenure:</span>
                  <strong className="font-mono">{clvByRetentionType.returning.avgOrders} ord ({clvByRetentionType.returning.avgLifespan}d)</strong>
                </div>
              </div>
            </div>

            {/* New Customers CLV */}
            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900">New (One-Time)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                  {formatNumber(clvByRetentionType.newCust.count)} Accounts
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sky-700 uppercase font-semibold block">Average CLV</span>
                <div className="text-2xl font-bold font-mono text-sky-950">
                  {formatCurrency(clvByRetentionType.newCust.avgClv)}
                </div>
              </div>
              <div className="pt-2 border-t border-sky-200/80 text-[11px] text-sky-900 space-y-1">
                <div className="flex justify-between">
                  <span>Total Cohort CLV:</span>
                  <strong className="font-mono">{formatCurrency(clvByRetentionType.newCust.totalClv)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Realized Spend:</span>
                  <strong className="font-mono">{formatCurrency(clvByRetentionType.newCust.totalRev)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Avg Orders / Tenure:</span>
                  <strong className="font-mono">{clvByRetentionType.newCust.avgOrders} ord (Baseline)</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
            <span>Retention CLV Multiplier:</span>
            <strong className="font-mono text-indigo-700">
              Returning buyers generate {clvByRetentionType.clvMultiplier}× higher CLV than single-order buyers
            </strong>
          </div>
        </div>

        {/* 7. CLV + RFM Analysis */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                CLV by Existing RFM Segment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cross-references analytical CLV with existing RFM behavioral segments
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Preserves Existing RFM</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[270px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">RFM Segment</th>
                  <th className="py-2 px-3 text-right">Customers</th>
                  <th className="py-2 px-3 text-right">Average CLV</th>
                  <th className="py-2 px-3 text-right">Total Segment CLV</th>
                  <th className="py-2 px-3 text-right">Realized Revenue</th>
                  <th className="py-2 px-3 text-right">Avg Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clvByRfmSegment.map((row) => (
                  <tr
                    key={row.segment}
                    onClick={() => setRfmFilter(rfmFilter === row.segment ? 'All' : row.segment)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      rfmFilter === row.segment ? 'bg-indigo-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-medium text-slate-900">{row.segment}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatNumber(row.count)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                      {formatCurrency(row.avgClv)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(row.totalClv)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{row.avgOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Top 10 Customers by CLV */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Top 10 Highest-Value Customers by CLV
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              VIP accounts generating the greatest analytical lifetime value
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Sort Top 10 by:</span>
            <select
              value={topTableSortBy}
              onChange={(e) => setTopTableSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="estimated_clv">Estimated CLV</option>
              <option value="total_revenue">Total Revenue</option>
              <option value="total_orders">Total Orders</option>
              <option value="avg_order_value">Average Order Value</option>
              <option value="lifespan_days">Customer Lifespan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-700">Estimated CLV</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
                <th className="py-2.5 px-3 text-right">Total Orders</th>
                <th className="py-2.5 px-3 text-right">Avg Order Value</th>
                <th className="py-2.5 px-3 text-right">Purchase Freq</th>
                <th className="py-2.5 px-3 text-right">Customer Lifespan</th>
                <th className="py-2.5 px-3">RFM Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCustomersByClv.map((c, idx) => (
                <tr
                  key={c.customer_id}
                  onClick={() => setSelectedCustomerModal(c)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-2 px-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{c.customer_id}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">
                    {c.customer_name}
                    <span className="text-[10px] text-slate-400 block">{c.city}, {c.country}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700 text-sm">
                    {formatCurrency(c.estimated_clv)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(c.total_revenue)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{c.total_orders}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(c.avg_order_value)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {c.purchase_frequency} orders
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {c.lifespan_days}d ({c.lifespan_years}×)
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.rfm_segment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Comprehensive Customer CLV Explorer Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Customer CLV Explorer</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                {formatNumber(filteredCustomers.length)} of {formatNumber(clvProfiles.length)} Customers
              </span>
              {(clvSegmentFilter !== 'All' || customerTypeFilter !== 'All' || rfmFilter !== 'All') && (
                <button
                  onClick={() => {
                    setClvSegmentFilter('All');
                    setCustomerTypeFilter('All');
                    setRfmFilter('All');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Clear Active Filters
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Search, filter, and sort individual customer CLV records across segments and retention types
            </p>
          </div>

          {/* Filter & Sort Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* CLV Segment Filter */}
            <select
              value={clvSegmentFilter}
              onChange={(e) => setClvSegmentFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All CLV Segments</option>
              <option value="High Value">High Value</option>
              <option value="Medium Value">Medium Value</option>
              <option value="Low Value">Low Value</option>
            </select>

            {/* Customer Type Filter */}
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Customer Types</option>
              <option value="Returning">Returning Buyers</option>
              <option value="New">New Buyers</option>
            </select>

            {/* RFM Segment Filter */}
            <select
              value={rfmFilter}
              onChange={(e) => setRfmFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              {availableRfmSegments.map((seg) => (
                <option key={seg} value={seg}>
                  {seg === 'All' ? 'All RFM Segments' : seg}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="estimated_clv">Sort by CLV</option>
                <option value="total_revenue">Sort by Total Revenue</option>
                <option value="total_orders">Sort by Total Orders</option>
                <option value="avg_order_value">Sort by Avg Order Value</option>
                <option value="purchase_frequency">Sort by Purchase Frequency</option>
                <option value="lifespan_days">Sort by Lifespan</option>
              </select>
              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="text-slate-500 hover:text-slate-900 cursor-pointer text-xs font-mono font-bold"
                title="Toggle Sort Direction"
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, name, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>
          </div>
        </div>

        {/* Explorer Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[480px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3 text-right">Total Orders</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
                <th className="py-2.5 px-3 text-right">Avg Order Value</th>
                <th className="py-2.5 px-3 text-right">Purchase Freq</th>
                <th className="py-2.5 px-3 text-right">Customer Lifespan</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-700">Estimated CLV</th>
                <th className="py-2.5 px-3 text-center">CLV Segment</th>
                <th className="py-2.5 px-3">RFM Segment</th>
                <th className="py-2.5 px-3 text-center">Customer Type</th>
                <th className="py-2.5 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No customer records match your active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const clvBadge =
                    c.clv_segment === 'High Value'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : c.clv_segment === 'Medium Value'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300';

                  return (
                    <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{c.customer_id}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900">{c.customer_name}</div>
                        <div className="text-[10px] text-slate-400">{c.city}, {c.country}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {c.total_orders}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(c.total_revenue)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(c.avg_order_value)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {c.purchase_frequency}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {c.lifespan_days}d ({c.lifespan_years}×)
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                        {formatCurrency(c.estimated_clv)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${clvBadge}`}>
                          {c.clv_segment}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {c.rfm_segment}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                            c.customer_type === 'Returning'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {c.customer_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setSelectedCustomerModal(c)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Inspect Customer CLV Equation"
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

      {/* Customer CLV Drill-Down Modal */}
      {selectedCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedCustomerModal.customer_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedCustomerModal.clv_segment}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedCustomerModal.customer_id} • {selectedCustomerModal.city}, {selectedCustomerModal.country}
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-Step Formula Verification */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Analytical CLV Formula Breakdown
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Avg Order Value</span>
                  <strong className="font-mono text-sm text-white">
                    {formatCurrency(selectedCustomerModal.avg_order_value)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">× Purchase Freq</span>
                  <strong className="font-mono text-sm text-white">
                    {selectedCustomerModal.purchase_frequency} orders
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">× Lifespan Factor</span>
                  <strong className="font-mono text-sm text-white">
                    {selectedCustomerModal.lifespan_years}× ({selectedCustomerModal.lifespan_days}d)
                  </strong>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Estimated Analytical CLV:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  = {formatCurrency(selectedCustomerModal.estimated_clv)}
                </span>
              </div>
            </div>

            {/* Additional Context */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Realized Spend</span>
                <strong className="font-mono text-slate-900">{formatCurrency(selectedCustomerModal.total_revenue)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Net Profit</span>
                <strong className="font-mono text-emerald-700">{formatCurrency(selectedCustomerModal.total_profit)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">First Purchase</span>
                <strong className="font-mono text-slate-800">{selectedCustomerModal.first_order_date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Last Purchase</span>
                <strong className="font-mono text-slate-800">{selectedCustomerModal.last_order_date}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span>RFM Segment: <strong>{selectedCustomerModal.rfm_segment}</strong></span>
              <span>Retention Type: <strong>{selectedCustomerModal.customer_type} Customer</strong></span>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCustomerModal(null)}
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
