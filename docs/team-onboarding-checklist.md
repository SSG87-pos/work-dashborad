# Team Onboarding Checklist

이 문서는 실제 `연구기획그룹-전략` 사용자를 Supabase 운영 데이터로 연결하기 전에 필요한 정보를 정리합니다.

## When Real User Info Is Needed

실제 사용자 정보가 필요한 단계:

- Supabase `team_roster`를 실제 팀원 이름/직책/이메일로 맞출 때
- 각 사람이 로그인 후 본인 업무를 관리할 수 있게 `expected_email`과 가입 계정을 연결할 때
- 관리자, 팀장, 팀원 권한 차이를 실제 계정으로 검증할 때
- 기존 JSON 업무 데이터를 실제 담당자에게 매핑해서 가져올 때

아직 실제 사용자 정보가 없어도 가능한 단계:

- UI/UX 개선
- Supabase schema/RLS/advisor preflight
- import summary/executor 검증
- 로컬 샘플 데이터 기반 화면 QA
- 운영 절차 문서화

## Minimum Fields To Collect

아래 5개만 있으면 첫 운영 roster를 만들 수 있습니다.

| Field | Required | Example | Note |
| --- | --- | --- | --- |
| name | yes | 장형민 | 앱에 표시될 이름 |
| title | yes | 책임 | 직책/역할 표시 |
| permission_role | yes | member | `admin`, `lead`, `member` 중 하나 |
| expected_email | yes | hyungmin.jang@posco.com | 실제 로그인에 사용할 이메일 |
| is_team_member | yes | true | 팀 목록에 보일 사람은 `true` |

선택 필드:

| Field | Example | Note |
| --- | --- | --- |
| roster_id | junho | 기존 JSON/샘플 담당자 ID와 맞출 때 사용 |
| profile_emoji | 🌿 | 비워두면 기본값 사용 |
| is_active | true | 휴직/퇴직/숨김 처리가 필요하면 `false` |
| notes | 팀장 계정 | 운영 메모 |

## Recommended First Batch

1. 관리자 1명
   - `permission_role = admin`
   - 관리자 전용/지원 계정이면 `is_team_member = false`
   - 실제 팀원이 운영 admin을 겸하면 실제 직책으로 두고 `is_team_member = true`

2. 팀장 1명
   - `permission_role = lead`
   - `is_team_member = true`
   - 팀 업무 생성/배정/수정 권한 검증에 필요합니다.

3. 일반 팀원 1-2명
   - `permission_role = member`
   - `is_team_member = true`
   - 일반 사용자 읽기/수정 제한 검증에 필요합니다.

전체 팀원은 나중에 한 번에 채워도 됩니다. 처음에는 관리자, 팀장, 일반 팀원 1명만 있어도 권한 테스트가 가능합니다.

## Import Mapping Rule

기존 JSON 업무를 나중에 Supabase로 가져와야 할 때:

- JSON의 `ownerId`, `creatorId`, `assignerId`가 `junho`, `minji` 같은 로컬 ID이면 `team_roster.id`와 연결됩니다.
- 같은 사람의 `expected_email`이 실제 가입 이메일과 일치하면, 가입 후 `team_roster.auth_user_id`가 자동 연결됩니다.
- 로컬 ID 자료를 같은 JSON으로 두 번 가져오면 새 업무/일정이 중복 생성될 수 있습니다. 앱은 같은 JSON 지문을 감지해 추가 경고를 띄우지만, import가 필요해진 경우에는 한 번만 실행하는 것이 원칙입니다.

## Suggested Validation Order

1. 관리자 로그인 확인
2. 팀장/일반 팀원 roster row 추가
3. 팀장 또는 일반 팀원이 실제 이메일로 가입
4. Supabase에서 roster와 auth user 연결 확인
5. 팀장 권한으로 팀 업무 수정 가능 여부 확인
6. 일반 팀원 권한으로 본인 업무 수정 가능 여부 확인
7. 일반 팀원 권한으로 타인 업무의 제한 동작 확인
8. 기존 JSON 이관이 다시 필요해진 경우에만 import summary 확인 후 1회 실행

자세한 역할/RLS 검증 순서는 `docs/role-rls-validation-checklist.md`를 기준으로 진행합니다.
