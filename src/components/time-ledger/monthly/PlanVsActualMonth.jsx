import { useMemo } from 'react';
import { monthGap } from '@/lib/time-ledger/analysis.js';
import Section from '../common/Section.jsx';

export default function PlanVsActualMonth({ entries, year, monthIndex0, categories }) {
  const rows = useMemo(
    () => monthGap(entries, year, monthIndex0),
    [entries, year, monthIndex0]
  );
  const hasData = rows.some((r) => r.planned > 0 || r.actual > 0);
  if (!hasData) return null;

  const maxAbs = Math.max(...rows.map((r) => Math.max(r.planned, r.actual)), 1);

  return (
    <Section title="계획 vs 실제 (월 집계)" subtitle="이 달 전체의 카테고리별 시간 배분">
      <div className="rounded-lg p-4 space-y-2" style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}>
        {rows.map((r) => {
          const cat = categories.find((c) => c.id === r.categoryId);
          const plannedPct = (r.planned / maxAbs) * 100;
          const actualPct = (r.actual / maxAbs) * 100;
          const gapColor = r.gap > 0 ? '#5C8A6E' : r.gap < 0 ? '#C85450' : '#78716C';
          const gapLabel = r.gap > 0 ? `+${r.gap.toFixed(1)}` : r.gap.toFixed(1);
          return (
            <div key={r.categoryId} className="flex items-center gap-3">
              <span className="text-sm truncate" style={{ color: '#1C1917', minWidth: '7rem' }}>
                {cat?.name ?? '?'}
              </span>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#A8A29E', minWidth: '2.2rem' }}>계획</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: '#F0EEE8' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${plannedPct}%`, background: (cat?.color ?? '#D4883F') + '66' }}
                    />
                  </div>
                  <span className="display italic text-xs tabular-nums" style={{ color: '#78716C', minWidth: '3.2rem', textAlign: 'right' }}>
                    {r.planned.toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#A8A29E', minWidth: '2.2rem' }}>실제</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: '#F0EEE8' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${actualPct}%`, background: cat?.color ?? '#5C8A6E' }}
                    />
                  </div>
                  <span className="display italic text-xs tabular-nums" style={{ color: '#78716C', minWidth: '3.2rem', textAlign: 'right' }}>
                    {r.actual.toFixed(1)}h
                  </span>
                </div>
              </div>
              <span className="display italic text-sm tabular-nums" style={{ color: gapColor, minWidth: '3.2rem', textAlign: 'right' }}>
                {gapLabel}h
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
