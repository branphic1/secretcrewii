import { createClient as createSb } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// 사용자 컨텍스트 (RLS 적용) — 일반 데이터 접근
export function createDeckUserClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}

// service_role (필요할 때만 — 사용자 테이블 외 작업)
export function createDeckAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env 누락");
  return createSb(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 인증 + approved 검증 헬퍼
export async function getApprovedUser() {
  const sb = createDeckUserClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, approved: false, sb };
  const { data } = await sb.from("profiles").select("approved").eq("id", user.id).maybeSingle();
  return { user, approved: Boolean(data?.approved), sb };
}
