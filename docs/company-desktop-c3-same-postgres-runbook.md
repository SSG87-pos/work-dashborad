# Company Desktop to C3 Same-PostgreSQL Runbook

작성 기준일: 2026-06-30

이 문서는 비전문가 담당자가 순서대로 따라 해서 `연구기획그룹-전략` Work Dashboard backend를 회사 PostgreSQL에 연결하고, 회사 데스크탑에서 먼저 검증한 뒤, C3 서버에서 같은 PostgreSQL을 바라보며 실행하기 위한 절차입니다.

이 문서의 기준 구조는 아래와 같습니다.

```text
외부 GitHub 원본
  - 최초 코드 기준: https://github.com/SSG87-pos/work-dashborad.git
  - branch: codex/llm-wiki-architecture

회사 데스크탑
  - 외부 GitHub 또는 회사 GitLab에서 코드 clone
  - backend 설치
  - 같은 PostgreSQL에 migration 1회 적용
  - 첫 관리자 생성
  - backend/frontend 연결 smoke
  - 필요한 코드 수정 후 회사 GitLab에 push

회사 GitLab
  - 소스 코드, migration 파일, 문서만 전달
  - .env, 비밀번호, 설치 결과물은 전달하지 않음
  - C3 서버가 pull하는 운영 기준 remote

C3 서버
  - 회사 GitLab에서 같은 branch pull
  - 같은 PostgreSQL을 바라보는 env 설정
  - dependency 재설치
  - alembic current/head로 같은 DB 상태 확인
  - backend/frontend 실행 smoke
```

## 1. 절대 지켜야 할 원칙

### 1.1 Git은 설치 결과를 옮기는 도구가 아닙니다

Git에 올리는 것은 코드입니다.

Git에 올릴 수 있는 것:

- `backend/app/**`
- `backend/alembic/versions/**`
- `backend/tests/**`
- `backend/pyproject.toml`
- `src/**`
- `scripts/**`
- `docs/**`
- `AGENTS.md`
- `HANDOFF.md`
- `TODO.md`
- `package.json`
- `pnpm-lock.yaml`이 실제로 바뀐 경우의 lockfile

Git에 올리면 안 되는 것:

- `backend/.env`
- `.env.local`
- DB password
- JWT secret
- access token
- API key
- `backend/.venv/`
- `node_modules/`
- `dist/`
- DB dump
- 로그 파일
- 개인 PC 경로가 들어간 설정 파일

### 1.2 migration은 파일과 실행 결과가 다릅니다

`backend/alembic/versions/` 아래 migration 파일은 Git에 올립니다.

하지만 `alembic upgrade head`를 실행해서 DB 구조가 바뀐 결과는 Git에 올라가지 않습니다. DB 안에 적용되는 것입니다.

현재 회사 운영 전제는 회사 데스크탑과 C3가 같은 PostgreSQL을 바라보는 구조입니다.

따라서:

- 회사 데스크탑에서 `alembic upgrade head`를 한 번 실행합니다.
- C3에서는 같은 DB가 이미 head인지 `alembic current`, `alembic heads`로 확인합니다.
- C3가 나중에 다른 PostgreSQL을 바라보게 바뀌면 그때는 C3 DB에도 `alembic upgrade head`를 따로 실행합니다.

### 1.3 같은 PostgreSQL인지 반드시 확인합니다

회사 데스크탑과 C3의 `DATABASE_URL`은 같은 DB를 가리켜야 합니다.

확인할 항목:

```text
DB host
DB port
DB name
DB user
DB schema/search_path 정책
```

비밀번호는 문서나 채팅에 적지 않습니다.

## 2. 준비물 체크리스트

작업 전에 아래를 확인합니다.

```text
[ ] GitHub repo 접근 가능
[ ] 회사 GitLab repo 생성 또는 접근 가능
[ ] 회사 GitLab repo URL 확인
[ ] branch 이름 확인: codex/llm-wiki-architecture
[ ] 회사 PostgreSQL 접속 정보 확보
[ ] 회사 데스크탑에서 PostgreSQL host에 접속 가능
[ ] C3 서버에서도 같은 PostgreSQL host에 접속 가능
[ ] Python 3.11 이상 사용 가능
[ ] Node.js 20.20.2 사용 가능
[ ] pnpm 사용 가능
[ ] C3에서 env/secret을 넣는 방법 확인
[ ] C3에서 노출할 backend port 또는 URL 확인
[ ] C3에서 frontend를 실행할지, 별도 정적 배포할지 확인
```

