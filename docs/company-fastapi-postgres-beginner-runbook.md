# Company FastAPI + PostgreSQL Beginner Runbook

작성 기준일: 2026-06-09

이 문서는 FastAPI와 PostgreSQL을 한 번도 써본 적 없는 사람이 회사 리눅스 PC/서버에서 `연구기획그룹-전략` 대시보드를 backend 연결 방식으로 준비할 수 있도록 만든 단계별 매뉴얼입니다.

## 0. 먼저 꼭 알아야 하는 현재 상태

현재 GitHub 브랜치 `release/company-fastapi-postgres`에는 다음이 들어 있습니다.

- 지금까지 만든 React/Vite 대시보드 화면
- POSLAB 랜딩/대시보드 UI
- 업무, 업무 노트, 업무 인박스, 팀 체크, Canvas, Highlights 등 프론트 기능
- FastAPI + PostgreSQL 구현 명세 문서

아직 들어 있지 않은 것:

- 실제 `backend/` FastAPI 코드
- 실제 PostgreSQL migration 코드
- 실제 API 저장 연결 코드

따라서 회사 PC에서 바로 할 일은 두 단계입니다.

1. 먼저 `release/company-fastapi-postgres` 브랜치를 받는다.
2. 그 다음 Codex에게 `backend/` FastAPI 구현을 시킨다.

이 문서는 두 과정을 모두 설명합니다.

## 1. 용어 아주 쉽게 이해하기

| 용어 | 의미 |
| --- | --- |
| Frontend | 브라우저에서 보이는 대시보드 화면입니다. 지금 만든 React/Vite 앱입니다. |
| Backend | 데이터를 저장하고 읽어주는 서버입니다. 이번에는 FastAPI로 만듭니다. |
| FastAPI | Python으로 API 서버를 만드는 도구입니다. 브라우저 화면과 DB 사이에서 중간 역할을 합니다. |
| PostgreSQL | 실제 업무 데이터가 저장되는 데이터베이스입니다. |
| API | 프론트가 백엔드에게 요청하는 주소 묶음입니다. 예: `/api/v1/tasks`. |
| Branch | Git에서 작업 기준선을 나눠둔 것입니다. 이번 backend 기준은 `release/company-fastapi-postgres`입니다. |
| `.env` | 비밀번호, DB 주소, API 주소처럼 환경마다 달라지는 값을 적는 파일입니다. Git에 올리면 안 됩니다. |

최종 구조:

```text
사용자 브라우저
  -> React/Vite 대시보드
  -> FastAPI API 서버
  -> PostgreSQL DB
```

## 2. 회사 PC에서 브랜치 받기

### 2.1 기존 폴더를 그대로 쓸 경우

이미 회사 PC에 `work-dashborad` 폴더가 있다면 새로 clone하지 않고 브랜치만 바꿀 수 있습니다.

먼저 폴더로 이동합니다.

```bash
cd work-dashborad
```

현재 수정된 파일이 있는지 확인합니다.

```bash
git status
```

출력에 `nothing to commit, working tree clean` 같은 문장이 있으면 안전합니다.

그 다음 새 브랜치를 받습니다.

```bash
git fetch origin
git checkout release/company-fastapi-postgres
git pull
pnpm install
```

만약 `pnpm: command not found`가 나오면 아래 `3. Node.js와 pnpm 준비`를 먼저 진행합니다.

### 2.2 새 폴더로 안전하게 받을 경우

기존 데모 폴더를 남겨두고 새 폴더에 받는 방법입니다. 가장 안전합니다.

```bash
git clone -b release/company-fastapi-postgres https://github.com/SSG87-pos/work-dashborad.git work-dashboard-fastapi
cd work-dashboard-fastapi
pnpm install
```

이 방식이면 기존 랜딩/데모 폴더를 건드리지 않습니다.

## 3. Node.js와 pnpm 준비

프론트엔드 실행에는 Node.js와 pnpm이 필요합니다.

### 3.0 관리자 권한 명령 확인

회사 리눅스에서는 `sudo`를 직접 쓸 수 없고 `gksudo`, `gsudo`, `pkexec` 같은 별도 관리자 권한 명령을 쓰는 경우가 있습니다. 슬기님이 기억한 `g*sudo`는 보통 `gksudo` 또는 `gsudo`일 가능성이 큽니다.

먼저 어떤 명령이 있는지 확인합니다.

```bash
command -v sudo
command -v gsudo
command -v gksudo
command -v pkexec
command -v doas
```

