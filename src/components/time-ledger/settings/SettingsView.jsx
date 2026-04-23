import { Palette } from 'lucide-react';
import CategoryEditor from './CategoryEditor.jsx';
import DataIO from './DataIO.jsx';
import Section from '../common/Section.jsx';
import { DEFAULT_CATEGORIES, DEFAULT_BLINDSPOT_CATEGORIES } from '@/lib/time-ledger/categories.js';

export default function SettingsView({
  categories,
  setCategories,
  blindspotCategories,
  setBlindspotCategories,
  onReset,
}) {
  // 기본 팔레트로 색만 되돌리기 (이름 보존, 동일 id 기준 매칭)
  const refreshPalette = () => {
    if (!window.confirm('모든 카테고리의 색상을 최신 기본 팔레트로 되돌릴까요? 이름은 유지됩니다.')) return;
    setCategories((curr) =>
      curr.map((c) => {
        const fresh = DEFAULT_CATEGORIES.find((x) => x.id === c.id);
        return fresh ? { ...c, color: fresh.color } : c;
      })
    );
    setBlindspotCategories((curr) =>
      curr.map((c) => {
        const fresh = DEFAULT_BLINDSPOT_CATEGORIES.find((x) => x.id === c.id);
        return fresh ? { ...c, color: fresh.color } : c;
      })
    );
    alert('팔레트가 갱신되었습니다.');
  };

  return (
    <div className="space-y-8">
      <Section title="Time Ledger 카테고리" subtitle="업무 분류와 색상">
        <CategoryEditor
          items={categories}
          onChange={setCategories}
          idPrefix="cat"
        />
        <button
          onClick={refreshPalette}
          className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full transition hover:bg-stone-100"
          style={{ color: '#57534E', border: '1px solid #EFE7D4', background: '#FFFDF6' }}
        >
          <Palette size={12} /> 기본 팔레트로 색상 되돌리기
        </button>
      </Section>

      <Section title="블라인드 스팟 카테고리" subtitle="놓치기 쉬운 항목의 분류">
        <CategoryEditor
          items={blindspotCategories}
          onChange={setBlindspotCategories}
          idPrefix="bs"
        />
      </Section>

      <Section title="데이터 관리" subtitle="내보내기 / 가져오기 / 초기화">
        <DataIO onReset={onReset} />
      </Section>
    </div>
  );
}
