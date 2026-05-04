import PptxGenJS from "pptxgenjs";
import { Deck, DeckProfile, SlideDef } from "./types";

// 디자인 토큰 (사용자 프로필의 강조색 2종을 받아서 적용)
function tokens(profile: DeckProfile | null) {
  return {
    bg: "FAF7F0",
    bgDark: "0F1B2D",
    bgWarm: "F2EFE8",
    accent1: profile?.accent1_hex || "D94A35",
    accent2: profile?.accent2_hex || "B8893E",
    navy: "0F1B2D",
    ink: "131A23",
    inkSoft: "2B3340",
    inkMute: "6B6B6B",
    rule: "D8D5CC",
    fontHead: "Noto Serif KR",
    fontBody: "맑은 고딕",
  };
}

// 표준 16:9, masthead·pagenote 위치
const SW = 13.333;
const SH = 7.5;
const MASTHEAD_Y = 0.45;
const PAGENOTE_Y = 7.1;

// 사용자 프로필 + 추출 결과 → 슬라이드 정의 배열 자동 생성
export function planSlides(deck: Deck, profile: DeckProfile | null): SlideDef[] {
  const ex = deck.extracted;
  if (!ex) return [];
  const slides: SlideDef[] = [];
  let secNum = 0;
  const sec = () => `§${String(++secNum).padStart(2, "0")}`;

  // 1. cover
  slides.push({
    idx: slides.length + 1,
    type: "cover",
    title: deck.title,
    subtitle: ex.executiveSummary,
    data: { date: deck.meeting_date, company: profile?.company_name || "" },
  });

  // 2. TOC (간단)
  const tocItems: string[] = [];
  tocItems.push("핵심 명제");
  if (ex.timelineMarkers.length) tocItems.push("회의 타임라인");
  if (ex.bestQuotes.length) tocItems.push("BEST 인용");
  if (ex.phases.length) tocItems.push("Phase 분석");
  if (ex.dataPoints.length) tocItems.push("데이터 카탈로그");
  if (ex.actionItems.length) tocItems.push("액션 아이템");
  slides.push({ idx: slides.length + 1, type: "toc", title: "목차", data: { items: tocItems } });

  // §01 핵심 명제
  if (ex.coreThesis.text) {
    slides.push({
      idx: slides.length + 1,
      type: "pull-quote",
      section_num: sec(),
      title: "핵심 명제",
      data: {
        quote: ex.coreThesis.text,
        attribution: `${ex.coreThesis.speaker} · ${ex.coreThesis.timestamp}`,
      },
    });
  }

  // §02 회의 타임라인
  if (ex.timelineMarkers.length) {
    slides.push({
      idx: slides.length + 1,
      type: "timeline",
      section_num: sec(),
      title: "회의 타임라인",
      data: { markers: ex.timelineMarkers, phases: ex.phases },
    });
  }

  // §03 BEST 인용 (10개 카드 그리드)
  if (ex.bestQuotes.length) {
    slides.push({
      idx: slides.length + 1,
      type: "quote-grid",
      section_num: sec(),
      title: "BEST 인용",
      data: { quotes: ex.bestQuotes.slice(0, 10) },
    });
  }

  // §04 Phase 카드 (있을 때)
  if (ex.phases.length) {
    slides.push({
      idx: slides.length + 1,
      type: "tri-card",
      section_num: sec(),
      title: "Phase 분석",
      data: { cards: ex.phases.slice(0, 4) },
    });
  }

  // §05 데이터 카탈로그 (있을 때)
  if (ex.dataPoints.length) {
    slides.push({
      idx: slides.length + 1,
      type: "data-catalog",
      section_num: sec(),
      title: "데이터 카탈로그",
      data: { rows: ex.dataPoints },
    });
  }

  // §06 액션 아이템 (tri-card 재활용)
  if (ex.actionItems.length) {
    slides.push({
      idx: slides.length + 1,
      type: "tri-card",
      section_num: sec(),
      title: "액션 아이템",
      data: {
        cards: ex.actionItems.map((a, i) => ({ title: `Action ${i + 1}`, summary: a })),
      },
    });
  }

  // closing
  slides.push({
    idx: slides.length + 1,
    type: "closing",
    title: "감사합니다",
    data: { company: profile?.company_name || "" },
  });

  return slides;
}

