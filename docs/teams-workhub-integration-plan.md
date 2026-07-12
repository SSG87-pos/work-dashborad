# Teams Work-Hub Integration Plan

작성 기준일: 2026-07-12

이 문서는 Microsoft Teams 채널과 Work-Hub 게시판/업무 Note를 나중에 연결하기 위한 설계 준비 문서입니다. 현재 범위는 문서화와 로컬 설계 준비까지이며, 운영 코드, DB migration, Teams tenant 설정은 포함하지 않습니다.

## 현재 결정

Teams 연동은 회사 FastAPI/PostgreSQL backend apply/smoke 이후에 실제 연결합니다. 단, 지금은 사용하지 않을 가능성까지 고려해 아래처럼 부담 없는 형태로 준비합니다.

- 새 runtime 동작 없음
- 새 DB migration 없음
- 새 frontend 노출 없음
- 실제 Teams webhook URL, Graph secret, tenant credential 저장 없음
- 회사에서 Teams 연동을 쓰지 않기로 해도 기존 업무 Note, 알림함, 게시판, 검색, AI 근거 흐름에는 영향 없음

## 왜 backend 이후인가

Teams 메시지는 업무 데이터와 연결되기 전에 최소한 아래 정보가 안정되어야 합니다.

1. 회사 FastAPI가 C3 또는 회사 서버에서 실행된다.
2. PostgreSQL에 실제 업무, 사용자, 업무 Note가 저장된다.
3. frontend가 `VITE_API_BASE_URL`로 FastAPI mode에 붙는다.
4. 로그인 사용자와 권한이 실제 회사 계정/로스터 기준으로 동작한다.

Teams 채널 글은 작성자, 원문 링크, 관련 업무, 공개 범위, 중복 수집 여부가 중요합니다. local fallback/demo 상태에서 먼저 실제 Teams 데이터를 넣으면 나중에 회사 DB로 옮길 때 정리 비용이 커질 수 있습니다.

## 제품 방향

Teams를 Work-Hub의 대체 게시판으로 만들지 않습니다. Teams는 대화가 빠르게 흐르는 공간이고, Work-Hub는 업무별로 근거와 결정을 축적하는 공간입니다.

권장 흐름:

1. Teams 채널 글 중 `#워크허브`, `#업무Note`, `#리스크`, `#결정` 같은 약속된 신호가 있는 글만 후보로 수집한다.
2. Work-Hub는 원문을 바로 업무 Note로 확정하지 않고 `Teams 수집함`에 pending 상태로 둔다.
3. lead/admin 또는 작성자가 관련 업무를 선택하고 Note 유형을 확인한다.
4. 확정 후 기존 `task_posts` 업무 Note로 저장한다.
5. 원문 Teams URL은 `task_posts.url` 또는 attachment metadata에 보존한다.

반대 방향은 더 제한적으로 운영합니다.

- Work-Hub의 모든 변경을 Teams에 보내지 않는다.
- `urgent`/`high` 알림, 리스크 Note, 지연 업무, 새 배정처럼 놓치면 곤란한 이벤트만 Teams 채널에 보낸다.
- 개인 알림 내용은 공개 채널에 상세 노출하지 않는다.

## 연동 옵션

### 1. Power Automate / Teams Workflows

가장 가벼운 MVP 후보입니다.

- Teams -> Work-Hub: 회사가 허용하면 Power Automate가 특정 채널 메시지 trigger를 받아 Work-Hub API로 HTTP POST한다.
- Work-Hub -> Teams: Teams Workflows의 `When a Teams webhook request is received` trigger로 Work-Hub가 Teams 채널에 카드/메시지를 보낸다.

장점:

- 회사 관리자가 이해하기 쉽다.
- 별도 Teams 앱 등록보다 시작 장벽이 낮다.
- 사용하지 않게 되면 flow를 끄거나 삭제하면 된다.

주의:

- Workflows는 소유자 계정에 묶일 수 있으므로 공동 소유자와 운영 계정을 정해야 한다.
- Microsoft 365 Connectors/기존 Incoming Webhook은 폐지 흐름이 있으므로 신규 설계는 Workflows 쪽을 우선 검토한다.
- 회사 정책상 Power Automate HTTP connector가 막혀 있을 수 있다.

### 2. Microsoft Graph change notifications

정식 서버 간 자동 수집 후보입니다.

- Work-Hub backend가 Graph subscription을 만들고 `/teams/{team-id}/channels/{channel-id}/messages` 변경 알림을 받는다.
- 필요하면 `$search`를 이용해 약속된 키워드가 포함된 메시지만 구독하는 방식을 검토한다.

