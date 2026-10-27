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
  lines.push('', '판단 기준(교육용 가상): 실내는 영향 없음 · 고소 일정 풍속 ' + RULES.wind + 'm/s 이상 중지 검토 · 최고 기온 '
    + RULES.heat + '℃ 이상 폭염 휴식 · 강수확률 ' + RULES.rain + '% 이상 우천 주의', '');
  return lines.join('\n');
}

if (typeof module !== 'undefined') module.exports = { RULES, judge, REGIONS, buildWeatherUrl, parseWeather, weatherText, buildJudgeMarkdown };
