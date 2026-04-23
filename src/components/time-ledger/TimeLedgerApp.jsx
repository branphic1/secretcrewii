'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from './common/Header.jsx';
import TabBar from './common/TabBar.jsx';
import SearchDialog from './common/SearchDialog.jsx';
import FloatingTimer from './common/FloatingTimer.jsx';
import TimerStartDialog from './common/TimerStartDialog.jsx';
import TodayView from './today/TodayView.jsx';
import MonthlyView from './monthly/MonthlyView.jsx';
import YearlyView from './yearly/YearlyView.jsx';
import BlindSpotsView, { getUpcomingCount } from './blindspots/BlindSpotsView.jsx';
import SettingsView from './settings/SettingsView.jsx';
import { storage, KEYS } from '@/lib/time-ledger/storage.js';
import { DEFAULT_CATEGORIES, DEFAULT_BLINDSPOT_CATEGORIES } from '@/lib/time-ledger/categories.js';
import { todayStr } from '@/lib/time-ledger/dates.js';
import { incidentsByTimeCategory } from '@/lib/time-ledger/analysis.js';
import {
  createTimer, pause as pauseTimer, resume as resumeTimer, playBell,
} from '@/lib/time-ledger/timer.js';
import { uid } from '@/lib/time-ledger/id.js';

