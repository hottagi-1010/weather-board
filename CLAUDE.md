# CLAUDE.md – 현장 일정 날씨판 작업 규칙

## 프로젝트 개요
- 교육용 프로토타입이다. 무엇을 만들지는 PRD.md를 따른다.
- PRD.md에 없는 기능은 먼저 제안하고, 내가 승인한 뒤에만 구현한다.

## 기술 스택 (변경 금지)
- HTML + CSS + 순수 JavaScript만 사용한다. (React 등 프레임워크, 빌드 도구 사용 금지)
- 외부 스크립트는 supabase-js 하나만, 버전을 고정한 CDN 주소로 쓴다.
- index.html 더블클릭 · 로컬 서버 · 배포 주소 어느 쪽으로 열어도 동작해야 한다.

## 폴더 구조
- index.html : 화면 구조
- style.css  : 디자인
- logic.js   : 판단 규칙만 (화면을 다루는 코드 금지)
- app.js     : 화면 동작 (목록 그리기, 일정 추가, Supabase 읽기 · 저장)
- config.js  : Supabase 연결 정보 두 줄 (주소 · 공개용 키)만
- setup.sql  : wx_tasks 표 · 값 규칙 · 행 보안 · 가상 일정 (SQL Editor 에서 직접 실행)
- PRD.md · CLAUDE.md · README.md : 문서

## 작업 방식
1. 코드를 고치기 전에 계획(수정할 파일과 이유)을 먼저 보여 주고 승인을 받는다.
2. 한 번에 한 가지만 고친다.
3. 끝나면 바꾼 파일, 내가 확인할 방법(T-번호), 남은 문제를 보고한다.

## 보안 · 데이터 규칙
- 가상 데이터만 사용한다. 실제 이름 · 연락처 · 기관 내부 자료를 넣지 않는다.
- 사용자가 입력한 글자는 textContent 로 표시한다.
- 비밀 키(secret · service_role)는 코드 · 채팅 · GitHub 에 절대 넣지 않는다. config.js 에는 공개용(publishable · anon) 키만 둔다.
- 일정은 Supabase 표 wx_tasks 하나만 기준으로 한다. 읽기 · 추가 모두 이 표로 한다. (app.js · 브라우저 저장소에 일정 목록을 따로 두지 않는다)
- 구분 · 지역 값 규칙은 화면(logic.js 의 validateTask)과 DB(setup.sql 의 check) 양쪽에서 막는다. 값을 바꿀 때는 두 곳을 같이 고친다.
- 공개용 키로는 읽기 · 추가만 되도록 행 보안(RLS)을 유지한다. 수정 · 삭제 정책은 승인 없이 열지 않는다.
- 표 구조나 정책을 바꿀 때는 setup.sql 을 고치고, 실행은 내가 SQL Editor 에서 한다.
- wx_tasks 에도 가상 데이터만 넣는다.
