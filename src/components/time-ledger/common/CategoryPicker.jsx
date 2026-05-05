'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { uid } from '@/lib/time-ledger/id.js';

const QUICK_COLORS = [
  '#FF6B6B', '#FFB547', '#5AD2B3', '#4D96FF', '#A78BFA',
  '#FF9F7A', '#29C7B9', '#FF8FAB', '#F9C74F', '#9DB0B8',
];

function pickRandom() {
  return QUICK_COLORS[Math.floor(Math.random() * QUICK_COLORS.length)];
}

export default function CategoryPicker({
  categories, value, onChange,
  placeholder = '카테고리', allowAll = false,
  onAddCategory, idPrefix = 'cat',
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(pickRandom);

  const submit = () => {
    if (!name.trim()) return;
    const fresh = { id: uid(idPrefix), name: name.trim(), color };
    onAddCategory?.(fresh);
    onChange(fresh.id);
    setName('');
    setColor(pickRandom());
    setAdding(false);
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="rounded-md px-3 py-2 text-sm outline-none"
          style={{
            border: '1px solid #EFE7D4',
            background: '#FFFDF6',
            color: '#2B2620',
            minWidth: '10rem',
          }}
        >
          {allowAll && <option value="">전체</option>}
          {!value && !allowAll && <option value="" disabled>{placeholder}</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {onAddCategory && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition"
            style={{
              background: adding ? '#FFF5E1' : '#FFFDF6',
              color: adding ? '#B8860B' : '#57534E',
              border: `1px solid ${adding ? '#F3C969' : '#EFE7D4'}`,
            }}
            title="새 카테고리"
            aria-label="새 카테고리"
          >
            {adding ? <X size={12} /> : <Plus size={12} />}
            <span>{adding ? '취소' : '새로'}</span>
          </button>
        )}
      </div>

      {onAddCategory && adding && (
        <div
          className="rounded-xl p-3 fade-in"
          style={{ background: '#FFFDF6', border: '1px dashed #F3C969' }}
        >
          <div className="text-[11px] mb-2" style={{ color: '#8A7F73' }}>
            새 카테고리 추가
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {QUICK_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`색 ${c}`}
                  style={{
                    background: c,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: c === color ? '2px solid #2B2620' : '2px solid transparent',
                    boxShadow: c === color ? '0 0 0 1px #fff inset' : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer ml-1"
                style={{ border: '1px solid #EFE7D4', background: 'transparent' }}
                title="직접 선택"
              />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  submit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setAdding(false);
                  setName('');
                }
              }}
              placeholder="카테고리 이름"
              autoFocus
              className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none"
              style={{ border: '1px solid #EFE7D4', background: '#fff', minWidth: '8rem' }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim()}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-40"
              style={{
                background: color,
                color: '#fff',
                boxShadow: name.trim() ? `0 2px 8px ${color}66` : 'none',
              }}
            >
              <Check size={12} /> 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
