// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 01 단원 : 일정 목록을 코드 안에 둠 (가상 데이터) → 04 단원에서 data/tasks.json 으로 분리
const SAMPLE_TASKS = [
  { title: '다중이용시설 안전점검', region: '세종', kind: '야외', owner: '김안전' },
  { title: '시민 안전체험 행사 운영', region: '보령', kind: '야외', owner: '이행사' },
  { title: '옥상 태양광 설비 점검', region: '태안', kind: '고소', owner: '박설비' },
  { title: '하천 수위계 확인', region: '대전', kind: '야외', owner: '최현장' },
  { title: '청사 외벽 간판 보수', region: '세종', kind: '고소', owner: '정시설' },
  { title: '비상연락 훈련', region: '대전', kind: '실내', owner: '한상황' },
];

let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

function loadTasks() {
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = SAMPLE_TASKS.concat(saved);
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  loadTasks();
  renderTasks();
}

// 오늘 날짜를 YYYY-MM-DD 로 (내 PC 시간 기준)
function todayText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 03 단원 : Open-Meteo 에서 지역별 오늘 날씨를 받아 판단에 사용
// 주소 끝에 ?test=wind 를 붙이면 모든 지역 풍속을 12 m/s 로 바꿔 규칙을 시험
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  box.textContent = '날씨 불러오는 중…';
  try {
    const res = await fetch(buildWeatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    weatherByRegion = parseWeather(await res.json());
    if (Object.keys(weatherByRegion).length === 0) throw new Error('빈 응답');
  } catch (err) {
    weatherByRegion = {};
    box.textContent = '날씨를 불러오지 못했어요 (' + err.message + ') · 일정은 그대로 볼 수 있어요';
    return;
  }

  const testWind = new URLSearchParams(location.search).get('test') === 'wind';
  if (testWind) {
    for (const name in weatherByRegion) weatherByRegion[name].windMax = 12;
  }

  const parts = REGIONS.filter((r) => weatherByRegion[r.name])
    .map((r) => r.name + ' ' + weatherText(weatherByRegion[r.name]));
  box.textContent = (testWind ? '[테스트 모드: 풍속 12 m/s] ' : '')
    + '오늘 날씨 (최고 기온 · 최대 풍속 · 강수확률) — ' + parts.join(' / ');
  renderTasks();
}

document.getElementById('todayDate').textContent = todayText();
document.getElementById('taskForm').addEventListener('submit', addTask);
loadTasks();
renderTasks();
loadWeather();
