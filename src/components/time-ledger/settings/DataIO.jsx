import { useRef } from 'react';
import { Download, Upload, RefreshCcw } from 'lucide-react';
import { storage } from '@/lib/time-ledger/storage.js';

export default function DataIO({ onReset }) {
  const fileRef = useRef(null);

  const handleExport = async () => {
    const data = await storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `time-ledger-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleImportFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!window.confirm('현재 데이터를 덮어쓰고 가져올까요? 이 작업은 되돌릴 수 없습니다.')) {
        e.target.value = '';
        return;
      }
      const ok = await storage.importAll(json, { clearBefore: true });
      if (ok) {
        alert('가져오기 완료. 페이지를 새로고침합니다.');
        window.location.reload();
      } else {
        alert('가져오기에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('JSON 파일을 읽을 수 없습니다.');
    } finally {
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    if (!window.confirm('정말 모든 데이터를 초기화할까요?')) return;
    if (!window.confirm('한 번 더 확인합니다. 삭제된 데이터는 복구할 수 없습니다. 진행할까요?')) return;
    await storage.clearAll();
    onReset?.();
    alert('초기화 완료. 페이지를 새로고침합니다.');
    window.location.reload();
  };

  return (
    <div className="rounded-lg p-5 space-y-3" style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition"
          style={{ background: '#2B2620', color: '#FFFBF3' }}
        >
          <Download size={14} /> JSON 내보내기
        </button>
        <button
          onClick={handleImportClick}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition"
          style={{ background: '#FFFDF6', color: '#2B2620', border: '1px solid #EFE7D4' }}
        >
          <Upload size={14} /> JSON 가져오기
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition"
          style={{ background: '#FFFDF6', color: '#C85450', border: '1px solid #EFE7D4' }}
        >
          <RefreshCcw size={14} /> 전체 초기화
        </button>
      </div>
      <p className="text-xs" style={{ color: '#A8A29E' }}>
        월 1회 JSON 백업을 권장합니다. 가져오기는 기존 데이터를 덮어씁니다.
      </p>
    </div>
  );
}
