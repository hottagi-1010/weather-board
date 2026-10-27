# 현장 일정 날씨판

오늘 현장 일정과 지역별 날씨를 한 화면에서 보고, 날씨 때문에 주의 · 중지를 검토할 일정을 표시합니다. (교육용 가상 데이터)

## 여는 법
- 내 PC : 로컬 서버로 열기 (예: VS Code Live Server, 또는 이 폴더에서 `npx serve`)
  - `index.html` 더블클릭으로는 일정 파일(data/tasks.json)을 읽지 못해 '배포 주소로 열어 주세요' 안내만 보입니다
- 인터넷 : (배포 후 Vercel 주소를 여기에 적기)

## 파일
| 파일 | 역할 |
|---|---|
| index.html | 화면 구조 |
| style.css | 디자인 |
| logic.js | 판단 규칙 |
| app.js | 화면 동작 |
| data/tasks.json | 기본 일정 목록 (가상 데이터) |
| PRD.md | 무엇을 · 왜 만드는지 |
| CLAUDE.md | AI가 지킬 작업 규칙 |
| .gitignore | GitHub에 올리지 않을 파일 목록 |
