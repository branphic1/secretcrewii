import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TrendChart({ year, entries, categories }) {
  const [selected, setSelected] = useState(() => categories.slice(0, 3).map((c) => c.id));

  const data = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, m) => ({ month: `${m + 1}월` }));
    for (const [dateStr, entry] of Object.entries(entries)) {
      if (!dateStr.startsWith(`${year}-`)) continue;
      const m = Number(dateStr.slice(5, 7)) - 1;
      for (const l of entry.logs || []) {
        const key = `c_${l.categoryId}`;
        rows[m][key] = (rows[m][key] || 0) + (Number(l.hours) || 0);
      }
    }
    return rows;
  }, [year, entries]);

  const toggle = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <div className="rounded-lg p-5" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
      <div className="flex flex-wrap gap-1 mb-3">
        {categories.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="px-2 py-1 text-xs rounded-full transition"
              style={{
                background: on ? c.color : 'transparent',
                color: on ? '#FFFBF3' : '#57534E',
                border: `1px solid ${on ? c.color : '#EFE7D4'}`,
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#F3EDE1" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A7F73' }} axisLine={{ stroke: '#EFE7D4' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8A7F73' }} axisLine={{ stroke: '#EFE7D4' }} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: '#FFFDF6', border: '1px solid #EFE7D4', borderRadius: 8, fontSize: 12 }}
              formatter={(value, name) => {
                const cat = categories.find((c) => `c_${c.id}` === name);
                return [Number(value).toFixed(1) + 'h', cat?.name ?? name];
              }}
            />
            <Legend
              formatter={(value) => {
                const cat = categories.find((c) => `c_${c.id}` === value);
                return <span style={{ fontSize: 11, color: '#57534E' }}>{cat?.name ?? value}</span>;
              }}
            />
            {selected.map((id) => {
              const c = categories.find((x) => x.id === id);
              if (!c) return null;
              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`c_${id}`}
                  name={`c_${id}`}
                  stroke={c.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
