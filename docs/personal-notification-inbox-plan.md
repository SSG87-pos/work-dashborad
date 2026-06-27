# Personal Notification Inbox Plan

작성 기준일: 2026-06-09

이 문서는 회사 내부 backend 연결 이후에 구현하는 `개인별 알림함` 기준입니다. 현재 승인된 backend 경로는 `FastAPI + PostgreSQL`입니다. Phase 1은 구현되어 있으며, DB에 저장되는 개인별 읽음/안읽음 알림함, 상단 종 아이콘 badge, 알림 패널, 읽음/전체 읽음, 업무 상세 이동을 포함합니다.

후속 Codex 작업을 시작할 때는 이 문서를 먼저 읽고, 아래의 남은 범위를 기준으로 진행합니다.

## 구현 상태

2026-06-27 기준 Phase 1 구현 완료:

- `backend/alembic/versions/20260625_0012_notifications.py`: `notifications` 테이블과 인덱스
- `backend/app/api/routes_notifications.py`: 본인 알림 조회, 단건 읽음, 전체 읽음 API
- `backend/app/services/notifications.py`: 새 배정, 지연, 본인 업무의 로그/Note/risk Note 알림 생성
- `src/apiStore.js`: FastAPI notifications read/markRead/markAllRead 연결
- `src/App.jsx`, `src/styles.css`: 상단 종 icon badge, 알림 패널, 안읽음/전체 필터, 모두 읽음, row 클릭 시 업무 상세 이동

아직 남은 범위:

- 실제 회사 PostgreSQL 환경 apply/smoke
- dismiss/hide UI
- due today/due soon 알림 row 생성 여부 결정
- Teams/realtime/mobile push
- 사용자별 알림 설정

## 구현 시점

개인별 알림함은 바로 로컬 fallback에 얹는 기능보다 FastAPI/PostgreSQL 연결 이후에 구현하는 것이 좋습니다.

권장 선행 조건:

1. 회사 내부 FastAPI/PostgreSQL backend가 설치되어 있고 dashboard가 `.env.local`의 `VITE_API_BASE_URL`로 연결된다.
2. 실제 사용자 로스터와 로그인 계정이 연결되어 있다.
3. 업무, 업무 업데이트 로그, 업무 노트/게시글, 변경 이력 CRUD가 API/DB에서 정상 동작한다.
4. 최소 2명 이상의 계정으로 개인별 권한 검증을 할 수 있다.

이 기능은 `내가 봐야 하는 일`을 개인별로 보여주는 기능이므로, 실제 사용자 id와 API 권한 검사가 안정된 뒤에 넣어야 의미가 있습니다.

## 목표

- 사용자가 본인이 꼭 한 번 더 확인해야 하는 신규 배정, 지연, 본인 업무의 로그/노트 이벤트를 한곳에서 확인한다.
- 상단 종 아이콘이 unread 상태를 시각적으로 알려준다.
- 알림을 클릭하면 관련 업무 상세로 이동한다.
- 읽음 상태가 DB에 저장되어 다른 PC/브라우저에서도 유지된다.
- Teams 연동은 나중에 높은 중요도 알림만 별도로 검토한다.

## 비목표

초기 구현에 포함하지 않습니다.

- 실시간 push 알림
- Teams 자동 발송
- 모바일 OS 푸시
- 알림 규칙을 사용자가 세밀하게 커스터마이즈하는 기능
- AI가 알림 중요도를 임의 판단하는 기능
- 다른 사람의 개인 알림함을 관리자가 상시 열람하는 기능

초기에는 dashboard 내부 알림함만 구현합니다.

## 제품 원칙

알림은 조용해야 합니다. 업무 dashboard의 알림은 채팅처럼 많이 울리는 기능이 아니라, 사용자가 놓치면 곤란한 변화만 모아주는 기능이어야 합니다.

원칙:

- 개인별: 본인에게 관련된 알림만 기본 표시한다.
- 실행 가능: 클릭하면 관련 업무 상세로 이동해야 한다.
- 중복 최소화: 같은 이벤트가 여러 번 쌓이지 않도록 한다.
- 고신호 우선: 모든 변경사항이 아니라 사용자가 다시 확인해야 하는 이벤트만 알림으로 만든다.
- 읽기 우선: 상단 종 아이콘과 알림 패널은 작고 조용하게 시작한다.
- 중요도 구분: 지연은 더 강하게, 본인 업무에 남겨진 일반 로그/노트는 차분하게 표시한다.
- 접근성: 흔들림/애니메이션은 1회성이고 `prefers-reduced-motion`을 존중한다.

## 현재 화면에서 이어질 위치

현재 App 상단의 `알림` 아이콘 버튼은 FastAPI mode에서 실제 알림함 트리거로 연결됩니다.

권장 UI:

- 기본 상태: 기존 종 아이콘 유지
- 안읽음 있음: 작은 파란 점 또는 숫자 badge
- 지연/리스크 있음: badge 또는 종 아이콘에 amber/red tone
- 새 알림 도착: 종 아이콘 1회 짧은 shake
- 클릭 시: 오른쪽 상단 dropdown 또는 side panel

알림 패널 구조:

- 상단: `알림`, `안읽음 N`, `모두 읽음`
- 필터: `안읽음`, `전체`
- 목록 row:
  - 유형 chip
  - 제목
  - 짧은 설명
  - 관련 업무명
  - 발생일시
  - actor 표시
- row 클릭:
  - 읽음 처리
  - 관련 업무 상세 열기
  - 가능하면 업데이트 로그/업무 노트 영역으로 스크롤

## 알림 유형

Phase 1은 단순한 개인 확인 알림만 구현합니다. 목표는 `사람별로 본인에게 해당하는 것`이 뜨는 것입니다.

| type | 의미 | recipient 기준 | severity |
| --- | --- | --- | --- |
| `task_assigned` | 새 업무가 나에게 배정됨 | 새 담당자 | `normal` |
| `task_overdue` | 내 업무의 마감일이 지남 | 현재 담당자 | `urgent` |
| `task_update_added` | 내 업무에 다른 사람이 업데이트 로그를 남김 | 현재 담당자 | `normal` |
| `task_post_added` | 내 업무에 다른 사람이 업무 Note/자료/의견을 남김 | 현재 담당자 | `normal` |
| `risk_added` | 내 업무에 리스크 성격의 Note가 남겨짐 | 현재 담당자 | `high` |

Phase 1에서 제외하거나 후순위로 둡니다.

- `task_due_today`, `task_due_soon`: 마감 임박 배지는 화면 계산 신호로 먼저 유지하고, 알림 row 생성은 지연 알림 안정화 후 검토합니다.
- `status_changed`: 상태 변경만으로는 너무 자주 울릴 수 있으므로 초기 알림에서는 제외합니다.
- `decision_needed`: 업무 Note 분류가 안정된 뒤 `high` 알림 후보로 검토합니다.
- `mention_added`: 나중에 본문 mention UI가 생긴 뒤 구현합니다.

## Supabase 테이블 초안

초기 테이블명은 `notifications`를 권장합니다.

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
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
  dismissed_at timestamptz,
  constraint notifications_source_type_check check (
    source_type in ('task', 'task_update', 'task_post', 'task_change_history', 'system')
  ),
  constraint notifications_type_check check (
    type in (
      'task_assigned',
      'task_overdue',
      'task_update_added',
      'task_post_added',
      'risk_added',
      'mention_added'
    )
  ),
  constraint notifications_severity_check check (
    severity in ('low', 'normal', 'high', 'urgent')
  )
);
```

주의:

- 실제 기존 `users.id`, `tasks.id` 타입이 `text`이면 migration에서는 그 타입에 맞춰야 합니다.
- Postgres는 `add constraint if not exists`를 지원하지 않으므로, 기존 migration 스타일처럼 필요하면 `do $$ begin ... end $$;`로 idempotent하게 작성합니다.
- 멀티그룹 확장 후에는 `workspace_id`를 추가하고 모든 조회/RLS/인덱스에 포함합니다. 자세한 기준은 `docs/multi-workspace-expansion-plan.md`를 따릅니다.

## 인덱스

알림함의 주요 조회는 `내 안읽음 최신순`, `내 전체 최신순`, `업무별 알림`입니다. 별도 단일 인덱스를 흩뿌리기보다 복합 인덱스를 먼저 둡니다.

권장 초기 인덱스:

```sql
create index notifications_recipient_unread_created_idx
on public.notifications (recipient_user_id, read_at, created_at desc);