// 마스트헤드 (모든 § 슬라이드 공통)
function masthead(slide: PptxGenJS.Slide, secNum: string | undefined, title: string | undefined, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  if (secNum) {
    slide.addText(secNum, {
      x: 0.5,
      y: MASTHEAD_Y - 0.2,
      w: 1,
      h: 0.4,
      fontFace: t.fontHead,
      fontSize: 12,
      color: t.accent1,
      bold: true,
    });
  }
  if (title) {
    slide.addText(title, {
      x: 1.6,
      y: MASTHEAD_Y - 0.2,
      w: 8,
      h: 0.4,
      fontFace: t.fontBody,
      fontSize: 11,
      color: t.inkMute,
    });
  }
  if (profile?.company_name) {
    slide.addText(profile.company_name, {
      x: SW - 3.5,
      y: MASTHEAD_Y - 0.2,
      w: 3,
      h: 0.4,
      fontFace: t.fontBody,
      fontSize: 9,
      color: t.inkMute,
      align: "right",
    });
  }
  slide.addShape("line", {
    x: 0.5,
    y: MASTHEAD_Y + 0.25,
    w: SW - 1,
    h: 0,
    line: { color: t.rule, width: 0.5 },
  });
}

function pageNote(slide: PptxGenJS.Slide, idx: number, total: number, t: ReturnType<typeof tokens>) {
  slide.addText(`${idx} / ${total}`, {
    x: SW - 1.5,
    y: PAGENOTE_Y + 0.05,
    w: 1,
    h: 0.3,
    fontFace: t.fontBody,
    fontSize: 9,
    color: t.inkMute,
    align: "right",
  });
}

// ===== 슬라이드 타입별 렌더러 =====

function renderCover(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  if (profile?.company_name) {
    slide.addText(profile.company_name, {
      x: 1, y: 1, w: SW - 2, h: 0.5,
      fontFace: t.fontBody, fontSize: 14, color: t.inkMute,
    });
  }
  slide.addShape("line", {
    x: 1, y: 1.7, w: 1.5, h: 0,
    line: { color: t.accent1, width: 2 },
  });
  slide.addText(def.title || "", {
    x: 1, y: 2, w: SW - 2, h: 1.6,
    fontFace: t.fontHead, fontSize: 44, color: t.navy, bold: true,
  });
  if (def.subtitle) {
    slide.addText(def.subtitle, {
      x: 1, y: 3.8, w: SW - 2, h: 1.2,
      fontFace: t.fontBody, fontSize: 18, color: t.inkSoft, italic: true,
    });
  }
  const date = (def.data?.date as string) || "";
  if (date) {
    slide.addText(
      new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
      { x: 1, y: SH - 1, w: SW - 2, h: 0.4, fontFace: t.fontBody, fontSize: 12, color: t.inkMute }
    );
  }
}

function renderToc(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>) {
  slide.background = { color: t.bg };
  slide.addText("목차", {
    x: 1, y: 1, w: SW - 2, h: 0.8,
    fontFace: t.fontHead, fontSize: 28, color: t.navy, bold: true,
  });
  const items = (def.data?.items as string[]) || [];
  items.forEach((item, i) => {
    slide.addText(`${String(i + 1).padStart(2, "0")}`, {
      x: 1, y: 2.2 + i * 0.55, w: 0.8, h: 0.45,
      fontFace: t.fontBody, fontSize: 16, color: t.accent1, bold: true,
    });
    slide.addText(item, {
      x: 1.8, y: 2.2 + i * 0.55, w: SW - 3, h: 0.45,
      fontFace: t.fontBody, fontSize: 16, color: t.ink,
    });
  });
}

