/* trustmebro-meter — editorial exposé app.js (vanilla, no dependencies) */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════════════ */

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /** HTML-escape all data-sourced strings before insertion into innerHTML. */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  /**
   * setHTML — replaces element children with trusted markup we built.
   * All data-sourced strings inside must already be esc()-ed.
   */
  const setHTML = (el, html) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createRange().createContextualFragment(html));
  };

  const pct = (v, digits) => (v * 100).toFixed(digits == null ? 1 : digits) + '%';
  const usd = (v) => (v == null ? '—' : '$' + v.toFixed(2));
  const tokM = (v) => (v == null ? '—' : (v / 1_000_000).toFixed(1) + 'M');

  /** Format a date string like "Jun 1, 2026, 9:00 PM". Falls back to raw string. */
  const fmtDate = (s) => {
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return s;
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     METRICS
  ══════════════════════════════════════════════════════════════════════ */

  const CI_DIMS = ['behavioral_coverage', 'integration', 'test_honesty', 'stubs_left'];

  /** Completeness index from a model's avg_dimension object. */
  const modelCI = (avgDim) => {
    const vals = CI_DIMS.map((d) => avgDim[d]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  /** Completeness index for a single record's dimensions object (evaluated dims only). */
  const recordCI = (dims) => {
    const vals = CI_DIMS.filter((d) => dims[d] && dims[d].evaluated).map((d) => dims[d].score);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  /** Map a 0-1 score to a color token name. */
  const scoreClass = (v) => (v >= 0.85 ? 'mint' : v >= 0.55 ? 'amber' : 'coral');
  const scoreHex = (v) => (v >= 0.85 ? '#1C9A68' : v >= 0.55 ? '#E0922B' : '#EA5440');

  /* ══════════════════════════════════════════════════════════════════════
     BS-METER GAUGE SVG
     All interpolated values are numeric/CSS-var — no data strings.
  ══════════════════════════════════════════════════════════════════════ */

  /**
   * Build an inline SVG half-circle BS-meter.
   * @param {number} completeness - 0..1
   * @param {string} uid - unique suffix for <defs> IDs
   * @param {boolean} large - if true, render hero-size version with animated needle
   */
  function bsMeterSVG(completeness, uid, large) {
    /* Clamp to avoid rendering artefacts */
    const ci = Math.min(1, Math.max(0, completeness));
    const sus = 1 - ci;

    /* The arc: centre (100,100), radius 80. From 180° to 0° (left to right). */
    /* Needle angle: −90° is left (DONE), +90° is right (SUS). */
    /* Map completeness 1→−90°, 0→+90°. So angle = (sus * 180) − 90. */
    const angleDeg = sus * 180 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const needleLen = large ? 68 : 38;
    const cx = 100;
    const cy = 100;
    const nx = (cx + Math.cos(angleRad) * needleLen).toFixed(2);
    const ny = (cy + Math.sin(angleRad) * needleLen).toFixed(2);

    /* Track arc: half-circle, 160 units long (perimeter ≈ π×80 ≈ 251) */
    /* We use a fixed arc path, then colour fill with dashoffset. */
    /* SVG arc: M 20,100 A 80 80 0 0 1 180,100 */
    const arcLen = 251.3; /* π × 80 */
    const fillLen = (ci * arcLen).toFixed(2);
    const emptyLen = ((1 - ci) * arcLen).toFixed(2);

    const needleColour = '#221C49';
    const pivotR = large ? 7 : 4;
    const gradId = 'ggrad-' + uid;
    const sw = large ? 12 : 7; /* stroke-width */

    const animClass = large ? ' class="gauge-needle-animated"' : '';

    return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#1C9A68"/>
      <stop offset="50%"  stop-color="#E0922B"/>
      <stop offset="100%" stop-color="#EA5440"/>
    </linearGradient>
  </defs>
  <!-- track -->
  <path d="M 20,100 A 80,80 0 0,1 180,100"
        fill="none" stroke="#D8D2EE" stroke-width="${sw}" stroke-linecap="round"/>
  <!-- coloured fill from DONE side -->
  <path d="M 20,100 A 80,80 0 0,1 180,100"
        fill="none" stroke="url(#${gradId})" stroke-width="${sw}" stroke-linecap="round"
        stroke-dasharray="${arcLen}"
        stroke-dashoffset="${emptyLen}"/>
  <!-- needle -->
  <line${animClass} x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}"
       stroke="${needleColour}" stroke-width="${large ? 3 : 2}" stroke-linecap="round"/>
  <!-- pivot -->
  <circle cx="${cx}" cy="${cy}" r="${pivotR}" fill="${needleColour}"/>
</svg>`;
  }

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 1 — HERO HEADLINE + GAUGE
  ══════════════════════════════════════════════════════════════════════ */

  function renderHero(data) {
    const { records, models } = data;

    /* Exclude oracle from headline */
    const glmRecords = records.filter((r) => r.model !== 'oracle-gold');
    const total = glmRecords.length;
    const passed = glmRecords.filter((r) => r.reward >= 1).length;
    const gaveUp = glmRecords.filter((r) => r.gave_up === true).length;

    /* Priciest attempt */
    let priciest = null;
    for (const r of glmRecords) {
      if (r.cost_usd != null && (priciest == null || r.cost_usd > priciest.cost_usd)) {
        priciest = r;
      }
    }

    const priciestCost = priciest ? usd(priciest.cost_usd) : '?';
    const priciestTok = priciest ? tokM((priciest.tokens.input || 0) + (priciest.tokens.output || 0)) : '?';

    /* Overall GLM completeness: average CI across non-oracle models */
    const glmModelEntries = Object.entries(models).filter(([id]) => id !== 'oracle-gold');
    const overallCI = glmModelEntries.length
      ? glmModelEntries.reduce((sum, [, m]) => sum + modelCI(m.avg_dimension), 0) / glmModelEntries.length
      : 0;

    /* Headline — no data strings interpolated (only numbers/literals) */
    const headlineEl = $('#hero-headline');
    const passWord = passed === 0 ? '<span class="accent-zero">zero</span>' : String(passed);
    setHTML(headlineEl, `GLM passed ${passWord} of ${total} real feature tasks.`);

    /* Deck */
    const deckEl = $('#hero-deck');
    const gaveUpPhrase =
      gaveUp > 0
        ? `<strong>${gaveUp}</strong> attempt${gaveUp > 1 ? 's' : ''} gave up writing zero production lines. `
        : '';
    setHTML(
      deckEl,
      `${gaveUpPhrase}The priciest run burned <strong>${esc(priciestCost)}</strong> and ` +
        `<strong>${esc(priciestTok)} tokens</strong> — and still failed.`,
    );

    /* Hero gauge */
    const gaugeSlot = $('#hero-gauge');
    setHTML(gaugeSlot, bsMeterSVG(overallCI, 'hero', true));
  }

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 2 — STANDINGS
  ══════════════════════════════════════════════════════════════════════ */

  const DIM_LABELS = {
    behavioral_coverage: 'Behavioral',
    integration: 'Integration',
    test_honesty: 'Test honesty',
    stubs_left: 'Stubs clean',
    error_path: 'Error paths',
  };

  function dimChipsHTML(avgDim) {
    return Object.entries(DIM_LABELS)
      .map(([key, label]) => {
        const v = avgDim[key];
        if (key === 'error_path') {
          return `<span class="dim-chip chip-na" title="${label}: not evaluated in v1">${label} n/a</span>`;
        }
        if (v == null) {
          return `<span class="dim-chip chip-na">${label} —</span>`;
        }
        const cls = v >= 0.85 ? 'chip-pass' : v >= 0.55 ? 'chip-mid' : 'chip-fail';
        return `<span class="dim-chip ${cls}" title="${label}: ${pct(v)}">${label} ${pct(v, 0)}</span>`;
      })
      .join('');
  }

  function renderStandingRow(modelId, model, rank, isOracle) {
    const ci = modelCI(model.avg_dimension);
    const passRate = model.pass_rate;
    const safeId = esc(modelId);

    /* Cost label */
    const costLabel = model.avg_cost_usd != null ? usd(model.avg_cost_usd) + '/trial' : 'ref';

    /* Verdict text */
    let verdictNote = '';
    if (isOracle) {
      verdictNote = 'Reference baseline — human-crafted complete implementation.';
    } else if (passRate === 0 && ci < 0.5) {
      verdictNote = `Completeness index ${pct(ci)} — structural + behavioral gaps throughout.`;
    } else if (passRate === 0) {
      verdictNote = `Passes structural checks but fails behaviorally. CI ${pct(ci)}.`;
    } else {
      verdictNote = `Pass rate ${pct(passRate)}, CI ${pct(ci)}.`;
    }

    /* Expensive + worse label for glm-4.6 */
    let spendingNote = '';
    if (!isOracle && model.gaps_per_trial > 1) {
      spendingNote = ` &middot; <span style="color:var(--coral)">${model.gaps_per_trial.toFixed(1)} gaps/trial</span>`;
    }

    const ciColour = scoreHex(ci);
    const oracleClass = isOracle ? ' is-oracle' : '';
    const rankLabel = isOracle ? '&#9733;' : String(rank);

    const gaugeHTML = bsMeterSVG(ci, 'lb-' + rank, false);

    const gaugeLabelText = ci >= 0.85 ? 'DONE' : ci >= 0.55 ? 'MIXED' : 'SUS';
    const gaugeLabelClass = ci >= 0.85 ? 'mint' : ci >= 0.55 ? 'amber' : 'coral';

    const barPct = pct(ci);

    /* Key stats */
    const trialsLabel = model.n_trials + (model.n_trials === 1 ? ' trial' : ' trials');

    return `<div class="standing-row${oracleClass}" role="listitem" data-model="${safeId}">
  <div class="standing-rank">${rankLabel}</div>
  <div class="standing-body">
    <div class="standing-name">
      ${safeId}${isOracle ? '<span class="oracle-badge">reference</span>' : ''}
    </div>
    <div class="standing-stats">
      <div class="stat-item">
        <span class="stat-value ${passRate >= 1 ? 'mint' : 'coral'}">${pct(passRate, 0)}</span>
        <span class="stat-label">pass rate</span>
      </div>
      <div class="stat-item">
        <span class="stat-value ${scoreClass(ci)}" style="color:${ciColour}">${pct(ci, 0)}</span>
        <span class="stat-label">completeness</span>
      </div>
      <div class="stat-item">
        <span class="stat-value ink">${trialsLabel}</span>
        <span class="stat-label">&nbsp;</span>
      </div>
      <div class="stat-item">
        <span class="stat-value ink">${esc(costLabel)}</span>
        <span class="stat-label">avg cost</span>
      </div>
    </div>
    <div class="completeness-bar-wrap">
      <div class="completeness-bar-track" role="progressbar" aria-valuenow="${(ci * 100).toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="Completeness ${barPct}">
        <div class="completeness-bar-fill" style="width:${barPct};background:${ciColour};"></div>
      </div>
      <span class="completeness-bar-label">${barPct} CI${spendingNote}</span>
    </div>
    <div class="standing-verdict">
      <span class="verdict-note">${esc(verdictNote)}</span>
    </div>
    <div class="dim-breakdown" aria-label="Dimension breakdown">
      ${dimChipsHTML(model.avg_dimension)}
    </div>
  </div>
  <div class="standing-gauge" aria-hidden="true">
    ${gaugeHTML}
    <span class="standing-gauge-label" style="color:var(--${gaugeLabelClass})">${gaugeLabelText}</span>
  </div>
</div>`;
  }

  function renderStandings(data) {
    const { models } = data;

    /* Sort: oracle last (it's the reference), others by CI descending */
    const sorted = Object.entries(models).sort(([idA, a], [idB, b]) => {
      if (idA === 'oracle-gold') return 1;
      if (idB === 'oracle-gold') return -1;
      return modelCI(b.avg_dimension) - modelCI(a.avg_dimension);
    });

    let rank = 0;
    const html = sorted
      .map(([id, model]) => {
        const isOracle = id === 'oracle-gold';
        if (!isOracle) rank++;
        return renderStandingRow(id, model, rank, isOracle);
      })
      .join('');

    setHTML($('#standings'), html);
  }

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 3 — EVIDENCE
  ══════════════════════════════════════════════════════════════════════ */

  /**
   * Classify a record into a verdict.
   * Returns { cls, label } where cls is the CSS modifier and label is the display text.
   */
  function classifyRecord(rec) {
    if (rec.gave_up) {
      return { cls: 'v-gaveup', modifier: 'verdict-gaveup', label: 'GAVE UP · 0 LOC' };
    }
    if (rec.reward >= 1) {
      return { cls: 'v-pass', modifier: 'verdict-pass', label: 'PASSED' };
    }
    if (rec.gaps.length > 0) {
      return {
        cls: 'v-incomplete',
        modifier: 'verdict-incomplete',
        label: `INCOMPLETE · ${rec.gaps.length} gap${rec.gaps.length > 1 ? 's' : ''}`,
      };
    }
    /* 0 gaps, 0 reward = behaviorally wrong but structurally clean */
    return { cls: 'v-wrong', modifier: 'verdict-wrong', label: 'WRONG · 0 gaps' };
  }

  function renderEvidenceEntry(rec, idx) {
    const verdict = classifyRecord(rec);
    const safeModel = esc(rec.model);
    const safeTask = esc(rec.task_id);
    const safeLang = esc(rec.language);

    const totalTokens =
      rec.tokens.input != null && rec.tokens.output != null ? rec.tokens.input + rec.tokens.output : null;

    const costStr = rec.cost_usd != null ? usd(rec.cost_usd) : '—';
    const tokStr = totalTokens != null ? tokM(totalTokens) : '—';
    const locStr =
      rec.gave_up === true
        ? '0 prod LOC (gave up)'
        : rec.prod_added_lines != null
          ? rec.prod_added_lines + ' prod LOC'
          : '—';

    /* Gaps HTML — build detail list and the collapsed summary chip row */
    let gapsHTML = '';
    if (rec.gaps.length === 0) {
      gapsHTML = `<p class="no-gaps-note">No static gaps — ${rec.reward >= 1 ? 'implementation complete.' : 'failure was behavioral, not structural.'}</p>`;
    } else {
      const summaryChips = rec.gaps
        .slice(0, 3)
        .map((g) => {
          const rule = esc(g.rule || '');
          const file = esc(g.file || '?');
          const line = g.line != null ? ':' + Number(g.line) : '';
          return `<span class="gap-rule-tag">${rule}</span><span class="gap-file-ref">${file}${line}</span>`;
        })
        .join(' ');

      const moreCount = rec.gaps.length > 3 ? ` +${rec.gaps.length - 3} more` : '';
      const detailItems = rec.gaps
        .map((g) => {
          const rule = esc(g.rule || '');
          const file = esc(g.file || '?');
          const line = g.line != null ? ':' + Number(g.line) : '';
          const evidence = esc(g.evidence || '');
          return `<div class="gap-chip">
  <span class="gap-rule-tag">${rule}</span>
  <span class="gap-file-ref">${file}${line}</span>
  <span class="gap-evidence-text">${evidence}</span>
</div>`;
        })
        .join('');

      gapsHTML = `
<div class="entry-gaps">
  <button class="entry-expand-btn" aria-expanded="false" aria-controls="gaps-detail-${idx}" data-idx="${idx}">
    <span class="expand-arrow">&#9654;</span>
    ${rec.gaps.length} gap${rec.gaps.length > 1 ? 's' : ''} — show evidence${esc(moreCount)}
  </button>
  <div class="entry-gaps-detail hidden" id="gaps-detail-${idx}">
    ${detailItems}
  </div>
</div>`;
    }

    return `<div class="evidence-entry ${verdict.modifier}" role="listitem">
  <div class="entry-header">
    <span class="entry-model">${safeModel}</span>
    <span class="entry-task">${safeTask}</span>
    <span class="entry-lang">${safeLang}</span>
  </div>
  <span class="entry-verdict ${verdict.cls}">${verdict.label}</span>
  <div class="entry-meta">
    <span><strong>cost</strong> ${esc(costStr)}</span>
    <span><strong>tokens</strong> ${esc(tokStr)}</span>
    <span><strong>LOC</strong> ${esc(locStr)}</span>
  </div>
  ${gapsHTML}
</div>`;
  }

  function renderEvidence(data) {
    const { records } = data;

    /* Sort: gave-up first, then by gap count descending, then by cost descending */
    const sorted = [...records].sort((a, b) => {
      /* Oracle (passed) at the very end */
      if (a.reward >= 1 && b.reward < 1) return 1;
      if (b.reward >= 1 && a.reward < 1) return -1;
      /* Gave-up first */
      if (a.gave_up && !b.gave_up) return -1;
      if (b.gave_up && !a.gave_up) return 1;
      /* Most gaps first */
      if (b.gaps.length !== a.gaps.length) return b.gaps.length - a.gaps.length;
      /* Most expensive first as tiebreaker */
      return (b.cost_usd || 0) - (a.cost_usd || 0);
    });

    const html = sorted.map((rec, i) => renderEvidenceEntry(rec, i)).join('');
    setHTML($('#evidence-list'), html);

    /* Wire up expand buttons */
    $$('.entry-expand-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        const detail = $('#gaps-detail-' + btn.dataset.idx);
        if (detail) detail.classList.toggle('hidden', expanded);
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     PAGE-LOAD ANIMATION
  ══════════════════════════════════════════════════════════════════════ */

  function setupRevealAnimation() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    document.body.classList.add('anim-ready');

    const sections = ['.masthead', '.hero-section', '.standings-section', '.evidence-section'];
    sections.forEach((sel, i) => {
      const el = $(sel);
      if (!el) return;
      el.classList.add('reveal-item');
      /* Stagger based on index */
      const delay = i * 90 + 20;
      setTimeout(() => el.classList.add('is-visible'), delay);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════════════════════ */

  function render(data) {
    const { generated_at } = data;

    /* Dateline — textContent only */
    const genEl = $('#generated-at');
    if (genEl) genEl.textContent = fmtDate(generated_at);

    /* Sections */
    renderHero(data);
    renderStandings(data);
    renderEvidence(data);

    /* Animations */
    setupRevealAnimation();
  }

  /* ══════════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════════ */

  function boot() {
    const data = window.TRUSTMEBRO_RESULTS;
    if (!data) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:4rem;font-family:sans-serif;color:#EA5440';
      const h = document.createElement('h2');
      h.textContent = 'results.js not loaded';
      const p = document.createElement('p');
      p.textContent = 'Make sure results.js is in the same directory as index.html.';
      wrap.appendChild(h);
      wrap.appendChild(p);
      document.body.appendChild(wrap);
      return;
    }
    render(data);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
