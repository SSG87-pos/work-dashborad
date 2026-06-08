# AI Agent Implementation Guide

이 문서는 `연구기획그룹-전략` 업무 대시보드에 HERmes Agent 또는 OpenAI 기반 AI를 붙일 때, 처음 보는 사람도 전체 구조를 이해하고 다음 구현을 시작할 수 있도록 정리한 입문 가이드입니다.

세부 권한, 데이터 범위, 답변 원칙은 `docs/ai-agent-readiness.md`를 기준으로 합니다. 이 문서는 그 내용을 더 쉽게 풀어 쓴 실행 출발점입니다.

Codex에게 실제 구현을 맡길 때는 `docs/ai-agent-codex-implementation-brief.md`를 함께 읽게 합니다.

## 한 문장 결론

가장 좋은 방법은 `read-only API`를 먼저 만들고, 그 API를 `MCP Tool`로 감싸서 HERmes/OpenAI 에이전트가 쓰게 하는 방식입니다.

```txt
사용자 질문
-> HERmes Agent 또는 OpenAI 모델
-> MCP Tool
-> 대시보드 read-only API
-> Supabase 권한 필터링 조회
-> 근거 데이터 반환
-> AI 답변 또는 보고서 초안 생성
```

## 쉬운 비유

대시보드를 회사 업무 서랍이라고 보면, AI에게 서랍 열쇠를 통째로 주면 안 됩니다.

좋은 구조는 이렇습니다.

- Supabase: 실제 업무 기록이 들어 있는 서랍
- read-only API: 필요한 문서만 꺼내주는 담당자
- MCP Tool: AI가 담당자에게 요청할 수 있게 만든 신청서 양식
- HERmes/OpenAI: 질문을 이해하고 신청서를 작성한 뒤, 받은 근거로 답변하는 비서

AI가 직접 DB를 뒤지지 않고, 정해진 질문 방식으로 필요한 근거만 받게 하는 것이 핵심입니다.

## 왜 이 방식이 좋은가

### 1. 보안 경계가 분명함

HERmes나 OpenAI 모델이 Supabase에 직접 접속하지 않습니다. 대시보드 서버/API가 먼저 권한을 확인하고, 보여줘도 되는 데이터만 AI에게 넘깁니다.

특히 `service_role` 키나 관리자 DB 키는 AI, 브라우저, 사용자 PC, MCP 설정 파일에 두면 안 됩니다.

### 2. HERmes가 바뀌어도 대시보드는 유지됨

MCP는 에이전트용 연결 방식입니다. 나중에 HERmes가 아니라 다른 에이전트를 쓰더라도, 내부 `read-only API`가 있으면 같은 조회 기능을 재사용할 수 있습니다.

### 3. 답변 근거를 남기기 쉬움

API가 업무명, 담당자, 상태, 업데이트 날짜, 이슈 신호를 구조화해서 주면 AI는 답변마다 근거를 붙일 수 있습니다.

예:

```txt
박경수님은 현재 AI 활용사례 조사와 월간보고 자료 정리를 진행 중입니다.

근거
- AI 기반 연구기획 업무 활용사례 조사, 진행중, 2026-06-07 업데이트
- 월간보고 자료 정리, 검토/대기, 2026-06-06 업데이트
```

## 주요 용어

| 용어 | 뜻 |
| --- | --- |
| OpenAI API | 회사가 제공하는 AI 모델 호출 통로입니다. 질문 이해, 요약, 보고서 작성에 사용합니다. |
| HERmes Agent | OpenAI API 같은 모델을 연결하고, 도구를 호출하며, 대화 흐름을 관리하는 에이전트 실행 환경입니다. |
| Supabase | 대시보드의 업무, 업데이트, 태그, 일정, 업무 노트를 저장하는 DB/백엔드입니다. |
| read-only API | AI가 읽기만 할 수 있는 대시보드 전용 조회 API입니다. 쓰기, 삭제, 상태 변경은 하지 않습니다. |
| MCP Tool | HERmes 같은 에이전트가 외부 기능을 도구처럼 호출하게 해주는 연결 방식입니다. |
| Evidence bundle | AI가 답변하기 전에 받는 근거 묶음입니다. 업무명, 담당자, 상태, 업데이트 날짜, 이슈 신호 등을 포함합니다. |

## 권장 아키텍처

```txt
[사용자]
  |
  | 질문: "아이디어 관련 진행내용과 이슈가 뭐야?"
  v
[HERmes Agent / OpenAI 모델]
  |
  | tool call: search_work_topics(query="아이디어", period="최근 30일")
  v
[MCP Server: work-dashboard-tools]
  |
  | GET /ai/read/topic-search?query=아이디어&period=30d
  v
[Dashboard read-only API]
  |
  | 권한 확인, Supabase 조회, 근거 정리
  v
[Supabase]
  |
  | 업무, 업데이트, 업무 노트, 태그, 업무흐름
  v
[Evidence bundle]
  |
  v
[AI 답변/보고서 초안]
```

