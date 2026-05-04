-- Deck Builder: 회의록 → PPT + Word 통합 자료 변환 시스템
-- secretcrewii 본 인증(approved 크루) 으로 접근. 사용자별 프로필.

-- 사용자별 덱 빌더 프로필 (커스텀 가능)
create table if not exists public.deck_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text,                    -- 회사명 (표지·페이지 노트에 표기)
  logo_url text,                        -- 로고 (선택, 표지 우상단)
  accent1_hex text default 'D94A35',    -- 강조색 1 (코랄 기본)
  accent2_hex text default 'B8893E',    -- 강조색 2 (골드 기본)
  default_categories jsonb not null default '["기획","마케팅","제품개발","CS","재무"]'::jsonb,
  -- 자주 등장하는 인물: [{rawLabel, name, role, accent}]
  default_people jsonb not null default '[]'::jsonb,
  -- 시장 언어 후보 단어장
  vocabulary jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 덱 (회의록 1건 → 1 덱)
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  meeting_date timestamptz not null default now(),
  duration_minutes int,
  raw_transcript text,
  -- Stage 1 추출 결과 (JSON 보관, 검토 화면에서 편집)
  extracted jsonb,
  -- Stage 2 보조 자료 (V0: 텍스트만)
  supplements jsonb not null default '[]'::jsonb,
  -- 사용자가 선택한 인물 매핑 (rawLabel → name/role/accent)
  people_mapping jsonb not null default '[]'::jsonb,
  -- 빌드 결과
  pptx_url text,
  docx_url text,
  status text not null default 'draft' check (status in ('draft','extracting','reviewing','building','done','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decks_user_idx on public.decks (user_id, created_at desc);

-- 사용자가 직접 편집한 슬라이드 정의 (재빌드 시 사용)
create table if not exists public.deck_slides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  idx int not null,
  type text not null,
  section_num text,
  title text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists deck_slides_deck_idx on public.deck_slides (deck_id, idx);

-- RLS: 본인 데이터만 (auth.uid())
alter table public.deck_profiles enable row level security;
alter table public.decks enable row level security;
alter table public.deck_slides enable row level security;

drop policy if exists deck_profiles_owner on public.deck_profiles;
create policy deck_profiles_owner on public.deck_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists decks_owner on public.decks;
create policy decks_owner on public.decks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deck_slides_owner on public.deck_slides;
create policy deck_slides_owner on public.deck_slides for all
  using (exists (select 1 from public.decks d where d.id = deck_slides.deck_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.decks d where d.id = deck_slides.deck_id and d.user_id = auth.uid()));

-- updated_at 트리거
drop trigger if exists deck_profiles_set_updated_at on public.deck_profiles;
create trigger deck_profiles_set_updated_at
  before update on public.deck_profiles
  for each row execute function public.ainose_set_updated_at();

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.ainose_set_updated_at();
