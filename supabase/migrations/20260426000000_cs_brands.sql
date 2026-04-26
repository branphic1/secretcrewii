-- ==============================================================
-- CS 자동 응답 시스템 (Naver Chat Monitor 데스크탑 + 웹 어드민 공유)
-- ==============================================================
-- 4개 테이블:
--   cs_brands           — 브랜드 메타 (ainose, mongcool, shugajaem, kodakjy 등)
--   cs_brand_files      — 브랜드별 마크다운 자료 (qna.md, manual.md, ...)
--   cs_global_guidelines — 전 브랜드 공통 가이드라인 (싱글톤 active 1개)
--   cs_analyses         — 매 분석 호출 이력 (감사·통계용)
--
-- RLS 정책:
--   - approved=true 인 크루는 모두 읽기 가능
--   - admin 만 INSERT/UPDATE/DELETE 가능
--   - cs_analyses 는 본인 분석만 INSERT, admin 은 전체 SELECT


-- ── 1. 브랜드 메타 ────────────────────────────────────────────
create table if not exists public.cs_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                   -- 'ainose' / 'mongcool' / ...
  display_name text not null,                  -- '아이노즈 (Ainose)'
  tagline text,                                -- 한 줄 소개
  greeting text,                               -- 표준 인사말
  trigger_keywords text[] default array[]::text[],
  products text[] default array[]::text[],
  active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cs_brands_slug_idx on public.cs_brands (slug);
create index if not exists cs_brands_active_idx on public.cs_brands (active) where active = true;

alter table public.cs_brands enable row level security;

drop policy if exists "cs_brands_select_approved" on public.cs_brands;
create policy "cs_brands_select_approved" on public.cs_brands
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "cs_brands_write_admin" on public.cs_brands;
create policy "cs_brands_write_admin" on public.cs_brands
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

drop trigger if exists cs_brands_touch_updated_at on public.cs_brands;
create trigger cs_brands_touch_updated_at
  before update on public.cs_brands
  for each row execute function public.touch_updated_at();


-- ── 2. 브랜드별 마크다운 자료 ────────────────────────────────
create table if not exists public.cs_brand_files (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.cs_brands(id) on delete cascade,
  filename text not null,                      -- 'qna.md' / 'manual.md' / ...
  purpose text,                                -- 사람이 읽는 라벨 ('Q&A 마스터' 등)
  content text not null default '',            -- 마크다운 본문
  size_bytes int generated always as (length(content)) stored,
  sort_order int not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, filename)
);

create index if not exists cs_brand_files_brand_id_idx on public.cs_brand_files (brand_id);

alter table public.cs_brand_files enable row level security;

drop policy if exists "cs_brand_files_select_approved" on public.cs_brand_files;
create policy "cs_brand_files_select_approved" on public.cs_brand_files
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "cs_brand_files_write_admin" on public.cs_brand_files;
create policy "cs_brand_files_write_admin" on public.cs_brand_files
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

drop trigger if exists cs_brand_files_touch_updated_at on public.cs_brand_files;
create trigger cs_brand_files_touch_updated_at
  before update on public.cs_brand_files
  for each row execute function public.touch_updated_at();


-- ── 3. 전 브랜드 공통 가이드라인 (active 한 행이 현재 사용본) ─
create table if not exists public.cs_global_guidelines (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  version int not null default 1,
  active boolean not null default false,       -- 한 번에 하나만 active
  note text,                                   -- 변경 사유 / 메모
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- active=true 는 최대 1개만 허용 (동시 활성 방지)
create unique index if not exists cs_global_guidelines_only_one_active
  on public.cs_global_guidelines (active) where active = true;

alter table public.cs_global_guidelines enable row level security;

drop policy if exists "cs_guidelines_select_approved" on public.cs_global_guidelines;
create policy "cs_guidelines_select_approved" on public.cs_global_guidelines
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "cs_guidelines_write_admin" on public.cs_global_guidelines;
create policy "cs_guidelines_write_admin" on public.cs_global_guidelines
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

drop trigger if exists cs_guidelines_touch_updated_at on public.cs_global_guidelines;
create trigger cs_guidelines_touch_updated_at
  before update on public.cs_global_guidelines
  for each row execute function public.touch_updated_at();


-- ── 4. 분석 이력 (호출당 1행) ─────────────────────────────────
create table if not exists public.cs_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  brand_id uuid references public.cs_brands(id) on delete set null,
  source text not null default 'desktop',      -- 'desktop' / 'web'
  llm_backend text,                            -- 'claude_code' / 'api'
  model text,                                  -- 'sonnet' / 'claude-sonnet-4-6' 등
  nickname text,                               -- 채팅 상대 닉네임
  category_badge text,
  needs_human boolean default false,
  confidence text,                             -- '상' / '중' / '하'
  raw_response text,                           -- LLM 원문 (디버깅용)
  parsed_json jsonb,                           -- 구조화된 분석 결과
  reply_draft text,                            -- 응답 초안
  was_sent boolean not null default false,
  sent_at timestamptz,
  duration_ms int,                             -- LLM 호출 소요 시간
  created_at timestamptz not null default now()
);

create index if not exists cs_analyses_user_id_idx on public.cs_analyses (user_id);
create index if not exists cs_analyses_brand_id_idx on public.cs_analyses (brand_id);
create index if not exists cs_analyses_created_at_idx on public.cs_analyses (created_at desc);
create index if not exists cs_analyses_was_sent_idx on public.cs_analyses (was_sent);

alter table public.cs_analyses enable row level security;

-- 본인 이력은 본인만 SELECT, admin 은 전체 SELECT
drop policy if exists "cs_analyses_select_own_or_admin" on public.cs_analyses;
create policy "cs_analyses_select_own_or_admin" on public.cs_analyses
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

-- approved 크루는 본인 분석만 INSERT 가능
drop policy if exists "cs_analyses_insert_self_approved" on public.cs_analyses;
create policy "cs_analyses_insert_self_approved" on public.cs_analyses
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

-- 본인 분석은 본인이 UPDATE 가능 (was_sent 토글용), admin 은 전체
drop policy if exists "cs_analyses_update_own_or_admin" on public.cs_analyses;
create policy "cs_analyses_update_own_or_admin" on public.cs_analyses
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

-- DELETE 는 admin 만
drop policy if exists "cs_analyses_delete_admin" on public.cs_analyses;
create policy "cs_analyses_delete_admin" on public.cs_analyses
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );


-- ── 통계 뷰 (어드민 대시보드용) ───────────────────────────────
create or replace view public.cs_analyses_daily_stats as
  select
    date_trunc('day', created_at)::date as day,
    user_id,
    brand_id,
    count(*) as total,
    count(*) filter (where was_sent) as sent,
    count(*) filter (where needs_human) as needs_human,
    avg(duration_ms) as avg_duration_ms
  from public.cs_analyses
  group by 1, 2, 3;