function renderPullQuote(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  masthead(slide, def.section_num, def.title, t, profile);
  const data = def.data as { quote?: string; attribution?: string };
  slide.addText("“", {
    x: 1, y: 1.5, w: 1, h: 1.5,
    fontFace: "Georgia", fontSize: 100, color: t.accent1, bold: true,
  });
  slide.addText(data.quote || "", {
    x: 1.5, y: 2.4, w: SW - 3, h: 3,
    fontFace: t.fontHead, fontSize: 28, color: t.navy, bold: true,
    valign: "middle",
  });
  if (data.attribution) {
    slide.addText(`— ${data.attribution}`, {
      x: 1.5, y: 5.6, w: SW - 3, h: 0.5,
      fontFace: t.fontBody, fontSize: 14, color: t.accent1,
    });
  }
}

function renderTimeline(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  masthead(slide, def.section_num, def.title, t, profile);
  const markers = (def.data?.markers as Array<{ timestamp: string; title: string; summary: string }>) || [];
  const top = markers.slice(0, 8);
  const colW = (SW - 2) / Math.max(top.length, 1);
  top.forEach((m, i) => {
    const x = 1 + colW * i;
    slide.addText(m.timestamp, {
      x, y: 1.5, w: colW - 0.2, h: 0.4,
      fontFace: t.fontBody, fontSize: 10, color: t.accent1, bold: true,
    });
    slide.addText(m.title, {
      x, y: 1.95, w: colW - 0.2, h: 0.6,
      fontFace: t.fontBody, fontSize: 12, color: t.ink, bold: true,
    });
    slide.addText(m.summary, {
      x, y: 2.6, w: colW - 0.2, h: 2.5,
      fontFace: t.fontBody, fontSize: 9, color: t.inkSoft,
    });
  });
}

function renderQuoteGrid(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  masthead(slide, def.section_num, def.title, t, profile);
  const quotes = (def.data?.quotes as Array<{ timestamp: string; speaker: string; text: string; starred?: boolean }>) || [];
  const cols = 2;
  const cardW = (SW - 2 - 0.3) / cols;
  const cardH = 1.45;
  quotes.slice(0, 8).forEach((q, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 1 + col * (cardW + 0.3);
    const y = 1.4 + row * (cardH + 0.2);
    // 좌측 바
    slide.addShape("rect", {
      x, y, w: 0.08, h: cardH,
      fill: { color: q.starred ? t.accent1 : t.accent2 },
      line: { type: "none" },
    });
    slide.addShape("rect", {
      x: x + 0.08, y, w: cardW - 0.08, h: cardH,
      fill: { color: "FFFFFF" },
      line: { color: t.rule, width: 0.5 },
    });
    slide.addText(`${q.speaker} · ${q.timestamp}${q.starred ? "  ★" : ""}`, {
      x: x + 0.25, y: y + 0.1, w: cardW - 0.4, h: 0.3,
      fontFace: t.fontBody, fontSize: 9, color: t.inkMute, bold: true,
    });
    slide.addText(q.text, {
      x: x + 0.25, y: y + 0.4, w: cardW - 0.4, h: cardH - 0.5,
      fontFace: t.fontBody, fontSize: 11, color: t.ink,
    });
  });
}

function renderTriCard(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  masthead(slide, def.section_num, def.title, t, profile);
  const cards = (def.data?.cards as Array<{ title: string; summary?: string; range?: string }>) || [];
  const n = Math.min(cards.length, 4);
  const cardW = (SW - 2 - 0.3 * (n - 1)) / n;
  const cardH = 4.5;
  cards.slice(0, n).forEach((c, i) => {
    const x = 1 + i * (cardW + 0.3);
    const y = 1.6;
    slide.addShape("rect", {
      x, y, w: cardW, h: 0.15,
      fill: { color: i % 2 === 0 ? t.accent1 : t.accent2 },
      line: { type: "none" },
    });
    slide.addShape("rect", {
      x, y: y + 0.15, w: cardW, h: cardH - 0.15,
      fill: { color: "FFFFFF" },
      line: { color: t.rule, width: 0.5 },
    });
    slide.addText(c.title, {
      x: x + 0.3, y: y + 0.4, w: cardW - 0.6, h: 0.6,
      fontFace: t.fontBody, fontSize: 14, color: t.navy, bold: true,
    });
    if (c.range) {
      slide.addText(c.range, {
        x: x + 0.3, y: y + 1, w: cardW - 0.6, h: 0.4,
        fontFace: t.fontBody, fontSize: 10, color: t.accent1,
      });
    }
    if (c.summary) {
      slide.addText(c.summary, {
        x: x + 0.3, y: y + 1.5, w: cardW - 0.6, h: cardH - 1.7,
        fontFace: t.fontBody, fontSize: 11, color: t.inkSoft,
      });
    }
  });
}

