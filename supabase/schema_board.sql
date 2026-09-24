-- AP Games 게시판 — Supabase 스키마 (SQL Editor 에 통째로 붙여 실행)
-- 카테고리: notice(공지·패치노트, 관리자만 작성) · free(자유) · fanart(팬아트·공략, 이미지) · bug(버그·건의, 상태)
-- 로그인: 구글·애플 (Supabase Auth). 읽기는 누구나, 쓰기는 로그인한 사람만.

create extension if not exists pgcrypto;
-- 퀴즈아레나 Supabase 프로젝트 안에 board 전용 스키마로 둔다 (public 표와 섞이지 않게). 로그인 계정(auth)은 공유.
create schema if not exists board;

-- 프로필 (닉네임 · 관리자 · 차단)
create table if not exists board.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique check (char_length(nickname) between 2 and 16),
  is_admin boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists board.posts (
  id bigint generated always as identity primary key,
  game text not null default 'lastwave',
  category text not null check (category in ('notice','free','fanart','bug')),
  author uuid not null references board.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 1 and 8000),
  images text[] not null default '{}',
  status text check (status in ('open','checking','fixed','wontfix')),   -- bug 전용
  pinned boolean not null default false,
  hidden boolean not null default false,
  comment_count int not null default 0,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_list on board.posts (game, category, pinned desc, created_at desc) where not hidden;

