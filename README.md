# 현장 일정 날씨판

오늘 현장 일정과 지역별 날씨를 한 화면에서 보고, 날씨 때문에 주의 · 중지를 검토할 일정을 표시합니다. (교육용 가상 데이터)

## 여는 법
- 내 PC : `index.html` 더블클릭 (또는 로컬 서버)
- 인터넷 : https://weather-board-ten-beta.vercel.app
- 지역별 JSON : https://weather-board-ten-beta.vercel.app/api/kma?region=대전 (세종 · 대전 · 태안 · 보령, 기상청 단기예보 기준)
  - Vercel 환경변수 `SHORT_WEATHER_KEY` 에 공공데이터포털 기상청 단기예보 키가 있어야 합니다

## Supabase 설정 (처음 한 번)
1. Supabase 대시보드 → SQL Editor 에 `setup.sql` 전체를 붙여 넣고 Run
2. Project Settings → API 에서 프로젝트 주소와 **공개용(publishable 또는 anon) 키**를 복사
3. `config.js` 의 두 줄에 붙여 넣기
   - secret · service_role 키는 절대 넣지 않습니다

## 파일
| 파일 | 역할 |
|---|---|
| index.html | 화면 구조 |
| style.css | 디자인 |
| logic.js | 판단 규칙 |
| app.js | 화면 동작 |
| config.js | Supabase 주소 · 공개용 키 |
| setup.sql | Supabase 표(wx_tasks) 만들기 |
| api/kma.js | 지역별 일정 · 날씨 · 판단 JSON (Vercel 서버 함수) |
| PRD.md | 무엇을 · 왜 만드는지 |
| CLAUDE.md | AI가 지킬 작업 규칙 |
| .gitignore | GitHub에 올리지 않을 파일 목록 |
