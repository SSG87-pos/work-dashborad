# Next Thread Continuation Guide

작성 기준일: 2026-06-25

이 문서는 다른 Codex 쓰레드에서 `연구기획그룹-전략` 대시보드 작업을 바로 이어가기 위한 짧은 안내서입니다. 자세한 배경은 `HANDOFF.md`에 있고, 실제 다음 작업은 `TODO.md` 최상단을 따릅니다.

## 1. 현재 기준 브랜치

최신 기능까지 이어서 작업하려면 아래 브랜치를 기준으로 시작합니다.

```bash
git clone -b codex/task-channel-feed-fastapi https://github.com/SSG87-pos/work-dashborad.git work-dashboard-task-channel
cd work-dashboard-task-channel
```

이미 폴더가 있다면:

```bash
git fetch origin
git checkout codex/task-channel-feed-fastapi
git pull
```

이 브랜치는 `release/company-fastapi-postgres` 위에 업무 채널/게시글 공개범위 기능을 추가한 작업 브랜치입니다.

## 2. 왜 이 브랜치에서 시작하는가

회사 백엔드 방향은 현재 `FastAPI + PostgreSQL`입니다. Supabase Docker/self-hosted Supabase는 회사 환경 제약 때문에 현재 운영 목표가 아닙니다.

다만 슬기님이 최근 요청한 Teams 채널형 기능, 즉 다음 기능들은 `codex/task-channel-feed-fastapi`에 들어 있습니다.

- task detail `업무 노트`의 `팀 공개` / `나만 보기`
- My Desk의 `내 글` 표면
- Team Flow의 `업무 채널`
- Highlights의 `업무흐름별 게시글 모음`에서 private 글 제외
- FastAPI/PostgreSQL 문서의 `task_posts.visibility`, `/posts/mine`, `/posts/team-channel` 계약

따라서 다음 쓰레드에서 실제 backend 구현까지 이어가려면 `codex/task-channel-feed-fastapi`가 가장 덜 헷갈립니다.

## 3. 먼저 읽을 파일

다음 쓰레드의 Codex에게 아래 순서로 읽으라고 지시합니다.

1. `AGENTS.md`
2. `src/AGENTS.md`
3. `DESIGN.md`
4. `HANDOFF.md`
5. `TODO.md`
6. `docs/fastapi-postgres-backend-spec.md`
7. `docs/company-fastapi-postgres-beginner-runbook.md`
8. `docs/backend-api-spec.md`
9. `docs/data-model.md`
10. `docs/permission-rules.md`

프론트 UI를 바꿀 경우에는 반드시 `DESIGN.md`를 먼저 읽어야 합니다. 백엔드를 구현할 경우에는 `docs/fastapi-postgres-backend-spec.md`를 기준으로 삼습니다.

## 4. 현재 구현 상태

완료된 것:

- React/Vite 프론트엔드 대시보드
- POSLAB entry/landing
- My Desk, Team Flow, Calendar, Updates, Highlights, Canvas, Admin 등 주요 UI
- 업무 인박스와 팀 체크
- 스팟 업무, 리스트 뷰, 공통 필터
- 업무 노트/게시글 작성, 수정, 삭제 UI
- 게시글 유형 관리 UI
- 업무 채널형 surface
- 게시글 공개범위 UI와 local/Supabase-store 호환 코드
- FastAPI/PostgreSQL backend 명세 문서

아직 없는 것:

- 실제 `backend/` 폴더
- FastAPI 앱 코드
- SQLAlchemy/SQLModel 모델
- Alembic migration
- JWT 인증 코드
- PostgreSQL 실제 연결 코드
- 프론트의 `VITE_API_BASE_URL` 기반 실제 API store

## 5. 다음 구현 우선순위

첫 backend 구현은 작게 시작합니다.

1. `backend/` 폴더 생성
2. FastAPI health check
3. PostgreSQL 연결 설정
4. Alembic 설정
5. `users`, `team_roster` 모델과 migration
6. 첫 관리자 seed 방식
7. `/api/v1/health` 검증
8. 프론트에는 `VITE_API_BASE_URL` 기반 API store 경계만 준비

처음부터 하지 말 것:

- 실시간 커서
- 동시 편집 충돌 처리
- Teams 연동
- AI 모델 호출
- Canvas 실시간 공동편집
- 다팀 workspace 확장

## 6. 다음 쓰레드에 붙여넣을 프롬프트

```text
이 프로젝트는 /Users/seulgi/Documents/Codex/work-dashboard의 연구기획그룹-전략 업무 대시보드야.
현재 이어받을 기준은 codex/task-channel-feed-fastapi 브랜치야.

먼저 AGENTS.md, src/AGENTS.md, DESIGN.md, HANDOFF.md, TODO.md,
docs/next-thread-continuation-guide.md,
docs/fastapi-postgres-backend-spec.md,
docs/company-fastapi-postgres-beginner-runbook.md,
docs/backend-api-spec.md,
docs/data-model.md,
docs/permission-rules.md를 필요한 만큼 읽고 현재 상태를 파악해줘.

목표는 회사 C3/Linux/Ubuntu 환경에서 Docker 없이 FastAPI + PostgreSQL backend로 연결할 수 있게 Phase 1 backend skeleton을 구현하는 거야.

우선 범위:
- backend/ 폴더 생성
- FastAPI health check
- PostgreSQL 연결
- Alembic 설정
- users, team_roster 모델과 migration
- 첫 관리자 seed 방식
- /api/v1/health 검증
- 프론트 UI는 유지하고 VITE_API_BASE_URL 기반 apiStore 연결 준비

중요:
- Supabase Docker/self-hosted Supabase는 현재 운영 목표가 아니고 참고 자료야.
- 업무 노트/게시글에는 팀 공개/나만 보기 visibility가 있어야 해.
- private 게시글은 팀 채널, Highlights rollup, export, AI 요약에 기본 노출되면 안 돼.
- src/storage.js 저장 경계를 유지하고 화면 컴포넌트에 fetch를 흩뿌리지 마.
- 구현 후 git diff --check, backend 기본 API 검증, CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build까지 확인해줘.
- 변경 후 HANDOFF.md와 TODO.md를 다시 업데이트해줘.
```

## 7. 검증 명령

프론트 빌드 검증:

```bash
CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

일부 로컬 Codex 환경에서 `node`를 못 찾으면 bundled Node를 PATH에 넣어 실행합니다.

```bash
PATH=/Users/seulgi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build
```

개발 서버:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run dev
```

회사 포트 예시:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run dev -- --host 0.0.0.0 --port 10097
```

## 8. 주의할 로컬 파일

현재 작업 폴더에는 아래 ClickUp 목업 파일이 untracked 상태로 남아 있을 수 있습니다.

```text
docs/mockups/clickup-list-tab-workflow.html
docs/mockups/clickup-simple-work-views.html
```

이 파일들은 참고 탐색용이고, 슬기님이 ClickUp 적용은 일단 중단하자고 했으므로 기본 커밋 대상이 아닙니다. 다음 작업에서 필요 없으면 무시합니다.
