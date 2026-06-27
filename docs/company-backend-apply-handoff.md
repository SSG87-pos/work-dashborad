# Company Backend Apply Handoff

작성 기준일: 2026-06-28

이 문서는 회사 환경에서 `연구기획그룹-전략` 대시보드에 FastAPI + PostgreSQL backend를 붙여 실행할 담당자를 위한 최종 인수인계 문서입니다. 목표는 새 기능 개발이 아니라, 이미 구현된 backend와 frontend API 연결을 회사 PostgreSQL/서버 환경에 적용하고 smoke 검증하는 것입니다.

## 1. 결론

회사 담당자는 아래 브랜치를 받아 진행하면 됩니다.

```text
repo: https://github.com/SSG87-pos/work-dashborad.git
branch: codex/llm-wiki-architecture
latest verified commit: 25e0048 fix: refine mobile dashboard interactions
```

이 브랜치는 `release/company-fastapi-postgres` backend 기준 위에 LLM-Wiki, 알림, AI-read API, 모바일/대시보드 개선까지 올라간 최신 검증본입니다. 지금 회사 적용 단계에서는 `release/company-fastapi-postgres`보다 `codex/llm-wiki-architecture`를 기준으로 받는 것이 맞습니다.

로컬 최종 검증에서 확인된 상태:

- frontend API store smoke 통과
- frontend production build 통과
- backend pytest 43개 통과
- Alembic head는 `20260625_0012`
- Alembic offline SQL이 head까지 생성됨
- uvicorn app startup 및 `/api/v1/health` 200 OK 확인
- tracked working tree와 원격 `origin/codex/llm-wiki-architecture` 동기화 확인

회사에서 남은 일은 코드 구현이 아니라 다음 네 가지입니다.

1. 회사 PostgreSQL DB와 계정 준비
2. `backend/.env`에 회사 DB/JWT/CORS 값 설정
3. `alembic upgrade head`, 첫 관리자 seed, `/health/db` smoke
4. frontend `.env.local`에 `VITE_API_BASE_URL`을 넣고 실제 브라우저 저장/수정/삭제 QA

## 2. 구현된 범위 요약

### Frontend

- React/Vite dashboard prototype
- POSLAB entry screen and dashboard shell
- My Desk, Team Flow, Calendar, Updates, Performance, Canvas, Highlights, Admin views
- local fallback persistence through `src/storage.js`
- FastAPI mode switch through `src/apiStore.js`
- `VITE_API_BASE_URL`이 있으면 FastAPI backend를 사용
- `VITE_API_BASE_URL`이 없으면 기존 local/Supabase fallback 경계 유지

### Backend

backend root:

```text
backend/
  app/main.py
  app/core/config.py
  app/db/session.py
  app/api/
  app/models/
  app/schemas/
  app/services/
  alembic/
  tests/
  pyproject.toml
  .env.example
```

주요 구현 범위:

- FastAPI app factory and CORS
- PostgreSQL SQLAlchemy session
- Alembic migrations through `20260625_0012`
- `/api/v1/health`
- `/api/v1/health/db`
- email/password login
- JWT bearer auth
- `/api/v1/me`
- admin roster create/list/update
- tasks create/list/update/delete
- subtasks
- update logs
- status/change history edit/delete
- archive/restore
- related links
- recurring rule persistence and future recurring instance cleanup
- tags and tag groups
- calendar events
- briefing items
- preferences
- memos
- task post categories and task posts
- Highlights post rollups
- Canvas state read/save
- dashboard insight filters
- workstream similarity suggestions
- personal notifications read/mark-read/mark-all-read
- deterministic AI read APIs
- LLM-Wiki search/read/source/recommendation/draft/review/Error Book APIs

### 아직 운영 적용 전인 범위

아래는 회사 적용 담당자가 이번에 구현할 기능이 아니라, 운영 안정화 후 별도 phase로 다룰 항목입니다.

- Teams push
- realtime/WebSocket/SSE
- OpenAI/HERmes production secrets and tool-calling
- production image/OCR storage
- Canvas simultaneous editing conflict handling
- multi-workspace or multi-group separation
- company SSO
- production backup/restore automation

## 3. 먼저 읽을 파일

회사 담당자는 아래 순서로 읽으면 됩니다.

1. `AGENTS.md`
2. `docs/company-backend-apply-handoff.md`
3. `docs/company-fastapi-postgres-beginner-runbook.md`
4. `docs/fastapi-postgres-backend-spec.md`
5. `docs/backend-api-spec.md`
6. `docs/permission-rules.md`
7. `HANDOFF.md`
8. `TODO.md`

`docs/company-fastapi-postgres-beginner-runbook.md`는 초보자용 상세 절차입니다. 이 문서는 그보다 더 짧은 최종 적용 handoff입니다.

