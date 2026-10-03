import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Users,
  Repeat,
  TrendingUp,
  DollarSign,
  Calendar,
  ShoppingBag,
  Percent,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  MapPin,
  Flame,
  Award,
  Layers,
  BarChart3,
  X,
  Eye,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';

interface RetentionPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

export function RetentionPage({ transactions, customers }: RetentionPageProps) {
  const [timeframe, setTimeframe] = useState<'all' | '2024' | '2023' | 'last12m'>('all');
  const [trendGranularity, setTrendGranularity] = useState<'month' | 'quarter'>('month');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'returning' | 'new'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'total_orders' | 'total_spend' | 'recency_days' | 'first_order_date' | 'customer_name'>('total_orders');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCustomerModal, setSelectedCustomerModal] = useState<CustomerSummary | null>(null);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // 1. Dataset Safety & Column Compatibility Check
  const compatibilityCheck = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { isValid: false, message: 'No transactions found in the active dataset.' };
    }

    const first = transactions[0];
    const missing: string[] = [];
    if (!('customer_id' in first)) missing.push('Customer_ID');
    if (!('order_id' in first)) missing.push('Order_ID');
    if (!('order_date' in first)) missing.push('Order_Date');
    if (!('net_revenue' in first) && !('gross_sales' in first)) missing.push('Revenue / Gross Sales');

    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required columns for Retention Analysis: ${missing.join(', ')}. Please verify the dataset contains valid customer and order fields.`,
      };
    }

    return { isValid: true, message: '' };
  }, [transactions]);

  // Available countries
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.country) set.add(t.country);
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
      // Find max date in dataset
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

  // Dynamic customer map calculated from the active filtered transactions
  const customerRetentionProfiles = useMemo(() => {
    // Map customer_id -> aggregate stats
    const map = new Map<string, {
      customer_id: string;
      customer_name: string;
      country: string;
      city: string;
      first_order_date: string;
      last_order_date: string;
      orders: Set<string>;
      total_spend: number;
      rfm_segment: string;
    }>();

    // Map existing customer RFM segments for quick lookup
    const segmentMap = new Map<string, string>();
    customers.forEach((c) => {
      segmentMap.set(c.customer_id, c.rfm_segment);
    });

    for (const t of filteredTransactions) {
      if (!map.has(t.customer_id)) {
        map.set(t.customer_id, {
          customer_id: t.customer_id,
          customer_name: t.customer_name,
          country: t.country || 'USA',
          city: t.city,
          first_order_date: t.order_date,
          last_order_date: t.order_date,
          orders: new Set(),
          total_spend: 0,
          rfm_segment: segmentMap.get(t.customer_id) || 'Potential Loyal Customers',
        });
      }
      const entry = map.get(t.customer_id)!;
      entry.orders.add(t.order_id);
      entry.total_spend += t.net_revenue;
      if (t.order_date < entry.first_order_date) entry.first_order_date = t.order_date;
      if (t.order_date > entry.last_order_date) entry.last_order_date = t.order_date;
    }

    // Reference snapshot time (1 day after max date)
    let maxDate = '';
    filteredTransactions.forEach((t) => {
      if (!maxDate || t.order_date > maxDate) maxDate = t.order_date;
    });
    const snapshotTime = maxDate ? new Date(maxDate).getTime() + 86400000 : new Date().getTime();

    return Array.from(map.values()).map((c) => {
      const totalOrders = c.orders.size;
      const totalSpend = Number(c.total_spend.toFixed(2));
      const aov = totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0;
      const lastTime = new Date(c.last_order_date).getTime();
      const recencyDays = Math.max(0, Math.floor((snapshotTime - lastTime) / (1000 * 60 * 60 * 24)));

      // Classify as Returning (>1 order) or New (1 order)
      const isReturning = totalOrders > 1;

      return {
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        country: c.country,
        city: c.city,
        first_order_date: c.first_order_date,
        last_order_date: c.last_order_date,
        total_orders: totalOrders,
        total_spend: totalSpend,
        avg_order_value: aov,
        recency_days: recencyDays,
        customer_type: isReturning ? ('Returning' as const) : ('New' as const),
        rfm_segment: c.rfm_segment,
      };
    });
  }, [filteredTransactions, customers]);

  // Section 1: Core Retention KPIs
  const kpis = useMemo(() => {
    const total = customerRetentionProfiles.length;
    const returning = customerRetentionProfiles.filter((c) => c.customer_type === 'Returning').length;
    const newCust = total - returning;
    const repeatRate = total > 0 ? (returning / total) * 100 : 0;

    const totalOrdersCount = customerRetentionProfiles.reduce((s, c) => s + c.total_orders, 0);
    const avgOrdersPerCust = total > 0 ? (totalOrdersCount / total).toFixed(2) : '0';

    const totalRevenueSum = customerRetentionProfiles.reduce((s, c) => s + c.total_spend, 0);
    const avgCustSpend = total > 0 ? totalRevenueSum / total : 0;

    const returningRevenue = customerRetentionProfiles
      .filter((c) => c.customer_type === 'Returning')
      .reduce((s, c) => s + c.total_spend, 0);

    const newRevenue = totalRevenueSum - returningRevenue;
    const returningRevPct = totalRevenueSum > 0 ? (returningRevenue / totalRevenueSum) * 100 : 0;
    const newRevPct = totalRevenueSum > 0 ? (newRevenue / totalRevenueSum) * 100 : 0;

    const returningAov = returning > 0 ? returningRevenue / returning : 0;
    const newAov = newCust > 0 ? newRevenue / newCust : 0;

    return {
      totalCustomers: total,
      newCustomers: newCust,
      newCustomersPct: total > 0 ? ((newCust / total) * 100).toFixed(1) : '0',
      returningCustomers: returning,
      returningCustomersPct: total > 0 ? ((returning / total) * 100).toFixed(1) : '0',
      repeatPurchaseRate: repeatRate.toFixed(1),
      avgOrdersPerCust,
      avgCustSpend,
      totalRevenueSum,
      returningRevenue,
      returningRevPct: returningRevPct.toFixed(1),
      newRevenue,
      newRevPct: newRevPct.toFixed(1),
      returningAov,
      newAov,
    };
  }, [customerRetentionProfiles]);

  // Section 5: Customer Purchase Frequency Distribution
  const frequencyGroups = useMemo(() => {
    let f1 = 0;
    let f2 = 0;
    let f3to5 = 0;
    let f6to10 = 0;
    let f10plus = 0;

    let spend1 = 0;
    let spend2 = 0;
    let spend3to5 = 0;
    let spend6to10 = 0;
    let spend10plus = 0;

    customerRetentionProfiles.forEach((c) => {
      if (c.total_orders === 1) {
        f1++;
        spend1 += c.total_spend;
      } else if (c.total_orders === 2) {
        f2++;
        spend2 += c.total_spend;
      } else if (c.total_orders >= 3 && c.total_orders <= 5) {
        f3to5++;
        spend3to5 += c.total_spend;
      } else if (c.total_orders >= 6 && c.total_orders <= 10) {
        f6to10++;
        spend6to10 += c.total_spend;
      } else {
        f10plus++;
        spend10plus += c.total_spend;
      }
    });

    const total = Math.max(1, customerRetentionProfiles.length);
    const totalRev = Math.max(1, kpis.totalRevenueSum);

    return [
      {
        label: '1 Order (One-Time)',
        count: f1,
        countPct: ((f1 / total) * 100).toFixed(1),
        spend: spend1,
        spendPct: ((spend1 / totalRev) * 100).toFixed(1),
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        barColor: 'bg-slate-400',
      },
      {
        label: '2 Orders (First Repeat)',
        count: f2,
        countPct: ((f2 / total) * 100).toFixed(1),
        spend: spend2,
        spendPct: ((spend2 / totalRev) * 100).toFixed(1),
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        barColor: 'bg-blue-500',
      },
      {
        label: '3–5 Orders (Loyal Core)',
        count: f3to5,
        countPct: ((f3to5 / total) * 100).toFixed(1),
        spend: spend3to5,
        spendPct: ((spend3to5 / totalRev) * 100).toFixed(1),
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        barColor: 'bg-indigo-500',
      },
      {
        label: '6–10 Orders (High Frequency)',
        count: f6to10,
        countPct: ((f6to10 / total) * 100).toFixed(1),
        spend: spend6to10,
        spendPct: ((spend6to10 / totalRev) * 100).toFixed(1),
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        barColor: 'bg-emerald-500',
      },
      {
        label: '10+ Orders (Super Loyalists)',
        count: f10plus,
        countPct: ((f10plus / total) * 100).toFixed(1),
        spend: spend10plus,
        spendPct: ((spend10plus / totalRev) * 100).toFixed(1),
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        barColor: 'bg-amber-500',
      },
    ];
  }, [customerRetentionProfiles, kpis.totalRevenueSum]);

  // Section 4: Time-based Retention Trend (Month vs Quarter)
  const retentionTrend = useMemo(() => {
    // Map period -> { orders: Set<string>, customers: Set<string>, repeatCustomers: Set<string>, revenue: number, newRev: number, returningRev: number }
    // We determine first purchase date of each customer across the entire dataset to accurately classify period orders as New vs Returning
    const firstPurchaseMap = new Map<string, string>();
    transactions.forEach((t) => {
      const cur = firstPurchaseMap.get(t.customer_id);
      if (!cur || t.order_date < cur) {
        firstPurchaseMap.set(t.customer_id, t.order_date);
      }
    });

    const periodMap = new Map<string, {
      periodKey: string;
      label: string;
      allCustomers: Set<string>;
      returningCustomers: Set<string>;
      newCustomers: Set<string>;
      totalOrders: number;
      revenue: number;
    }>();

    for (const t of filteredTransactions) {
      let key = '';
      let displayLabel = '';

      if (trendGranularity === 'month') {
        key = t.order_date.substring(0, 7); // '2023-01'
        const [y, m] = key.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        displayLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        // Quarter
        const y = t.order_date.substring(0, 4);
        const m = parseInt(t.order_date.substring(5, 7), 10);
        const q = Math.ceil(m / 3);
        key = `${y}-Q${q}`;
        displayLabel = `Q${q} ${y}`;
      }

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          periodKey: key,
          label: displayLabel,
          allCustomers: new Set(),
          returningCustomers: new Set(),
          newCustomers: new Set(),
          totalOrders: 0,
          revenue: 0,
        });
      }

      const p = periodMap.get(key)!;
      p.allCustomers.add(t.customer_id);
      p.totalOrders += 1;
      p.revenue += t.net_revenue;

      // Did customer make their first order before this period?
      const firstDate = firstPurchaseMap.get(t.customer_id);
      const isFirstInPeriod = trendGranularity === 'month'
        ? firstDate?.startsWith(key)
        : firstDate && `${firstDate.substring(0, 4)}-Q${Math.ceil(parseInt(firstDate.substring(5, 7), 10) / 3)}` === key;

      if (isFirstInPeriod) {
        p.newCustomers.add(t.customer_id);
      } else {
        p.returningCustomers.add(t.customer_id);
      }
    }

    const sorted = Array.from(periodMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => {
        const totalCust = data.allCustomers.size;
        const retCust = data.returningCustomers.size;
        const newCust = data.newCustomers.size;
        const rate = totalCust > 0 ? (retCust / totalCust) * 100 : 0;

        return {
          key: data.periodKey,
          label: data.label,
          totalCustomers: totalCust,
          returningCustomers: retCust,
          newCustomers: newCust,
          repeatRate: Number(rate.toFixed(1)),
          revenue: Math.round(data.revenue),
        };
      });

    return sorted;
  }, [filteredTransactions, transactions, trendGranularity]);

  // Section 10: Retention by RFM Segment
  const rfmRetentionBreakdown = useMemo(() => {
    const segMap = new Map<string, { total: number; returning: number; spend: number }>();

    customerRetentionProfiles.forEach((c) => {
      const cur = segMap.get(c.rfm_segment) || { total: 0, returning: 0, spend: 0 };
      cur.total += 1;
      if (c.customer_type === 'Returning') cur.returning += 1;
      cur.spend += c.total_spend;
      segMap.set(c.rfm_segment, cur);
    });

    return Array.from(segMap.entries())
      .map(([segment, d]) => {
        const repeatRate = d.total > 0 ? (d.returning / d.total) * 100 : 0;
        return {
          segment,
          totalCustomers: d.total,
          returningCustomers: d.returning,
          repeatRate: Number(repeatRate.toFixed(1)),
          spend: d.spend,
        };
      })
      .sort((a, b) => b.repeatRate - a.repeatRate);
  }, [customerRetentionProfiles]);

  // Section 7: Dynamically Generated Retention Insights
  const retentionInsights = useMemo(() => {
    if (kpis.totalCustomers === 0) return [];

    const insights = [];

    // Insight 1: Revenue leverage
    insights.push({
      title: 'Repeat Revenue Multiplier',
      text: `Returning customers contribute ${kpis.returningRevPct}% of total net revenue (${formatCurrency(kpis.returningRevenue)}), while accounting for ${kpis.returningCustomersPct}% of total buyers.`,
      icon: DollarSign,
      color: 'emerald',
    });

    // Insight 2: Repeat Purchase Rate benchmark
    insights.push({
      title: 'Repeat Purchase Health',
      text: `${kpis.returningCustomersPct}% of all evaluated customers have ordered more than once (Repeat Purchase Rate: ${kpis.repeatPurchaseRate}%).`,
      icon: Repeat,
      color: 'indigo',
    });

    // Insight 3: Average Spend comparison
    const spendMultiplier = kpis.newAov > 0 ? (kpis.returningAov / kpis.newAov).toFixed(1) : '1.0';
    const percentHigher = kpis.newAov > 0 ? Math.round(((kpis.returningAov - kpis.newAov) / kpis.newAov) * 100) : 0;
    insights.push({
      title: 'Customer Lifetime Value Expansion',
      text: `Returning buyers spend an average of ${formatCurrency(kpis.returningAov)} (${spendMultiplier}× or +${percentHigher}% higher) compared to ${formatCurrency(kpis.newAov)} for single-order new buyers.`,
      icon: TrendingUp,
      color: 'blue',
    });

    // Insight 4: Trend Direction
    if (retentionTrend.length >= 2) {
      const firstPeriod = retentionTrend[0];
      const lastPeriod = retentionTrend[retentionTrend.length - 1];
      const diff = Number((lastPeriod.repeatRate - firstPeriod.repeatRate).toFixed(1));
      const direction = diff >= 0 ? 'increased' : 'decreased';

      insights.push({
        title: 'Longitudinal Retention Trajectory',
        text: `Repeat purchase rates have ${direction} by ${Math.abs(diff)}% across the observed timeline (from ${firstPeriod.repeatRate}% in ${firstPeriod.label} to ${lastPeriod.repeatRate}% in ${lastPeriod.label}).`,
        icon: Calendar,
        color: diff >= 0 ? 'emerald' : 'amber',
      });
    }

    return insights;
  }, [kpis, retentionTrend]);

  // Filtered & sorted customers for the Table
  const filteredCustomerList = useMemo(() => {
    let list = customerRetentionProfiles.filter((c) => {
      const matchType =
        customerTypeFilter === 'all' ||
        (customerTypeFilter === 'returning' && c.customer_type === 'Returning') ||
        (customerTypeFilter === 'new' && c.customer_type === 'New');

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.customer_name.toLowerCase().includes(q) ||
        c.customer_id.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q);

      return matchType && matchSearch;
    });

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'total_orders') diff = a.total_orders - b.total_orders;
      else if (sortBy === 'total_spend') diff = a.total_spend - b.total_spend;
      else if (sortBy === 'recency_days') diff = a.recency_days - b.recency_days;
      else if (sortBy === 'first_order_date') diff = a.first_order_date.localeCompare(b.first_order_date);
      else if (sortBy === 'customer_name') diff = a.customer_name.localeCompare(b.customer_name);

      return sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [customerRetentionProfiles, customerTypeFilter, searchQuery, sortBy, sortDirection]);

  // Export retention table data to CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer_ID',
      'Customer_Name',
      'Country',
      'City',
      'Customer_Type',
      'First_Purchase_Date',
      'Last_Purchase_Date',
      'Days_Since_Last_Purchase',
      'Number_Of_Orders',
      'Total_Revenue',
      'Average_Order_Value',
      'RFM_Segment',
    ];

    const rows = filteredCustomerList.map((c) => [
      c.customer_id,
      `"${c.customer_name}"`,
      `"${c.country}"`,
      `"${c.city}"`,
      c.customer_type,
      c.first_order_date,
      c.last_order_date,
      c.recency_days,
      c.total_orders,
      c.total_spend,
      c.avg_order_value,
      `"${c.rfm_segment}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_retention_analysis_${new Date().toISOString().split('T')[0]}.csv`);
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
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Customer Retention Analysis
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
            Expected columns: Order_ID, Customer_ID, Order_Date, Net_Revenue (or Quantity & Unit_Price)
          </div>
        </div>
      </div>
    );
  }

  // Calculate SVG dimensions for the Retention Trend Chart
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 25, right: 35, bottom: 40, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;
  const maxRepeatRate = 100;

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-indigo-600" />
              Customer Retention Analysis
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Cohort Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Evaluating repeat purchase rates, new versus returning customer velocity, frequency brackets, and cohort revenue contribution
          </p>
        </div>

        {/* Global Controls & Filters */}
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

          {/* Country Selector */}
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

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Retention CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Retention KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Customers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatNumber(kpis.totalCustomers)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active in period</div>
        </div>

        {/* New Customers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>New Customers</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-700">{formatNumber(kpis.newCustomers)}</div>
          <div className="text-[11px] text-sky-600 font-medium mt-0.5">{kpis.newCustomersPct}% of buyers</div>
        </div>

        {/* Returning Customers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Returning Customers</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">{formatNumber(kpis.returningCustomers)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{kpis.returningCustomersPct}% of buyers</div>
        </div>

        {/* Repeat Purchase Rate */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Repeat Purchase Rate</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">{kpis.repeatPurchaseRate}%</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Returning / Total × 100</div>
        </div>

        {/* Avg Orders per Customer */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Avg Orders / Customer</span>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{kpis.avgOrdersPerCust}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lifetime orders</div>
        </div>

        {/* Average Customer Spend */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Avg Customer Spend</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(kpis.avgCustSpend)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Average revenue/user</div>
        </div>
      </div>

      {/* 2 & 6. New vs Returning Comparison & Revenue Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Cohort Breakdown Card */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">New vs Returning Customer Breakdown</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Total: {formatNumber(kpis.totalCustomers)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* New Customers Card */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900">New Customers</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-300">
                  {kpis.newCustomersPct}%
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-sky-950">
                {formatNumber(kpis.newCustomers)}
              </div>
              <div className="text-[11px] text-sky-700">
                Single-order first-time shoppers in selected period
              </div>
              <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs">
                <span className="text-sky-800">Avg Spend:</span>
                <span className="font-bold font-mono text-sky-950">{formatCurrency(kpis.newAov)}</span>
              </div>
            </div>

            {/* Returning Customers Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Returning Customers</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {kpis.returningCustomersPct}%
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950">
                {formatNumber(kpis.returningCustomers)}
              </div>
              <div className="text-[11px] text-emerald-700">
                Completed 2 or more lifetime transactions
              </div>
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-emerald-800">Avg Spend:</span>
                <span className="font-bold font-mono text-emerald-950">{formatCurrency(kpis.returningAov)}</span>
              </div>
            </div>
          </div>

          {/* Visual Share Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                New: {kpis.newCustomersPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Returning: {kpis.returningCustomersPct}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${kpis.newCustomersPct}%` }}
                title={`New: ${kpis.newCustomersPct}%`}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${kpis.returningCustomersPct}%` }}
                title={`Returning: ${kpis.returningCustomersPct}%`}
              />
            </div>
          </div>
        </div>

        {/* Revenue Contribution Comparison */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Revenue Contribution by Cohort</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Total: {formatCurrency(kpis.totalRevenueSum)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* New Customer Revenue */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                New Buyer Revenue
              </span>
              <div className="text-xl font-bold font-mono text-slate-800">
                {formatCurrency(kpis.newRevenue)}
              </div>
              <div className="text-xs text-sky-600 font-semibold">{kpis.newRevPct}% of total net sales</div>
            </div>

            {/* Returning Customer Revenue */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Returning Buyer Revenue
              </span>
              <div className="text-xl font-bold font-mono text-emerald-900">
                {formatCurrency(kpis.returningRevenue)}
              </div>
              <div className="text-xs text-emerald-700 font-semibold">{kpis.returningRevPct}% of total net sales</div>
            </div>
          </div>

          {/* Revenue Share Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                New Revenue: {kpis.newRevPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Returning Revenue: {kpis.returningRevPct}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${kpis.newRevPct}%` }}
                title={`New Revenue: ${kpis.newRevPct}%`}
              />
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${kpis.returningRevPct}%` }}
                title={`Returning Revenue: ${kpis.returningRevPct}%`}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
            <span>Returning Customer Value Advantage:</span>
            <span className="font-bold font-mono text-indigo-700">
              {kpis.newAov > 0 ? `${(kpis.returningAov / kpis.newAov).toFixed(1)}× higher average spend` : 'High retention leverage'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Time-based Retention Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Longitudinal Customer Retention Trend</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks the Repeat Purchase Rate % and active cohort mix over chronological intervals
            </p>
          </div>

          {/* Month / Quarter Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTrendGranularity('month')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                trendGranularity === 'month'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setTrendGranularity('quarter')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                trendGranularity === 'quarter'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quarterly View
            </button>
          </div>
        </div>

        {/* SVG Chart */}
        {retentionTrend.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
            No retention timeline data available for the chosen filters.
          </div>
        ) : (
          <div className="relative w-full overflow-hidden select-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible font-sans"
              onMouseLeave={() => setHoveredTrendIdx(null)}
            >
              <defs>
                <linearGradient id="repeatRateAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map((rate) => {
                const y = padding.top + plotHeight - (rate / maxRepeatRate) * plotHeight;
                return (
                  <g key={rate}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {rate}%
                    </text>
                  </g>
                );
              })}

              {/* SVG Area & Polyline */}
              {(() => {
                const getX = (i: number) =>
                  padding.left + (i / Math.max(1, retentionTrend.length - 1)) * plotWidth;
                const getY = (val: number) =>
                  padding.top + plotHeight - (val / maxRepeatRate) * plotHeight;

                const pointsStr = retentionTrend
                  .map((d, i) => `${getX(i)},${getY(d.repeatRate)}`)
                  .join(' ');
                const areaStr = `${getX(0)},${getY(0)} ${pointsStr} ${getX(retentionTrend.length - 1)},${getY(0)}`;

                return (
                  <>
                    <polygon points={areaStr} fill="url(#repeatRateAreaGrad)" />
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      points={pointsStr}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Nodes & Hover Hitboxes */}
                    {retentionTrend.map((d, i) => {
                      const cx = getX(i);
                      const cy = getY(d.repeatRate);
                      const isHovered = hoveredTrendIdx === i;

                      return (
                        <g key={i}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 5.5 : 3.5}
                            fill={isHovered ? '#4338ca' : '#4f46e5'}
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-all cursor-pointer"
                          />
                          {/* Invisible hover hitbox */}
                          <rect
                            x={cx - plotWidth / (retentionTrend.length * 2)}
                            y={padding.top}
                            width={plotWidth / retentionTrend.length}
                            height={plotHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredTrendIdx(i)}
                          />
                        </g>
                      );
                    })}
                  </>
                );
              })()}

              {/* X-axis Labels */}
              {retentionTrend.map((d, i) => {
                const getX = (idx: number) =>
                  padding.left + (idx / Math.max(1, retentionTrend.length - 1)) * plotWidth;
                const step = retentionTrend.length > 16 ? 3 : retentionTrend.length > 8 ? 2 : 1;
                if (i % step !== 0 && i !== retentionTrend.length - 1) return null;

                return (
                  <text
                    key={i}
                    x={getX(i)}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-medium"
                  >
                    {d.label}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredTrendIdx !== null && retentionTrend[hoveredTrendIdx] && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-4 pointer-events-none z-10"
              >
                <div>
                  <div className="font-bold text-indigo-300">{retentionTrend[hoveredTrendIdx].label}</div>
                  <div className="text-[10px] text-slate-400">Total Buyers: {retentionTrend[hoveredTrendIdx].totalCustomers}</div>
                </div>
                <div className="border-l border-slate-700 pl-3">
                  <div className="text-[10px] text-slate-400 uppercase">Repeat Rate</div>
                  <div className="font-bold font-mono text-emerald-400">
                    {retentionTrend[hoveredTrendIdx].repeatRate}%
                  </div>
                </div>
                <div className="border-l border-slate-700 pl-3 text-[11px]">
                  <div>Returning: <strong className="text-emerald-300">{retentionTrend[hoveredTrendIdx].returningCustomers}</strong></div>
                  <div>New: <strong className="text-sky-300">{retentionTrend[hoveredTrendIdx].newCustomers}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Customer Purchase Frequency Groups */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Customer Purchase Frequency Distribution</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Categorizes buyers into transaction volume tiers: 1 Order, 2 Orders, 3–5 Orders, 6–10 Orders, and 10+ Orders
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">5 Behavioral Tiers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {frequencyGroups.map((group) => (
            <div key={group.label} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 leading-tight">{group.label}</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">{formatNumber(group.count)}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${group.badgeColor}`}>
                  {group.countPct}%
                </span>
              </div>

              {/* Distribution Bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${group.barColor} rounded-full`}
                  style={{ width: `${group.countPct}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Revenue:</span>
                  <strong className="text-slate-800 font-mono">{formatCurrency(group.spend)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Rev Share:</span>
                  <strong className="text-slate-800 font-mono">{group.spendPct}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Dynamic Retention Insights */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Dynamically Generated Retention Insights (Computed from Dataset)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {retentionInsights.map((ins, idx) => {
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

      {/* 10. Existing RFM Integration: Retention by RFM Segment */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Retention by Existing RFM Customer Segment</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Correlation analysis showing repeat purchase rates across existing RFM behavioral segments
            </p>
          </div>
          <span className="text-[10px] text-slate-400">Preserves Existing RFM Mapping</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">RFM Segment</th>
                <th className="py-2.5 px-3 text-right">Total Customers</th>
                <th className="py-2.5 px-3 text-right">Returning Buyers</th>
                <th className="py-2.5 px-3 text-center">Repeat Purchase Rate</th>
                <th className="py-2.5 px-3 text-right">Cohort Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rfmRetentionBreakdown.map((row) => (
                <tr key={row.segment} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{row.segment}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatNumber(row.totalCustomers)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {formatNumber(row.returningCustomers)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        row.repeatRate >= 70
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.repeatRate >= 40
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.repeatRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(row.spend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Customer Retention Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Customer Retention Explorer</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                {formatNumber(filteredCustomerList.length)} Customers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Granular customer-level retention history, order counts, dates, and average basket sizes
            </p>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Customer Type Filter */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
              {(['all', 'returning', 'new'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCustomerTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                    customerTypeFilter === type
                      ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type === 'returning' ? 'Returning' : 'New'}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="total_orders">Sort by Orders</option>
                <option value="total_spend">Sort by Total Revenue</option>
                <option value="recency_days">Sort by Days Since Purchase</option>
                <option value="first_order_date">Sort by First Purchase Date</option>
                <option value="customer_name">Sort by Customer Name</option>
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
                placeholder="Search name, ID, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-52"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[500px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Name & Location</th>
                <th className="py-2.5 px-3 text-center">Customer Type</th>
                <th className="py-2.5 px-3">First Purchase Date</th>
                <th className="py-2.5 px-3">Last Purchase Date</th>
                <th className="py-2.5 px-3 text-right">Days Since Last</th>
                <th className="py-2.5 px-3 text-right">Total Orders</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3">RFM Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomerList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No customers found matching the search and filter settings.
                  </td>
                </tr>
              ) : (
                filteredCustomerList.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-500">{c.customer_id}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-900">{c.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{c.city}, {c.country}</div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.customer_type === 'Returning'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {c.customer_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono">{c.first_order_date}</td>
                    <td className="py-2 px-3 text-slate-600 font-mono">{c.last_order_date}</td>
                    <td className="py-2 px-3 text-right text-slate-600 font-mono">
                      {c.recency_days} days
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {c.total_orders}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(c.total_spend)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(c.avg_order_value)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {c.rfm_segment}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
