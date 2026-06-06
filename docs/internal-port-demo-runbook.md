# Internal Port Demo Runbook

## Purpose

회사 내부에서 포트/로컬 네트워크 방식으로 `연구기획그룹-전략` 업무 대시보드를 시연하기 위한 실행 절차다.

기본 권장안은 회사망 포트 시연이다. 다만 회의 상황상 같은 네트워크 접속이 어렵거나 짧은 시간 동안만 여러 명에게 보여줘야 하면, 예시 데이터만 사용하는 조건으로 임시 인터넷 URL 시연을 별도 선택할 수 있다.

나중에 회사 Windows/Linux PC에서 Git clone 후 실행할 때는 `docs/company-clone-runbook.md`를 함께 본다.

현재 기본 결정:

- 1차 기본안은 임시 배포 URL 없이 회사 포트/로컬 네트워크로 시연한다.
- 필요 시 임시 인터넷 URL은 예시 데이터만 포함한 상태로, 회의 시간 동안만 제한적으로 연다.
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
- 임시 인터넷 URL을 열 경우, 실제 업무 데이터/민감자료/비공개 문서 링크를 절대 넣지 않는다.

## Temporary Internet URL Demo Option

임시 인터넷 URL은 회사망 포트 접근이 어렵거나, 회의 참석자가 같은 네트워크에 없어서 짧게 확인해야 할 때만 사용한다.

이 방식은 인터넷에서 접근 가능한 URL을 만들기 때문에 기본안이 아니라 보조안이다. 내부 소규모 시연이고 예시 데이터만 사용한다면 실명 roster를 유지할 수 있지만, 부서 외 공유나 보안 검토로 넘어가면 익명 roster를 준비한다.

### Minimum Conditions

- 실제 업무 데이터는 입력하지 않는다.
- 실제 업무 메모, 민감 일정, 비공개 문서 링크는 넣지 않는다.
- 예시 데이터와 실명 roster만 사용한다.
- URL은 회의 참석자에게만 공유한다.
- 시연 시간 동안만 열고, 끝나면 즉시 종료한다.
- Supabase service role key, DB password, `.env.local` 값, API secret은 화면/문서/채팅에 노출하지 않는다.
- 실제 팀원 signup/auth 연결, JSON import, live DB migration은 하지 않는다.

### Option A: Cloudflare Quick Tunnel

짧은 라이브 시연에 가장 가볍다. 로컬 dev server를 켠 뒤 별도 터미널에서 임시 URL을 만든다.

1. 앱 실행:

```bash
cd /Users/seulgi/Documents/work-dashboard
/Users/seulgi/Library/pnpm/bin/pnpm run dev
```

2. 다른 터미널에서 tunnel 실행:

```bash
cloudflared tunnel --url http://localhost:5173
```

3. 출력되는 `https://...trycloudflare.com` 주소를 회의 참석자에게만 공유한다.

4. 시연 종료 후 두 터미널에서 모두 종료한다.

```text
Ctrl + C
```

참고:

- Cloudflare 공식 문서의 Quick Tunnel 명령도 `cloudflared tunnel --url http://localhost:8080` 형태다.
- Quick Tunnel은 테스트/임시 공유 성격이다. 장기 운영 URL로 쓰지 않는다.
- Vite가 `5174` 같은 다른 포트를 잡으면 tunnel 명령도 해당 포트로 바꾼다.

예:

```bash
cloudflared tunnel --url http://localhost:5174
```

### Option B: ngrok

ngrok 계정/설정이 이미 있거나 회사 정책상 ngrok 사용이 더 익숙하면 사용할 수 있다.

1. 앱 실행:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run dev
```

2. 다른 터미널에서:

```bash
ngrok http 5173
```

3. 출력되는 `https://...ngrok...` 주소를 회의 참석자에게만 공유한다.

4. 시연 후 종료한다.

```text
Ctrl + C
```

### Option C: Vercel Hobby Preview

며칠 동안 내부 참석자들이 각자 눌러보는 정적 프론트 데모에는 Vercel Hobby를 검토할 수 있다.

Vercel Hobby는 무료 플랜이지만 개인 프로젝트/소규모 앱용이며, 배포 URL은 터널처럼 터미널을 끄면 바로 사라지는 방식이 아니다. 따라서 “회의 시간 동안만 잠깐 열고 닫기”에는 Cloudflare Quick Tunnel이 더 적합하다.

Vercel을 쓸 때의 기준:

- 예시 데이터만 사용한다.
- 실제 업무 데이터는 넣지 않는다.
- 배포 URL 공유 범위를 내부 참석자로 제한한다.
- 시연이 끝난 뒤 필요하면 프로젝트 배포를 비활성화하거나 삭제한다.
- Supabase 사용 승인 여부는 Vercel 배포와 별개로 계속 확인한다.

## Temporary URL Demo Checklist

시연 전:

- `git status -sb`가 의도한 브랜치/커밋 상태인지 확인한다.
- `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`가 통과한다.
- `/Users/seulgi/Library/pnpm/bin/pnpm run build`가 통과한다.
- 앱 화면에 실제 업무 비밀이 없는지 확인한다.
- 공유할 URL과 참석자 범위를 정한다.

시연 중:

- `Supabase 연결` 상태를 확인한다.
- POSLAB entry -> Team Flow -> Mindmap -> Calendar -> Updates -> Highlights 순서로 보여준다.
- 실제 업무 입력/JSON import/DB 설정 변경은 하지 않는다.

시연 후:

- tunnel/dev server 터미널을 `Ctrl + C`로 종료한다.
- 임시 URL이 더 이상 열리지 않는지 확인한다.
- Vercel을 썼다면 배포 유지 여부를 별도 결정한다.

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