권장 포트:

```text
Backend FastAPI: 18080
Frontend dev/demo: 10097
```

## 3. 회사 데스크탑에서 코드 받기

최초 기준 코드는 아래 외부 GitHub branch입니다.

```text
source repo: https://github.com/SSG87-pos/work-dashborad.git
source branch: codex/llm-wiki-architecture
```

회사 정책상 외부 GitHub clone이 허용되는 회사 데스크탑이라면 처음 받을 때 아래처럼 진행합니다.

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout codex/llm-wiki-architecture
git pull origin codex/llm-wiki-architecture
```

이미 폴더가 있는 경우:

```bash
cd work-dashborad
git fetch origin
git checkout codex/llm-wiki-architecture
git pull --ff-only origin codex/llm-wiki-architecture
```

현재 받은 코드 확인:

```bash
git log -1 --oneline
git status --short
```

정상 상태:

- `git log -1 --oneline`은 현재 commit 한 줄을 보여줍니다.
- `git status --short`에 아무 파일도 나오지 않으면 깨끗한 상태입니다.

## 4. 회사 GitLab remote 준비

회사 C3 서버가 외부 GitHub를 직접 보지 않고 회사 GitLab만 볼 예정이면, 회사 데스크탑에서 검증한 코드를 회사 GitLab으로 올려야 합니다.

회사 GitLab에 빈 repository를 먼저 만듭니다. 예시 이름:

```text
work-dashboard
```

회사 GitLab URL 예시:

```text
https://gitlab.company.example/path/work-dashboard.git
```

또는 SSH 방식:

```text
git@gitlab.company.example:path/work-dashboard.git
```

회사 데스크탑의 repo에서 remote를 확인합니다.

```bash
git remote -v
```

외부 GitHub를 `origin`으로 유지하고 회사 GitLab을 `company`라는 이름으로 추가하는 방식을 권장합니다.

```bash
git remote add company <company-gitlab-repo-url>
git remote -v
```

예시:

```bash
git remote add company https://gitlab.company.example/path/work-dashboard.git
```

또는:

```bash
git remote add company git@gitlab.company.example:path/work-dashboard.git
```

처음 회사 GitLab에 branch를 올릴 때:

```bash
git push -u company codex/llm-wiki-architecture
```

성공 후에는 회사 GitLab 화면에서 branch가 보이는지 확인합니다.

주의:

- 회사 GitLab에는 코드와 migration 파일만 올립니다.
- `.env`, `.env.local`, `.venv`, `node_modules`, `dist`, DB dump는 올리지 않습니다.
- 회사 GitLab의 `main` 또는 보호 branch 정책이 따로 있으면 회사 정책에 맞춰 merge request를 사용합니다.
- 운영 기준 branch를 `main`으로 바꿀지, `codex/llm-wiki-architecture`를 그대로 쓸지는 회사 GitLab 운영 정책에 맞춥니다. C3가 어떤 branch를 pull할지 문서에 남깁니다.

## 5. 회사 데스크탑 backend 환경파일 만들기

프로젝트 root에서 backend 폴더로 이동합니다.

```bash
cd backend
cp .env.example .env
```

`backend/.env`를 편집합니다.

예시:

```text
APP_ENV=company
DATABASE_URL=postgresql+psycopg://<db_user>:<db_password>@<postgres_host>:5432/<db_name>
JWT_SECRET_KEY=<long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://127.0.0.1:10097,http://<company-desktop-ip>:10097,http://<c3-frontend-host>:10097
FIRST_ADMIN_EMAIL=<first-admin-company-email>
FIRST_ADMIN_PASSWORD=<temporary-first-admin-password>
```

주의:

- `<db_password>`는 실제 값으로 넣지만 Git에 올리지 않습니다.
- `JWT_SECRET_KEY`는 길고 예측 불가능한 문자열을 사용합니다.
- `FIRST_ADMIN_PASSWORD`는 기본값을 쓰지 않습니다.
- 회사 데스크탑과 C3가 같은 PostgreSQL을 써야 하므로, C3 env에도 같은 DB host/name을 넣을 예정입니다.

## 6. 회사 데스크탑 backend 설치

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
```

