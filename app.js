// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : 기본 일정은 data/tasks.json 에서 읽음 (가상 데이터)
// 화면에서 추가한 일정만 브라우저 저장소(wx_added)에 따로 저장
let baseTasks = [];
let baseLoadError = false;  // 더블클릭(file://)으로 열면 JSON 을 못 읽음
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

async function loadBaseTasks() {
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    baseTasks = await res.json();
    baseLoadError = false;
  } catch (err) {
    baseTasks = [];
    baseLoadError = true;
  }
}

// JSON 일정 먼저, 그 뒤에 화면에서 추가한 일정
function loadTasks() {
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = baseTasks.concat(saved);
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (baseLoadError) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'stop';
    td.textContent = '일정 파일(data/tasks.json)을 읽지 못했어요. 배포 주소로 열어 주세요.';
    tr.appendChild(td);
    body.appendChild(tr);
  }
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
loadBaseTasks().then(() => {
  loadTasks();
  renderTasks();
});
loadWeather();
