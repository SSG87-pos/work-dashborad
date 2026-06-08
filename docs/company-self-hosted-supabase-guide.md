# Company Self-Hosted Supabase Guide

이 문서는 회사 내부 self-hosted Supabase로 `연구기획그룹-전략` 대시보드를 운영할 때 필요한 GitHub/브랜치/클론/추가 작업을 쉽게 설명하는 자료입니다.

작성 기준일: 2026-06-08

## 먼저 결론

내일 데모만 다시 보여줄 때는 `main`을 새로 클론할 필요가 없습니다.

이미 회사 PC에 받은 폴더가 있다면 지금 데모 브랜치만 최신화하면 됩니다.

```bash
cd work-dashborad
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

처음 받는 PC라면:

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout codex/poslab-entry-landing
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

`main`을 새로 클론한다고 해서 랜딩페이지, Canvas, 업무 노트, Highlights 게시글 모음, Supabase 연결 작업이 모두 따라온다고 보장할 수는 없습니다. 그 기능들이 `main`에 merge되어 있어야만 기본 clone으로 따라옵니다.

현재 기준으로는 최종 기능이 들어 있는 기준 브랜치는 `codex/poslab-entry-landing`입니다.

## 큰 그림

회사 내부 self-hosted Supabase 운영은 두 개의 Git 묶음이 필요합니다.

### 1. 우리 대시보드 앱 repo

주소:

```text
https://github.com/SSG87-pos/work-dashborad.git
```

역할:

- React/Vite 대시보드 화면
- POSLAB 랜딩페이지
- Canvas, 마인드맵, Highlights, 업무 노트, 관리자 화면
- Supabase 연결 코드
- `supabase/migrations/001...020` DB 스키마

### 2. Supabase 공식 self-hosted Docker 구성

주소:

```text
https://github.com/supabase/supabase
```

역할:

- Supabase 서버 구성
- Docker Compose
- Postgres, Auth, REST API, Storage, Realtime, Studio
- `.env`의 JWT/API key/DB password/URL 설정

즉, `work-dashborad`만 클론하면 앱 코드는 받을 수 있지만, self-hosted Supabase 서버 자체가 설치되는 것은 아닙니다. 반대로 Supabase 공식 repo만 받으면 DB/Auth 서버는 생기지만, 우리 대시보드 화면은 없습니다.

## 데모, 파일럿, 운영의 차이

| 단계 | 앱 브랜치 | Supabase | 목적 |
| --- | --- | --- | --- |
| 내일 데모 | `codex/poslab-entry-landing` | 없어도 됨 또는 기존 fallback | 화면/흐름 확인 |
| 로컬 파일럿 | `codex/poslab-entry-landing` 또는 release 브랜치 | Supabase CLI local stack | 한 PC에서 DB 연결 검증 |
| 회사 내부 운영 | `main` 또는 `release/company-self-hosted` | self-hosted Docker Supabase | 여러 명이 같은 데이터 사용 |

데모와 운영을 섞으면 헷갈립니다. 내일 데모는 현재 데모 브랜치로 충분합니다. 운영 전환은 데모가 끝난 뒤 별도 체크리스트로 진행하는 것이 좋습니다.

## 지금 클론해둔 브랜치는 어떻게 해야 하나

### 내일 데모 전

지금 클론해둔 폴더를 그대로 씁니다.

```bash
cd work-dashborad
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

이 폴더를 지우거나 `main`으로 바꿀 필요가 없습니다.

### 데모 후 Supabase 작업을 시작할 때

선택지는 두 가지입니다.

#### 선택 A: 현재 브랜치에서 계속 파일럿

가장 빠릅니다.

```bash
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
```

장점:

- 랜딩페이지와 현재까지 만든 기능이 확실히 있음
- 내일 데모와 같은 화면에서 이어서 Supabase 연결 가능
- 빠르게 검증 가능

단점:

- 운영 기준 브랜치가 아니라 실수로 실험 코드가 섞일 수 있음
- 나중에 `main` merge를 따로 해야 함

#### 선택 B: 운영용 release 브랜치를 만들고 거기서 진행

추천합니다.

예:

```bash
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
git checkout -b release/company-self-hosted
git push origin release/company-self-hosted
```

장점:

- 데모 브랜치와 운영 준비 브랜치를 분리할 수 있음
- 회사 PC에는 `release/company-self-hosted`만 받으라고 안내 가능
- 나중에 검증 후 `main`으로 merge하기 좋음

단점:

- 브랜치가 하나 더 생김
- 이후 수정은 어느 브랜치에서 할지 규칙을 정해야 함

### 최종적으로는 main에 넣어야 하나

네. “최종 구현”이라고 부르려면 결국 `main` 또는 명확한 운영 브랜치에 들어가야 합니다.

권장 순서:

1. 지금 기능이 있는 `codex/poslab-entry-landing`을 안정화
2. `release/company-self-hosted` 브랜치 생성
3. self-hosted Supabase 연결/검증
4. 회사 운영에 필요한 보안/백업/환경 설정 확인
5. `release/company-self-hosted`를 `main`으로 merge
6. `main`에 tag 생성

예:

```bash
git checkout main
git pull origin main
git merge --no-ff release/company-self-hosted
git tag v0.1.0-company-self-hosted
git push origin main --tags
```

이 작업이 끝난 뒤에는 새 PC에서 그냥 아래처럼 받아도 랜딩페이지와 현재 기능이 따라옵니다.

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
pnpm install
```

하지만 이 merge가 되기 전에는 반드시 `git checkout codex/poslab-entry-landing` 또는 운영용 release 브랜치 checkout이 필요합니다.

## GitHub에서 사전에 해두면 좋은 것

### 1. 운영 기준 브랜치 결정

아래 중 하나로 정합니다.

권장:

```text
release/company-self-hosted
```

최종:

```text
main
```

운영 기준 브랜치에는 아래가 모두 포함되어야 합니다.

- POSLAB 랜딩페이지
- My Desk
- Team Flow
- Calendar
- Updates
- Highlights
- Canvas
- 관리자
- 업무 노트/게시글
- Supabase migrations `001`부터 `020`
- self-hosted 운영 문서

### 2. Pull Request 또는 merge 기록 남기기

GitHub에서 PR을 만드는 것을 추천합니다.

예:

```text
codex/poslab-entry-landing -> main
```

또는:

```text
codex/poslab-entry-landing -> release/company-self-hosted
```

PR 설명에는 아래를 적으면 됩니다.

```text
- POSLAB entry landing
- Dashboard UX and task-detail improvements
- Canvas shared storage schema
- Task update/history correction schema
- Task posts schema
- Local Linux Supabase runbook
- Self-hosted Supabase guide
```

### 3. release tag 만들기

회사 운영 전환 기준점을 남기기 위해 tag를 권장합니다.

```bash
git tag v0.1.0-company-self-hosted
git push origin v0.1.0-company-self-hosted
```

나중에 문제가 생겼을 때 “그때 운영에 쓴 코드”로 돌아가기 쉽습니다.

### 4. secret은 절대 GitHub에 올리지 않기

GitHub에 올리면 안 되는 것:

- `.env.local`
- self-hosted Supabase `.env`
- `POSTGRES_PASSWORD`
- `SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`
- `JWT_SECRET`
- SMTP password
- 회사 내부 URL 중 민감한 것

GitHub에는 예시만 둡니다.

```text
.env.example
docs/*.md
supabase/migrations/*.sql
```

## 회사 내부 self-hosted Supabase 구성 방식

공식 문서 기준으로 self-hosted Supabase는 Docker Compose로 설치합니다. Linux quick start는 Supabase 공식 설치 스크립트가 `git`, `openssl`, `jq`, Docker Engine 준비, Supabase `docker/` sparse clone, secret/key 생성, Docker image pull까지 수행합니다.

### 빠른 설치 방식

회사 보안 정책상 외부 script를 바로 실행해도 되는지 먼저 확인해야 합니다.

공식 quick start:

```bash
curl -fsSL https://supabase.link/setup.sh | sh
```

설치 후:

```bash
cd supabase-project
sh run.sh start
sh run.sh secrets
```

### 수동 설치 방식

회사에서는 보통 수동 설치가 더 설명하기 쉽습니다.

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir supabase-project
cp -rf supabase/docker/* supabase-project
cp supabase/docker/.env.example supabase-project/.env
cd supabase-project
docker compose pull
```

그 다음 `.env`의 secret과 URL을 반드시 실제 값으로 바꿉니다. 공식 문서도 기본 placeholder 값으로 시작하지 말라고 안내합니다.

필수로 확인할 값:

```text
POSTGRES_PASSWORD
JWT_SECRET
ANON_KEY 또는 SUPABASE_PUBLISHABLE_KEY
SERVICE_ROLE_KEY 또는 SUPABASE_SECRET_KEY
SUPABASE_PUBLIC_URL
API_EXTERNAL_URL
SITE_URL
DASHBOARD_USERNAME
DASHBOARD_PASSWORD
SMTP_*
```

실행:

```bash
sh utils/generate-keys.sh
sh utils/add-new-auth-keys.sh
sh run.sh start
docker compose ps
```

Studio 접속:

```text
http://서버IP:8000
```

HTTPS와 사내 도메인을 붙이면:

```text
https://supabase.company.local
```

공식 문서 기준으로 기본 self-hosted API gateway는 보통 8000번 포트를 사용합니다. reverse proxy 뒤에 두면 443으로 정리할 수 있습니다.

## 대시보드 앱은 어떤 값을 바라봐야 하나

우리 앱은 `.env.local`의 두 값만 봅니다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

self-hosted Supabase에서 가져올 값:

```bash
VITE_SUPABASE_URL=http://서버IP:8000
VITE_SUPABASE_ANON_KEY=SUPABASE_PUBLISHABLE_KEY_또는_ANON_KEY
```

HTTPS 도메인이 있으면:

```bash
VITE_SUPABASE_URL=https://supabase.company.local
VITE_SUPABASE_ANON_KEY=SUPABASE_PUBLISHABLE_KEY_또는_ANON_KEY
```

중요:

- `VITE_SUPABASE_ANON_KEY`라는 이름이어도 값은 client-side publishable key를 넣을 수 있습니다.
- `SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`는 절대 넣지 않습니다.
- 브라우저에서 접근 가능한 URL이어야 합니다. 사용자의 PC가 `VITE_SUPABASE_URL`에 접근하지 못하면 로그인/데이터 저장이 실패합니다.

## DB 스키마는 어떻게 넣나

우리 대시보드 repo에는 아래 migration들이 있습니다.

```text
supabase/migrations/001_initial_dashboard_schema.sql
...
supabase/migrations/020_task_posts.sql
```

self-hosted Supabase를 새로 만든 뒤에는 이 SQL을 순서대로 적용해야 합니다.

### 방법 A: psql로 순서대로 적용

초기 빈 DB에 가장 이해하기 쉬운 방법입니다.

대시보드 repo가 있는 곳에서:

```bash
cd work-dashborad
export DATABASE_URL="postgres://postgres.your-tenant-id:POSTGRES_PASSWORD@SUPABASE_HOST:5432/postgres"

for file in supabase/migrations/*.sql; do
  echo "Applying $file"
  psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$file"
done
```

주의:

- 실제 self-hosted connection string은 Supabase self-hosted `.env`와 구성에 따라 달라집니다.
- 공식 restore 문서의 기본 예시는 `postgres://postgres.your-tenant-id:[POSTGRES_PASSWORD]@[your-domain]:5432/postgres` 형태입니다.
- 이미 데이터가 들어 있는 운영 DB에 다시 적용하면 안 됩니다. 반드시 테스트 DB에서 먼저 검증합니다.

### 방법 B: Supabase CLI로 db push

CLI를 회사 환경에서 표준화할 수 있다면 `supabase db push --db-url ...` 방식을 검토할 수 있습니다.

먼저 도움말을 확인합니다.

```bash
supabase db push --help
```

그 다음 test DB에서만 시도합니다.

```bash
supabase db push --db-url "$DATABASE_URL" --include-all
```

현재 레포의 migration 파일명은 순번형 `001_...sql`입니다. CLI 버전별 동작은 바뀔 수 있으므로, 운영 DB에 바로 적용하지 말고 테스트 DB에서 migration list와 테이블 생성 여부를 확인합니다.

## 앱 배포 방식

운영은 `pnpm run dev`보다 build 결과를 정적으로 서빙하는 방식이 좋습니다.

빌드:

```bash
pnpm install --frozen-lockfile
CI=true pnpm run build
```

결과:

```text
dist/
```

서빙 방식 예:

- 사내 Nginx에서 `dist/` 정적 서빙
- 사내 웹서버
- 내부 Docker/Nginx image
- 일단 파일럿은 `pnpm run preview -- --host 0.0.0.0 --port 10097`

파일럿 preview:

```bash
pnpm run preview -- --host 0.0.0.0 --port 10097
```

운영 URL 예:

```text
https://work-dashboard.company.local
```

이 경우 self-hosted Supabase `.env`의 `SITE_URL`도 앱 URL로 맞춰야 합니다.

```text
SITE_URL=https://work-dashboard.company.local
```

## 최종 구현에 현재 기능이 모두 포함되나

현재 `codex/poslab-entry-landing` 브랜치에는 아래가 포함되어 있습니다.

- POSLAB 랜딩페이지
- My Desk
- Team Flow
- Calendar
- Updates
- Highlights
- Canvas
- 마인드맵
- 관리자 화면
- 태그/업무흐름 관리
- 업무 노트/게시글 UI
- 업무흐름별 게시글 모음
- Canvas Supabase 공유 저장 migration
- 변경 이력 수정/삭제 migration
- 업데이트 로그 수정/삭제 migration
- 업무 노트 게시글 migration
- 로컬 리눅스 Supabase 안내 문서

따라서 “현재까지 만든 화면 기능”은 이 브랜치를 기준으로 가져가면 됩니다.

하지만 self-hosted 운영 관점에서 아직 필요한 작업이 있습니다.

## 운영 전 추가로 필요한 작업

### 필수 1. 운영 기준 브랜치 확정

`codex/poslab-entry-landing`을 그대로 운영에 쓰기보다, 아래 중 하나로 정리해야 합니다.

권장:

```text
release/company-self-hosted
```

최종:

```text
main
```

### 필수 2. self-hosted Supabase 서버 설치

Supabase 공식 Docker Compose 구성으로 설치합니다.

필요:

- Linux server
- Docker Engine
- Docker Compose
- Git
- openssl
- jq
- 사내 DNS 또는 IP
- 방화벽/포트 정책
- reverse proxy/HTTPS 여부

### 필수 3. migration 001부터 020까지 적용

테이블이 생겨야 실제 공유 저장이 됩니다.

주요 테이블:

- `users`
- `team_roster`
- `tasks`
- `subtasks`
- `task_updates`
- `task_change_history`
- `task_links`
- `tags`
- `tag_groups`
- `calendar_events`
- `dashboard_memos`
- `canvas_tabs`
- `canvas_nodes`
- `canvas_links`
- `task_posts`
- `task_post_categories`

### 필수 4. 첫 관리자 계정 생성

앱에서 회원가입 후 SQL로 admin 권한을 줍니다.

```sql
update public.users
set
  permission_role = 'admin',
  title = '수석',
  is_team_member = true,
  is_active = true
where email = '관리자_이메일';
```

### 필수 5. 앱 환경변수 연결

앱 `.env.local` 또는 운영 배포 환경변수:

```bash
VITE_SUPABASE_URL=https://supabase.company.local
VITE_SUPABASE_ANON_KEY=SUPABASE_PUBLISHABLE_KEY_또는_ANON_KEY
```

### 필수 6. 백업 정책

최소한 아래가 필요합니다.

- Postgres 정기 백업
- Storage 파일 백업
- self-hosted `.env` 안전 보관
- 복구 리허설
- 장애 시 이전 release tag로 되돌리는 절차

### 필수 7. Auth/계정 정책

결정해야 합니다.

- 이메일/비밀번호로 시작할지
- 회사 SSO를 붙일지
- 회원가입을 누구나 할 수 있게 둘지
- admin이 roster를 먼저 만들고 초대할지
- 퇴사/이동자 비활성화 절차

### 필수 8. HTTPS/내부망 URL

운영이면 HTTP보다 HTTPS가 좋습니다.

예:

```text
https://work-dashboard.company.local
https://supabase.company.local
```

Supabase `.env`와 앱 `.env.local`의 URL이 서로 맞아야 합니다.

### 필수 9. 실제 데이터 전환 방식 결정

현재 demo/fallback 데이터와 실제 운영 데이터는 구분해야 합니다.

선택:

- 운영 시작 시 빈 DB에서 시작
- 팀원/태그/초기 업무만 seed
- 기존 샘플 데이터를 일부 import
- 데모 데이터는 운영 DB에 넣지 않음

추천:

```text
운영 DB는 빈 상태 + 실제 팀원 roster + 기본 태그/게시글 유형만 시작
```

### 추가 1. 업무흐름 확정값 DB 저장

현재 `상위 업무흐름`은 앱에서 파생/관리되고 있지만, 확정값을 운영 DB에 안정적으로 저장하려면 `tasks.workstream` 컬럼 migration이 필요합니다.

필요 작업:

- `tasks.workstream` 컬럼 추가
- `src/supabaseStore.js`의 task read/write에 workstream 연결
- 관리자 `업무흐름 관리` rename 결과를 DB에 반영
- 기존 업무의 workstream backfill

### 추가 2. 업무 노트 파일 첨부

현재 `task_posts.attachment`는 metadata placeholder입니다.

진짜 이미지/파일 첨부를 쓰려면:

- Supabase Storage bucket 생성
- storage RLS 작성
- 파일 업로드 UI 연결
- 파일 삭제 정책
- 파일 크기/확장자 제한
- 백업 대상 포함

### 추가 3. 실시간 협업

나중 기능으로 분리하는 것이 좋습니다.

- 실시간 커서
- 동시 편집 충돌 처리
- Canvas node lock
- 변경 이력 상세
- Supabase Realtime channel 설계

### 추가 4. 운영 모니터링

최소:

- Docker container 상태 확인
- DB 백업 성공 여부
- 디스크 용량
- 로그인 실패/오류 로그
- 앱 build version/tag 확인

## 회사 PC에서 나중에 무엇을 클론해야 하나

### 데모 PC

지금처럼 앱 repo만 받습니다.

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout codex/poslab-entry-landing
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

### self-hosted Supabase 서버

두 가지를 모두 받습니다.

1. Supabase 공식 Docker 구성

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir supabase-project
cp -rf supabase/docker/* supabase-project
cp supabase/docker/.env.example supabase-project/.env
```

2. 우리 대시보드 repo

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout release/company-self-hosted
```

만약 아직 release 브랜치가 없다면:

```bash
git checkout codex/poslab-entry-landing
```

### 운영 웹서버

대시보드 repo만 받아서 build합니다.

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout release/company-self-hosted
pnpm install --frozen-lockfile
CI=true pnpm run build
```

그 다음 `dist/`를 사내 웹서버가 서빙합니다.

## 추천 진행 순서

### 1단계. 내일 데모

```bash
cd work-dashborad
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 10097
```

목표:

- 화면 흐름 확인
- 랜딩페이지 확인
- 업무 노트/게시글 방향 확인
- Supabase 운영 여부 최종 의사결정

### 2단계. 운영 기준 브랜치 만들기

```bash
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
git checkout -b release/company-self-hosted
git push origin release/company-self-hosted
```

### 3단계. 회사 내부 Supabase test 서버 설치

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir supabase-project
cp -rf supabase/docker/* supabase-project
cp supabase/docker/.env.example supabase-project/.env
cd supabase-project
```

`.env` 설정 후:

```bash
sh utils/generate-keys.sh
sh utils/add-new-auth-keys.sh
sh run.sh start
docker compose ps
```

### 4단계. 대시보드 migration 적용

```bash
cd work-dashborad
git checkout release/company-self-hosted
export DATABASE_URL="postgres://..."

for file in supabase/migrations/*.sql; do
  echo "Applying $file"
  psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$file"
done
```

### 5단계. 앱을 self-hosted Supabase로 연결

```bash
cp .env.example .env.local
```

`.env.local`:

```bash
VITE_SUPABASE_URL=https://supabase.company.local
VITE_SUPABASE_ANON_KEY=SUPABASE_PUBLISHABLE_KEY_또는_ANON_KEY
```

확인:

```bash
CI=true pnpm run build
pnpm run preview -- --host 0.0.0.0 --port 10097
```

### 6단계. 첫 관리자 생성

앱에서 가입 후 SQL:

```sql
update public.users
set
  permission_role = 'admin',
  title = '수석',
  is_team_member = true,
  is_active = true
where email = '관리자_이메일';
```

### 7단계. 운영 전 체크

아래가 모두 yes여야 합니다.

- 앱 URL 접속 가능
- Supabase URL 접속 가능
- 로그인 가능
- 관리자 탭 보임
- 업무 생성/수정/삭제 가능
- 업데이트 로그 수정/삭제 가능
- 변경 이력 수정/삭제 가능
- Canvas 저장 후 새로고침 유지
- 업무 노트 작성 후 새로고침 유지
- 다른 PC에서 같은 데이터 보임
- service role/secret key가 프론트에 노출되지 않음
- 백업/복구 절차 있음
- 실제 운영 브랜치/tag가 있음

## 현재 기준에서 “또 필요한 작업” 목록

필수:

- `codex/poslab-entry-landing`을 release 브랜치 또는 main으로 정리
- self-hosted Supabase 설치
- `001`부터 `020` migration 적용
- self-hosted URL/key를 앱 환경변수에 연결
- 첫 admin 계정 생성
- 실제 팀 roster 입력
- 운영 DB 백업 정책 수립

권장:

- `tasks.workstream` DB 컬럼 추가
- 업무 노트 파일 첨부 Storage 구현
- 운영용 build/static hosting 구성
- HTTPS/reverse proxy 설정
- SSO 검토
- release tag 생성

나중 기능:

- 실시간 커서
- 동시 편집 충돌 처리
- Canvas 변경 이력
- post attachment version/history
- 세부 감사 로그

## 한 줄 정리

내일 데모는 지금 브랜치만 pull해서 보여주면 됩니다. self-hosted Supabase 운영으로 넘어갈 때는 `codex/poslab-entry-landing`을 운영 기준 브랜치나 `main`으로 정리한 뒤, 별도의 Supabase 공식 Docker 구성을 회사 서버에 설치하고, 우리 repo의 `supabase/migrations/001...020`을 그 DB에 적용한 다음, 앱의 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 회사 내부 Supabase 주소/key로 연결하면 됩니다.
