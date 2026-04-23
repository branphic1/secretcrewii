import CategoryEditor from './CategoryEditor.jsx';
import DataIO from './DataIO.jsx';
import Section from '../common/Section.jsx';

export default function SettingsView({
  categories,
  setCategories,
  blindspotCategories,
  setBlindspotCategories,
  onReset,
}) {
  return (
    <div className="space-y-10">
      <Section title="Time Ledger 카테고리" subtitle="업무 분류와 색상">
        <CategoryEditor
          items={categories}
          onChange={setCategories}
          idPrefix="cat"
        />
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
