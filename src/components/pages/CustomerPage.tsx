import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  ShoppingBag,
  CreditCard,
  Search,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Globe2,
} from 'lucide-react';
import { CustomerSummary, formatCurrency, formatNumber } from '../../data/analyticsEngine';
import { HorizontalBarChart } from '../Charts';

interface CustomerPageProps {
  customers: CustomerSummary[];
}

export function CustomerPage({ customers }: CustomerPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.total_orders > 1);
  const singleOrderCustomers = customers.filter((c) => c.total_orders === 1);
  const repeatRate = totalCustomers > 0 ? (repeatCustomers.length / totalCustomers) * 100 : 0;

  const totalSpendAll = customers.reduce((s, c) => s + c.total_spend, 0);
  const avgSpendPerCust = totalCustomers > 0 ? totalSpendAll / totalCustomers : 0;
  const avgAov = totalCustomers > 0 ? customers.reduce((s, c) => s + c.avg_order_value, 0) / totalCustomers : 0;

  const countries = useMemo(() => {
    return ['All', ...Array.from(new Set(customers.map((c) => c.country || 'USA'))).sort()];
  }, [customers]);

  const cities = useMemo(() => {
    const list = customers
      .filter((c) => countryFilter === 'All' || (c.country || 'USA') === countryFilter)
      .map((c) => c.city);
    return ['All', ...Array.from(new Set(list))].sort();
  }, [customers, countryFilter]);

  // Spending brackets distribution
  const spendingBrackets = useMemo(() => {
    let under100 = 0;
    let b100to250 = 0;
    let b250to500 = 0;
    let over500 = 0;

    customers.forEach((c) => {
      if (c.total_spend < 100) under100++;
      else if (c.total_spend < 250) b100to250++;
      else if (c.total_spend < 500) b250to500++;
      else over500++;
    });

    return [
      { name: '< $100', value: under100, subValue: `${((under100 / Math.max(1, totalCustomers)) * 100).toFixed(0)}%` },
      { name: '$100 – $250', value: b100to250, subValue: `${((b100to250 / Math.max(1, totalCustomers)) * 100).toFixed(0)}%` },
      { name: '$250 – $500', value: b250to500, subValue: `${((b250to500 / Math.max(1, totalCustomers)) * 100).toFixed(0)}%` },
      { name: '$500+', value: over500, subValue: `${((over500 / Math.max(1, totalCustomers)) * 100).toFixed(0)}%` },
    ];
  }, [customers, totalCustomers]);

  // Frequency brackets
  const frequencyBrackets = useMemo(() => {
    let f1 = 0;
    let f2 = 0;
    let f3 = 0;
    let f4plus = 0;

    customers.forEach((c) => {
      if (c.total_orders === 1) f1++;
      else if (c.total_orders === 2) f2++;
      else if (c.total_orders === 3) f3++;
      else f4plus++;
    });

    return [
      { name: '1 Order (One-Time)', count: f1, pct: ((f1 / Math.max(1, totalCustomers)) * 100).toFixed(0) },
      { name: '2 Orders (First Repeat)', count: f2, pct: ((f2 / Math.max(1, totalCustomers)) * 100).toFixed(0) },
      { name: '3 Orders (Engaged)', count: f3, pct: ((f3 / Math.max(1, totalCustomers)) * 100).toFixed(0) },
      { name: '4+ Orders (Power User)', count: f4plus, pct: ((f4plus / Math.max(1, totalCustomers)) * 100).toFixed(0) },
    ];
  }, [customers, totalCustomers]);

  // Top 10 High-Value Customers
  const top10Customers = useMemo(
    () => [...customers].sort((a, b) => b.total_spend - a.total_spend).slice(0, 10),
    [customers]
  );

  // Search filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchCountry = countryFilter === 'All' || (c.country || 'USA') === countryFilter;
      const matchCity = cityFilter === 'All' || c.city === cityFilter;
      const matchSearch =
        c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.rfm_segment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.country || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCountry && matchCity && matchSearch;
    });
  }, [customers, countryFilter, cityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Customer Behavior & Retention Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Repeat purchase dynamics, customer lifetime value, frequency distribution, and spending concentration across worldwide accounts
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Customer Accounts</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatNumber(totalCustomers)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active global profiles
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Repeat Customers</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono">
            {formatNumber(repeatCustomers.length)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-bold text-emerald-700">{repeatRate.toFixed(1)}%</span> repeat rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Avg Spend per Customer</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(avgSpendPerCust)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cumulative customer spend
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Average Order Value (AOV)</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(avgAov)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Mean transaction size
          </div>
        </div>
      </div>

      {/* Row: Customer Spend & Frequency Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Brackets */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Customer Cumulative Spending Brackets
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of total customer spend across historical lifetime
          </p>

          <HorizontalBarChart
            items={spendingBrackets}
            valueFormatter={(v) => `${v} customers`}
            barColor="bg-indigo-600"
          />
        </div>

        {/* Purchase Frequency Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Lifetime Purchase Frequency Distribution
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Number of orders placed per customer profile
          </p>

          <div className="space-y-3">
            {frequencyBrackets.map((f, i) => (
              <div key={f.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>{f.name}</span>
                  <span className="text-slate-900">{f.count} customers ({f.pct}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      i === 0 ? 'bg-slate-400' : i === 1 ? 'bg-sky-500' : i === 2 ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top VIP Spenders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          Top 10 High-Value VIP Customers
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Ranked by highest cumulative net spend, order frequency, and profit contribution
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Total Net Spend</th>
                <th className="py-2.5 px-3 text-right">Profit Generated</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3">RFM Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top10Customers.map((c, idx) => (
                <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-indigo-600">#{idx + 1}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">{c.customer_id}</td>
                  <td className="py-2 px-3 font-bold text-slate-900">{c.customer_name}</td>
                  <td className="py-2 px-3 text-slate-600">{c.city}, <span className="text-slate-400">{c.country}</span></td>
                  <td className="py-2 px-3 text-right font-medium text-slate-800">{c.total_orders}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(c.total_spend)}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-emerald-600 font-mono">
                    {formatCurrency(c.total_profit)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 font-mono">
                    {formatCurrency(c.avg_order_value)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.rfm_segment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Searchable Customer Directory */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              All Customer Profiles Directory
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredCustomers.length} of {customers.length} customer records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setCityFilter('All');
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              {countries.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[400px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">City & Country</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Total Net Spend</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3 text-right">Recency (Days)</th>
                <th className="py-2.5 px-3">RFM Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-mono text-slate-500">{c.customer_id}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{c.customer_name}</td>
                  <td className="py-2 px-3 text-slate-600">{c.city}, <span className="text-slate-400">{c.country}</span></td>
                  <td className="py-2 px-3 text-right font-medium text-slate-800">{c.total_orders}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(c.total_spend)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 font-mono">
                    {formatCurrency(c.avg_order_value)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500 font-mono">
                    {c.recency_days} days ago
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      {c.rfm_segment}
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
