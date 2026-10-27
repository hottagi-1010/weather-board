// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// 지역별 좌표 (시청 · 군청 근처)
const REGIONS = [
  { name: '세종', lat: 36.48, lon: 127.29 },
  { name: '대전', lat: 36.35, lon: 127.38 },
  { name: '태안', lat: 36.75, lon: 126.30 },
  { name: '보령', lat: 36.33, lon: 126.61 },
];

// 일정 구분 (DB 의 check 규칙과 같게 유지 · setup.sql)
const KINDS = ['야외', '고소', '실내'];

// 추가 전에 값 확인 → 문제 있으면 안내 글자, 없으면 ''
function validateTask(t) {
  if (!t.title || t.title.length > 100) return '일정 이름을 1~100자로 적어 주세요.';
  if (!t.owner || t.owner.length > 100) return '담당을 1~100자로 적어 주세요.';
  if (!REGIONS.some((r) => r.name === t.region)) return '지역은 세종 · 대전 · 태안 · 보령 중에서 골라 주세요.';
  if (!KINDS.includes(t.kind)) return '구분은 야외 · 고소 · 실내 중에서 골라 주세요.';
  return '';
}

// Open-Meteo 주소 (네 지역을 한 번에, 오늘 하루 최댓값)
function buildWeatherUrl() {
  return 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + REGIONS.map((r) => r.lat).join(',')
    + '&longitude=' + REGIONS.map((r) => r.lon).join(',')
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max'
    + '&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1';
}

// 응답 → { 세종: { tempMax, windMax, rainProb }, ... }
// 여러 좌표를 물으면 배열로, 하나만 물으면 객체로 오므로 둘 다 받음
function parseWeather(json) {
  const list = Array.isArray(json) ? json : [json];
  const result = {};
  REGIONS.forEach((r, i) => {
    const d = list[i] && list[i].daily;
    if (!d) return;
    const w = {
      tempMax: d.temperature_2m_max[0],
      windMax: d.wind_speed_10m_max[0],
      rainProb: d.precipitation_probability_max[0],
    };
    if ([w.tempMax, w.windMax, w.rainProb].every((v) => typeof v === 'number')) result[r.name] = w;
  });
  return result;
}

// 날씨 한 칸 글자 (화면 표와 md 표가 같이 씀)
function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

// 오늘 판단을 마크다운으로 (note 가 있으면 제목 아래에 한 줄)
function buildJudgeMarkdown(tasks, weatherByRegion, date, note) {
  // 입력 글자 속 | 와 줄바꿈이 표를 깨지 않게
  const cell = (v) => String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const lines = ['# 현장 일정 판단 (' + date + ')', ''];
  if (note) lines.push(note, '');
  lines.push('| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |', '|---|---|---|---|---|---|');
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const row = [t.title, t.region, t.kind, t.owner, weatherText(w), judge(t.kind, w).text];
    lines.push('| ' + row.map(cell).join(' | ') + ' |');
  }
  lines.push('', rulesText(), '');
  return lines.join('\n');
}

// 판단 기준 한 줄 (md 파일과 api/kma 가 같이 씀)
function rulesText() {
  return '판단 기준(교육용 가상): 실내는 영향 없음 · 고소 일정 풍속 ' + RULES.wind + 'm/s 이상 중지 검토 · 최고 기온 '
    + RULES.heat + '℃ 이상 폭염 휴식 · 강수확률 ' + RULES.rain + '% 이상 우천 주의';
}

// 07 단원 : 기상청 단기예보 (api/kma.js 가 씀)
// 위도 · 경도 → 기상청 격자 (nx, ny) · 기상청 안내서의 람베르트 변환식
function kmaGrid(lat, lon) {
  const DEG = Math.PI / 180;
  const re = 6371.00877 / 5.0;
  const slat1 = 30 * DEG, slat2 = 60 * DEG, olon = 126 * DEG, olat = 38 * DEG;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  const sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEG * 0.5), sn);
  let theta = lon * DEG - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5) };
}

// 발표 시각 고르기 : 오늘 02:00 발표 (02:10 전이면 전날 23:00 발표) → 오늘 하루치를 같은 기준으로
function kmaBase(now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const ymd = (d) => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  const today = ymd(kst);
  if (kst.getUTCHours() * 60 + kst.getUTCMinutes() >= 2 * 60 + 10) return { today, baseDate: today, baseTime: '0200' };
  return { today, baseDate: ymd(new Date(kst.getTime() - 24 * 3600 * 1000)), baseTime: '2300' };
}

// 단기예보 주소 (공공데이터포털 Encoding · Decoding 키 둘 다 받음)
function buildKmaUrl(key, grid, base) {
  const serviceKey = key.includes('%') ? key : encodeURIComponent(key);
  return 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
    + '?serviceKey=' + serviceKey + '&pageNo=1&numOfRows=1000&dataType=JSON'
    + '&base_date=' + base.baseDate + '&base_time=' + base.baseTime + '&nx=' + grid.nx + '&ny=' + grid.ny;
}

// 응답 → 오늘의 { tempMax, windMax, rainProb } (최고 기온 TMX · 시간별 기온 TMP · 풍속 WSD · 강수확률 POP)
// 값이 하나라도 없으면 null
function parseKma(json, today) {
  const items = json && json.response && json.response.body && json.response.body.items && json.response.body.items.item;
  if (!Array.isArray(items)) return null;
  const max = (cats) => {
    const vals = items.filter((it) => it.fcstDate === today && cats.includes(it.category))
      .map((it) => Number(it.fcstValue)).filter((v) => Number.isFinite(v));
    return vals.length ? Math.max(...vals) : null;
  };
  const w = { tempMax: max(['TMX', 'TMP']), windMax: max(['WSD']), rainProb: max(['POP']) };
  return [w.tempMax, w.windMax, w.rainProb].every((v) => v !== null) ? w : null;
}

if (typeof module !== 'undefined') module.exports = { RULES, judge, REGIONS, KINDS, validateTask, buildWeatherUrl, parseWeather, weatherText, buildJudgeMarkdown, rulesText, kmaGrid, kmaBase, buildKmaUrl, parseKma };
