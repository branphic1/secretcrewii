import { useMemo } from 'react';
import { quarterThemeAlignment } from '@/lib/time-ledger/analysis.js';

export default function ThemeAlignment({ entries, yearlyPlan, categories }) {
  const data = useMemo(
    () => quarterThemeAlignment(entries, yearlyPlan, categories),
    [entries, yearlyPlan, categories]
  );

  const hasAnyGoals = (yearlyPlan.goals || []).some((g) => (g.relatedCategoryIds || []).length > 0);

  return (
    <div className="rounded-lg p-5 space-y-4" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
      {!hasAnyGoals && (
        <p className="text-xs" style={{ color: '#A8A29E' }}>
          연간 목표에 <span className="display italic">관련 카테고리</span>를 연결하면 분기별 정렬도가 계산됩니다.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((qr) => {
          const pct = Math.round(qr.targetShare * 100);
          return (
            <div
              key={qr.q}
              className="rounded-md p-3"
              style={{ background: '#FFFBF3', border: '1px solid #F3EDE1' }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <div className="display italic text-base" style={{ color: '#2B2620' }}>Q{qr.q}</div>
                <div className="display italic text-sm" style={{ color: '#57534E' }}>
                  {qr.totalHours.toFixed(1)}h
                </div>
              </div>
              <div className="text-xs mb-2" style={{ color: '#8A7F73' }}>
                {qr.theme || <span style={{ color: '#A8A29E' }}>테마 미설정</span>}
              </div>
              <div className="h-2 rounded-full" style={{ background: '#F3EDE1' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 70 ? '#5C8A6E' : pct >= 40 ? '#D4883F' : '#C85450',
                  }}
                />
              </div>
              <div className="mt-1 text-[11px]" style={{ color: '#57534E' }}>
                목표 정렬도 <span className="display italic">{pct}%</span>
                {hasAnyGoals && qr.totalHours > 0 && (
                  <span style={{ color: '#A8A29E' }}>
                    {' '}· 목표 카테고리 시간 {(qr.targetShare * qr.totalHours).toFixed(1)}h
                  </span>
                )}
              </div>
              {qr.rows.slice(0, 3).length > 0 && (
                <ul className="mt-3 space-y-0.5">
                  {qr.rows.filter((r) => r.hours > 0).slice(0, 3).map((r) => (
                    <li key={r.categoryId} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          background: r.color,
                          outline: r.isTarget ? '1.5px solid #2B2620' : 'none',
                          outlineOffset: '1px',
                        }}
                      />
                      <span className="flex-1 truncate" style={{ color: r.isTarget ? '#2B2620' : '#57534E' }}>
                        {r.name}
                      </span>
                      <span className="display italic tabular-nums" style={{ color: '#8A7F73' }}>
                        {Math.round(r.share * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
