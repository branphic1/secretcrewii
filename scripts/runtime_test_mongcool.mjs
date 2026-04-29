// 실제 jsdom으로 페이지 로드 + 각 탭 클릭 → 콘솔 에러 캐치
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync('public/mongcool/index.html', 'utf8');

const errors = [];
const warns = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('[jsdomError] ' + (e.detail?.message || e.message || String(e))));
vc.on('error', (...a) => errors.push('[console.error] ' + a.map(x => x?.message || String(x)).join(' ')));
vc.on('warn', (...a) => warns.push('[console.warn] ' + a.map(x => x?.message || String(x)).join(' ')));

// Inject structuredClone polyfill BEFORE the page script runs
// (jsdom on older Node lacks it; real browsers have had it since 2022)
const polyfill = `<script>if (typeof window.structuredClone !== 'function') { window.structuredClone = (v) => JSON.parse(JSON.stringify(v)); }</script>`;
const htmlPatched = html.replace('<script>\n"use strict";', polyfill + '\n<script>\n"use strict";');

const dom = new JSDOM(htmlPatched, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'http://localhost/mongcool/',
});

// minimal localStorage polyfill if missing
const store = {};
if (!dom.window.localStorage) {
  dom.window.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

// give scripts a moment to execute
await new Promise((r) => setTimeout(r, 500));

const w = dom.window;
const d = w.document;

console.log('\n=== Initial load ===');
console.log('Errors:', errors.length, '| Warnings:', warns.length);
if (errors.length) errors.forEach((e) => console.log('  ❌', e));

console.log('\n=== Initial state ===');
console.log('Active tab:', d.querySelector('.nav-item.active')?.dataset?.tab || '(none)');
console.log('Topbar title:', d.querySelector('#topbar-title')?.textContent);
console.log('View has content:', (d.querySelector('#view')?.innerHTML?.length || 0) > 100);

console.log('\n=== Click each tab ===');
const tabs = ['schedule', 'orders', 'invoices', 'samples', 'defects', 'products', 'gallery', 'companies', 'parties', 'settings'];
const beforeErrCount = errors.length;
for (const tab of tabs) {
  try {
    if (typeof w.go !== 'function') { console.log(`  ❌ ${tab}: window.go not defined`); continue; }
    w.go(tab);
    await new Promise((r) => setTimeout(r, 50));
    const title = d.querySelector('#topbar-title')?.textContent || '';
    const viewHTML = d.querySelector('#view')?.innerHTML || '';
    const newErrs = errors.slice(beforeErrCount).length;
    if (viewHTML.length < 50) console.log(`  ⚠ ${tab}: 빈 view (${viewHTML.length} chars)`);
    else console.log(`  ✅ ${tab}: ${viewHTML.length} chars · 제목 "${title}"`);
  } catch (e) {
    console.log(`  ❌ ${tab}: ${e.message}`);
    errors.push(`tab ${tab}: ${e.message}`);
  }
}

console.log('\n=== Try opening each modal ===');
const modalTests = [
  ['openOrderModal', '발주'],
  ['openInvoiceModal', '청구서'],
  ['openSampleModal', '샘플'],
  ['openDefectModal', '불량'],
  ['openProductModal', '제품'],
  ['openDesignAssetModal', '디자인자료'],
  ['openSupplierModal', '공급처'],
  ['openEntityModal', '법인'],
  ['openForwarderModal', '포워딩사'],
  ['openBrokerModal', '관세사'],
  ['openEventModal', '일정'],
];
for (const [fn, label] of modalTests) {
  try {
    if (typeof w[fn] !== 'function') { console.log(`  ❌ ${label} (${fn}): not defined`); continue; }
    // most modals require some preconditions (products/entities exist) — they show a toast and bail.
    // We just want to make sure calling them doesn't throw uncaught.
    w[fn]();
    console.log(`  ✅ ${label} (${fn}): no exception`);
    if (typeof w.closeModal === 'function') w.closeModal();
  } catch (e) {
    console.log(`  ❌ ${label} (${fn}): ${e.message}`);
    errors.push(`modal ${label}: ${e.message}`);
  }
}

console.log('\n=== Seed via localStorage + 새 DOM 로드 ===');
// 페이지 스크립트의 const는 외부에서 안 보이므로 localStorage에 v1.2 DB를 넣고 새 인스턴스로 검증
{
  const seedDB = {
    version: '1.2', lastUpdated: new Date().toISOString(),
    entities: [{ id: 'e1', name: 'TestCo', bizNo: '', ceo: '', address: '', memo: '' }],
    forwarders: [], customsBrokers: [],
    suppliers: [{ id: 'sup1', name: 'Test Supplier', nameKor: '테스트', productGroup: 'fan', tags: ['주력공급처'], evaluations: [{ id:'ev', date:'2026-04-01', evaluator:'박성우', rating:4, quality:4, price:4, leadTimeAccuracy:4, communication:4, pros:'빠름', cons:'', note:'' }], photos: [] }],
    products: [{ id: 'p1', brand: 'TestBrand', category: 'fan', name: 'TestFan', option: '화이트', pcode: 'TF', ocode: 'TF-1', cbm: 0.01, weightKg: 0.1, supplierId: 'sup1', url: '', imageUrl: '', kcCert: '', memo: '', images: [], attachments: [{ id:'at1', label:'사양서', url:'https://drive.example/spec', kind:'drive' }], shootingNote: '라이프컷 우선' }],
    samples: [{ id: 'sm1', name: 'TF v1 sample', brand: 'TestBrand', category: 'fan', supplierId: 'sup1', sampleRound: 2, progress: '도착', expectedDate: '2026-05-10', receivedDate: '2026-04-20', finalDecision: 'pending', status: 'pending', images: [], evaluations: [], attachments: [], memo: '' }],
    invoiceGroups: [],
    orders: [{ id: 'o1', pid: 'p1', entityId: 'e1', orderDate: '2026-04-15', qty: 500, price: 28, rate: 195, factoryDate: '', whDate: '', shipDate: '2026-05-20', arriveDate: '', invoiceId: null, extraCosts: [], costPerUnit: 0, costBreakdown: null, memo: '', poNumber: 'PO-001' }],
    defects: [{ id: 'df1', productId: 'p1', orderId: 'o1', reportedDate: '2026-04-20', defectType: '외관', defectRate: 2.5, defectCount: 12, cause: 'QC 누락', resolution: '재작업', claimAmount: 200000, claimStatus: '', photos: [], attachments: [], resolved: false, memo: '' }],
    designAssets: [{ id: 'da1', name: '몽쿨 v3 패키지 시안', kind: '패키지', brand: 'TestBrand', category: 'fan', productId: 'p1', designer: '은정', memo: '', images: [], attachments: [], tags: [], createdAt: new Date().toISOString() }],
    events: [{ id: 'ev1', type: '촬영', title: '몽쿨 v3 라이프컷', date: '2026-05-15', time: '10:00', productId: 'p1', orderId: '', sampleId: '', memo: '', done: false }, { id: 'ev2', type: '미팅', title: '디자이너 미팅', date: '2026-04-10', productId: '', done: true }],
    filters: { brand: null, entity: null },
  };

  const errors2 = [];
  const vc2 = new VirtualConsole();
  vc2.on('jsdomError', (e) => errors2.push((e.detail?.message || e.message || String(e))));
  vc2.on('error', (...a) => errors2.push(a.map(x => x?.message || String(x)).join(' ')));

  const dom2 = new JSDOM(htmlPatched, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    virtualConsole: vc2, url: 'http://localhost/mongcool/',
    beforeParse(window) {
      const s = { 'mongcool_db': JSON.stringify(seedDB) };
      // jsdom localStorage는 read-only getter라 prototype patch
      const proto = Object.getPrototypeOf(window.localStorage);
      proto.getItem = (k) => s[k] || null;
      proto.setItem = (k, v) => { s[k] = String(v); };
      proto.removeItem = (k) => { delete s[k]; };
      proto.clear = () => { for (const k in s) delete s[k]; };
    },
  });
  await new Promise((r) => setTimeout(r, 500));

  // 모든 탭 클릭하면서 시드 데이터로 렌더되는지 확인
  for (const tab of tabs) {
    try {
      dom2.window.go(tab);
      await new Promise((r) => setTimeout(r, 30));
    } catch (e) { errors2.push(`tab ${tab}: ${e.message}`); }
  }

  // 일정 탭에서 캘린더 네비 + 완료 토글
  try {
    dom2.window.go('schedule');
    await new Promise((r) => setTimeout(r, 50));
    dom2.window.schedNav(1);
    dom2.window.schedToday();
    dom2.window.schedToggleDone();
    dom2.window.schedToggleDone();
  } catch (e) { errors2.push('schedule nav: ' + e.message); }

  // 제품 탭에서 통합 이력 모달 열기
  try {
    dom2.window.go('products');
    await new Promise((r) => setTimeout(r, 30));
    dom2.window.openProductDetail('p1');
  } catch (e) { errors2.push('openProductDetail: ' + e.message); }

  // 다른 탭 (gallery)에서도 schedNav 가드 동작 확인
  try {
    dom2.window.go('gallery');
    await new Promise((r) => setTimeout(r, 30));
    dom2.window.schedNav(1); // 다른 탭에 있어도 죽으면 안 됨
  } catch (e) { errors2.push('schedNav guard: ' + e.message); }

  if (errors2.length === 0) console.log('  ✅ 시드 데이터(7개 컬렉션) + 전체 탭 + 제품 이력 모달 + 캘린더 네비 모두 에러 없음');
  else { console.log('  ❌ 시드 시나리오 에러 ' + errors2.length + '건:'); errors2.forEach((e) => { console.log('    •', e); errors.push('seed: ' + e); }); }

  dom2.window.close();
}

console.log('\n=== 최종 ===');
if (errors.length === 0) console.log('🎉 런타임 에러 0건');
else { console.log('💥 런타임 에러 ' + errors.length + '건'); errors.forEach((e) => console.log('  •', e)); }
if (warns.length) {
  console.log('경고 ' + warns.length + '건 (참고용):');
  warns.slice(0, 5).forEach((w) => console.log('  •', w));
}

dom.window.close();
process.exit(errors.length > 0 ? 1 : 0);
