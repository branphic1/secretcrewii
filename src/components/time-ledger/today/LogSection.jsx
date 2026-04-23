import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Section from '../common/Section.jsx';
import CategoryPicker from '../common/CategoryPicker.jsx';
import BlindSpotHint from '../common/BlindSpotHint.jsx';
import { uid } from '@/lib/time-ledger/id.js';

export default function LogSection({ logs, categories, onChange, incidentsByCat = {} }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [hours, setHours] = useState('');

  const sorted = useMemo(
    () => [...logs].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1)),
    [logs]
  );

  const add = () => {
    if (!catId || !content.trim()) return;
    const h = Number(hours);
    if (!h || h <= 0) return;
    const entry = {
      id: uid('log'),
      categoryId: catId,
      content: content.trim(),
      hours: h,
      timestamp: new Date().toISOString(),
    };
    onChange([...logs, entry]);
    setContent('');
    setHours('');
  };

  const remove = (id) => {
    if (!window.confirm('이 기록을 삭제할까요?')) return;
    onChange(logs.filter((l) => l.id !== id));
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  const byId = (id) => categories.find((c) => c.id === id);

  return (
    <Section title="오늘의 궤적" subtitle="실제로 무엇을 했는지">
      <div className="rounded-lg p-4" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPicker categories={categories} value={catId} onChange={setCatId} />
          <input
            type="text"
            placeholder="한 줄 기록"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid #EFE7D4', background: '#fff', minWidth: '14rem' }}
          />
          <input
            type="number"
            step="0.25"
            min="0"
            placeholder="시간"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={onKey}
            className="rounded-md px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid #EFE7D4', width: '5.5rem', background: '#fff' }}
          />
          <button
            onClick={add}
            className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition"
            style={{ background: '#2B2620', color: '#FFFBF3' }}
          >
            <Plus size={14} /> 기록
          </button>
        </div>
        {catId && incidentsByCat[catId] > 0 && (
          <div className="mt-2">
            <BlindSpotHint categoryId={catId} incidentsByCat={incidentsByCat} />
          </div>
        )}

        {sorted.length > 0 && (
          <ul className="mt-4 space-y-1">
            {sorted.map((l) => {
              const cat = byId(l.categoryId);
              const ts = new Date(l.timestamp);
              const hh = String(ts.getHours()).padStart(2, '0');
              const mm = String(ts.getMinutes()).padStart(2, '0');
              return (
                <li
                  key={l.id}
                  className="row-hover flex items-center gap-3 px-3 py-2 rounded-md"
                  style={{ background: '#FFFBF3' }}
                >
                  <span
                    className="shrink-0 rounded-full"
                    style={{ background: cat?.color ?? '#E0D4B8', width: 8, height: 8 }}
                  />
                  <span className="display italic text-xs" style={{ color: '#A8A29E', minWidth: '3.2rem' }}>
                    {hh}:{mm}
                  </span>
                  <span className="text-xs" style={{ color: '#8A7F73', minWidth: '6rem' }}>
                    {cat?.name ?? '?'}
                  </span>
                  <span className="flex-1 text-sm truncate" style={{ color: '#2B2620' }}>
                    {l.content}
                  </span>
                  <span className="display italic text-sm" style={{ color: '#57534E' }}>
                    {l.hours.toFixed(1)}h
                  </span>
                  <button
                    onClick={() => remove(l.id)}
                    className="on-hover p-1 rounded transition hover:bg-stone-200"
                    aria-label="삭제"
                    style={{ color: '#C85450' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}
