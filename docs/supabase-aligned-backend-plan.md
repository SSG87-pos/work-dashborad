# Supabase-Aligned Backend Plan

작성 기준일: 2026-07-01

이 문서는 회사에서 self-hosted Supabase 생성이 다시 가능해질 때, 현재 `FastAPI + PostgreSQL` 구현을 버리지 않고 Supabase에 맞춰 정렬하는 실행 계획입니다.

## 1. 결론

Supabase가 가능해지면 추후 관리는 쉬워질 수 있습니다. 다만 현재 앱은 이미 FastAPI backend에 많은 업무 로직이 구현되어 있으므로, 즉시 전면 전환하지 않고 아래 구조를 목표로 합니다.

```text
React/Vite
  -> Supabase Auth / REST API / Storage / Realtime
  -> FastAPI or Supabase Edge Functions for complex business logic
  -> Supabase Postgres as source of truth
```

핵심은 “Supabase로 회귀”가 아니라 “Supabase가 제공하는 DB/Auth/API/Storage/Realtime을 자연스럽게 쓸 수 있도록 현재 구현을 정렬”하는 것입니다.

실행 기준은 **FastAPI 유지 + Supabase Postgres/Auth/API/Storage 활용**입니다.

## 2. 왜 바로 FastAPI를 버리지 않는가

Supabase는 Postgres 기반 REST API를 자동으로 제공합니다. 테이블 CRUD, 필터, 관계 조회, Auth, RLS, Storage, Realtime, Edge Functions까지 있어 backend 플랫폼으로 충분히 강력합니다.

하지만 현재 `backend/`에는 아래처럼 단순 CRUD를 넘어선 로직이 이미 들어 있습니다.

- 작업 생성/수정/삭제와 역할별 권한 검사
- 반복 업무 규칙과 미래 인스턴스 정리
- 상태 이력, archive/restore, update log edit/delete
- 업무 Note/post rollup
- Canvas state read/save
- 개인 알림 생성 규칙과 읽음 처리
- DB 기반 dashboard insight
- 업무흐름 유사도 추천
- AI read API
- LLM-Wiki search/read/source/recommendation/draft/review/Error Book

이 기능들을 모두 Supabase REST API만으로 대체하려면 RLS, SQL function, trigger, Edge Functions로 다시 설계해야 합니다. 따라서 먼저 Supabase Postgres를 source of truth로 두고, 점진적으로 Supabase 네이티브 기능을 채택합니다.

## 3. 기능별 권장 경계

| 영역 | 1차 권장 | 나중 후보 | 이유 |
| --- | --- | --- | --- |
| 사용자 인증 | Supabase Auth 후보 | FastAPI 자체 JWT 유지 가능 | 회사 계정/SSO 방향에 따라 결정 |
| 사용자/로스터 프로필 | FastAPI API 유지 | Supabase REST + RLS | role, team, roster 연결 규칙이 있음 |
| 단순 태그/태그그룹 | Supabase REST 후보 | FastAPI 유지 | CRUD 성격이 강함 |
| 캘린더 이벤트 | Supabase REST 후보 | FastAPI 유지 | 개인/팀 RLS만 정리되면 직접 API 가능 |
| 개인 preference/memo | Supabase REST 후보 | FastAPI 유지 | row ownership RLS에 적합 |
| 업무 task core | FastAPI 유지 | 일부 Supabase REST | 권한, 이력, 반복 규칙이 많음 |
| update log / task posts | FastAPI 유지 | Supabase REST + RLS | 수정/삭제 권한이 복잡함 |
| Storage 첨부 | Supabase Storage | FastAPI presign/proxy | 이미지/OCR 원본 저장에 적합 |
| Realtime 알림 | Supabase Realtime 후보 | FastAPI SSE/WebSocket | 회사 플랫폼 지원 후 판단 |
| AI read API | FastAPI 유지 | Edge Functions 후보 | evidence assembly 로직이 있음 |
| LLM-Wiki | FastAPI 유지 | 일부 Edge Functions | draft/review/source/error workflow가 복잡함 |
| 보고서 생성 | FastAPI 유지 | Edge Functions 후보 | 장기 실행/외부 AI 연동 정책 필요 |