출력되는 명령 중 회사에서 허용한 것을 하나 고릅니다.

예시:

```bash
ADMIN=gksudo
```

또는:

```bash
ADMIN=gsudo
```

또는:

```bash
ADMIN=pkexec
```

아래 문서에서 `$ADMIN`이라고 적힌 부분은 이 관리자 권한 명령을 뜻합니다. 새 터미널을 열면 이 값이 사라질 수 있으므로, 설치 작업을 시작하기 전에 다시 한 번 `ADMIN=gksudo`처럼 입력합니다.

먼저 설치 여부를 확인합니다.

```bash
node -v
pnpm -v
```

둘 다 버전이 나오면 넘어가도 됩니다.

### 3.1 Ubuntu/Debian 계열 예시

회사 리눅스가 Ubuntu/Debian이면 보통 아래처럼 설치합니다.

```bash
$ADMIN apt update
$ADMIN apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | $ADMIN -E bash -
$ADMIN apt install -y nodejs
corepack enable
corepack prepare pnpm@latest --activate
```

확인:

```bash
node -v
pnpm -v
```

### 3.2 Rocky/RHEL/CentOS 계열 예시

회사 리눅스가 Rocky/RHEL/CentOS 계열이면 IT 정책에 따라 설치 방법이 다를 수 있습니다. 일반 예시는 다음과 같습니다.

```bash
$ADMIN dnf install -y git curl
$ADMIN dnf module install -y nodejs:20
corepack enable
corepack prepare pnpm@latest --activate
```

확인:

```bash
node -v
pnpm -v
```

## 4. 프론트엔드 먼저 실행 확인

프로젝트 폴더에서 실행합니다.

```bash
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

서버 PC에서 직접 볼 때:

```text
http://localhost:10097/
```

같은 회사 Wi-Fi/내부망의 다른 PC에서 볼 때:

```text
http://서버IP:10097/
```

서버 IP 확인:

```bash
hostname -I
```

예를 들어 IP가 `192.168.10.25`라면:

```text
http://192.168.10.25:10097/
```

방화벽 때문에 안 열리면 IT 또는 서버 관리자에게 `10097` 포트 접근 허용이 필요한지 확인합니다.

## 5. PostgreSQL 설치

PostgreSQL은 업무 데이터가 저장될 DB입니다.

### 5.1 Ubuntu/Debian 예시

```bash
$ADMIN apt update
$ADMIN apt install -y postgresql postgresql-contrib
$ADMIN systemctl enable postgresql
$ADMIN systemctl start postgresql
$ADMIN systemctl status postgresql
```

상태 확인에서 `active (running)`이 보이면 실행 중입니다.

### 5.2 Rocky/RHEL/CentOS 예시

회사 환경마다 다르지만 일반 예시는 다음과 같습니다.

```bash
$ADMIN dnf install -y postgresql-server postgresql-contrib
$ADMIN postgresql-setup --initdb
$ADMIN systemctl enable postgresql
$ADMIN systemctl start postgresql
$ADMIN systemctl status postgresql
```

### 5.3 DB와 사용자 만들기

아래 예시는 DB 이름을 `work_dashboard`, DB 사용자를 `work_dashboard_user`로 만듭니다.

```bash
$ADMIN -u postgres psql
```

만약 여기서 `-u` 옵션 오류가 나면 회사 관리자 권한 도구가 사용자 전환 옵션을 지원하지 않는 것입니다. 그 경우 아래 중 회사 환경에서 허용되는 방법을 사용합니다.

```bash
$ADMIN psql -U postgres
```

또는 IT/서버 관리자에게 `postgres` 사용자로 `psql`에 접속하는 회사 표준 명령을 확인합니다.

PostgreSQL 콘솔이 열리면 아래 SQL을 한 줄씩 실행합니다.

```sql
create database work_dashboard;
create user work_dashboard_user with encrypted password '여기에_강한_DB_비밀번호';
grant all privileges on database work_dashboard to work_dashboard_user;
\q
```

주의:

- `여기에_강한_DB_비밀번호`는 실제 강한 비밀번호로 바꿉니다.
- 이 비밀번호는 Git, 문서, 채팅에 남기지 않습니다.
- 회사 비밀번호 정책이 있으면 그 기준을 따릅니다.

### 5.4 DB 접속 테스트

```bash
psql "postgresql://work_dashboard_user:여기에_강한_DB_비밀번호@127.0.0.1:5432/work_dashboard"
```

접속되면:

```sql
\dt
\q
```

처음에는 테이블이 없으므로 `Did not find any relations.`처럼 나와도 정상입니다.

## 6. Python과 FastAPI 준비

FastAPI는 Python backend입니다.

먼저 Python 버전을 확인합니다.

```bash
python3 --version
```

권장 버전은 Python 3.11 이상입니다.

### 6.1 Ubuntu/Debian 예시

```bash
$ADMIN apt install -y python3 python3-venv python3-pip
python3 --version
```

### 6.2 Rocky/RHEL/CentOS 예시

```bash
$ADMIN dnf install -y python3 python3-pip
python3 --version
```

## 7. 중요한 현재 제한: backend 폴더는 아직 없음

현재 시점에서는 프로젝트에 `backend/` 폴더가 아직 없습니다.

즉, 아래 명령은 **FastAPI backend 구현이 끝난 뒤** 실행하는 명령입니다.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

지금 바로 실행하면 `backend: No such file or directory`가 나올 수 있습니다. 그건 정상입니다. 아직 구현 전이기 때문입니다.

## 8. 다음 Codex 작업 요청 문구

회사에서 backend 구현을 시작할 때 Codex에게 아래처럼 요청하면 됩니다.

먼저 회사 PC에서 Codex를 열고 이 프로젝트 폴더를 workspace로 연결합니다. 그 다음 아래 요청문을 그대로 붙여넣습니다.

```text
이 폴더의 AGENTS.md, HANDOFF.md, TODO.md,
docs/company-fastapi-postgres-beginner-runbook.md,
docs/fastapi-postgres-backend-spec.md를 먼저 읽고 진행해줘.

