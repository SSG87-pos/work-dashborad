# POSLAB Work Hub 기능 및 구현 구조 소개서

## 1. 한 줄 소개

POSLAB Work Hub는 연구기획그룹의 개인 업무, 팀 업무흐름, 업무 노트, 실적 정리, 운영 인사이트, AI/Wiki 확장을 하나의 화면과 데이터베이스 구조로 연결하는 내부 업무 운영 대시보드입니다.

단순한 TODO 리스트가 아니라, 업무가 등록되고 진행되고 기록되고 정리되는 전 과정을 데이터화하여 나중에 AI가 근거 기반으로 답변하고 보고서 초안까지 만들 수 있도록 설계되어 있습니다.

```text
React/Vite Dashboard
  -> FastAPI API Layer
  -> PostgreSQL Operational DB
  -> AI Evidence API
  -> LLM-Wiki Knowledge Layer
  -> Future OpenAI/HERmes Tool Calling
```

## 2. 이 앱이 해결하려는 문제

팀 업무는 보통 여러 곳에 흩어집니다.

- 개인별 할 일
- 팀 공통 업무
- 업데이트 로그
- 회의 후속 조치
- 참고 URL
- 이미지 캡처
- 월간/분기 실적 정리
- 담당자별 진행 현황
- 반복 업무
- 과거 결정사항

이 앱은 이런 조각들을 한 화면에서 운영하고, 동시에 데이터베이스에 구조적으로 쌓이게 만듭니다.

핵심 방향은 다음과 같습니다.

- 업무 현황을 개인과 팀 관점에서 빠르게 파악한다.
- 업무 진행 과정의 근거를 업데이트 로그와 업무 노트로 남긴다.
- 업무흐름, 태그, 담당자, 상태, 일정 정보를 기준으로 다시 찾을 수 있게 한다.
- 실적 보고와 회고에 필요한 자료를 자동으로 모을 수 있게 한다.
- 향후 AI가 화면을 추측하는 것이 아니라 DB와 Wiki 근거를 읽고 답변하게 한다.

## 3. 현재 가능한 주요 기능

### 3.1 POSLAB 진입 화면과 AI 업무 에이전트

첫 화면은 단순 로그인 화면이 아니라 POSLAB Work Hub의 입구입니다.

현재 동작:

- 사용자가 대시보드에 들어가기 전에 간단한 AI 업무 에이전트 패널을 볼 수 있습니다.
- local fallback 모드에서는 화면 데이터 기준으로 임시 답변을 제공합니다.
- FastAPI 모드에서는 로그인 후 AI 읽기 API를 호출하는 구조가 준비되어 있습니다.
- 업무 등록 성격의 요청은 바로 DB에 쓰지 않고, 사람이 검토하는 업무 추가 draft 흐름으로 연결됩니다.
- 대시보드 상단의 집 아이콘으로 언제든 첫 화면으로 돌아갈 수 있습니다.

예시:

```text
사용자: 이번 주 업무현황 보고서 초안 만들어줘
앱: 현재 업무, 지연 업무, 최근 업데이트, 완료 업무를 근거로 보고서형 초안을 구성
```

```text
사용자: 박경수님 진행 업무 알려줘
앱: 담당자 기준 업무 목록과 상태, 마감, 최근 업데이트 근거를 정리
```

### 3.2 My Desk와 Team Flow

앱은 개인 업무와 팀 업무를 분리해서 볼 수 있습니다.

My Desk:

- 개인 업무 중심 화면
- 내 업무 인박스
- 개인별 브리핑
- 개인이 확인해야 할 업무, 일정, 메모성 기록을 관리

Team Flow:

- 팀 전체 업무흐름
- 팀 업무 보드
- 팀 체크 항목
- 공통 업무 진행 상황
- 팀원별 담당 현황

예시:

