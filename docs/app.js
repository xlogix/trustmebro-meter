/* trustmebro-meter — dashboard app.js (vanilla, no dependencies) */
(function () {
  'use strict';

  /* ── helpers ── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const pct = (v) => (v * 100).toFixed(1) + '%';
  const fmt = (v, digits = 2) => (v == null ? '—' : v.toFixed(digits));

  /**
   * esc() — HTML-escapes a value sourced from external data (results.js fields
   * like task_id, model name, file paths, evidence text).  All numeric and
   * boolean values are safe by construction; strings from the data file pass
   * through this before being interpolated into innerHTML / SVG strings.
   */
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC_MAP[c]);

  /**
   * setHTML() — replaces an element's children from an HTML string built
   * entirely by this module (never from raw user/network input).  Uses
   * createContextualFragment so the intent — "this is trusted markup we built"
   * — is explicit and auditable.  All data-sourced strings inside that markup
   * must have already been passed through esc().
   */
  const setHTML = (el, html) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createRange().createContextualFragment(html));
  };

  /* ── colour helpers ── */
  const scoreColour = (v) => {
    if (v >= 0.85) return 'var(--mint)';
    if (v >= 0.55) return 'var(--amber)';
    return 'var(--coral)';
  };

  /* ── completeness index for a model's avg_dimension object ── */
  const computeCI = (avgDim) => {
    const dims = ['behavioral_coverage', 'integration', 'test_honesty', 'stubs_left'];
    const vals = dims.map((d) => avgDim[d]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  /* ── completeness index for a single record's dimensions object ── */
  const recordCI = (dimensions) => {
    const dims = ['behavioral_coverage', 'integration', 'test_honesty', 'stubs_left'];
    const vals = dims
      .filter((d) => dimensions[d] && dimensions[d].evaluated)
      .map((d) => dimensions[d].score);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * BS-meter gauge SVG
   * All interpolated values are numeric (coordinates, percentages) or
   * CSS-variable names — no data-sourced strings here.
   * ───────────────────────────────────────────────────────────────────────── */
  function bsMeterSVG(completeness, uid) {
    const sus = 1 - completeness;
    const angle = -80 + sus * 160;
    const rad = (angle * Math.PI) / 180;
    const nx = (60 + Math.cos(rad) * 44).toFixed(1);
    const ny = (60 + Math.sin(rad) * 44).toFixed(1);
    const colour = scoreColour(completeness);
    const dashOffset = (157 * completeness).toFixed(1);
    const susLabel = pct(sus); // numeric only
    return `<svg class="bs-gauge" viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg" aria-label="BS meter: ${susLabel} sus">
  <defs>
    <linearGradient id="gauge-grad-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--mint)"/>
      <stop offset="55%" stop-color="var(--amber)"/>
      <stop offset="100%" stop-color="var(--coral)"/>
    </linearGradient>
  </defs>
  <path d="M12 62 A50 50 0 0 1 108 62" fill="none" stroke="#E5E7EB" stroke-width="10" stroke-linecap="round"/>
  <path d="M12 62 A50 50 0 0 1 108 62" fill="none" stroke="url(#gauge-grad-${uid})" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="157" stroke-dashoffset="${dashOffset}" opacity="0.55"/>
  <line x1="60" y1="62" x2="${nx}" y2="${ny}" stroke="var(--indigo-dark)" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="62" r="5" fill="var(--indigo-dark)"/>
  <text x="8" y="76" font-family="var(--font)" font-size="9" font-weight="700" fill="var(--mint)" text-anchor="middle">DONE</text>
  <text x="112" y="76" font-family="var(--font)" font-size="9" font-weight="700" fill="var(--coral)" text-anchor="middle">SUS</text>
</svg>`;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Mini dimension progress bar
   * label is a hardcoded literal from our dims array (not from data).
   * value and colour are numeric / CSS variable — safe without escaping.
   * ───────────────────────────────────────────────────────────────────────── */
  function dimBar(label, value, evaluated) {
    if (!evaluated) {
      return `<div class="dim-bar">
  <span class="dim-label">${label}</span>
  <span class="dim-na">n/a — v1</span>
</div>`;
    }
    const colour = scoreColour(value);
    const valPct = pct(value);
    const valInt = (value * 100).toFixed(0);
    return `<div class="dim-bar">
  <span class="dim-label">${label}</span>
  <div class="dim-track" role="progressbar" aria-valuenow="${valInt}" aria-valuemin="0" aria-valuemax="100">
    <div class="dim-fill" style="width:${valPct};background:${colour};"></div>
  </div>
  <span class="dim-val" style="color:${colour}">${valPct}</span>
</div>`;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Leaderboard card
   * modelId comes from the data file — escaped via esc().
   * All numeric interpolations (rank, rates, costs) are safe by construction.
   * ───────────────────────────────────────────────────────────────────────── */
  function renderLeaderboardCard(modelId, model, rank) {
    const ci = computeCI(model.avg_dimension);
    const passRate = model.pass_rate;
    const gap = passRate - ci;
    const gapClass = gap > 0.1 ? 'gap-warn' : gap > 0 ? 'gap-mild' : 'gap-ok';

    const DIMS = [
      { key: 'behavioral_coverage', label: 'Behavioral' },
      { key: 'integration',         label: 'Integration' },
      { key: 'test_honesty',        label: 'Test honesty' },
      { key: 'stubs_left',          label: 'Stubs left' },
      { key: 'error_path',          label: 'Error paths' },
    ];

    const dimBarsHTML = DIMS.map((d) => {
      const val = model.avg_dimension[d.key];
      return dimBar(d.label, val, d.key !== 'error_path');
    }).join('');

    const gapDeltaHTML = gap > 0.02
      ? `<span class="gap-delta">−${pct(gap)}</span>`
      : `<span class="gap-delta ok">≈</span>`;

    const gaugeLabel = ci >= 0.85 ? 'DONE ✓' : ci >= 0.55 ? 'MOSTLY' : 'SUS ⚠';

    // modelId is from the data file — escape it before placing in HTML
    const safeModelId = esc(modelId);

    return `<div class="lb-card" data-model="${safeModelId}">
  <div class="lb-card-header">
    <div class="lb-rank">#${rank}</div>
    <div class="lb-name">${safeModelId}</div>
    <div class="lb-ci-badge" style="background:${scoreColour(ci)}">${pct(ci)}</div>
  </div>
  <div class="lb-metrics">
    <div class="metric-pair ${gapClass}">
      <div class="metric-item">
        <div class="metric-val" style="color:${scoreColour(passRate)}">${pct(passRate)}</div>
        <div class="metric-lbl">DeepSWE pass</div>
      </div>
      <div class="metric-divider">
        <div class="gap-arrow ${gapClass}" title="Gap between pass rate and completeness">
          ${gapDeltaHTML}
        </div>
      </div>
      <div class="metric-item">
        <div class="metric-val" style="color:${scoreColour(ci)}">${pct(ci)}</div>
        <div class="metric-lbl">Completeness</div>
      </div>
    </div>
    <div class="metric-row">
      <div class="metric-item sm">
        <div class="metric-val sm">${model.gaps_per_trial.toFixed(2)}</div>
        <div class="metric-lbl">gaps/trial</div>
      </div>
      <div class="metric-item sm">
        <div class="metric-val sm">${model.n_trials}</div>
        <div class="metric-lbl">trials</div>
      </div>
      <div class="metric-item sm">
        <div class="metric-val sm">${fmt(model.avg_cost_usd)}</div>
        <div class="metric-lbl">avg cost</div>
      </div>
    </div>
  </div>
  <div class="lb-gauge-wrap">
    ${bsMeterSVG(ci, rank)}
    <div class="gauge-label" style="color:${scoreColour(ci)}">${gaugeLabel}</div>
  </div>
  <div class="lb-dims">
    <div class="dims-heading">Dimensions</div>
    ${dimBarsHTML}
  </div>
</div>`;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Per-task table rows
   * All string fields from the data (model, task_id, language, file, rule,
   * evidence) are passed through esc() before interpolation.
   * ───────────────────────────────────────────────────────────────────────── */
  function renderTaskRow(rec, idx) {
    const ci = recordCI(rec.dimensions);
    const ciLabel = ci != null ? pct(ci) : '—';
    const ciColour = ci != null ? scoreColour(ci) : '#6B7280';
    const passIcon = rec.reward >= 1
      ? `<span class="badge pass" aria-label="passed">✓</span>`
      : `<span class="badge fail" aria-label="failed">✗</span>`;

    const gapsHTML = rec.gaps.length === 0
      ? '<p class="no-gaps">No gaps found — clean!</p>'
      : rec.gaps.map((g) => {
          const loc = esc(g.file || '?') + (g.line ? ':' + Number(g.line) : '');
          const rule = esc(g.rule || '');
          const evidence = esc(g.evidence || '');
          return `<div class="gap-item">
  <span class="gap-loc">${loc}</span>
  <span class="gap-rule">[${rule}]</span>
  <span class="gap-evidence">${evidence}</span>
</div>`;
        }).join('');

    return `<tr class="task-row" data-idx="${idx}" tabindex="0" role="button" aria-expanded="false">
  <td>${esc(rec.model)}</td>
  <td class="task-id">${esc(rec.task_id)}</td>
  <td><span class="lang-pill">${esc(rec.language)}</span></td>
  <td>${passIcon}</td>
  <td><span class="ci-val" style="color:${ciColour}">${ciLabel}</span></td>
  <td><span class="gap-count${rec.gaps.length > 0 ? ' has-gaps' : ''}">${rec.gaps.length}</span></td>
</tr>
<tr class="gap-detail-row hidden" id="gap-detail-${idx}" aria-hidden="true">
  <td colspan="6"><div class="gap-detail-inner">${gapsHTML}</div></td>
</tr>`;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Headline stat
   * Numbers and plural suffixes only — no data strings interpolated.
   * ───────────────────────────────────────────────────────────────────────── */
  function buildHeadlineStat(records) {
    const passedWithGaps = records.filter((r) => r.reward >= 1 && r.gaps.length > 0).length;
    const totalPassed = records.filter((r) => r.reward >= 1).length;
    const totalRecords = records.length;

    if (totalPassed === 0) {
      return { html: 'No solutions passed yet — benchmark warming up.', cls: 'neutral' };
    }
    if (passedWithGaps === 0) {
      const s = totalRecords !== 1 ? 's' : '';
      return {
        html: `${totalPassed} of ${totalRecords} solution${s} passed — 0 carried completeness gaps so far. <span class="thesis-note">(More models coming; the gap will show.)</span>`,
        cls: 'clean',
      };
    }
    const s = totalPassed !== 1 ? 's' : '';
    return {
      html: `${passedWithGaps} of ${totalPassed} solution${s} that <strong>PASSED</strong> still carried completeness gaps.`,
      cls: 'warn',
    };
  }

  /* ── main render ── */
  function render(data) {
    const { generated_at, models, records } = data;

    /* generated_at — set via textContent, never innerHTML */
    let genLabel = generated_at;
    try {
      genLabel = new Date(generated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {}
    $('#generated-at').textContent = genLabel;

    /* headline stat — only numeric/literal interpolations; use setHTML */
    const { html: headlineHTML, cls: headlineCls } = buildHeadlineStat(records);
    const headlineEl = $('#headline-stat');
    headlineEl.className = 'headline-stat ' + headlineCls;
    setHTML(headlineEl, headlineHTML);

    /* leaderboard — model IDs are escaped inside renderLeaderboardCard */
    const sortedModels = Object.entries(models).sort(
      ([, a], [, b]) => computeCI(b.avg_dimension) - computeCI(a.avg_dimension)
    );
    setHTML($('#leaderboard'), sortedModels.map(([id, m], i) => renderLeaderboardCard(id, m, i + 1)).join(''));

    /* task table — all data strings escaped inside renderTaskRow */
    setHTML($('#task-tbody'), records.map((r, i) => renderTaskRow(r, i)).join(''));

    /* row toggle — attached after DOM is in place */
    $$('.task-row').forEach((row) => {
      const toggle = () => {
        const idx = row.dataset.idx;
        const detail = $(`#gap-detail-${idx}`);
        const expanded = row.getAttribute('aria-expanded') === 'true';
        row.setAttribute('aria-expanded', String(!expanded));
        detail.setAttribute('aria-hidden', String(expanded));
        detail.classList.toggle('hidden', expanded);
        row.classList.toggle('expanded', !expanded);
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ── boot ── */
  function boot() {
    if (!window.TRUSTMEBRO_RESULTS) {
      /* Build error UI with DOM methods — no innerHTML */
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:4rem;text-align:center;font-family:system-ui;color:#DC2626';
      const h = document.createElement('h2');
      h.textContent = 'results.js not loaded';
      const p = document.createElement('p');
      p.textContent = 'Make sure results.js is in the same directory as index.html.';
      wrap.appendChild(h);
      wrap.appendChild(p);
      document.body.appendChild(wrap);
      return;
    }
    render(window.TRUSTMEBRO_RESULTS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
