import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addDays, fromDateStr, toDateStr, longKoreanDate, todayStr } from '@/lib/time-ledger/dates.js';
import StatCard from '../common/StatCard.jsx';
import PlanSection from './PlanSection.jsx';
import LogSection from './LogSection.jsx';
import PlanVsActual from './PlanVsActual.jsx';

export default function TodayView({ date, setDate, entries, setEntries, categories, incidentsByCat = {} }) {
  const entry = entries[date] || { plan: [], logs: [] };

  const planTotal = useMemo(
    () => entry.plan.reduce((s, p) => s + (Number(p.hours) || 0), 0),
    [entry.plan]
  );
  const logTotal = useMemo(
    () => entry.logs.reduce((s, l) => s + (Number(l.hours) || 0), 0),
    [entry.logs]
  );
  const rate = planTotal > 0 ? Math.round((logTotal / planTotal) * 100) : (logTotal > 0 ? 100 : 0);

  const isToday = date === todayStr();

  const step = (n) => setDate(toDateStr(addDays(fromDateStr(date), n)));

  const update = (next) => {
    setEntries((prev) => {
      const copy = { ...prev, [date]: next };
      if (!next.plan.length && !next.logs.length) delete copy[date];
      return copy;
    });
  };

  return (
    <div className="space-y-8">
      {/* 날짜 네비 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step(-1)}
          className="p-2 rounded-md hover:bg-stone-100 transition"
          style={{ color: '#78716C' }}
          aria-label="이전 날짜"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs" style={{ color: '#78716C' }}>
            {isToday ? 'Today' : '기록'}
          </div>
          <div className="display italic text-2xl mt-0.5" style={{ color: '#1C1917' }}>
            {longKoreanDate(date)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs px-2 py-1 rounded-md hover:bg-stone-100 transition"
              style={{ color: '#57534E', border: '1px solid #E7E5E0' }}
            >
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> 오늘
              </span>
            </button>
          )}
          <button
            onClick={() => step(1)}
            className="p-2 rounded-md hover:bg-stone-100 transition"
            style={{ color: '#78716C' }}
            aria-label="다음 날짜"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="계획 시간" value={planTotal.toFixed(1)} suffix="h" accent="#D4883F" gauge={Math.min(100, planTotal * 10)} />
        <StatCard label="실행 시간" value={logTotal.toFixed(1)} suffix="h" accent="#5C8A6E" gauge={Math.min(100, logTotal * 10)} />
        <StatCard
          label="달성률"
          value={rate}
          suffix="%"
          accent={rate >= 80 ? '#5C8A6E' : rate >= 50 ? '#D4883F' : '#C85450'}
          gauge={rate}
          note={planTotal === 0 ? '계획을 먼저 등록해보세요' : undefined}
        />
      </div>

      <PlanSection
        plan={entry.plan}
        categories={categories}
        incidentsByCat={incidentsByCat}
        onChange={(plan) => update({ ...entry, plan })}
      />

      <LogSection
        logs={entry.logs}
        categories={categories}
        incidentsByCat={incidentsByCat}
        onChange={(logs) => update({ ...entry, logs })}
      />

      {(entry.plan.length > 0 || entry.logs.length > 0) && (
        <PlanVsActual entry={entry} categories={categories} />
      )}

      {!entry.plan.length && !entry.logs.length && (
        <div
          className="text-center text-sm py-10 rounded-lg"
          style={{ color: '#A8A29E', background: '#FFFDF8', border: '1px dashed #E7E5E0' }}
        >
          아직 이 날의 기록이 없습니다. 먼저 계획을 설계하거나, 바로 기록을 남겨보세요.
        </div>
      )}
    </div>
  );
}
