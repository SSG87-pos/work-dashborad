# FastAPI + PostgreSQL Backend Spec

작성 기준일: 2026-06-09

이 문서는 `연구기획그룹-전략` 대시보드를 Docker 없는 회사 내부망에서 운영하기 위한 실제 구현 기준입니다. 기존 Supabase 설계와 마이그레이션은 데이터 모델 참고 자료로 유지하되, 새 운영 목표는 `FastAPI + PostgreSQL`입니다.

## 1. 결론

회사 백엔드 환경에서 Supabase Docker 구성을 설치할 수 없다면 self-hosted Supabase를 억지로 맞추지 않습니다.

새 기준:

```text
React/Vite Dashboard
  -> REST API
FastAPI Backend
  -> SQLAlchemy or SQLModel
PostgreSQL
```

현재 시점에서 실시간 기능은 제외합니다. 여러 사용자가 같은 데이터를 저장하고 다시 조회할 수 있으면 충분합니다. 실시간 커서, 동시 편집 충돌 처리, 변경 이력 스트리밍, 즉시 알림은 운영 안정화 이후 WebSocket 또는 SSE로 확장합니다.

## 2. 구현 원칙

- 프론트엔드 UI는 유지합니다.
- `src/storage.js`를 저장 경계로 보고, 새 `apiDashboardStore` 또는 동일 역할의 API 어댑터를 추가합니다.
- 화면 컴포넌트에서 직접 `fetch`를 흩뿌리지 않습니다.
- PostgreSQL은 직접 설치된 DB를 사용합니다.
- FastAPI는 Python 가상환경과 `systemd`로 운영합니다.
- 권한은 Supabase RLS 대신 FastAPI 서비스 계층에서 검사합니다.
- DB는 감사 추적과 보고서 생성을 위해 정규화된 relational schema를 사용합니다.
- JSON export/import는 운영 백업/초기 이관 도구로 유지합니다.

## 3. 개발 및 운영 구성

### 3.1 권장 프로세스

```text
회사 리눅스 서버
  PostgreSQL 15+
  Python 3.11+
  FastAPI app
  systemd service

사용자 브라우저
  내부 주소의 React/Vite build 또는 dev preview
  API base URL: http://<server-ip>:<api-port>/api/v1
```

### 3.2 권장 포트

| 용도 | 예시 | 설명 |
| --- | --- | --- |
| Frontend dev/demo | `10097` | 현재 회사 데모 포트와 맞춤 |
| FastAPI | `18080` | 내부 API 서버 |
| PostgreSQL | `5432` | 서버 로컬 접속만 권장 |

PostgreSQL은 가능하면 외부 PC에서 직접 접속하지 않게 하고, FastAPI만 내부망에 노출합니다.

### 3.3 환경 변수

FastAPI 서버 `.env` 예시:

```bash
APP_ENV=company
APP_NAME=work-dashboard-api
API_HOST=0.0.0.0
API_PORT=18080

DATABASE_URL=postgresql+psycopg://work_dashboard_user:CHANGE_ME@127.0.0.1:5432/work_dashboard

JWT_SECRET=CHANGE_TO_LONG_RANDOM_VALUE_AT_LEAST_32_BYTES
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14

CORS_ORIGINS=http://localhost:10097,http://127.0.0.1:10097,http://<company-server-ip>:10097
FIRST_ADMIN_EMAIL=seulgis@posco.com
```

프론트엔드 `.env.local` 예시:

```bash
VITE_API_BASE_URL=http://<company-server-ip>:18080/api/v1
```

`VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`는 새 운영 기준에서는 사용하지 않습니다.

### 3.4 Git branch 기준

FastAPI/PostgreSQL 운영 작업 기준 브랜치:

```text
release/company-fastapi-postgres
```

회사 PC에서 새로 받을 때:

```bash
git clone -b release/company-fastapi-postgres https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
pnpm install
```

기존 `release/company-self-hosted` 브랜치는 Supabase/self-hosted 검토 이력으로 남깁니다. Docker 기반 Supabase 설치가 다시 가능해지는 경우가 아니라면 새 backend 구현은 `release/company-fastapi-postgres`에서 이어갑니다.

