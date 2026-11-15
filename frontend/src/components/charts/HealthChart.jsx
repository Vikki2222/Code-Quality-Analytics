import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatDateTime } from '../../lib/format';

const AXIS = { fill: 'var(--color-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' };

function HealthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg">
      <div className="font-mono text-fg">{point.score}</div>
      <div className="text-muted">{formatDateTime(point.at)}</div>
    </div>
  );
}

/** Health score after each review, on a fixed 0-100 scale. */
export default function HealthChart({ history }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="health-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="at" tickFormatter={formatDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip content={<HealthTooltip />} cursor={{ stroke: 'var(--color-line-strong)' }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#health-fill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
