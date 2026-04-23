import { useMemo } from 'react';
import { shortMonth } from '@/lib/time-ledger/dates.js';

export default function MonthCards({ year, entries, categories, monthNotes, onNotesChange, onPickMonth }) {
  const byMonth = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => ({ total: 0, activeDays: 0, cat: {} }));
    for (const [dateStr, entry] of Object.entries(entries)) {
      if (!dateStr.startsWith(`${year}-`)) continue;
      const m = Number(dateStr.slice(5, 7)) - 1;
      const logs = entry.logs || [];
      if (!logs.length) continue;
      let day = 0;
      for (const l of logs) {
        const h = Number(l.hours) || 0;
        day += h;
        arr[m].cat[l.categoryId] = (arr[m].cat[l.categoryId] || 0) + h;
      }
      if (day > 0) {
        arr[m].total += day;
        arr[m].activeDays += 1;
      }
    }
    return arr;
  }, [year, entries]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {byMonth.map((m, mi) => {
        const top = Object.entries(m.cat)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, h]) => ({ id, h, cat: categories.find((c) => c.id === id) }));
        const empty = m.total === 0;
        return (
          <div
            key={mi}
            className="rounded-lg p-4"
            style={{ background: '#FFFDF6', border: '1px solid #EFE7D4', opacity: empty ? 0.7 : 1 }}
          >
            <div className="flex items-baseline justify-between">
              <button
                onClick={() => onPickMonth?.(year, mi)}
                className="display italic text-xl hover:underline"
                style={{ color: '#2B2620' }}
              >
                {shortMonth(mi)}
              </button>
              <span className="display italic text-sm" style={{ color: '#57534E' }}>
                {m.total.toFixed(1)}h
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#8A7F73' }}>
              활성 {m.activeDays}일
            </div>

            <input
              type="text"
              placeholder="핵심 이벤트 메모"
              value={monthNotes[mi + 1] || ''}
              onChange={(e) => onNotesChange({ ...monthNotes, [mi + 1]: e.target.value })}
              className="mt-3 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              style={{ border: '1px solid #F3EDE1', background: '#FFFBF3', color: '#2B2620' }}
            />

            {top.length > 0 && (
              <ul className="mt-3 space-y-1">
                {top.map(({ id, h, cat }) => (
                  <li key={id} className="flex items-center gap-2 text-xs">
                    <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: cat?.color ?? '#E0D4B8' }} />
                    <span className="flex-1 truncate" style={{ color: '#57534E' }}>{cat?.name ?? '삭제된 카테고리'}</span>
                    <span className="display italic tabular-nums" style={{ color: '#8A7F73' }}>{h.toFixed(1)}h</span>
                  </li>
                ))}
              </ul>
            )}

            {empty && (
              <div className="mt-3 text-xs" style={{ color: '#A8A29E' }}>
                아직 기록이 없습니다
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
