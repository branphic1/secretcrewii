import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Section from '../common/Section.jsx';

export default function CategoryPie({ categories, catTotals }) {
  const rows = Object.entries(catTotals)
    .map(([catId, hours]) => {
      const c = categories.find((x) => x.id === catId);
      return { id: catId, name: c?.name ?? '삭제된 카테고리', color: c?.color ?? '#E0D4B8', hours };
    })
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const total = rows.reduce((s, r) => s + r.hours, 0);
  if (total === 0) return null;

  return (
    <Section title="카테고리별 분포">
      <div className="rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-6" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={rows}
                dataKey="hours"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                stroke="#FFFDF6"
                strokeWidth={2}
              >
                {rows.map((r) => (
                  <Cell key={r.id} fill={r.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col justify-center gap-2">
          {rows.map((r) => {
            const pct = Math.round((r.hours / total) * 100);
            return (
              <li key={r.id} className="flex items-center gap-3 text-sm">
                <span className="rounded-full shrink-0" style={{ width: 10, height: 10, background: r.color }} />
                <span className="flex-1 truncate" style={{ color: '#2B2620' }}>{r.name}</span>
                <span className="display italic text-xs" style={{ color: '#8A7F73' }}>{r.hours.toFixed(1)}h</span>
                <span className="text-xs tabular-nums" style={{ color: '#A8A29E', minWidth: '2.5rem', textAlign: 'right' }}>
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