```text
아침에 My Desk에서 오늘 시작할 업무와 오늘 마감 업무를 확인한다.
팀 회의 전에는 Team Flow에서 전체 진행 업무와 지연 업무를 확인한다.
```

### 3.3 업무 보드, 리스트, 타임라인, 반복 업무, 보관함

업무는 여러 방식으로 볼 수 있습니다.

- 보드: 상태별 업무 흐름 확인
- 리스트: 밀도 높은 표 형태로 빠른 스캔
- 타임라인: 기간과 마감 중심 확인
- 반복 업무: 주기 업무 관리
- 보관함: 완료/보류/아카이브 업무 검색

공통 필터:

- 태그
- 담당자
- 중요도
- 스팟 업무
- 상단 요약 카드 필터

예시:

```text
태그: 월간보고
담당자: 장형민
중요도: 높음
```

이렇게 필터링하면 특정 담당자의 월간보고 관련 중요 업무만 좁혀서 볼 수 있습니다.

### 3.4 상단 DB 인사이트 카드

상단 인사이트 카드는 단순 숫자 표시가 아니라 바로 클릭 가능한 운영 필터입니다.

현재 카드:

- 진행 업무
- 3일 내 마감
- 지연 업무
- 업데이트 정체
- 흐름 미지정
- 완료 업무

FastAPI 모드에서는 `/api/v1/dashboard/insights`가 DB 기준으로 계산한 count와 근거 업무를 우선 사용합니다. API가 없으면 화면에 내려온 업무 배열로 fallback합니다.

예시:

```text
업데이트 정체 3건
-> 클릭
-> 최근 7일 이상 업데이트가 없는 업무만 보드에 표시
```

이 기능은 관리자가 "어떤 업무가 방치되고 있는지" 빠르게 찾는 데 유용합니다.

### 3.5 상위 업무흐름과 유사 업무흐름 추천

각 업무는 하나의 `상위 업무흐름`에 묶입니다.

예:

```text
업무: AI 기반 연구기획 업무 활용사례 조사
상위 업무흐름: AI 연구기획 활용사례
```

이 업무흐름은 다음 화면에서 핵심 분류 기준이 됩니다.

- 마인드맵
- 실적 보고
- Highlights
- 업무흐름별 게시글 모음
- Wiki 정리

고도화된 부분:

- 기존에는 제목 텍스트 중심으로만 유사 업무흐름을 추정했습니다.
- 지금은 FastAPI `GET /api/v1/workstreams/suggestions`에서 DB 근거 기반 후보를 제공합니다.
- 제목, 설명, 태그, 업데이트 로그, 업무 노트, 이미지 OCR/요약 텍스트까지 함께 봅니다.
- 자동 병합하지 않고, 관리자 화면에서 후보를 보고 사람이 확정합니다.

예시:

```text
AI 연구기획 활용사례
AI 보고 대응

공통 근거:
- AI활용
- 임원보고
- Q&A
- 업무 노트 이미지 OCR
```

관리자는 이 후보를 보고 두 업무흐름을 하나로 묶을지 결정할 수 있습니다.

### 3.6 업무 상세, 업데이트 로그, 변경 이력, 체크리스트

업무 상세 화면은 단순 설명창이 아니라 업무의 진행 근거를 쌓는 공간입니다.

포함 정보:

- 업무명
- 설명
- 담당자
- 상태
- 우선순위
- 기간
- 체크리스트
- 업데이트 로그
- 변경 이력
- 관련 링크
- 업무 노트
- Wiki 정리 버튼

업데이트 로그와 변경 이력은 나중에 AI evidence와 실적 보고의 근거가 됩니다.

예시:

```text
업데이트 로그:
2026-06-26 임원보고 Q&A 근거 정리 완료

변경 이력:
마감일 6월 25일 -> 6월 28일
사유: 외부 자료 회신 지연
```

### 3.7 업무 노트와 이미지 근거

업무 노트는 Teams식 기억 공간에 가깝습니다.