create index notifications_recipient_created_idx
on public.notifications (recipient_user_id, created_at desc);

create index notifications_task_created_idx
on public.notifications (task_id, created_at desc)
where task_id is not null;

create unique index notifications_dedupe_source_idx
on public.notifications (recipient_user_id, type, source_type, source_id)
where source_id is not null;
```

멀티그룹 확장 이후:

```sql
create index notifications_workspace_recipient_unread_created_idx
on public.notifications (workspace_id, recipient_user_id, read_at, created_at desc);
```

## RLS 권한

알림은 DB 레벨에서 본인 것만 보여야 합니다. UI 필터만 믿으면 안 됩니다.

권장 정책:

- RLS enabled
- authenticated 사용자는 본인의 `recipient_user_id = auth.uid()` 알림만 `select`
- authenticated 사용자는 본인의 알림에 대해서만 `read_at`, `dismissed_at` 업데이트
- 일반 frontend는 알림 row를 직접 insert하지 않도록 시작한다.
- insert는 업무 저장 함수, trigger, server function, edge function, 또는 store boundary의 통제된 경로에서만 수행한다.

예시:

```sql
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

create policy notifications_update_own_read_state on public.notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

grant select on public.notifications to authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;
```

least privilege 기준:

- `anon`에는 권한을 주지 않습니다.
- `authenticated`에는 필요한 column update만 줍니다.
- 일반 사용자가 title/body/type/source를 임의 수정하지 못하게 합니다.
- 서비스 role key는 frontend에 절대 넣지 않습니다.

## 알림 생성 방식

초기에는 trigger보다 application store boundary에서 생성하는 편이 이해하기 쉽습니다. 이 프로젝트는 `src/storage.js`와 `src/supabaseStore.js`를 저장 경계로 쓰기 때문에, view component에서 직접 알림을 만들지 않습니다.

권장 단계:

### Phase 1: DB 알림함 MVP

- `notifications` migration 추가
- future `src/apiStore.js`에 notifications read/update API 추가
- 기존 업무 저장 흐름에서 명확한 이벤트만 알림 row 생성
  - 새 업무 배정
  - 내 업무 지연 발생
  - 내 업무에 다른 사람이 업데이트 로그 추가
  - 내 업무에 다른 사람이 업무 Note/자료/의견 추가
- 상단 종 아이콘과 알림 패널 구현
- 읽음 처리 구현

이 단계에서는 due today/due soon은 dashboard 조회 시 계산 배지로 유지하고, DB 알림 row는 `task_overdue`부터 시작합니다.

### Phase 2: 마감/지연 알림 안정화

- `task_due_today`, `task_due_soon`을 실제 알림 row로 만들지 여부 결정
- Phase 1의 `task_overdue`가 중복 생성되지 않도록 생성 주기와 기준일 정책 보강
- FastAPI/PostgreSQL 환경에서 scheduler, background job, 또는 앱 접속 시 생성 중 하나를 선택
- 중복 방지 기준 추가
  - 예: 같은 업무/같은 날짜/같은 type은 하루 1개만 생성

### Phase 3: Teams 연동 후보

- dashboard 내부 알림이 먼저 안정된 뒤 진행
- Teams 자동 발송은 모든 알림이 아니라 `urgent`, 일부 `high`만 후보
- 회사 관리자 승인, Teams app/Power Automate/Graph 권한 검토 필요
- Teams에는 상세 본문 대신 dashboard 업무 링크와 짧은 요약만 전송

## 중복 방지

같은 이벤트가 refresh나 재시도 때문에 여러 번 쌓이면 알림함의 신뢰도가 떨어집니다.

초기 dedupe 기준:

- update/post/history처럼 source row가 있는 이벤트:
  - `(recipient_user_id, type, source_type, source_id)` unique
- due/overdue처럼 source row가 task인 이벤트:
  - `metadata.notification_date` 또는 별도 `event_date` 도입 검토
  - 같은 `recipient_user_id + task_id + type + event_date` 1건

## 표시 대상자 규칙

업무별 기본 recipient:

- 업무 담당자: 항상 포함
- 업무 생성자: Phase 1 기본 알림 대상은 아님. 자신이 만든 업무라도 현재 담당자가 아니면 개인 알림을 받지 않는다.
- 팀장/관리자: 기본 알림 대상은 아님. 나중에 팀장 요약 알림으로 별도 설계
- update/post 작성자: 본인이 만든 이벤트는 기본적으로 본인에게 다시 알리지 않음

예외:

- `risk_added`는 현재 담당자에게만 먼저 알리고, creator/manager 확대는 운영 중 필요성이 확인되면 검토합니다.
- mention 기능이 생기면 언급된 사람은 담당자가 아니어도 recipient가 됨

## 프론트엔드 구현 기준

권장 파일:

- `src/apiStore.js`: notifications read, markRead, markAllRead 연결
- local fallback: 실제 알림함은 비활성/빈 상태로 유지
- `src/App.jsx`: top bell state, panel open/close, navigation to task detail
- `src/styles.css`: bell badge, panel, row, reduced-motion

view component에서 Supabase client를 직접 import하지 않습니다.

권장 상태 shape:

```js
{
  notifications: [],
  unreadNotificationCount: 0,
  urgentNotificationCount: 0
}
```

권장 store API:

```js
notifications: {
  read({ limit, unreadOnly }),
  markRead(notificationId),
  markAllRead(),
  createForTaskEvent(event)
}
```

local fallback에서는 알림함을 빈 상태로 유지합니다. 단, UI 개발 검증용 sample이 필요하면 demo-only seed를 명확히 분리합니다.

## UI 세부 기준

상단 종 아이콘:

- unread 0: 현재와 같은 조용한 아이콘
- unread 1 이상: count badge
- urgent 1 이상: red/rose 계열 point
- 새 알림 생성 직후: 1회 shake 또는 glow
- reduced motion: shake 없이 color/badge만 변경

알림 패널:

- dashboard 위에 떠야 하며 화면 전체 흐름을 밀지 않습니다.
- row 높이는 compact하게 유지합니다.
- 제목은 한 줄 우선, 설명은 2줄까지 허용합니다.
- 긴 URL이나 긴 업무명은 줄바꿈 처리합니다.
- `전체 읽음`은 panel 상단에 둡니다.
- 모바일/좁은 화면에서는 full-width sheet처럼 보여도 됩니다.

업무 상세 이동:

- 알림 클릭 시 `selectedTaskId`를 해당 업무로 설정합니다.
- 업무가 archive 상태면 보관함 detail로 이동할지, 일반 detail만 열지 정책을 정합니다.
- 관련 source가 update/post이면 업무 상세 안에서 해당 섹션을 강조하는 후속 UX를 검토합니다.

## Teams 연동 기준

Teams 연동은 가능하지만 초기 알림함 구현과 분리합니다.

추천 순서:

1. dashboard 내부 알림함
2. high/urgent 알림만 dashboard에서 안정화
3. 회사 관리자와 Teams app, Power Automate, Graph API 가능 여부 확인
4. Teams에는 과도한 개별 알림 대신 일일 요약 또는 urgent 알림만 전송

Teams 발송 후보:

- 내 업무가 `D+N 지연`이 됨
- 내 업무에 `리스크` 업무 노트가 추가됨
- 내 업무에 `결정사항` 또는 `다음 확인` 성격의 노트가 추가됨
- 팀장이 직접 나에게 업무를 배정함

Teams 발송 제외 후보:

- 단순 update log 추가
- 단순 상태 변경
- 내가 직접 작성한 업무 노트
- 이미 dashboard에서 본 알림의 반복 발송

## 개인정보와 보안

- 알림은 개인별 데이터입니다.
- 타인의 알림함을 일반 사용자가 읽을 수 없어야 합니다.
- 관리자도 운영/지원 목적 외에는 개인 알림함을 UI에서 열람하지 않는 방향이 좋습니다.
- 알림 body에는 민감한 원문을 너무 길게 복사하지 말고, 업무 제목/짧은 요약/링크 중심으로 둡니다.
- 향후 그룹 확장 시 `workspace_id` RLS를 반드시 추가합니다.

## 검증 시나리오

최소 2개 계정으로 검증합니다.

1. A가 B에게 새 업무를 배정한다.
   - B에게 `task_assigned` 알림이 생긴다.
   - A에게는 자기 작성 알림이 생기지 않는다.
2. A가 B 담당 업무에 update log를 추가한다.
   - B에게 `task_update_added` 알림이 생긴다.
   - B가 알림을 클릭하면 해당 업무 상세가 열린다.
3. A가 B 담당 업무에 `리스크` 업무 노트를 추가한다.
   - B에게 `risk_added` 또는 `task_post_added` 알림이 생긴다.
   - severity가 `high`로 표시된다.
4. B가 알림을 읽음 처리한다.
   - unread count가 줄어든다.
   - 새로고침 후에도 읽음 상태가 유지된다.
5. A 계정으로 B의 notification id를 직접 조회하려 한다.
   - RLS 때문에 조회되지 않는다.
6. A 계정으로 B의 notification row를 직접 update하려 한다.
   - RLS 때문에 실패한다.
7. 같은 이벤트를 다시 저장하거나 새로고침한다.
   - 같은 source 기반 알림이 중복 생성되지 않는다.

## 완료 기준

Phase 1 완료 기준:

- PostgreSQL migration으로 `notifications` 테이블과 indexes가 적용된다.
- FastAPI 권한 검사로 사용자는 본인 알림만 조회 가능하다.
- FastAPI 권한 검사로 사용자는 본인 알림의 `read_at`, `dismissed_at`만 update 가능하다.
- 업무 배정, 지연, 본인 업무의 update log/업무 Note/risk Note 중 최소 2종 이상이 실제 알림 row를 만든다.
- 상단 종 아이콘에 unread count가 표시된다.
- 알림 패널에서 읽음/전체 읽음이 동작한다.
- 알림 row 클릭 시 해당 업무 상세가 열린다.
- `git diff --check`, build, 브라우저 QA, 최소 2계정 API 권한 smoke가 통과한다.

## 향후 Codex 작업 프롬프트

회사 PostgreSQL apply/smoke 또는 Phase 2 구현 시 Codex에게 아래처럼 요청합니다.

```text
docs/personal-notification-inbox-plan.md,
docs/fastapi-postgres-backend-spec.md,
docs/multi-workspace-expansion-plan.md,
docs/backend-api-spec.md,
docs/data-model.md,
docs/permission-rules.md,
src/AGENTS.md,
DESIGN.md를 먼저 읽고 진행해줘.

회사 내부 FastAPI/PostgreSQL 환경에 개인별 알림함 Phase 1을 apply/smoke 해줘.
범위는 alembic upgrade, notifications API smoke, 2계정 권한 검증,
상단 종 아이콘 unread badge, 알림 패널, 읽음/전체읽음, 업무 상세 이동 확인까지야.
Teams 연동, 실시간 push, 모바일 push, 사용자별 알림 설정은 계속 제외해줘.

구현 후 git diff --check, CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build,
브라우저 QA, 최소 2계정 API 권한 smoke 결과를 정리해줘.
```
