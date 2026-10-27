-- setup.sql – 현장 일정 날씨판 Supabase 표 만들기 (06 단원)
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run. 여러 번 실행해도 안전함.

-- 1) 표 : 구분 · 지역 값 규칙을 DB 에서도 막음
create table if not exists public.wx_tasks (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(btrim(title)) between 1 and 100),
  region     text not null check (region in ('세종', '대전', '태안', '보령')),
  kind       text not null check (kind in ('야외', '고소', '실내')),
  owner      text not null check (char_length(btrim(owner)) between 1 and 100),
  created_at timestamptz not null default now()
);

-- 2) 행 보안(RLS) : 공개용 키로는 읽기 · 추가만 (수정 · 삭제 정책 없음 = 막힘)
alter table public.wx_tasks enable row level security;

drop policy if exists "wx_tasks 읽기" on public.wx_tasks;
create policy "wx_tasks 읽기" on public.wx_tasks
  for select to anon, authenticated using (true);

drop policy if exists "wx_tasks 추가" on public.wx_tasks;
create policy "wx_tasks 추가" on public.wx_tasks
  for insert to anon, authenticated with check (true);

grant select, insert on public.wx_tasks to anon, authenticated;
revoke update, delete, truncate on public.wx_tasks from anon, authenticated;

-- 3) 가상 일정 6건 (표가 비어 있을 때만)
insert into public.wx_tasks (title, region, kind, owner)
select * from (values
  ('다중이용시설 안전점검',   '세종', '야외', '김안전'),
  ('시민 안전체험 행사 운영', '보령', '야외', '이행사'),
  ('옥상 태양광 설비 점검',   '태안', '고소', '박설비'),
  ('하천 수위계 확인',        '대전', '야외', '최현장'),
  ('청사 외벽 간판 보수',     '세종', '고소', '정시설'),
  ('비상연락 훈련',           '대전', '실내', '한상황')
) as v(title, region, kind, owner)
where not exists (select 1 from public.wx_tasks);
