# Company Supabase Platform Image Handoff

작성 기준일: 2026-07-01

이 문서는 회사 C3/플랫폼 담당자에게 전달할 **self-hosted Supabase backend 플랫폼 이미지 정보**입니다. 핵심은 Supabase가 단일 backend 이미지가 아니라, 공식 Docker Compose 기반의 여러 서비스 묶음이라는 점입니다.

## 1. 회사에 먼저 보낼 링크

아래 링크를 그대로 전달하면 됩니다.

| 용도 | 링크 |
| --- | --- |
| Supabase self-hosting 개요 | https://supabase.com/docs/guides/self-hosting |
| Docker self-hosting 공식 문서 | https://supabase.com/docs/guides/self-hosting/docker |
| 공식 Docker 구성 폴더 | https://github.com/supabase/supabase/tree/master/docker |
| 공식 Docker Compose 원본 | https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml |
| 공식 환경변수 예시 | https://raw.githubusercontent.com/supabase/supabase/master/docker/.env.example |
| Docker 구성 README | https://raw.githubusercontent.com/supabase/supabase/master/docker/README.md |
| 이미지 버전 이력 | https://github.com/supabase/supabase/blob/master/docker/versions.md |
| 회사 전달에 사용한 release source archive | https://github.com/supabase/supabase/archive/refs/tags/v1.26.05.tar.gz |
| Product security | https://supabase.com/docs/guides/security/product-security |

회사에 전달할 짧은 문구:

```text
Supabase self-hosted backend는 단일 Docker 이미지가 아니라 공식 Docker Compose 기반의 multi-container stack입니다.
아래 공식 docker-compose.yml과 .env.example을 기준으로 C3/회사 플랫폼에서 multi-container, volume, secret, registry pull, reverse proxy/TLS 지원 여부를 확인 부탁드립니다.
```

## 2. 현재 공식 Compose 기준 이미지 목록

2026-07-01에 아래 원본 파일을 확인했습니다.

```text
https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml
```

현재 확인된 이미지:

| 서비스 | 컨테이너명 | 이미지 |
| --- | --- | --- |
| Studio | `supabase-studio` | `supabase/studio:2026.06.03-sha-0bca601` |
| API Gateway | `supabase-kong` | `kong/kong:3.9.1` |
| Auth | `supabase-auth` | `supabase/gotrue:v2.189.0` |
| REST Data API | `supabase-rest` | `postgrest/postgrest:v14.12` |
| Realtime | `realtime-dev.supabase-realtime` | `supabase/realtime:v2.102.3` |
| Storage | `supabase-storage` | `supabase/storage-api:v1.60.4` |
| Image proxy | `supabase-imgproxy` | `darthsim/imgproxy:v3.30.1` |
| Postgres metadata API | `supabase-meta` | `supabase/postgres-meta:v0.96.6` |
| Edge Functions runtime | `supabase-edge-functions` | `supabase/edge-runtime:v1.74.0` |
| PostgreSQL | `supabase-db` | `supabase/postgres:17.6.1.136` |
| Pooler | `supabase-pooler` | `supabase/supavisor:2.9.5` |

주의: 위 표는 2026-07-01 확인값입니다. Supabase 공식 `master`의 Docker Compose는 바뀔 수 있으므로, 회사에 최종 전달하기 직전에 다시 확인해야 합니다.

## 3. Docker Hub 이미지 reference

회사 플랫폼이 Docker Hub 이미지명을 직접 요구하면 아래 목록을 전달합니다.

```text
docker.io/supabase/studio:2026.06.03-sha-0bca601
docker.io/kong/kong:3.9.1
docker.io/supabase/gotrue:v2.189.0
docker.io/postgrest/postgrest:v14.12
docker.io/supabase/realtime:v2.102.3
docker.io/supabase/storage-api:v1.60.4
docker.io/darthsim/imgproxy:v3.30.1
docker.io/supabase/postgres-meta:v0.96.6
docker.io/supabase/edge-runtime:v1.74.0
docker.io/supabase/postgres:17.6.1.136
docker.io/supabase/supavisor:2.9.5
```

Docker Hub repo 링크:

| 이미지 | Docker Hub |
| --- | --- |
| `supabase/studio` | https://hub.docker.com/r/supabase/studio |
| `kong/kong` | https://hub.docker.com/r/kong/kong |
| `supabase/gotrue` | https://hub.docker.com/r/supabase/gotrue |
| `postgrest/postgrest` | https://hub.docker.com/r/postgrest/postgrest |
| `supabase/realtime` | https://hub.docker.com/r/supabase/realtime |
| `supabase/storage-api` | https://hub.docker.com/r/supabase/storage-api |
| `darthsim/imgproxy` | https://hub.docker.com/r/darthsim/imgproxy |
| `supabase/postgres-meta` | https://hub.docker.com/r/supabase/postgres-meta |
| `supabase/edge-runtime` | https://hub.docker.com/r/supabase/edge-runtime |
| `supabase/postgres` | https://hub.docker.com/r/supabase/postgres |
| `supabase/supavisor` | https://hub.docker.com/r/supabase/supavisor |

내부 registry로 반입해야 한다면 위 `docker.io/...` reference를 pull한 뒤 회사 registry 주소로 retag/push합니다.

## 4. 회사 전달 완료 링크

회사에서 요구한 backend 플랫폼 이미지 정보는 아래 Supabase release source archive 전달로 1차 해결되었습니다.

```text
https://github.com/supabase/supabase/releases
https://github.com/supabase/supabase/archive/refs/tags/v1.26.05.tar.gz
```

이 링크는 Docker Hub image reference가 아니라 GitHub release의 source archive입니다. 회사 플랫폼 담당자가 이 archive를 기준으로 내부 반입/검토/이미지 생성을 진행할 수 있습니다.

주의:

- source archive만으로 실제 운영 컨테이너가 바로 생기는 것은 아닙니다.
- 운영 생성 시에는 archive 안의 `docker/` 구성, `docker-compose.yml`, `.env.example`, 그리고 위 Docker Hub image reference 또는 회사 내부 registry 반입 절차가 함께 필요할 수 있습니다.
- 회사가 이미 이 release source archive로 접수 완료했다고 답했다면, 다음 단계는 Supabase 생성 후 접속값을 받는 것입니다.

## 5. 이미지 정보는 어떻게 만드는가

회사가 말한 “backend 플랫폼 이미지 정보 링크”는 보통 아래 둘 중 하나입니다.

### A. 링크만 필요한 경우

공식 Compose 링크를 보내면 됩니다.

```text
https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml
```

이 파일 안의 `image:` 항목이 플랫폼이 pull해야 할 이미지 목록입니다.

### B. 내부 registry 반입용 목록이 필요한 경우

회사 담당자가 인터넷 Docker Hub에서 직접 pull할 수 없거나, 내부 registry에 이미지를 먼저 등록해야 할 수 있습니다. 이때는 아래 순서로 만듭니다.

```bash
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker
cp .env.example .env
docker compose config --images
```

그 다음 회사 정책에 따라 이미지를 pull/save/push합니다.

```bash
docker compose pull

# 예시: 회사 내부 registry를 쓰는 경우
docker tag supabase/studio:2026.06.03-sha-0bca601 registry.company.local/supabase/studio:2026.06.03-sha-0bca601
docker push registry.company.local/supabase/studio:2026.06.03-sha-0bca601
```

내부 registry를 쓰면 `docker-compose.yml`의 `image:` 값을 회사 registry 주소로 바꾼 별도 운영본이 필요합니다. 이 운영본에는 secret 값을 넣지 않습니다.

## 6. 회사 플랫폼 확인 질문

Supabase self-hosted 생성을 요청할 때 아래를 같이 확인해야 합니다.

