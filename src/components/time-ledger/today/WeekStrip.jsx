'use client';

import { useMemo } from 'react';
import { addDays, fromDateStr, toDateStr, WEEKDAY_LABELS } from '@/lib/time-ledger/dates.js';

export default function WeekStrip({ date, entries, categories, onPick }) {
  const days = useMemo(() => {
    // 오늘 혹은 선택일 기준 왼쪽 6일 + 본인 = 7일
    const base = fromDateStr(date);
    const arr = [];
    for (let i = -6; i <= 0; i += 1) {
      const d = addDays(base, i);
      const ds = toDateStr(d);
      const entry = entries[ds];
      const logs = entry?.logs || [];
      const total = logs.reduce((s, l) => s + (Number(l.hours) || 0), 0);
      const byCat = {};
      for (const l of logs) {
        byCat[l.categoryId] = (byCat[l.categoryId] || 0) + (Number(l.hours) || 0);
      }
      const stickies = entry?.stickies || [];
      const stickyTodo = stickies.filter((s) => !s.done).length;
      arr.push({
        ds,
        day: d.getDate(),
        month: d.getMonth() + 1,
        dow: d.getDay(),
        total,
        byCat,
        stickyCount: stickies.length,
        stickyTodo,
      });
    }
    return arr;
  }, [date, entries]);

  const max = Math.max(...days.map((d) => d.total), 0.01);

  return (
    <section className="fade-in">
      <div
        className="rounded-2xl p-4"
        style={{
          background: '#FFFDF6',
          border: '1px solid #EFE7D4',
        }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs" style={{ color: '#8A7F73' }}>
            최근 7일
          </h3>
          <span className="text-xs" style={{ color: '#A8A29E' }}>
            선택일 포함
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const selected = d.ds === date;
            const heightPct = (d.total / max) * 100;
            const segs = Object.entries(d.byCat)
              .map(([id, h]) => ({
                id,
                h,
                color: categories.find((c) => c.id === id)?.color ?? '#B8AFA4',
              }))
              .sort((a, b) => b.h - a.h);
            return (
              <button
                key={d.ds}
                onClick={() => onPick?.(d.ds)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-2 px-1 transition"
                style={{
                  background: selected ? '#FFF3E6' : 'transparent',
                  border: selected ? '1.5px solid #F3B36A' : '1.5px solid transparent',
                }}
              >
                <span
                  className="text-[10px]"
                  style={{
                    color: d.dow === 0 || d.dow === 6 ? '#EF8B7F' : '#8A7F73',
                  }}
                >
                  {WEEKDAY_LABELS[d.dow]}
                </span>
                <div
                  className="rounded-full flex flex-col-reverse overflow-hidden"
                  style={{
                    background: '#F3EDE1',
                    width: 22,
                    height: 60,
                  }}
                >
                  {d.total > 0 && (
                    <div
                      className="flex flex-col-reverse overflow-hidden"
                      style={{
                        height: `${Math.max(heightPct, 8)}%`,
                        background: '#F3EDE1',
                      }}
                    >
                      {segs.map((s) => {
                        const segPct = (s.h / d.total) * 100;
                        return (
                          <div
                            key={s.id}
                            style={{
                              height: `${segPct}%`,
                              background: s.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <span
                  className="display italic tabular-nums text-xs"
                  style={{ color: d.total > 0 ? '#2B2620' : '#C6BDB0' }}
                >
                  {d.total > 0 ? d.total.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: '#A8A29E' }}>
                  {d.day}
                  {d.stickyCount > 0 && (
                    <span
                      title={`스티커 ${d.stickyCount}장 (남은 ${d.stickyTodo})`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 14,
                        height: 14,
                        padding: '0 4px',
                        borderRadius: 999,
                        background: d.stickyTodo > 0 ? '#FFF1A8' : '#D1F5E4',
                        color: d.stickyTodo > 0 ? '#8A6800' : '#1F7A5A',
                        fontSize: 9,
                        fontWeight: 600,
                        lineHeight: 1,
                      }}
                    >
                      {d.stickyTodo > 0 ? d.stickyTodo : '✓'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