사용 가능한 기록:

- 결정사항
- 기억할 점
- 리스크
- 회의록
- 중요문서
- 참고자료
- 다음 확인

이미지 근거도 고려되어 있습니다.

사내 보안상 AI가 게시판 URL이나 내부 첨부 URL을 직접 읽지 못할 수 있습니다. 그래서 이미지를 노트에 붙이면, 향후 OCR 또는 Vision 결과를 아래 필드에 저장하는 구조입니다.

```text
attachment.ocrText
attachment.visionSummary
```

AI와 LLM-Wiki는 이미지 원본을 직접 추측하지 않고, 이 추출 텍스트와 요약을 근거로 사용합니다.

### 3.8 Highlights: 실적 보고, 업무흐름별 게시글, Wiki

Highlights는 업무를 운영 화면에서 보고서/회고 화면으로 바꾸는 영역입니다.

현재 포함:

- 실적 보고
- 업무흐름별 게시글 모음
- 업무흐름 Wiki 검색/읽기

실적 보고:

- 주간, 월간, 분기, 연간 관점
- 업무흐름별 묶음
- 포함 업무 근거
- Markdown 복사/저장 가능

업무흐름별 게시글 모음:

- 업무 노트를 업무흐름 기준으로 모아 봄
- 결정사항, 리스크, 회의록 등 과거 맥락을 재확인

Wiki:

- 발행된 Wiki page 검색
- Wiki 본문 읽기
- 연결된 source link 확인

예시:

```text
월간보고 전:
Highlights -> 월간 실적 -> Markdown 복사

회의 준비 전:
Highlights -> 업무흐름별 게시글 모음 -> 리스크/결정사항 확인
```

### 3.9 Canvas와 업무 구조화

Canvas는 업무를 시각적으로 정리하는 영역입니다.

현재 구조:

- Canvas tab
- node
- link
- todo node data
- Markdown export
- 공유 저장 API 구조

사용 예시:

```text
보고서 관점
  -> 데이터 근거
  -> 담당자 확인
  -> 임원보고 Q&A
```

나중에는 업무 상세 체크리스트, Wiki page, 업무흐름과 연결해 지식 맵으로 확장할 수 있습니다.

### 3.10 관리자 기능

관리자 화면은 운영 데이터 사전을 정리하는 곳입니다.

현재 포함:

- 사람 관리
- 태그 관리
- 업무흐름 관리
- 게시글 유형 관리
- Wiki 초안 검토

중요한 점:

- 일반 사용자는 관리자 탭을 보지 않습니다.
- 태그와 업무흐름은 팀 데이터 품질에 직접 영향을 주므로 별도 관리 화면으로 분리했습니다.
- Wiki 초안은 AI 또는 사용자 생성 내용이 바로 발행되지 않도록 관리자 승인 구조를 둡니다.

## 4. 구현 구조

### 4.1 프런트엔드

프런트엔드는 React/Vite 기반입니다.

핵심 파일:

| 파일 | 역할 |
| --- | --- |
| `src/App.jsx` | 전체 화면, 상태, 사용자 상호작용의 중심 |
| `src/apiStore.js` | FastAPI 백엔드 통신 경계 |
| `src/storage.js` | localStorage fallback 및 snapshot 구조 |
| `src/workstreams.js` | 업무흐름 추천/그룹핑 helper |
| `src/summaryFilters.js` | 상단 인사이트 카드 필터 |
| `src/aiAssistant.js` | AI 프롬프트 분류와 read API path 매핑 |
| `src/aiEvidence.js` | local fallback용 evidence 생성 |
| `src/styles.css` | 화면 디자인 |

프런트의 핵심 설계 원칙은 API 호출을 화면 곳곳에 흩뿌리지 않는 것입니다.

```text
화면 컴포넌트
  -> apiStore.js
  -> FastAPI
```