장점:

- 채널 메시지 생성/수정 이벤트를 안정적으로 받을 수 있다.
- Power Automate에 덜 의존한다.

주의:

- Entra 앱 등록, Graph 권한, 관리자 동의, subscription 갱신, lifecycle notification, secret/certificate 관리가 필요하다.
- 운영 승인 전에는 구현하지 않는다.

### 3. Teams message extension

가장 제품적으로 깔끔한 장기 후보입니다.

- 사용자가 Teams 메시지의 메뉴에서 `Work-Hub에 저장`을 누른다.
- Work-Hub가 task 선택 form을 띄우고 업무 Note로 저장한다.

장점:

- 모든 채널 글을 자동 감시하지 않아도 된다.
- 사용자가 의도적으로 저장하므로 잡음이 적다.

주의:

- Teams app manifest, Bot Framework 또는 API-based message extension 구성이 필요하다.
- 회사 앱 카탈로그 배포와 보안 검토가 필요하다.

## 권장 단계

### Phase 0. 현재 준비

- 이 문서만 유지한다.
- SQL/API 초안은 참고로만 둔다.
- `HANDOFF.md`, `TODO.md`, `AGENTS.md`에 후속 후보로 연결한다.

### Phase 1. 회사 backend 안정화 후 로컬 stub

조건:

- 회사 FastAPI/PostgreSQL apply/smoke 완료
- 업무 Note CRUD와 알림함이 회사 DB에서 검증됨
- 실제 계정 2명 이상으로 권한 smoke 완료

작업:

- 비활성 기본값으로 `TEAMS_IMPORT_ENABLED=false` 추가
- secret 없으면 Teams 수신 endpoint가 404 또는 403을 반환하도록 설계
- DB migration 전에는 local test fixture 또는 임시 mock route로 payload shape만 검증

### Phase 2. Teams 수집함

작업:

- `teams_imports` migration 추가
- `POST /api/v1/integrations/teams/messages` 추가
- `GET /api/v1/integrations/teams/imports` 추가
- `POST /api/v1/integrations/teams/imports/{id}/convert-to-post` 추가
- UI는 admin/lead 또는 작성자에게만 pending 수집함을 노출

### Phase 3. Work-Hub -> Teams outbound

작업:

- `TEAMS_OUTBOUND_ENABLED=false` 기본값 유지
- Teams Workflow webhook URL은 backend secret env에만 저장
- high-signal 이벤트만 발송
- 발송 실패/재시도 추적용 `notification_deliveries` 또는 `teams_deliveries` 검토

### Phase 4. Graph 또는 message extension 전환

Power Automate가 운영에 부족하거나 회사가 정식 Teams app을 원하면 Graph subscription 또는 message extension으로 전환합니다.

## 환경 변수 초안

운영 기본값은 모두 비활성입니다.

```env
TEAMS_IMPORT_ENABLED=false
TEAMS_IMPORT_SHARED_SECRET=
TEAMS_ALLOWED_TEAM_IDS=
TEAMS_ALLOWED_CHANNEL_IDS=
TEAMS_OUTBOUND_ENABLED=false
TEAMS_WORKFLOW_WEBHOOK_URL=
VITE_TEAMS_INTEGRATION_ENABLED=
```

원칙:

- `TEAMS_WORKFLOW_WEBHOOK_URL`은 절대 frontend env에 넣지 않는다.
- `TEAMS_IMPORT_SHARED_SECRET` 또는 Graph client secret은 `.env.example`에 실제 값 없이 이름만 둔다.
- `VITE_TEAMS_INTEGRATION_ENABLED`가 비어 있으면 UI는 Teams 기능을 표시하지 않는다.

## API 초안

아래는 구현 전 설계 초안입니다. 실제 endpoint 추가 전에는 `docs/backend-api-spec.md`와 `docs/permission-rules.md`를 함께 업데이트합니다.

### Teams 메시지 수신

```txt
POST /api/v1/integrations/teams/messages
```

권장 인증:

- `TEAMS_IMPORT_ENABLED=true`일 때만 활성화
- `X-WorkHub-Teams-Secret` 또는 HMAC header 검증
- allowlist된 `teamId`/`channelId`만 허용
- 중복 `messageId`는 idempotent 처리

Payload 초안:

```json
{
  "teamId": "team-id",
  "teamName": "연구기획그룹",
  "channelId": "channel-id",
  "channelName": "전략",
  "messageId": "message-id",
  "replyToId": null,
  "authorName": "홍길동",
  "authorEmail": "hong@example.com",
  "bodyText": "#워크허브 회의 결과 공유합니다.",
  "webUrl": "https://teams.microsoft.com/...",
  "createdAt": "2026-07-12T09:00:00+09:00",
  "raw": {}
}
```

