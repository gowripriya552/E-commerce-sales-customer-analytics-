import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  Filter,
  DollarSign,
  Users,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Transaction, CustomerSummary } from '../../data/analyticsEngine';
import { generateDynamicInsights, BusinessInsight } from '../../data/insightsEngine';

interface InsightsPageProps {
  transactions: Transaction[];
  customers: CustomerSummary[];
  onNavigate: (page: string) => void;
}

export function InsightsPage({ transactions, customers, onNavigate }: InsightsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const insights = useMemo(
    () => generateDynamicInsights(transactions, customers),
    [transactions, customers]
  );

  const categories = useMemo(() => {
    return ['All', 'Critical Alert', 'Growth Opportunity', 'Positive Trend', 'Strategic Watch'];
  }, []);

  const filteredInsights = useMemo(() => {
    if (selectedFilter === 'All') return insights;
    return insights.filter((ins) => ins.badge === selectedFilter);
  }, [insights, selectedFilter]);

  const criticalCount = insights.filter((i) => i.badge === 'Critical Alert').length;
  const growthCount = insights.filter((i) => i.badge === 'Growth Opportunity').length;
  const positiveCount = insights.filter((i) => i.badge === 'Positive Trend').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            Executive Business Insights & Action Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Algorithmic insights calculated directly from your actual transactional data, separating observation, root cause, and executive recommendations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
            {criticalCount} Critical Alerts
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            {growthCount + positiveCount} Growth Drivers
          </span>
        </div>
      </div>

      {/* Filter Badges Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedFilter === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dynamic Insights Grid */}
      <div className="space-y-4">
        {filteredInsights.map((item: BusinessInsight) => {
          let badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          if (item.badge === 'Critical Alert') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
          if (item.badge === 'Growth Opportunity') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          if (item.badge === 'Positive Trend') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
          if (item.badge === 'Strategic Watch') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors space-y-3.5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                    {item.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
                  Key Metric: {item.metricValue}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {item.title}
              </h2>

              {/* 3-Tier Business Breakdown (Observation -> Analysis -> Recommendation) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                {/* 1. Observation */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    1. Factual Observation
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {item.observation}
                  </p>
                </div>

                {/* 2. Root Cause Analysis */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    2. Analytical Root Cause
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {item.analysis}
                  </p>
                </div>

                {/* 3. Executive Recommendation */}
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-1">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    3. Actionable Playbook
                  </div>
                  <p className="text-indigo-900 leading-relaxed">
                    {item.recommendation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
