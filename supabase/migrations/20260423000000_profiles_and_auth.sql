-- profiles 테이블: 승인(approved) 여부를 저장
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  approved boolean not null default false,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 본인 프로필만 읽기 허용 (승인 여부를 본인이 확인할 수 있도록)
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select
  using (auth.uid() = id);

-- approved/role 의 self-update 는 차단. (Supabase 대시보드 또는 service role 로만 변경)
-- 일반 클라이언트는 update/insert/delete 정책이 없으므로 모두 차단됨.

-- 회원가입 시 profiles 행을 자동 생성하는 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
