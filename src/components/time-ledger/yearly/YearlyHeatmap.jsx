import { useMemo } from 'react';
import { daysInMonth, pad2, shortMonth } from '@/lib/time-ledger/dates.js';

function shade(step) {
  const alphas = [0.08, 0.22, 0.42, 0.65, 0.95];
  return `rgba(28, 25, 23, ${alphas[step]})`;
}

function intensityStep(value, max) {
  if (!value || max === 0) return 0;
  const ratio = value / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

export default function YearlyHeatmap({ year, entries, onPickMonth }) {
  const { matrix, monthTotals, max } = useMemo(() => {
    const matrix = []; // [monthIndex][dayIndex] = value
    const monthTotals = Array(12).fill(0);
    let max = 0;

    for (let m = 0; m < 12; m += 1) {
      const row = new Array(31).fill(null);
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d += 1) {
        const ds = `${year}-${pad2(m + 1)}-${pad2(d)}`;
        const entry = entries[ds];
        if (!entry) { row[d - 1] = 0; continue; }
        const h = (entry.logs || []).reduce((s, l) => s + (Number(l.hours) || 0), 0);
        row[d - 1] = h;
        monthTotals[m] += h;
        if (h > max) max = h;
      }
      matrix.push(row);
    }
    return { matrix, monthTotals, max };
  }, [year, entries]);

  const totalYear = monthTotals.reduce((s, x) => s + x, 0);

  return (
    <div className="rounded-lg p-5" style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs" style={{ color: '#78716C' }}>
          총 <span className="display italic">{totalYear.toFixed(1)}h</span>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: '#A8A29E' }}>
          <span className="mr-1">Less</span>
          {[0, 1, 2, 3, 4].map((s) => (
            <span key={s} className="w-3 h-3 rounded-sm" style={{ background: s === 0 ? '#F0EEE8' : shade(s) }} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: '2px', minWidth: '680px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs pr-3" style={{ color: '#A8A29E', fontWeight: 400 }}>Month</th>
              {Array.from({ length: 31 }, (_, i) => (
                <th key={i} className="text-center text-[9px]" style={{ color: '#A8A29E', fontWeight: 400, width: 14 }}>
                  {i + 1}
                </th>
              ))}
              <th className="text-right text-xs pl-3" style={{ color: '#A8A29E', fontWeight: 400 }}>합계</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, mi) => (
              <tr key={mi}>
                <td className="pr-3">
                  <button
                    onClick={() => onPickMonth?.(year, mi)}
                    className="display italic text-xs hover:underline"
                    style={{ color: '#1C1917' }}
                  >
                    {shortMonth(mi)}
                  </button>
                </td>
                {row.map((v, di) => {
                  if (v === null) {
                    return <td key={di} style={{ width: 14, height: 14 }}><div style={{ background: 'transparent', width: 14, height: 14 }} /></td>;
                  }
                  const step = intensityStep(v, max);
                  return (
                    <td key={di} style={{ width: 14, height: 14 }}>
                      <div
                        title={`${year}-${pad2(mi + 1)}-${pad2(di + 1)} · ${v.toFixed(1)}h`}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: step === 0 ? '#F0EEE8' : shade(step),
                        }}
                      />
                    </td>
                  );
                })}
                <td className="pl-3 text-right display italic text-xs tabular-nums" style={{ color: '#57534E' }}>
                  {monthTotals[mi].toFixed(1)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
