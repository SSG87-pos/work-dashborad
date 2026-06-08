# Linux Local Supabase Runbook

이 문서는 회사 리눅스 컴퓨터에서 이 대시보드를 로컬 Supabase에 연결해 실행하기 위한 절차입니다.

작성 기준일: 2026-06-08

## 결론

가능합니다. 현재 프로젝트는 이미 Supabase 연결을 위한 기본 구조가 준비되어 있습니다.

- 프론트엔드는 `.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 채워지면 Supabase 모드로 전환됩니다.
- DB 스키마는 `supabase/migrations/001_initial_dashboard_schema.sql`부터 `020_task_posts.sql`까지 준비되어 있습니다.
- Canvas 공유 저장 테이블(`canvas_tabs`, `canvas_nodes`, `canvas_links`)과 업무/캘린더/로그/변경이력 주요 테이블의 RLS, Data API 권한이 마이그레이션에 포함되어 있습니다.
- 값이 없거나 Supabase 연결이 없으면 기존처럼 로컬 fallback 데모 데이터로 동작합니다.

`020_task_posts.sql`부터는 `업무 노트`와 `업무흐름별 게시글 모음`도 `task_posts`, `task_post_categories` 테이블로 분리됩니다. 회사 리눅스에서 `supabase db reset` 또는 migration 적용을 하면 게시글 본문/URL/분류도 Supabase 공유 저장 대상이 됩니다. 다만 실제 이미지/파일 첨부는 아직 metadata placeholder만 있고, Supabase Storage bucket/RLS는 별도 후속 작업이 필요합니다.

## Supabase를 로컬에 설치한다는 뜻

Supabase는 앱 폴더 안에 다음 구조를 두고 실행합니다.

```text
work-dashborad/
  supabase/
    config.toml
    migrations/
      001_initial_dashboard_schema.sql
      ...
      019_task_updates_manage.sql
      020_task_posts.sql
```

`supabase init`은 `supabase/config.toml`을 만들고, `supabase start`는 Docker 컨테이너로 로컬 Supabase 스택을 띄웁니다. 공식 문서 기준으로 로컬 Supabase CLI는 `supabase init`, `supabase start` 흐름을 사용하며, 로컬 스택은 Docker 컨테이너로 실행됩니다.

참고한 공식 문서:

- Supabase CLI 시작: https://supabase.com/docs/guides/local-development/cli/getting-started
- Local development 개요: https://supabase.com/docs/guides/local-development/overview
- CLI reference: https://supabase.com/docs/reference/cli/introduction
- CLI config: https://supabase.com/docs/guides/local-development/cli/config
- Self-hosted Docker: https://supabase.com/docs/guides/self-hosting/docker

## 먼저 결정할 것

### 1. 같은 리눅스 PC에서만 볼 것인가

리눅스 컴퓨터에서 브라우저까지 같이 열어 확인한다면 가장 단순합니다.

- 앱 주소: `http://localhost:10097/`
- Supabase API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`

이 경우 `.env.local`에는 보통 아래처럼 둡니다.

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=SUPABASE_STATUS에서_복사한_anon_key
```

### 2. 다른 팀원 PC에서 리눅스 PC의 데모를 볼 것인가

팀원이 각자 브라우저에서 `http://리눅스IP:10097/`로 접속하는 구조라면 주의가 필요합니다.

브라우저에서 실행되는 프론트엔드는 Supabase API도 브라우저가 직접 접근합니다. 따라서 `.env.local`의 `VITE_SUPABASE_URL`이 `http://127.0.0.1:54321`이면 팀원 PC에서는 자기 PC의 54321번을 찾게 되어 실패합니다.

이 경우에는 다음 중 하나로 해야 합니다.

- 가장 안전한 데모: 리눅스 PC에서만 앱을 열고 화면 공유로 시연합니다.
- 내부망 데모: `VITE_SUPABASE_URL=http://리눅스IP:54321`로 설정하고, 리눅스 방화벽과 Docker 포트가 내부망에서 54321 접근을 허용하는지 확인합니다.
- 운영에 가까운 방식: Supabase CLI local stack 대신 회사 내부 서버용 self-hosted Supabase Docker 구성을 검토합니다.

Supabase 공식 문서도 로컬 개발 스택을 공개망에 노출하지 말라고 안내합니다. 회사 내부망에서도 최소한 포트, 방화벽, 계정, 샘플/실데이터 범위를 확인한 뒤 사용하세요.

## 현재 프로젝트 상태 점검

현재 레포 기준으로 확인해야 할 핵심 파일입니다.

```text
package.json
.env.example
src/supabaseClient.js
src/supabaseStore.js
src/storage.js
supabase/migrations/
docs/supabase-start-guide.md
```

