import { useState } from 'react';
import { daysInMonth, firstWeekdayOfMonth, todayStr, WEEKDAY_LABELS } from '@/lib/time-ledger/dates.js';
import Section from '../common/Section.jsx';

function intensityStep(value, max) {
  if (!value || max === 0) return 0;
  const ratio = value / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function shade(hex, step) {
  // step 0~4: 투명도 조정
  const alphas = [0.08, 0.22, 0.42, 0.65, 0.95];
  // hex → rgba
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alphas[step]})`;
}

export default function Heatmap({ year, monthIndex0, days, accent = '#2B2620', onPick }) {
  const [hover, setHover] = useState(null);
  const total = daysInMonth(year, monthIndex0);
  const firstW = firstWeekdayOfMonth(year, monthIndex0);
  const max = Math.max(...Object.values(days), 0);
  const today = todayStr();

  const cells = [];
  for (let i = 0; i < firstW; i += 1) cells.push({ empty: true, key: `e-${i}` });
  for (let d = 1; d <= total; d += 1) {
    const ds = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const value = days[ds] || 0;
    cells.push({
      key: ds,
      day: d,
      dateStr: ds,
      value,
      step: intensityStep(value, max),
      weekday: new Date(year, monthIndex0, d).getDay(),
    });
  }

  return (
    <Section title="월간 히트맵" subtitle="색이 진할수록 기록이 많은 날입니다">
      <div className="rounded-lg p-5" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
        <div className="grid grid-cols-7 gap-1 mb-2 text-xs" style={{ color: '#A8A29E' }}>
          {WEEKDAY_LABELS.map((w, i) => (
            <div
              key={w}
              className="text-center"
              style={{ color: i === 0 || i === 6 ? '#C85450' : '#A8A29E' }}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) =>
            c.empty ? (
              <div key={c.key} />
            ) : (
              <button
                key={c.key}
                onClick={() => c.value > 0 && onPick?.(c.dateStr)}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                className="relative rounded-sm transition"
                style={{
                  aspectRatio: '1 / 1',
                  background: c.step === 0 ? '#F3EDE1' : shade(accent, c.step),
                  outline: c.dateStr === today ? '1.5px solid #2B2620' : 'none',
                  outlineOffset: '-1.5px',
                  cursor: c.value > 0 ? 'pointer' : 'default',
                }}
                aria-label={`${c.dateStr} ${c.value.toFixed(1)}h`}
              >
                <span
                  className="absolute top-0.5 left-1 text-[9px]"
                  style={{ color: c.step >= 3 ? '#FFFBF3' : (c.weekday === 0 || c.weekday === 6 ? '#C85450' : '#8A7F73') }}
                >
                  {c.day}
                </span>
              </button>
            )
          )}
        </div>

        {/* 범례 */}
        <div className="mt-4 flex items-center justify-end gap-1 text-xs" style={{ color: '#A8A29E' }}>
          <span className="mr-1">Less</span>
          {[0, 1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className="w-3 h-3 rounded-sm"
              style={{ background: s === 0 ? '#F3EDE1' : shade(accent, s) }}
            />
          ))}
          <span className="ml-1">More</span>
        </div>

        {hover && hover.value > 0 && (
          <div className="mt-3 text-xs" style={{ color: '#57534E' }}>
            <span className="display italic">{hover.dateStr}</span> · {hover.value.toFixed(1)}h
          </div>
        )}
      </div>
    </Section>
  );
}