## 처음 만들 도구

처음부터 많은 기능을 만들 필요는 없습니다. 아래 5개면 대부분의 질문과 보고서 초안이 가능합니다.

| 우선순위 | 도구/API | 답할 수 있는 질문 |
| --- | --- | --- |
| 1 | `get_report_evidence` / `/ai/read/report-evidence` | 이번 주 업무현황 보고서 초안 만들어줘 |
| 2 | `get_person_work_status` / `/ai/read/person-work-status` | 요즘 누가 무슨 업무를 하고 있어? |
| 3 | `search_work_topics` / `/ai/read/topic-search` | 아이디어 관련 진행내용과 이슈가 뭐야? |
| 4 | `get_workstream_issues` / `/ai/read/workstream-issues` | 업무흐름별 병목과 의사결정 필요사항은? |
| 5 | `get_recent_updates` / `/ai/read/recent-updates` | 최근 업데이트된 업무만 보여줘 |

## 1차 구현 범위

처음 구현은 작게 시작합니다.

포함:

- 업무 제목, 담당자, 상태, 우선순위, 마감일
- `상위 업무흐름`
- 태그
- 체크리스트 진행률
- 최근 업데이트 로그
- 변경 이력
- 업무 노트 중 `리스크`, `결정사항`, `다음 확인`, `참고자료`
- 보고서 근거용 source id/date

제외:

- 개인 메모
- 비공개 일정 상세
- 업무 생성/수정/삭제
- 상태 변경
- 담당자 평가나 인사성 판단
- service role 키가 필요한 직접 DB 접근

## 단계별 실행 계획

### 0단계. 현재 문서 확인

구현자는 먼저 아래 문서를 읽습니다.

- `docs/ai-agent-readiness.md`
- `docs/ai-agent-codex-implementation-brief.md`
- `docs/backend-api-spec.md`
- `docs/data-model.md`
- `docs/permission-rules.md`
- `docs/performance-report-rules.md`

### 1단계. Evidence bundle 샘플 만들기

아직 HERmes나 MCP를 붙이지 말고, 먼저 대시보드 데이터로 아래 형태의 JSON을 만들 수 있어야 합니다.

```json
{
  "questionType": "topic-search",
  "query": "아이디어",
  "period": {
    "start": "2026-06-01",
    "end": "2026-06-08"
  },
  "tasks": [
    {
      "id": "task-id",
      "title": "혁신 아이디어 후보 정리",
      "ownerName": "소슬기",
      "status": "진행중",
      "workstream": "혁신아이디어",
      "tags": ["전략과제"],
      "dueDate": "2026-06-12",
      "progress": 50,
      "recentUpdates": [
        {
          "id": "update-id",
          "date": "2026-06-07",
          "type": "note",
          "body": "아이디어 후보 1차 분류 완료"
        }
      ],
      "issues": [
        {
          "type": "inferred",
          "label": "의사결정 필요",
          "reason": "후보 우선순위 확정 기록이 아직 없음"
        }
      ]
    }
  ]
}
```

이 단계의 성공 기준:

- 질문 유형별로 필요한 데이터가 빠짐없이 들어간다.
- 각 주장에 근거가 되는 task/update/post id 또는 날짜가 들어간다.
- 개인 메모와 비공개 일정은 들어가지 않는다.

### 2단계. read-only API 만들기

대시보드 백엔드에 `/ai/read/...` API를 추가합니다.

권장 시작 순서:

1. `/ai/read/report-evidence`
2. `/ai/read/person-work-status`
3. `/ai/read/topic-search`
4. `/ai/read/workstream-issues`
5. `/ai/read/recent-updates`

API의 역할:

- 현재 사용자의 권한 확인
- Supabase에서 읽어도 되는 데이터만 조회
- AI가 쓰기 좋은 evidence bundle로 변환
- 응답에 source id/date 포함

API가 하지 말아야 할 일:

- AI 문장 생성
- 업무 수정
- Supabase 관리자 키 노출
- 모든 테이블을 그대로 반환

### 3단계. OpenAI tool/function calling으로 검증

MCP 전에 OpenAI API만으로도 검증할 수 있습니다.

흐름:

```txt
OpenAI 모델에 사용 가능한 tool 스키마 전달
-> 모델이 필요한 tool 선택
-> 서버가 read-only API 호출
-> tool output을 모델에 다시 전달
-> 모델이 근거 기반 답변 작성
```

이 단계의 목적은 `AI가 우리 evidence bundle을 보고 제대로 답하는지` 확인하는 것입니다.