목표는 이 대시보드를 회사 내부 FastAPI + PostgreSQL backend로 연결하는 거야.
아직 backend/ 폴더는 없으니 release/company-fastapi-postgres 브랜치 기준으로 Phase 1부터 구현해줘.

범위:
- backend/ 폴더 생성
- FastAPI health check
- PostgreSQL 연결
- Alembic 설정
- users, team_roster 모델과 migration
- 첫 관리자 seed 방식
- /api/v1/health 확인
- 프론트는 기존 UI를 유지하고 VITE_API_BASE_URL 기반 apiStore 연결 준비

아직 하지 말 것:
- 실시간 기능
- Teams 연동
- AI 모델 호출
- Canvas 동시 편집
- 다팀 workspace 확장

구현 후 git diff --check, backend 기본 API 검증, CI=true pnpm run build까지 확인해줘.
```

### 8.1 Codex가 해줄 수 있는 일

Codex는 프로젝트 폴더 안에서 다음 작업을 할 수 있습니다.

- 현재 폴더 구조와 문서 읽기
- `backend/` 코드 생성
- FastAPI route, schema, model, service 코드 작성
- Alembic migration 파일 작성
- 프론트 API 연결 준비
- `VITE_API_BASE_URL` 기준 store 구조 추가
- build와 기본 검증 명령 실행
- 오류 로그를 보고 코드 수정

### 8.2 슬기님 또는 회사 IT가 직접 확인해야 하는 일

아래는 Codex가 코드로 대신할 수 없거나 회사 권한 승인이 필요한 일입니다.

- PostgreSQL 설치 권한 확인
- `$ADMIN`에 어떤 관리자 권한 명령을 쓸지 확인
- DB 비밀번호와 JWT secret 생성
- `.env`, `.env.local`에 실제 비밀값 입력
- 방화벽/포트 `10097`, `18080` 허용 여부 확인
- 회사 보안 정책상 실제 업무 데이터 입력 가능 시점 확인
- systemd 서비스 등록 권한 확인

즉, Codex는 backend 코드를 만들고 연결 흐름을 잡아줄 수 있지만, 회사 권한/비밀번호/포트/보안 승인은 슬기님 또는 회사 IT가 확인해야 합니다.

### 8.3 추천 진행 순서

회사 PC에서는 아래 순서가 가장 안전합니다.

1. 이 브랜치를 clone 또는 pull한다.
2. 이 매뉴얼의 `3.0 관리자 권한 명령 확인`에서 `$ADMIN` 값을 정한다.
3. PostgreSQL 설치 가능 여부를 확인한다.
4. Codex에 위 요청문을 전달한다.
5. Codex가 `backend/` Phase 1을 구현한다.
6. 슬기님이 DB 비밀번호, JWT secret, `.env` 값을 입력한다.
7. Codex가 health check, migration, frontend build를 검증한다.
8. 최소 2계정으로 권한 검증을 진행한다.

## 9. FastAPI backend 구현 후 실행 순서

이 장은 `backend/` 폴더가 생긴 뒤 따라 합니다.

### 9.1 backend 환경 파일 만들기

```bash
cd work-dashboard-fastapi
cd backend
cp .env.example .env
```

`.env`를 엽니다.

```bash
nano .env
```

예시:

```bash
APP_ENV=company
APP_NAME=work-dashboard-api
API_HOST=0.0.0.0
API_PORT=18080