## 4. 단계별 실행 계획

### Phase 0. 회사 Supabase 생성 확인

회사에 `docs/company-supabase-platform-image-handoff.md`를 보내고 아래를 확인합니다.

- Docker Compose 또는 multi-container stack 가능 여부
- persistent volume, secret, reverse proxy/TLS, SMTP, backup 정책
- Supabase public URL, anon/publishable key, service role key 제공 방식
- Postgres connection string 제공 방식
- Auth, Storage, Realtime, Edge Functions 사용 가능 여부

### Phase 1. DB 연결만 Supabase Postgres로 검증

목표:

- 현재 FastAPI backend가 Supabase Postgres에 붙는지 확인
- Alembic migration이 Supabase Postgres에서 정상 적용되는지 확인
- `/api/v1/health/db`와 핵심 CRUD smoke 통과

예상 변경:

```text
backend/.env
  DATABASE_URL=postgresql+psycopg://...@<supabase-db-host>:5432/postgres
```

주의:

- Supabase의 Data API/RLS는 아직 본격 사용하지 않아도 됩니다.
- 우선 FastAPI가 회사 Supabase Postgres를 안정적으로 DB처럼 사용할 수 있는지 봅니다.

### Phase 2. 사용자 모델을 Supabase Auth와 맞출 준비

목표:

- 현재 `users`/`team_roster`를 Supabase `auth.users`와 연결 가능한 구조로 정리
- 자체 JWT와 Supabase Auth 중 어느 쪽을 운영 기준으로 둘지 결정

검토 항목:

- `users.id`를 Supabase auth user id와 맞출지
- 별도 `auth_user_id` 컬럼으로 매핑할지
- admin/lead/member role을 `app_metadata`와 DB 프로필 중 어디에 둘지
- RLS에서 `user_metadata`를 권한 판단에 쓰지 않도록 보장

### Phase 3. RLS 설계

목표:

- Supabase REST API로 직접 노출할 테이블과 FastAPI 뒤에 숨길 테이블 분리
- 노출 테이블에는 RLS를 기본으로 적용

원칙:

- 브라우저가 직접 접근할 테이블은 RLS 필수
- `TO authenticated`만으로 권한을 끝내지 않음
- owner/team/workspace/admin 조건을 명시
- view는 `security_invoker = true` 또는 비노출 schema 사용
- service role key는 서버 전용

### Phase 4. 단순 CRUD부터 Supabase REST API 후보화

먼저 옮겨볼 수 있는 후보:

- preferences
- memos
- calendar events
- tags/tag groups
- simple briefing items

유지할 가능성이 높은 후보:

- task lifecycle
- notification creation rules
- workstream similarity suggestions
- dashboard insights
- AI read endpoints
- LLM-Wiki draft/review endpoints

### Phase 5. Storage/Realtime/Edge Functions 확장

Storage 후보:

- 업무 Note 이미지 원본
- OCR/vision input 파일
- 첨부자료

Realtime 후보:

- 알림 badge 갱신
- 업무 update log 실시간 반영
- Canvas 협업은 충돌 정책 확정 후

Edge Functions 후보:

- 작은 webhook
- Storage upload 후 OCR queue trigger
- 간단한 AI 전처리
- FastAPI까지 가지 않아도 되는 서버 전용 작업

## 5. 브랜치 전략

기존 `release/company-supabase-c3` 브랜치로 돌아가지 않습니다.

현재 브랜치 기준:

```text
codex/company-self-hosted-supabase-refresh
```

이 브랜치는 최신 `codex/llm-wiki-architecture`에서 갈라졌고, 과거 Supabase C3 문서를 최신 FastAPI/Wiki/AI backend 상태에 맞게 다시 정렬하는 용도입니다.

과거 브랜치 해석:

