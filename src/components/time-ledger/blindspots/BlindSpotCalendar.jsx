import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { daysInMonth, firstWeekdayOfMonth, monthLabel, pad2, WEEKDAY_LABELS, todayStr } from '@/lib/time-ledger/dates.js';

function expandOccurrences(items, year, monthIndex0) {
  // 단순 구현: dueDate 또는 recurring의 anchor만 표시 (정확한 모든 회차 계산은 v1.2에서)
  const map = {};
  const prefix = `${year}-${pad2(monthIndex0 + 1)}`;
  for (const item of items) {
    if (item.archived || item.status === 'done' || item.status === 'dismissed') continue;
    if (item.type === 'incident') continue;
    const d = item.dueDate || item.recurrence?.anchor;
    if (!d) continue;
    if (!d.startsWith(prefix)) continue;
    const key = d.slice(8, 10);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

export default function BlindSpotCalendar({ items, onPick }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [mi, setMi] = useState(now.getMonth());
  const today = todayStr();

  const occMap = useMemo(() => expandOccurrences(items, year, mi), [items, year, mi]);
  const total = daysInMonth(year, mi);
  const first = firstWeekdayOfMonth(year, mi);

  const prev = () => { if (mi === 0) { setYear(year - 1); setMi(11); } else setMi(mi - 1); };
  const next = () => { if (mi === 11) { setYear(year + 1); setMi(0); } else setMi(mi + 1); };

  const cells = [];
  for (let i = 0; i < first; i += 1) cells.push({ empty: true, key: `e-${i}` });
  for (let d = 1; d <= total; d += 1) {
    const ds = `${year}-${pad2(mi + 1)}-${pad2(d)}`;
    cells.push({ key: ds, day: d, ds, occ: occMap[pad2(d)] || [] });
  }

  return (
    <div className="rounded-lg p-5" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1.5 rounded hover:bg-stone-100" style={{ color: '#8A7F73' }}>
          <ChevronLeft size={16} />
        </button>
        <div className="display italic text-base" style={{ color: '#2B2620' }}>
          {monthLabel(year, mi)}
        </div>
        <button onClick={next} className="p-1.5 rounded hover:bg-stone-100" style={{ color: '#8A7F73' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-center" style={{ color: '#A8A29E' }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} style={{ color: i === 0 || i === 6 ? '#C85450' : '#A8A29E' }}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) =>
          c.empty ? (
            <div key={c.key} />
          ) : (
            <div
              key={c.key}
              className="rounded-md p-1.5 text-left"
              style={{
                background: c.ds === today ? '#FFFBF3' : 'transparent',
                border: c.ds === today ? '1px solid #2B2620' : '1px solid #F3EDE1',
                minHeight: 68,
              }}
            >
              <div className="text-[10px]" style={{ color: '#8A7F73' }}>{c.day}</div>
              <div className="mt-1 space-y-0.5">
                {c.occ.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => onPick?.(it)}
                    className="w-full text-left truncate text-[10px] rounded px-1 py-0.5"
                    style={{
                      background: it.type === 'recurring' ? '#F3EDE1' : '#FFDDD6',
                      color: '#2B2620',
                    }}
                    title={it.title}
                  >
                    {it.title}
                  </button>
                ))}
                {c.occ.length > 3 && (
                  <div className="text-[10px]" style={{ color: '#A8A29E' }}>+{c.occ.length - 3}</div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
