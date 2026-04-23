import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StatCard from '../common/StatCard.jsx';
import CategoryPicker from '../common/CategoryPicker.jsx';
import Heatmap from './Heatmap.jsx';
import CategoryPie from './CategoryPie.jsx';
import WeekdayPattern from './WeekdayPattern.jsx';
import PlanVsActualMonth from './PlanVsActualMonth.jsx';

function buildMonthStats(entries, year, monthIndex0, categoryFilter) {
  const days = {};
  let total = 0;
  let activeDays = 0;
  const catTotals = {};

  const prefix = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
  for (const [dateStr, entry] of Object.entries(entries)) {
    if (!dateStr.startsWith(prefix)) continue;
    const logs = entry.logs || [];
    let dayTotal = 0;
    for (const l of logs) {
      if (categoryFilter && l.categoryId !== categoryFilter) continue;
      dayTotal += Number(l.hours) || 0;
      catTotals[l.categoryId] = (catTotals[l.categoryId] || 0) + (Number(l.hours) || 0);
    }
    if (dayTotal > 0) {
      days[dateStr] = dayTotal;
      activeDays += 1;
      total += dayTotal;
    }
  }
  return { days, total, activeDays, catTotals };
}

export default function MonthlyView({ year, monthIndex0, setMonth, entries, categories, onPickDate }) {
  const [filter, setFilter] = useState(null);

  const stats = useMemo(
    () => buildMonthStats(entries, year, monthIndex0, filter),
    [entries, year, monthIndex0, filter]
  );

  const avg = stats.activeDays > 0 ? stats.total / stats.activeDays : 0;
  const monthName = `${year}년 ${monthIndex0 + 1}월`;

  const prev = () => {
    if (monthIndex0 === 0) setMonth(year - 1, 11);
    else setMonth(year, monthIndex0 - 1);
  };
  const next = () => {
    if (monthIndex0 === 11) setMonth(year + 1, 0);
    else setMonth(year, monthIndex0 + 1);
  };

  const filterCat = categories.find((c) => c.id === filter);
  const accent = filterCat?.color ?? '#1C1917';

  return (
    <div className="space-y-8">
      {/* 월 네비 */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="p-2 rounded-md hover:bg-stone-100 transition" style={{ color: '#78716C' }} aria-label="이전 월">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs" style={{ color: '#78716C' }}>Monthly</div>
          <div className="display italic text-2xl mt-0.5" style={{ color: '#1C1917' }}>{monthName}</div>
        </div>
        <button onClick={next} className="p-2 rounded-md hover:bg-stone-100 transition" style={{ color: '#78716C' }} aria-label="다음 월">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="총 기록 시간" value={stats.total.toFixed(1)} suffix="h" accent={accent} gauge={Math.min(100, stats.total / 2)} />
        <StatCard label="활성 일수" value={stats.activeDays} suffix="일" accent={accent} gauge={(stats.activeDays / 31) * 100} />
        <StatCard label="일평균" value={avg.toFixed(1)} suffix="h" accent={accent} gauge={Math.min(100, avg * 10)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: '#57534E' }}>카테고리 필터</div>
        <CategoryPicker categories={categories} value={filter} onChange={setFilter} allowAll />
      </div>

      {stats.total === 0 ? (
        <div
          className="text-center text-sm py-14 rounded-lg"
          style={{ color: '#A8A29E', background: '#FFFDF8', border: '1px dashed #E7E5E0' }}
        >
          이 달에는 아직 기록이 없습니다.
        </div>
      ) : (
        <>
          <Heatmap
            year={year}
            monthIndex0={monthIndex0}
            days={stats.days}
            accent={accent}
            onPick={onPickDate}
          />
          <CategoryPie categories={categories} catTotals={stats.catTotals} />
          <WeekdayPattern
            entries={entries}
            year={year}
            monthIndex0={monthIndex0}
            categories={categories}
          />
          <PlanVsActualMonth
            entries={entries}
            year={year}
            monthIndex0={monthIndex0}
            categories={categories}
          />
        </>
      )}
    </div>
  );
}