DATABASE_URL=postgresql+psycopg://work_dashboard_user:여기에_강한_DB_비밀번호@127.0.0.1:5432/work_dashboard

JWT_SECRET=아주_긴_랜덤_문자열
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14

CORS_ORIGINS=http://localhost:10097,http://127.0.0.1:10097,http://서버IP:10097
FIRST_ADMIN_EMAIL=seulgis@posco.com
```

저장:

- `nano`에서는 `Ctrl + O`, Enter, `Ctrl + X`

주의:

- `.env`는 Git에 올리면 안 됩니다.
- `JWT_SECRET`은 아무 문장이나 짧게 쓰면 안 됩니다.
- `openssl rand -hex 32`로 만들 수 있습니다.

```bash
openssl rand -hex 32
```

### 9.2 Python 가상환경 만들기

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

성공하면 터미널 앞에 `(.venv)`가 보입니다.

### 9.3 backend 패키지 설치

```bash
pip install -e .
```

만약 `pip` 업그레이드 안내가 나오면:

```bash
python -m pip install --upgrade pip
pip install -e .
```

### 9.4 DB migration 실행

```bash
alembic upgrade head
```

이 명령이 성공하면 PostgreSQL에 테이블이 만들어집니다.

확인:

```bash
psql "postgresql://work_dashboard_user:여기에_강한_DB_비밀번호@127.0.0.1:5432/work_dashboard"
```

```sql
\dt
\q
```

`users`, `team_roster` 같은 테이블이 보이면 성공입니다.

### 9.5 FastAPI 실행

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

다른 터미널에서 확인합니다.

```bash
curl http://127.0.0.1:18080/api/v1/health
```

정상 예시:

```json
{"status":"ok"}
```

브라우저에서 API 문서를 볼 수도 있습니다.

```text
http://서버IP:18080/docs
```

## 10. frontend를 FastAPI에 연결하기

프로젝트 루트로 돌아갑니다.

```bash
cd work-dashboard-fastapi
```

`.env.local` 파일을 만듭니다.

```bash
nano .env.local
```

내용:

```bash
VITE_API_BASE_URL=http://서버IP:18080/api/v1
```

예:

```bash
VITE_API_BASE_URL=http://192.168.10.25:18080/api/v1
```

저장 후 프론트를 다시 실행합니다.

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```

브라우저:

```text
http://서버IP:10097/
```

## 11. 실제 사용 전 확인 체크리스트

### 11.1 backend 확인

- `curl http://127.0.0.1:18080/api/v1/health` 성공
- `http://서버IP:18080/docs` 접속 가능
- PostgreSQL에 테이블 생성 확인
- 첫 관리자 계정 생성 또는 seed 확인

### 11.2 frontend 확인

- `http://서버IP:10097/` 접속 가능
- 화면이 깨지지 않음
- local fallback이 아니라 API 연결 상태가 표시됨
- 새로고침해도 데이터 유지
- 다른 PC에서도 같은 데이터 조회

### 11.3 권한 확인

최소 2개 계정으로 확인합니다.

- 관리자 계정
- 일반 팀원 계정

확인할 것:

- 일반 팀원은 관리자 화면 접근 불가
- 일반 팀원은 자기 업무 수정 가능
- 일반 팀원은 남의 개인 업무 인박스 조회 불가
- 팀 체크는 팀 공유로 보임
- 업무 노트 작성/수정/삭제 권한이 맞게 동작

## 12. systemd로 backend 자동 실행하기

개발 중에는 `uvicorn`을 터미널에서 직접 실행해도 됩니다. 운영처럼 계속 켜두려면 `systemd`를 사용합니다.

아래는 예시입니다. 실제 경로는 회사 서버 경로에 맞게 바꿔야 합니다.

```bash
$ADMIN nano /etc/systemd/system/work-dashboard-api.service
```

내용:

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

등록:

```bash
$ADMIN systemctl daemon-reload
$ADMIN systemctl enable work-dashboard-api
$ADMIN systemctl start work-dashboard-api
$ADMIN systemctl status work-dashboard-api
```