create table if not exists board.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references board.posts(id) on delete cascade,
  author uuid not null references board.profiles(id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post on board.comments (post_id, created_at);

create table if not exists board.likes (
  post_id bigint references board.posts(id) on delete cascade,
  user_id uuid references board.profiles(id) on delete cascade default auth.uid(),
  primary key (post_id, user_id)
);

create table if not exists board.reports (
  id bigint generated always as identity primary key,
  post_id bigint references board.posts(id) on delete cascade,
  comment_id bigint references board.comments(id) on delete cascade,
  reporter uuid not null references board.profiles(id) on delete cascade default auth.uid(),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

-- 헬퍼
create or replace function board.is_admin() returns boolean language sql stable security definer set search_path=board as
$$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;
create or replace function board.can_write() returns boolean language sql stable security definer set search_path=board as
$$ select exists(select 1 from profiles where id = auth.uid() and not banned and nickname is not null) $$;

-- 프로필은 게시판에 처음 들어올 때 본인이 만든다 (퀴즈아레나 가입 흐름에 트리거를 걸지 않기 위해)
-- 카운터 · 수정시각 · 권한 가드 (일반 유저는 pinned/hidden/status 를 못 바꿈, 공지는 관리자만)
create or replace function board.posts_guard() returns trigger language plpgsql security definer set search_path=board as
$$ begin
  -- 가드는 로그인한 일반 유저 요청에만. SQL 편집기(auth.uid() 없음)와 카운터 트리거(깊이>1)는 통과.
  if auth.uid() is not null and pg_trigger_depth() = 1 and not board.is_admin() then
    if tg_op = 'INSERT' then
      if new.category = 'notice' then raise exception 'notice is admin-only'; end if;
      new.pinned := false; new.hidden := false; new.comment_count := 0; new.like_count := 0;
      new.status := case when new.category = 'bug' then 'open' else null end;
    else
      new.pinned := old.pinned; new.hidden := old.hidden; new.status := old.status;
      new.category := old.category; new.comment_count := old.comment_count; new.like_count := old.like_count;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists posts_guard on board.posts;
create trigger posts_guard before insert or update on board.posts for each row execute function board.posts_guard();

create or replace function board.count_comments() returns trigger language plpgsql security definer set search_path=board as
$$ begin
  update posts set comment_count = (select count(*) from comments where post_id = coalesce(new.post_id, old.post_id) and not hidden)
   where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists count_comments on board.comments;
create trigger count_comments after insert or update or delete on board.comments for each row execute function board.count_comments();

create or replace function board.count_likes() returns trigger language plpgsql security definer set search_path=board as
$$ begin
  update posts set like_count = (select count(*) from likes where post_id = coalesce(new.post_id, old.post_id))
   where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists count_likes on board.likes;
create trigger count_likes after insert or delete on board.likes for each row execute function board.count_likes();

-- RLS
alter table board.profiles enable row level security;
alter table board.posts    enable row level security;
alter table board.comments enable row level security;
alter table board.likes    enable row level security;
alter table board.reports  enable row level security;

drop policy if exists "profiles read" on board.profiles;
create policy "profiles read" on board.profiles for select using (true);
drop policy if exists "profiles self insert" on board.profiles;
create policy "profiles self insert" on board.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles self update" on board.profiles;
create policy "profiles self update" on board.profiles for update using (id = auth.uid() or board.is_admin());
-- 일반 유저는 자기 is_admin / banned 를 못 바꾼다 (정책 안에서 profiles 를 다시 읽으면 재귀가 나서 트리거로 막음)
create or replace function board.profiles_guard() returns trigger language plpgsql security definer set search_path=board as
$$ begin
  if auth.uid() is not null and not board.is_admin() then
    if tg_op = 'INSERT' then new.is_admin := false; new.banned := false;
    else new.is_admin := old.is_admin; new.banned := old.banned; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on board.profiles;
create trigger profiles_guard before insert or update on board.profiles for each row execute function board.profiles_guard();

drop policy if exists "posts read" on board.posts;
create policy "posts read" on board.posts for select using (not hidden or author = auth.uid() or board.is_admin());
drop policy if exists "posts insert" on board.posts;
create policy "posts insert" on board.posts for insert with check (author = auth.uid() and board.can_write());
drop policy if exists "posts update" on board.posts;
create policy "posts update" on board.posts for update using (author = auth.uid() or board.is_admin());
drop policy if exists "posts delete" on board.posts;
create policy "posts delete" on board.posts for delete using (author = auth.uid() or board.is_admin());

drop policy if exists "comments read" on board.comments;
create policy "comments read" on board.comments for select using (not hidden or author = auth.uid() or board.is_admin());
drop policy if exists "comments insert" on board.comments;
create policy "comments insert" on board.comments for insert with check (author = auth.uid() and board.can_write());
drop policy if exists "comments update" on board.comments;
create policy "comments update" on board.comments for update using (author = auth.uid() or board.is_admin());
drop policy if exists "comments delete" on board.comments;
create policy "comments delete" on board.comments for delete using (author = auth.uid() or board.is_admin());

drop policy if exists "likes read" on board.likes;
create policy "likes read" on board.likes for select using (true);
drop policy if exists "likes mine" on board.likes;
create policy "likes mine" on board.likes for insert with check (user_id = auth.uid() and board.can_write());
drop policy if exists "likes unmine" on board.likes;
create policy "likes unmine" on board.likes for delete using (user_id = auth.uid());

drop policy if exists "reports insert" on board.reports;
create policy "reports insert" on board.reports for insert with check (reporter = auth.uid());
drop policy if exists "reports admin" on board.reports;
create policy "reports admin" on board.reports for select using (board.is_admin());

-- 이미지 (팬아트·공략·버그 스샷) — 공개 읽기, 본인 폴더에만 업로드, 5MB, 이미지 형식만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apgames-board','apgames-board', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "apgames board img read" on storage.objects;
create policy "apgames board img read" on storage.objects for select using (bucket_id = 'apgames-board');
drop policy if exists "apgames board img upload" on storage.objects;
create policy "apgames board img upload" on storage.objects for insert with check (bucket_id = 'apgames-board' and (storage.foldername(name))[1] = auth.uid()::text and board.can_write());
drop policy if exists "apgames board img delete" on storage.objects;
create policy "apgames board img delete" on storage.objects for delete using (bucket_id = 'apgames-board' and ((storage.foldername(name))[1] = auth.uid()::text or board.is_admin()));

-- API 권한 (board 스키마를 Data API 에 노출: 대시보드 Settings → API → Exposed schemas 에 board 추가)
grant usage on schema board to anon, authenticated;
grant select on all tables in schema board to anon, authenticated;
grant insert, update, delete on all tables in schema board to authenticated;
grant usage, select on all sequences in schema board to authenticated;
grant execute on all functions in schema board to anon, authenticated;
revoke insert, update, delete on board.reports from anon;

-- 관리자 지정: 대표가 처음 로그인하고 닉네임을 정한 뒤 아래 한 줄 실행 (이메일은 대표 계정)
-- update board.profiles set is_admin = true where id = (select id from auth.users where email = '대표 로그인 이메일');
