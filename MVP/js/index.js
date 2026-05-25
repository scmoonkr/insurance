/* KSR · The Index — single event renderer (one event = one table) */
(() => {
  'use strict';

  // ── taxonomies ────────────────────────────────────────────
  const DIVISIONS = [
    { v: 'all',     label: '전체',     sub: 'ALL' },
    { v: 'elite',   label: '전문체육', sub: 'ELITE' },
    { v: 'masters', label: '마스터즈', sub: 'MASTERS' },
  ];

  // group labels can vary by division (elite: "일반부", masters: "성인부")
  const GROUPS = [
    {
      v: 'all',
      labels: { all: '전체', elite: '전체', masters: '전체' },
      sub: 'ALL',
      enabled: true,
    },
    {
      v: 'adult',
      labels: { all: '성인', elite: '일반부', masters: '성인부' },
      sub: 'ADULT',
      enabled: true,
    },
    { v: 'high',  labels: { all: '고등부', elite: '고등부', masters: '고등부' }, sub: 'HIGH',  enabled: false },
    { v: 'mid',   labels: { all: '중등부', elite: '중등부', masters: '중등부' }, sub: 'MID',   enabled: false },
    { v: 'elem',  labels: { all: '초등부', elite: '초등부', masters: '초등부' }, sub: 'ELEM',  enabled: false },
    { v: 'youth', labels: { all: '유년부', elite: '유년부', masters: '유년부' }, sub: 'YOUTH', enabled: false },
  ];

  const GENDERS = [
    { v: 'm', label: '남자', sub: 'MEN'   },
    { v: 'f', label: '여자', sub: 'WOMEN' },
  ];

  const STROKES = [
    { v: 'free',   label: '자유형',   subDesk: 'FREE',   subMob: 'FR' },
    { v: 'back',   label: '배영',     subDesk: 'BACK',   subMob: 'BA' },
    { v: 'breast', label: '평영',     subDesk: 'BREAST', subMob: 'BR' },
    { v: 'fly',    label: '접영',     subDesk: 'FLY',    subMob: 'FL' },
    { v: 'im',     label: '개인혼영', subDesk: 'I.M.',   subMob: 'IM' },
  ];

  const COURSES = [
    { v: 'lcm', label: 'LCM', sub: '50m · LONG'  },
    { v: 'scm', label: 'SCM', sub: '25m · SHORT' },
  ];

  // distance options: dynamic based on stroke, division, course
  function availableDistances(stroke, division, course) {
    const base = [50, 100, 200];
    const free = stroke === 'free' ? [400, 800, 1500] : [];
    const im400 = stroke === 'im' ? [400] : [];
    const masters25 = (division === 'masters' && course === 'scm') ? [25] : [];
    const set = new Set([...masters25, ...base, ...free, ...im400]);
    return [...set].sort((a, b) => a - b);
  }

  // ── default state ─────────────────────────────────────────
  // top100 is now permanent — one event per page, full Top 100 view
  const state = {
    division: 'elite',
    group:    'all',
    gender:   'm',
    stroke:   'breast',
    distance: 50,
    course:   'lcm',
    top100:   true,
  };

  let DATA = null;

  // ── helpers ───────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
  function getLabel(arr, v) {
    const it = arr.find(x => x.v === v);
    return it ? it.label : v;
  }
  function sheetKey(division, group) {
    // group === 'all' (전체) — use the division sheet directly
    if (group === 'all') {
      return division; // 'all' | 'elite' | 'masters'
    }
    if (group === 'adult') {
      return division === 'all' ? 'adult' : `${division}-adult`;
    }
    // junior categories not yet wired — UI disables them
    return null;
  }

  function groupLabelFor(groupKey, divisionKey) {
    const g = GROUPS.find(x => x.v === groupKey);
    if (!g) return groupKey;
    if (typeof g.labels === 'object') return g.labels[divisionKey] || g.labels.all;
    return g.label || groupKey;
  }

  // ── filter rendering ──────────────────────────────────────
  function renderFilters() {
    const buildSimple = (items, key) => items.map(it => `
      <li>
        <button class="filter-btn ${it.v === state[key] ? 'current' : ''}"
                data-key="${key}" data-value="${it.v}">
          <span class="label-wrap">
            <span class="indicator">·</span>
            <span>${it.label}</span>
          </span>
          <span class="sub">${it.sub}</span>
        </button>
      </li>
    `).join('');

    const buildStrokes = (items, key) => items.map(it => `
      <li>
        <button class="filter-btn ${it.v === state[key] ? 'current' : ''}"
                data-key="${key}" data-value="${it.v}">
          <span class="label-wrap">
            <span class="indicator">·</span>
            <span>${it.label}</span>
          </span>
          <span class="sub">
            <span class="lbl-desk">${it.subDesk}</span><span class="lbl-mob">${it.subMob}</span>
          </span>
        </button>
      </li>
    `).join('');

    const buildGroups = (items, key) => items.map(it => {
      const lbl = groupLabelFor(it.v, state.division);
      return `
      <li>
        <button class="filter-btn ${it.v === state[key] ? 'current' : ''} ${it.enabled ? '' : 'disabled'}"
                data-key="${key}" data-value="${it.v}" ${it.enabled ? '' : 'aria-disabled="true"'}>
          <span class="label-wrap">
            <span class="indicator">·</span>
            <span>${lbl}</span>
          </span>
          <span class="sub">${it.sub}</span>
        </button>
      </li>`;
    }).join('');

    const buildDistances = () => {
      const dists = availableDistances(state.stroke, state.division, state.course);
      return dists.map(d => `
        <li>
          <button class="filter-btn ${d === state.distance ? 'current' : ''}"
                  data-key="distance" data-value="${d}">
            <span class="label-wrap">
              <span class="indicator">·</span>
              <span>${d}m</span>
            </span>
            <span class="sub">${d <= 50 ? 'SPRINT' : d <= 200 ? 'MID' : 'DISTANCE'}</span>
          </button>
        </li>
      `).join('');
    };

    document.getElementById('filter-division').innerHTML = buildSimple(DIVISIONS, 'division');
    document.getElementById('filter-group').innerHTML    = buildGroups(GROUPS, 'group');
    document.getElementById('filter-gender').innerHTML   = buildSimple(GENDERS, 'gender');
    document.getElementById('filter-stroke').innerHTML   = buildStrokes(STROKES, 'stroke');
    document.getElementById('filter-distance').innerHTML = buildDistances();
    document.getElementById('filter-course').innerHTML   = buildSimple(COURSES, 'course');
  }

  // ── data resolution ───────────────────────────────────────
  function findEvent() {
    const key = sheetKey(state.division, state.group);
    if (!key) return null;
    const sheet = DATA[key] || [];
    return sheet.find(e =>
      e.gender === state.gender &&
      e.stroke === state.stroke &&
      e.distance === Number(state.distance) &&
      e.course === state.course
    ) || null;
  }

  // ── results rendering ─────────────────────────────────────
  function renderResults() {
    // Auto-correct distance if current selection no longer valid (e.g. switched from free 800m → back)
    const dists = availableDistances(state.stroke, state.division, state.course);
    if (!dists.includes(Number(state.distance))) {
      state.distance = dists.includes(100) ? 100 : dists[0];
      renderFilters();
    }

    const titleEl = document.getElementById('results-title');
    const metaEl  = document.getElementById('results-meta');

    const genderL   = getLabel(GENDERS, state.gender);
    const strokeL   = getLabel(STROKES, state.stroke);
    const divisionL = getLabel(DIVISIONS, state.division);
    const groupL    = groupLabelFor(state.group, state.division);
    const courseL   = state.course.toUpperCase();

    // Title prefixes:
    //   - masters division → "마스터즈" (elite/all stay plain)
    //   - any non-all group → group label (e.g. 일반부 / 성인부 / 성인)
    // Example: 마스터즈 + 성인부 + 남자 평영 50m LCM
    const mastersPrefix = state.division === 'masters' ? '마스터즈 ' : '';
    const groupPrefix   = state.group !== 'all' ? `${groupL} ` : '';
    const titleHTML = `${escapeHtml(mastersPrefix)}${escapeHtml(groupPrefix)}${escapeHtml(genderL)} ${escapeHtml(strokeL)} <span class="em">${state.distance}m ${escapeHtml(courseL)}</span>`;
    titleEl.innerHTML = titleHTML;

    // group=all 시 group 라벨은 생략 — "ELITE · TOP 10"
    const groupPart = state.group === 'all' ? '' : ` · ${groupL.toUpperCase()}`;
    metaEl.textContent = `${divisionL.toUpperCase()}${groupPart} · TOP ${state.top100 ? '100' : '10'}`;

    // Sticky brand title (shown when scrolled past hero) — same composition
    const brandTitle = document.getElementById('brand-title');
    if (brandTitle) brandTitle.innerHTML = titleHTML;

    const ev = findEvent();
    const host = document.getElementById('table-host');

    if (!ev) {
      host.innerHTML = `
        <div class="empty-state">
          선택한 조합에 해당하는 종목 데이터가 아직 수집되지 않았습니다.<br/>
          제보를 통해 The Index에 처음으로 이름을 올려보세요.
        </div>`;
      updateSidebarStats(0, 0, 0);
      return;
    }

    const showTo = state.top100 ? 100 : 10;
    host.innerHTML = buildTable(ev, showTo);

    const namesSet = new Set();
    let rankCount = 0;
    ev.ranks.forEach(r => {
      if (r.rank <= showTo) { namesSet.add(r.name); rankCount++; }
    });
    updateSidebarStats(1, rankCount, namesSet.size);
  }

  function updateSidebarStats(eventCount, rankCount, athletes) {
    document.getElementById('stat-events').textContent = eventCount;
    document.getElementById('stat-ranks').textContent = rankCount.toLocaleString();
    document.getElementById('stat-athletes').textContent = athletes.toLocaleString();
    document.getElementById('hero-stat').textContent =
      `${DATA.all.length} EVENTS · ${DATA.all.reduce((a,e)=>a+e.ranks.length,0).toLocaleString()} RANKS LISTED`;
  }

  function buildTable(ev, showTo) {
    const sorted = [...ev.ranks].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (a.date || '').localeCompare(b.date || '');
    });

    let body = '';
    // Top 10 block
    for (let i = 1; i <= 10; i++) {
      const matches = sorted.filter(r => r.rank === i);
      if (matches.length) {
        matches.forEach(r => { body += rowHtml(r, i === 1); });
      } else {
        body += emptyRowHtml(i, i === 1);
      }
    }

    if (showTo > 10) {
      body += `<tr class="tier-divider"><td colspan="6">RANKS 11 – ${showTo} · 등재 대기중</td></tr>`;
      for (let i = 11; i <= showTo; i++) {
        const matches = sorted.filter(r => r.rank === i);
        if (matches.length) {
          matches.forEach(r => { body += rowHtml(r, false); });
        } else {
          body += emptyRowHtml(i, false);
        }
      }
    }

    return `
      <table class="index-table">
        <thead>
          <tr>
            <th class="c-rank">Rank · 순위</th>
            <th class="c-name">Name · 성명</th>
            <th class="c-city">City · 도시</th>
            <th class="c-date">Date · 일자</th>
            <th class="c-meet">Meet · 대회</th>
            <th class="c-time">Time · 기록</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function rowHtml(r, isFirst) {
    const meetFull  = escapeHtml(r.meet_full || r.meet || '—');
    const meetShort = escapeHtml(r.meet || r.meet_full || '—');
    return `
      <tr${isFirst ? ' class="first"' : ''}>
        <td class="rank">${r.rank}</td>
        <td class="name">${escapeHtml(r.name || '—')}</td>
        <td class="city">${escapeHtml(r.city || '—')}</td>
        <td class="date">${escapeHtml(r.date || '—')}</td>
        <td class="meet"><span class="meet-full">${meetFull}</span><span class="meet-short">${meetShort}</span></td>
        <td class="time">${escapeHtml(r.time || '—')}</td>
      </tr>
    `;
  }

  function emptyRowHtml(i, isFirst) {
    return `
      <tr class="empty${isFirst ? ' first' : ''}">
        <td class="rank">${i}</td>
        <td class="name">등재 대기중</td>
        <td class="city">—</td>
        <td class="date">—</td>
        <td class="meet">—</td>
        <td class="time">—</td>
      </tr>
    `;
  }

  // ── event handlers ────────────────────────────────────────
  function attachHandlers() {
    document.querySelector('aside.filters').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn || btn.classList.contains('disabled')) return;
      const key = btn.dataset.key;
      let val = btn.dataset.value;
      if (key === 'distance') val = Number(val);
      if (state[key] === val) return;
      state[key] = val;
      renderFilters();
      renderResults();
    });

    // toggle-top100 button removed — Top 100 is now permanent
  }

  // ── sticky brand toggle ───────────────────────────────────
  // Brand fades to event title only after the page's own large H2
  // (results-title) has scrolled above the viewport top.
  function watchHero() {
    const target = document.getElementById('results-title');
    if (!target) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const aboveViewport = e.boundingClientRect.top < 0;
        document.body.classList.toggle(
          'scrolled-past-hero',
          !e.isIntersecting && aboveViewport
        );
      });
    }, { threshold: 0 });
    io.observe(target);
  }

  // ── boot ──────────────────────────────────────────────────
  function boot() {
    DATA = window.KSR_DATA;
    if (!DATA) {
      document.getElementById('table-host').innerHTML =
        `<div class="empty-state">데이터가 로드되지 않았습니다. js/data.js 파일을 확인해주세요.</div>`;
      return;
    }
    renderFilters();
    renderResults();
    attachHandlers();
    watchHero();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
