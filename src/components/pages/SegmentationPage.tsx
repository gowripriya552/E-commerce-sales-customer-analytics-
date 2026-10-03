import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Award,
  HeartHandshake,
  UserPlus,
  AlertTriangle,
  UserMinus,
  Sparkles,
  Info,
  Search,
  Filter,
  Download,
  X,
  Eye,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  ChevronDown,
  ArrowUpDown,
  Flame,
  HelpCircle,
  Layers,
  BarChart2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { CustomerSummary, Transaction, formatCurrency, formatNumber } from '../../data/analyticsEngine';

interface SegmentationPageProps {
  customers: CustomerSummary[];
  transactions?: Transaction[];
}

export function SegmentationPage({ customers, transactions = [] }: SegmentationPageProps) {
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rfm_score' | 'total_spend' | 'total_orders' | 'recency_days' | 'customer_name' | 'rfm_code'>('rfm_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeCustomerModal, setActiveCustomerModal] = useState<CustomerSummary | null>(null);
  const [rfMatrixFilter, setRfMatrixFilter] = useState<{ r: number; f: number } | null>(null);

  const totalCustomers = customers.length;
  const totalRevenue = useMemo(() => customers.reduce((s, c) => s + c.total_spend, 0), [customers]);
  const avgRfmScore = useMemo(() => {
    if (totalCustomers === 0) return 0;
    const sum = customers.reduce((s, c) => s + c.rfm_score, 0);
    return (sum / totalCustomers).toFixed(1);
  }, [customers, totalCustomers]);

  // Distinct countries available in customer dataset
  const availableCountries = useMemo(() => {
    const set = new Set(customers.map((c) => c.country || 'USA'));
    return ['All', ...Array.from(set).sort()];
  }, [customers]);

  // Complete definition of the 8 business segments requested + Inactive/Lost
  const segmentDefinitions = [
    {
      name: 'Champions / VIP',
      icon: Award,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      activeColor: 'ring-2 ring-emerald-600 bg-emerald-50/50 border-emerald-500',
      dotColor: 'bg-emerald-500',
      barColor: 'bg-emerald-500',
      criteria: 'R: 4-5, F: 4-5, M: 4-5',
      profile: 'Your best customers: bought very recently, buy frequently, and spend the most money.',
      strategy: 'Reward with VIP loyalty tiers, concierge support, exclusive early product drops, and personalized notes. Do not spam with aggressive price discounts.',
      priority: 'High Retention',
    },
    {
      name: 'Loyal Customers',
      icon: HeartHandshake,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      activeColor: 'ring-2 ring-indigo-600 bg-indigo-50/50 border-indigo-500',
      dotColor: 'bg-indigo-500',
      barColor: 'bg-indigo-500',
      criteria: 'R: 3-5, F: 3-5, M: 3-5',
      profile: 'Consistent repeat buyers with high customer lifetime value and high trust.',
      strategy: 'Upsell higher-value product tiers, offer loyalty bonus points, solicit genuine reviews, and engage on brand community initiatives.',
      priority: 'Value Growth',
    },
    {
      name: 'Potential Loyal Customers',
      icon: Sparkles,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      activeColor: 'ring-2 ring-blue-600 bg-blue-50/50 border-blue-500',
      dotColor: 'bg-blue-500',
      barColor: 'bg-blue-500',
      criteria: 'R: 3-5, F: 2-3, M: 2-4',
      profile: 'Recent shoppers with good average order value who show signs of forming a buying habit.',
      strategy: 'Recommend complementary product categories and provide time-sensitive discounts for their 3rd or 4th purchase.',
      priority: 'Nurture Habit',
    },
    {
      name: 'New Customers',
      icon: UserPlus,
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      activeColor: 'ring-2 ring-cyan-600 bg-cyan-50/50 border-cyan-500',
      dotColor: 'bg-cyan-500',
      barColor: 'bg-cyan-500',
      criteria: 'R: 4-5, F: 1, M: 1-3',
      profile: 'First-time shoppers who made their initial purchase within recent weeks.',
      strategy: 'Send a welcoming onboarding sequence, check product satisfaction, and offer a 15% discount for a second purchase within 21 days.',
      priority: 'Activation',
    },
    {
      name: 'Promising Customers',
      icon: TrendingUp,
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-300',
      activeColor: 'ring-2 ring-violet-600 bg-violet-50/50 border-violet-500',
      dotColor: 'bg-violet-500',
      barColor: 'bg-violet-500',
      criteria: 'R: 3-4, F: 1-2, M: 1-3',
      profile: 'Shopped recently with modest spend; positive brand sentiment with upside room to grow.',
      strategy: 'Create brand awareness, invite to newsletter or rewards program, and recommend popular trending catalog items.',
      priority: 'Upsell',
    },
    {
      name: 'At-Risk Customers',
      icon: AlertTriangle,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      activeColor: 'ring-2 ring-amber-600 bg-amber-50/50 border-amber-500',
      dotColor: 'bg-amber-500',
      barColor: 'bg-amber-500',
      criteria: 'R: 1-2, F: 3-5, M: 3-5',
      profile: 'High-value past customers who bought often, but have not made any purchases in an extended period.',
      strategy: 'Urgent win-back reactivation email campaign, personalized customer support check-in, or limited-time revival voucher.',
      priority: 'Urgent Retention',
    },
    {
      name: 'Cannot Lose Them',
      icon: Flame,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      activeColor: 'ring-2 ring-rose-600 bg-rose-50/50 border-rose-500',
      dotColor: 'bg-rose-600',
      barColor: 'bg-rose-600',
      criteria: 'R: 1-2, F: 4-5, M: 4-5',
      profile: 'Previously top tier spenders and habitual buyers who have gone completely dark.',
      strategy: 'Executive-level outreach, survey on why they stopped ordering, substantial renewal coupon, or phone/SMS consultation.',
      priority: 'Critical Rescue',
    },
    {
      name: 'Hibernating Customers',
      icon: Calendar,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      activeColor: 'ring-2 ring-orange-600 bg-orange-50/50 border-orange-500',
      dotColor: 'bg-orange-500',
      barColor: 'bg-orange-500',
      criteria: 'R: 1-2, F: 1-2, M: 1-2',
      profile: 'Low recency, low frequency, and low spend. Dormant shoppers drifting towards churn.',
      strategy: 'Automated low-cost re-engagement drip, clearance flash sale alerts, or seasonal reactivations.',
      priority: 'Low-cost Reconnect',
    },
    {
      name: 'Lost / Inactive Customers',
      icon: UserMinus,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      activeColor: 'ring-2 ring-slate-600 bg-slate-100/60 border-slate-500',
      dotColor: 'bg-slate-400',
      barColor: 'bg-slate-400',
      criteria: 'R: 1, F: 1, M: 1',
      profile: 'Lowest recency, frequency, and monetary score. Inactive one-time purchasers from long ago.',
      strategy: 'Exclude from expensive digital retargeting ad campaigns to stop ad spend burn. Run low-cost quarterly reactivation email.',
      priority: 'Cost Reduction',
    },
  ];

  // Calculate live aggregate metrics per segment
  const segmentStats = useMemo(() => {
    return segmentDefinitions.map((def) => {
      const cohort = customers.filter((c) => c.rfm_segment === def.name);
      const count = cohort.length;
      const spend = cohort.reduce((s, c) => s + c.total_spend, 0);
      const profit = cohort.reduce((s, c) => s + c.total_profit, 0);
      const aov = count > 0 ? spend / count : 0;
      const avgRecency = count > 0 ? Math.round(cohort.reduce((s, c) => s + c.recency_days, 0) / count) : 0;
      const avgOrders = count > 0 ? (cohort.reduce((s, c) => s + c.total_orders, 0) / count).toFixed(1) : '0';

      return {
        ...def,
        count,
        countPct: totalCustomers > 0 ? ((count / totalCustomers) * 100).toFixed(1) : '0',
        spend,
        profit,
        spendPct: totalRevenue > 0 ? ((spend / totalRevenue) * 100).toFixed(1) : '0',
        aov,
        avgRecency,
        avgOrders,
      };
    });
  }, [customers, totalCustomers, totalRevenue]);

  // 5x5 Recency vs Frequency Density Matrix
  const rfMatrix = useMemo(() => {
    const grid: { [key: string]: { count: number; spend: number; customers: CustomerSummary[] } } = {};
    for (let r = 1; r <= 5; r++) {
      for (let f = 1; f <= 5; f++) {
        grid[`${r}-${f}`] = { count: 0, spend: 0, customers: [] };
      }
    }

    customers.forEach((c) => {
      const key = `${c.r_score}-${c.f_score}`;
      if (grid[key]) {
        grid[key].count += 1;
        grid[key].spend += c.total_spend;
        grid[key].customers.push(c);
      }
    });

    return grid;
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      const matchSegment = selectedSegment === 'All' || c.rfm_segment === selectedSegment;
      const matchCountry = selectedCountry === 'All' || c.country === selectedCountry;
      const matchRfGrid = rfMatrixFilter === null || (c.r_score === rfMatrixFilter.r && c.f_score === rfMatrixFilter.f);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.customer_name.toLowerCase().includes(q) ||
        c.customer_id.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.rfm_code.includes(q);

      return matchSegment && matchCountry && matchRfGrid && matchSearch;
    });

    // Sorting
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'rfm_score') diff = a.rfm_score - b.rfm_score;
      else if (sortBy === 'total_spend') diff = a.total_spend - b.total_spend;
      else if (sortBy === 'total_orders') diff = a.total_orders - b.total_orders;
      else if (sortBy === 'recency_days') diff = a.recency_days - b.recency_days;
      else if (sortBy === 'rfm_code') diff = a.rfm_code.localeCompare(b.rfm_code);
      else if (sortBy === 'customer_name') diff = a.customer_name.localeCompare(b.customer_name);

      return sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [customers, selectedSegment, selectedCountry, rfMatrixFilter, searchQuery, sortBy, sortDirection]);

  // Export current filtered or all RFM customer list to CSV
  const handleExportRFM = (dataToExport: CustomerSummary[], fileNamePrefix: string) => {
    const headers = [
      'Customer_ID',
      'Customer_Name',
      'Country',
      'City',
      'State',
      'Gender',
      'Age',
      'Recency_Days',
      'Total_Orders',
      'Total_Net_Spend',
      'Total_Profit',
      'Average_Order_Value',
      'First_Order_Date',
      'Last_Order_Date',
      'R_Score',
      'F_Score',
      'M_Score',
      'RFM_Score',
      'RFM_Code',
      'RFM_Segment',
    ];

    const rows = dataToExport.map((c) => [
      c.customer_id,
      `"${c.customer_name}"`,
      `"${c.country}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      c.customer_gender,
      c.customer_age,
      c.recency_days,
      c.total_orders,
      c.total_spend,
      c.total_profit,
      c.avg_order_value,
      c.first_order_date,
      c.last_order_date,
      c.r_score,
      c.f_score,
      c.m_score,
      c.rfm_score,
      `'${c.rfm_code}'`,
      `"${c.rfm_segment}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find customer orders from transactions if provided
  const customerOrders = useMemo(() => {
    if (!activeCustomerModal || transactions.length === 0) return [];
    return transactions
      .filter((t) => t.customer_id === activeCustomerModal.customer_id)
      .sort((a, b) => b.order_date.localeCompare(a.order_date));
  }, [activeCustomerModal, transactions]);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              RFM Customer Segmentation
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Active Dataset ({formatNumber(totalCustomers)} Customers)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Behavioral cohort segmentation dynamically computed from Recency (R), Frequency (F), and Monetary (M) metrics
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExportRFM(customers, 'ecommerce_rfm_all_customers')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export RFM Dataset (CSV)</span>
          </button>

          {filteredCustomers.length < totalCustomers && (
            <button
              onClick={() => handleExportRFM(filteredCustomers, `ecommerce_rfm_${selectedSegment.toLowerCase().replace(/[^a-z0-9]/g, '_')}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Cohort ({filteredCustomers.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Evaluated</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatNumber(totalCustomers)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">100% evaluated on RFM</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Average RFM Score</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {avgRfmScore} <span className="text-xs text-slate-400 font-normal">/ 15</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">R + F + M combined index</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Champions & Loyalists</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          {(() => {
            const champs = segmentStats.find((s) => s.name === 'Champions / VIP')?.spend || 0;
            const loyals = segmentStats.find((s) => s.name === 'Loyal Customers')?.spend || 0;
            const topSpend = champs + loyals;
            const pct = totalRevenue > 0 ? ((topSpend / totalRevenue) * 100).toFixed(1) : '0';
            return (
              <>
                <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(topSpend)}</div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{pct}% of store revenue</div>
              </>
            );
          })()}
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>At-Risk Revenue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          {(() => {
            const atRisk = segmentStats.find((s) => s.name === 'At-Risk Customers')?.spend || 0;
            const cantLose = segmentStats.find((s) => s.name === 'Cannot Lose Them')?.spend || 0;
            const dangerSpend = atRisk + cantLose;
            const pct = totalRevenue > 0 ? ((dangerSpend / totalRevenue) * 100).toFixed(1) : '0';
            return (
              <>
                <div className="text-xl font-bold font-mono text-rose-700">{formatCurrency(dangerSpend)}</div>
                <div className="text-[11px] text-rose-600 font-medium mt-0.5">{pct}% revenue at risk</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* RFM Methodology & Formula Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4" />
            RFM Analytics Methodology & Scoring System
          </div>
          <div className="text-xs text-slate-400 font-mono">
            RFM Score = R Score + F Score + M Score (3 to 15) | RFM Code = [R][F][M] (e.g. 555)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-300">1. Recency (R: 1 to 5)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-200 rounded font-mono">Days Ago</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Calculates days between customer's most recent order and dataset snapshot date. Customers who purchased recently receive higher scores (5 = most recent).
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-emerald-300">2. Frequency (F: 1 to 5)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-200 rounded font-mono">Order Count</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Measures total completed orders placed by the customer. High purchase cadence receives a score of 5, identifying recurring brand advocates vs one-time buyers.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sky-300">3. Monetary (M: 1 to 5)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-sky-950 text-sky-200 rounded font-mono">Total Spend</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Total lifetime net revenue contributed by the customer. Higher spenders receive a score of 5, helping pinpoint the top 20% of buyers generating 80% of revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics: Segment Distribution & RF Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pareto Revenue vs Customer Distribution */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Segment Share & Revenue Contribution</h2>
            </div>
            <span className="text-[10px] text-slate-400">Customer Base % vs Revenue %</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {segmentStats.map((seg) => {
              const countPctNum = parseFloat(seg.countPct);
              const spendPctNum = parseFloat(seg.spendPct);

              return (
                <div key={seg.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${seg.dotColor}`} />
                      <span className="font-semibold text-slate-800 text-[11px]">{seg.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({seg.count} buyers)</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-slate-600">Cust: {seg.countPct}%</span>
                      <span className="font-bold text-slate-900">Rev: {seg.spendPct}% ({formatCurrency(seg.spend)})</span>
                    </div>
                  </div>

                  {/* Dual comparison bar */}
                  <div className="grid grid-cols-2 gap-2 h-2">
                    <div className="w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${seg.barColor} opacity-70`} style={{ width: `${Math.min(100, countPctNum * 2)}%` }} />
                    </div>
                    <div className="w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${seg.barColor}`} style={{ width: `${Math.min(100, spendPctNum * 2)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Left bar: Customer Count %</span>
            <span>Right bar: Net Revenue %</span>
          </div>
        </div>

        {/* 5x5 Recency vs Frequency Interactive Matrix */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">5×5 RF Density Grid</h2>
            </div>
            {rfMatrixFilter ? (
              <button
                onClick={() => setRfMatrixFilter(null)}
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Reset Grid Filter (R:{rfMatrixFilter.r}, F:{rfMatrixFilter.f})
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">Click any cell to filter</span>
            )}
          </div>

          <div className="pt-1">
            <div className="text-[10px] font-bold text-slate-500 text-center mb-1">
              Frequency Score (1 → 5)
            </div>

            <div className="grid grid-cols-6 gap-1 text-center text-xs">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center">R / F</div>
              {[1, 2, 3, 4, 5].map((f) => (
                <div key={f} className="text-[10px] font-mono font-bold text-slate-600 py-0.5">
                  F{f}
                </div>
              ))}

              {[5, 4, 3, 2, 1].map((r) => (
                <React.Fragment key={r}>
                  <div className="text-[10px] font-mono font-bold text-slate-600 flex items-center justify-center">
                    R{r}
                  </div>
                  {[1, 2, 3, 4, 5].map((f) => {
                    const cell = rfMatrix[`${r}-${f}`];
                    const count = cell ? cell.count : 0;
                    const isSelected = rfMatrixFilter?.r === r && rfMatrixFilter?.f === f;

                    // Color cell density
                    let cellBg = 'bg-slate-50 text-slate-400';
                    if (count > 0) {
                      if (r >= 4 && f >= 4) cellBg = 'bg-emerald-100 text-emerald-900 font-bold border-emerald-300';
                      else if (r <= 2 && f >= 4) cellBg = 'bg-rose-100 text-rose-900 font-bold border-rose-300';
                      else if (r >= 3 && f >= 3) cellBg = 'bg-indigo-100 text-indigo-900 font-bold border-indigo-300';
                      else if (r <= 2 && f <= 2) cellBg = 'bg-slate-200 text-slate-800 border-slate-300';
                      else cellBg = 'bg-blue-100 text-blue-900 border-blue-200';
                    }

                    return (
                      <button
                        key={`${r}-${f}`}
                        onClick={() => {
                          if (isSelected) setRfMatrixFilter(null);
                          else setRfMatrixFilter({ r, f });
                        }}
                        className={`h-8 rounded flex items-center justify-center text-[11px] font-mono border transition-all cursor-pointer ${cellBg} ${
                          isSelected ? 'ring-2 ring-indigo-600 scale-105 shadow-xs z-10' : 'hover:scale-102'
                        }`}
                        title={`Recency: ${r}, Frequency: ${f} — ${count} customers`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Champions (R4-5, F4-5)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Cannot Lose (R1-2, F4-5)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segment Cards Grid (All 8-9 business segments) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Customer Segment Profiles & Playbooks</span>
            <span className="text-xs text-slate-400 font-normal">({segmentStats.length} cohorts classified)</span>
          </h2>
          <span className="text-xs text-slate-500">Click any card to filter customer table</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segmentStats.map((seg) => {
            const isSelected = selectedSegment === seg.name;
            const Icon = seg.icon;

            return (
              <div
                key={seg.name}
                onClick={() => setSelectedSegment(isSelected ? 'All' : seg.name)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  isSelected
                    ? seg.activeColor
                    : 'bg-white hover:border-slate-300 border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${seg.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">{seg.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{seg.criteria}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${seg.badgeColor}`}>
                    {seg.count} ({seg.countPct}%)
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-1.5 my-3 p-2 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 text-[9px] block uppercase">Revenue</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {formatCurrency(seg.spend)}
                    </span>
                    <span className="text-[9px] text-slate-500 block">({seg.spendPct}%)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block uppercase">AOV</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {formatCurrency(seg.aov)}
                    </span>
                    <span className="text-[9px] text-slate-500 block">per order</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block uppercase">Recency</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {seg.avgRecency}d
                    </span>
                    <span className="text-[9px] text-slate-500 block">avg days</span>
                  </div>
                </div>

                {/* Profile Description */}
                <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">
                  {seg.profile}
                </p>

                {/* Marketing Strategy */}
                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <strong className="text-slate-700">Strategy: </strong>
                  {seg.strategy}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Explorer Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Table Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {selectedSegment === 'All' ? 'All Segment Customers' : `${selectedSegment} Cohort`}
              </h2>
              {selectedSegment !== 'All' && (
                <button
                  onClick={() => setSelectedSegment('All')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Clear Segment Filter
                </button>
              )}
              {rfMatrixFilter && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Grid Filter: R{rfMatrixFilter.r}, F{rfMatrixFilter.f}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {formatNumber(filteredCustomers.length)} of {formatNumber(totalCustomers)} customers matching criteria
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Country Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Countries' : c}
                  </option>
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
                <option value="rfm_score">Sort by RFM Score</option>
                <option value="total_spend">Sort by Total Spend</option>
                <option value="total_orders">Sort by Total Orders</option>
                <option value="recency_days">Sort by Recency (Days)</option>
                <option value="rfm_code">Sort by RFM Code</option>
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
                placeholder="Search name, ID, city, code (555)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Quick Segment Filter Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedSegment('All')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedSegment === 'All'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Segments ({totalCustomers})
          </button>

          {segmentStats.map((s) => (
            <button
              key={s.name}
              onClick={() => setSelectedSegment(s.name)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedSegment === s.name
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.name}</span>
              <span className="font-mono text-[10px] text-slate-400">({s.count})</span>
            </button>
          ))}
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[520px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-center">RFM Code</th>
                <th className="py-2.5 px-3 text-center">RFM Score</th>
                <th className="py-2.5 px-3 text-center">R</th>
                <th className="py-2.5 px-3 text-center">F</th>
                <th className="py-2.5 px-3 text-center">M</th>
                <th className="py-2.5 px-3 text-right">Recency</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Total Net Spend</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3">Customer Segment</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    No customers found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const segDef = segmentDefinitions.find((s) => s.name === c.rfm_segment);

                  return (
                    <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{c.customer_id}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        <div>{c.customer_name}</div>
                        <div className="text-[10px] text-slate-400">{c.customer_gender}, {c.customer_age} yrs</div>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <div>{c.city}</div>
                        <div className="text-[10px] text-slate-400">{c.country}</div>
                      </td>

                      {/* RFM Code (e.g. 555) */}
                      <td className="py-2 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {c.rfm_code}
                        </span>
                      </td>

                      {/* RFM Combined Score (3 to 15) */}
                      <td className="py-2 px-3 text-center font-mono">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-900">
                          <span>{c.rfm_score}</span>
                          <span className="text-[10px] text-slate-400 font-normal">/15</span>
                        </div>
                      </td>

                      {/* Individual R, F, M 1-5 Scores */}
                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.r_score >= 4 ? 'bg-emerald-100 text-emerald-800' : c.r_score >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {c.r_score}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.f_score >= 4 ? 'bg-emerald-100 text-emerald-800' : c.f_score >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.f_score}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.m_score >= 4 ? 'bg-emerald-100 text-emerald-800' : c.m_score >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.m_score}
                        </span>
                      </td>

                      {/* Values */}
                      <td className="py-2 px-3 text-right text-slate-600 font-mono">
                        {c.recency_days} days
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                        {c.total_orders}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(c.total_spend)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(c.avg_order_value)}
                      </td>

                      {/* Segment Tag */}
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${segDef?.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                          {c.rfm_segment}
                        </span>
                      </td>

                      {/* Action Modal */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setActiveCustomerModal(c)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Customer RFM Drilldown"
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

      {/* Customer RFM Drilldown Modal */}
      {activeCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{activeCustomerModal.customer_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{activeCustomerModal.customer_id}</span>
                    <span>•</span>
                    <span>{activeCustomerModal.city}, {activeCustomerModal.country}</span>
                    <span>•</span>
                    <span>{activeCustomerModal.customer_gender}, {activeCustomerModal.customer_age} yrs</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveCustomerModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segment & RFM Score Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned RFM Segment</span>
                <span className="text-sm font-bold text-indigo-700">
                  {activeCustomerModal.rfm_segment}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Combined Code</span>
                  <span className="text-sm font-bold font-mono text-slate-900 px-2 py-0.5 bg-white rounded border border-slate-200">
                    {activeCustomerModal.rfm_code}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">RFM Score</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {activeCustomerModal.rfm_score} <span className="text-xs text-slate-400">/ 15</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Metric Gauges (R, F, M) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Recency</span>
                  <span className="font-mono font-bold text-indigo-600">R-Score: {activeCustomerModal.r_score}/5</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-1.5">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(activeCustomerModal.r_score / 5) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">
                  Last purchase: <strong className="text-slate-800">{activeCustomerModal.recency_days} days ago</strong> ({activeCustomerModal.last_order_date})
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Frequency</span>
                  <span className="font-mono font-bold text-indigo-600">F-Score: {activeCustomerModal.f_score}/5</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-1.5">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(activeCustomerModal.f_score / 5) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">
                  Total orders: <strong className="text-slate-800">{activeCustomerModal.total_orders} orders</strong> (First: {activeCustomerModal.first_order_date})
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Monetary</span>
                  <span className="font-mono font-bold text-indigo-600">M-Score: {activeCustomerModal.m_score}/5</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-1.5">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(activeCustomerModal.m_score / 5) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">
                  Net spend: <strong className="text-slate-800">{formatCurrency(activeCustomerModal.total_spend)}</strong> (AOV: {formatCurrency(activeCustomerModal.avg_order_value)})
                </div>
              </div>
            </div>

            {/* Strategic Recommended Marketing Touchpoint */}
            <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Recommended Marketing Action for {activeCustomerModal.customer_name}
              </div>
              <p className="text-indigo-900 leading-relaxed text-[11px]">
                {segmentDefinitions.find((s) => s.name === activeCustomerModal.rfm_segment)?.strategy}
              </p>
            </div>

            {/* Recent Orders List if available */}
            {customerOrders.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Recorded Order History ({customerOrders.length} transactions)</h4>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2">Order ID</th>
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2">Product</th>
                        <th className="py-1.5 px-2 text-right">Qty</th>
                        <th className="py-1.5 px-2 text-right">Revenue</th>
                        <th className="py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerOrders.map((ord, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2 font-mono text-slate-500">{ord.order_id}</td>
                          <td className="py-1.5 px-2 text-slate-600">{ord.order_date}</td>
                          <td className="py-1.5 px-2 text-slate-800 font-medium truncate max-w-[150px]">{ord.product_name}</td>
                          <td className="py-1.5 px-2 text-right">{ord.quantity}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold">{formatCurrency(ord.net_revenue)}</td>
                          <td className="py-1.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              {ord.order_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveCustomerModal(null)}
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