## 4. Clone 또는 branch 전환

### 새 폴더로 받는 경우

```bash
git clone -b codex/llm-wiki-architecture https://github.com/SSG87-pos/work-dashborad.git work-dashboard-fastapi
cd work-dashboard-fastapi
git status
```

기대 상태:

```text
On branch codex/llm-wiki-architecture
nothing to commit, working tree clean
```

### 기존 폴더가 있는 경우

```bash
cd work-dashborad
git status
git fetch origin
git checkout codex/llm-wiki-architecture
git pull
```

기존 폴더에 local changes가 있으면 먼저 백업하거나 별도 브랜치에 커밋한 뒤 전환합니다. 회사 서버에서 운영 적용 중 `.env`, `.env.local`은 Git에 올리지 않습니다.

## 5. 회사 서버 준비물

필수:

- Git
- Node.js 20+
- pnpm
- Python 3.11+
- PostgreSQL 15+
- 내부망에서 frontend 포트와 FastAPI 포트 접근 허용

권장 포트:

| 용도 | 포트 | 비고 |
| --- | --- | --- |
| Frontend dev/demo | `10097` | 브라우저 화면 |
| FastAPI | `18080` | API 서버 |
| PostgreSQL | `5432` | 가능하면 서버 로컬만 |

PostgreSQL은 외부 PC에 직접 열지 말고, FastAPI만 내부망에 노출하는 구성을 권장합니다.

## 6. Frontend 준비

회사 서버에서:

```bash
pnpm install
pnpm run check:demo-readiness
CI=true pnpm run build
```

dev/demo 실행:

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```

브라우저 접속:

```text
http://<company-server-ip>:10097/
```

## 7. PostgreSQL 준비

예시 DB/계정:

```text
database: work_dashboard
user: work_dashboard_user
```

Ubuntu/Debian 예시:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo -u postgres createuser work_dashboard_user
sudo -u postgres createdb work_dashboard
sudo -u postgres psql
```

PostgreSQL shell에서:

```sql
alter user work_dashboard_user with encrypted password '회사에서_정한_강한_비밀번호';
grant all privileges on database work_dashboard to work_dashboard_user;
\q
```

회사 정책상 `sudo` 대신 `gksudo`, `gsudo`, `pkexec`, `doas` 등을 써야 하면 회사에서 허용한 관리자 권한 명령으로 바꿉니다.

## 8. Backend 환경 설정

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env
```

`backend/.env` 예시:

```bash
APP_ENV=company
APP_NAME=work-dashboard-api
API_HOST=0.0.0.0
API_PORT=18080

DATABASE_URL=postgresql+psycopg://work_dashboard_user:<db-password>@127.0.0.1:5432/work_dashboard

JWT_SECRET=<32-bytes-or-longer-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14

CORS_ORIGINS=http://localhost:10097,http://127.0.0.1:10097,http://<company-server-ip>:10097
FIRST_ADMIN_EMAIL=<first-admin-company-email>
FIRST_ADMIN_NAME=<first-admin-name>
FIRST_ADMIN_TITLE=<first-admin-title>
FIRST_ADMIN_PASSWORD=<temporary-strong-password-change-after-login>
```

주의:

- `.env`는 절대 Git에 올리지 않습니다.
- `FIRST_ADMIN_PASSWORD`는 `CHANGE_ME_BEFORE_SEED` 그대로 두면 seed가 실패하도록 되어 있습니다.
- bcrypt 제한 때문에 `FIRST_ADMIN_PASSWORD`는 72 bytes 이하로 둡니다.
- `JWT_SECRET`은 예측 불가능한 긴 문자열을 사용합니다.

## 9. Backend DB migration and seed

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
work-dashboard-api seed-first-admin
```

기대 결과:

```text
Seeded admin: <first-admin-company-email>
```

Alembic head 확인:

```bash
alembic heads
```

기대 결과:

```text
20260625_0012 (head)
```

## 10. Backend 실행과 smoke

개발/검증 실행:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

다른 터미널에서:

```bash
curl http://127.0.0.1:18080/api/v1/health
curl http://127.0.0.1:18080/api/v1/health/db
```

기대 응답:

```json
{"status":"ok","app":"work-dashboard-api","env":"company"}
```

```json
{"status":"ok","database":"ok"}
```

로그인 smoke:

```bash
curl -X POST http://127.0.0.1:18080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<first-admin-company-email>","password":"<first-admin-password>"}'
```

응답에 access token이 오면 인증 API가 동작하는 것입니다. token 값은 채팅/문서/이메일에 붙여넣지 않습니다.

## 11. Frontend를 FastAPI에 연결

프로젝트 root에 `.env.local`을 만듭니다.