export default function TimeLedgerApp() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState('today');
  const [searchOpen, setSearchOpen] = useState(false);
  const [blindspotFocus, setBlindspotFocus] = useState(null);
  const [timer, setTimer] = useState(null);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [timerDialogDefault, setTimerDialogDefault] = useState('');

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [blindspotCategories, setBlindspotCategories] = useState(DEFAULT_BLINDSPOT_CATEGORIES);
  const [entries, setEntries] = useState({});
  const [blindspots, setBlindspots] = useState([]);

  const [currentDate, setCurrentDate] = useState(todayStr());
  const [monthYear, setMonthYear] = useState(new Date().getFullYear());
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());
  const [yearlyYear, setYearlyYear] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      const [cats, bsCats, ents, bs, tm] = await Promise.all([
        storage.load(KEYS.categories, null),
        storage.load(KEYS.blindspotCategories, null),
        storage.load(KEYS.entries, {}),
        storage.load(KEYS.blindspots, []),
        storage.load(KEYS.timer, null),
      ]);
      if (cats) setCategories(cats);
      if (bsCats) setBlindspotCategories(bsCats);
      setEntries(ents || {});
      setBlindspots(bs || []);
      if (tm) setTimer(tm);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => { if (hydrated) storage.save(KEYS.categories, categories); }, [categories, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.blindspotCategories, blindspotCategories); }, [blindspotCategories, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.entries, entries); }, [entries, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.blindspots, blindspots); }, [blindspots, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (timer) storage.save(KEYS.timer, timer);
    else storage.remove(KEYS.timer);
  }, [timer, hydrated]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const incidentsByCat = useMemo(() => incidentsByTimeCategory(blindspots), [blindspots]);
  const upcomingCount = getUpcomingCount(blindspots, todayStr());

  const handlePickDate = (dateStr) => { setCurrentDate(dateStr); setTab('today'); };
  const handlePickMonth = (y, m) => { setMonthYear(y); setMonthIdx(m); setTab('monthly'); };
  const handleOpenBlindSpot = (item) => { setBlindspotFocus({ id: item.id }); setTab('blindspots'); };
  const handleReset = () => {
    setCategories(DEFAULT_CATEGORIES);
    setBlindspotCategories(DEFAULT_BLINDSPOT_CATEGORIES);
    setEntries({});
    setBlindspots([]);
    setTimer(null);
  };

  // ---- 타이머 핸들러들 ----
  const startTimer = ({ categoryId, planMinutes, taskName, planRef = null, date = todayStr() }) => {
    if (timer) {
      if (!window.confirm('진행 중인 타이머가 있습니다. 기록 없이 새로 시작할까요?')) return;
    }
    const fresh = createTimer({ categoryId, planMinutes, taskName, planRef, date });
    setTimer(fresh);
  };

  const startTimerFromPlan = (date, index) => {
    const dayEntry = entries[date];
    const item = dayEntry?.plan?.[index];
    if (!item) return;
    const planMinutes = Math.max(1, Math.round((Number(item.hours) || 0) * 60));
    if (planMinutes <= 0) return;
    startTimer({
      categoryId: item.categoryId,
      planMinutes,
      taskName: item.note || '',
      planRef: { date, index },
      date,
    });
  };

  const handleTimerPause = () => setTimer((t) => pauseTimer(t));
  const handleTimerResume = () => setTimer((t) => resumeTimer(t));

  const handleTimerStop = ({ hours, content, categoryId, date }) => {
    // 오늘의 entries에 로그 추가
    setEntries((prev) => {
      const dayEntry = prev[date] || { plan: [], logs: [] };
      const logEntry = {
        id: uid('log'),
        categoryId,
        content: content || '타이머',
        hours,
        timestamp: new Date().toISOString(),
      };
      return { ...prev, [date]: { ...dayEntry, logs: [...(dayEntry.logs || []), logEntry] } };
    });
    setTimer(null);
    // 오늘 탭으로 이동해서 결과 확인
    setCurrentDate(date);
    setTab('today');
  };

  const handleTimerCancel = () => setTimer(null);
  const handleTimerComplete = () => { playBell(); };

  const openTimerDialog = (defaultTaskName = '') => {
    setTimerDialogDefault(defaultTaskName);
    setTimerDialogOpen(true);
  };

  return (
    <div className="min-h-screen time-ledger-root" style={{ background: '#FFFBF3' }}>
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onOpenTimer={() => openTimerDialog('')}
      />
      <TabBar active={tab} onChange={setTab} blindspotAlert={upcomingCount} />
      <main className="mx-auto px-6 py-8" style={{ maxWidth: '64rem' }}>
        {!hydrated ? (
          <div className="text-center py-20 text-sm" style={{ color: '#A8A29E' }}>불러오는 중…</div>
        ) : (
          <>
            {tab === 'today' && (
              <TodayView
                date={currentDate}
                setDate={setCurrentDate}
                entries={entries}
                setEntries={setEntries}
                categories={categories}
                incidentsByCat={incidentsByCat}
                onStartTimerFromPlan={startTimerFromPlan}
                onOpenTimerDialog={openTimerDialog}
                activeTimer={timer}
              />
            )}
            {tab === 'monthly' && (
              <MonthlyView
                year={monthYear}
                monthIndex0={monthIdx}
                setMonth={(y, m) => { setMonthYear(y); setMonthIdx(m); }}
                entries={entries}
                categories={categories}
                onPickDate={handlePickDate}
              />
            )}
            {tab === 'yearly' && (
              <YearlyView
                year={yearlyYear}
                setYear={setYearlyYear}
                entries={entries}
                categories={categories}
                onPickMonth={handlePickMonth}
              />
            )}
            {tab === 'blindspots' && (
              <BlindSpotsView
                items={blindspots}
                setItems={setBlindspots}
                blindspotCategories={blindspotCategories}
                timeCategories={categories}
                focusId={blindspotFocus?.id}
                clearFocus={() => setBlindspotFocus(null)}
              />
            )}
            {tab === 'settings' && (
              <SettingsView
                categories={categories}
                setCategories={setCategories}
                blindspotCategories={blindspotCategories}
                setBlindspotCategories={setBlindspotCategories}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>
      <footer className="mx-auto px-6 pb-10 text-center text-xs" style={{ color: '#A8A29E', maxWidth: '64rem' }}>
        <span className="display italic">Time Ledger</span> · 몽브님의 시간을 기록합니다
      </footer>

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        entries={entries}
        blindspots={blindspots}
        categories={categories}
        blindspotCategories={blindspotCategories}
        onPickDate={handlePickDate}
        onOpenBlindSpot={handleOpenBlindSpot}
      />

      {timerDialogOpen && (
        <TimerStartDialog
          categories={categories}
          defaultTaskName={timerDialogDefault}
          onClose={() => setTimerDialogOpen(false)}
          onStart={({ categoryId, planMinutes, taskName }) => {
            startTimer({ categoryId, planMinutes, taskName });
            setTimerDialogOpen(false);
          }}
        />
      )}

      {timer && (
        <FloatingTimer
          timer={timer}
          categories={categories}
          onPause={handleTimerPause}
          onResume={handleTimerResume}
          onStop={handleTimerStop}
          onCancel={handleTimerCancel}
          onComplete={handleTimerComplete}
        />
      )}
    </div>
  );
}
