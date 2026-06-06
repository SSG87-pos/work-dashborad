# Internal Port Demo Runbook

## Purpose

임시 인터넷 URL 없이 회사 내부에서 포트/로컬 네트워크 방식으로 `연구기획그룹-전략` 업무 대시보드를 시연하기 위한 실행 절차다.

나중에 회사 Windows/Linux PC에서 Git clone 후 실행할 때는 `docs/company-clone-runbook.md`를 함께 본다.

현재 결정:

- 임시 배포 URL은 만들지 않는다.
- 내부 1차 시연은 실명 예시 데이터로 진행한다.
- 실제 업무 데이터는 입력하지 않는다.
- 실제 팀원 auth 가입/계정 연결은 아직 하지 않는다.

## Before The Demo

확인할 것:

- 슬기님 Mac과 시연 대상 PC가 같은 회사망에 있는지 확인한다.
- 회사망에서 로컬 포트 접근이 허용되는지 확인한다.
- Mac 방화벽이 브라우저 접근을 차단하지 않는지 확인한다.
- Supabase 접속이 회사망에서 허용되는지 확인한다.
- `.env.local`은 `.env.example`과 같은 key 구성을 유지하되 실제 값은 문서에 적지 않는다.
- 실제 업무 비밀, 민감 링크, 민감 일정은 데모 데이터에 넣지 않는다.

## Run The App

프로젝트 폴더:

```bash
cd /Users/seulgi/Documents/work-dashboard
```

개발 서버 실행:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run dev
```

현재 `package.json`의 dev script는 `vite --host 0.0.0.0`이므로 같은 네트워크에서 접근할 수 있는 host binding을 사용한다.

사전 점검:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness
```

이 점검은 secret 값을 출력하지 않고, 데모에 필요한 파일/script와 `.env.local` key 존재 여부만 확인한다.

로컬 확인 주소:

```text
http://127.0.0.1:5173/
```

회사망 내 다른 PC에서 확인할 주소:

```text
http://<슬기님-Mac-IP>:5173/
```

접속 후보 URL 출력:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run demo:urls
```

출력 예시:

```text
Local:   http://127.0.0.1:5173/
Network: http://192.168.x.x:5173/
```

Mac IP 확인 예시:

```bash
ipconfig getifaddr en0
ipconfig getifaddr en1
```

둘 중 실제 회사망에 연결된 인터페이스의 IP를 사용한다.

## If Port 5173 Is Busy

Vite가 다른 포트를 배정하면 터미널에 표시된 URL을 사용한다.

예:

```text
Local:   http://localhost:5174/
Network: http://192.168.x.x:5174/
```

이 경우 다른 PC에서는 `Network` 주소를 사용한다.

## Demo Login

현재 데모 기준:

- 관리자 계정: `seulgis@posco.com`
- 표시 프로필: `소슬기 / 수석 / 관리자`
- 팀원 roster: `박경수`, `류강묵`, `장형민`, `박관욱`, `조원태`

주의:

- 비밀번호는 문서에 적지 않는다.
- 다른 사람에게 비밀번호를 공유하지 않는다.
- 실제 팀원이 직접 가입하는 흐름은 아직 제외한다.

## Demo Flow

권장 시연 순서:

1. Login 후 `Supabase 연결` 상태 확인.
2. My Desk에서 오늘 브리핑과 개인 업무 흐름 확인.
3. Team Flow에서 보드, 태그 필터, 업무 상세 확인.
4. Calendar에서 팀 일정/개인 일정/업무 일정 구분 확인.
5. Updates에서 최근 업데이트 로그 확인.
6. Highlights에서 주간 업무실적 리포트 확인.
7. 필요하면 보관함에서 `데모 데이터 채우기`로 완료/보류 누적 테이블 예시 확인.

## What Not To Do During Demo

- 실제 업무 데이터 입력 금지.
- 실제 팀원 가입/auth 연결 금지.
- JSON 가져오기 실행 금지.
- live DB 보안 정책 변경 금지.
- service role key, DB password, Supabase secret 노출 금지.
- 외부 임시 URL 생성 금지.

## Troubleshooting

다른 PC에서 접속이 안 될 때:

- 같은 회사망인지 확인한다.
- Mac IP가 맞는지 확인한다.
- 터미널에 표시된 `Network` URL을 다시 확인한다.
- Mac 방화벽/회사 보안 프로그램이 incoming connection을 막는지 확인한다.
- 포트가 `5173`이 아니라 Vite가 새로 배정한 포트인지 확인한다.

로그인 화면은 뜨지만 데이터가 안 보일 때:

- `Supabase 연결` 또는 Supabase 준비 상태를 확인한다.
- 회사망에서 `https://nbefvcrcfwacvnohtsmy.supabase.co` 접속이 가능한지 확인한다.
- Supabase 접속이 막혀 있으면 로컬 fallback 화면만 가능한지 별도로 판단한다.

## After The Demo

터미널에서 dev server를 종료한다.

```text
Ctrl + C
```

시연 후 결정할 것:

- Supabase 사용을 회사에 문의할지
- 익명 demo roster가 필요한지
- 실제 팀원 가입 검증을 언제 할지
- 보안 패스를 언제 승인할지