### 4단계. MCP 서버 만들기

OpenAI tool 검증이 끝나면 MCP 서버를 만듭니다.

MCP 서버의 역할:

- HERmes에 `get_person_work_status`, `search_work_topics` 같은 도구를 노출
- 내부적으로는 대시보드 read-only API만 호출
- 도구별 입력값 검증
- 민감한 오류 메시지나 토큰을 숨김

MCP 서버가 하지 말아야 할 일:

- Supabase service role로 직접 전체 테이블 조회
- 업무 생성/수정/삭제 도구 제공
- 사용자 질문을 검증 없이 SQL로 바꾸기

### 5단계. HERmes에 연결

HERmes는 OpenAI-compatible API 서버로 동작할 수 있고, MCP 서버를 외부 도구로 불러올 수 있습니다. 구현 시점에는 회사 PC/서버 환경에서 아래를 확인해야 합니다.

- 회사 OpenAI API 키 또는 사내 OpenAI-compatible endpoint 사용 방식
- HERmes 설정에서 OpenAI provider 연결 가능 여부
- MCP 서버 실행 위치
- MCP 서버가 대시보드 read-only API에 접근 가능한 네트워크 위치
- 회사 보안 정책상 로컬 PC 실행인지, 내부 서버 실행인지

HERmes 연결의 성공 기준:

- 사용자가 자연어로 질문한다.
- HERmes가 적절한 MCP tool을 호출한다.
- tool이 read-only API에서 evidence bundle을 받아온다.
- 최종 답변에 업무명, 담당자, 상태, 업데이트 날짜가 포함된다.

## 추천 첫 PoC

가장 먼저 만들 PoC는 `주간 업무현황 보고서 초안`입니다.

이유:

- 질문 의도가 명확합니다.
- 기간 조건이 분명합니다.
- 현재 대시보드의 성과보고/업무흐름/업데이트 로그 구조와 잘 맞습니다.
- 결과 품질을 사람이 쉽게 검토할 수 있습니다.

PoC 질문:

```txt
이번 주 연구기획그룹-전략 업무현황 보고서 초안을 만들어줘.
완료된 일, 진행 중인 일, 이슈, 다음 액션을 나눠서 정리하고 근거 업무를 붙여줘.
```

PoC 성공 기준:

- 보고서가 실제 업무 데이터에서만 작성된다.
- 근거 업무와 업데이트 날짜가 포함된다.
- `최근 기록 부족`이 필요한 곳에 표시된다.
- 개인 메모와 비공개 일정이 빠져 있다.
- 사람이 수정 가능한 초안 형태로 나온다.

## 보안 체크리스트

구현 전에 반드시 확인합니다.

- [ ] AI와 HERmes에는 Supabase service role key를 주지 않는다.
- [ ] OpenAI API 키는 브라우저 코드에 넣지 않는다.
- [ ] MCP 서버와 read-only API의 인증 방식을 정한다.
- [ ] 사용자 권한에 따라 evidence bundle이 달라지는지 테스트한다.
- [ ] 개인 메모와 비공개 일정이 응답에 포함되지 않는지 테스트한다.
- [ ] API 응답에 불필요한 이메일, 내부 토큰, 원본 인증 정보가 없는지 확인한다.
- [ ] AI 답변에 근거 업무/업데이트 날짜가 항상 포함되는지 확인한다.
- [ ] AI가 추론한 이슈는 `추정`으로 표시되는지 확인한다.

## 구현하지 말아야 할 것

초기 단계에서 아래는 피합니다.

- AI가 업무 상태를 직접 변경하는 기능
- AI가 담당자를 자동 변경하는 기능
- AI가 Supabase SQL을 자유롭게 실행하는 기능
- AI가 개인 메모를 보고 보고서에 넣는 기능
- AI가 사람의 성과나 책임을 평가하는 기능
- 화면을 캡처해서 업무 현황을 추측하는 방식

## 나중 확장

read-only Q&A와 보고서 초안이 안정화된 뒤에만 검토합니다.

- 보고서 초안 저장
- 사람이 검토/수정/확정하는 승인 흐름
- 보고서 Word/PDF export
- 특정 업무에 대한 질문형 사이드패널
- 업데이트 로그 작성 보조
- 회의 전 브리핑 자동 생성

AI가 실제로 업무를 수정하는 write-back 기능은 별도 보안 검토와 승인 로그가 준비된 뒤에만 검토합니다.

## 외부 문서 참고

구현 시점에는 최신 공식 문서를 다시 확인합니다.

- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- Hermes API Server: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/
- Hermes MCP: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/
- Hermes Tools Reference: https://hermes-agent.nousresearch.com/docs/reference/tools-reference/
