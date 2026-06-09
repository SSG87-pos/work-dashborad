# Company C3 Supabase Docker Runbook

작성 기준일: 2026-06-10

이 문서는 `release/company-supabase-c3` 브랜치를 기준으로, 회사 C3 환경에 Docker 이미지/컨테이너 방식으로 Supabase를 올리고 `연구기획그룹-전략` 대시보드를 연결하기 위한 설치 및 migration 매뉴얼입니다.

## 0. 먼저 결론

`업무 인박스`와 `팀 체크`는 이미 이 브랜치의 기준 커밋에 포함되어 있습니다.

필수 migration:

```text
supabase/migrations/001_initial_dashboard_schema.sql
...
supabase/migrations/022_briefing_items.sql
```

특히 `업무 인박스`와 `팀 체크`는 아래 migration에 들어 있습니다.

```text
supabase/migrations/022_briefing_items.sql
```

따라서 C3 Supabase 환경에서는 **001부터 022까지 모두 순서대로 적용**해야 합니다.

## 1. 중요한 전제: Supabase는 단일 이미지가 아님

Supabase self-hosted는 보통 단일 Docker 이미지 하나로 끝나는 구조가 아닙니다. 공식 Docker 구성은 Postgres, Auth, REST, Realtime, Storage, Studio, Kong API Gateway 등 여러 컨테이너를 Docker Compose로 함께 띄우는 방식입니다.

따라서 C3에 올릴 때 먼저 아래를 확인해야 합니다.

| 확인 항목 | 필요 여부 | 설명 |
| --- | --- | --- |
| 멀티 컨테이너 실행 | 필수 | Supabase stack은 여러 컨테이너로 구성됩니다. |
| Docker Compose 또는 C3 stack 기능 | 필수 | `docker-compose.yml`과 `.env`를 읽어 여러 서비스를 띄울 수 있어야 합니다. |
| 영구 볼륨 | 필수 | Postgres DB와 Storage 파일이 컨테이너 재시작 후에도 남아야 합니다. |
| 환경변수/secret 관리 | 필수 | DB 비밀번호, JWT secret, API key를 안전하게 넣어야 합니다. |
| 내부/외부 포트 정책 | 필수 | API Gateway, Studio, DB 접근 포트를 정해야 합니다. |
| 이미지 registry 접근 | 필수 | C3가 Docker Hub 또는 내부 registry에서 Supabase 이미지를 pull할 수 있어야 합니다. |
| HTTPS/reverse proxy | 운영 시 권장 | 실제 로그인/업무 사용 전에는 HTTPS가 권장됩니다. |

만약 C3가 “단일 컨테이너 이미지 하나”만 실행할 수 있다면, Supabase 전체 stack을 그대로 운영하기 어렵습니다. 이 경우 C3 관리자에게 “Docker Compose 또는 멀티 컨테이너 app/stack 배포가 가능한지” 먼저 확인해야 합니다.

## 2. sudo가 안 되는 회사 환경 처리

슬기님 회사 환경에서는 `sudo`가 직접 동작하지 않을 수 있습니다. 이 문서에서는 관리자 권한 명령을 `$ADMIN`으로 표기합니다.

먼저 어떤 명령이 있는지 확인합니다.

```bash
command -v sudo
command -v gsudo
command -v gksudo
command -v pkexec
command -v doas
```

회사에서 허용되는 명령을 하나 정합니다.

예:

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

아래에서 `$ADMIN`이라고 적힌 곳은 이 명령으로 바꿔 실행합니다. 새 터미널을 열면 값이 사라질 수 있으므로 설치 작업 전 다시 설정합니다.

## 3. Git 브랜치 기준

C3 Supabase Docker 운영 기준 브랜치:

```text
release/company-supabase-c3
```

회사 PC 또는 작업 서버에서 새로 받을 때:

```bash
git clone -b release/company-supabase-c3 https://github.com/SSG87-pos/work-dashborad.git work-dashboard-supabase-c3
cd work-dashboard-supabase-c3
pnpm install
```

