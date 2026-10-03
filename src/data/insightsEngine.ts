import { Transaction, CustomerSummary, formatCurrency } from './analyticsEngine';

export interface BusinessInsight {
  id: string;
  category: 'Revenue & Growth' | 'Profitability' | 'Products' | 'Customer Retention' | 'Geography';
  title: string;
  badge: 'Critical Alert' | 'Growth Opportunity' | 'Positive Trend' | 'Strategic Watch';
  badgeColor: 'emerald' | 'amber' | 'rose' | 'indigo';
  metricValue: string;
  observation: string;
  analysis: string;
  recommendation: string;
}

export function generateDynamicInsights(
  transactions: Transaction[],
  customers: CustomerSummary[]
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const validTrans = transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped');

  if (validTrans.length === 0) return [];

  const totalRevenue = validTrans.reduce((sum, t) => sum + t.net_revenue, 0);
  const totalProfit = validTrans.reduce((sum, t) => sum + t.profit, 0);
  const totalCost = validTrans.reduce((sum, t) => sum + t.total_cost, 0);
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // 1. Category Performance & Concentration
  const catRevMap = new Map<string, { revenue: number; profit: number; count: number }>();
  for (const t of validTrans) {
    const cur = catRevMap.get(t.category) || { revenue: 0, profit: 0, count: 0 };
    cur.revenue += t.net_revenue;
    cur.profit += t.profit;
    cur.count += t.quantity;
    catRevMap.set(t.category, cur);
  }

  const sortedCats = Array.from(catRevMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  if (sortedCats.length > 0) {
    const [topCatName, topCatData] = sortedCats[0];
    const topCatShare = ((topCatData.revenue / totalRevenue) * 100).toFixed(1);
    const topCatMargin = ((topCatData.profit / topCatData.revenue) * 100).toFixed(1);

    insights.push({
      id: 'insight-top-category',
      category: 'Revenue & Growth',
      title: `Dominant Category: ${topCatName} Generates ${topCatShare}% of Revenue`,
      badge: 'Positive Trend',
      badgeColor: 'indigo',
      metricValue: `${topCatShare}% Share (${formatCurrency(topCatData.revenue)})`,
      observation: `${topCatName} is the primary revenue driver, contributing ${formatCurrency(topCatData.revenue)} across ${topCatData.count} units sold with a ${topCatMargin}% profit margin.`,
      analysis: `Strong category brand affinity and higher average basket values make ${topCatName} central to quarterly cash flow, but over-reliance increases vulnerability to supply chain shocks or seasonal dips.`,
      recommendation: `Bundle ${topCatName} items with complementary high-margin accessories from slower categories to cross-pollinate customer interest and expand cart breadth.`,
    });
  }

  // 2. Low-Profit / Discount Bleed Analysis
  const discountedTrans = validTrans.filter((t) => t.discount_percent > 0);
  const fullPriceTrans = validTrans.filter((t) => t.discount_percent === 0);

  const discRevenue = discountedTrans.reduce((s, t) => s + t.net_revenue, 0);
  const discProfit = discountedTrans.reduce((s, t) => s + t.profit, 0);
  const discMargin = discRevenue > 0 ? (discProfit / discRevenue) * 100 : 0;

  const fullRevenue = fullPriceTrans.reduce((s, t) => s + t.net_revenue, 0);
  const fullProfit = fullPriceTrans.reduce((s, t) => s + t.profit, 0);
  const fullMargin = fullRevenue > 0 ? (fullProfit / fullRevenue) * 100 : 0;

  const marginErosion = fullMargin - discMargin;
  if (discountedTrans.length > 0) {
    insights.push({
      id: 'insight-discount-erosion',
      category: 'Profitability',
      title: `Discounting Erodes Profit Margins by ${marginErosion.toFixed(1)} Percentage Points`,
      badge: marginErosion > 15 ? 'Critical Alert' : 'Strategic Watch',
      badgeColor: marginErosion > 15 ? 'rose' : 'amber',
      metricValue: `${discMargin.toFixed(1)}% vs ${fullMargin.toFixed(1)}%`,
      observation: `Full-price sales yield a healthy ${fullMargin.toFixed(1)}% margin, whereas discounted orders yield only ${discMargin.toFixed(1)}%, representing an erosion of ${marginErosion.toFixed(1)}% in net margin.`,
      analysis: `Promotional campaigns (15%-25% discounts) effectively drive unit sales, but aggressive discounting without minimum basket thresholds is burning gross profits on premium SKUs.`,
      recommendation: `Shift from blanket percentage discounts to conditional thresholds (e.g., "$25 off orders above $150") or loyalty point rewards to protect product margin integrity.`,
    });
  }

  // 3. Product Level Winner & Underperformer
  const prodMap = new Map<string, { name: string; revenue: number; profit: number; units: number; category: string }>();
  for (const t of validTrans) {
    const cur = prodMap.get(t.product_id) || { name: t.product_name, revenue: 0, profit: 0, units: 0, category: t.category };
    cur.revenue += t.net_revenue;
    cur.profit += t.profit;
    cur.units += t.quantity;
    prodMap.set(t.product_id, cur);
  }

  const productsList = Array.from(prodMap.values());
  const topProfitProd = [...productsList].sort((a, b) => b.profit - a.profit)[0];
  const lowestMarginProd = [...productsList]
    .filter((p) => p.units >= 5)
    .sort((a, b) => (a.profit / a.revenue) - (b.profit / b.revenue))[0];

  if (topProfitProd) {
    insights.push({
      id: 'insight-profit-hero',
      category: 'Products',
      title: `Profit Hero: "${topProfitProd.name}" Delivers ${formatCurrency(topProfitProd.profit)} in Net Profit`,
      badge: 'Positive Trend',
      badgeColor: 'emerald',
      metricValue: `${formatCurrency(topProfitProd.profit)} Profit`,
      observation: `Generating ${formatCurrency(topProfitProd.revenue)} in revenue, this SKU achieved an outstanding profit margin of ${((topProfitProd.profit / topProfitProd.revenue) * 100).toFixed(1)}%.`,
      analysis: `Strong consumer willingness to pay coupled with favorable supplier wholesale cost creates superior unit economics for this product.`,
      recommendation: `Allocate higher paid search and homepage hero banner priority to this product; test a 3-5% modest price increase to test price elasticity.`,
    });
  }

  if (lowestMarginProd && (lowestMarginProd.profit / lowestMarginProd.revenue) < 0.25) {
    const pMargin = ((lowestMarginProd.profit / lowestMarginProd.revenue) * 100).toFixed(1);
    insights.push({
      id: 'insight-low-margin-sku',
      category: 'Profitability',
      title: `Low Margin Alert: "${lowestMarginProd.name}" Sells Volume at Only ${pMargin}% Margin`,
      badge: 'Critical Alert',
      badgeColor: 'rose',
      metricValue: `${pMargin}% Margin`,
      observation: `Despite selling ${lowestMarginProd.units} units and generating ${formatCurrency(lowestMarginProd.revenue)}, it generated only ${formatCurrency(lowestMarginProd.profit)} in net profit.`,
      analysis: `High wholesale production cost and frequent promotional markdowns leave very little operating profit cushion after fulfillment overhead.`,
      recommendation: `Renegotiate wholesale procurement tier pricing with suppliers for this SKU or exclude it from storewide coupon codes.`,
    });
  }

  // 4. Customer Pareto Principle (80/20 Rule)
  const sortedCust = [...customers].sort((a, b) => b.total_spend - a.total_spend);
  const top20Count = Math.max(1, Math.floor(sortedCust.length * 0.2));
  const top20Spend = sortedCust.slice(0, top20Count).reduce((s, c) => s + c.total_spend, 0);
  const top20Share = totalRevenue > 0 ? ((top20Spend / totalRevenue) * 100).toFixed(1) : '0';

  insights.push({
    id: 'insight-pareto',
    category: 'Customer Retention',
    title: `Pareto Concentration: Top 20% Customers Drive ${top20Share}% of Total Sales`,
    badge: 'Strategic Watch',
    badgeColor: 'indigo',
    metricValue: `${top20Share}% of Revenue`,
    observation: `Just ${top20Count} VIP customers generated ${formatCurrency(top20Spend)} out of ${formatCurrency(totalRevenue)} total sales.`,
    analysis: `A small core cohort of loyal buyers anchors store profitability. Losing even 3 to 5 of these key accounts directly impacts monthly sales targets.`,
    recommendation: `Establish a dedicated VIP concierge tier with early access to product launches, free priority shipping, and birthday gifts to maximize lifetime retention.`,
  });

  // 5. At-Risk Customers & Revenue at Stake
  const atRiskGroup = customers.filter((c) => c.rfm_segment === 'At-Risk Customers');
  const atRiskSpend = atRiskGroup.reduce((s, c) => s + c.total_spend, 0);

  if (atRiskGroup.length > 0) {
    insights.push({
      id: 'insight-at-risk',
      category: 'Customer Retention',
      title: `${atRiskGroup.length} Previously High-Value Customers Are At-Risk (${formatCurrency(atRiskSpend)} at Stake)`,
      badge: 'Critical Alert',
      badgeColor: 'rose',
      metricValue: `${formatCurrency(atRiskSpend)} At Risk`,
      observation: `${atRiskGroup.length} customers who previously bought frequently have not made a purchase in over 90 to 120 days.`,
      analysis: `Customers in this segment have proven willingness to spend, but are entering customer churn latency without automated lifecycle triggers.`,
      recommendation: `Launch an automated "We miss you" re-engagement email sequence offering an exclusive 15% personalized return incentive.`,
    });
  }

  // 6. Geographic Sales Hub
  const cityMap = new Map<string, { revenue: number; orders: number }>();
  for (const t of validTrans) {
    const cur = cityMap.get(t.city) || { revenue: 0, orders: 0 };
    cur.revenue += t.net_revenue;
    cur.orders += 1;
    cityMap.set(t.city, cur);
  }
  const topCity = Array.from(cityMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  if (topCity) {
    const cityShare = ((topCity[1].revenue / totalRevenue) * 100).toFixed(1);
    insights.push({
      id: 'insight-geo-hub',
      category: 'Geography',
      title: `Top Regional Hub: ${topCity[0]} Leads with ${cityShare}% of Total Sales`,
      badge: 'Growth Opportunity',
      badgeColor: 'emerald',
      metricValue: formatCurrency(topCity[1].revenue),
      observation: `${topCity[0]} generated ${formatCurrency(topCity[1].revenue)} across ${topCity[1].orders} order items, making it the most lucrative regional territory.`,
      analysis: `High population density, faster shipping delivery speeds, and local brand resonance are compounding conversion rates in this metropolitan area.`,
      recommendation: `Target geo-fenced Instagram and Google Ads to neighboring metro zip codes and consider regional fulfillment center partnerships.`,
    });
  }

  return insights;
}