| 확인 항목 | 필요한 이유 |
| --- | --- |
| Docker Compose 또는 multi-container stack 지원 | Supabase는 단일 이미지가 아니라 여러 컨테이너입니다. |
| Persistent volume 지원 | Postgres 데이터와 Storage 파일이 재시작 후에도 남아야 합니다. |
| Secret/env 관리 | `POSTGRES_PASSWORD`, `JWT_SECRET`, API key, Studio password가 필요합니다. |
| 내부 registry 또는 Docker Hub pull 가능 여부 | C3가 공식 이미지를 받을 수 있어야 합니다. |
| Reverse proxy/TLS | 로그인/Auth/Storage 운영 전 HTTPS가 필요합니다. |
| SMTP 설정 | 이메일 회원가입/비밀번호 재설정에 필요합니다. |
| 백업/복구 정책 | self-hosted는 DB 백업과 업그레이드 책임이 회사 운영에 있습니다. |
| 외부/내부 접속 범위 | React 앱, FastAPI, 사용자가 Supabase API URL에 접근 가능한지 정해야 합니다. |
| Edge Functions 지원 여부 | FastAPI 일부 기능을 나중에 Supabase 함수로 옮길 때 필요합니다. |

## 7. 필수 환경변수 범위

실제 값은 회사 secret manager나 C3 환경변수로 관리하고, Git에 올리지 않습니다.

공식 `.env.example`에서 특히 확인할 값:

```text
POSTGRES_PASSWORD
JWT_SECRET
ANON_KEY
SERVICE_ROLE_KEY
DASHBOARD_USERNAME
DASHBOARD_PASSWORD
SECRET_KEY_BASE
VAULT_ENC_KEY
SUPABASE_PUBLIC_URL
API_EXTERNAL_URL
SITE_URL
POOLER_PROXY_PORT_TRANSACTION
POOLER_DEFAULT_POOL_SIZE
POOLER_MAX_CLIENT_CONN
POOLER_TENANT_ID
PGRST_DB_SCHEMAS
KONG_HTTP_PORT
KONG_HTTPS_PORT
```

프론트엔드에는 publishable/anon 성격의 key만 들어갈 수 있습니다. `SERVICE_ROLE_KEY`, DB password, JWT secret은 절대 브라우저 빌드 환경변수에 넣지 않습니다.

## 8. 우리 앱과 연결할 때 필요한 정보

회사 Supabase가 생성되면 우리 앱 쪽에서 최소 아래를 받아야 합니다.

| 정보 | 쓰임 |
| --- | --- |
| Supabase public URL | React에서 Supabase Auth/API/Storage에 접속할 때 사용 |
| anon 또는 publishable key | 브라우저에서 사용하는 공개 API key |
| service role 또는 secret key | 서버/FastAPI/관리 배치 전용. 브라우저 금지 |
| Postgres connection string | FastAPI가 Supabase Postgres를 DB로 사용할 때 필요 |
| Auth enable 여부 | Supabase Auth로 전환 가능한지 판단 |
| Storage enable 여부 | 업무 Note 이미지, OCR 원본, 첨부자료 저장 후보 |
| Realtime enable 여부 | 나중에 알림/동시 협업을 붙일 수 있는지 판단 |
| Edge Functions 배포 가능 여부 | FastAPI 일부 커스텀 로직을 Supabase 쪽으로 옮길 수 있는지 판단 |

## 9. 권장 전달 방식

회사에는 이 순서로 전달합니다.

1. 이 문서의 1번 링크 묶음
2. 2번 이미지 표, 3번 Docker Hub 이미지 reference, 또는 4번 release source archive
3. 6번 플랫폼 확인 질문
4. 회사가 가능하다고 답하면 Supabase 생성 후 8번 접속 정보를 요청
5. 우리 앱은 별도 브랜치에서 `FastAPI 유지 + Supabase Postgres/Auth/API 활용` 기준으로 연결 검증

## 10. 현재 프로젝트 판단

현재 `work-dashboard`는 FastAPI/PostgreSQL backend가 이미 구현되어 있습니다. 따라서 Supabase가 가능해졌다고 해서 바로 FastAPI를 폐기하지 않습니다.

권장 운영 전환:

```text
React/Vite dashboard
  -> Supabase Auth / REST API / Storage / Realtime 후보
  -> FastAPI for complex business logic
  -> Supabase Postgres as source of truth
```

단순 CRUD는 Supabase REST API로 옮길 후보가 될 수 있지만, Wiki 추천/승인, AI read API, 알림 생성, 업무흐름 유사도, 보고서 근거 생성처럼 업무 규칙이 많은 기능은 FastAPI 또는 Edge Functions 경계를 따로 판단합니다.