이미 받은 폴더에서 전환할 때:

```bash
cd work-dashborad
git fetch origin
git checkout release/company-supabase-c3
git pull
pnpm install
```

## 4. C3에 올릴 대상 구분

C3에 올릴 것은 크게 두 묶음입니다.

### 4.1 Supabase backend stack

역할:

- PostgreSQL DB
- Auth
- REST Data API
- Storage
- Realtime
- Studio
- Kong API Gateway

기준:

- Supabase 공식 Docker Compose 구성
- 회사 C3의 멀티 컨테이너/stack 기능
- 영구 볼륨 필수

### 4.2 Dashboard frontend

역할:

- React/Vite 대시보드 화면
- 브라우저가 Supabase URL/API key로 backend에 접속

운영 방식 선택:

| 방식 | 설명 |
| --- | --- |
| C3에 frontend image로 배포 | C3가 내부 웹 앱 이미지를 받을 수 있으면 권장 |
| 별도 Nginx/static host | `pnpm run build` 결과물을 Nginx에 배포 |
| 개발 서버 임시 사용 | `pnpm run dev -- --host 0.0.0.0 --port 10097`; 운영용으로는 비권장 |

## 5. Supabase 공식 Docker 구성 준비

작업 서버에서 Supabase 공식 repo의 Docker 구성만 준비합니다.

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir supabase-project
cp -rf supabase/docker/* supabase-project
cp supabase/docker/.env.example supabase-project/.env
cd supabase-project
```

이미지 pull:

```bash
docker compose pull
```

C3가 인터넷 Docker Hub에 직접 접근하지 못한다면:

1. 접근 가능한 환경에서 필요한 이미지를 pull
2. 회사 내부 registry에 push
3. `docker-compose.yml`의 image 경로를 내부 registry 주소로 변경
4. C3가 내부 registry에서 pull하도록 설정

이 작업은 회사 C3/registry 정책에 맞춰 IT와 확인해야 합니다.

## 6. Supabase .env 설정

`supabase-project/.env`는 운영 핵심 파일입니다. Git에 올리면 안 됩니다.

반드시 바꿔야 하는 대표 값:

```text
POSTGRES_PASSWORD
JWT_SECRET
ANON_KEY 또는 SUPABASE_PUBLISHABLE_KEY
SERVICE_ROLE_KEY 또는 SUPABASE_SECRET_KEY
DASHBOARD_USERNAME
DASHBOARD_PASSWORD
SITE_URL
API_EXTERNAL_URL
SUPABASE_PUBLIC_URL
```

주의:

- browser/frontend에는 publishable/anon 성격의 key만 넣습니다.
- service role/secret key는 절대 frontend `.env.local`에 넣지 않습니다.
- Studio password는 숫자만 쓰지 말고 문자 포함 강한 값으로 설정합니다.
- 실제 변수명은 사용하는 Supabase Docker bundle 버전에 따라 다를 수 있으므로 `.env.example`을 기준으로 확인합니다.

URL 예시:

```text
SUPABASE_PUBLIC_URL=https://supabase.company.local
API_EXTERNAL_URL=https://supabase.company.local
SITE_URL=https://work-dashboard.company.local
```

초기 HTTP 내부 테스트만 한다면 임시로:

```text
SUPABASE_PUBLIC_URL=http://C3_SUPABASE_HOST:8000
API_EXTERNAL_URL=http://C3_SUPABASE_HOST:8000
SITE_URL=http://C3_DASHBOARD_HOST:10097
```

단, 실제 운영 로그인에는 HTTPS를 권장합니다.

## 7. Supabase stack 시작 및 상태 확인

일반 Docker Compose 환경:

```bash
cd supabase-project
docker compose up -d --wait
docker compose ps
```

공식 helper script가 있는 구성:

```bash
sh run.sh start
docker compose ps
```

정상 기준:

- 주요 컨테이너가 `Up` 상태
- 가능하면 `healthy` 표시
- Studio 접속 가능

기본 접근 예시:

```text
http://C3_SUPABASE_HOST:8000
```

API:

```text
http://C3_SUPABASE_HOST:8000/rest/v1/
http://C3_SUPABASE_HOST:8000/auth/v1/
http://C3_SUPABASE_HOST:8000/storage/v1/
```

로그 확인:

```bash
docker compose logs -f
```

특정 서비스:

```bash
docker compose logs -f kong
docker compose logs -f db
docker compose logs -f auth
docker compose logs -f rest
```

## 8. Dashboard frontend 환경변수

대시보드 repo의 `.env.local`을 만듭니다.

```bash
cd work-dashboard-supabase-c3
nano .env.local
```

예시:

```bash
VITE_SUPABASE_URL=https://supabase.company.local
VITE_SUPABASE_ANON_KEY=여기에_publishable_or_anon_key
```

내부 HTTP 테스트 예시:

```bash
VITE_SUPABASE_URL=http://C3_SUPABASE_HOST:8000
VITE_SUPABASE_ANON_KEY=여기에_publishable_or_anon_key
```

주의:

- `VITE_SUPABASE_ANON_KEY`에는 browser-safe key만 넣습니다.
- `SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`는 절대 넣지 않습니다.
- `.env.local`은 Git에 올리지 않습니다.

## 9. Dashboard frontend 실행 또는 이미지화

### 9.1 임시 실행

```bash
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

브라우저:

```text
http://C3_DASHBOARD_HOST:10097
```

### 9.2 운영 build 확인

```bash
CI=true pnpm run build
```

빌드 결과:

```text
dist/
```

### 9.3 frontend Docker image가 필요한 경우

현재 repo에는 frontend Dockerfile이 필수로 들어 있지는 않습니다. C3가 image 배포를 요구한다면 아래 형태의 Nginx static image를 후속 작업으로 추가할 수 있습니다.

예시 Dockerfile 방향:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

단, Vite 환경변수는 build time에 주입됩니다. Supabase URL/key가 바뀌면 frontend image를 다시 build해야 할 수 있습니다. 운영 방식이 확정되면 Dockerfile을 repo에 정식 추가하세요.

## 10. Migration 적용 전 준비

대시보드 repo에 migration 파일이 있습니다.

```bash
ls supabase/migrations
```

반드시 확인할 마지막 파일:

```text
022_briefing_items.sql
```

이 파일이 있어야 `업무 인박스`와 `팀 체크`가 Supabase DB에 저장됩니다.

## 11. Migration 적용 방법

운영 DB에 바로 적용하지 말고, 가능하면 C3 테스트 stack에서 먼저 적용합니다.

### 11.1 psql 접속 문자열 준비

Supabase self-hosted는 구성에 따라 DB 접속 경로가 다를 수 있습니다.

가능한 방식:

| 방식 | 예시 | 설명 |
| --- | --- | --- |
| Supabase Docker network 내부 direct DB | `postgres://postgres:PASSWORD@db:5432/postgres` | migration 작업 컨테이너가 같은 Docker network 안에 있을 때 |
| Supavisor session mode | `postgres://postgres.TENANT:PASSWORD@HOST:5432/postgres` | 외부에서 session pooler로 접속 |
| Supavisor transaction mode | `postgres://postgres.TENANT:PASSWORD@HOST:6543/postgres` | 일반 앱 쿼리용에 가까움; migration은 session/direct 권장 |

권장:

- migration은 가능하면 direct DB 또는 session mode로 적용합니다.
- transaction pooler는 migration/DDL에 적합하지 않을 수 있으므로 피합니다.

### 11.2 psql로 001부터 022까지 적용

대시보드 repo 루트에서 실행합니다.

```bash
cd work-dashboard-supabase-c3
export DATABASE_URL='postgres://postgres:PASSWORD@HOST:5432/postgres'
```

테스트:

```bash
psql "$DATABASE_URL" -c "select now();"
```

migration 적용:

```bash
for file in supabase/migrations/*.sql; do
  echo "Applying $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
```

중간에 실패하면:

1. 오류 메시지 확인
2. 어느 파일에서 실패했는지 확인
3. 같은 DB에 반복 적용하지 말고 테스트 DB를 초기화하거나 실패 지점부터 상태를 점검
4. Codex에게 오류 전문을 보여주고 원인 확인

### 11.3 적용 확인 SQL

```bash
psql "$DATABASE_URL"
```

```sql
\dt public.*

select to_regclass('public.briefing_items') as briefing_items;
select to_regclass('public.task_posts') as task_posts;
select to_regclass('public.canvas_tabs') as canvas_tabs;
select to_regclass('public.canvas_nodes') as canvas_nodes;
select to_regclass('public.canvas_links') as canvas_links;

select count(*) from public.task_post_categories;
```

`briefing_items`가 `public.briefing_items`로 나오면 업무 인박스/팀 체크 테이블이 생성된 것입니다.

## 12. 첫 관리자 계정 준비

초기에는 Supabase Auth로 첫 사용자 가입 후 DB에서 admin 권한을 부여합니다.

1. 대시보드 또는 Supabase Studio/Auth UI에서 `seulgis@posco.com` 계정을 가입합니다.
2. DB에서 권한을 수정합니다.

```sql
update public.users
set
  permission_role = 'admin',
  name = '소슬기',
  title = '수석',
  is_team_member = true,
  is_active = true
where email = 'seulgis@posco.com';
```

확인:

```sql
select email, name, title, permission_role, is_team_member, is_active
from public.users
where email = 'seulgis@posco.com';
```

## 13. C3 환경에서 반드시 확인할 설정

### 13.1 영구 볼륨

Postgres 데이터와 Storage 데이터는 반드시 영구 볼륨에 연결해야 합니다.

확인 대상:

```text
volumes/db/data
volumes/storage
```

컨테이너 재시작 후 데이터가 남아야 합니다.

### 13.2 포트와 URL

최소 확인:

| 용도 | 기본 예시 | 외부 공개 여부 |
| --- | --- | --- |
| Supabase API Gateway | 8000 | dashboard frontend가 접근 가능해야 함 |
| Supabase Studio | 8000 경유 | 관리자만 접근 |
| Postgres/Supavisor | 5432/6543 | 가능하면 외부 공개하지 않음 |
| Dashboard frontend | 10097 또는 80/443 | 사용자 접근 |

### 13.3 CORS/Auth URL

`.env`의 `SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL`이 실제 접속 주소와 맞아야 합니다.

예:

```text
SITE_URL=https://work-dashboard.company.local
SUPABASE_PUBLIC_URL=https://supabase.company.local
API_EXTERNAL_URL=https://supabase.company.local
```

### 13.4 Data API grants/RLS

이 repo의 migration은 RLS와 grant를 포함합니다. 그래도 C3 적용 후 아래를 확인합니다.

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

`briefing_items`, `task_posts`, `canvas_tabs`, `canvas_nodes`, `canvas_links` 등 주요 테이블의 RLS가 켜져 있어야 합니다.

## 14. 기능별 smoke test

### 14.1 로그인

- 첫 관리자 계정 로그인
- 상단에 Supabase 연결 상태 확인
- 새로고침 후 세션 유지 확인

### 14.2 업무 인박스

- My Desk에서 `업무 인박스` 기록 추가
- 새로고침
- 같은 사용자로 다시 보이는지 확인
- 다른 사용자에게 개인 인박스가 노출되지 않는지 확인

### 14.3 팀 체크

- Team Flow에서 `팀 체크` 추가
- 다른 계정에서 같은 팀 체크가 보이는지 확인
- 완료 체크 후 새로고침 유지 확인

### 14.4 업무 노트

- 업무 상세에서 `노트 작성`
- 제목/본문/URL 저장
- 읽기/수정/삭제 확인

### 14.5 Canvas

- Canvas에서 노드 추가
- 새로고침 후 유지 확인
- 다른 브라우저/PC에서 보이는지 확인

### 14.6 스팟 업무

- 스팟 업무 생성
- 보드/타임라인/하이라이트 표시 확인
- 주간/월간 포함, 분기/년간 요약 기본 제외 규칙 확인

## 15. 백업과 업데이트

### 15.1 DB 백업

C3 운영 전 반드시 DB 백업 방법을 정합니다.

예시:

```bash
pg_dump "$DATABASE_URL" -Fc -f work_dashboard_$(date +%Y%m%d).dump
```

복원:

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" work_dashboard_YYYYMMDD.dump
```

### 15.2 Supabase Docker stack 업데이트

공식 self-hosted Docker 구성은 주기적으로 업데이트됩니다. 업데이트 전에는 반드시:

1. DB 백업
2. `.env` 백업
3. 현재 image tag 기록
4. 테스트 환경에서 먼저 재기동
5. 운영 적용

무작정 latest 이미지를 운영에 적용하지 않습니다.

## 16. 자주 막히는 문제

### C3가 단일 이미지만 받음

Supabase 전체 stack은 단일 이미지가 아닙니다. C3에 Docker Compose/멀티 컨테이너 app 기능이 필요한지 확인합니다.

### Studio는 뜨는데 dashboard app이 연결 안 됨

확인:

- `VITE_SUPABASE_URL`이 브라우저에서 접근 가능한 주소인지
- `VITE_SUPABASE_ANON_KEY`가 browser-safe key인지
- CORS/Auth URL이 맞는지
- API gateway 8000 또는 reverse proxy 443 접근이 되는지

### migration 중간 실패

확인:

- 이미 일부 migration이 적용된 DB인지
- 같은 SQL을 두 번 실행한 것은 아닌지
- 실패 파일명과 오류 전문
- 테스트 DB에서 처음부터 재현되는지

### 업무 인박스/팀 체크가 저장되지 않음

확인:

```sql
select to_regclass('public.briefing_items');
```

테이블이 없으면 `022_briefing_items.sql`이 적용되지 않은 것입니다.

### psql 접속이 안 됨

확인:

- C3 network에서 DB/Supavisor 포트를 열었는지
- direct DB와 pooler host/port를 혼동하지 않았는지
- `POOLER_TENANT_ID`가 필요한 접속 문자열인지
- 비밀번호가 `.env`의 `POSTGRES_PASSWORD`와 맞는지

## 17. 회사 Codex에게 줄 요청문

회사 C3 환경에서 Codex에게 아래처럼 요청하면 됩니다.

```text
이 폴더의 AGENTS.md, HANDOFF.md, TODO.md,
docs/company-c3-supabase-docker-runbook.md,
docs/company-self-hosted-supabase-guide.md,
docs/local-linux-supabase-runbook.md,
docs/supabase-start-guide.md를 먼저 읽고 진행해줘.

목표는 release/company-supabase-c3 브랜치 기준으로 회사 C3 Docker 이미지/멀티컨테이너 환경에 Supabase self-hosted stack을 올리고,
이 대시보드를 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY로 연결하는 거야.

중요:
- sudo는 직접 안 먹을 수 있으니 $ADMIN=gksudo 또는 회사에서 허용한 관리자 명령을 확인해줘.
- Supabase는 단일 이미지가 아니라 여러 컨테이너 stack인지 먼저 확인해줘.
- migration은 supabase/migrations/001부터 022까지 순서대로 적용해야 해.
- 022_briefing_items.sql이 업무 인박스/팀 체크 저장 테이블이야.
- service role/secret key는 frontend에 넣지 마.

검증:
- Supabase stack 상태 확인
- migration 적용 확인
- briefing_items, task_posts, canvas tables 존재 확인
- 첫 admin 계정 권한 확인
- 업무 인박스/팀 체크/업무 노트/Canvas 저장 smoke test
- CI=true pnpm run build
```

## 18. 요약

```text
브랜치: release/company-supabase-c3
Supabase 방식: C3 Docker Compose 또는 멀티 컨테이너 stack
Frontend: React/Vite dashboard
DB migration: 001부터 022까지
업무 인박스/팀 체크: 022_briefing_items.sql
sudo 대체: $ADMIN=gksudo 또는 회사 허용 명령
```
