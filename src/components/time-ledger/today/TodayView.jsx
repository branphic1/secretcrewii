import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addDays, fromDateStr, toDateStr, longKoreanDate, todayStr } from '@/lib/time-ledger/dates.js';
import PlanSection from './PlanSection.jsx';
import LogSection from './LogSection.jsx';
import ProgressHero from './ProgressHero.jsx';
import WeekStrip from './WeekStrip.jsx';

export default function TodayView({
  date, setDate, entries, setEntries, categories, incidentsByCat = {},
  onStartTimerFromPlan, onOpenTimerDialog, activeTimer,
  onPauseTimer, onResumeTimer, onStopTimer, onCancelTimer,
}) {
  const entry = entries[date] || { plan: [], logs: [] };

  const isToday = date === todayStr();

  const step = (n) => setDate(toDateStr(addDays(fromDateStr(date), n)));

  const update = (next) => {
    setEntries((prev) => {
      const copy = { ...prev, [date]: next };
      if (!next.plan.length && !next.logs.length) delete copy[date];
      return copy;
    });
  };

  // 선택된 날짜에 타이머가 붙어있는지
  const timerOnThisDate = activeTimer && activeTimer.date === date ? activeTimer : null;

  return (
    <div className="space-y-6">
      {/* 날짜 네비 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step(-1)}
          className="p-2 rounded-full hover:bg-stone-100 transition"
          style={{ color: '#8A7F73' }}
          aria-label="이전 날짜"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs" style={{ color: '#8A7F73' }}>
            {isToday ? 'Today' : '기록'}
          </div>
          <div className="display italic text-2xl mt-0.5" style={{ color: '#2B2620' }}>
            {longKoreanDate(date)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs px-3 py-1.5 rounded-full hover:bg-stone-100 transition inline-flex items-center gap-1"
              style={{ color: '#57534E', border: '1px solid #EFE7D4', background: '#FFFDF6' }}
            >
              <CalendarDays size={12} /> 오늘
            </button>
          )}
          <button
            onClick={() => step(1)}
            className="p-2 rounded-full hover:bg-stone-100 transition"
            style={{ color: '#8A7F73' }}
            aria-label="다음 날짜"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ProgressHero
        entry={entry}
        categories={categories}
        timer={timerOnThisDate}
        onStartNext={(idx) => onStartTimerFromPlan?.(date, idx)}
        onOpenTimerDialog={onOpenTimerDialog}
        onPauseTimer={onPauseTimer}
        onResumeTimer={onResumeTimer}
        onStopTimer={onStopTimer}
        onCancelTimer={onCancelTimer}
      />

      <WeekStrip
        date={date}
        entries={entries}
        categories={categories}
        onPick={(d) => setDate(d)}
      />

      <PlanSection
        plan={entry.plan}
        logs={entry.logs}
        categories={categories}
        incidentsByCat={incidentsByCat}
        onChange={(plan) => update({ ...entry, plan })}
        onStartTimer={(index) => onStartTimerFromPlan?.(date, index)}
        onStartBlankTimer={() => onOpenTimerDialog?.('')}
        activeTimer={activeTimer}
        date={date}
        onPauseTimer={onPauseTimer}
        onResumeTimer={onResumeTimer}
        onStopTimer={onStopTimer}
        onCancelTimer={onCancelTimer}
      />

      <LogSection
        logs={entry.logs}
        categories={categories}
        incidentsByCat={incidentsByCat}
        onChange={(logs) => update({ ...entry, logs })}
      />
    </div>
  );
}
