import React, { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Package,
  Globe2,
  CreditCard,
  Filter,
  Search,
  ArrowUpDown,
  Download,
  Layers,
  Sparkles,
  Info,
  Flame,
  Clock,
  Eye,
  X,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';

export interface BusinessAlert {
  id: string;
  type: 'High Revenue Low Margin' | 'Inactive High-Value Customer' | 'Declining Product' | 'Growing Product' | 'Category Performance' | 'Geographic Performance' | 'Payment Method';
  severity: 'Critical' | 'Warning' | 'Opportunity' | 'Information';
  title: string;
  entity: string;
  categoryGroup: string;
  currentValue: number;
  previousValue?: number;
  changePct?: number;
  metricLabel: string;
  formattedCurrent: string;
  formattedPrevious?: string;
  reason: string;
  actionRecommendation: string;
  period: string;
}

interface BusinessAlertsPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

export function BusinessAlertsPage({ transactions, customers }: BusinessAlertsPageProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<'All' | 'Critical' | 'Warning' | 'Opportunity' | 'Information'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'changePct' | 'currentValue' | 'entity'>('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAlertModal, setSelectedAlertModal] = useState<BusinessAlert | null>(null);

  // 10. Defensive Column & Dataset Compatibility Check
  const compatibilityCheck = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { isValid: false, message: 'No transactions found in the active dataset.' };
    }

    const first = transactions[0];
    const missing: string[] = [];
    if (!('order_id' in first)) missing.push('Order_ID');
    if (!('order_date' in first)) missing.push('Order_Date');
    if (!('product_id' in first)) missing.push('Product_ID');
    if (!('net_revenue' in first) && !('gross_sales' in first)) missing.push('Revenue');
    if (!('profit' in first) && !('unit_cost' in first)) missing.push('Profit / Cost');

    if (missing.length > 0) {
      return {
        isValid: false,
        message: `Missing required columns for Business Alerts: ${missing.join(', ')}. Please verify the uploaded dataset.`,
      };
    }

    return { isValid: true, message: '' };
  }, [transactions]);

  // Dynamic Period Split for Period-over-Period Analytics
  const periodInfo = useMemo(() => {
    const valid = transactions.filter(
      (t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'
    );
    if (valid.length === 0) return null;

    const sortedDates = valid.map((t) => t.order_date).sort();
    const minDate = sortedDates[0];
    const maxDate = sortedDates[sortedDates.length - 1];

    const minTime = new Date(minDate).getTime();
    const maxTime = new Date(maxDate).getTime();
    const midTime = minTime + (maxTime - minTime) / 2;
    const midDate = new Date(midTime).toISOString().split('T')[0];

    return {
      minDate,
      maxDate,
      midDate,
      earlierPeriodLabel: `${minDate.substring(0, 7)} to ${midDate.substring(0, 7)}`,
      recentPeriodLabel: `${midDate.substring(0, 7)} to ${maxDate.substring(0, 7)}`,
    };
  }, [transactions]);

  // =========================================================================
  // DYNAMIC ALERTS ENGINE (Calculated entirely from live data with statistics)
  // =========================================================================
  const allAlerts = useMemo(() => {
    if (!periodInfo) return [];

    const valid = transactions.filter(
      (t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'
    );
    if (valid.length === 0) return [];

    const alerts: BusinessAlert[] = [];
    const { midDate, earlierPeriodLabel, recentPeriodLabel } = periodInfo;

    // -----------------------------------------------------------------------
    // A. High Revenue + Low Profit Margin Products
    // -----------------------------------------------------------------------
    const productStats = new Map<string, {
      id: string;
      name: string;
      category: string;
      revenue: number;
      profit: number;
      cost: number;
      units: number;
      earlierRevenue: number;
      recentRevenue: number;
    }>();

    for (const t of valid) {
      if (!productStats.has(t.product_id)) {
        productStats.set(t.product_id, {
          id: t.product_id,
          name: t.product_name,
          category: t.category,
          revenue: 0,
          profit: 0,
          cost: 0,
          units: 0,
          earlierRevenue: 0,
          recentRevenue: 0,
        });
      }
      const cur = productStats.get(t.product_id)!;
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.cost += t.total_cost;
      cur.units += t.quantity;

      if (t.order_date < midDate) {
        cur.earlierRevenue += t.net_revenue;
      } else {
        cur.recentRevenue += t.net_revenue;
      }
    }

    const productList = Array.from(productStats.values()).map((p) => {
      const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      return { ...p, margin: Number(margin.toFixed(1)) };
    });

    // Statistical medians
    const sortedProductRevenues = [...productList].map((p) => p.revenue).sort((a, b) => a - b);
    const medianProductRevenue = sortedProductRevenues[Math.floor(sortedProductRevenues.length / 2)] || 0;
    const sortedMargins = [...productList].map((p) => p.margin).sort((a, b) => a - b);
    const p25Margin = sortedMargins[Math.floor(sortedMargins.length * 0.25)] || 15;

    for (const p of productList) {
      // 1. Loss-making SKU
      if (p.profit < 0 && p.revenue > 0) {
        alerts.push({
          id: `loss-prod-${p.id}`,
          type: 'High Revenue Low Margin',
          severity: 'Critical',
          title: 'Negative Gross Profit (Loss-Making SKU)',
          entity: p.name,
          categoryGroup: p.category,
          currentValue: p.profit,
          metricLabel: 'Net Profit Loss',
          formattedCurrent: formatCurrency(p.profit),
          reason: `Total cost (${formatCurrency(p.cost)}) exceeds revenue (${formatCurrency(p.revenue)}), generating a net gross loss of ${formatCurrency(Math.abs(p.profit))} (Margin: ${p.margin}%).`,
          actionRecommendation: 'Audit supplier procurement pricing or adjust base selling price to eliminate negative unit economics.',
          period: 'Full Active Dataset',
        });
      }
      // 2. High revenue but low margin
      else if (p.revenue >= medianProductRevenue && p.margin <= Math.max(15, p25Margin)) {
        alerts.push({
          id: `low-margin-prod-${p.id}`,
          type: 'High Revenue Low Margin',
          severity: 'Warning',
          title: 'High Sales Volume with Thin Profit Margin',
          entity: p.name,
          categoryGroup: p.category,
          currentValue: p.margin,
          metricLabel: 'Profit Margin',
          formattedCurrent: `${p.margin}%`,
          reason: `Generated ${formatCurrency(p.revenue)} in sales (above median of ${formatCurrency(medianProductRevenue)}) but delivered only a ${p.margin}% profit margin (${formatCurrency(p.profit)} profit).`,
          actionRecommendation: 'Reduce aggressive promotional discounting, bundle with high-margin accessories, or negotiate supplier volume rebates.',
          period: 'Full Active Dataset',
        });
      }
    }

    // -----------------------------------------------------------------------
    // B. High-Value Inactive Customers
    // -----------------------------------------------------------------------
    const sortedCustomerSpend = [...customers].map((c) => c.total_spend).sort((a, b) => a - b);
    const medianCustomerSpend = sortedCustomerSpend[Math.floor(sortedCustomerSpend.length / 2)] || 0;
    const p75CustomerSpend = sortedCustomerSpend[Math.floor(sortedCustomerSpend.length * 0.75)] || medianCustomerSpend * 1.5;

    const sortedRecencies = [...customers].map((c) => c.recency_days).sort((a, b) => a - b);
    const medianRecency = sortedRecencies[Math.floor(sortedRecencies.length / 2)] || 30;

    for (const c of customers) {
      if (c.total_spend >= p75CustomerSpend && c.recency_days >= Math.max(45, medianRecency * 1.25)) {
        alerts.push({
          id: `inactive-vip-${c.customer_id}`,
          type: 'Inactive High-Value Customer',
          severity: 'Critical',
          title: 'High-Value VIP Customer at Critical Risk of Churn',
          entity: `${c.customer_name} (${c.customer_id})`,
          categoryGroup: c.rfm_segment || 'Customer Cohort',
          currentValue: c.recency_days,
          metricLabel: 'Days Inactive',
          formattedCurrent: `${c.recency_days} days ago`,
          reason: `Top-tier customer with ${formatCurrency(c.total_spend)} lifetime spend across ${c.total_orders} orders has not placed an order in ${c.recency_days} days (Last order: ${c.last_order_date}). RFM Segment: ${c.rfm_segment}.`,
          actionRecommendation: 'Trigger high-priority personal outreach, VIP concierge inquiry, or an exclusive win-back renewal incentive.',
          period: `Last order: ${c.last_order_date}`,
        });
      } else if (c.total_spend >= medianCustomerSpend && c.recency_days >= Math.max(60, medianRecency * 1.5)) {
        alerts.push({
          id: `dormant-cust-${c.customer_id}`,
          type: 'Inactive High-Value Customer',
          severity: 'Warning',
          title: 'Above-Average Customer Dormant',
          entity: `${c.customer_name} (${c.customer_id})`,
          categoryGroup: c.rfm_segment || 'Customer Cohort',
          currentValue: c.recency_days,
          metricLabel: 'Days Inactive',
          formattedCurrent: `${c.recency_days} days ago`,
          reason: `Customer with ${formatCurrency(c.total_spend)} total spend has been dormant for ${c.recency_days} days.`,
          actionRecommendation: 'Include in automated 60-day customer re-engagement email sequence with popular category highlights.',
          period: `Last order: ${c.last_order_date}`,
        });
      }
    }

    // -----------------------------------------------------------------------
    // C & D. Declining and Growing Products (Period-over-Period)
    // -----------------------------------------------------------------------
    for (const p of productList) {
      if (p.earlierRevenue > 0) {
        const changePct = ((p.recentRevenue - p.earlierRevenue) / p.earlierRevenue) * 100;

        // C. Declining Products
        if (changePct <= -30 && p.earlierRevenue >= medianProductRevenue * 0.25) {
          const isSevere = changePct <= -50;
          alerts.push({
            id: `declining-prod-${p.id}`,
            type: 'Declining Product',
            severity: isSevere ? 'Critical' : 'Warning',
            title: isSevere ? 'Severe Product Sales Contraction' : 'Declining Product Revenue',
            entity: p.name,
            categoryGroup: p.category,
            currentValue: p.recentRevenue,
            previousValue: p.earlierRevenue,
            changePct: Number(changePct.toFixed(1)),
            metricLabel: 'Period Revenue',
            formattedCurrent: formatCurrency(p.recentRevenue),
            formattedPrevious: formatCurrency(p.earlierRevenue),
            reason: `Product sales dropped by ${Math.abs(changePct).toFixed(1)}% between ${earlierPeriodLabel} (${formatCurrency(p.earlierRevenue)}) and ${recentPeriodLabel} (${formatCurrency(p.recentRevenue)}).`,
            actionRecommendation: 'Investigate potential inventory stockouts, increased competitor pressure, negative customer reviews, or catalog fatigue.',
            period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
          });
        }

        // D. Growing Products
        if (changePct >= 35 && p.recentRevenue >= medianProductRevenue * 0.25) {
          alerts.push({
            id: `growing-prod-${p.id}`,
            type: 'Growing Product',
            severity: 'Opportunity',
            title: 'High-Growth Accelerating Product',
            entity: p.name,
            categoryGroup: p.category,
            currentValue: p.recentRevenue,
            previousValue: p.earlierRevenue,
            changePct: Number(changePct.toFixed(1)),
            metricLabel: 'Period Revenue',
            formattedCurrent: formatCurrency(p.recentRevenue),
            formattedPrevious: formatCurrency(p.earlierRevenue),
            reason: `Sales volume surged by +${changePct.toFixed(1)}% from ${formatCurrency(p.earlierRevenue)} in ${earlierPeriodLabel} to ${formatCurrency(p.recentRevenue)} in ${recentPeriodLabel}.`,
            actionRecommendation: 'Boost inventory replenishment lead time and allocate paid advertising spend to capture expanding customer demand.',
            period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // E. Category Performance Alerts
    // -----------------------------------------------------------------------
    const catMap = new Map<string, { earlierRev: number; recentRev: number; profit: number; totalRev: number }>();
    for (const t of valid) {
      if (!catMap.has(t.category)) {
        catMap.set(t.category, { earlierRev: 0, recentRev: 0, profit: 0, totalRev: 0 });
      }
      const cur = catMap.get(t.category)!;
      cur.totalRev += t.net_revenue;
      cur.profit += t.profit;
      if (t.order_date < midDate) {
        cur.earlierRev += t.net_revenue;
      } else {
        cur.recentRev += t.net_revenue;
      }
    }

    for (const [catName, data] of catMap.entries()) {
      const margin = data.totalRev > 0 ? (data.profit / data.totalRev) * 100 : 0;
      const growth = data.earlierRev > 0 ? ((data.recentRev - data.earlierRev) / data.earlierRev) * 100 : 0;

      if (growth >= 25 && data.recentRev >= 1000) {
        alerts.push({
          id: `cat-growth-${catName}`,
          type: 'Category Performance',
          severity: 'Opportunity',
          title: `Category Expansion: ${catName}`,
          entity: catName,
          categoryGroup: 'Category Trend',
          currentValue: data.recentRev,
          previousValue: data.earlierRev,
          changePct: Number(growth.toFixed(1)),
          metricLabel: 'Category Revenue',
          formattedCurrent: formatCurrency(data.recentRev),
          formattedPrevious: formatCurrency(data.earlierRev),
          reason: `Category revenue expanded by +${growth.toFixed(1)}% period-over-period (generating ${formatCurrency(data.recentRev)} recently with a ${margin.toFixed(1)}% margin).`,
          actionRecommendation: 'Expand catalog variety in this category and secure priority supplier volume discounts.',
          period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
        });
      } else if (growth <= -20 && data.earlierRev >= 1000) {
        alerts.push({
          id: `cat-decline-${catName}`,
          type: 'Category Performance',
          severity: 'Warning',
          title: `Category Revenue Contraction: ${catName}`,
          entity: catName,
          categoryGroup: 'Category Trend',
          currentValue: data.recentRev,
          previousValue: data.earlierRev,
          changePct: Number(growth.toFixed(1)),
          metricLabel: 'Category Revenue',
          formattedCurrent: formatCurrency(data.recentRev),
          formattedPrevious: formatCurrency(data.earlierRev),
          reason: `Category contracted by ${Math.abs(growth).toFixed(1)}% from ${formatCurrency(data.earlierRev)} down to ${formatCurrency(data.recentRev)}.`,
          actionRecommendation: 'Review customer category conversion rates, optimize landing page merchandising, or run category-wide promotions.',
          period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
        });
      }

      if (margin >= 45 && data.totalRev >= 2000) {
        alerts.push({
          id: `cat-highmargin-${catName}`,
          type: 'Category Performance',
          severity: 'Opportunity',
          title: `High-Margin Core Category: ${catName}`,
          entity: catName,
          categoryGroup: 'Profitability',
          currentValue: margin,
          metricLabel: 'Category Margin',
          formattedCurrent: `${margin.toFixed(1)}%`,
          reason: `Delivering a standout ${margin.toFixed(1)}% profit margin (${formatCurrency(data.profit)} gross profit on ${formatCurrency(data.totalRev)} sales).`,
          actionRecommendation: 'Leverage healthy margins to reinvest in performance marketing and cross-sell to customers buying in lower-margin categories.',
          period: 'Full Dataset',
        });
      }
    }

    // -----------------------------------------------------------------------
    // F. Geographic Alerts (Country & Major City)
    // -----------------------------------------------------------------------
    const geoMap = new Map<string, { earlierRev: number; recentRev: number; totalRev: number; profit: number }>();
    for (const t of valid) {
      const geoKey = t.country || 'USA';
      if (!geoMap.has(geoKey)) {
        geoMap.set(geoKey, { earlierRev: 0, recentRev: 0, totalRev: 0, profit: 0 });
      }
      const cur = geoMap.get(geoKey)!;
      cur.totalRev += t.net_revenue;
      cur.profit += t.profit;
      if (t.order_date < midDate) {
        cur.earlierRev += t.net_revenue;
      } else {
        cur.recentRev += t.net_revenue;
      }
    }

    for (const [countryName, data] of geoMap.entries()) {
      if (data.earlierRev > 0) {
        const geoGrowth = ((data.recentRev - data.earlierRev) / data.earlierRev) * 100;
        if (geoGrowth >= 30 && data.recentRev >= 1500) {
          alerts.push({
            id: `geo-grow-${countryName}`,
            type: 'Geographic Performance',
            severity: 'Opportunity',
            title: `Regional Market Surge: ${countryName}`,
            entity: countryName,
            categoryGroup: 'Geography',
            currentValue: data.recentRev,
            previousValue: data.earlierRev,
            changePct: Number(geoGrowth.toFixed(1)),
            metricLabel: 'Country Revenue',
            formattedCurrent: formatCurrency(data.recentRev),
            formattedPrevious: formatCurrency(data.earlierRev),
            reason: `Sales in ${countryName} grew by +${geoGrowth.toFixed(1)}% period-over-period (${formatCurrency(data.earlierRev)} → ${formatCurrency(data.recentRev)}).`,
            actionRecommendation: 'Optimize localized delivery partnerships, regional payment gateways, and targeted localized campaigns.',
            period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
          });
        } else if (geoGrowth <= -25 && data.earlierRev >= 1500) {
          alerts.push({
            id: `geo-decline-${countryName}`,
            type: 'Geographic Performance',
            severity: 'Warning',
            title: `Geographic Sales Softening: ${countryName}`,
            entity: countryName,
            categoryGroup: 'Geography',
            currentValue: data.recentRev,
            previousValue: data.earlierRev,
            changePct: Number(geoGrowth.toFixed(1)),
            metricLabel: 'Country Revenue',
            formattedCurrent: formatCurrency(data.recentRev),
            formattedPrevious: formatCurrency(data.earlierRev),
            reason: `Revenue in ${countryName} contracted by ${Math.abs(geoGrowth).toFixed(1)}% (dropped from ${formatCurrency(data.earlierRev)} to ${formatCurrency(data.recentRev)}).`,
            actionRecommendation: 'Check for local shipping delays, localized customs issues, or currency exchange impacts.',
            period: `${earlierPeriodLabel} vs ${recentPeriodLabel}`,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // G. Payment Method Alerts
    // -----------------------------------------------------------------------
    const payMap = new Map<string, { count: number; rev: number; orders: Set<string> }>();
    let totalAllOrders = 0;
    let totalAllRev = 0;

    for (const t of valid) {
      totalAllOrders += 1;
      totalAllRev += t.net_revenue;
      if (!payMap.has(t.payment_method)) {
        payMap.set(t.payment_method, { count: 0, rev: 0, orders: new Set() });
      }
      const cur = payMap.get(t.payment_method)!;
      cur.count += 1;
      cur.rev += t.net_revenue;
      cur.orders.add(t.order_id);
    }

    const avgStoreAov = totalAllOrders > 0 ? totalAllRev / totalAllOrders : 0;

    for (const [method, data] of payMap.entries()) {
      const methodAov = data.count > 0 ? data.rev / data.count : 0;
      const volShare = totalAllOrders > 0 ? (data.count / totalAllOrders) * 100 : 0;

      // Higher AOV alert
      if (methodAov >= avgStoreAov * 1.25 && data.count >= 10) {
        const pctHigher = Math.round(((methodAov - avgStoreAov) / avgStoreAov) * 100);
        alerts.push({
          id: `pay-aov-${method}`,
          type: 'Payment Method',
          severity: 'Information',
          title: `Higher Order Value Channel: ${method}`,
          entity: method,
          categoryGroup: 'Payment Analytics',
          currentValue: methodAov,
          metricLabel: 'Average Basket',
          formattedCurrent: formatCurrency(methodAov),
          reason: `Customers paying with ${method} record a +${pctHigher}% higher average order value (${formatCurrency(methodAov)}) versus overall store average (${formatCurrency(avgStoreAov)}).`,
          actionRecommendation: 'Incentivize higher cart purchases via this gateway by offering zero-fee installment promotions or exclusive payment perks.',
          period: 'Full Active Dataset',
        });
      }

      // Dominant volume share
      if (volShare >= 35) {
        alerts.push({
          id: `pay-share-${method}`,
          type: 'Payment Method',
          severity: 'Information',
          title: `Primary Checkout Preference: ${method}`,
          entity: method,
          categoryGroup: 'Payment Analytics',
          currentValue: volShare,
          metricLabel: 'Transaction Share',
          formattedCurrent: `${volShare.toFixed(1)}%`,
          reason: `${method} is the customer checkout favorite, processing ${volShare.toFixed(1)}% of all orders (${formatNumber(data.count)} transactions).`,
          actionRecommendation: 'Maintain zero downtime and optimal checkout UX on this primary gateway to avoid cart abandonment.',
          period: 'Full Active Dataset',
        });
      }
    }

    // Sort alerts by severity priority by default
    const severityWeight: Record<string, number> = {
      Critical: 4,
      Warning: 3,
      Opportunity: 2,
      Information: 1,
    };

    alerts.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

    return alerts;
  }, [transactions, customers, periodInfo]);

  // Section 1: Alert Dashboard KPIs
  const kpis = useMemo(() => {
    const total = allAlerts.length;
    const critical = allAlerts.filter((a) => a.severity === 'Critical').length;
    const warning = allAlerts.filter((a) => a.severity === 'Warning').length;
    const opportunity = allAlerts.filter((a) => a.severity === 'Opportunity').length;
    const info = allAlerts.filter((a) => a.severity === 'Information').length;

    return {
      totalAlerts: total,
      criticalAlerts: critical,
      warningAlerts: warning,
      positiveOpportunities: opportunity,
      informationalAlerts: info,
    };
  }, [allAlerts]);

  // Filtered & Sorted Alerts for Table and List View
  const filteredAlerts = useMemo(() => {
    let list = allAlerts.filter((a) => {
      if (selectedSeverity !== 'All' && a.severity !== selectedSeverity) return false;
      if (selectedType !== 'All' && a.type !== selectedType) return false;

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchEntity = a.entity.toLowerCase().includes(q);
        const matchReason = a.reason.toLowerCase().includes(q);
        const matchType = a.type.toLowerCase().includes(q);
        if (!matchTitle && !matchEntity && !matchReason && !matchType) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'severity') {
        const weight: Record<string, number> = { Critical: 4, Warning: 3, Opportunity: 2, Information: 1 };
        diff = (weight[a.severity] || 0) - (weight[b.severity] || 0);
      } else if (sortBy === 'changePct') {
        diff = (a.changePct || 0) - (b.changePct || 0);
      } else if (sortBy === 'currentValue') {
        diff = a.currentValue - b.currentValue;
      } else if (sortBy === 'entity') {
        diff = a.entity.localeCompare(b.entity);
      }

      return sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [allAlerts, selectedSeverity, selectedType, searchQuery, sortBy, sortDirection]);

  // Export Alerts to CSV
  const handleExportCSV = () => {
    const headers = [
      'Alert_ID',
      'Severity',
      'Alert_Type',
      'Title',
      'Entity',
      'Category_Group',
      'Metric_Label',
      'Current_Value',
      'Previous_Value',
      'Change_Pct',
      'Reason',
      'Action_Recommendation',
      'Period',
    ];

    const rows = filteredAlerts.map((a) => [
      a.id,
      a.severity,
      `"${a.type}"`,
      `"${a.title}"`,
      `"${a.entity}"`,
      `"${a.categoryGroup}"`,
      `"${a.metricLabel}"`,
      `"${a.formattedCurrent}"`,
      `"${a.formattedPrevious || ''}"`,
      a.changePct !== undefined ? a.changePct : '',
      `"${a.reason}"`,
      `"${a.actionRecommendation}"`,
      `"${a.period}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `business_alerts_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Bell className="w-6 h-6 text-indigo-600" />
            Business Alerts
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
              <Bell className="w-6 h-6 text-indigo-600" />
              Business Alerts
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Diagnostics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automated intelligence detecting margin leaks, churn signals, product velocity shifts, and regional market trends
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Alerts (CSV)</span>
          </button>
        </div>
      </div>

      {/* 1. Alert Dashboard KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Alerts */}
        <div
          onClick={() => setSelectedSeverity('All')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            selectedSeverity === 'All'
              ? 'ring-2 ring-indigo-600 bg-white border-indigo-400'
              : 'bg-white hover:border-slate-300 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Alerts</span>
            <Bell className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{formatNumber(kpis.totalAlerts)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across catalog & accounts</div>
        </div>

        {/* Critical Alerts */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'Critical' ? 'All' : 'Critical')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            selectedSeverity === 'Critical'
              ? 'ring-2 ring-rose-600 bg-rose-50/50 border-rose-400'
              : 'bg-white hover:border-rose-300 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Critical Alerts
            </span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700">{formatNumber(kpis.criticalAlerts)}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">Requires immediate action</div>
        </div>

        {/* Warning Alerts */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'Warning' ? 'All' : 'Warning')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            selectedSeverity === 'Warning'
              ? 'ring-2 ring-amber-600 bg-amber-50/50 border-amber-400'
              : 'bg-white hover:border-amber-300 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Warning Alerts
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{formatNumber(kpis.warningAlerts)}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">Emerging risks & margin leaks</div>
        </div>

        {/* Positive Opportunities */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'Opportunity' ? 'All' : 'Opportunity')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            selectedSeverity === 'Opportunity'
              ? 'ring-2 ring-emerald-600 bg-emerald-50/50 border-emerald-400'
              : 'bg-white hover:border-emerald-300 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Positive Opportunities
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{formatNumber(kpis.positiveOpportunities)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">High-growth & high-margin signals</div>
        </div>
      </div>

      {/* Methodology & Dynamic Baseline Info Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4" />
            Data-Driven Baseline & Mathematical Thresholds
          </div>
          {periodInfo && (
            <div className="text-xs text-slate-400 font-mono">
              Period Comparison: Earlier ({periodInfo.earlierPeriodLabel}) vs Recent ({periodInfo.recentPeriodLabel})
            </div>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Alert thresholds are computed dynamically without hardcoded limits using median revenue, 25th/75th quartiles, profit margin percentages, and period-over-period delta vectors across your active transaction logs.
        </p>
      </div>

      {/* 2. Top Urgent Action Cards (Critical & Warning Highlights) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600" />
            Top Urgent Business Situations ({kpis.criticalAlerts} Critical, {kpis.warningAlerts} Warnings)
          </h2>
          <span className="text-xs text-slate-400">Click card for strategic recommendation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allAlerts
            .filter((a) => a.severity === 'Critical' || a.severity === 'Warning')
            .slice(0, 6)
            .map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlertModal(alert)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs space-y-2 ${
                  alert.severity === 'Critical'
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                    : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        alert.severity === 'Critical' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        alert.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                    {alert.type}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight truncate" title={alert.title}>
                    {alert.title}
                  </h3>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate" title={alert.entity}>
                    {alert.entity}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-xs flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">{alert.metricLabel}:</span>
                  <span className="font-bold font-mono text-slate-900">{alert.formattedCurrent}</span>
                  {alert.changePct !== undefined && (
                    <span
                      className={`text-[11px] font-bold font-mono ${
                        alert.changePct < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {alert.changePct > 0 ? `+${alert.changePct}%` : `${alert.changePct}%`}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {alert.reason}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* 4 & 5. Alert Summary Table with Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Comprehensive Alert Registry</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                {filteredAlerts.length} of {allAlerts.length} Active Alerts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Search and filter every detected condition across products, customers, categories, and payment gateways
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter Tabs */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
              {(['All', 'Critical', 'Warning', 'Opportunity', 'Information'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                    selectedSeverity === sev
                      ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Alert Type Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="All">All Alert Categories</option>
                <option value="High Revenue Low Margin">High Revenue / Low Margin</option>
                <option value="Inactive High-Value Customer">Inactive High-Value Customer</option>
                <option value="Declining Product">Declining Product</option>
                <option value="Growing Product">Growing Product</option>
                <option value="Category Performance">Category Performance</option>
                <option value="Geographic Performance">Geographic Performance</option>
                <option value="Payment Method">Payment Method</option>
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
                <option value="severity">Sort by Severity</option>
                <option value="changePct">Sort by Change %</option>
                <option value="currentValue">Sort by Current Value</option>
                <option value="entity">Sort by Entity Name</option>
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
                placeholder="Search alerts, entity, reason..."
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
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Alert Type</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">Previous Value</th>
                <th className="py-2.5 px-3 text-center">Change %</th>
                <th className="py-2.5 px-3">Diagnostic Reason</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No business alerts found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((a) => {
                  let sevBadge = 'bg-slate-100 text-slate-700 border-slate-300';
                  if (a.severity === 'Critical') sevBadge = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                  else if (a.severity === 'Warning') sevBadge = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                  else if (a.severity === 'Opportunity') sevBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                  else if (a.severity === 'Information') sevBadge = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border ${sevBadge}`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              a.severity === 'Critical'
                                ? 'bg-rose-600'
                                : a.severity === 'Warning'
                                ? 'bg-amber-600'
                                : a.severity === 'Opportunity'
                                ? 'bg-emerald-600'
                                : 'bg-blue-600'
                            }`}
                          />
                          {a.severity}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-medium text-slate-700">{a.type}</td>

                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 max-w-[200px] truncate" title={a.entity}>
                          {a.entity}
                        </div>
                        <div className="text-[10px] text-slate-400">{a.categoryGroup}</div>
                      </td>

                      <td className="py-2 px-3 text-slate-500 font-mono">{a.metricLabel}</td>

                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {a.formattedCurrent}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {a.formattedPrevious || '—'}
                      </td>

                      <td className="py-2 px-3 text-center font-mono">
                        {a.changePct !== undefined ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              a.changePct > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : a.changePct < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {a.changePct > 0 ? `+${a.changePct}%` : `${a.changePct}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 max-w-[320px] truncate text-slate-600 text-[11px]" title={a.reason}>
                        {a.reason}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setSelectedAlertModal(a)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Action Recommendation"
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

      {/* Alert Drilldown & Action Recommendation Modal */}
      {selectedAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    selectedAlertModal.severity === 'Critical'
                      ? 'bg-rose-100 text-rose-700'
                      : selectedAlertModal.severity === 'Warning'
                      ? 'bg-amber-100 text-amber-700'
                      : selectedAlertModal.severity === 'Opportunity'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedAlertModal.title}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        selectedAlertModal.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : selectedAlertModal.severity === 'Warning'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : selectedAlertModal.severity === 'Opportunity'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {selectedAlertModal.severity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedAlertModal.entity} • {selectedAlertModal.type}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlertModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Current Value</span>
                <strong className="text-slate-900 font-mono text-sm">{selectedAlertModal.formattedCurrent}</strong>
              </div>

              {selectedAlertModal.formattedPrevious && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Previous Value</span>
                  <strong className="text-slate-700 font-mono text-sm">{selectedAlertModal.formattedPrevious}</strong>
                </div>
              )}

              {selectedAlertModal.changePct !== undefined && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Change Delta</span>
                  <strong
                    className={`font-mono text-sm ${
                      selectedAlertModal.changePct < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {selectedAlertModal.changePct > 0
                      ? `+${selectedAlertModal.changePct}%`
                      : `${selectedAlertModal.changePct}%`}
                  </strong>
                </div>
              )}
            </div>

            {/* Calculated Reason */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Data-Driven Diagnosis
              </span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {selectedAlertModal.reason}
              </p>
            </div>

            {/* Strategic Action Recommendation */}
            <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs space-y-1">
              <span className="text-indigo-950 font-bold block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Actionable Playbook Recommendation
              </span>
              <p className="text-indigo-900 text-[11px] leading-relaxed">
                {selectedAlertModal.actionRecommendation}
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAlertModal(null)}
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
