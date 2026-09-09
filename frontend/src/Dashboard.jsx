import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from './api';

const CATEGORY_COLORS = {
  bug: '#dc2626',
  security: '#ea580c',
  performance: '#d97706',
  readability: '#0891b2',
  maintainability: '#7c3aed',
  testing: '#059669',
};

export default function AnalyticsDashboard({ owner, repo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getDashboard(owner, repo)
      .then(setData)
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) return <p className="text-sm text-slate-500 mt-4">Loading analytics...</p>;
  if (!data) return null;

  return (
    <div className="mt-4 space-y-6">
      <HealthScore health={data.health} />
      <TrendChart trends={data.trends} />
      <Hotspots hotspots={data.hotspots} />
      <RecurringIssues issues={data.recurringIssues} />
    </div>
  );
}

function HealthScore({ health }) {
  const color = health.score >= 80 ? 'text-green-600' : health.score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="border border-slate-200 rounded-lg p-4 text-center">
        <p className={`text-3xl font-semibold ${color}`}>{health.score}</p>
        <p className="text-xs text-slate-500 mt-1">Health Score</p>
      </div>
      <div className="border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-semibold text-slate-900">{health.openCount}</p>
        <p className="text-xs text-slate-500 mt-1">Open</p>
      </div>
      <div className="border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-semibold text-slate-900">{health.recurringCount}</p>
        <p className="text-xs text-slate-500 mt-1">Recurring</p>
      </div>
      <div className="border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-semibold text-slate-900">{health.resolvedCount}</p>
        <p className="text-xs text-slate-500 mt-1">Resolved</p>
      </div>
    </div>
  );
}

function TrendChart({ trends }) {
  if (trends.length === 0) {
    return <p className="text-sm text-slate-500">No trend data yet.</p>;
  }

  // Reshape [{week, category, count}] rows into one row per week with
  // a column per category, which is what Recharts' <Line> per-category
  // rendering expects.
  const weeks = [...new Set(trends.map((t) => t.week))].sort();
  const categories = [...new Set(trends.map((t) => t.category))];

  const chartData = weeks.map((week) => {
    const row = { week: new Date(week).toLocaleDateString() };
    for (const cat of categories) {
      const match = trends.find((t) => t.week === week && t.category === cat);
      row[cat] = match ? match.count : 0;
    }
    return row;
  });

  return (
    <div>
      <h2 className="text-sm font-medium text-slate-500 mb-2">Issue Trends</h2>
      <div className="border border-slate-200 rounded-lg p-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {categories.map((cat) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={CATEGORY_COLORS[cat] || '#64748b'}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Hotspots({ hotspots }) {
  if (hotspots.length === 0) {
    return null;
  }

  const max = Math.max(...hotspots.map((h) => h.findingCount));

  return (
    <div>
      <h2 className="text-sm font-medium text-slate-500 mb-2">Code Hotspots</h2>
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
        {hotspots.map((h) => (
          <div key={h.filePath} className="p-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-mono text-slate-700 truncate">{h.filePath}</span>
              <span className="text-slate-500 flex-shrink-0 ml-2">
                {h.findingCount} findings · {h.prCount} PRs
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full"
                style={{ width: `${(h.findingCount / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecurringIssues({ issues }) {
  if (issues.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-2">Recurring Issues</h2>
        <p className="text-sm text-slate-500">No recurring issues detected yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-slate-500 mb-2">Recurring Issues</h2>
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
        {issues.map((issue) => (
          <div key={issue.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{issue.representative_title}</p>
              <p className="text-xs text-slate-500 font-mono truncate">{issue.file_path}</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-purple-100 text-purple-800 border-purple-200 flex-shrink-0">
              {issue.occurrence_count}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}