이렇게 해두면 나중에 API host가 바뀌거나 인증 방식이 바뀌어도 수정 범위가 줄어듭니다.

### 4.2 백엔드

백엔드는 FastAPI + PostgreSQL 기준으로 설계되어 있습니다.

핵심 파일:

| 파일/폴더 | 역할 |
| --- | --- |
| `backend/app/main.py` | FastAPI 앱 시작점 |
| `backend/app/api/routes_*.py` | 기능별 API 라우터 |
| `backend/app/models/*.py` | SQLAlchemy DB 모델 |
| `backend/app/schemas/*.py` | API request/response schema |
| `backend/alembic/versions` | DB migration |
| `backend/tests` | pytest 기반 API 테스트 |

구현된 API 영역:

- auth
- roster/profile
- tasks
- subtasks
- updates
- history
- tags/tag groups
- calendar
- briefing items
- preferences
- dashboard memos
- task posts/post categories
- post rollups
- Canvas state
- dashboard insights
- workstream suggestions
- AI read evidence
- AI Wiki / LLM-Wiki

### 4.3 데이터 저장 전략

현재 앱은 두 가지 저장 모드를 가집니다.

```text
VITE_API_BASE_URL 있음
  -> FastAPI + PostgreSQL 모드

VITE_API_BASE_URL 없음
  -> localStorage fallback 모드
```

이 구조 덕분에 회사 백엔드가 아직 붙지 않은 상태에서도 UI와 workflow를 계속 검증할 수 있고, 회사 서버에서는 같은 프런트가 FastAPI API를 사용하게 됩니다.

## 5. AI와 LLM-Wiki 구조

### 5.1 AI Evidence API

AI가 화면을 보고 추측하는 방식은 위험합니다. 이 앱은 AI가 읽을 수 있는 evidence API를 따로 둡니다.

현재 AI read endpoint:

- 담당자별 진행 업무
- 주제 검색
- 업무흐름별 이슈
- 최근 업데이트
- 보고서 근거

원칙:

- 읽기 전용
- 권한 필터 적용
- source task/update/post id 포함
- 개인 메모와 private calendar는 기본 제외
- 추론과 기록된 사실을 구분

### 5.2 LLM-Wiki

LLM-Wiki는 업무 DB 위에 올라가는 agent-readable 지식 레이어입니다.

원본은 PostgreSQL에 남습니다.

```text
tasks
task_updates
task_posts
calendar_events
briefing_items
```

Wiki는 이 원본들을 사람이 읽기 좋고 AI가 검색하기 좋은 page로 정리합니다.

주요 테이블:

| 테이블 | 역할 |
| --- | --- |
| `wiki_pages` | 현재 발행된 Wiki page |
| `wiki_revisions` | page 수정 이력 |
| `wiki_source_links` | Wiki 문장과 원본 업무/노트/업데이트 연결 |
| `wiki_links` | Wiki page 간 관계 |
| `ai_wiki_drafts` | AI/사용자가 만든 발행 전 초안 |
| `wiki_error_book` | 잘못된 답변과 correction 기록 |

현재 구현된 화면:

- 업무 상세의 `Wiki로 정리`
- 관리자 `Wiki 초안` 검토
- Highlights `Wiki` 검색/읽기

중요한 안전장치:

- AI가 바로 Wiki를 발행하지 않습니다.
- 초안 생성 후 관리자가 승인해야 published 상태가 됩니다.
- 모든 Wiki page는 source link와 revision을 가져야 합니다.

## 6. 현재 앱이 할 수 있는 업무 예시

### 예시 1: 팀 주간 업무 점검

```text
1. Team Flow 진입
2. 상단 `지연 업무`, `3일 내 마감`, `업데이트 정체` 확인
3. `업데이트 정체` 클릭
4. 최근 로그가 없는 업무만 확인
5. 담당자별로 업데이트 요청
```

### 예시 2: 월간보고 준비

