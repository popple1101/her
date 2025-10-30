-- -- =========================================================
-- -- create_table.sql (Naver OAuth / Admin Bypass 포함 버전)
-- -- =========================================================

-- -- 0) 확장 --------------------------------------------------------------------
-- create extension if not exists "pgcrypto";  -- gen_random_uuid()


-- -- 1) 계정 영역 ---------------------------------------------------------------

-- -- 1-0. 관리자 화이트리스트
-- --   - 여기에 등록된 naver_id 는 성별 무관하게 로그인 허용(테스트/운영 관리자)
-- create table if not exists admin_whitelist (
--   naver_id    text primary key,
--   note        text,
--   added_at    timestamptz not null default now()
-- );

-- -- 1-1. 정식 유저 (네이버 로그인용)
-- --   - role: 'admin' | 'user'
-- --   - 관리자 로그인 시 gender 검증 건너뛰고 gender_verified=true 로 저장 가능
-- do $$
-- begin
--   if not exists (select 1 from pg_type where typname = 'user_role') then
--     create type user_role as enum ('admin','user');
--   end if;
-- end $$;

-- create table if not exists app_users (
--   id               uuid primary key default gen_random_uuid(),
--   naver_id         text unique,                          -- 네이버 고유 ID
--   email            text,
--   nickname         text,
--   avatar_url       text,
--   gender           text check (gender in ('male','female')),
--   gender_verified  boolean not null default false,
--   role             user_role not null default 'user',    -- ✅ 관리자 구분
--   created_at       timestamptz not null default now(),
--   last_login_at    timestamptz
-- );

-- create index if not exists idx_app_users_created_at on app_users(created_at desc);

-- -- 1-2. 게스트 세션 (로그인 전 글/댓글 작성 등 임시 식별자)
-- create table if not exists guest_sessions (
--   guest_id         uuid primary key,                     -- 앱에서 만든 UUID 저장
--   created_at       timestamptz not null default now()
-- );


-- -- 2) 커뮤니티 영역 -----------------------------------------------------------

-- -- 2-1. 게시글
-- create table if not exists community_posts (
--   id               uuid primary key default gen_random_uuid(),
--   title            text not null check (length(title) between 2 and 120),
--   body             text not null check (length(body) between 2 and 8000),
--   tags             text[] not null default '{}',
--   like_count       integer not null default 0,
--   comment_count    integer not null default 0,
--   hot_score        numeric not null default 0,           -- 인기 정렬용
--   is_shadow        boolean not null default false,       -- 섀도 포스팅(본인만 보임)
--   author_guest_id  uuid,
--   author_user_id   uuid,
--   created_at       timestamptz not null default now(),
--   updated_at       timestamptz
-- );

-- alter table community_posts
--   add constraint fk_posts_author_guest
--   foreign key (author_guest_id) references guest_sessions(guest_id) on delete set null;

-- alter table community_posts
--   add constraint fk_posts_author_user
--   foreign key (author_user_id) references app_users(id) on delete set null;

-- create index if not exists idx_posts_created_at on community_posts(created_at desc);
-- create index if not exists idx_posts_hot on community_posts(hot_score desc);
-- create index if not exists idx_posts_tags on community_posts using gin (tags);

-- -- 2-2. 댓글
-- create table if not exists community_comments (
--   id               uuid primary key default gen_random_uuid(),
--   post_id          uuid not null references community_posts(id) on delete cascade,
--   body             text not null check (length(body) between 1 and 4000),
--   author_guest_id  uuid,
--   author_user_id   uuid,
--   is_shadow        boolean not null default false,
--   created_at       timestamptz not null default now()
-- );

-- alter table community_comments
--   add constraint fk_comments_author_guest
--   foreign key (author_guest_id) references guest_sessions(guest_id) on delete set null;

-- alter table community_comments
--   add constraint fk_comments_author_user
--   foreign key (author_user_id) references app_users(id) on delete set null;

-- create index if not exists idx_comments_post_created
--   on community_comments(post_id, created_at asc);


-- -- 3) 번개/모임 ---------------------------------------------------------------

-- -- 3-1. 모임
-- create table if not exists meetups (
--   id                uuid primary key default gen_random_uuid(),
--   title             text not null check (length(title) between 2 and 80),
--   region_code       text not null,                        -- 예: 'SEOUL-MAPO'
--   spot_text         text not null,                        -- 장소 설명
--   starts_at         timestamptz not null,
--   slots             smallint not null check (slots between 2 and 12),
--   participants_count integer not null default 0,
--   is_full           boolean not null default false,
--   pinned_until      timestamptz,                          -- 상단 고정/부스팅 만료
--   host_guest_id     uuid,
--   host_user_id      uuid,
--   created_at        timestamptz not null default now()
-- );

-- alter table meetups
--   add constraint fk_meetups_host_guest
--   foreign key (host_guest_id) references guest_sessions(guest_id) on delete set null;

-- alter table meetups
--   add constraint fk_meetups_host_user
--   foreign key (host_user_id) references app_users(id) on delete set null;

-- create index if not exists idx_meetups_time on meetups(starts_at asc);
-- create index if not exists idx_meetups_region_time on meetups(region_code, starts_at asc);
-- create index if not exists idx_meetups_pinned on meetups(pinned_until desc nulls last);

-- -- 3-2. 참가자
-- do $$
-- begin
--   if not exists (select 1 from pg_type where typname = 'meetup_status') then
--     create type meetup_status as enum ('joined','canceled','attended','no_show');
--   end if;
-- end $$;

-- create table if not exists meetup_participants (
--   meetup_id         uuid not null references meetups(id) on delete cascade,
--   guest_id          uuid,
--   user_id           uuid,
--   status            meetup_status not null default 'joined',
--   joined_at         timestamptz not null default now(),
--   primary key (meetup_id, guest_id, user_id)
-- );

-- create index if not exists idx_meetup_participants_meetup
--   on meetup_participants(meetup_id);


-- -- 4) 신고/모더레이션 ---------------------------------------------------------

-- do $$
-- begin
--   if not exists (select 1 from pg_type where typname = 'report_target') then
--     create type report_target as enum ('post','comment','user','meetup');
--   end if;
-- end $$;

-- create table if not exists abuse_reports (
--   id                uuid primary key default gen_random_uuid(),
--   target_type       report_target not null,
--   target_id         uuid not null,
--   reason_code       smallint not null,                    -- 1=비방, 2=성적, 3=스팸, 4=금전, ...
--   details           text,
--   reporter_guest_id uuid,
--   reporter_user_id  uuid,
--   created_at        timestamptz not null default now(),
--   handled           boolean not null default false,
--   handled_at        timestamptz
-- );

-- create index if not exists idx_reports_target
--   on abuse_reports(target_type, target_id);
-- create index if not exists idx_reports_created
--   on abuse_reports(created_at desc);
