import { useEffect, useMemo, useState } from 'react';
import { Plus, CalendarRange, LayoutList, Sparkles } from 'lucide-react';
import { todayStr, diffDays } from '@/lib/time-ledger/dates.js';
import { rolloverRecurring } from '@/lib/time-ledger/recurrence.js';
import { uid } from '@/lib/time-ledger/id.js';
import BlindSpotList from './BlindSpotList.jsx';
import BlindSpotForm from './BlindSpotForm.jsx';
import BlindSpotCalendar from './BlindSpotCalendar.jsx';
import TemplateLoader from './TemplateLoader.jsx';
import Section from '../common/Section.jsx';

const SECTIONS = [
  { id: 'upcoming', label: '임박' },
  { id: 'pending', label: '대기' },
  { id: 'archive', label: '놓친 이슈' },
  { id: 'done', label: '완료' },
];

function classify(item, today) {
  if (item.archived) return 'archive-recurring';
  if (item.type === 'incident') return 'incident';
  if (item.status === 'done') return 'done';
  if (item.status === 'dismissed') return 'done';
  if (item.status === 'missed') return 'missed';

  if (item.dueDate) {
    const d = diffDays(today, item.dueDate);
    if (d < 0) return 'missed';
    if (d <= 7) return 'upcoming';
  }
  return 'pending';
}