로그 확인:

```bash
$ADMIN journalctl -u work-dashboard-api -f
```

## 13. 자주 막히는 문제

### 13.1 `branch not found`

```bash
git fetch origin
git branch -r
```

`origin/release/company-fastapi-postgres`가 보이는지 확인합니다.

그 다음:

```bash
git checkout release/company-fastapi-postgres
```

### 13.2 `Your local changes would be overwritten`

회사 폴더에 수정된 파일이 있어서 브랜치 전환이 막힌 것입니다.

확인:

```bash
git status
```

중요한 수정이면 백업하거나 commit해야 합니다. 중요하지 않은 데모 수정이라면 지우는 방법도 있지만, 실수 위험이 있으므로 먼저 Codex에게 상태를 보여주고 판단받는 것을 권장합니다.

### 13.3 `pnpm: command not found`

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

그래도 안 되면 Node.js 설치부터 다시 확인합니다.

```bash
node -v
```

### 13.4 `psql: command not found`

PostgreSQL client가 설치되지 않았습니다.

Ubuntu/Debian:

```bash
$ADMIN apt install -y postgresql-client
```

Rocky/RHEL/CentOS:

```bash
$ADMIN dnf install -y postgresql
```

### 13.5 DB 비밀번호 오류

DB 접속 문자열의 비밀번호가 틀렸거나 특수문자 인코딩 문제일 수 있습니다.

먼저 단순한 테스트용 비밀번호로 접속을 확인하고, 운영 전 강한 비밀번호로 바꾸는 방식을 권장합니다.

비밀번호 변경:

```bash
$ADMIN -u postgres psql
```

```sql
alter user work_dashboard_user with encrypted password '새_비밀번호';
\q
```

### 13.6 `port already in use`

이미 해당 포트를 쓰고 있습니다.

확인:

```bash
$ADMIN lsof -i :10097
$ADMIN lsof -i :18080
```

다른 포트를 쓰려면:

```bash
pnpm run dev -- --host 0.0.0.0 --port 10098
uvicorn app.main:app --host 0.0.0.0 --port 18081
```

이 경우 `.env.local`의 `VITE_API_BASE_URL`도 같이 바꿔야 합니다.

### 13.7 화면은 뜨는데 저장이 안 됨

가능성이 높은 원인:

- FastAPI 서버가 꺼져 있음
- `.env.local`의 `VITE_API_BASE_URL`이 틀림
- CORS 설정에 프론트 주소가 빠짐
- DB 연결 실패
- 아직 해당 API가 구현되지 않음

확인 순서:

```bash
curl http://127.0.0.1:18080/api/v1/health
cat .env.local
$ADMIN journalctl -u work-dashboard-api -n 100
```

개발 중 직접 실행했다면 backend 터미널 로그를 확인합니다.

## 14. 운영 전 보안 주의

- `.env`, `.env.local`을 Git에 올리지 않습니다.
- DB 비밀번호와 JWT secret을 문서에 쓰지 않습니다.
- PostgreSQL 5432 포트는 가능하면 외부 PC에 열지 않습니다.
- 외부 PC는 FastAPI 18080과 frontend 10097만 접근하게 합니다.
- 처음에는 실제 업무 민감자료를 넣기 전에 권한 검증을 먼저 합니다.
- 백업 정책을 정하기 전에는 운영 데이터 입력을 서두르지 않습니다.

## 15. 가장 짧은 전체 순서

새 폴더로 받기:

```bash
git clone -b release/company-fastapi-postgres https://github.com/SSG87-pos/work-dashborad.git work-dashboard-fastapi
cd work-dashboard-fastapi
pnpm install
```

프론트 확인:

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```

PostgreSQL 설치:

```bash
$ADMIN apt update
$ADMIN apt install -y postgresql postgresql-contrib
$ADMIN systemctl enable postgresql
$ADMIN systemctl start postgresql
```

DB 생성:

```bash
$ADMIN -u postgres psql
```

```sql
create database work_dashboard;
create user work_dashboard_user with encrypted password '여기에_강한_DB_비밀번호';
grant all privileges on database work_dashboard to work_dashboard_user;
\q
```

그 다음:

```text
Codex에게 FastAPI/PostgreSQL backend Phase 1 구현을 요청합니다.
```

backend 구현 후:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 18080
```

frontend 연결:

```bash
cd ..
nano .env.local
```

```bash
VITE_API_BASE_URL=http://서버IP:18080/api/v1
```

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```
