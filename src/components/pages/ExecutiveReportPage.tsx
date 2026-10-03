import React, { useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  AlertTriangle,
  TrendingUp,
  Award,
  Globe2,
  Users,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  Transaction,
  CustomerSummary,
  calculatePeriodComparison,
  formatCurrency,
  formatNumber,
} from '../../data/analyticsEngine';
import { generateDynamicInsights } from '../../data/insightsEngine';
import { exportTransactionsToCSV } from '../CsvManager';

interface ExecutiveReportPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

export function ExecutiveReportPage({ transactions, customers }: ExecutiveReportPageProps) {
  const valid = useMemo(
    () => transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'),
    [transactions]
  );

  const totalRev = useMemo(() => valid.reduce((s, t) => s + t.net_revenue, 0), [valid]);
  const totalProf = useMemo(() => valid.reduce((s, t) => s + t.profit, 0), [valid]);
  const totalCost = useMemo(() => valid.reduce((s, t) => s + t.total_cost, 0), [valid]);
  const margin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
  const orderCount = useMemo(() => new Set(valid.map((t) => t.order_id)).size, [valid]);
  const aov = orderCount > 0 ? totalRev / orderCount : 0;

  const periodComp = useMemo(() => calculatePeriodComparison(transactions), [transactions]);
  const insights = useMemo(() => generateDynamicInsights(transactions, customers), [transactions, customers]);

  // Top 5 Products by Revenue
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; profit: number; category: string }>();
    valid.forEach((t) => {
      const cur = map.get(t.product_id) || { name: t.product_name, revenue: 0, profit: 0, category: t.category };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      map.set(t.product_id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [valid]);

  // Top 5 Countries by Revenue
  const topCountries = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    valid.forEach((t) => {
      const c = t.country || 'USA';
      const cur = map.get(c) || { revenue: 0, orders: 0 };
      cur.revenue += t.net_revenue;
      cur.orders += 1;
      map.set(c, cur);
    });
    return Array.from(map.entries())
      .map(([country, d]) => ({ country, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [valid]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number }>();
    valid.forEach((t) => {
      const cur = map.get(t.category) || { revenue: 0, profit: 0 };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      map.set(t.category, cur);
    });
    return Array.from(map.entries())
      .map(([cat, d]) => ({
        category: cat,
        revenue: d.revenue,
        profit: d.profit,
        margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
        share: totalRev > 0 ? (d.revenue / totalRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [valid, totalRev]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Executive Performance Summary & PDF Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Board-ready briefing containing financial KPIs, business alerts, product matrix, and global performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsToCSV(transactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Clean CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs print:shadow-none print:border-none print:p-0 space-y-6 max-w-5xl mx-auto">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Executive Business Intelligence Briefing
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              E-Commerce Sales & Customer Analytics Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Reporting Scope: Global multi-category portfolio across 21 countries • Period: 2023–2024
            </p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
            <div className="font-semibold text-emerald-600 font-mono mt-0.5">Status: Production Verified</div>
          </div>
        </div>

        {/* Period-Over-Period Executive KPI Grid */}
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            1. High-Level Financial Trajectory & MoM Variance
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Total Net Revenue</span>
              <span className="text-lg font-bold text-slate-900 font-mono block mt-0.5">
                {formatCurrency(totalRev)}
              </span>
              <span className={`text-[11px] font-medium font-mono ${periodComp.revChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodComp.revChangePct >= 0 ? '↑ +' : '↓ '}{periodComp.revChangePct}% vs prev month
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Net Gross Profit</span>
              <span className="text-lg font-bold text-emerald-600 font-mono block mt-0.5">
                {formatCurrency(totalProf)}
              </span>
              <span className="text-[11px] text-slate-500">
                Operating Margin: <strong className="text-slate-800">{margin.toFixed(1)}%</strong>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Completed Checkouts</span>
              <span className="text-lg font-bold text-slate-900 font-mono block mt-0.5">
                {formatNumber(orderCount)}
              </span>
              <span className={`text-[11px] font-medium font-mono ${periodComp.ordersChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodComp.ordersChangePct >= 0 ? '↑ +' : '↓ '}{periodComp.ordersChangePct}% vs prev month
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Average Order Value (AOV)</span>
              <span className="text-lg font-bold text-slate-900 font-mono block mt-0.5">
                {formatCurrency(aov)}
              </span>
              <span className="text-[11px] text-slate-500">
                {customers.length} total active customers
              </span>
            </div>
          </div>
        </div>

        {/* Automated Business Alerts */}
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            2. Algorithmic Business Alerts & Operational Signals
          </div>
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{ins.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {ins.badge}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>Analysis:</strong> {ins.analysis}
                </p>
                <p className="text-indigo-900 text-[11px] mt-1 font-medium">
                  <strong>Playbook:</strong> {ins.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Product Champions & Top Countries Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Top Products */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              3. Top Revenue Generating SKUs
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800 truncate max-w-[180px]">
                        {p.name}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(p.revenue)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600">{formatCurrency(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Countries */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              4. Top International Sales Markets
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3 text-right">Orders</th>
                    <th className="py-2 px-3 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {topCountries.map((c) => (
                    <tr key={c.country}>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">{c.country}</td>
                      <td className="py-2 px-3 text-right text-slate-600 font-sans">{c.orders}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Category Contribution Table */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            5. Category Revenue & Profit Margin Share
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Product Category</th>
                  <th className="py-2 px-3 text-right">Net Revenue</th>
                  <th className="py-2 px-3 text-right">Revenue Share</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 px-3 text-right">Profit Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {categoryStats.map((c) => (
                  <tr key={c.category}>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{c.category}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(c.revenue)}</td>
                    <td className="py-2 px-3 text-right text-slate-500 font-sans">{c.share.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-emerald-600">{formatCurrency(c.profit)}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{c.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sign-off / Confidentiality Notice */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Confidential • Prepared for Executive Leadership & Board Review</span>
          <span>E-Commerce Sales & Customer Analytics Platform</span>
        </div>
      </div>
    </div>
  );
}