```bash
VITE_API_BASE_URL=http://<company-server-ip>:18080/api/v1
```

이 값이 있으면 `src/apiStore.js`가 FastAPI mode로 동작합니다.

다시 frontend 실행:

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```

브라우저에서:

```text
http://<company-server-ip>:10097/
```

확인할 것:

- 첫 관리자 계정으로 로그인
- `관리자 > 사람 관리` 접근
- roster 생성/수정
- 업무 생성
- 업무 상태 변경
- 하위업무 체크
- 업데이트 로그 작성/수정/삭제
- 업무 노트 작성/수정/삭제
- 일정 생성/수정/삭제
- 브리핑/팀 체크 작성
- 새로고침 후 데이터 유지
- 다른 브라우저에서 같은 데이터 조회

## 12. systemd 운영 예시

검증 후 상시 실행이 필요하면 예시 service를 만듭니다.

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

예시 명령:

```bash
sudo systemctl daemon-reload
sudo systemctl enable work-dashboard-api
sudo systemctl start work-dashboard-api
sudo systemctl status work-dashboard-api
sudo journalctl -u work-dashboard-api -f
```

회사 서버 경로와 실행 user/group은 실제 운영 정책에 맞춥니다.

## 13. 회사 적용 완료 기준

완료라고 말하려면 아래가 모두 확인되어야 합니다.

- `git status`가 clean
- `pnpm run check:demo-readiness` 통과
- `CI=true pnpm run build` 통과
- `cd backend && python -m pytest` 통과
- `cd backend && alembic upgrade head` 성공
- `cd backend && alembic heads`가 `20260625_0012 (head)` 표시
- `work-dashboard-api seed-first-admin` 성공
- `curl /api/v1/health` 성공
- `curl /api/v1/health/db` 성공
- admin login 성공
- frontend `.env.local`의 `VITE_API_BASE_URL`이 회사 FastAPI 주소를 가리킴
- 브라우저에서 생성/수정/삭제/새로고침/다른 브라우저 조회 QA 통과
- member/lead/admin 역할별 접근 차이를 최소 2계정 이상으로 확인
- `.env`, `.env.local`, token, DB password, JWT secret이 Git과 문서에 노출되지 않음

## 14. 알려진 경계와 주의사항

- UI에서 admin 탭이 숨겨진다고 backend 보안이 완성되는 것은 아닙니다. 운영 판정은 FastAPI endpoint 권한 검사와 실제 계정 smoke로 합니다.
- localStorage fallback은 계속 남아 있습니다. `VITE_API_BASE_URL`이 비어 있으면 회사 DB가 아니라 local fallback으로 동작할 수 있습니다.
- Supabase 문서와 migration은 과거 설계 참고입니다. 현재 회사 운영 기준은 FastAPI + PostgreSQL입니다.
- `release/company-fastapi-postgres`는 backend 기준선이지만 최신 최종 검증본은 `codex/llm-wiki-architecture`입니다.
- production backup, monitoring, HTTPS/reverse proxy, SSO, Teams, realtime은 회사 운영 정책 확정 후 별도 phase로 진행합니다.

## 15. 다음 담당자에게 줄 Codex 요청문

```text
AGENTS.md와 docs/company-backend-apply-handoff.md를 먼저 읽고 진행해줘.

목표는 GitHub repo https://github.com/SSG87-pos/work-dashborad.git 의
codex/llm-wiki-architecture 브랜치를 회사 서버에 받아서,
이미 구현된 FastAPI + PostgreSQL backend를 회사 PostgreSQL에 연결하고
frontend를 VITE_API_BASE_URL로 붙여 실제 브라우저 smoke까지 완료하는 것이다.

새 기능 개발은 하지 말고 다음만 진행해줘:
1. git clone 또는 checkout 상태 확인
2. PostgreSQL DB/user 준비
3. backend/.env 작성
4. backend venv 설치
5. alembic upgrade head
6. work-dashboard-api seed-first-admin
7. uvicorn 실행
8. /api/v1/health 와 /api/v1/health/db curl smoke
9. frontend .env.local에 VITE_API_BASE_URL 설정
10. 브라우저에서 admin login, 업무 생성/수정/삭제, 일정, 브리핑, 알림/관리자 화면 smoke
11. member/lead/admin 권한 smoke
12. 검증 결과와 남은 운영 리스크를 HANDOFF.md/TODO.md에 업데이트

주의:
- .env, .env.local, DB password, JWT secret, access token은 절대 커밋하거나 답변에 노출하지 말 것.
- Supabase 경로는 과거 참고이며, 이번 운영 기준은 FastAPI + PostgreSQL이다.
- 회사 적용 완료 판정은 /health/db와 브라우저 저장 지속성 확인 후에만 내릴 것.
```
