import type { Metadata } from "next";
import TimeLedgerApp from "@/components/time-ledger/TimeLedgerApp.jsx";

export const metadata: Metadata = {
  title: "Time Ledger · 시간의 궤적",
  description: "이커머스 팀장 1인을 위한 시간 기록 · 월간 조망 · 연간 전략 · 블라인드 스팟 관리 도구",
};

export default function TimeLedgerPage() {
  return <TimeLedgerApp />;
}
