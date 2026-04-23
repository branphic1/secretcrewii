// 저장소 wrapper — 모든 저장/로드는 반드시 이 모듈 경유 (CLAUDE.md 규칙)
// 현재 구현: localStorage 기반 동기 API를 Promise로 감싸 향후 IndexedDB/Cloud로 교체 쉽게.

const PREFIX = 'tl:';

function ssr() {
  return typeof window === 'undefined';
}

export const storage = {
  async load(key, fallback = null) {
    if (ssr()) return fallback;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[storage.load] failed:', key, e);
      return fallback;
    }
  },
  async save(key, value) {
    if (ssr()) return false;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[storage.save] failed:', key, e);
      alert('저장에 실패했습니다. 브라우저 저장 용량을 확인해주세요.');
      return false;
    }
  },
  async remove(key) {
    if (ssr()) return false;
    try {
      window.localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      console.error('[storage.remove] failed:', key, e);
      return false;
    }
  },
  async keys() {
    if (ssr()) return [];
    const out = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  },
  async exportAll() {
    const keys = await this.keys();
    const data = {};
    for (const k of keys) {
      data[k] = await this.load(k, null);
    }
    return data;
  },
  async importAll(data, { clearBefore = true } = {}) {
    if (ssr()) return false;
    try {
      if (clearBefore) {
        const keys = await this.keys();
        for (const k of keys) await this.remove(k);
      }
      for (const [k, v] of Object.entries(data)) {
        await this.save(k, v);
      }
      return true;
    } catch (e) {
      console.error('[storage.importAll] failed:', e);
      return false;
    }
  },
  async clearAll() {
    if (ssr()) return false;
    const keys = await this.keys();
    for (const k of keys) await this.remove(k);
    return true;
  },
};

export const KEYS = {
  categories: 'categories',
  entries: 'entries',
  yearly: (year) => `yearly:${year}`,
  blindspots: 'blindspots',
  blindspotCategories: 'blindspot_categories',
  settings: 'settings',
  timer: 'timer',
};