```text
1. Highlights 진입
2. 월간 실적 보고 선택
3. 업무흐름별 완료/진행/이슈 확인
4. Markdown으로 복사
5. 보고서 초안에 반영
```

### 예시 3: 업무 노트로 회의 맥락 보존

```text
1. 업무 상세 열기
2. `노트 작성`
3. 노트 유형 `결정사항` 선택
4. 회의 결정사항과 참고 URL 입력
5. 나중에 Highlights에서 업무흐름별로 다시 확인
```

### 예시 4: 이미지 캡처를 AI 근거로 남기기

```text
1. 게시판이나 보고자료 이미지를 업무 노트에 붙임
2. OCR 결과를 attachment.ocrText에 저장
3. 이미지 요약을 attachment.visionSummary에 저장
4. AI/Wiki가 해당 텍스트를 근거로 사용
```

### 예시 5: 유사한 업무흐름 정리

```text
1. 관리자 -> 업무흐름 관리
2. `DB 근거 추천` 클릭
3. 비슷한 업무흐름 후보 확인
4. 공통 태그, 업데이트, 업무 노트 근거 확인
5. 이름을 맞춰 하나의 업무흐름으로 정리
```

### 예시 6: Wiki page 생성과 승인

```text
1. 특정 업무 상세 열기
2. `Wiki로 정리` 클릭
3. Wiki 초안 생성
4. 관리자 -> Wiki 초안
5. 제목/요약/본문 검토
6. 승인 후 Highlights Wiki에서 검색 가능
```

## 7. 전문적으로 강한 지점

### 7.1 화면 중심이 아니라 데이터 중심

일반적인 프로토타입은 화면이 먼저이고 데이터는 뒤따라갑니다.  
이 앱은 화면을 유지하면서도 업무, 노트, 업데이트, Wiki, AI evidence가 모두 DB 구조로 이어지도록 설계되어 있습니다.

### 7.2 AI를 안전하게 붙일 수 있는 구조

AI가 직접 DB를 자유롭게 뒤지는 방식이 아닙니다.

```text
AI 요청
  -> FastAPI 권한 확인
  -> read-only evidence API
  -> source 포함 응답
  -> 필요 시 draft 생성
  -> 사람 승인
```

이 구조는 회사 보안과 감사 가능성에 유리합니다.

### 7.3 업무 지식이 쌓이는 구조

업무 노트, 업데이트, Wiki source link, revision, Error Book이 있기 때문에 시간이 지날수록 단순 업무 리스트가 아니라 조직 지식 자산으로 발전할 수 있습니다.

### 7.4 운영 품질을 자동으로 드러내는 구조

DB 인사이트는 단순 통계가 아닙니다.

- 지연 업무
- 업데이트 정체
- 업무흐름 미지정
- 마감 임박

이런 신호를 자동으로 드러내므로 관리자가 업무 누락과 방치를 빠르게 찾을 수 있습니다.

### 7.5 local fallback과 운영 API가 공존

회사 백엔드가 없어도 localStorage로 검증할 수 있고, 운영 환경에서는 FastAPI/PostgreSQL로 전환할 수 있습니다.  
이 덕분에 개발, 데모, 운영 연결을 단계적으로 진행할 수 있습니다.

## 8. 향후 확장 가능성

### 8.1 OpenAI/HERmes Tool Calling

현재는 OpenAI/HERmes 실제 호출을 넣지 않았습니다.  
대신 AI가 사용할 수 있는 API 구조를 먼저 만들었습니다.

향후 확장:

```text
OpenAI/HERmes
  -> wiki_search
  -> wiki_read
  -> dashboard evidence read
  -> wiki draft create
  -> human approval
```

가능한 질문:

```text
이번 달 AI 활용 관련 업무흐름과 리스크 정리해줘
박경수님 담당 업무 중 마감 임박한 것만 알려줘
혁신아이디어 관련 과거 결정사항과 최근 이슈를 같이 보여줘
월간보고 초안 만들어줘
```