처리 결과:

- 태그/키워드가 없으면 `ignored` 또는 저장 생략
- 업무 후보를 자동 확정하지 않음
- pending 수집함 row만 생성

### 수집함 조회

```txt
GET /api/v1/integrations/teams/imports?status=pending&limit=50
```

권한:

- admin/lead 우선
- 나중에 작성자 이메일과 Work-Hub user email 매칭이 안정되면 작성자 본인 pending row 조회 허용 검토

### 업무 Note 전환

```txt
POST /api/v1/integrations/teams/imports/{import_id}/convert-to-post
```

Payload 초안:

```json
{
  "taskId": "task-uuid",
  "categoryId": "category-uuid",
  "scope": "회의록",
  "title": "회의 결과 공유",
  "body": "Teams 원문을 정리한 내용",
  "keepSourceUrl": true
}
```

동작:

- 기존 `POST /api/v1/tasks/{task_id}/posts`와 같은 권한 규칙을 사용
- `task_posts.url`에 Teams 원문 URL 저장
- 원문 import row는 `converted` 상태로 변경
- `converted_post_id` 저장

## 테이블 초안

실제 migration이 아니라 설계 참고입니다.

```sql
create table teams_imports (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  team_name text,
  channel_id text not null,
  channel_name text,
  message_id text not null,
  reply_to_id text,
  author_name text,
  author_email text,
  body_text text not null,
  web_url text,
  matched_tags jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  linked_task_id uuid references tasks(id) on delete set null,
  converted_post_id uuid references task_posts(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  source_created_at timestamptz,
  processed_at timestamptz,
  unique (team_id, channel_id, message_id)
);

create index teams_imports_status_created_idx
on teams_imports (status, created_at desc);

create index teams_imports_channel_created_idx
on teams_imports (team_id, channel_id, created_at desc);
```

상태 후보:

- `pending`: Work-Hub에서 검토 대기
- `ignored`: 업무 Note로 남기지 않음
- `converted`: 업무 Note로 전환 완료
- `failed`: payload 검증 또는 저장 실패

## 보안 원칙

- Teams 채널 메시지를 Work-Hub 권한보다 넓게 보여주지 않는다.
- 공개 Teams 채널로 개인 알림 상세, 개인 메모, 비공개 일정, 평가성 문구를 보내지 않는다.
- Teams 원문 URL은 접근 권한이 Teams 쪽 정책을 따르므로, Work-Hub에 저장된 요약/본문은 별도 권한 검사를 받는다.
- 수신 endpoint는 frontend에서 호출하지 않는다.
- webhook secret과 Teams outbound URL은 backend env에만 둔다.
- Teams에서 들어온 HTML/mention payload는 plain text 또는 허용된 subset으로 정규화한다.
- 모든 import는 dedupe key를 둔다.
- 실패 재시도와 발송 이력은 나중에 별도 delivery table로 추적한다.

## 사용하지 않을 경우

Teams 연동을 하지 않기로 결정하면:

- 이 문서는 `검토 보류` 상태로 남긴다.
- migration이 없으므로 DB rollback이 필요 없다.
- env flag가 비어 있으면 UI/API가 노출되지 않는다.
- 기존 업무 Note와 알림함은 계속 독립적으로 동작한다.
- 필요하면 `AGENTS.md`, `HANDOFF.md`, `TODO.md`의 Teams 후속 항목만 제거하면 된다.

## 회사 확인 질문

1. Power Automate에서 HTTP request trigger/action을 사용할 수 있는가?
2. Teams Workflows webhook을 특정 채널에 만들 수 있는가?
3. flow 소유자와 공동 소유자를 누구로 둘 것인가?
4. Graph 앱 등록과 관리자 동의를 받을 수 있는가?
5. Teams 채널 글을 업무 시스템으로 복제하는 것에 내부 보안 승인 기준이 있는가?
6. 어떤 채널만 Work-Hub와 연결할 것인가?
7. 어떤 키워드 또는 태그가 붙은 글만 수집할 것인가?
8. 공개 채널로 다시 내보낼 수 있는 알림 유형은 무엇인가?

## 참고 문서

- Microsoft Teams Workflows/Webhook: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Graph Teams message change notifications: https://learn.microsoft.com/en-us/graph/teams-changenotifications-chatmessage
- Microsoft Teams message extensions: https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions
