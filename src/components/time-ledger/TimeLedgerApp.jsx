'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from './common/Header.jsx';
import TabBar from './common/TabBar.jsx';
import SearchDialog from './common/SearchDialog.jsx';
import TodayView from './today/TodayView.jsx';
import MonthlyView from './monthly/MonthlyView.jsx';
import YearlyView from './yearly/YearlyView.jsx';
import BlindSpotsView, { getUpcomingCount } from './blindspots/BlindSpotsView.jsx';
import SettingsView from './settings/SettingsView.jsx';
import { storage, KEYS } from '@/lib/time-ledger/storage.js';
import { DEFAULT_CATEGORIES, DEFAULT_BLINDSPOT_CATEGORIES } from '@/lib/time-ledger/categories.js';
import { todayStr } from '@/lib/time-ledger/dates.js';
import { incidentsByTimeCategory } from '@/lib/time-ledger/analysis.js';

export default function TimeLedgerApp() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState('today');
  const [searchOpen, setSearchOpen] = useState(false);
  const [blindspotFocus, setBlindspotFocus] = useState(null);

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
      const [cats, bsCats, ents, bs] = await Promise.all([
        storage.load(KEYS.categories, null),
        storage.load(KEYS.blindspotCategories, null),
        storage.load(KEYS.entries, {}),
        storage.load(KEYS.blindspots, []),
      ]);
      if (cats) setCategories(cats);
      if (bsCats) setBlindspotCategories(bsCats);
      setEntries(ents || {});
      setBlindspots(bs || []);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => { if (hydrated) storage.save(KEYS.categories, categories); }, [categories, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.blindspotCategories, blindspotCategories); }, [blindspotCategories, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.entries, entries); }, [entries, hydrated]);
  useEffect(() => { if (hydrated) storage.save(KEYS.blindspots, blindspots); }, [blindspots, hydrated]);

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
  };

  return (
    <div className="min-h-screen time-ledger-root" style={{ background: '#FAF8F3' }}>
      <Header onOpenSearch={() => setSearchOpen(true)} />
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
    </div>
  );
}