| 브랜치 | 현재 판단 |
| --- | --- |
| `codex/supabase-integration` | 현재 작업의 조상이라 별도 회귀 불필요 |
| `release/company-supabase-c3` | C3 Supabase Docker 문서 커밋이 있음. 내용만 최신 문서에 흡수 |
| `release/company-fastapi-postgres` | FastAPI backend 기준선 |
| `codex/llm-wiki-architecture` | 최신 backend/Wiki/AI 기준 |

## 6. 회사에서 Supabase 생성 후 받을 정보

회사 self-hosted Supabase가 만들어지면 아래 값을 받아야 합니다.

```text
SUPABASE_PUBLIC_URL=
SUPABASE_ANON_OR_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_OR_SECRET_KEY=  # server only
POSTGRES_CONNECTION_STRING=
AUTH_ENABLED=
STORAGE_ENABLED=
REALTIME_ENABLED=
EDGE_FUNCTIONS_ENABLED=
SMTP_CONFIGURED=
BACKUP_POLICY=
TLS_DOMAIN=
```

이 값이 있어야 실제 연결 작업으로 넘어갈 수 있습니다.

## 7. 첫 연결 검증 체크리스트

- [ ] Supabase Studio 접속 가능
- [ ] API Gateway URL 접속 가능
- [ ] Postgres connection string으로 FastAPI `/health/db` 성공
- [ ] Alembic head 적용 가능
- [ ] `work-dashboard-api seed-first-admin` 또는 Supabase Auth 첫 admin 매핑 성공
- [ ] React build에서 `VITE_API_BASE_URL` 또는 Supabase env가 의도대로 적용
- [ ] local fallback/demo data가 회사 runtime에 섞이지 않음
- [ ] service role key가 frontend bundle에 포함되지 않음
- [ ] RLS 적용 전에는 browser direct REST API 노출 범위를 제한

## 8. 지금 당장 할 일

1. 회사에 `docs/company-supabase-platform-image-handoff.md`의 링크와 이미지 표를 전달합니다.
2. 회사가 Supabase stack을 만들 수 있다고 답하면 접속 정보와 기능 enable 범위를 받습니다.
3. 이 브랜치에서 Phase 1, 즉 FastAPI를 Supabase Postgres에 붙이는 smoke부터 합니다.
4. Auth/RLS/REST 직접 호출은 그 다음 단계에서 기능별로 쪼개서 전환합니다.

## 9. 회사 작업 전 로컬에서 끝낼 수 있는 일

회사 Supabase 접속정보 없이도 여기서 닫을 수 있는 범위는 아래입니다.

- [x] 최신 브랜치에서 Supabase 재정렬용 브랜치 생성
- [x] 회사에 보낼 공식 Supabase Docker Compose 링크와 이미지 목록 문서화
- [x] 현재 FastAPI backend를 버리지 않는 Supabase-aligned 전환 기준 문서화
- [x] FastAPI Alembic migration 파일 순서 확인
- [x] 기존 Supabase SQL migration 파일 순서 확인
- [x] 회사에서 받아야 할 접속값 목록 정리
- [x] service role/secret key를 frontend에 넣지 않는 보안 경계 명시
- [x] 문서/마이그레이션 순서 자동 점검 스크립트 추가

회사 Supabase 생성 전에는 아래 항목을 완료했다고 말하면 안 됩니다.

- [ ] 회사 Supabase Postgres에 `alembic upgrade head` 적용
- [ ] 회사 Supabase URL/key로 Auth/API/Storage 동작 확인
- [ ] 회사 DB 기준 `/api/v1/health/db` 통과
- [ ] 회사 DB 기준 로그인, 업무 CRUD, 알림, Wiki smoke 통과
- [ ] 회사 Supabase REST API로 직접 노출할 테이블의 RLS 정책 확정
- [ ] Supabase Storage bucket/RLS 생성과 첨부파일 업로드 smoke

따라서 현재 로컬 완료 기준은 **회사 접속정보만 기다리는 사전 준비 완료**입니다. 실제 마이그레이션 완료 기준은 회사 Supabase Postgres에 적용하고 smoke를 통과한 뒤입니다.