현재 연결 방식:

- `src/supabaseClient.js`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - 두 값이 모두 있을 때만 Supabase client를 생성합니다.
- `.env.example`
  - 같은 두 변수를 비워 둔 예시가 있습니다.
  - 비어 있으면 앱은 로컬 prototype store를 씁니다.
- `src/supabaseStore.js`
  - 로그인, 프로필, 사용자/roster, 태그, 업무, 세부업무, 변경이력, 업데이트 로그, 관련 링크, 캘린더, 메모, Canvas 저장을 Supabase로 읽고 씁니다.
- `src/storage.js`
  - Supabase가 없을 때의 fallback 저장 경계입니다.

현재 마이그레이션 범위:

- `001`: 핵심 스키마, 사용자, 업무, 태그, 캘린더, 로그, RLS, 기본 grants
- `014`: RLS helper를 `private` schema로 이동
- `016`: Canvas 공유 저장 테이블
- `017`: Canvas todo node용 `canvas_nodes.data`
- `018`: 변경 이력 수정/삭제 권한
- `019`: 업데이트 로그 수정/삭제 권한
- `020`: 업무 노트 게시글과 게시글 유형 관리

아직 Supabase 공유 저장이 아닌 것:

- 첨부 이미지/파일 storage
- 업무흐름 확정값의 DB 컬럼 저장(`tasks.workstream`)은 향후 migration 필요

## 리눅스 컴퓨터 준비물

회사 리눅스에 아래가 필요합니다.

- Git
- Node.js 20 이상 권장
- pnpm 11.x
- Docker Engine + Docker Compose 또는 Docker 호환 런타임
- Supabase CLI

확인 명령:

```bash
git --version
node --version
pnpm --version
docker --version
docker compose version
supabase --version
```

Node가 없다면 회사 표준 설치 방법을 우선 따르세요. `pnpm`은 Node의 Corepack으로 맞추는 방식이 가장 깔끔합니다.

```bash
corepack enable
corepack prepare pnpm@11.5.1 --activate
pnpm --version
```

Supabase CLI는 전역 `npm install -g supabase` 방식이 공식적으로 지원되지 않습니다. 회사 환경에서는 다음 둘 중 하나를 권장합니다.

### 권장 A: standalone binary

1. https://github.com/supabase/cli/releases/latest 에서 Linux용 standalone binary를 받습니다.
2. 압축을 풀어 `supabase` 실행 파일을 `~/.local/bin` 같은 PATH 위치에 둡니다.
3. `supabase --version`으로 확인합니다.

예시입니다. 버전과 파일명은 GitHub releases에서 실제 최신 항목을 확인하고 맞추세요.

```bash
mkdir -p "$HOME/.local/bin"
curl -L "https://github.com/supabase/cli/releases/download/v2.105.0/supabase_linux_amd64.tar.gz" -o /tmp/supabase_linux_amd64.tar.gz
tar -xzf /tmp/supabase_linux_amd64.tar.gz -C /tmp
install /tmp/supabase "$HOME/.local/bin/supabase"
supabase --version
```

### 대안 B: npx로 Supabase CLI 실행

공식 문서에서는 `npx supabase --help`도 안내합니다. 다만 이 프로젝트는 pnpm을 사용하므로, 회사 PC에서는 standalone binary가 더 예측 가능합니다.

```bash
npx supabase --help
```

## 코드 받기

새로 받을 때:

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
pnpm install --frozen-lockfile
```

이미 받은 폴더가 있을 때:

```bash
cd /회사에서/받은/work-dashborad
git checkout codex/poslab-entry-landing
git pull origin codex/poslab-entry-landing
pnpm install --frozen-lockfile
```

## Supabase local project 초기화

현재 레포에는 `supabase/migrations`가 있지만, `supabase/config.toml`은 회사 리눅스에서 `supabase init`으로 생성하는 흐름을 권장합니다.

```bash
cd /회사에서/받은/work-dashborad
supabase --help
supabase init
```

이미 `supabase/config.toml`이 있으면 다시 만들 필요가 없습니다.

```bash
test -f supabase/config.toml && echo "config.toml exists"
```

앱을 `10097` 포트로 볼 예정이면 `supabase/config.toml`의 Auth URL도 맞춰두는 것이 좋습니다.

```toml
[auth]
site_url = "http://localhost:10097"
additional_redirect_urls = [
  "http://localhost:10097",
  "http://127.0.0.1:10097"
]
```

다른 PC에서 `http://리눅스IP:10097`로 접근해야 한다면 아래도 추가합니다.