성공 기준:

- `pip install`이 error 없이 끝납니다.
- 마지막에 prompt가 다시 돌아옵니다.

실패할 때 확인:

- Python 버전이 너무 낮지 않은지 확인합니다.
- 회사망에서 Python package registry 접근이 막혀 있는지 확인합니다.
- SSL/proxy 문제가 있으면 회사 IT 정책에 맞는 proxy 설정이 필요합니다.

## 7. 회사 데스크탑에서 같은 PostgreSQL에 migration 적용

`backend/.env`가 회사 PostgreSQL을 바라보는지 다시 확인한 뒤 실행합니다.

```bash
alembic upgrade head
```

이 명령은 실제 PostgreSQL 테이블 구조를 최신 상태로 만듭니다.

그 다음 현재 DB revision과 코드의 head를 확인합니다.

```bash
alembic current
alembic heads
```

기대 결과:

```text
20260625_0012
20260625_0012 (head)
```

정확한 출력 형식은 조금 다를 수 있지만, 핵심은 `current`와 `heads`가 같은 최신 revision을 가리키는 것입니다.

실패할 때 확인:

- `DATABASE_URL`이 틀렸는지 확인합니다.
- PostgreSQL host/port 접근이 막혔는지 확인합니다.
- DB user에게 table 생성 권한이 있는지 확인합니다.
- 이미 다른 schema에 적용한 것은 아닌지 확인합니다.

## 8. 첫 관리자 계정 생성

`backend/.env`의 아래 값이 실제로 들어가 있어야 합니다.

```text
FIRST_ADMIN_EMAIL=<first-admin-company-email>
FIRST_ADMIN_PASSWORD=<temporary-first-admin-password>
```

그 다음 실행합니다.

```bash
work-dashboard-api seed-first-admin
```

성공 기준:

```text
Seeded admin: <first-admin-company-email>
```

이미 생성되어 있으면 중복 생성 대신 기존 계정 관련 메시지가 나올 수 있습니다. error가 아니라면 다음 단계로 진행합니다.

주의:

- 첫 관리자 비밀번호는 임시값입니다.
- 운영 전 회사 정책에 맞게 변경합니다.
- 비밀번호를 문서, 채팅, Git commit에 남기지 않습니다.

## 9. 회사 데스크탑에서 backend 실행

backend 폴더에서 가상환경이 켜진 상태로 실행합니다.

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

터미널이 실행 상태로 멈춰 있으면 정상입니다. 이 터미널은 backend 서버가 떠 있는 창입니다.

새 터미널을 열어 health를 확인합니다.

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

실패할 때 확인:

- uvicorn 서버가 켜져 있는지 확인합니다.
- port `18080`이 다른 프로그램과 충돌하지 않는지 확인합니다.
- `/health`는 되는데 `/health/db`가 실패하면 DB 연결 문제입니다.

## 10. 회사 데스크탑에서 frontend를 backend에 연결

프로젝트 root로 돌아갑니다.

```bash
cd ..
```

프로젝트 root에 `.env.local` 파일을 만듭니다.

회사 데스크탑에서 자기 PC의 backend를 볼 때:

```text
VITE_API_BASE_URL=http://127.0.0.1:18080/api/v1
```

다른 PC 또는 C3 backend를 볼 때:

```text
VITE_API_BASE_URL=http://<backend-host-or-ip>:18080/api/v1
```

중요:

- 이 값이 없으면 frontend가 FastAPI mode가 아니라 local fallback/demo 모드처럼 보일 수 있습니다.
- 회사 runtime에서는 예전 demo 사용자와 demo 업무가 자동으로 보이면 안 됩니다.

## 11. 회사 데스크탑에서 frontend 실행

프로젝트 root에서 실행합니다.