function renderDataCatalog(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>, profile: DeckProfile | null) {
  slide.background = { color: t.bg };
  masthead(slide, def.section_num, def.title, t, profile);
  const rows = (def.data?.rows as Array<{ value: string; unit: string; context: string; timestamp?: string }>) || [];
  const headers = ["수치", "단위", "맥락", "시점"];
  const colWs = [1.2, 0.8, 6, 1.2];
  const xStart = 1;
  const yStart = 1.5;
  const rowH = 0.4;
  // 헤더
  let xCur = xStart;
  headers.forEach((h, i) => {
    slide.addShape("rect", {
      x: xCur, y: yStart, w: colWs[i], h: rowH,
      fill: { color: t.navy },
      line: { type: "none" },
    });
    slide.addText(h, {
      x: xCur, y: yStart, w: colWs[i], h: rowH,
      fontFace: t.fontBody, fontSize: 10, color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });
    xCur += colWs[i];
  });
  // 본문
  rows.slice(0, 12).forEach((r, idx) => {
    const y = yStart + rowH + idx * rowH;
    xCur = xStart;
    [r.value, r.unit, r.context, r.timestamp || ""].forEach((cell, ci) => {
      slide.addShape("rect", {
        x: xCur, y, w: colWs[ci], h: rowH,
        fill: { color: idx % 2 === 0 ? "FFFFFF" : t.bgWarm },
        line: { color: t.rule, width: 0.3 },
      });
      slide.addText(cell, {
        x: xCur + 0.05, y, w: colWs[ci] - 0.1, h: rowH,
        fontFace: t.fontBody,
        fontSize: 9,
        color: ci === 0 ? t.accent1 : t.ink,
        bold: ci === 0,
        valign: "middle",
        align: ci < 2 ? "center" : "left",
      });
      xCur += colWs[ci];
    });
  });
}

function renderClosing(slide: PptxGenJS.Slide, def: SlideDef, t: ReturnType<typeof tokens>) {
  slide.background = { color: t.bgDark };
  slide.addText(def.title || "감사합니다", {
    x: 1, y: 2.8, w: SW - 2, h: 1.5,
    fontFace: t.fontHead, fontSize: 56, color: "FFFFFF", bold: true, align: "center",
  });
  const company = (def.data?.company as string) || "";
  if (company) {
    slide.addText(company, {
      x: 1, y: 4.5, w: SW - 2, h: 0.5,
      fontFace: t.fontBody, fontSize: 14, color: "B8893E", align: "center",
    });
  }
}

// ===== 메인 빌더 =====
export async function buildDeckPptx(deck: Deck, profile: DeckProfile | null, slides: SlideDef[]): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.author = profile?.company_name || "Deck Builder";
  const t = tokens(profile);

  const total = slides.length;
  for (const def of slides) {
    const slide = pptx.addSlide();
    switch (def.type) {
      case "cover":
        renderCover(slide, def, t, profile);
        break;
      case "toc":
        renderToc(slide, def, t);
        break;
      case "pull-quote":
        renderPullQuote(slide, def, t, profile);
        pageNote(slide, def.idx, total, t);
        break;
      case "timeline":
        renderTimeline(slide, def, t, profile);
        pageNote(slide, def.idx, total, t);
        break;
      case "quote-grid":
        renderQuoteGrid(slide, def, t, profile);
        pageNote(slide, def.idx, total, t);
        break;
      case "tri-card":
        renderTriCard(slide, def, t, profile);
        pageNote(slide, def.idx, total, t);
        break;
      case "data-catalog":
        renderDataCatalog(slide, def, t, profile);
        pageNote(slide, def.idx, total, t);
        break;
      case "closing":
        renderClosing(slide, def, t);
        break;
    }
  }

  // pptxgenjs writeFile / write 둘 다 가능 — Node 환경에서 buffer 반환
  const data = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return data;
}