## 4. 인증과 권한

### 4.1 첫 구현 인증

초기에는 email/password 로그인을 권장합니다.

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- access token은 Bearer JWT
- refresh token은 DB에 해시로 저장하거나 httpOnly cookie로 운영

회사 SSO가 나중에 가능해지면 같은 `users` 프로필에 내부 계정 식별자를 연결합니다.

### 4.2 역할

| 역할 | 의미 |
| --- | --- |
| `admin` | 사용자, 태그, 업무흐름, 게시글 유형, 전체 업무 관리 |
| `lead` | 팀 업무 배정/수정, 보고서/보관함 관리 |
| `member` | 본인 업무 관리, 팀 업무 조회, 업데이트/노트 작성 |

### 4.3 권한 검사 위치

권한은 FastAPI 서비스 함수에서 검사합니다.

예:

- 업무 수정: 담당자, 작성자, lead, admin만 가능
- 업데이트 로그 작성: 볼 수 있는 팀 업무라면 가능
- 업데이트 로그 수정/삭제: 작성자 또는 업무 관리자
- 업무 노트 수정/삭제: 작성자 또는 업무 관리자
- 개인 업무 인박스: owner 본인 또는 admin만 조회
- 팀 체크: 활성 사용자 전체 조회, 완료/삭제 가능 범위는 정책으로 제한
- 관리자 화면: admin만 가능

## 5. PostgreSQL Schema

아래 DDL은 첫 구현 기준입니다. 실제 Alembic migration에서는 enum/type 생성과 table 생성 순서를 나누어 작성합니다.

### 5.1 공통 타입

```sql
create extension if not exists pgcrypto;

create type permission_role as enum ('admin', 'lead', 'member');
create type task_status as enum ('검토/대기', '계획', '진행중', '완료', '보류');
create type task_priority as enum ('높음', '보통', '낮음');
create type task_work_kind as enum ('standard', 'spot');
create type assigner_type as enum ('원장님', '소장님', '그룹장님', '팀장님', '개인', '기타');
create type change_type as enum ('status', 'due_date', 'archive', 'delete', 'recurring');
create type calendar_scope as enum ('team', 'personal');
```

### 5.2 users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  name text not null,
  title text not null default '',
  team text not null default '연구기획그룹-전략',
  profile_emoji text not null default '👤',
  permission_role permission_role not null default 'member',
  is_team_member boolean not null default true,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_active_idx on users (is_active);
