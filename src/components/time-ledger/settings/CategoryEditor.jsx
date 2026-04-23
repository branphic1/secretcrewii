import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { uid } from '@/lib/time-ledger/id.js';

const PRESET = ['#C85450', '#D4883F', '#5C8A6E', '#4A6FA5', '#8B6BA8', '#7A5545', '#2C4A52', '#A6625A', '#6B6B4C', '#8A8A8A'];

export default function CategoryEditor({ items, onChange, idPrefix }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET[0]);

  const add = () => {
    if (!name.trim()) return;
    onChange([...items, { id: uid(idPrefix), name: name.trim(), color }]);
    setName('');
  };

  const update = (id, patch) => {
    onChange(items.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const remove = (id) => {
    if (!window.confirm('이 카테고리를 삭제할까요? 기존 기록의 분류가 사라질 수 있습니다.')) return;
    onChange(items.filter((c) => c.id !== id));
  };

  return (
    <div className="rounded-lg p-4" style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}>
      <ul className="space-y-1.5 mb-4">
        {items.map((c) => (
          <li
            key={c.id}
            className="row-hover flex items-center gap-3 px-3 py-2 rounded-md"
            style={{ background: '#FAF8F3' }}
          >
            <input
              type="color"
              value={c.color}
              onChange={(e) => update(c.id, { color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer"
              style={{ border: '1px solid #E7E5E0', background: 'transparent' }}
            />
            <input
              type="text"
              value={c.name}
              onChange={(e) => update(c.id, { name: e.target.value })}
              className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
              style={{ border: '1px solid transparent', background: 'transparent', color: '#1C1917' }}
              onFocus={(e) => (e.target.style.border = '1px solid #E7E5E0')}
              onBlur={(e) => (e.target.style.border = '1px solid transparent')}
            />
            <button
              onClick={() => remove(c.id)}
              className="on-hover p-1 rounded transition hover:bg-stone-200"
              style={{ color: '#C85450' }}
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer"
          style={{ border: '1px solid #E7E5E0' }}
        />
        <input
          type="text"
          placeholder="새 카테고리"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid #E7E5E0', background: '#fff' }}
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition"
          style={{ background: '#1C1917', color: '#FAF8F3' }}
        >
          <Plus size={14} /> 추가
        </button>
      </div>
    </div>
  );
}
