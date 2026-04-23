import { useMemo } from 'react';
import { weekdayPattern } from '@/lib/time-ledger/analysis.js';
import { WEEKDAY_LABELS } from '@/lib/time-ledger/dates.js';
import Section from '../common/Section.jsx';

export default function WeekdayPattern({ entries, year, monthIndex0, categories }) {
  const pattern = useMemo(
    () => weekdayPattern(entries, year, monthIndex0, categories),
    [entries, year, monthIndex0, categories]
  );
  const maxTotal = Math.max(...pattern.map((p) => p.total), 0);
  if (maxTotal === 0) return null;

  return (
    <Section title="요일별 루틴 패턴" subtitle="어느 요일에 어떤 업무가 몰렸나">
      <div className="rounded-lg p-5" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
        <div className="grid grid-cols-7 gap-2">
          {pattern.map((p) => {
            const pct = (p.total / maxTotal) * 100;
            return (
              <div key={p.dow} className="flex flex-col">
                <div
                  className="display italic text-xs text-center mb-1"
                  style={{ color: p.dow === 0 || p.dow === 6 ? '#C85450' : '#57534E' }}
                >
                  {WEEKDAY_LABELS[p.dow]}
                </div>
                <div
                  className="rounded flex items-end justify-center mb-2"
                  style={{
                    background: '#F3EDE1',
                    height: 70,
                    padding: 2,
                  }}
                >
                  <div
                    className="w-full rounded-sm flex flex-col overflow-hidden"
                    style={{ height: `${Math.max(pct, 3)}%`, minHeight: 2 }}
                  >
                    {p.top.map((t) => {
                      const h = (t.hours / p.total) * 100;
                      return (
                        <div
                          key={t.categoryId}
                          style={{ background: t.color, height: `${h}%` }}
                          title={`${t.name} ${t.hours.toFixed(1)}h`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="display italic text-xs text-center" style={{ color: '#2B2620' }}>
                  {p.total.toFixed(1)}h
                </div>
                {p.top[0] && (
                  <div className="mt-1 text-[10px] text-center truncate" style={{ color: '#8A7F73' }}>
                    {p.top[0].name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
