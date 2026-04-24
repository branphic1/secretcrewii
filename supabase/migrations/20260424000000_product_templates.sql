-- 제품별 마스터 템플릿 테이블
-- 관리자(role=admin)가 제품별로 지침 + 예시원고 세트를 등록/관리
-- 승인된 유저는 읽기만 가능 (cafe-writer 에서 불러와서 사용)

create table if not exists public.product_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- 예: "콧물흡입기", "모기기피제"
  guideline text not null,          -- 지침 (원고 작성 프롬프트)
  example text,                     -- 예시 원고 (선택)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_templates_name_idx on public.product_templates (name);

alter table public.product_templates enable row level security;

-- 승인된 유저는 전부 읽을 수 있음
drop policy if exists "templates_select_approved" on public.product_templates;
create policy "templates_select_approved" on public.product_templates
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

-- insert/update/delete 는 admin 만
drop policy if exists "templates_insert_admin" on public.product_templates;
create policy "templates_insert_admin" on public.product_templates
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

drop policy if exists "templates_update_admin" on public.product_templates;
create policy "templates_update_admin" on public.product_templates
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

drop policy if exists "templates_delete_admin" on public.product_templates;
create policy "templates_delete_admin" on public.product_templates
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.approved = true)
  );

-- updated_at 자동 갱신 (profiles 에서 이미 만든 공통 함수 사용)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_templates_touch_updated_at on public.product_templates;
create trigger product_templates_touch_updated_at
  before update on public.product_templates
  for each row execute function public.touch_updated_at();
