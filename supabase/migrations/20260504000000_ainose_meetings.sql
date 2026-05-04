-- 아이노즈 ↔ 에프씨넷 회의록 자동화 시스템
-- 게이트는 환경변수 기반 쿠키 세션이라 user_id 컬럼 없이 단일 워크스페이스로 운영
-- (FCNet 통화 회의록 = 박성우 대표 + 일부 임원 한정 사용)

create table if not exists public.ainose_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date timestamptz not null default now(),
  duration_minutes int,
  raw_transcript text,
  executive_summary text,
  next_agenda jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','analyzing','reviewed','finalized','failed')),
  analyze_error text,
  docx_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ainose_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.ainose_meetings(id) on delete cascade,
  raw_label text not null,
  name text,
  role text,
  is_external boolean not null default false,
  utterance_count int not null default 0,
  order_idx int not null default 0
);

create table if not exists public.ainose_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.ainose_meetings(id) on delete cascade,
  title text not null,
  description text,
  category text,
  rationale text,
  source_timestamp text,
  order_idx int not null default 0
);

create table if not exists public.ainose_sections (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.ainose_meetings(id) on delete cascade,
  title text not null,
  bullets jsonb not null default '[]'::jsonb,
  order_idx int not null default 0
);

create table if not exists public.ainose_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.ainose_meetings(id) on delete cascade,
  title text not null,
  description text,
  owner_name text,
  due_date date,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  source_timestamp text,
  order_idx int not null default 0
);

create table if not exists public.ainose_risks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.ainose_meetings(id) on delete cascade,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('high','medium','low')),
  mitigation text,
  order_idx int not null default 0
);

create index if not exists ainose_meetings_created_at_idx on public.ainose_meetings (created_at desc);
create index if not exists ainose_participants_meeting_idx on public.ainose_participants (meeting_id, order_idx);
create index if not exists ainose_decisions_meeting_idx on public.ainose_decisions (meeting_id, order_idx);
create index if not exists ainose_sections_meeting_idx on public.ainose_sections (meeting_id, order_idx);
create index if not exists ainose_action_items_meeting_idx on public.ainose_action_items (meeting_id, order_idx);
create index if not exists ainose_risks_meeting_idx on public.ainose_risks (meeting_id, order_idx);

-- RLS: 모든 데이터 접근은 service_role 키 (서버 라우트 핸들러)에서만 처리.
-- 클라이언트 직접 접근 차단 — anon 키로는 SELECT/INSERT 모두 막힘.
alter table public.ainose_meetings enable row level security;
alter table public.ainose_participants enable row level security;
alter table public.ainose_decisions enable row level security;
alter table public.ainose_sections enable row level security;
alter table public.ainose_action_items enable row level security;
alter table public.ainose_risks enable row level security;

-- updated_at 자동 갱신
create or replace function public.ainose_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ainose_meetings_set_updated_at on public.ainose_meetings;
create trigger ainose_meetings_set_updated_at
  before update on public.ainose_meetings
  for each row execute function public.ainose_set_updated_at();
