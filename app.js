// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 06 단원 : 일정은 Supabase 표 wx_tasks 에서 읽고, 추가도 거기에 저장
// 연결 정보는 config.js (주소 · 공개용 키). 비밀 키는 쓰지 않음
const db = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let tasks = [];
let loadError = '';         // 일정을 못 읽었을 때 표에 보일 글자
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음
let testWind = false;       // ?test=wind 로 열었는지

async function loadTasks() {
  if (!db) {
    tasks = [];
    loadError = '일정 DB에 연결하지 못했어요. config.js 에 Supabase 주소 · 공개용 키를 넣어 주세요.';
    return;
  }
  const { data, error } = await db.from('wx_tasks').select('title, region, kind, owner').order('id');
  if (error) {
    tasks = [];
    loadError = '일정 DB를 읽지 못했어요 (' + error.message + ') · config.js · setup.sql 을 확인해 주세요.';
    return;
  }
  tasks = data;
  loadError = '';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (loadError) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'stop';
    td.textContent = loadError;
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

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('msgBox');
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  const problem = validateTask(t);
  if (problem) { msg.textContent = problem; return; }
  if (!db) { msg.textContent = '일정 DB에 연결되지 않아 저장할 수 없어요.'; return; }

  const button = form.querySelector('button');
  button.disabled = true;
  const { error } = await db.from('wx_tasks').insert(t);
  button.disabled = false;
  if (error) { msg.textContent = '저장하지 못했어요 (' + error.message + ')'; return; }

  msg.textContent = '';
  form.reset();
  await loadTasks();
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

  testWind = new URLSearchParams(location.search).get('test') === 'wind';
  if (testWind) {
    for (const name in weatherByRegion) weatherByRegion[name].windMax = 12;
  }

  const parts = REGIONS.filter((r) => weatherByRegion[r.name])
    .map((r) => r.name + ' ' + weatherText(weatherByRegion[r.name]));
  box.textContent = (testWind ? '[테스트 모드: 풍속 12 m/s] ' : '')
    + '오늘 날씨 (최고 기온 · 최대 풍속 · 강수확률) — ' + parts.join(' / ');
  renderTasks();
}

// 04 단원 : 지금 표를 md 파일로 내려받기 (md 만들기는 logic.js)
function saveJudgeMarkdown() {
  const date = todayText();
  const note = testWind ? '> 테스트 모드(풍속 12 m/s) — 실제 날씨 판단이 아님' : '';
  const md = buildJudgeMarkdown(tasks, weatherByRegion, date, note);
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = '현장일정_판단_' + date + '.md';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('todayDate').textContent = todayText();
document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMdBtn').addEventListener('click', saveJudgeMarkdown);
loadTasks().then(renderTasks);
loadWeather();