### 8.2 OCR/Vision 자동화

현재는 이미지 evidence 필드 구조가 준비되어 있습니다.

향후:

- 이미지 업로드
- OCR 자동 추출
- Vision 요약 자동 생성
- `attachment.ocrText`, `attachment.visionSummary` 저장
- AI/Wiki 자동 반영

### 8.3 Teams/알림 연동

향후 알림 확장:

- 개인별 알림함
- 마감 임박 알림
- 업데이트 정체 알림
- 담당자 변경 알림
- 중요 업무 Teams push

단, 모든 알림을 Teams로 보내기보다 high/urgent 중심으로 제한하는 것이 적절합니다.

### 8.4 다중 팀/워크스페이스 확장

현재는 연구기획그룹-전략 중심입니다.  
향후 여러 그룹으로 확장하려면 다음 구조를 추가할 수 있습니다.

- `workspace_id`
- workspace별 사용자 membership
- workspace별 태그
- workspace별 업무흐름
- workspace admin
- workspace별 Wiki visibility

### 8.5 고급 보고서 자동화

현재 Highlights는 보고서 초안의 기반입니다.  
향후에는 다음까지 확장할 수 있습니다.

- 주간보고 자동 초안
- 월간보고 자동 초안
- 분기 실적 요약
- 업무흐름별 성과/이슈 자동 정리
- source link 포함 보고서 생성
- Wiki page 기반 장기 맥락 반영

### 8.6 조직 지식 관리 시스템

LLM-Wiki가 안정화되면 이 앱은 단순 업무 대시보드를 넘어 조직 지식 관리 시스템이 될 수 있습니다.

확장 방향:

- 업무흐름별 playbook
- 반복 보고서 작성 방식
- 과거 결정사항 기록
- 리스크 패턴
- 담당자별 업무 맥락
- 자주 틀리는 AI 답변 Error Book
- source 기반 Wiki 개선 루프

## 9. 현재 구현 상태 요약

현재 구현된 것:

- React/Vite 대시보드 UI
- FastAPI/PostgreSQL 백엔드 구조
- localStorage fallback
- auth/JWT
- roster/profile
- task CRUD
- subtasks
- updates
- history
- tags/tag groups
- calendar
- briefing items
- preferences/memos
- task posts/post categories
- Highlights post rollup
- Canvas state
- dashboard insights
- workstream similarity suggestions
- AI read endpoints
- LLM-Wiki schema/API
- Wiki draft approval flow
- Highlights Wiki read/search

아직 운영 환경에서 확정 후 붙일 것:

- 회사 PostgreSQL live smoke
- OpenAI/HERmes 실제 model call
- production image/file storage
- OCR/Vision 자동 처리
- Teams/realtime 알림
- 다중 workspace
- production security hardening

## 10. 결론

POSLAB Work Hub는 현재도 개인/팀 업무 운영, 실적 정리, 업무 노트, 업무흐름 관리, 관리자 데이터 품질 관리까지 수행할 수 있습니다.

더 중요한 점은, 이미 구조가 다음 단계로 확장되도록 설계되어 있다는 것입니다.

- 업무 데이터는 PostgreSQL에 쌓입니다.
- AI는 권한이 통제된 evidence API를 통해 읽습니다.
- Wiki는 source link와 revision을 가진 지식 레이어로 동작합니다.
- AI 생성 내용은 draft와 승인 과정을 거칩니다.
- 이미지와 사내 보안 제약은 OCR/visionSummary 필드로 대응합니다.
- 운영 인사이트는 DB 기반으로 계산되어 업무 품질을 드러냅니다.

따라서 이 앱은 단순한 대시보드가 아니라, 팀 업무 데이터베이스와 AI-ready 지식 시스템으로 확장 가능한 내부 업무 운영 플랫폼입니다.
