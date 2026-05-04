import { createClient } from "@supabase/supabase-js";

// aiNose 테이블은 RLS service_role only — 모든 쿼리는 이 클라이언트로
export function createAiNoseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL 또는 SERVICE_ROLE_KEY 환경변수가 없어요.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
