import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Section from '../common/Section.jsx';
import CategoryPicker from '../common/CategoryPicker.jsx';
import BlindSpotHint from '../common/BlindSpotHint.jsx';

export default function PlanSection({ plan, categories, onChange, incidentsByCat = {} }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const add = () => {
    if (!catId) return;
    const h = Number(hours);
    if (!h || h <= 0) return;
    onChange([...plan, { categoryId: catId, hours: h, note: note.trim() }]);
    setHours('');
    setNote('');
  };

  const remove = (idx) => {
    if (!window.confirm('이 계획 항목을 삭제할까요?')) return;
    onChange(plan.filter((_, i) => i !== idx));
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  const byId = (id) => categories.find((c) => c.id === id);

  return (
    <Section title="오늘의 설계" subtitle="무엇을 할 계획인가요">
      <div className="rounded-lg p-4" style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPicker categories={categories} value={catId} onChange={setCatId} />
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="시간"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={onKey}
            className="rounded-md px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid #E7E5E0', width: '5.5rem', background: '#fff' }}
          />
          <input
            type="text"
            placeholder="메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid #E7E5E0', background: '#fff', minWidth: '12rem' }}
          />
          <button
            onClick={add}
            className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition"
            style={{ background: '#1C1917', color: '#FAF8F3' }}
          >
            <Plus size={14} /> 추가
          </button>
        </div>
        {catId && incidentsByCat[catId] > 0 && (
          <div className="mt-2">
            <BlindSpotHint categoryId={catId} incidentsByCat={incidentsByCat} />
          </div>
        )}

        {plan.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {plan.map((p, i) => {
              const cat = byId(p.categoryId);
              return (
                <li
                  key={i}
                  className="row-hover flex items-center gap-3 pl-3 pr-2 py-2 rounded-md"
                  style={{ borderLeft: `3px solid ${cat?.color ?? '#D6D3D1'}`, background: '#FAF8F3' }}
                >
                  <span className="text-sm font-medium" style={{ color: '#1C1917', minWidth: '8rem' }}>
                    {cat?.name ?? '?'}
                  </span>
                  <span className="display italic text-sm" style={{ color: '#57534E' }}>
                    {p.hours.toFixed(1)}h
                  </span>
                  {p.note && <span className="text-sm flex-1 truncate" style={{ color: '#57534E' }}>— {p.note}</span>}
                  <button
                    onClick={() => remove(i)}
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