create index users_team_member_idx on users (is_team_member, is_active);
```

### 5.3 team_roster

```sql
create table team_roster (
  id uuid primary key default gen_random_uuid(),
  expected_email text unique,
  auth_user_id uuid references users(id) on delete set null,
  name text not null,
  title text not null default '',
  profile_emoji text not null default '👤',
  permission_role permission_role not null default 'member',
  is_team_member boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_roster_auth_user_idx on team_roster (auth_user_id);
create index team_roster_visible_idx on team_roster (is_team_member, is_active);
```

### 5.4 tasks

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  workstream text,
  owner_id uuid references users(id) on delete set null,
  owner_roster_id uuid references team_roster(id) on delete set null,
  assigner_type assigner_type not null default '개인',
  assigner_id uuid references users(id) on delete set null,
  assigner_roster_id uuid references team_roster(id) on delete set null,
  creator_id uuid references users(id) on delete set null,
  creator_roster_id uuid references team_roster(id) on delete set null,
  status task_status not null default '계획',
  priority task_priority not null default '보통',
  work_kind task_work_kind not null default 'standard',
  start_date date not null,
  due_date date not null,
  completed_at date,
  completed_by uuid references users(id) on delete set null,
  progress_before_complete integer,
  progress integer not null default 0 check (progress between 0 and 100),
  archived_at timestamptz,
  archived_by uuid references users(id) on delete set null,
  recurring_template_id uuid,
  recurring_frequency text,
  recurring_interval integer,
  recurring_weekdays integer[],
  recurring_start_date date,
  recurring_end_date date,
  recurring_no_end boolean not null default false,
  recurring_rule_detail text,
  recurring_duration_days integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_owner_required check (owner_id is not null or owner_roster_id is not null)
);

create index tasks_owner_idx on tasks (owner_id);
create index tasks_owner_roster_idx on tasks (owner_roster_id);
create index tasks_status_idx on tasks (status);
create index tasks_due_idx on tasks (due_date);
create index tasks_workstream_idx on tasks (workstream);
create index tasks_archived_idx on tasks (archived_at);
create index tasks_kind_idx on tasks (work_kind);
```

### 5.5 subtasks

```sql
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references users(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subtasks_task_order_idx on subtasks (task_id, sort_order);
```

### 5.6 task_change_history

```sql
create table task_change_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  change_type change_type not null,
  from_value text,
  to_value text not null,
  actor_id uuid references users(id) on delete set null,
  actor_roster_id uuid references team_roster(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index task_change_history_task_created_idx on task_change_history (task_id, created_at desc);
```

### 5.7 task_updates

```sql
create table task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  author_roster_id uuid references team_roster(id) on delete set null,
  body text not null,
  update_type text not null default 'note',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_updates_task_created_idx on task_updates (task_id, created_at desc);
create index task_updates_author_idx on task_updates (author_id);
```

### 5.8 task_links

```sql
create table task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  url text not null,
  link_type text not null default '링크',
  created_at timestamptz not null default now()
);

create index task_links_task_idx on task_links (task_id);
```

### 5.9 tags and task_tags

```sql
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tone text not null default 'slate',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create index task_tags_tag_idx on task_tags (tag_id);
```

### 5.10 calendar_events

```sql
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_date date,
  end_date date,
  scope calendar_scope not null default 'team',
  owner_id uuid references users(id) on delete cascade,
  owner_roster_id uuid references team_roster(id) on delete set null,
  note text not null default '',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_event_owner_required check (scope = 'team' or owner_id is not null or owner_roster_id is not null)
);

create index calendar_events_date_idx on calendar_events (event_date);
create index calendar_events_owner_idx on calendar_events (owner_id);
```

### 5.11 task_post_categories and task_posts

```sql
create table task_post_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null unique,
  tone text not null default 'slate',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_posts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  category_id uuid references task_post_categories(id) on delete set null,
  scope text not null,
  title text not null,
  body text not null,
  url text,
  attachment jsonb,
  author_id uuid references users(id) on delete set null,
  author_roster_id uuid references team_roster(id) on delete set null,
  posted_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_posts_task_created_idx on task_posts (task_id, created_at desc);
create index task_posts_author_idx on task_posts (author_id);
create index task_posts_category_idx on task_posts (category_id);
```

초기 게시글 유형:

```sql
insert into task_post_categories (key, label, tone, sort_order) values
  ('decision', '결정사항', 'blue', 10),
  ('memory', '기억할 점', 'green', 20),
  ('risk', '리스크', 'red', 30),
  ('meeting', '회의록', 'slate', 40),
  ('important_doc', '중요문서', 'violet', 50),
  ('reference', '참고자료', 'slate', 60),
  ('next_check', '다음 확인', 'amber', 70);
```

### 5.12 briefing_items

```sql
create table briefing_items (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('my', 'team')),
  kind text not null check (kind in ('inbox', 'todo')),
  item_type text not null default 'note',
  title text not null,
  body text not null default '',
  url text,
  status text not null default 'new',
  done boolean not null default false,
  owner_id uuid references users(id) on delete cascade,
  owner_roster_id uuid references team_roster(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  author_id uuid references users(id) on delete set null,
  author_roster_id uuid references team_roster(id) on delete set null,
  created_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint my_inbox_owner_required check (scope = 'team' or owner_id is not null or owner_roster_id is not null)
);

create index briefing_items_scope_created_idx on briefing_items (scope, created_at desc);
create index briefing_items_owner_created_idx on briefing_items (owner_id, created_at desc);
create index briefing_items_owner_roster_created_idx on briefing_items (owner_roster_id, created_at desc);
```

### 5.13 canvas_tabs, canvas_nodes, canvas_links

```sql
create table canvas_tabs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table canvas_nodes (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references canvas_tabs(id) on delete cascade,
  client_node_id text not null,
  title text not null,
  body text not null default '',
  template text not null default 'memo',
  parent_client_node_id text,
  data jsonb not null default '{}'::jsonb,
  x integer not null default 0,
  y integer not null default 0,
  sort_order integer not null default 0,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tab_id, client_node_id),
  constraint canvas_nodes_data_object check (jsonb_typeof(data) = 'object')
);

create table canvas_links (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references canvas_tabs(id) on delete cascade,
  client_link_id text not null,
  source_client_node_id text not null,
  target_client_node_id text not null,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tab_id, client_link_id)
);

create index canvas_nodes_tab_order_idx on canvas_nodes (tab_id, sort_order);
create index canvas_links_tab_idx on canvas_links (tab_id);
```

### 5.14 user_preferences

```sql
create table user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  active_page text,
  active_view text,
  selected_tag text,
  timeline_mode text,
  timeline_month text,
  timeline_year text,
  selected_task_id uuid,
  view_density text not null default 'default',
  updated_at timestamptz not null default now()
);
```

`attachment` is the compatibility field for pasted images and future file storage. Current supported JSON keys are `label`, `caption`, `imageDataUrl`, `fileName`, `mimeType`, `ocrText`, `visionSummary`, and `source`. Company production should store the binary image in an internal file/object store and keep only a storage reference plus `ocrText`/`visionSummary` in this JSON. AI/HERmes/OpenAI must not rely on opening intranet URLs directly.

### 5.15 notifications

알림은 후속 기능입니다. DB 스키마는 미리 잡아둘 수 있지만 첫 운영 구현에서는 endpoint와 UI만 나중에 연결합니다.

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references users(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  task_id uuid references tasks(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  type text not null,
  severity text not null default 'normal',
  title text not null,
  body text not null,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

create index notifications_recipient_created_idx on notifications (recipient_user_id, created_at desc);
create index notifications_unread_idx on notifications (recipient_user_id, read_at) where read_at is null and dismissed_at is null;
```

## 6. FastAPI API Contract

모든 endpoint는 `/api/v1` 아래에 둡니다.

### 6.1 공통 응답

성공 목록 응답:

```json
{
  "items": [],
  "total": 0,
  "limit": 50,
  "offset": 0
}
```

에러 응답:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "details": [
      { "field": "title", "message": "제목은 필수입니다." }
    ]
  }
}
```

### 6.2 Auth

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | email/password 로그인 |
| POST | `/auth/refresh` | public/session | access token 재발급 |
| POST | `/auth/logout` | user | refresh/session 폐기 |
| GET | `/me` | user | 현재 사용자, roster, preference |
| PATCH | `/me/profile` | user | 본인 이름/이모지/표시 설정 수정 |
| PATCH | `/me/preferences` | user | 최근 화면/필터/넓게 보기 저장 |

### 6.3 Users and Roster

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/users` | user | 팀원 목록 |
| POST | `/users` | admin | 계정 생성 |
| PATCH | `/users/{user_id}` | admin | 역할/직책/활성 상태 수정 |
| GET | `/admin/roster` | admin | signup 전 팀원 row 목록 |
| POST | `/admin/roster` | admin | signup 전 팀원 row 생성 |
| PATCH | `/admin/roster/{roster_id}` | admin | 이름/직책/표시/예상 이메일 수정 |

### 6.4 Tasks

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/tasks` | user | 업무 목록. `scope`, `ownerId`, `status`, `tag`, `priority`, `spot`, `archived` 필터 |
| POST | `/tasks` | user | 업무 생성 |
| GET | `/tasks/{task_id}` | visible user | 업무 상세 |
| PATCH | `/tasks/{task_id}` | task manager | 제목, 설명, 기간, 담당, 태그, 업무흐름 등 수정 |
| PATCH | `/tasks/{task_id}/status` | task manager | 상태 변경 및 change history 생성 |
| PATCH | `/tasks/{task_id}/archive` | task manager | 보관/복원 |
| DELETE | `/tasks/{task_id}` | task manager | 삭제 또는 soft-delete 정책 적용 |
| POST | `/tasks/{task_id}/subtasks` | task manager | 체크리스트 추가 |
| PATCH | `/tasks/{task_id}/subtasks/{subtask_id}` | task manager | 체크/명칭/순서 수정 |
| DELETE | `/tasks/{task_id}/subtasks/{subtask_id}` | task manager | 체크리스트 삭제 |
| POST | `/tasks/{task_id}/updates` | visible user | 업데이트 로그 작성 |
| PATCH | `/tasks/{task_id}/updates/{update_id}` | author or manager | 업데이트 본문 수정 |
| DELETE | `/tasks/{task_id}/updates/{update_id}` | author or manager | 업데이트 삭제 |
| PATCH | `/tasks/{task_id}/history/{history_id}` | manager | 변경이력 note 수정 |
| DELETE | `/tasks/{task_id}/history/{history_id}` | manager | 변경이력 row 삭제 |
| POST | `/tasks/{task_id}/links` | manager | 관련 링크 추가 |
| DELETE | `/tasks/{task_id}/links/{link_id}` | manager | 관련 링크 삭제 |

### 6.5 Tags and Workstreams

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/tags` | user | 태그 목록 |
| POST | `/tags` | user | 태그 추가 |
| PATCH | `/tags/{tag_id}` | admin | 태그명/톤 수정 |
| DELETE | `/tags/{tag_id}` | admin | 태그 삭제 또는 비활성 |
| GET | `/workstreams` | user | 업무흐름 목록과 포함 업무 수 |
| PATCH | `/workstreams/{name}` | admin | 업무흐름 rename/merge |

업무흐름은 별도 테이블 없이 `tasks.workstream` 기반으로 시작할 수 있습니다. 여러 그룹 확장 시 `workstreams` 테이블을 추가합니다.

### 6.6 Calendar

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/calendar/events` | user | 팀/개인 일정 조회 |
| POST | `/calendar/events` | user | 일정 생성 |
| PATCH | `/calendar/events/{event_id}` | owner/creator/lead/admin | 일정 수정 |
| DELETE | `/calendar/events/{event_id}` | owner/creator/lead/admin | 일정 삭제 |

### 6.7 Task Posts

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/post-categories` | user | 활성/관리용 게시글 유형 |
| POST | `/post-categories` | admin | 유형 추가 |
| PATCH | `/post-categories/{category_id}` | admin | 유형명/톤/활성 수정 |
| GET | `/tasks/{task_id}/posts` | visible user | 선택 업무의 업무 노트 |
| POST | `/tasks/{task_id}/posts` | visible user | 업무 노트 작성 |
| PATCH | `/tasks/{task_id}/posts/{post_id}` | author or manager | 노트 수정 |
| DELETE | `/tasks/{task_id}/posts/{post_id}` | author or manager | 노트 삭제 |
| GET | `/post-rollups/workstreams` | user | Highlights 업무흐름별 게시글 모음 |

### 6.8 Briefing Items

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/briefing-items` | user | My Desk 개인 인박스 또는 Team Check 조회 |
| POST | `/briefing-items` | user | 인박스/팀체크 작성 |
| PATCH | `/briefing-items/{item_id}` | owner/author/team policy | 상태, 완료, 본문 수정 |
| DELETE | `/briefing-items/{item_id}` | owner/author/team policy | 삭제 |

쿼리 예시:

```text
GET /api/v1/briefing-items?scope=my&ownerId=<user-id>
GET /api/v1/briefing-items?scope=team
```

### 6.9 Canvas

첫 구현은 전체 tab snapshot 저장으로 시작해도 됩니다.

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/canvas/tabs` | user | Canvas tab/node/link 전체 조회 |
| PUT | `/canvas/tabs/{tab_id}/snapshot` | user | 선택 tab의 nodes/links 전체 저장 |
| POST | `/canvas/tabs` | user | tab 추가 |
| PATCH | `/canvas/tabs/{tab_id}` | user | tab 제목/정렬 수정 |
| DELETE | `/canvas/tabs/{tab_id}` | user/admin policy | tab 삭제 |

나중에 동시 편집을 넣을 때는 node/link 단위 PATCH와 `version` 충돌 검사를 추가합니다.

### 6.10 Reports

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/reports/performance` | user | 주간/월간/분기/년간 업무실적 근거 조회 |
| POST | `/reports/performance/snapshots` | lead/admin | 보고용 snapshot 저장 |
| GET | `/reports/performance/snapshots/{snapshot_id}` | visible user | 저장된 보고서 조회 |

### 6.11 AI Read API

LLM/HERmes 연결 전용 read-only endpoint입니다.

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/ai/read/person-work-status` | user | 담당자별 진행 근거 |
| GET | `/ai/read/topic-search` | user | 주제/문서/이슈 검색 근거 |
| GET | `/ai/read/workstream-issues` | user | 업무흐름별 진행/리스크 |
| GET | `/ai/read/recent-updates` | user | 기간/담당/태그/상태 기준 최근 업데이트 근거 |
| GET | `/ai/read/report-evidence` | user | 보고서 초안 근거 묶음 |

개인 인박스와 개인 일정은 기본 제외합니다. 사용자가 명시적으로 자기 데이터를 포함 요청한 경우에만 포함합니다.

Status 2026-06-26: Phase 1 FastAPI read endpoints are implemented. They return deterministic evidence bundles only; OpenAI/HERmes tool calling and AI write-back remain later phases.

### 6.12 AI Wiki API

LLM-Wiki knowledge layer endpoint입니다. 대시보드 DB를 원천으로 유지하고, Wiki는 출처 링크와 revision이 있는 agent-readable 정리 레이어로 사용합니다.

| Method | Path | 권한 | 설명 |
| --- | --- | --- | --- |
| GET | `/ai/wiki/search` | user | 읽을 수 있는 Wiki page 검색 |
| GET | `/ai/wiki/pages/{page_id}` | user | Wiki page 본문, revision, source, link 조회 |
| GET | `/ai/wiki/pages/{page_id}/links` | user | page 간 typed link 따라가기 |
| GET | `/ai/wiki/pages/{page_id}/sources` | user | task/update/post source link와 stale flag 조회 |
| POST | `/ai/wiki/drafts` | user | 수동 또는 future AI Wiki draft 생성 |
| POST | `/ai/wiki/drafts/from-dashboard` | user | dashboard task/update/post 기준 deterministic Wiki draft 생성 |
| POST | `/ai/wiki/drafts/{draft_id}/approve` | admin | pending draft를 page/revision/source link로 발행 |
| POST | `/ai/wiki/error-book` | user | 틀리거나 부족한 답변 correction 기록 |

Status 2026-06-26: Phase 1 FastAPI endpoints and migration `20260625_0011_llm_wiki.py` are implemented. OpenAI/HERmes/MCP wrapping and frontend Wiki controls remain later phases.

## 7. FastAPI Project Structure

권장 backend 폴더:

```text
backend/
  pyproject.toml
  alembic.ini
  app/
    main.py
    core/
      config.py
      security.py
      errors.py
    db/
      session.py
      base.py
    models/
      user.py
      task.py
      calendar.py
      canvas.py
      briefing.py
      notification.py
    schemas/
      auth.py
      user.py
      task.py
      calendar.py
      canvas.py
      briefing.py
    services/
      permissions.py
      tasks.py
      reports.py
      auth.py
    api/
      deps.py
      routes_auth.py
      routes_users.py
      routes_tasks.py
      routes_calendar.py
      routes_posts.py
      routes_briefing.py
      routes_canvas.py
      routes_reports.py
    tests/
      test_auth.py
      test_tasks_permissions.py
  alembic/
    env.py
    versions/
```

권장 라이브러리:

```text
fastapi
uvicorn[standard]
sqlalchemy
alembic
psycopg[binary]
pydantic-settings
python-jose[cryptography] 또는 pyjwt
passlib[bcrypt]
python-multipart
pytest
httpx
```

## 8. Implementation Order

### Phase 0. 문서 기준 전환

- 이 문서를 기준 문서로 지정
- `docs/backend-api-spec.md`와 `docs/data-model.md`는 이 문서와 같은 의미로 유지
- Supabase 문서는 이전 경로/참고 자료로 분리

### Phase 1. Backend Skeleton

- `backend/` 생성
- FastAPI health check
- PostgreSQL 연결
- Alembic 초기화
- `users`, `team_roster` migration
- seed first admin

Status 2026-06-25: implemented as the initial `backend/` skeleton. It includes `/api/v1/health`, `/api/v1/health/db`, SQLAlchemy session config, Alembic, `users`/`team_roster`, `.env.example`, and `work-dashboard-api seed-first-admin`.

검증:

```bash
curl http://127.0.0.1:18080/api/v1/health
```

### Phase 2. Auth and Roster

- login/logout/me
- JWT 발급
- admin-only roster/user management
- frontend login boundary 연결

Status 2026-06-25: backend API foundation implemented for `POST /api/v1/auth/login`, JWT access token issue/verify, `GET /api/v1/me`, and admin-only `GET/POST /api/v1/admin/roster`. Refresh/logout/session persistence and frontend login boundary wiring remain next.

### Phase 3. Core Tasks

- tasks/subtasks/tags/task_links
- 업무 생성/수정/상태 변경/보관
- change history 자동 생성
- board/list/timeline/calendar/performance가 API 데이터 사용

Status 2026-06-25: task API foundation implemented for `GET/POST/PATCH/DELETE /api/v1/tasks`, recurring rule persistence, future recurring instance cleanup, subtasks add/list/update, update logs add/list/edit/delete, tags add/list/edit/delete, tag groups save/list/delete, calendar events add/list/update/delete, task status history, history note edit/delete, archive/restore, and task related links add/list/delete. It covers task creation, list, status/progress updates, owner/creator links, manager-only update checks, change-history creation for status/archive operations, and task deletion. Live company PostgreSQL apply/smoke and deeper role-specific filtering remain next.

### Phase 4. Updates, Posts, Briefing

- task_updates
- task_posts + post categories
- briefing_items
- My Desk 개인 인박스 owner filter
- Team Flow team checklist

Status 2026-06-25: `briefing_items` backend foundation implemented for add/list/update so My Desk and Team Check can be smoke-tested against PostgreSQL. Task post categories add/list/edit/deactivate, task posts add/list/edit/delete, page memos, preferences, and Highlights workstream post rollups are also implemented. Frontend FastAPI data mode is implemented in `src/apiStore.js`.

### Phase 5. Canvas

- canvas_tabs/nodes/links
- tab snapshot save/load
- Markdown export는 프론트 유지

Status 2026-06-25: Canvas backend foundation implemented as `GET/PUT /api/v1/canvas/state` with `canvas_tabs`, `canvas_nodes`, and `canvas_links` tables. This is refresh-based shared state persistence, not realtime collaboration or conflict resolution.

### Phase 6. Reports and AI Readiness

- performance endpoint
- report evidence endpoint
- source ids/dates 포함
- LLM 호출은 여전히 후속

### Phase 7. Later Realtime

- notifications table
- bell badge polling first
- 필요 시 SSE/WebSocket
- Canvas conflict/version check

## 9. Frontend Integration Plan

현재 프론트엔드는 이미 store boundary가 있습니다.

권장 변경:

```text
src/storage.js
  localDashboardStore 유지

src/apiClient.js
  fetch wrapper, token handling, JSON error normalization

src/apiStore.js
  auth/read/write functions
  supabaseStore와 비슷한 shape 제공

src/App.jsx
  VITE_API_BASE_URL이 있으면 apiStore 사용
  없으면 localDashboardStore fallback
```

Status 2026-06-25: `src/apiStore.js` and `scripts/check-api-store.mjs` are implemented. The UI switches to FastAPI mode when `VITE_API_BASE_URL` is set and keeps local/Supabase fallback behavior when it is empty.

Supabase 관련 파일은 바로 삭제하지 않습니다. 내부망 전환이 안정화될 때까지 다음처럼 둡니다.

- `src/supabaseStore.js`: 이전 Supabase 경로 참고/비활성
- `supabase/migrations`: PostgreSQL schema 설계 참고 자료
- 새 FastAPI 운영에서는 `VITE_API_BASE_URL`만 사용

## 10. 운영 배포 개요

### 10.1 PostgreSQL

초보자용 전체 설치 절차와 `sudo` 대체 명령은 `docs/company-fastapi-postgres-beginner-runbook.md`를 우선 참고합니다. 회사 리눅스에서 `sudo`가 막혀 있으면 `ADMIN=gksudo`, `ADMIN=gsudo`, 또는 `ADMIN=pkexec`처럼 회사에서 허용한 관리자 권한 명령을 먼저 정한 뒤 아래 `$ADMIN` 자리에 사용합니다.

예시:

```bash
$ADMIN apt update
$ADMIN apt install postgresql postgresql-contrib
$ADMIN -u postgres createuser work_dashboard_user
$ADMIN -u postgres createdb work_dashboard
$ADMIN -u postgres psql
```

```sql
alter user work_dashboard_user with encrypted password 'CHANGE_ME';
grant all privileges on database work_dashboard to work_dashboard_user;
```

### 10.2 FastAPI

```bash
cd work-dashborad/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

### 10.3 systemd

예시 service:

```ini
[Unit]
Description=Work Dashboard FastAPI
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/work-dashborad/backend
EnvironmentFile=/opt/work-dashborad/backend/.env
ExecStart=/opt/work-dashborad/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 18080
Restart=always
User=workdash
Group=workdash

[Install]
WantedBy=multi-user.target
```

## 11. 검증 체크리스트

초기 API:

- `GET /api/v1/health` 성공
- admin login 성공
- `GET /api/v1/me`가 role/profile 반환
- admin이 roster 생성 가능

업무:

- 업무 생성 후 다른 브라우저에서 조회 가능
- 상태 변경 후 변경이력 생성
- 체크리스트 완료율 반영
- 보관 업무가 기본 board에서 숨김
- 업무 관련 링크 작성/조회/삭제
- 업무 노트 유형과 업무 노트 작성/조회
- 스팟 업무가 주간/월간 포함, 분기/년간 요약 기본 제외

게시글/브리핑:

- 업무 노트 작성/조회
- 업무 노트 수정/삭제
- Highlights 업무흐름별 게시글 모음 조회
- My Desk 업무 인박스가 사람별로 분리
- Team Check는 팀 공유

권한:

- member는 남의 개인 인박스 조회 불가
- member는 남의 업무 metadata 수정 불가
- update/post 작성자는 자기 row 수정/삭제 가능
- admin은 관리자 화면 접근 가능

브라우저:

- 새로고침 후 데이터 유지
- 다른 PC/브라우저에서 같은 데이터 조회
- API 장애 시 사용자에게 저장 실패 안내

## 12. Supabase 자료의 위치

이제 Supabase는 운영 기준이 아니라 참고 자료입니다.

유지할 것:

- `supabase/migrations/*.sql`: 이미 고민한 table/permission 설계 참고
- `docs/local-linux-supabase-runbook.md`: 이전 검토 이력
- `docs/company-self-hosted-supabase-guide.md`: Docker가 가능한 환경일 때의 대안 이력

새 구현에서 우선 읽을 것:

1. `docs/fastapi-postgres-backend-spec.md`
2. `docs/backend-api-spec.md`
3. `docs/data-model.md`
4. `docs/permission-rules.md`
5. `docs/ai-agent-readiness.md`

## 13. 후속 Codex 작업 프롬프트

FastAPI 백엔드 구현을 시작할 때 Codex에게 이렇게 요청하면 됩니다.

```text
이 폴더의 AGENTS.md, HANDOFF.md, TODO.md, docs/fastapi-postgres-backend-spec.md, docs/company-fastapi-postgres-beginner-runbook.md를 먼저 읽고 진행해줘.
현재 FastAPI + PostgreSQL backend는 health/auth/roster/profile/tasks/subtasks/updates/tags/tag groups/calendar/preferences/memos/briefing/task lifecycle/posts/post rollup/Canvas state와 VITE_API_BASE_URL 기반 frontend apiStore까지 구현되어 있어.
다음은 회사 PostgreSQL 실서버에서 alembic upgrade head와 curl smoke를 실행하고, 실제 회사 URL에서 브라우저 QA와 역할별 필터/운영 보안 점검을 우선순위대로 이어가줘.
```