```toml
[auth]
site_url = "http://리눅스IP:10097"
additional_redirect_urls = [
  "http://localhost:10097",
  "http://127.0.0.1:10097",
  "http://리눅스IP:10097"
]
```

설정을 바꾸면 Supabase를 재시작해야 합니다.

```bash
supabase stop
supabase start
```

## Supabase 실행

Docker가 실행 중인지 먼저 확인합니다.

```bash
docker ps
```

그 다음 프로젝트 폴더에서 Supabase를 시작합니다.

```bash
cd /회사에서/받은/work-dashborad
supabase start
```

처음 실행은 Docker 이미지를 받아야 해서 오래 걸릴 수 있습니다.

상태와 접속 정보를 확인합니다.

```bash
supabase status
```

일반적으로 이런 값이 나옵니다.

```text
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: ...
service_role key: ...
```

프론트엔드에는 반드시 `anon key`만 넣습니다. `service_role key`는 절대 `VITE_` 환경변수나 브라우저 코드에 넣으면 안 됩니다.

## DB 마이그레이션 적용

깨끗한 최초 로컬 DB라면 다음을 실행합니다.

```bash
supabase db reset
```

이 명령은 로컬 DB를 깨끗하게 재생성하고 `supabase/migrations`의 모든 SQL을 적용합니다. 로컬 DB에 들어 있던 데이터는 사라질 수 있으니, 이미 데이터를 넣은 뒤에는 신중하게 사용하세요.

데이터를 유지하면서 새 migration만 적용하려는 상황이라면 먼저 CLI 도움말을 확인한 뒤 진행하세요.

```bash
supabase migration --help
supabase migration up --help
supabase migration up
```

마이그레이션이 들어갔는지 확인합니다.

```bash
supabase migration list
```

Studio에서도 확인할 수 있습니다.

```text
http://127.0.0.1:54323
```

## 프론트엔드 환경변수 연결

프로젝트 루트에 `.env.local`을 만듭니다.

같은 리눅스 PC에서만 브라우저를 열 때:

```bash
cp .env.example .env.local
```

`.env.local` 내용:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=위에서_supabase_status로_확인한_anon_key
```

다른 PC에서 `http://리눅스IP:10097/`로 앱을 볼 때:

```bash
VITE_SUPABASE_URL=http://리눅스IP:54321
VITE_SUPABASE_ANON_KEY=위에서_supabase_status로_확인한_anon_key
```

변경 후 Vite dev server는 재시작해야 합니다.

## 앱 실행

회사에서 정한 데모 주소가 `localhost:10097/`라면 아래처럼 실행합니다.

같은 PC에서만 확인:

```bash
pnpm run dev -- --host 127.0.0.1 --port 10097
```

다른 내부망 PC에서도 접근:

```bash
pnpm run dev -- --host 0.0.0.0 --port 10097
```

같은 PC:

```text
http://localhost:10097/
```

다른 PC:

```text
http://리눅스IP:10097/
```

다른 PC에서 볼 경우 리눅스 방화벽에서 최소한 앱 포트 `10097`이 열려 있어야 합니다. Supabase API를 다른 PC 브라우저가 직접 호출해야 한다면 `54321`도 접근 가능해야 합니다.

## 첫 관리자 만들기

로컬 Supabase는 새 DB이므로 사용자를 새로 만들어야 합니다.

1. 앱에서 회원가입합니다.
2. 처음 가입한 사용자는 기본 `member`입니다.
3. Supabase Studio SQL Editor 또는 DB 접속으로 관리자 권한을 부여합니다.

Supabase Studio:

```text
http://127.0.0.1:54323
```

SQL:

```sql
update public.users
set
  permission_role = 'admin',
  title = '수석',
  is_team_member = true,
  is_active = true
where email = '본인_회사_이메일';
```

팀장 권한을 줄 때:

```sql
update public.users
set
  permission_role = 'lead',
  title = '팀장',
  is_team_member = true,
  is_active = true
where email = '팀장_이메일';
```

권한을 바꾼 뒤 앱에서 새로고침하거나 로그아웃 후 다시 로그인합니다.

## 샘플/데모 데이터에 대해

로컬 fallback 모드에서는 앱 안의 샘플 데이터가 보입니다. 하지만 Supabase 모드의 DB는 처음에는 비어 있습니다.

정확히 말하면:

- Supabase 연결 전: 내장 샘플/로컬 fallback 데이터가 보입니다.
- Supabase 연결 후 로그인 전: 로그인 화면이 우선입니다.
- Supabase 연결 후 로그인: Supabase DB에 저장된 공유 데이터가 기준입니다.
- 기존 샘플 데이터를 Supabase로 옮기려면 관리자 import 흐름 또는 별도 seed/import 작업이 필요합니다.

