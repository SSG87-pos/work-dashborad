# Company Demo Readiness Checklist

## Purpose

회사에서 Supabase를 그대로 사용할 수 있는지 확인하기 전까지, 이 프로젝트는 실사용 확정본이 아니라 검토용 데모 상태로 둔다.

목표는 다음 세 가지다.

- 실제 업무 데이터 없이 제품 흐름을 설명한다.
- Supabase 사용 승인에 필요한 정보와 보안 질문을 정리한다.
- 기본은 회사 내부 포트/로컬 네트워크 방식으로 시연한다. 다만 같은 회사망 접속이 어렵거나 회의 시간 동안만 여러 명에게 보여줘야 하면, 예시 데이터만 사용하는 조건으로 임시 인터넷 URL 시연을 별도 선택할 수 있다.
- 나중에 GitHub repo를 회사 Windows/Linux PC에 clone해서 실행할 수 있도록 별도 절차를 유지한다.

## Recommended Stop Point Before Company Approval

회사 승인 전에는 아래 단계까지만 준비하는 것을 권장한다.

1. 예시 데이터로 My Desk, Team Flow, Calendar, Updates, Highlights의 주요 흐름을 보여준다.
2. 실제 팀원 auth 가입/계정 연결은 보류한다.
3. 기존 로컬 JSON 업무 이관은 실행하지 않는다. 팀은 Supabase에 새 데이터로 시작한다.
4. Supabase RLS/function 보안 패스는 적용 완료 상태이며, 남은 Auth dashboard 보안 설정은 `docs/supabase-auth-security-checklist.md`를 기준으로 확인한다.
5. 임시 배포 URL은 기본안에서 제외한다. 회사에서는 포트/로컬 네트워크 방식으로 먼저 확인하되, 필요하면 `docs/internal-port-demo-runbook.md`의 임시 인터넷 URL 절차를 따른다.

## Demo Data Policy

현재 로컬 fallback과 데모 데이터는 실제 visible roster ID를 기준으로 맞춰져 있다.

현재 기준 인원:

| id | name | title | role |
| --- | --- | --- | --- |
| admin | 소슬기 | 수석 | admin |
| lead | 박경수 | 팀장 | lead |
| kmryu | 류강묵 | 수석 | member |
| junho | 장형민 | 차장 | member |
| minji | 박관욱 | 수석 | member |
| sugu05 | 조원태 | 수석 | member |

따라서 기본 예시 화면은 실제 팀원 이름으로 보인다.

2026-06-06 결정: 1차 시연은 내부 공유 목적이므로 실명 데모로 진행해도 된다.

검토 범위별 권장 방식:

- 내부 소규모 회의: 실제 팀원 이름을 써도 되는지 슬기님이 판단한다.
- 부서 외 공유 또는 보안 검토: 이름은 익명화하거나 `팀장 A`, `팀원 B` 같은 데모 이름으로 바꾼 별도 데모 모드를 준비한다.
- 실제 업무 데이터: 회사 승인 전에는 넣지 않는다.
- 이메일: 화면에 노출되는 경우가 있으면 실제 이메일 대신 데모 이메일을 쓴다.

## Demo Data Cleanup

현재 앱의 삭제/초기화 기능:

- 업무 상세의 삭제 아이콘은 선택한 업무를 개별 삭제한다.
- 데이터 메뉴의 `데이터 초기화`는 로컬 프로토타입 저장 상태를 기본 예시 상태로 되돌린다.
- 보관함의 `데모 데이터 채우기`로 추가한 archive demo rows는 전용 일괄 삭제 버튼이 아직 없다. 로컬에서는 `데이터 초기화`로 기본 상태로 되돌릴 수 있다.

권장 운영:

- 내부 실명 데모 중에는 예시 데이터를 유지한다.
- 회사 포트/로컬 네트워크 시연 후 더 넓은 공유가 필요해지면 예시 데이터를 유지할지, 익명화할지, 비울지 먼저 결정한다.
- Supabase에 실제로 seed한 데모 데이터를 한 번에 제거해야 하면 별도 admin 전용 `데모 데이터 비우기` 기능이나 검토된 cleanup SQL을 만든 뒤 실행한다.
- 실제 업무 데이터와 예시 데이터를 섞기 시작했다면 전체 초기화 대신 태그/ID 기준으로 삭제 대상을 확인한 뒤 지운다.

## Supabase Approval Questions

회사에 확인할 질문:

- Supabase 같은 외부 SaaS/Postgres/Auth 서비스를 업무 도구에 사용할 수 있는가?
- 프로젝트 리전 `ap-northeast-1` 사용이 허용되는가?
- 저장 가능한 데이터 범위는 어디까지인가?
- 회사 이메일 로그인 또는 향후 SSO 연동이 필요한가?
- RLS, 권한 역할, audit/접속 기록에 대한 최소 요구사항은 무엇인가?
- leaked password protection 사용을 위해 Supabase Pro Plan 이상 사용이 가능한가?
- 비밀번호 최소 길이/문자 조합/MFA/CAPTCHA에 대한 회사 기준은 무엇인가?
- 회사 내부 포트/로컬 네트워크 시연 방식이 허용되는가?
- 실제 업무 자료, 메모, 일정, 링크를 저장해도 되는 시점은 언제인가?

## Internal Port Demo Decision

현재 기본 결정: 임시 인터넷 주소는 기본안에서 제외하고, 회사에서 포트/로컬 네트워크를 활용해 먼저 확인한다.

예외: 같은 네트워크 접속이 어렵거나 짧은 회의 시간 동안만 보여줘야 하면, 예시 데이터만 사용하고 실제 업무 데이터는 넣지 않는 조건으로 임시 인터넷 URL을 열 수 있다. 이 경우 절차는 `docs/internal-port-demo-runbook.md`의 `Temporary Internet URL Demo Option`을 따른다.

실행 절차는 `docs/internal-port-demo-runbook.md`를 따른다.

회사 PC에서 새로 clone해 실행하는 절차는 `docs/company-clone-runbook.md`를 따른다.

| Demo method | Temporary URL needed? | Notes |
| --- | --- | --- |
| 슬기님 노트북으로 회의실에서 시연 | No | `localhost` 또는 로컬 dev server로 충분하다. |
| 같은 회사망에서 포트로 접근해 보기 | No | dev server host/port를 회사망 정책에 맞게 열어 테스트한다. |
| 짧은 회의용 임시 인터넷 URL | Optional | 예시 데이터만 사용하고, 시연 시간 동안만 열고 종료한다. Cloudflare Quick Tunnel/ngrok이 적합하다. |
| 며칠간 눌러보는 프론트 데모 | Optional | Vercel Hobby preview를 검토할 수 있지만 URL이 계속 남는 방식이므로 공유 범위를 제한한다. |
| 회사 보안팀/IT팀 검토 | Maybe later | 현재는 포트 방식 또는 제한된 임시 URL로 먼저 확인하고, 요구가 있으면 승인된 배포 경로를 별도 검토한다. |
| 실제 운영 전환 | Yes | 임시 URL이 아니라 승인된 운영 배포 경로가 필요하다. |

회사 포트/로컬 네트워크 시연에서도 실제 업무 데이터는 넣지 않는다.

## Minimum Demo Checklist

- 데모 데이터가 실제 업무 비밀을 포함하지 않는다.
- 실명 사용 여부를 회의 목적에 맞게 결정했다.
- 데모 계정 또는 관리자 계정 사용 범위가 정해져 있다.
- `.env.example`에서 `.env.local`을 만들었고 secret 값은 문서/Git에 남기지 않았다.
- `Supabase 연결` 상태에서 주요 화면이 열리는지 확인했다.
- `pnpm run check:demo-readiness`가 blocking 실패 없이 통과했다.
- My Desk, Team Flow, Calendar, Updates, Highlights 흐름이 모두 설명 가능하다.
- JSON import는 현재 launch path에서 제외되어 있다.
- 실제 팀원 signup/auth linking은 제외되어 있다.
- 보안 패스는 별도 승인 후 진행한다.
- 임시 인터넷 URL을 쓰는 경우, 실제 업무 데이터/민감자료/비공개 문서 링크가 없는지 재확인했다.

## Next Engineering Work

회사 검토 전 무승인으로 진행 가능한 작업:

- 예시 데이터가 실제 업무처럼 보이되 민감하지 않은지 문구 점검.
- 데모용 익명 roster 옵션을 별도 준비할지 결정할 수 있도록 문서화.
- 회사 포트/로컬 네트워크 시연 시 필요한 실행 명령, 포트, 접속 조건을 정리.
- 임시 인터넷 URL을 써야 할 때의 Cloudflare/ngrok/Vercel 선택 기준을 유지.
- 회사 Windows/Linux clone 실행 절차와 사전 점검 script를 유지.

승인이 필요한 작업:

- live DB 보안 정책 변경.
- 운영성/지속 배포 URL 생성.
- 실제 팀원 계정 가입/연결.
- 실제 업무 데이터 입력.
