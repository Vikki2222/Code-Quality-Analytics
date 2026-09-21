import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  bug: '#F85149',
  security: '#E3712A',
  performance: '#D29922',
  readability: '#2D7DD2',
  maintainability: '#BC8CFF',
  testing: '#3FB950',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 12,
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: COLORS[p.dataKey] || '#fff', marginBottom: 2 }}>
          {p.dataKey}: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function TrendChart({ trends }) {
  if (!trends?.length)
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        No trend data yet — run a few reviews to populate this.
      </div>
    );

  const weeks = [...new Set(trends.map((t) => t.week))].sort();
  const categories = [...new Set(trends.map((t) => t.category))];

  const chartData = weeks.map((week) => {
    const row = { week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    categories.forEach((cat) => {
      const match = trends.find((t) => t.week === week && t.category === cat);
      row[cat] = match ? Number(match.count) : 0;
    });
    return row;
  });

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
          {categories.map((cat) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={COLORS[cat] || '#888'}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
