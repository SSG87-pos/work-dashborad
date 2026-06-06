# Company PC Clone Runbook

## Purpose

나중에 GitHub에 올려둔 프로젝트를 회사 Windows 또는 Linux PC에서 clone해서 실행할 때 쓰는 절차다.

현재 슬기님 Mac에서는 `AGENTS.md`의 절대경로 pnpm 명령을 계속 사용한다. 이 문서는 다른 회사 PC에서 새로 clone할 때의 일반 명령을 따로 정리한다.

## Prerequisites

회사 PC에 필요한 것:

- Git
- Node.js LTS
- pnpm
- 회사망에서 `github.com` 접근 가능
- 회사망에서 Supabase URL 접근 가능
- 프로젝트용 `.env.local` 값

권장:

- Node.js는 LTS 버전을 사용한다.
- `corepack`으로 `package.json`에 명시된 pnpm 버전을 사용한다.
- 실제 업무 데이터는 회사 승인 전까지 입력하지 않는다.

## Clone

```bash
git clone https://github.com/SSG87-pos/work-dashborad.git
cd work-dashborad
```

저장소 이름은 현재 remote 기준으로 `work-dashborad`다. 나중에 GitHub에서 이름을 바꾸면 clone URL도 같이 바꾼다.

## Install

Windows PowerShell, Linux shell 공통:

```bash
corepack enable
corepack pnpm install
```

만약 회사 PC 정책상 `corepack`이 막혀 있으면 IT 정책에 맞는 방식으로 pnpm을 설치한 뒤 아래 명령을 사용한다.

```bash
pnpm install
```

## Environment

프로젝트 루트의 `.env.example`을 참고해 `.env.local`을 만든다.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Linux shell:

```bash
cp .env.example .env.local
```

그 다음 `.env.local`에 회사 검토용 Supabase 값을 넣는다.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

주의:

- `.env.local`은 Git에 올리지 않는다.
- service role key, DB password, Supabase secret은 프론트엔드 repo에 넣지 않는다.
- 값이 준비되지 않은 PC에서는 Supabase 로그인/공유 데이터 확인이 제한될 수 있다.

## Check

설치 후 아래 순서로 확인한다.

```bash
pnpm run check:demo-readiness
pnpm run check:import-plan
pnpm run check:summary-filter
pnpm run build
```

`check:demo-readiness`는 secret 값을 출력하지 않고, 필요한 파일과 script, `.env.local` key 존재 여부만 확인한다.

## Run

```bash
pnpm run dev
```

브라우저:

```text
http://127.0.0.1:5173/
```

같은 회사망의 다른 PC에서 접속할 필요가 있으면:

```bash
pnpm run demo:urls
```

출력된 `Network` URL을 사용한다.

## Platform Notes

Windows:

- PowerShell 또는 Windows Terminal을 권장한다.
- 방화벽이 Node/Vite incoming connection을 막을 수 있다.
- 경로 구분자는 Windows 방식이어도 Node/pnpm script는 그대로 동작한다.

Linux:

- 회사 프록시가 있으면 Git, pnpm registry, Supabase 접속이 각각 허용되어야 한다.
- 사내 방화벽 정책에 따라 `5173` 포트 접근이 막힐 수 있다.

## Stop Point

회사 승인 전에는 여기까지만 한다.

- 예시 데이터로 화면을 확인한다.
- 실제 팀원 가입/auth 연결은 하지 않는다.
- 실제 업무 데이터는 넣지 않는다.
- live DB 보안 정책 변경은 별도 승인 후 진행한다.
