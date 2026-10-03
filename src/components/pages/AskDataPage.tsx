import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Globe2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  MapPin,
  Database,
  BarChart3,
  Trash2,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';

interface AskDataPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

interface SupportingRow {
  rank?: number;
  label: string;
  primaryValue: string;
  rawNumeric: number;
  secondaryValue?: string;
  sharePct?: string;
}

interface QueryEvaluationResult {
  status: 'answered' | 'missing_column' | 'unsupported' | 'empty_data';
  question: string;
  answerText: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  calculationFormula: string;
  categoryBadge: string;
  columnHeaderLabel: string;
  columnHeaderValue: string;
  columnHeaderSecondary?: string;
  supportingRows: SupportingRow[];
  missingColumnName?: string;
  explanationNote?: string;
}

export function AskDataPage({ transactions, customers }: AskDataPageProps) {
  const [questionInput, setQuestionInput] = useState<string>('');
  const [activeQuestion, setActiveQuestion] = useState<string>(
    'Which country generated the highest revenue?'
  );
  const [questionHistory, setQuestionHistory] = useState<string[]>([
    'Which country generated the highest revenue?',
  ]);

  // Global Filters (Step 8: Follow Existing Filters)
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | '2024' | '2023' | 'last12m'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  // Available Filter Options
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

  const availablePayments = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.payment_method) set.add(t.payment_method);
    });
    return ['All', ...Array.from(set).sort()];
  }, [transactions]);

  // Filtered Transactions respecting user's selected filters
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
    if (paymentFilter !== 'All') {
      list = list.filter((t) => t.payment_method === paymentFilter);
    }

    if (timeframeFilter === '2024') {
      list = list.filter((t) => t.order_date.startsWith('2024'));
    } else if (timeframeFilter === '2023') {
      list = list.filter((t) => t.order_date.startsWith('2023'));
    } else if (timeframeFilter === 'last12m') {
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
  }, [transactions, countryFilter, categoryFilter, paymentFilter, timeframeFilter]);

  // Filtered Customers derived dynamically from filteredTransactions (preserving RFM segments)
  const filteredCustomers = useMemo(() => {
    if (
      countryFilter === 'All' &&
      categoryFilter === 'All' &&
      paymentFilter === 'All' &&
      timeframeFilter === 'all'
    ) {
      return customers;
    }

    const rfmLookup = new Map<string, CustomerSummary>();
    customers.forEach((c) => rfmLookup.set(c.customer_id, c));

    const map = new Map<
      string,
      {
        customer_id: string;
        customer_name: string;
        country: string;
        city: string;
        orders: Set<string>;
        spend: number;
        profit: number;
        firstDate: string;
        lastDate: string;
      }
    >();

    for (const t of filteredTransactions) {
      if (!map.has(t.customer_id)) {
        map.set(t.customer_id, {
          customer_id: t.customer_id,
          customer_name: t.customer_name,
          country: t.country || 'USA',
          city: t.city,
          orders: new Set(),
          spend: 0,
          profit: 0,
          firstDate: t.order_date,
          lastDate: t.order_date,
        });
      }
      const cur = map.get(t.customer_id)!;
      cur.orders.add(t.order_id);
      cur.spend += t.net_revenue;
      cur.profit += t.profit;
      if (t.order_date < cur.firstDate) cur.firstDate = t.order_date;
      if (t.order_date > cur.lastDate) cur.lastDate = t.order_date;
    }

    return Array.from(map.values()).map((c) => {
      const base = rfmLookup.get(c.customer_id);
      const totalOrders = c.orders.size;
      const totalSpend = Number(c.spend.toFixed(2));
      const aov = totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0;

      return {
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_age: base?.customer_age || 32,
        customer_gender: base?.customer_gender || 'Female',
        city: c.city,
        state: base?.state || '',
        country: c.country,
        total_orders: totalOrders,
        total_spend: totalSpend,
        total_profit: Number(c.profit.toFixed(2)),
        avg_order_value: aov,
        first_order_date: c.firstDate,
        last_order_date: c.lastDate,
        recency_days: base?.recency_days || 15,
        r_score: base?.r_score || 3,
        f_score: base?.f_score || 3,
        m_score: base?.m_score || 3,
        rfm_score: base?.rfm_score || 9,
        rfm_code: base?.rfm_code || '333',
        rfm_segment: base?.rfm_segment || (totalOrders > 1 ? 'Loyal Customers' : 'New Customers'),
      };
    });
  }, [
    filteredTransactions,
    customers,
    countryFilter,
    categoryFilter,
    paymentFilter,
    timeframeFilter,
  ]);

  // 14. Suggested Questions
  const suggestedQuestions = [
    'Which country generated the highest revenue?',
    'What are the top 5 products by profit?',
    'Which category has the highest profit margin?',
    'How many returning customers do we have?',
    'Which city generated the most revenue?',
    'What is the average order value?',
    'What are the top 10 products by revenue?',
    'Which customer segment has the highest revenue?',
    'What was the highest-sales month?',
    'Which payment method generated the most revenue?',
    'Which product sold the most units?',
    'What is the average customer lifetime value?',
  ];

  // Check column availability in the currently loaded dataset
  const columnAvailability = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        hasData: false,
        hasCountry: false,
        hasCity: false,
        hasCategory: false,
        hasProduct: false,
        hasPaymentMethod: false,
        hasProfit: false,
        hasQuantity: false,
        hasCustomer: false,
        hasOrderDate: false,
      };
    }

    const sample = transactions[0];
    return {
      hasData: true,
      hasCountry: Boolean(sample.country && sample.country !== 'Unknown'),
      hasCity: Boolean(sample.city && sample.city !== 'Unknown'),
      hasCategory: Boolean(sample.category && sample.category !== 'Uncategorized'),
      hasProduct: Boolean(sample.product_name || sample.product_id),
      hasPaymentMethod: Boolean(sample.payment_method),
      hasProfit: typeof sample.profit === 'number' && !isNaN(sample.profit),
      hasQuantity: typeof sample.quantity === 'number' && !isNaN(sample.quantity),
      hasCustomer: Boolean(sample.customer_id),
      hasOrderDate: Boolean(sample.order_date),
    };
  }, [transactions]);

  // ============================================================================
  // CONTROLLED SAFE ANALYTICAL QUERY ENGINE (100% Data-Driven, No Hallucinations)
  // ============================================================================
  const evaluationResult = useMemo<QueryEvaluationResult>(() => {
    const rawQ = activeQuestion.trim();
    const q = rawQ.toLowerCase();

    if (!columnAvailability.hasData || filteredTransactions.length === 0) {
      return {
        status: 'empty_data',
        question: rawQ,
        answerText: 'No transactions match the current filter selection or dataset.',
        primaryMetricLabel: 'Active Records',
        primaryMetricValue: '0',
        calculationFormula: 'COUNT(Filtered_Transactions) = 0',
        categoryBadge: 'Empty Filter Scope',
        columnHeaderLabel: 'Metric',
        columnHeaderValue: 'Value',
        supportingRows: [],
        explanationNote: 'Try resetting your Country, Category, or Timeframe filters to broaden the dataset scope.',
      };
    }

    // Parse optional top-N number from question (e.g. "top 5", "top 10", "top 3")
    const topNMatch = q.match(/top\s+(\d+)/i);
    const requestedLimit = topNMatch ? Math.min(25, Math.max(1, parseInt(topNMatch[1], 10))) : 10;

    // Detect direction: lowest / worst / least vs highest / most / best / top
    const isLowest =
      q.includes('lowest') ||
      q.includes('least') ||
      q.includes('worst') ||
      q.includes('bottom') ||
      q.includes('minimum') ||
      q.includes('slowest') ||
      q.includes('underperform');

    // Total baseline metrics on filteredTransactions
    const totalRevenue = filteredTransactions.reduce((s, t) => s + t.net_revenue, 0);
    const totalProfit = filteredTransactions.reduce((s, t) => s + t.profit, 0);
    const totalUnits = filteredTransactions.reduce((s, t) => s + t.quantity, 0);
    const uniqueOrderIds = new Set(filteredTransactions.map((t) => t.order_id));
    const totalOrders = Math.max(1, uniqueOrderIds.size);
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Check for unsupported out-of-domain questions first
    const unsupportedKeywords = [
      'weather',
      'temperature',
      'stock price',
      'share price',
      'employee',
      'salary',
      'payroll',
      'competitor',
      'website traffic',
      'page views',
      'bounce rate',
      'social media',
      'followers',
      'ceo',
      'warehouse rent',
      'tax rate',
    ];
    for (const kw of unsupportedKeywords) {
      if (q.includes(kw)) {
        return {
          status: 'unsupported',
          question: rawQ,
          answerText: "I can't answer this question using the available dataset.",
          primaryMetricLabel: 'Unsupported Domain',
          primaryMetricValue: 'N/A',
          calculationFormula: 'Column / Domain Not Present in Schema',
          categoryBadge: 'Unsupported Query',
          columnHeaderLabel: 'Available Schema Domain',
          columnHeaderValue: 'Supported Metrics',
          supportingRows: [
            { label: 'Revenue & Sales', primaryValue: 'Net Revenue, Gross Sales, AOV', rawNumeric: 1 },
            { label: 'Profitability', primaryValue: 'Net Profit, Cost, Profit Margin %', rawNumeric: 1 },
            { label: 'Customers & Retention', primaryValue: 'Total, New, Returning, RFM, CLV', rawNumeric: 1 },
            { label: 'Product Catalog', primaryValue: 'Product Name, Category, Units Sold', rawNumeric: 1 },
            { label: 'Geography & Time', primaryValue: 'Country, City, Order Date, Payment Method', rawNumeric: 1 },
          ],
          explanationNote: `The dataset does not contain information regarding "${kw}". You can ask questions about Revenue, Profit, Products, Categories, Customers, RFM Segments, Retention, CLV, Countries, Cities, Payment Methods, or Time Periods.`,
        };
      }
    }

    // -------------------------------------------------------------------------
    // 1. PAYMENT METHOD QUERIES
    // -------------------------------------------------------------------------
    if (q.includes('payment') || q.includes('upi') || q.includes('paypal') || q.includes('credit card') || q.includes('debit card') || q.includes('cash on delivery')) {
      if (!columnAvailability.hasPaymentMethod) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Payment_Method.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Payment_Method',
          calculationFormula: 'Requires Column: Payment_Method',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Payment_Method',
        };
      }

      const payMap = new Map<string, { revenue: number; profit: number; orders: Set<string>; units: number }>();
      for (const t of filteredTransactions) {
        const method = t.payment_method || 'Unknown';
        if (!payMap.has(method)) {
          payMap.set(method, { revenue: 0, profit: 0, orders: new Set(), units: 0 });
        }
        const cur = payMap.get(method)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.orders.add(t.order_id);
        cur.units += t.quantity;
      }

      const wantsAov = q.includes('average order value') || q.includes('aov');
      const wantsProfit = q.includes('profit');
      const wantsOrders = q.includes('order') && !wantsAov;

      const list = Array.from(payMap.entries()).map(([method, d]) => {
        const orderCount = Math.max(1, d.orders.size);
        const aov = d.revenue / orderCount;
        return {
          method,
          revenue: d.revenue,
          profit: d.profit,
          orders: d.orders.size,
          aov,
        };
      });

      list.sort((a, b) => {
        const valA = wantsAov ? a.aov : wantsProfit ? a.profit : wantsOrders ? a.orders : a.revenue;
        const valB = wantsAov ? b.aov : wantsProfit ? b.profit : wantsOrders ? b.orders : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const share = totalRevenue > 0 ? ((top.revenue / totalRevenue) * 100).toFixed(1) : '0';

      if (wantsAov) {
        return {
          status: 'answered',
          question: rawQ,
          answerText: `${top.method} has the ${isLowest ? 'lowest' : 'highest'} average order value at ${formatCurrency(top.aov)} across ${formatNumber(top.orders)} orders.`,
          primaryMetricLabel: `${top.method} AOV`,
          primaryMetricValue: formatCurrency(top.aov),
          calculationFormula: 'GROUP BY Payment_Method → SUM(Net_Revenue) ÷ COUNT(DISTINCT Order_ID)',
          categoryBadge: 'Payment Analytics',
          columnHeaderLabel: 'Payment Method',
          columnHeaderValue: 'Average Order Value',
          columnHeaderSecondary: 'Total Revenue & Orders',
          supportingRows: list.map((item, i) => ({
            rank: i + 1,
            label: item.method,
            primaryValue: formatCurrency(item.aov),
            rawNumeric: item.aov,
            secondaryValue: `${formatCurrency(item.revenue)} (${formatNumber(item.orders)} orders)`,
          })),
        };
      }

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.method} generated the ${isLowest ? 'lowest' : 'highest'} ${wantsProfit ? 'profit' : 'revenue'} at ${formatCurrency(wantsProfit ? top.profit : top.revenue)} (${share}% of total revenue across ${formatNumber(top.orders)} orders).`,
        primaryMetricLabel: `${top.method} ${wantsProfit ? 'Profit' : 'Revenue'}`,
        primaryMetricValue: formatCurrency(wantsProfit ? top.profit : top.revenue),
        calculationFormula: `GROUP BY Payment_Method → SUM(${wantsProfit ? 'Profit' : 'Net_Revenue'}) → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'Payment Method Analysis',
        columnHeaderLabel: 'Payment Method',
        columnHeaderValue: wantsProfit ? 'Total Profit' : 'Total Revenue',
        columnHeaderSecondary: 'Orders & Share %',
        supportingRows: list.map((item, i) => ({
          rank: i + 1,
          label: item.method,
          primaryValue: formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsProfit ? item.profit : item.revenue,
          secondaryValue: `${formatNumber(item.orders)} orders (${((item.revenue / Math.max(1, totalRevenue)) * 100).toFixed(1)}%)`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 2. GEOGRAPHIC QUERIES: COUNTRY
    // -------------------------------------------------------------------------
    if (q.includes('country') || q.includes('countries') || q.includes('nation')) {
      if (!columnAvailability.hasCountry) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Country.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Country',
          calculationFormula: 'Requires Column: Country',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Country',
        };
      }

      const countryMap = new Map<string, { revenue: number; profit: number; orders: Set<string>; units: number }>();
      for (const t of filteredTransactions) {
        const c = t.country || 'USA';
        if (!countryMap.has(c)) {
          countryMap.set(c, { revenue: 0, profit: 0, orders: new Set(), units: 0 });
        }
        const cur = countryMap.get(c)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.orders.add(t.order_id);
        cur.units += t.quantity;
      }

      const wantsProfit = q.includes('profit') && !q.includes('margin');
      const wantsMargin = q.includes('margin');
      const wantsOrders = q.includes('order') || q.includes('quantity') || q.includes('units');

      const list = Array.from(countryMap.entries()).map(([country, d]) => {
        const margin = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
        return {
          country,
          revenue: d.revenue,
          profit: d.profit,
          orders: d.orders.size,
          units: d.units,
          margin,
        };
      });

      list.sort((a, b) => {
        const valA = wantsMargin ? a.margin : wantsProfit ? a.profit : wantsOrders ? a.orders : a.revenue;
        const valB = wantsMargin ? b.margin : wantsProfit ? b.profit : wantsOrders ? b.orders : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const share = totalRevenue > 0 ? ((top.revenue / totalRevenue) * 100).toFixed(1) : '0';

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.country} generated the ${isLowest ? 'lowest' : 'highest'} ${
          wantsMargin ? 'profit margin' : wantsProfit ? 'profit' : 'revenue'
        } at ${
          wantsMargin
            ? `${top.margin.toFixed(1)}%`
            : formatCurrency(wantsProfit ? top.profit : top.revenue)
        } (${share}% of global revenue across ${formatNumber(top.orders)} orders).`,
        primaryMetricLabel: `${top.country}`,
        primaryMetricValue: wantsMargin
          ? `${top.margin.toFixed(1)}% Margin`
          : formatCurrency(wantsProfit ? top.profit : top.revenue),
        calculationFormula: `GROUP BY Country → ${
          wantsMargin ? 'SUM(Profit) ÷ SUM(Net_Revenue)' : `SUM(${wantsProfit ? 'Profit' : 'Net_Revenue'})`
        } → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'Country Analytics',
        columnHeaderLabel: 'Country',
        columnHeaderValue: wantsMargin ? 'Profit Margin %' : wantsProfit ? 'Profit' : 'Revenue',
        columnHeaderSecondary: 'Orders & Share %',
        supportingRows: list.slice(0, requestedLimit).map((item, i) => ({
          rank: i + 1,
          label: item.country,
          primaryValue: wantsMargin
            ? `${item.margin.toFixed(1)}%`
            : formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsMargin ? item.margin : wantsProfit ? item.profit : item.revenue,
          secondaryValue: `${formatNumber(item.orders)} orders • ${((item.revenue / Math.max(1, totalRevenue)) * 100).toFixed(1)}% rev share`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 3. GEOGRAPHIC QUERIES: CITY
    // -------------------------------------------------------------------------
    if (q.includes('city') || q.includes('cities')) {
      if (!columnAvailability.hasCity) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain City.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'City',
          calculationFormula: 'Requires Column: City',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'City',
        };
      }

      const cityMap = new Map<string, { city: string; country: string; revenue: number; profit: number; orders: Set<string> }>();
      for (const t of filteredTransactions) {
        const key = `${t.city} (${t.country || 'USA'})`;
        if (!cityMap.has(key)) {
          cityMap.set(key, { city: t.city, country: t.country || 'USA', revenue: 0, profit: 0, orders: new Set() });
        }
        const cur = cityMap.get(key)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.orders.add(t.order_id);
      }

      const wantsProfit = q.includes('profit');
      const list = Array.from(cityMap.entries()).map(([label, d]) => ({
        label,
        city: d.city,
        revenue: d.revenue,
        profit: d.profit,
        orders: d.orders.size,
      }));

      list.sort((a, b) => {
        const valA = wantsProfit ? a.profit : a.revenue;
        const valB = wantsProfit ? b.profit : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const share = totalRevenue > 0 ? ((top.revenue / totalRevenue) * 100).toFixed(1) : '0';

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.label} generated the ${isLowest ? 'lowest' : 'highest'} ${
          wantsProfit ? 'profit' : 'revenue'
        } at ${formatCurrency(wantsProfit ? top.profit : top.revenue)} (${share}% of revenue across ${formatNumber(top.orders)} orders).`,
        primaryMetricLabel: top.label,
        primaryMetricValue: formatCurrency(wantsProfit ? top.profit : top.revenue),
        calculationFormula: `GROUP BY City, Country → SUM(${wantsProfit ? 'Profit' : 'Net_Revenue'}) → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'City Performance',
        columnHeaderLabel: 'City (Country)',
        columnHeaderValue: wantsProfit ? 'Total Profit' : 'Total Revenue',
        columnHeaderSecondary: 'Orders & Revenue Share',
        supportingRows: list.slice(0, requestedLimit).map((item, i) => ({
          rank: i + 1,
          label: item.label,
          primaryValue: formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsProfit ? item.profit : item.revenue,
          secondaryValue: `${formatNumber(item.orders)} orders (${((item.revenue / Math.max(1, totalRevenue)) * 100).toFixed(1)}%)`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 4. CATEGORY QUERIES
    // -------------------------------------------------------------------------
    if (q.includes('category') || q.includes('categories')) {
      if (!columnAvailability.hasCategory) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Category.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Category',
          calculationFormula: 'Requires Column: Category',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Category',
        };
      }

      const catMap = new Map<string, { revenue: number; profit: number; units: number; orders: Set<string> }>();
      for (const t of filteredTransactions) {
        const cat = t.category || 'Uncategorized';
        if (!catMap.has(cat)) {
          catMap.set(cat, { revenue: 0, profit: 0, units: 0, orders: new Set() });
        }
        const cur = catMap.get(cat)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.units += t.quantity;
        cur.orders.add(t.order_id);
      }

      const wantsMargin = q.includes('margin');
      const wantsProfit = q.includes('profit') && !wantsMargin;
      const wantsUnits = q.includes('quantity') || q.includes('unit') || q.includes('volume');

      const list = Array.from(catMap.entries()).map(([category, d]) => {
        const margin = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
        return {
          category,
          revenue: d.revenue,
          profit: d.profit,
          units: d.units,
          orders: d.orders.size,
          margin,
        };
      });

      list.sort((a, b) => {
        const valA = wantsMargin ? a.margin : wantsProfit ? a.profit : wantsUnits ? a.units : a.revenue;
        const valB = wantsMargin ? b.margin : wantsProfit ? b.profit : wantsUnits ? b.units : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const share = totalRevenue > 0 ? ((top.revenue / totalRevenue) * 100).toFixed(1) : '0';

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.category} generated the ${isLowest ? 'lowest' : 'highest'} ${
          wantsMargin ? 'profit margin' : wantsProfit ? 'profit' : wantsUnits ? 'unit volume' : 'revenue'
        } at ${
          wantsMargin
            ? `${top.margin.toFixed(1)}%`
            : wantsUnits
            ? `${formatNumber(top.units)} units`
            : formatCurrency(wantsProfit ? top.profit : top.revenue)
        } (${formatCurrency(top.revenue)} revenue, ${top.margin.toFixed(1)}% margin).`,
        primaryMetricLabel: top.category,
        primaryMetricValue: wantsMargin
          ? `${top.margin.toFixed(1)}% Margin`
          : wantsUnits
          ? `${formatNumber(top.units)} Units`
          : formatCurrency(wantsProfit ? top.profit : top.revenue),
        calculationFormula: `GROUP BY Category → ${
          wantsMargin
            ? '(SUM(Profit) ÷ SUM(Net_Revenue)) × 100'
            : wantsProfit
            ? 'SUM(Profit)'
            : wantsUnits
            ? 'SUM(Quantity)'
            : 'SUM(Net_Revenue)'
        } → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'Category Performance',
        columnHeaderLabel: 'Category',
        columnHeaderValue: wantsMargin
          ? 'Profit Margin %'
          : wantsProfit
          ? 'Total Profit'
          : wantsUnits
          ? 'Units Sold'
          : 'Total Revenue',
        columnHeaderSecondary: 'Profit & Revenue Breakdown',
        supportingRows: list.map((item, i) => ({
          rank: i + 1,
          label: item.category,
          primaryValue: wantsMargin
            ? `${item.margin.toFixed(1)}%`
            : wantsUnits
            ? `${formatNumber(item.units)} units`
            : formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsMargin ? item.margin : wantsProfit ? item.profit : wantsUnits ? item.units : item.revenue,
          secondaryValue: `${formatCurrency(item.revenue)} rev • ${formatCurrency(item.profit)} profit (${item.margin.toFixed(1)}% margin)`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 5. CUSTOMER RETENTION, RFM SEGMENTS & CLV QUERIES
    // -------------------------------------------------------------------------
    if (
      q.includes('returning') ||
      q.includes('repeat') ||
      q.includes('retention') ||
      q.includes('new customer') ||
      q.includes('one-time')
    ) {
      const totalCust = filteredCustomers.length;
      const returningCust = filteredCustomers.filter((c) => c.total_orders > 1);
      const newCust = filteredCustomers.filter((c) => c.total_orders === 1);
      const repeatRate = totalCust > 0 ? (returningCust.length / totalCust) * 100 : 0;

      const returningRev = returningCust.reduce((s, c) => s + c.total_spend, 0);
      const newRev = newCust.reduce((s, c) => s + c.total_spend, 0);
      const returningRevShare = totalRevenue > 0 ? (returningRev / totalRevenue) * 100 : 0;

      const asksNew = q.includes('new customer') || q.includes('one-time');

      return {
        status: 'answered',
        question: rawQ,
        answerText: asksNew
          ? `There are ${formatNumber(newCust.length)} new (single-order) customers (${(100 - repeatRate).toFixed(1)}% of total customers), contributing ${formatCurrency(newRev)} in revenue.`
          : `There are ${formatNumber(returningCust.length)} returning customers out of ${formatNumber(totalCust)} total customers (Repeat Purchase Rate: ${repeatRate.toFixed(1)}%), contributing ${formatCurrency(returningRev)} (${returningRevShare.toFixed(1)}% of total revenue).`,
        primaryMetricLabel: asksNew ? 'New Customers' : 'Returning Customers',
        primaryMetricValue: asksNew
          ? `${formatNumber(newCust.length)} (${(100 - repeatRate).toFixed(1)}%)`
          : `${formatNumber(returningCust.length)} (${repeatRate.toFixed(1)}%)`,
        calculationFormula: 'COUNT(Customers WHERE Total_Orders > 1) ÷ COUNT(Total_Customers) × 100',
        categoryBadge: 'Customer Retention',
        columnHeaderLabel: 'Customer Cohort',
        columnHeaderValue: 'Customer Count & Share',
        columnHeaderSecondary: 'Cohort Revenue Contribution',
        supportingRows: [
          {
            rank: 1,
            label: 'Returning Customers (2+ Orders)',
            primaryValue: `${formatNumber(returningCust.length)} (${repeatRate.toFixed(1)}%)`,
            rawNumeric: returningCust.length,
            secondaryValue: `${formatCurrency(returningRev)} (${returningRevShare.toFixed(1)}% of revenue)`,
          },
          {
            rank: 2,
            label: 'New / One-Time Customers (1 Order)',
            primaryValue: `${formatNumber(newCust.length)} (${(100 - repeatRate).toFixed(1)}%)`,
            rawNumeric: newCust.length,
            secondaryValue: `${formatCurrency(newRev)} (${(100 - returningRevShare).toFixed(1)}% of revenue)`,
          },
        ],
      };
    }

    if (q.includes('segment') || q.includes('rfm') || q.includes('champion')) {
      const segMap = new Map<string, { count: number; revenue: number; orders: number }>();
      for (const c of filteredCustomers) {
        const seg = c.rfm_segment || 'Unclassified';
        if (!segMap.has(seg)) {
          segMap.set(seg, { count: 0, revenue: 0, orders: 0 });
        }
        const cur = segMap.get(seg)!;
        cur.count += 1;
        cur.revenue += c.total_spend;
        cur.orders += c.total_orders;
      }

      const wantsCount = q.includes('how many') || q.includes('count');
      const list = Array.from(segMap.entries())
        .map(([segment, d]) => ({
          segment,
          count: d.count,
          revenue: d.revenue,
          orders: d.orders,
          avgSpend: d.count > 0 ? d.revenue / d.count : 0,
        }))
        .sort((a, b) => (wantsCount ? b.count - a.count : b.revenue - a.revenue));

      const top = list[0];
      const share = totalRevenue > 0 ? ((top.revenue / totalRevenue) * 100).toFixed(1) : '0';

      return {
        status: 'answered',
        question: rawQ,
        answerText: `The "${top.segment}" segment generated the highest revenue at ${formatCurrency(top.revenue)} (${share}% of store revenue) across ${formatNumber(top.count)} customers.`,
        primaryMetricLabel: top.segment,
        primaryMetricValue: `${formatCurrency(top.revenue)} (${formatNumber(top.count)} customers)`,
        calculationFormula: 'GROUP BY RFM_Segment → SUM(Total_Spend), COUNT(Customer_ID) → ORDER BY DESC',
        categoryBadge: 'RFM Segmentation',
        columnHeaderLabel: 'RFM Customer Segment',
        columnHeaderValue: 'Segment Revenue',
        columnHeaderSecondary: 'Customers & Avg Spend',
        supportingRows: list.map((item, i) => ({
          rank: i + 1,
          label: item.segment,
          primaryValue: formatCurrency(item.revenue),
          rawNumeric: item.revenue,
          secondaryValue: `${formatNumber(item.count)} customers • Avg ${formatCurrency(item.avgSpend)}`,
        })),
      };
    }

    if (q.includes('clv') || q.includes('lifetime value')) {
      const clvList = filteredCustomers.map((c) => {
        const firstTime = new Date(c.first_order_date).getTime();
        const lastTime = new Date(c.last_order_date).getTime();
        const spanDays = Math.max(0, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24)));
        const lifespanYears = Number((1 + spanDays / 365.25).toFixed(2));
        const clv = Number((c.avg_order_value * c.total_orders * lifespanYears).toFixed(2));
        return {
          ...c,
          lifespanYears,
          clv,
        };
      });

      clvList.sort((a, b) => b.clv - a.clv);
      const totalClv = clvList.reduce((s, c) => s + c.clv, 0);
      const avgClv = clvList.length > 0 ? totalClv / clvList.length : 0;
      const top = clvList[0];

      return {
        status: 'answered',
        question: rawQ,
        answerText: `The average analytical Customer Lifetime Value (CLV) is ${formatCurrency(avgClv)} across ${formatNumber(clvList.length)} customers. The highest-CLV customer is ${top?.customer_name} (${top?.customer_id}) with an estimated CLV of ${formatCurrency(top?.clv || 0)}.`,
        primaryMetricLabel: 'Average Analytical CLV',
        primaryMetricValue: formatCurrency(avgClv),
        calculationFormula: 'CLV = Average_Order_Value × Purchase_Frequency × Lifespan_Factor',
        categoryBadge: 'Customer Lifetime Value',
        columnHeaderLabel: 'Top Customers by CLV',
        columnHeaderValue: 'Estimated CLV',
        columnHeaderSecondary: 'Realized Spend & Orders',
        supportingRows: clvList.slice(0, requestedLimit).map((c, i) => ({
          rank: i + 1,
          label: `${c.customer_name} (${c.customer_id})`,
          primaryValue: formatCurrency(c.clv),
          rawNumeric: c.clv,
          secondaryValue: `${formatCurrency(c.total_spend)} spend • ${c.total_orders} orders (${c.lifespanYears}× span)`,
        })),
      };
    }

    if (q.includes('customer') || q.includes('buyer') || q.includes('spender')) {
      const sortedCust = [...filteredCustomers].sort((a, b) =>
        isLowest ? a.total_spend - b.total_spend : b.total_spend - a.total_spend
      );
      const top = sortedCust[0];
      const avgSpend =
        filteredCustomers.length > 0 ? totalRevenue / filteredCustomers.length : 0;

      if (q.includes('how many customer') || q.includes('total customer')) {
        return {
          status: 'answered',
          question: rawQ,
          answerText: `There are ${formatNumber(filteredCustomers.length)} unique active customers in the dataset, with an average spend of ${formatCurrency(avgSpend)} per customer.`,
          primaryMetricLabel: 'Total Active Customers',
          primaryMetricValue: formatNumber(filteredCustomers.length),
          calculationFormula: 'COUNT(DISTINCT Customer_ID)',
          categoryBadge: 'Customer Analytics',
          columnHeaderLabel: 'Top Customers',
          columnHeaderValue: 'Total Spend',
          columnHeaderSecondary: 'Orders & Segment',
          supportingRows: sortedCust.slice(0, requestedLimit).map((c, i) => ({
            rank: i + 1,
            label: `${c.customer_name} (${c.customer_id})`,
            primaryValue: formatCurrency(c.total_spend),
            rawNumeric: c.total_spend,
            secondaryValue: `${c.total_orders} orders • ${c.rfm_segment}`,
          })),
        };
      }

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.customer_name} (${top.customer_id}) is the ${isLowest ? 'lowest' : 'highest'}-spending customer with ${formatCurrency(top.total_spend)} across ${top.total_orders} orders (Average Customer Spend: ${formatCurrency(avgSpend)}).`,
        primaryMetricLabel: `Top Customer: ${top.customer_name}`,
        primaryMetricValue: formatCurrency(top.total_spend),
        calculationFormula: `GROUP BY Customer_ID → SUM(Net_Revenue) → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'Customer Leaderboard',
        columnHeaderLabel: 'Customer (ID & Location)',
        columnHeaderValue: 'Total Revenue',
        columnHeaderSecondary: 'Orders & RFM Segment',
        supportingRows: sortedCust.slice(0, requestedLimit).map((c, i) => ({
          rank: i + 1,
          label: `${c.customer_name} (${c.customer_id} • ${c.city})`,
          primaryValue: formatCurrency(c.total_spend),
          rawNumeric: c.total_spend,
          secondaryValue: `${c.total_orders} orders • ${c.rfm_segment}`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 6. PRODUCT QUERIES (REVENUE, PROFIT, QUANTITY SOLD, MARGIN)
    // -------------------------------------------------------------------------
    if (
      q.includes('product') ||
      q.includes('item') ||
      q.includes('sku') ||
      q.includes('best selling') ||
      q.includes('best-selling') ||
      q.includes('sold the most') ||
      q.includes('top 5') ||
      q.includes('top 10')
    ) {
      if (!columnAvailability.hasProduct) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Product_Name / Product_ID.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Product_Name',
          calculationFormula: 'Requires Column: Product_Name',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Product_Name',
        };
      }

      const prodMap = new Map<
        string,
        { id: string; name: string; category: string; revenue: number; profit: number; units: number; orders: Set<string> }
      >();

      for (const t of filteredTransactions) {
        const key = t.product_id || t.product_name;
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            id: t.product_id,
            name: t.product_name,
            category: t.category,
            revenue: 0,
            profit: 0,
            units: 0,
            orders: new Set(),
          });
        }
        const cur = prodMap.get(key)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.units += t.quantity;
        cur.orders.add(t.order_id);
      }

      const wantsMargin = q.includes('margin');
      const wantsProfit = q.includes('profit') && !wantsMargin;
      const wantsUnits =
        q.includes('quantity') ||
        q.includes('unit') ||
        q.includes('sold the most') ||
        q.includes('best selling') ||
        q.includes('best-selling');
      const wantsHighSalesLowProfit = q.includes('high sales') && q.includes('low profit');

      let list = Array.from(prodMap.values()).map((p) => {
        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        return {
          ...p,
          ordersCount: p.orders.size,
          margin,
        };
      });

      if (wantsHighSalesLowProfit) {
        const sortedRevs = [...list].map((p) => p.revenue).sort((a, b) => a - b);
        const medianRev = sortedRevs[Math.floor(sortedRevs.length / 2)] || 0;
        list = list
          .filter((p) => p.revenue >= medianRev && p.margin < 25)
          .sort((a, b) => a.margin - b.margin);

        const top = list[0];
        return {
          status: 'answered',
          question: rawQ,
          answerText: top
            ? `"${top.name}" has high sales (${formatCurrency(top.revenue)}) but a low profit margin of ${top.margin.toFixed(1)}% (${formatCurrency(top.profit)} profit).`
            : 'No products currently fall into the high-revenue low-margin threshold.',
          primaryMetricLabel: top ? top.name : 'None Found',
          primaryMetricValue: top ? `${top.margin.toFixed(1)}% Margin (${formatCurrency(top.revenue)} Sales)` : '0 SKUs',
          calculationFormula: 'FILTER(Revenue >= Median_Revenue AND Margin < 25%) → ORDER BY Margin ASC',
          categoryBadge: 'Product Matrix Diagnostics',
          columnHeaderLabel: 'Product Name',
          columnHeaderValue: 'Profit Margin %',
          columnHeaderSecondary: 'Revenue & Profit',
          supportingRows: list.slice(0, requestedLimit).map((item, i) => ({
            rank: i + 1,
            label: `${item.name} (${item.category})`,
            primaryValue: `${item.margin.toFixed(1)}%`,
            rawNumeric: item.revenue,
            secondaryValue: `${formatCurrency(item.revenue)} rev • ${formatCurrency(item.profit)} profit`,
          })),
        };
      }

      list.sort((a, b) => {
        const valA = wantsMargin ? a.margin : wantsProfit ? a.profit : wantsUnits ? a.units : a.revenue;
        const valB = wantsMargin ? b.margin : wantsProfit ? b.profit : wantsUnits ? b.units : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const metricName = wantsMargin
        ? 'profit margin'
        : wantsProfit
        ? 'profit'
        : wantsUnits
        ? 'quantity sold'
        : 'revenue';

      const formattedTopVal = wantsMargin
        ? `${top.margin.toFixed(1)}%`
        : wantsUnits
        ? `${formatNumber(top.units)} units`
        : formatCurrency(wantsProfit ? top.profit : top.revenue);

      return {
        status: 'answered',
        question: rawQ,
        answerText: `"${top.name}" (${top.category}) is the #1 product with the ${
          isLowest ? 'lowest' : 'highest'
        } ${metricName} at ${formattedTopVal} (Revenue: ${formatCurrency(top.revenue)}, Profit: ${formatCurrency(top.profit)}, Margin: ${top.margin.toFixed(1)}%).`,
        primaryMetricLabel: top.name,
        primaryMetricValue: formattedTopVal,
        calculationFormula: `GROUP BY Product_ID → ${
          wantsMargin
            ? '(SUM(Profit) ÷ SUM(Net_Revenue)) × 100'
            : wantsProfit
            ? 'SUM(Profit)'
            : wantsUnits
            ? 'SUM(Quantity)'
            : 'SUM(Net_Revenue)'
        } → ORDER BY ${isLowest ? 'ASC' : 'DESC'} LIMIT ${requestedLimit}`,
        categoryBadge: 'Product Ranking',
        columnHeaderLabel: 'Product (Category)',
        columnHeaderValue: wantsMargin
          ? 'Profit Margin %'
          : wantsProfit
          ? 'Total Profit'
          : wantsUnits
          ? 'Quantity Sold'
          : 'Total Revenue',
        columnHeaderSecondary: 'Full Product Economics',
        supportingRows: list.slice(0, requestedLimit).map((item, i) => ({
          rank: i + 1,
          label: `${item.name} (${item.category})`,
          primaryValue: wantsMargin
            ? `${item.margin.toFixed(1)}%`
            : wantsUnits
            ? `${formatNumber(item.units)} units`
            : formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsMargin ? item.margin : wantsProfit ? item.profit : wantsUnits ? item.units : item.revenue,
          secondaryValue: `${formatCurrency(item.revenue)} rev • ${formatCurrency(item.profit)} profit (${item.margin.toFixed(1)}%)`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 7. TIME / PERIOD QUERIES (MONTH, QUARTER, DAY, YEAR)
    // -------------------------------------------------------------------------
    if (
      q.includes('month') ||
      q.includes('quarter') ||
      q.includes('daily') ||
      q.includes('day') ||
      q.includes('period') ||
      q.includes('year')
    ) {
      if (!columnAvailability.hasOrderDate) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Order_Date.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Order_Date',
          calculationFormula: 'Requires Column: Order_Date',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Order_Date',
        };
      }

      const isQuarter = q.includes('quarter');
      const isDay = q.includes('daily') || q.includes('day');
      const wantsProfit = q.includes('profit');

      const timeMap = new Map<string, { revenue: number; profit: number; orders: Set<string> }>();
      for (const t of filteredTransactions) {
        let key = t.order_date.substring(0, 7); // YYYY-MM
        if (isQuarter) {
          const y = t.order_date.substring(0, 4);
          const m = parseInt(t.order_date.substring(5, 7), 10);
          const qtr = Math.ceil(m / 3);
          key = `${y}-Q${qtr}`;
        } else if (isDay) {
          key = t.order_date.substring(0, 10);
        }

        if (!timeMap.has(key)) {
          timeMap.set(key, { revenue: 0, profit: 0, orders: new Set() });
        }
        const cur = timeMap.get(key)!;
        cur.revenue += t.net_revenue;
        cur.profit += t.profit;
        cur.orders.add(t.order_id);
      }

      const list = Array.from(timeMap.entries()).map(([period, d]) => ({
        period,
        revenue: d.revenue,
        profit: d.profit,
        orders: d.orders.size,
      }));

      list.sort((a, b) => {
        const valA = wantsProfit ? a.profit : a.revenue;
        const valB = wantsProfit ? b.profit : b.revenue;
        return isLowest ? valA - valB : valB - valA;
      });

      const top = list[0];
      const granLabel = isQuarter ? 'Quarter' : isDay ? 'Date' : 'Month';

      return {
        status: 'answered',
        question: rawQ,
        answerText: `${top.period} was the ${isLowest ? 'lowest' : 'highest'}-sales ${granLabel.toLowerCase()} with ${formatCurrency(
          wantsProfit ? top.profit : top.revenue
        )} in ${wantsProfit ? 'profit' : 'revenue'} across ${formatNumber(top.orders)} orders.`,
        primaryMetricLabel: `${isLowest ? 'Lowest' : 'Peak'} ${granLabel}: ${top.period}`,
        primaryMetricValue: formatCurrency(wantsProfit ? top.profit : top.revenue),
        calculationFormula: `GROUP BY ${granLabel}(Order_Date) → SUM(${wantsProfit ? 'Profit' : 'Net_Revenue'}) → ORDER BY ${isLowest ? 'ASC' : 'DESC'}`,
        categoryBadge: 'Time-Series Analysis',
        columnHeaderLabel: granLabel,
        columnHeaderValue: wantsProfit ? 'Total Profit' : 'Total Revenue',
        columnHeaderSecondary: 'Orders & Profit',
        supportingRows: list.slice(0, requestedLimit).map((item, i) => ({
          rank: i + 1,
          label: item.period,
          primaryValue: formatCurrency(wantsProfit ? item.profit : item.revenue),
          rawNumeric: wantsProfit ? item.profit : item.revenue,
          secondaryValue: `${formatNumber(item.orders)} orders • ${formatCurrency(item.profit)} profit`,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // 8. AVERAGE ORDER VALUE (AOV) QUERIES
    // -------------------------------------------------------------------------
    if (q.includes('average order value') || q.includes('aov') || q.includes('basket size')) {
      const aov = totalRevenue / totalOrders;
      const avgItemsPerOrder = totalUnits / totalOrders;

      return {
        status: 'answered',
        question: rawQ,
        answerText: `The overall Average Order Value (AOV) is ${formatCurrency(aov)}, calculated from ${formatCurrency(totalRevenue)} in net revenue across ${formatNumber(totalOrders)} distinct orders (${avgItemsPerOrder.toFixed(1)} units per order).`,
        primaryMetricLabel: 'Average Order Value (AOV)',
        primaryMetricValue: formatCurrency(aov),
        calculationFormula: 'SUM(Net_Revenue) ÷ COUNT(DISTINCT Order_ID)',
        categoryBadge: 'Order Economics',
        columnHeaderLabel: 'Metric Component',
        columnHeaderValue: 'Calculated Value',
        supportingRows: [
          { label: 'Total Net Revenue', primaryValue: formatCurrency(totalRevenue), rawNumeric: totalRevenue },
          { label: 'Total Distinct Orders', primaryValue: formatNumber(totalOrders), rawNumeric: totalOrders },
          { label: 'Average Order Value (AOV)', primaryValue: formatCurrency(aov), rawNumeric: aov },
          { label: 'Average Units per Order', primaryValue: `${avgItemsPerOrder.toFixed(2)} units`, rawNumeric: avgItemsPerOrder },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // 9. TOTAL PROFIT / MARGIN QUERIES
    // -------------------------------------------------------------------------
    if (q.includes('profit') || q.includes('margin')) {
      if (!columnAvailability.hasProfit) {
        return {
          status: 'missing_column',
          question: rawQ,
          answerText: 'This question cannot be answered because the uploaded dataset does not contain Profit or Cost.',
          primaryMetricLabel: 'Missing Column',
          primaryMetricValue: 'Profit',
          calculationFormula: 'Requires Column: Profit',
          categoryBadge: 'Missing Column',
          columnHeaderLabel: 'Column',
          columnHeaderValue: 'Status',
          supportingRows: [],
          missingColumnName: 'Profit',
        };
      }

      const totalCost = filteredTransactions.reduce((s, t) => s + t.total_cost, 0);
      return {
        status: 'answered',
        question: rawQ,
        answerText: `Total net profit is ${formatCurrency(totalProfit)} on ${formatCurrency(totalRevenue)} of net revenue, yielding an overall profit margin of ${overallMargin.toFixed(1)}%.`,
        primaryMetricLabel: 'Total Net Profit',
        primaryMetricValue: `${formatCurrency(totalProfit)} (${overallMargin.toFixed(1)}% Margin)`,
        calculationFormula: 'SUM(Net_Revenue) - SUM(Total_Cost) | Margin = (Profit ÷ Revenue) × 100',
        categoryBadge: 'Profitability Summary',
        columnHeaderLabel: 'Financial Metric',
        columnHeaderValue: 'Amount',
        supportingRows: [
          { label: 'Total Net Revenue', primaryValue: formatCurrency(totalRevenue), rawNumeric: totalRevenue },
          { label: 'Total COGS / Cost', primaryValue: formatCurrency(totalCost), rawNumeric: totalCost },
          { label: 'Total Net Profit', primaryValue: formatCurrency(totalProfit), rawNumeric: totalProfit },
          { label: 'Profit Margin %', primaryValue: `${overallMargin.toFixed(1)}%`, rawNumeric: overallMargin },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // 10. TOTAL REVENUE / TOTAL SALES / ORDERS QUERIES
    // -------------------------------------------------------------------------
    if (
      q.includes('revenue') ||
      q.includes('sales') ||
      q.includes('order') ||
      q.includes('total') ||
      q.includes('how much')
    ) {
      const aov = totalRevenue / totalOrders;
      return {
        status: 'answered',
        question: rawQ,
        answerText: `Total net revenue is ${formatCurrency(totalRevenue)} generated from ${formatNumber(totalOrders)} distinct orders and ${formatNumber(totalUnits)} units sold (Profit: ${formatCurrency(totalProfit)}, Margin: ${overallMargin.toFixed(1)}%).`,
        primaryMetricLabel: 'Total Net Revenue',
        primaryMetricValue: formatCurrency(totalRevenue),
        calculationFormula: 'SUM(Net_Revenue) across valid Delivered/Shipped transactions',
        categoryBadge: 'Revenue Summary',
        columnHeaderLabel: 'Store KPI',
        columnHeaderValue: 'Calculated Value',
        supportingRows: [
          { label: 'Total Net Revenue', primaryValue: formatCurrency(totalRevenue), rawNumeric: totalRevenue },
          { label: 'Total Net Profit', primaryValue: formatCurrency(totalProfit), rawNumeric: totalProfit },
          { label: 'Total Distinct Orders', primaryValue: formatNumber(totalOrders), rawNumeric: totalOrders },
          { label: 'Total Units Sold', primaryValue: formatNumber(totalUnits), rawNumeric: totalUnits },
          { label: 'Average Order Value', primaryValue: formatCurrency(aov), rawNumeric: aov },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // 11. UNSUPPORTED FALLBACK (Never Guess or Hallucinate)
    // -------------------------------------------------------------------------
    return {
      status: 'unsupported',
      question: rawQ,
      answerText: "I can't answer this question using the available dataset.",
      primaryMetricLabel: 'Unrecognized Query',
      primaryMetricValue: 'See Supported Topics',
      calculationFormula: 'No matching analytical aggregation found for query intent',
      categoryBadge: 'Clarification Needed',
      columnHeaderLabel: 'Supported Analytical Topic',
      columnHeaderValue: 'Example Question',
      supportingRows: [
        { label: 'Country Revenue', primaryValue: 'Which country generated the highest revenue?', rawNumeric: 1 },
        { label: 'Product Profitability', primaryValue: 'What are the top 5 products by profit?', rawNumeric: 1 },
        { label: 'Category Margins', primaryValue: 'Which category has the highest profit margin?', rawNumeric: 1 },
        { label: 'Customer Retention', primaryValue: 'How many returning customers do we have?', rawNumeric: 1 },
        { label: 'City Performance', primaryValue: 'Which city generated the most revenue?', rawNumeric: 1 },
        { label: 'Order Economics', primaryValue: 'What is the average order value?', rawNumeric: 1 },
      ],
      explanationNote:
        'Try asking about Revenue, Profit, Profit Margin, Products, Categories, Customers, Returning Customers, RFM Segments, CLV, Countries, Cities, Months/Quarters, or Payment Methods.',
    };
  }, [activeQuestion, filteredTransactions, filteredCustomers, columnAvailability]);

  // Submit question handler
  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed) return;
    setActiveQuestion(trimmed);
    setQuestionHistory((prev) => {
      const withoutDup = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...withoutDup].slice(0, 8);
    });
  };

  const handleSelectSuggested = (q: string) => {
    setQuestionInput(q);
    setActiveQuestion(q);
    setQuestionHistory((prev) => {
      const withoutDup = prev.filter((item) => item.toLowerCase() !== q.toLowerCase());
      return [q, ...withoutDup].slice(0, 8);
    });
  };

  // Max value in supporting rows for proportional bar rendering
  const maxSupportingVal = useMemo(() => {
    if (!evaluationResult.supportingRows || evaluationResult.supportingRows.length === 0) return 1;
    return Math.max(1, ...evaluationResult.supportingRows.map((r) => Math.abs(r.rawNumeric)));
  }, [evaluationResult.supportingRows]);

  return (
    <div className="space-y-6">
      {/* Page Header & Active Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-600" />
              Ask the Data
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Verified Analytical Q&A
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ask questions about your dataset in plain English — every numerical answer is calculated directly from the loaded data
          </p>
        </div>

        {/* Global Filter Bar (Step 8: Respects existing filter state) */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Timeframe Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
            {(['all', '2024', '2023', 'last12m'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframeFilter(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  timeframeFilter === t
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Time' : t === '2024' ? '2024' : t === '2023' ? '2023' : 'Last 12M'}
              </button>
            ))}
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Countries' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. Question Input Box */}
      <form
        onSubmit={handleAskSubmit}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center gap-3 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:bg-white transition-colors">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            placeholder="Ask a question about your data..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            className="flex-1 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {questionInput && (
            <button
              type="button"
              onClick={() => setQuestionInput('')}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <span>Ask</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* 14. Suggested Questions ("Try asking:") */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Try asking:
          </div>
          <span className="text-[11px] text-slate-400">
            Click any question to run against {formatNumber(filteredTransactions.length)} active records
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSelectSuggested(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border text-left ${
                activeQuestion.toLowerCase() === q.toLowerCase()
                  ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50/60 hover:border-indigo-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 6 & 7. Answer Display Card + Supporting Data Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Answer & Supporting Evidence (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          {/* Top Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  evaluationResult.status === 'answered'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {evaluationResult.categoryBadge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Scope: {countryFilter === 'All' ? 'All Countries' : countryFilter} •{' '}
                {categoryFilter === 'All' ? 'All Categories' : categoryFilter} •{' '}
                {formatNumber(filteredTransactions.length)} rows
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              {evaluationResult.calculationFormula}
            </div>
          </div>

          {/* Formatted Question & Answer Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2 space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Question
                </div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {evaluationResult.question}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Answer
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug mt-0.5">
                  {evaluationResult.answerText}
                </div>
              </div>

              {evaluationResult.explanationNote && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{evaluationResult.explanationNote}</span>
                </div>
              )}
            </div>

            {/* Key Calculated Metric Highlight Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                {evaluationResult.primaryMetricLabel}
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 break-words">
                {evaluationResult.primaryMetricValue}
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center gap-1">
                <Database className="w-3 h-3 text-indigo-400" />
                <span>Verified from active dataset</span>
              </div>
            </div>
          </div>

          {/* 7. Supporting Data Breakdown Table & Visual Bars */}
          {evaluationResult.supportingRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  Supporting Data Verification Table
                </h3>
                <span className="text-[11px] text-slate-400">
                  Showing top {evaluationResult.supportingRows.length} rows
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      {evaluationResult.supportingRows[0]?.rank !== undefined && (
                        <th className="py-2 px-3 w-12">Rank</th>
                      )}
                      <th className="py-2 px-3">{evaluationResult.columnHeaderLabel}</th>
                      <th className="py-2 px-3 text-right">{evaluationResult.columnHeaderValue}</th>
                      {evaluationResult.columnHeaderSecondary && (
                        <th className="py-2 px-3 text-right">{evaluationResult.columnHeaderSecondary}</th>
                      )}
                      {evaluationResult.status === 'answered' && (
                        <th className="py-2 px-3 w-36">Relative Scale</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluationResult.supportingRows.map((row, idx) => {
                      const pctWidth = Math.min(
                        100,
                        Math.max(4, Math.round((Math.abs(row.rawNumeric) / maxSupportingVal) * 100))
                      );
                      return (
                        <tr key={idx} className={idx === 0 && evaluationResult.status === 'answered' ? 'bg-indigo-50/40 font-semibold' : 'hover:bg-slate-50'}>
                          {row.rank !== undefined && (
                            <td className="py-2 px-3 font-mono text-slate-500">#{row.rank}</td>
                          )}
                          <td className="py-2 px-3 text-slate-900 font-medium">{row.label}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                            {row.primaryValue}
                          </td>
                          {evaluationResult.columnHeaderSecondary && (
                            <td className="py-2 px-3 text-right font-mono text-slate-500 text-[11px]">
                              {row.secondaryValue || '—'}
                            </td>
                          )}
                          {evaluationResult.status === 'answered' && (
                            <td className="py-2 px-3">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    idx === 0 ? 'bg-indigo-600' : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${pctWidth}%` }}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 15. Session Question History & Active Filter Context (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Question History Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Question History
                </h2>
              </div>
              {questionHistory.length > 1 && (
                <button
                  onClick={() => setQuestionHistory([activeQuestion])}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {questionHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggested(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer border ${
                    activeQuestion.toLowerCase() === item.toLowerCase()
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                      : 'bg-slate-50/70 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">
                    {idx + 1}. {item}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Safe Execution & Filter Scope Card */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Info className="w-4 h-4 text-indigo-400" />
              Data Integrity Guarantee
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every answer on this page is computed deterministically from the in-memory dataframe using controlled aggregation functions (<code className="text-emerald-300">SUM</code>, <code className="text-emerald-300">COUNT</code>, <code className="text-emerald-300">AVG</code>, <code className="text-emerald-300">GROUP BY</code>). No arbitrary code execution or unverified numerical generation is used.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
