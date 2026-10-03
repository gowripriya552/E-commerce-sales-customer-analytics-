import React, { useState, useMemo } from 'react';
import {
  Globe2,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Transaction, CustomerSummary, WORLD_LOCATIONS, formatCurrency, formatNumber } from '../../data/analyticsEngine';
import { HorizontalBarChart } from '../Charts';

interface GeographicPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
}

export function GeographicPage({ transactions, customers }: GeographicPageProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [citySearch, setCitySearch] = useState('');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit' | 'orders' | 'aov'>('revenue');

  const valid = useMemo(
    () => transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'),
    [transactions]
  );

  const countries = useMemo(() => {
    const list = Array.from(new Set(transactions.map((t) => t.country || 'USA'))).sort();
    return ['All', ...list];
  }, [transactions]);

  // Aggregate by Country
  const countryStats = useMemo(() => {
    const map = new Map<string, {
      country: string;
      revenue: number;
      profit: number;
      orders: Set<string>;
      customers: Set<string>;
      units: number;
    }>();

    for (const t of valid) {
      const cName = t.country || 'USA';
      const cur = map.get(cName) || {
        country: cName,
        revenue: 0,
        profit: 0,
        orders: new Set(),
        customers: new Set(),
        units: 0,
      };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.orders.add(t.order_id);
      cur.customers.add(t.customer_id);
      cur.units += t.quantity;
      map.set(cName, cur);
    }

    const totalRev = valid.reduce((s, t) => s + t.net_revenue, 0);

    return Array.from(map.values()).map((c) => {
      const orderCount = c.orders.size;
      const custCount = c.customers.size;
      const aov = orderCount > 0 ? c.revenue / orderCount : 0;
      const margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
      const share = totalRev > 0 ? (c.revenue / totalRev) * 100 : 0;

      return {
        country: c.country,
        revenue: c.revenue,
        profit: c.profit,
        orders: orderCount,
        customers: custCount,
        units: c.units,
        aov,
        margin,
        share,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [valid]);

  // Aggregate by City within selected country
  const cityStats = useMemo(() => {
    const map = new Map<string, {
      city: string;
      country: string;
      state: string;
      revenue: number;
      profit: number;
      orders: Set<string>;
      customers: Set<string>;
      units: number;
    }>();

    for (const t of valid) {
      if (selectedCountry !== 'All' && t.country !== selectedCountry) continue;

      const key = `${t.city}-${t.country}`;
      const cur = map.get(key) || {
        city: t.city,
        country: t.country || 'USA',
        state: t.state || '',
        revenue: 0,
        profit: 0,
        orders: new Set(),
        customers: new Set(),
        units: 0,
      };
      cur.revenue += t.net_revenue;
      cur.profit += t.profit;
      cur.orders.add(t.order_id);
      cur.customers.add(t.customer_id);
      cur.units += t.quantity;
      map.set(key, cur);
    }

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        orderCount: c.orders.size,
        customerCount: c.customers.size,
        aov: c.orders.size > 0 ? c.revenue / c.orders.size : 0,
        margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
      }))
      .filter((c) => c.city.toLowerCase().includes(citySearch.toLowerCase()))
      .sort((a, b) => b.revenue - a.revenue);
  }, [valid, selectedCountry, citySearch]);

  const topCountry = countryStats[0];
  const totalGlobalRevenue = valid.reduce((s, t) => s + t.net_revenue, 0);
  const totalGlobalOrders = new Set(valid.map((t) => t.order_id)).size;

  // Chart data for countries based on activeMetric
  const countryChartItems = useMemo(() => {
    return countryStats.slice(0, 10).map((c) => {
      let val = c.revenue;
      let sub = `${c.orders} orders`;
      if (activeMetric === 'profit') {
        val = c.profit;
        sub = `${c.margin.toFixed(1)}% margin`;
      } else if (activeMetric === 'orders') {
        val = c.orders;
        sub = formatCurrency(c.revenue);
      } else if (activeMetric === 'aov') {
        val = c.aov;
        sub = `${c.orders} orders`;
      }
      return {
        id: c.country,
        name: c.country,
        value: val,
        subValue: sub,
        badge: `${c.share.toFixed(1)}% share`,
      };
    });
  }, [countryStats, activeMetric]);

  // World map coordinates mapping for interactive SVG display
  const mapBubbles = useMemo(() => {
    const locMap = new Map<string, { lat: number; lng: number }>();
    WORLD_LOCATIONS.forEach((loc) => {
      if (loc.cities.length > 0) {
        locMap.set(loc.country, { lat: loc.cities[0].lat, lng: loc.cities[0].lng });
      }
    });

    const maxRev = countryStats[0]?.revenue || 1;

    return countryStats.map((c) => {
      const coords = locMap.get(c.country) || { lat: 30, lng: 0 };
      // Simple Mercator-like projection onto 900x420 viewBox
      const x = ((coords.lng + 180) / 360) * 860 + 20;
      const y = ((90 - coords.lat) / 180) * 380 + 20;
      const radius = Math.max(6, Math.min(28, (c.revenue / maxRev) * 28));

      return {
        ...c,
        x,
        y,
        radius,
      };
    });
  }, [countryStats]);

  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-indigo-600" />
            Global & Regional Geographic Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Worldwide market penetration across 21+ countries (India, USA, UK, Canada, Germany, Japan, UAE, Brazil, etc.)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? '🌍 Worldwide (All Countries)' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Worldwide KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Global Active Markets</span>
            <Globe2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{countryStats.length} Countries</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Top: {topCountry?.country} ({topCountry?.share.toFixed(1)}%)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Worldwide Net Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalGlobalRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{formatNumber(totalGlobalOrders)} orders placed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Global Average Order Value</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(totalGlobalOrders > 0 ? totalGlobalRevenue / totalGlobalOrders : 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cross-border basket average</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Unique Global Customers</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{customers.length} Accounts</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active worldwide customer base</div>
        </div>
      </div>

      {/* Interactive Global World Map View */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Interactive Worldwide Revenue Distribution Map
            </h2>
            <p className="text-xs text-slate-500">
              Bubble size represents revenue volume. Hover over country nodes to inspect regional profit and order counts.
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            21 Key Commercial Hubs
          </span>
        </div>

        {/* SVG World Projection Map Canvas */}
        <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-4">
          <svg viewBox="0 0 900 420" className="w-full h-auto select-none font-sans">
            {/* Ambient World Grid Lines */}
            <line x1="0" y1="210" x2="900" y2="210" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
            <line x1="450" y1="0" x2="450" y2="420" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
            <rect x="0" y="0" width="900" height="420" fill="transparent" />

            {/* Stylized continent outline approximations */}
            <g opacity="0.15" fill="#64748b">
              {/* North America */}
              <path d="M 120,80 Q 220,60 280,120 Q 240,200 180,240 Q 110,180 120,80 Z" />
              {/* South America */}
              <path d="M 230,240 Q 300,260 270,360 Q 230,380 210,300 Z" />
              {/* Europe */}
              <path d="M 430,70 Q 520,60 510,130 Q 440,150 420,100 Z" />
              {/* Africa */}
              <path d="M 440,160 Q 530,170 510,300 Q 450,330 420,240 Z" />
              {/* Asia */}
              <path d="M 520,60 Q 750,50 780,170 Q 660,250 530,170 Z" />
              {/* Australia */}
              <path d="M 720,280 Q 820,270 810,360 Q 720,360 700,300 Z" />
            </g>

            {/* Country Nodes / Bubbles */}
            {mapBubbles.map((b) => (
              <g
                key={b.country}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredCountry(b)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => setSelectedCountry(b.country === selectedCountry ? 'All' : b.country)}
              >
                {/* Glow ring */}
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.radius + 4}
                  fill="#4f46e5"
                  opacity={hoveredCountry?.country === b.country ? 0.35 : 0.12}
                />
                {/* Solid bubble */}
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.radius}
                  fill={b.country === 'India' ? '#10b981' : b.country === 'USA' ? '#6366f1' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity="0.88"
                />
                {/* Country code / name label */}
                <text
                  x={b.x}
                  y={b.y + b.radius + 12}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-300 font-bold pointer-events-none drop-shadow-xs"
                >
                  {b.country}
                </text>
              </g>
            ))}
          </svg>

          {/* Interactive Map Tooltip */}
          {hoveredCountry && (
            <div
              className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg shadow-xl p-3 text-xs border border-slate-700 space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredCountry.x / 900) * 100}%`,
                top: `${(hoveredCountry.y / 420) * 100 - 8}%`,
              }}
            >
              <div className="font-bold text-white border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                <span>{hoveredCountry.country}</span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {hoveredCountry.share.toFixed(1)}% Share
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-slate-400">Net Sales:</span>
                <span className="font-bold font-mono">{formatCurrency(hoveredCountry.revenue)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Profit:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatCurrency(hoveredCountry.profit)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 pt-0.5">
                <span>Orders: {hoveredCountry.orders}</span>
                <span>Margin: {hoveredCountry.margin.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row: Metric Ranking Chart & City Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Ranking with Metric Switcher */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Top Countries Ranking
              </h2>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {(['revenue', 'profit', 'orders', 'aov'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer capitalize ${
                      activeMetric === m ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ranked by {activeMetric.toUpperCase()} output across active worldwide territories
            </p>
            <HorizontalBarChart
              items={countryChartItems}
              valueFormatter={
                activeMetric === 'orders' ? (v) => `${formatNumber(v)} orders` : formatCurrency
              }
              barColor="bg-indigo-600"
            />
          </div>
        </div>

        {/* City Performance Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Metropolitan City Performance
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedCountry === 'All' ? 'All worldwide cities' : `Cities in ${selectedCountry}`}
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search city (e.g. Bengaluru, London)..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[360px]">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3">Country</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cityStats.map((c) => (
                    <tr key={`${c.city}-${c.country}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-900">{c.city}</td>
                      <td className="py-2 px-3 text-slate-500">{c.country}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-600 font-mono">
                        {formatCurrency(c.profit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          c.margin >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">{c.orderCount}</td>
                      <td className="py-2 px-3 text-right text-slate-700 font-mono">
                        {formatCurrency(c.aov)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