export default function BlindSpotsView({
  items, setItems, blindspotCategories, timeCategories, focusId, clearFocus,
}) {
  const [tab, setTab] = useState('upcoming');
  const [view, setView] = useState('list'); // list | calendar
  const [editing, setEditing] = useState(null); // item or null
  const [showTemplate, setShowTemplate] = useState(false);

  const today = todayStr();

  // 검색에서 특정 항목 진입 시 편집 모달 자동 오픈
  useEffect(() => {
    if (!focusId) return;
    const target = items.find((i) => i.id === focusId);
    if (target) setEditing(target);
    clearFocus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  // 자동으로 dueDate 지난 pending → missed 전환 (표시 시 계산, 저장은 사용자 액션 시)
  const decorated = useMemo(() => items.map((i) => ({ ...i, _bucket: classify(i, today) })), [items, today]);

  const buckets = useMemo(() => {
    const upcoming = decorated.filter((i) => i._bucket === 'upcoming').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const pending = decorated
      .filter((i) => i._bucket === 'pending' || (i._bucket === 'missed' && i.type !== 'incident'))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    const archive = decorated
      .filter((i) => i._bucket === 'incident')
      .sort((a, b) => (b.occurredDate || '').localeCompare(a.occurredDate || ''));
    const done = decorated
      .filter((i) => i._bucket === 'done' || i._bucket === 'archive-recurring')
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, 40);
    return { upcoming, pending, archive, done };
  }, [decorated]);

  const save = (data) => {
    const now = new Date().toISOString();
    if (data.id && items.find((i) => i.id === data.id)) {
      setItems(items.map((i) => (i.id === data.id ? { ...i, ...data, updatedAt: now } : i)));
    } else {
      setItems([...items, { ...data, id: data.id || uid('bs'), createdAt: now, updatedAt: now }]);
    }
    setEditing(null);
  };

  const remove = (id) => {
    if (!window.confirm('이 블라인드 스팟을 삭제할까요?')) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const markDone = (item) => {
    const now = new Date().toISOString();
    if (item.type === 'recurring' && item.recurrence) {
      const completedDate = today;
      const [archived, next] = rolloverRecurring(item, completedDate);
      const withStatus = { ...archived, status: 'done', updatedAt: now };
      setItems([...items.filter((i) => i.id !== item.id), withStatus, next]);
    } else {
      setItems(items.map((i) => (i.id === item.id ? { ...i, status: 'done', updatedAt: now } : i)));
    }
  };

  const markMissed = (item) => {
    const now = new Date().toISOString();
    setItems(items.map((i) => (i.id === item.id ? { ...i, status: 'missed', updatedAt: now } : i)));
  };

  const addFromTemplate = (selected) => {
    const now = new Date().toISOString();
    const mapped = selected.map((t) => ({
      id: uid('bs'),
      title: t.title,
      type: t.type,
      category: t.category,
      severity: t.severity || 'medium',
      status: 'pending',
      description: '',
      relatedCategoryIds: [],
      ...(t.type === 'recurring' && t.frequency
        ? { recurrence: { frequency: t.frequency, anchor: today }, dueDate: undefined }
        : {}),
      createdAt: now,
      updatedAt: now,
    }));
    setItems([...items, ...mapped]);
    setShowTemplate(false);
  };

  const incidentFreq = useMemo(() => {
    const by = {};
    for (const i of items) {
      if (i.type !== 'incident') continue;
      by[i.category] = (by[i.category] || 0) + 1;
    }
    return by;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {SECTIONS.map((s) => {
            const count = s.id === 'upcoming' ? buckets.upcoming.length
              : s.id === 'pending' ? buckets.pending.length
                : s.id === 'archive' ? buckets.archive.length
                  : buckets.done.length;
            const isActive = tab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setTab(s.id); setView('list'); }}
                className="px-3 py-1.5 text-sm rounded-md transition"
                style={{
                  background: isActive ? '#2B2620' : 'transparent',
                  color: isActive ? '#FFFBF3' : '#57534E',
                  border: isActive ? '1px solid #2B2620' : '1px solid #EFE7D4',
                }}
              >
                {s.label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
          <button
            onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
            className="px-3 py-1.5 text-sm rounded-md transition inline-flex items-center gap-1"
            style={{
              background: view === 'calendar' ? '#2B2620' : 'transparent',
              color: view === 'calendar' ? '#FFFBF3' : '#57534E',
              border: view === 'calendar' ? '1px solid #2B2620' : '1px solid #EFE7D4',
            }}
          >
            {view === 'calendar' ? <LayoutList size={14} /> : <CalendarRange size={14} />}
            {view === 'calendar' ? '리스트' : '캘린더'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplate(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition"
            style={{ background: '#FFFDF6', color: '#2B2620', border: '1px solid #EFE7D4' }}
          >
            <Sparkles size={14} /> 템플릿
          </button>
          <button
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition"
            style={{ background: '#2B2620', color: '#FFFBF3' }}
          >
            <Plus size={14} /> 새 항목
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <BlindSpotCalendar items={items} onPick={(item) => setEditing(item)} />
      ) : (
        <>
          {tab === 'upcoming' && (
            <BlindSpotList
              title="7일 이내 도래"
              items={buckets.upcoming}
              categories={blindspotCategories}
              emptyLabel="임박한 항목이 없습니다. 평온한 한 주네요."
              onEdit={setEditing}
              onRemove={remove}
              onDone={markDone}
              onMissed={markMissed}
            />
          )}
          {tab === 'pending' && (
            <BlindSpotList
              title="대기중"
              items={buckets.pending}
              categories={blindspotCategories}
              emptyLabel="대기중인 항목이 없습니다."
              onEdit={setEditing}
              onRemove={remove}
              onDone={markDone}
              onMissed={markMissed}
            />
          )}
          {tab === 'archive' && (
            <>
              <BlindSpotList
                title="놓친 이슈 로그"
                items={buckets.archive}
                categories={blindspotCategories}
                emptyLabel="아직 기록된 이슈가 없습니다."
                onEdit={setEditing}
                onRemove={remove}
                hideStatusActions
              />
              {Object.keys(incidentFreq).length > 0 && (
                <Section title="카테고리별 빈도">
                  <div className="rounded-lg p-4" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(incidentFreq)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, n]) => (
                          <li key={cat} className="flex items-center justify-between">
                            <span style={{ color: '#2B2620' }}>{cat}</span>
                            <span className="display italic" style={{ color: '#57534E' }}>{n}건</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </Section>
              )}
            </>
          )}
          {tab === 'done' && (
            <BlindSpotList
              title="완료"
              items={buckets.done}
              categories={blindspotCategories}
              emptyLabel="완료된 항목이 없습니다."
              onEdit={setEditing}
              onRemove={remove}
              hideStatusActions
            />
          )}
        </>
      )}

      {editing !== null && (
        <BlindSpotForm
          initial={editing}
          blindspotCategories={blindspotCategories}
          timeCategories={timeCategories}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={editing?.id ? () => { remove(editing.id); setEditing(null); } : null}
        />
      )}

      {showTemplate && (
        <TemplateLoader
          onClose={() => setShowTemplate(false)}
          onAdd={addFromTemplate}
        />
      )}
    </div>
  );
}

export const getUpcomingCount = (items, todayStr) => {
  return items.filter((i) => {
    if (i.archived || i.status === 'done' || i.status === 'dismissed' || i.status === 'missed') return false;
    if (i.type === 'incident') return false;
    if (!i.dueDate) return false;
    const d = diffDays(todayStr, i.dueDate);
    return d >= 0 && d <= 7;
  }).length;
};
