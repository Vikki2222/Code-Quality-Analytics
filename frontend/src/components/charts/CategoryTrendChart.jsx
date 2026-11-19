import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORIES, CATEGORY_COLORS, capitalize, formatDate } from '../../lib/format';

const AXIS = { fill: 'var(--color-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' };

/** API rows are {week, category, count}; recharts wants one row per week. */
function pivot(trends) {
  const byWeek = new Map();
  for (const { week, category, count } of trends) {
    if (!byWeek.has(week)) byWeek.set(week, { week });
    byWeek.get(week)[category] = count;
  }
  return [...byWeek.values()];
}

/** New findings per week, stacked by category. */
export default function CategoryTrendChart({ trends }) {
  const data = pivot(trends);
  const present = CATEGORIES.filter((c) => trends.some((t) => t.category === c));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={formatDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-2)' }}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-line-strong)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(week) => `Week of ${formatDate(week)}`}
            formatter={(value, name) => [value, capitalize(name)]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(name) => <span className="text-xs text-fg-2">{capitalize(name)}</span>}
          />
          {present.map((category, i) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="findings"
              fill={CATEGORY_COLORS[category]}
              radius={i === present.length - 1 ? [3, 3, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