```bash
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

브라우저에서 엽니다.

```text
http://127.0.0.1:10097/
```

또는 내부망 다른 PC에서 볼 때:

```text
http://<company-desktop-ip>:10097/
```

로그인:

- 이메일: `FIRST_ADMIN_EMAIL`
- 비밀번호: `FIRST_ADMIN_PASSWORD`

## 12. 회사 데스크탑 브라우저 smoke

아래를 순서대로 확인합니다.

```text
[ ] 첫 관리자 계정으로 로그인된다.
[ ] 로그인 화면에 예전 demo 계정 목록이 보이지 않는다.
[ ] 관리자 > 사람 관리에 들어갈 수 있다.
[ ] roster 사용자를 생성하거나 수정할 수 있다.
[ ] 업무를 새로 만들 수 있다.
[ ] 업무 상태를 바꿀 수 있다.
[ ] 하위업무 체크가 된다.
[ ] 업데이트 로그를 작성/수정/삭제할 수 있다.
[ ] 업무 Note를 작성/수정/삭제할 수 있다.
[ ] 일정을 생성/수정/삭제할 수 있다.
[ ] 브리핑 또는 팀 체크를 작성할 수 있다.
[ ] 브라우저 새로고침 후 데이터가 유지된다.
[ ] 로그아웃 후 이전 dashboard 화면이 남지 않는다.
[ ] 신규/빈 회사 DB에서 예전 demo 사용자나 demo 업무가 자동으로 보이지 않는다.
```

이 중 하나라도 실패하면 C3로 넘기기 전에 원인을 확인합니다.

## 13. 회사 데스크탑에서 코드 수정이 생겼을 때

검증 과정에서 코드, migration, 문서를 수정했다면 회사 GitLab에 올립니다.

먼저 변경 파일을 확인합니다.

```bash
git status --short
git diff --name-only
```

나오면 안 되는 파일:

```text
backend/.env
.env.local
backend/.venv/
node_modules/
dist/
*.log
DB dump
```

검증 명령:

```bash
git diff --check
pnpm run check:api-store
pnpm run check:fastapi-runtime-mode
CI=true pnpm run build
```

backend 검증:

```bash
cd backend
source .venv/bin/activate
python -m pytest
alembic current
alembic heads
cd ..
```

성공 후 commit:

```bash
git add -A
git commit -m "fix: prepare company backend runtime"
```

회사 GitLab으로 push:

```bash
git push company codex/llm-wiki-architecture
```

만약 회사 GitLab 운영 branch가 `main`이라면 회사 정책에 따라 merge request를 만들거나, 승인된 경우에만 아래처럼 push합니다.

```bash
git push company codex/llm-wiki-architecture:main
```

일반적으로는 보호 branch에 직접 push하지 말고 merge request를 권장합니다.

push가 끝나면 commit을 기록합니다.

```bash
git log -1 --oneline
```

이 commit을 C3에서 회사 GitLab을 통해 받아야 합니다.

## 14. C3 서버에서 회사 GitLab의 같은 commit 받기

C3 서버는 회사 GitLab에서 받는 것을 기준으로 합니다.

회사 GitLab URL 예시:

```text
https://gitlab.company.example/path/work-dashboard.git
```

C3 서버에서 처음 받는 경우:

```bash
git clone <company-gitlab-repo-url>
cd work-dashborad
git checkout codex/llm-wiki-architecture
```

이미 받은 폴더가 있는 경우:

```bash
cd work-dashborad
git fetch origin
git checkout codex/llm-wiki-architecture
git pull --ff-only origin codex/llm-wiki-architecture
```

여기서 C3 repo의 `origin`은 회사 GitLab이어야 합니다.

확인:

```bash
git remote -v
```

정상 예:

```text
origin  https://gitlab.company.example/path/work-dashboard.git (fetch)
origin  https://gitlab.company.example/path/work-dashboard.git (push)
```

commit 확인:

```bash
git log -1 --oneline
git status --short
```

성공 기준:

- `git log -1 --oneline`이 회사 데스크탑에서 회사 GitLab에 push한 commit과 같습니다.
- `git status --short`가 비어 있습니다.

## 15. C3 backend env/secret 설정

C3의 secret/env 설정 화면 또는 서버 환경변수에 아래 값을 넣습니다.

```text
APP_ENV=company
DATABASE_URL=postgresql+psycopg://<same_db_user>:<same_db_password>@<same_postgres_host>:5432/<same_db_name>
JWT_SECRET_KEY=<company-runtime-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://<c3-frontend-host>:10097
```

중요:

- `DATABASE_URL`은 회사 데스크탑에서 migration한 PostgreSQL과 같은 DB를 가리켜야 합니다.
- C3에서 같은 DB를 바라보지 않으면 `alembic current`가 다르게 나오거나 `/health/db`가 실패할 수 있습니다.
- secret 값은 Git에 넣지 않습니다.

## 16. C3 backend 설치

C3 서버에서 backend 폴더로 이동합니다.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

C3가 container install command를 따로 받는 경우:

```text
install command: cd backend && pip install -e .
```

## 17. C3에서 같은 PostgreSQL 상태 확인

같은 PostgreSQL을 쓰는 구조이므로, C3에서는 먼저 확인합니다.

```bash
alembic current
alembic heads
```

정상 기준:

```text
current가 heads와 같은 revision을 가리킨다.
heads에는 20260625_0012 (head)가 보인다.
```

만약 다르면 바로 진행하지 않습니다.

다를 때 의심할 것:

```text
1. C3 DATABASE_URL이 회사 데스크탑과 다른 DB를 바라봄
2. 회사 데스크탑에서 migration을 실제 운영 DB에 적용하지 않음
3. C3 env가 아직 적용되지 않음
4. C3 process가 오래된 env를 보고 있음
```

정말 C3가 별도 DB를 바라보는 구조로 바뀐 것이 확정된 경우에만 아래를 실행합니다.

```bash
alembic upgrade head
```

현재 전제에서는 이 명령이 C3의 기본 단계가 아닙니다. 기본은 `current/head 확인`입니다.

## 18. C3 backend 실행

직접 실행:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

C3 start command:

```text
start command: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 18080
```

health 확인:

```bash
curl http://127.0.0.1:18080/api/v1/health
curl http://127.0.0.1:18080/api/v1/health/db
```

정상 응답:

```json
{"status":"ok","app":"work-dashboard-api","env":"company"}
```

```json
{"status":"ok","database":"ok"}
```

`/health`는 되는데 `/health/db`가 안 되면 앱은 켜졌지만 DB 연결이 안 되는 상태입니다.

## 19. C3 frontend 연결

C3에서 frontend를 같이 실행한다면, frontend build 또는 dev 실행 전에 아래 값을 설정합니다.

```text
VITE_API_BASE_URL=http://<c3-api-host-or-ip>:18080/api/v1
```

내부 확인용 dev 실행:

```bash
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

