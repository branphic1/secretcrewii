'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, Square, X } from 'lucide-react';
import {
  elapsedMs, remainingMs, isPaused, formatMMSS, elapsedHoursRounded,
} from '@/lib/time-ledger/timer.js';

export default function FloatingTimer({ timer, categories, onPause, onResume, onStop, onCancel, onComplete }) {
  const [now, setNow] = useState(Date.now());
  const [chimed, setChimed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer?.id]);

  useEffect(() => {
    setChimed(false);
  }, [timer?.id]);

  const paused = isPaused(timer);
  const remaining = remainingMs(timer, now);
  const total = timer.planMinutes * 60_000;
  const elapsed = Math.max(0, elapsedMs(timer, now));
  const progress = Math.min(1, elapsed / total);
  const overtime = remaining < 0;

  // 0 도달 시 1회 알림
  useEffect(() => {
    if (overtime && !chimed) {
      onComplete?.();
      setChimed(true);
    }
  }, [overtime, chimed, onComplete]);

  // 탭 타이틀에 남은시간 깜빡임
  useEffect(() => {
    const original = document.title;
    if (!timer) { document.title = original; return; }
    const label = overtime ? `(+${formatMMSS(-remaining)}) ${timer.taskName || '타이머'}`
                           : `${formatMMSS(remaining)} · ${timer.taskName || '타이머'}`;
    document.title = label;
    return () => { document.title = original; };
  }, [timer, remaining, overtime]);

  const cat = categories.find((c) => c.id === timer.categoryId);
  const accent = cat?.color ?? '#2B2620';

  const handleStop = () => {
    const h = elapsedHoursRounded(timer, now);
    const content = (timer.taskName || cat?.name || '타이머').trim();
    onStop({ hours: h, content, categoryId: timer.categoryId, date: timer.date });
  };

  const handleCancel = () => {
    if (!window.confirm('기록 없이 타이머를 취소할까요?')) return;
    onCancel();
  };

  // SVG 링 계산
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - progress);

  return (
    <div
      className="fixed z-50 fade-in"
      style={{
        right: 20,
        bottom: 20,
        background: '#FFFBF3',
        border: `1px solid ${overtime ? '#C85450' : '#EFE7D4'}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 28px rgba(28,25,23,0.12)',
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      {/* 링 */}
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#F3EDE1" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={overtime ? '#C85450' : accent}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={overtime ? 0 : dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.25s linear' }}
          />
        </svg>
        {paused && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: '#A8A29E' }}
          >
            <Pause size={14} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xs truncate" style={{ color: '#8A7F73' }}>
          {cat?.name ?? '카테고리 없음'}
          {paused && <span className="ml-2" style={{ color: '#A8A29E' }}>일시정지</span>}
        </div>
        <div
          className="display italic tabular-nums"
          style={{
            color: overtime ? '#C85450' : '#2B2620',
            fontSize: 22,
            lineHeight: 1.1,
          }}
        >
          {overtime ? '+' : ''}{formatMMSS(overtime ? -remaining : remaining)}
        </div>
        {timer.taskName && (
          <div className="text-xs truncate mt-0.5" style={{ color: '#57534E' }}>
            {timer.taskName}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {paused ? (
          <button
            onClick={onResume}
            className="p-1.5 rounded transition hover:bg-stone-100"
            style={{ color: '#57534E' }}
            aria-label="재개"
            title="재개"
          >
            <Play size={14} />
          </button>
        ) : (
          <button
            onClick={onPause}
            className="p-1.5 rounded transition hover:bg-stone-100"
            style={{ color: '#57534E' }}
            aria-label="일시정지"
            title="일시정지"
          >
            <Pause size={14} />
          </button>
        )}
        <button
          onClick={handleStop}
          className="p-1.5 rounded transition hover:bg-stone-100"
          style={{ color: '#5C8A6E' }}
          aria-label="완료 후 기록"
          title="완료하고 기록에 저장"
        >
          <Square size={14} fill="currentColor" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1.5 rounded transition hover:bg-stone-100"
          style={{ color: '#A8A29E' }}
          aria-label="기록 없이 취소"
          title="기록 없이 취소"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
