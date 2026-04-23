import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { storage, KEYS } from '@/lib/time-ledger/storage.js';
import Section from '../common/Section.jsx';
import Goals from './Goals.jsx';
import QuarterThemes from './QuarterThemes.jsx';
import YearlyHeatmap from './YearlyHeatmap.jsx';
import TrendChart from './TrendChart.jsx';
import MonthCards from './MonthCards.jsx';
import ThemeAlignment from './ThemeAlignment.jsx';

const emptyPlan = (year) => ({
  year,
  goals: [],
  quarters: [1, 2, 3, 4].map((q) => ({ q, theme: '', projects: [] })),
  monthNotes: {},
});

export default function YearlyView({ year, setYear, entries, categories, onPickMonth }) {
  const [plan, setPlan] = useState(() => emptyPlan(year));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      const data = await storage.load(KEYS.yearly(year), null);
      if (cancelled) return;
      setPlan(data && data.year === year ? { ...emptyPlan(year), ...data } : emptyPlan(year));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [year]);

  useEffect(() => {
    if (!loaded) return;
    storage.save(KEYS.yearly(year), plan);
  }, [plan, year, loaded]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(year - 1)}
          className="p-2 rounded-md hover:bg-stone-100 transition"
          style={{ color: '#78716C' }}
          aria-label="이전 연도"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs" style={{ color: '#78716C' }}>Yearly</div>
          <div className="display italic text-3xl mt-0.5" style={{ color: '#1C1917' }}>{year}</div>
        </div>
        <button
          onClick={() => setYear(year + 1)}
          className="p-2 rounded-md hover:bg-stone-100 transition"
          style={{ color: '#78716C' }}
          aria-label="다음 연도"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <Section title="연간 목표" subtitle="올해의 북극성 3~5개 (OKR 스타일)">
        <Goals
          goals={plan.goals}
          categories={categories}
          onChange={(goals) => setPlan((p) => ({ ...p, goals }))}
        />
      </Section>

      <Section title="분기 테마" subtitle="각 분기의 한 줄 선언과 핵심 프로젝트">
        <QuarterThemes
          quarters={plan.quarters}
          onChange={(quarters) => setPlan((p) => ({ ...p, quarters }))}
        />
      </Section>

      <Section title="분기 테마 정렬도" subtitle="목표 카테고리 시간 비중으로 본 전략 실행도">
        <ThemeAlignment entries={entries} yearlyPlan={plan} categories={categories} />
      </Section>

      <Section title="연간 히트맵" subtitle="12개월 × 31일 활동 지도">
        <YearlyHeatmap year={year} entries={entries} onPickMonth={onPickMonth} />
      </Section>

      <Section title="카테고리별 월간 트렌드" subtitle="월별 시간 배분의 흐름">
        <TrendChart year={year} entries={entries} categories={categories} />
      </Section>

      <Section title="월별 성과 카드" subtitle="12개월 한눈에 조망">
        <MonthCards
          year={year}
          entries={entries}
          categories={categories}
          monthNotes={plan.monthNotes}
          onNotesChange={(monthNotes) => setPlan((p) => ({ ...p, monthNotes }))}
          onPickMonth={onPickMonth}
        />
      </Section>
    </div>
  );
}