운영 build:

```bash
pnpm install
CI=true pnpm run build
```

주의:

- Vite의 `VITE_` 환경변수는 frontend build 시점에 반영됩니다.
- build 후에 `VITE_API_BASE_URL`만 바꿔도 이미 만들어진 정적 파일에는 반영되지 않을 수 있습니다.
- API 주소를 바꾸면 다시 build하는 것이 안전합니다.

## 20. C3 브라우저 smoke

브라우저에서 C3 frontend 주소를 엽니다.

```text
http://<c3-frontend-host>:10097/
```

확인:

```text
[ ] 관리자 로그인 성공
[ ] 예전 demo 계정 목록이 로그인 화면에 보이지 않음
[ ] 관리자 > 사람 관리 접근 성공
[ ] 업무 생성 성공
[ ] 업무 수정 성공
[ ] 업무 삭제 또는 보관 성공
[ ] 일정 생성/수정/삭제 성공
[ ] 브리핑 작성 성공
[ ] 새로고침 후 데이터 유지
[ ] 다른 브라우저에서 같은 데이터 조회
[ ] 로그아웃 후 이전 dashboard state가 남지 않음
[ ] /api/v1/health/db 성공
```

이 smoke는 회사 데스크탑 smoke와 별개입니다. 같은 DB를 쓰더라도 C3 app runtime, CORS, port, env, frontend build가 다르기 때문입니다.

## 21. 완료 판정

아래가 모두 맞으면 회사 적용 완료라고 볼 수 있습니다.

```text
[ ] 회사 데스크탑과 C3가 같은 PostgreSQL을 바라본다.
[ ] 회사 데스크탑에서 alembic upgrade head 성공.
[ ] 회사 데스크탑에서 alembic current와 heads가 같은 head를 가리킨다.
[ ] 회사 데스크탑에서 회사 GitLab에 commit을 push했다.
[ ] C3에서 회사 GitLab의 같은 commit을 pull했다.
[ ] C3에서 alembic current가 같은 head를 가리킨다.
[ ] C3 /api/v1/health 성공.
[ ] C3 /api/v1/health/db 성공.
[ ] frontend VITE_API_BASE_URL이 C3 backend 주소를 가리킨다.
[ ] 관리자 로그인 성공.
[ ] 업무/일정/브리핑 생성과 새로고침 유지 성공.
[ ] 로그아웃 정상.
[ ] demo 사용자/업무가 자동으로 보이지 않음.
[ ] .env, .env.local, password, token이 Git에 올라가지 않음.
```

