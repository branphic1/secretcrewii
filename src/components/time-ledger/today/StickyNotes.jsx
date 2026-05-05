'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Check, X, StickyNote as StickyIcon } from 'lucide-react';
import Section from '../common/Section.jsx';
import { uid } from '@/lib/time-ledger/id.js';

// 종이 컬러 6종
const PAPERS = [
  { bg: '#FFF1A8', border: '#F0D74E' },  // 버터 옐로
  { bg: '#FFD9E2', border: '#F09EB0' },  // 핑크
  { bg: '#CFF0DC', border: '#7DCCA1' },  // 민트
  { bg: '#D2E4FF', border: '#85B0E5' },  // 스카이
  { bg: '#E5DAFF', border: '#A78BFA' },  // 라일락
  { bg: '#FFE0CC', border: '#F0A676' },  // 피치
];

const pickPaper = () => PAPERS[Math.floor(Math.random() * PAPERS.length)];
const pickRotate = () => (Math.random() * 4 - 2).toFixed(2);

export default function StickyNotes({ stickies = [], onChange, isToday = true }) {
  const [text, setText] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const paper = pickPaper();
    onChange([
      ...stickies,
      {
        id: uid('sticky'),
        text: trimmed,
        done: false,
        bg: paper.bg,
        border: paper.border,
        rotate: pickRotate(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setText('');
  };

  const toggle = (id) => {
    onChange(stickies.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const remove = (id) => {
    onChange(stickies.filter((s) => s.id !== id));
  };

  const updateText = (id, t) => {
    onChange(stickies.map((s) => (s.id === id ? { ...s, text: t } : s)));
  };

  const remaining = stickies.filter((s) => !s.done).length;

  return (
    <Section
      title="스티커 메모"
      subtitle={isToday ? '잊지 말아야 할 것을 콕 붙여두세요' : '이 날에 기억해둘 메모'}
      right={
        stickies.length > 0 && (
          <span
            className="text-[11px] px-2 py-1 rounded-full"
            style={{
              background: remaining > 0 ? '#FFF1A8' : '#D1F5E4',
              color: remaining > 0 ? '#8A6800' : '#1F7A5A',
            }}
          >
            {remaining > 0 ? `남은 ${remaining}` : '모두 떼어냄'}
          </span>
        )
      }
    >
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            'repeating-linear-gradient(45deg, #FFFDF6, #FFFDF6 14px, #FBF6E8 14px, #FBF6E8 28px)',
          border: '1px solid #EFE7D4',
        }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ex. 김대리한테 전화 · 인보이스 확인 · 우유 사기"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid #EFE7D4', background: '#fff' }}
          />
          <button
            onClick={add}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-40"
            style={{
              background: '#FFB547',
              color: '#fff',
              boxShadow: text.trim() ? '0 2px 8px rgba(255,181,71,0.4)' : 'none',
            }}
          >
            <Plus size={14} /> 붙이기
          </button>
        </div>

        {stickies.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-4 pb-2">
            {stickies.map((s) => (
              <StickyCard
                key={s.id}
                sticky={s}
                onToggle={() => toggle(s.id)}
                onRemove={() => remove(s.id)}
                onTextChange={(t) => updateText(s.id, t)}
              />
            ))}
          </div>
        ) : (
          <div
            className="mt-3 text-center text-xs flex items-center justify-center gap-1.5"
            style={{ color: '#A89D8E' }}
          >
            <StickyIcon size={12} />
            첫 메모를 붙여보세요. 카테고리·시간 신경 쓰지 않아도 돼요.
          </div>
        )}
      </div>
    </Section>
  );
}

function StickyCard({ sticky, onToggle, onRemove, onTextChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sticky.text);
  const ref = useRef(null);

  useEffect(() => {
    setDraft(sticky.text);
  }, [sticky.text]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== sticky.text) onTextChange(trimmed);
    if (!trimmed) setDraft(sticky.text);
    setEditing(false);
  };

  return (
    <div
      className="row-hover"
      style={{
        background: sticky.bg || '#FFF1A8',
        padding: '20px 14px 14px',
        borderRadius: 6,
        minWidth: 150,
        maxWidth: 220,
        boxShadow: '0 6px 14px rgba(60,40,10,0.10), 0 1px 3px rgba(60,40,10,0.06)',
        transform: `rotate(${sticky.rotate || 0}deg)`,
        position: 'relative',
        opacity: sticky.done ? 0.65 : 1,
        transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* 테이프 */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 'calc(50% - 20px)',
          width: 40,
          height: 14,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(0,0,0,0.04)',
          borderRadius: 2,
          transform: 'rotate(-5deg)',
          pointerEvents: 'none',
        }}
      />

      {/* 체크 동그라미 */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: sticky.done ? '#5AD2B3' : 'rgba(255,255,255,0.7)',
          border: `1.5px solid ${sticky.done ? '#5AD2B3' : sticky.border || '#aaa'}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label={sticky.done ? '되돌리기' : '완료'}
        title={sticky.done ? '되돌리기' : '완료'}
      >
        {sticky.done && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>

      {/* 삭제 */}
      <button
        onClick={onRemove}
        className="on-hover"
        style={{
          position: 'absolute',
          right: 6,
          top: 6,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)',
          color: '#7A1F1D',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="떼어내기"
        title="떼어내기"
      >
        <X size={11} />
      </button>

      {editing ? (
        <textarea
          ref={ref}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              setDraft(sticky.text);
              setEditing(false);
            }
          }}
          rows={3}
          className="block w-full bg-transparent outline-none resize-none text-sm"
          style={{
            color: '#2B2620',
            fontFamily: 'inherit',
            minHeight: 56,
            marginTop: 6,
          }}
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="text-sm cursor-text"
          style={{
            color: '#2B2620',
            textDecoration: sticky.done ? 'line-through' : 'none',
            textDecorationColor: 'rgba(0,0,0,0.4)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            marginTop: 6,
            lineHeight: 1.45,
          }}
          title="클릭해서 편집"
        >
          {sticky.text}
        </p>
      )}
    </div>
  );
}