현재 코드에는 관리자용 Supabase import 경계(`importDashboardData`)가 있으므로, 실제 운영 전에는 샘플 데이터/초기 업무를 어떤 방식으로 넣을지 별도로 정하면 됩니다.

## 연결 확인 체크리스트

Supabase:

```bash
supabase status
supabase migration list
```

앱 빌드:

```bash
CI=true pnpm run build
```

프로젝트 점검:

```bash
pnpm run check:demo-readiness
pnpm run check:canvas-storage
pnpm run check:import-plan
pnpm run check:summary-filter
```

브라우저 확인:

- 앱이 `로컬 저장`이 아니라 Supabase 연결 상태로 보이는지 확인합니다.
- 회원가입/로그인이 되는지 확인합니다.
- 관리자 SQL 적용 후 `관리자` 탭이 보이는지 확인합니다.
- 업무를 하나 만들고 새로고침 후 유지되는지 확인합니다.
- 다른 브라우저나 다른 PC 로그인에서 같은 업무가 보이는지 확인합니다.
- Canvas에서 노드를 하나 추가하고 새로고침 후 유지되는지 확인합니다.

## 자주 막히는 지점

### 앱이 계속 로컬 fallback처럼 보임

원인:

- `.env.local`이 없거나 값이 비어 있음
- Vite dev server를 재시작하지 않음
- `VITE_SUPABASE_ANON_KEY`가 `service_role key` 또는 잘못된 값임

해결:

```bash
cat .env.local
supabase status
pnpm run dev -- --host 127.0.0.1 --port 10097
```

### 다른 PC에서는 로그인/데이터 호출이 안 됨

원인:

- `.env.local`의 `VITE_SUPABASE_URL`이 `127.0.0.1`이라서 다른 PC 브라우저가 자기 자신을 바라봄
- 리눅스 방화벽이 54321을 막음
- Supabase local stack이 외부 접속을 받지 않음

확인:

```bash
curl http://리눅스IP:54321/rest/v1/
```

다른 PC에서 이 주소가 접근되지 않으면 앱도 Supabase 데이터를 못 읽습니다.

### `supabase db reset` 후 데이터가 사라짐

정상입니다. `db reset`은 로컬 DB를 재생성하고 migrations와 seed를 다시 적용합니다. 실제 입력 데이터를 보존해야 하는 단계에서는 실행 전 백업이 필요합니다.

백업 예시:

```bash
supabase db dump --local --data-only -f supabase/seed.sql
```

### RLS 때문에 저장이 안 됨

가능한 원인:

- 로그인하지 않았음
- 사용자가 `public.users`에 없거나 `is_active = false`
- 관리자/팀장 권한이 필요한 작업을 member로 수행
- 마이그레이션이 끝까지 적용되지 않음

확인 SQL:

```sql
select id, email, name, title, permission_role, is_team_member, is_active
from public.users
order by created_at desc;
```

### 포트 충돌

Supabase 기본 포트:

- API: `54321`
- DB: `54322`
- Studio: `54323`
- Mailpit/Inbucket: `54324`

앱 데모 포트:

- Vite: `10097`

충돌 확인:

```bash
supabase status
ss -ltnp | grep -E '54321|54322|54323|54324|10097'
```

## 멈추기

앱 dev server는 실행 중인 터미널에서 `Ctrl+C`로 멈춥니다.

Supabase는 데이터 볼륨을 유지하며 멈춥니다.

```bash
supabase stop
```

데이터까지 지우는 명령은 신중하게 사용합니다.

```bash
supabase stop --no-backup
```

## 운영 판단 시 다음 단계

로컬 Supabase 연결이 잘 되면 다음 의사결정이 필요합니다.

1. 로컬 CLI stack을 데모/파일럿까지만 쓸지, 회사 내부 self-hosted Supabase로 운영할지 결정
2. 업무 노트 이미지/파일 첨부를 위한 Supabase Storage bucket/RLS 설계
3. `tasks.workstream` 컬럼 추가로 확정 업무흐름 값을 공유 DB에 저장
4. 회사 계정/SSO 적용 여부 결정
5. 백업/복구, 계정 생성 정책, 관리자 권한자, 포트/방화벽, 로그 보존 정책 결정
6. live cursor, 동시 편집 충돌 처리, 변경 이력 확장 같은 협업 기능 설계

파일럿 단계에서는 Supabase CLI local stack으로 충분히 검증할 수 있습니다. 여러 명이 매일 쓰는 내부 운영 도구로 넘어가려면 self-hosted Docker 구성 또는 회사가 승인한 Supabase 운영 방식으로 전환하는 것이 좋습니다.
