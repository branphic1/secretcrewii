// 타이머 상태·계산·알림 유틸
// 단일 active timer 모델 (동시에 하나만 가동)
import { uid } from './id.js';

// state shape:
// {
//   id, taskName, categoryId, planMinutes,
//   startedAt,              // ms epoch
//   pausedAt | null,        // ms epoch
//   accumulatedPausedMs,    // 총 일시정지 누적
//   date,                   // YYYY-MM-DD (완료 시 여기에 log 기록)
//   planRef?: { date, index }  // 어느 계획 항목에서 시작됐는지(선택)
// }

export function createTimer({ taskName, categoryId, planMinutes, date, planRef = null }) {
  return {
    id: uid('timer'),
    taskName: taskName || '',
    categoryId,
    planMinutes,
    startedAt: Date.now(),
    pausedAt: null,
    accumulatedPausedMs: 0,
    date,
    planRef,
  };
}

export function elapsedMs(state, now = Date.now()) {
  if (!state) return 0;
  const pausedAdj = state.accumulatedPausedMs + (state.pausedAt ? (now - state.pausedAt) : 0);
  return (now - state.startedAt) - pausedAdj;
}

export function remainingMs(state, now = Date.now()) {
  return state.planMinutes * 60_000 - elapsedMs(state, now);
}

export function isPaused(state) {
  return !!(state && state.pausedAt);
}

export function pause(state, now = Date.now()) {
  if (!state || state.pausedAt) return state;
  return { ...state, pausedAt: now };
}

export function resume(state, now = Date.now()) {
  if (!state || !state.pausedAt) return state;
  return {
    ...state,
    accumulatedPausedMs: state.accumulatedPausedMs + (now - state.pausedAt),
    pausedAt: null,
  };
}

// 분 단위를 0.25h 단위로 반올림 (최소 0.25)
export function elapsedHoursRounded(state, now = Date.now()) {
  const ms = Math.max(0, elapsedMs(state, now));
  const rawH = ms / (1000 * 60 * 60);
  const rounded = Math.round(rawH / 0.25) * 0.25;
  return Math.max(0.25, rounded);
}

export function formatMMSS(ms) {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return neg ? `+${body}` : body;
}

// 부드러운 벨 사운드 (Web Audio). 브라우저 차단 가능하므로 호출부에서 try/catch.
export function playBell() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // 두 번의 짧은 톤 (G5 → E5)
    const notes = [
      { f: 784, t: now, d: 0.18 },
      { f: 659, t: now + 0.22, d: 0.28 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, n.t);
      gain.gain.setValueAtTime(0.0001, n.t);
      gain.gain.exponentialRampToValueAtTime(0.25, n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, n.t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(n.t);
      osc.stop(n.t + n.d + 0.05);
    }
    setTimeout(() => ctx.close(), 900);
  } catch {
    // silent
  }
}