## 22. 자주 나는 문제

### 22.1 화면에 예전 demo 사용자가 보임

확인:

```text
1. frontend에 VITE_API_BASE_URL이 설정되어 있는가?
2. VITE_API_BASE_URL을 설정한 뒤 frontend를 다시 build 또는 dev restart 했는가?
3. backend /me, /admin/roster API가 실제 회사 사용자를 반환하는가?
4. DB seed에 demo 사용자를 넣은 것은 아닌가?
```

### 22.2 로그아웃했는데 이전 화면이 남음

확인:

```text
1. 최신 commit을 회사 GitLab에 push했고 C3가 그 commit을 받았는가?
2. frontend build가 최신 코드로 다시 되었는가?
3. 브라우저 cache가 오래된 정적 파일을 보고 있지 않은가?
```

### 22.3 C3에서 /health는 되는데 /health/db가 실패

확인:

```text
1. C3 DATABASE_URL이 설정되어 있는가?
2. C3에서 PostgreSQL host/port에 접근 가능한가?
3. DB user/password가 맞는가?
4. DB user에게 schema/table 조회 권한이 있는가?
5. C3 process가 새 env를 반영하도록 restart 되었는가?
```

### 22.4 회사 데스크탑에서는 되는데 C3에서 로그인 실패

확인:

```text
1. C3도 같은 PostgreSQL을 바라보는가?
2. 첫 관리자 계정이 같은 DB에 생성되어 있는가?
3. JWT_SECRET_KEY가 C3에서 정상 설정되어 있는가?
4. CORS_ORIGINS에 C3 frontend 주소가 들어가 있는가?
```

### 22.5 C3 alembic current가 비어 있거나 다름

확인:

```text
1. C3가 다른 DB를 바라보고 있을 가능성이 큼.
2. DATABASE_URL의 host/name/user를 회사 데스크탑과 비교.
3. 같은 DB가 맞는데 current가 다르면 회사 데스크탑 migration이 실제 운영 DB에 적용됐는지 확인.
```

### 22.6 C3가 외부 GitHub를 볼 수 없음

정상입니다. 이 문서의 기준은 C3가 회사 GitLab을 보는 구조입니다.

확인:

```text
1. 회사 데스크탑에서 외부 GitHub 코드를 회사 GitLab에 push했는가?
2. C3의 git remote -v가 회사 GitLab URL을 가리키는가?
3. C3에서 회사 GitLab 접근 권한 또는 deploy key/token이 설정되어 있는가?
4. C3에서 받은 commit이 회사 데스크탑에서 push한 commit과 같은가?
```

## 23. 담당자에게 전달할 짧은 지시문

```text
docs/company-desktop-c3-same-postgres-runbook.md를 보고 순서대로 진행해 주세요.

전제:
- 최초 코드는 외부 GitHub의 codex/llm-wiki-architecture branch에서 받습니다.
- 회사 로컬 PC에서 backend 작업과 smoke를 합니다.
- 검증된 코드는 회사 GitLab에 push합니다.
- C3 서버는 회사 GitLab에서 같은 commit을 pull합니다.
- 회사 데스크탑과 C3 서버는 같은 PostgreSQL을 사용합니다.
- migration은 회사 데스크탑에서 alembic upgrade head로 1회 적용합니다.
- C3에서는 같은 DB의 alembic current/head와 /health/db를 확인하고 앱을 실행합니다.
- Git에는 코드, migration 파일, 문서만 올립니다.
- .env, .env.local, DB password, JWT secret, token, .venv, node_modules, dist, DB dump는 절대 올리지 않습니다.

완료 기준:
- 회사 GitLab에 검증 commit이 올라감
- C3가 회사 GitLab에서 같은 commit을 받음
- C3 /health 및 /health/db 성공
- frontend가 VITE_API_BASE_URL로 C3 backend에 연결됨
- 관리자 로그인 및 업무/일정/브리핑 저장 지속성 확인
- demo 사용자/업무가 자동으로 보이지 않음
- 로그아웃 후 이전 화면이 남지 않음
```
