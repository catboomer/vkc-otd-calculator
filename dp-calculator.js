/**
 * V Knows Cars — Down Payment Decision Calculator
 * Load order: config.js → calculator.js → dp-calculator.js
 */
'use strict';

// ============================================
// STATE EXTENSIONS
// ============================================
Object.assign(state, {
  selectedTerm:     60,
  investmentReturn: CONFIG.downPaymentCalc.defaultInvestmentReturn,
  gainsTaxRate:     CONFIG.downPaymentCalc.defaultGainsTaxRate,
  residualPct:      CONFIG.downPaymentCalc.residualByTerm[60],
  maintenanceCosts: { ...CONFIG.downPaymentCalc.maintenanceByYear }
});


// ============================================
// CALCULATION ENGINE
// ============================================
function dpCalculate() {
  const otd   = calculate();          // shared OTD engine from calculator.js
  const term  = state.selectedTerm;
  const years = term / 12;

  const totalAmountDue = otd.outTheDoor;
  const downPayment    = Math.min(state.downPayment, totalAmountDue);
  const amountFinanced = Math.max(0, totalAmountDue - downPayment);
  const cashInvested   = totalAmountDue - downPayment;

  const aprInfo = getAprForTerm(term);
  const apr     = aprInfo.apr !== undefined ? aprInfo.apr : aprInfo.rate;
  const monthly = calculateMonthlyPayment(amountFinanced, apr, term);
  const totalPmts     = monthly * term;
  const totalInterest = Math.max(0, totalPmts - amountFinanced);

  // Investment: lump sum grows at gross rate, only the GAIN is taxed at end
  const r  = state.investmentReturn;
  const fv = cashInvested > 0 ? cashInvested * Math.pow(1 + r, years) : 0;
  const investmentGain     = Math.max(0, fv - cashInvested);
  const investmentTax      = investmentGain * state.gainsTaxRate;
  const investmentValueNet = fv - investmentTax;

  // Maintenance — sum years covered by term, pro-rate fractional final year
  let totalMaintenance = 0;
  for (let y = 1; y <= Math.floor(years); y++) {
    totalMaintenance += (state.maintenanceCosts[Math.min(y, 7)] || 0);
  }
  const frac = years - Math.floor(years);
  if (frac > 0) {
    totalMaintenance += (state.maintenanceCosts[Math.min(Math.floor(years) + 1, 7)] || 0) * frac;
  }

  const residualValue = state.vehiclePrice * state.residualPct;
  const totalCashOut  = downPayment + totalPmts + totalMaintenance;
  const endingAssets  = residualValue + investmentValueNet;
  const netPosition   = endingAssets - totalCashOut;
  const afterTaxReturn = r * (1 - state.gainsTaxRate);

  return {
    totalAmountDue, outTheDoor: otd.outTheDoor, otdBreakdown: otd,
    downPayment, downPaymentPct: totalAmountDue > 0 ? downPayment / totalAmountDue : 0,
    amountFinanced, apr, isSpecialApr: aprInfo.isSpecial,
    monthlyPayment: monthly, totalPayments: totalPmts, totalInterest,
    cashInvested, investmentGain, investmentTax, investmentValueNet,
    totalMaintenance, residualValue, years, term,
    totalCashOut, endingAssets, netPosition, afterTaxReturn,
    hasPrice: state.vehiclePrice > 0
  };
}


// ============================================
// SLIDER SYNC
// ============================================
function syncSliderFromDollar(dollarValue) {
  const otd     = calculate();
  const max     = Math.max(0, otd.outTheDoor);
  const clamped = Math.min(Math.max(0, dollarValue), max);
  const slider  = document.getElementById('dpSlider');
  const dollarEl = document.getElementById('downPaymentAmt');
  if (slider) { slider.max = Math.round(max); slider.value = Math.round(clamped); }
  if (dollarEl && document.activeElement !== dollarEl) {
    dollarEl.value = clamped > 0 ? Math.round(clamped) : '';
  }
  state.downPayment = clamped;
  updateSliderBadge(clamped, max);
}

function syncSliderFromSlider(sliderValue) {
  const val     = parseFloat(sliderValue) || 0;
  const dollarEl = document.getElementById('downPaymentAmt');
  state.downPayment = val;
  if (dollarEl) dollarEl.value = val > 0 ? Math.round(val) : '';
  const otd = calculate();
  updateSliderBadge(val, Math.max(1, otd.outTheDoor));
}

function updateSliderBadge(value, max) {
  const badge = document.getElementById('dpSliderPct');
  if (!badge || max <= 0) return;
  badge.textContent = Math.round((value / max) * 100) + '%';
}

function updateSliderMax() {
  const otd    = calculate();
  const max    = Math.max(0, otd.outTheDoor);
  const slider = document.getElementById('dpSlider');
  const maxEl  = document.getElementById('dpSliderMax');
  const pill   = document.getElementById('dpOtdPill');
  const otdEl  = document.getElementById('dpOtdPrice');

  if (slider) {
    slider.max = Math.round(max);
    const clamped = Math.min(parseFloat(slider.value) || 0, max);
    slider.value = Math.round(clamped);
    state.downPayment = clamped;
  }
  if (maxEl) maxEl.textContent = formatCurrency(max);
  if (otdEl) otdEl.textContent = formatCurrency(max);
  if (pill)  pill.style.display = max > 0 ? 'flex' : 'none';

  const dollarEl = document.getElementById('downPaymentAmt');
  if (dollarEl && parseFloat(dollarEl.value) > max) dollarEl.value = Math.round(max);

  updateSliderBadge(state.downPayment, max);
}


// ============================================
// MAINTENANCE ROWS
// ============================================
function renderMaintenanceRows() {
  const container = document.getElementById('maintenanceGrid');
  if (!container) return;
  const years = Math.min(7, Math.ceil(state.selectedTerm / 12));
  const descs = {
    1:'Under warranty — oil, filters', 2:'Under warranty — tires, rotation',
    3:'Tires, brakes starting',         4:'Brakes, battery, 4yr service',
    5:'Out of warranty — repairs start', 6:'Suspension, sensors, misc',
    7:'Higher repair risk'
  };
  let html = '';
  for (let y = 1; y <= years; y++) {
    const val = state.maintenanceCosts[y] || 0;
    html += `<div class="dp-maintenance-row">
      <span class="dp-maintenance-label">Year ${y}</span>
      <span class="dp-maintenance-desc">${descs[y]||''}</span>
      <div class="dp-maintenance-input-wrap otd-input-prefix">
        <input type="text" class="otd-input dp-maint-input" data-year="${y}" inputmode="decimal" value="${val}">
      </div>
    </div>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.dp-maint-input').forEach(input => {
    input.addEventListener('input', e => {
      state.maintenanceCosts[parseInt(e.target.dataset.year)] = parseNumber(e.target.value);
      dpUpdateResults();
    });
  });
}


// ============================================
// RESULTS UPDATE
// ============================================
function dpUpdateResults() {
  const r = dpCalculate();

  const emptyEl   = document.getElementById('dpResultsEmpty');
  const contentEl = document.getElementById('dpResultsContent');
  const stripEl   = document.getElementById('dpLiveStrip');

  if (!r.hasPrice) {
    if (emptyEl)   emptyEl.style.display   = 'block';
    if (contentEl) contentEl.style.display = 'none';
    if (stripEl)   stripEl.style.display   = 'none';
    return;
  }

  if (emptyEl)   emptyEl.style.display   = 'none';
  if (contentEl) contentEl.style.display = 'block';

  // Live strip (inside slider section)
  if (stripEl) {
    stripEl.style.display = 'flex';
    setEl('dpLiveMonthly',  formatCurrency(r.monthlyPayment) + '/mo');
    setEl('dpLiveFinanced', formatCurrency(r.amountFinanced));
    setEl('dpLiveInvested', formatCurrency(r.cashInvested));
  }

  // OTD display
  setEl('dpOtdPrice', formatCurrency(r.outTheDoor));

  // Waterfall results
  updateWaterfall(r);

  // Verdict
  updateVerdict(r);

  // Detail breakdown
  updateDetailBreakdown(r);
}

function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}


// ============================================
// RESULTS — single-column clear narrative
// ============================================
function updateWaterfall(r) {
  const el = document.getElementById('dpWaterfall');
  if (!el) return;

  const fmt     = formatCurrency;
  const pct     = Math.round(r.downPaymentPct * 100);
  const termYrs = r.years === Math.floor(r.years)
    ? r.years + ' yr' + (r.years !== 1 ? 's' : '')
    : r.years.toFixed(1) + ' yrs';

  // Core comparison: does investing the cash earn MORE than the loan costs?
  // investmentGainNet = profit from investing (after tax), NOT the full ending value
  // loanInterest = cost of carrying the loan
  const investmentGainNet = r.investmentValueNet - r.cashInvested;
  const loanInterest      = r.totalInterest;
  const investNetBeat     = investmentGainNet - loanInterest; // + = financing wins, - = cash down wins

  const red   = v => `<span class="wf-red">${v}</span>`;
  const green = v => `<span class="wf-green">${v}</span>`;
  const muted = v => `<span class="wf-muted">${v}</span>`;

  let html = '';

  // ── Header ────────────────────────────────────────────────
  html += `<div class="wf-header">
    <div class="wf-header-main">
      ${pct === 0
        ? `Finance <strong>${fmt(r.totalAmountDue)}</strong> — keep <strong>${fmt(r.cashInvested)}</strong> in investments`
        : pct >= 100
        ? `Pay <strong>${fmt(r.totalAmountDue)}</strong> cash in full — no loan`
        : `Put down <strong>${fmt(r.downPayment)}</strong> (${pct}%) — finance <strong>${fmt(r.amountFinanced)}</strong>`
      }
    </div>
    <div class="wf-header-sub">@ ${r.apr.toFixed(2)}% APR · ${r.term} months</div>
  </div>`;

  // ── What you spend ────────────────────────────────────────
  html += `<div class="wf-section">
    <div class="wf-section-title">What you'll spend</div>`;

  if (r.downPayment > 0) {
    html += wfRow('Cash down today', red(`−${fmt(r.downPayment)}`));
  }
  if (r.amountFinanced > 0) {
    html += wfRow(
      `${r.term} monthly payments of ${fmt(r.monthlyPayment)}`,
      red(`−${fmt(r.totalPayments)}`)
    );
    html += wfRow(
      `↳ of which, loan interest`,
      red(`−${fmt(r.totalInterest)}`),
      false, 'wf-row-sub'
    );
  }
  html += wfRow(`Car maintenance over ${termYrs}`, red(`−${fmt(r.totalMaintenance)}`));
  html += `<div class="wf-subtotal-row">
    <span>Total spent</span>
    <span class="wf-red">−${fmt(r.totalCashOut)}</span>
  </div></div>`;

  // ── What comes back ───────────────────────────────────────
  html += `<div class="wf-section">
    <div class="wf-section-title">What comes back to you</div>`;

  html += wfRow('Car resale value at end of term', green(`+${fmt(r.residualValue)}`));

  if (r.cashInvested > 0) {
    const grossFV = r.investmentValueNet + r.investmentTax;
    html += wfRow(
      `Investments grow at ${(state.investmentReturn*100).toFixed(1)}%/yr over ${termYrs}`,
      green(`+${fmt(grossFV)}`)
    );
    if (r.investmentTax > 0) {
      html += wfRow(
        `↳ minus capital gains tax (${(state.gainsTaxRate*100).toFixed(0)}%)`,
        red(`−${fmt(r.investmentTax)}`), false, 'wf-row-sub'
      );
      html += wfRow(
        `↳ investment value after tax`,
        green(`+${fmt(r.investmentValueNet)}`), false, 'wf-row-sub'
      );
    }
  } else {
    html += wfRow('Investments', muted('—'), false, 'wf-row-muted');
  }

  html += `<div class="wf-subtotal-row">
    <span>Total coming back</span>
    <span class="wf-green">+${fmt(r.endingAssets)}</span>
  </div></div>`;

  // ── Net cost ──────────────────────────────────────────────
  const netAbs = Math.abs(r.netPosition);
  const netPos = r.netPosition >= 0;
  html += `<div class="wf-net ${netPos ? 'wf-net-positive' : 'wf-net-negative'}">
    <div class="wf-net-label">Net cost of owning this car</div>
    <div class="wf-net-number ${netPos ? 'wf-green' : 'wf-red'}">${netPos ? '+' : '−'}${fmt(netAbs)}</div>
    <div class="wf-net-sub">
      ${netPos
        ? `After resale and investment returns, you net <strong>+${fmt(netAbs)}</strong> — your investments more than offset your costs`
        : `After all returns, this car costs you <strong>${fmt(netAbs)}</strong> net over ${termYrs} — normal for vehicle ownership`}
    </div>
  </div>`;

  // ── The key question: finance or pay more down? ───────────
  if (r.cashInvested > 0 && r.amountFinanced > 0) {
    html += `<div class="wf-insight">
      <div class="wf-insight-title">Is it worth financing instead of paying more cash down?</div>
      <div class="wf-insight-explain">
        By not putting that ${fmt(r.cashInvested)} down, you're paying loan interest — but keeping the cash invested.
        Does the investment profit outweigh what the loan costs you?
      </div>
      <div class="wf-insight-rows">
        <div class="wf-insight-row">
          <span>Loan interest over ${termYrs}</span>
          <span>${red('−' + fmt(loanInterest))}</span>
        </div>
        <div class="wf-insight-row">
          <span>Investment profit over ${termYrs} (after tax)</span>
          <span>${green('+' + fmt(investmentGainNet))}</span>
        </div>
        <div class="wf-insight-row wf-insight-total">
          <span>${investNetBeat >= 0 ? 'Financing ahead by' : 'Paying more down would save'}</span>
          <span class="${investNetBeat >= 0 ? 'wf-green' : 'wf-red'}">${investNetBeat >= 0 ? '+' : ''}${fmt(Math.abs(investNetBeat))}</span>
        </div>
      </div>
      <div class="wf-insight-note">
        ${investNetBeat >= 0
          ? `Yes — your investments earn ${fmt(Math.abs(investNetBeat))} more than the loan costs. 
             Keeping cash in the market and financing the car is the better financial move over ${termYrs}.`
          : `No — the loan costs you ${fmt(Math.abs(investNetBeat))} more than your investments would earn. 
             Putting more cash down upfront would leave you better off over ${termYrs}.`
        }
      </div>
    </div>`;
  }

  el.innerHTML = html;
}

function wfRow(label, valueHtml, hasSub, extraClass) {
  return `<div class="wf-row ${extraClass||''}">
    <span class="wf-row-label">${label}</span>
    <span class="wf-row-value">${valueHtml}</span>
  </div>`;
}


// ============================================
// VERDICT BADGE
// ============================================
function updateVerdict(r) {
  const el = document.getElementById('dpVerdict');
  if (!el) return;

  if (r.cashInvested <= 0 || r.amountFinanced <= 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';

  const investmentGainNet = r.investmentValueNet - r.cashInvested;
  const investNetBeat     = investmentGainNet - r.totalInterest;
  const investWins        = investNetBeat >= 0;

  el.className  = 'dp-verdict ' + (investWins ? 'dp-verdict-invest' : 'dp-verdict-paydown');
  el.innerHTML  = investWins
    ? `<strong>📈 Financing makes sense here</strong> — your investment profit outpaces the loan interest`
    : `<strong>💵 More cash down would save you money</strong> — the loan interest exceeds what you'd earn investing`;
}


// ============================================
// DETAIL BREAKDOWN (collapsible)
// ============================================
function updateDetailBreakdown(r) {
  const el = document.getElementById('dpDetailBreakdown');
  if (!el) return;
  const fmt = formatCurrency;
  el.innerHTML = `
    <table class="dp-detail-table">
      <tr class="dp-detail-section"><td colspan="2">Transaction</td></tr>
      <tr><td>Vehicle price</td><td>${fmt(state.vehiclePrice)}</td></tr>
      <tr><td>Sales tax (${formatPercent(r.otdBreakdown.taxRate)})</td><td>${fmt(r.otdBreakdown.salesTax)}</td></tr>
      <tr><td>Doc fee</td><td>${fmt(CONFIG.fees.docPrep.amount)}</td></tr>
      <tr><td>ERT fee</td><td>${fmt(CONFIG.fees.ert.amount)}</td></tr>
      <tr><td>Title</td><td>${fmt(CONFIG.fees.title.amount)}</td></tr>
      <tr><td>Registration</td><td>${fmt(CONFIG.fees.registration.amount)}</td></tr>
      ${state.isCookCounty ? `<tr><td>Cook County fee</td><td>${fmt(CONFIG.fees.cookCounty.amount)}</td></tr>` : ''}
      ${r.otdBreakdown.tradeEquity > 0 ? `<tr><td>Trade-in equity</td><td class="green">−${fmt(r.otdBreakdown.tradeEquity)}</td></tr>` : ''}
      ${r.otdBreakdown.tradeEquity < 0 ? `<tr><td>Negative equity rolled in</td><td class="red">+${fmt(Math.abs(r.otdBreakdown.tradeEquity))}</td></tr>` : ''}

      <tr class="dp-detail-section"><td colspan="2">Financing</td></tr>
      <tr><td>Down payment</td><td>−${fmt(r.downPayment)}</td></tr>
      <tr><td>Amount financed</td><td>${fmt(r.amountFinanced)}</td></tr>
      <tr><td>Monthly payment</td><td>${fmt(r.monthlyPayment)}/mo</td></tr>
      <tr><td>Total of payments</td><td>${fmt(r.totalPayments)}</td></tr>
      <tr><td>Total interest paid</td><td class="red">${fmt(r.totalInterest)}</td></tr>

      <tr class="dp-detail-section"><td colspan="2">Investment</td></tr>
      <tr><td>Cash invested</td><td>${fmt(r.cashInvested)}</td></tr>
      <tr><td>Growth (${(state.investmentReturn*100).toFixed(1)}%/yr, ${r.years} yrs)</td><td class="green">+${fmt(r.investmentGain)}</td></tr>
      <tr><td>Capital gains tax (${(state.gainsTaxRate*100).toFixed(0)}%)</td><td class="red">−${fmt(r.investmentTax)}</td></tr>
      <tr><td>Net investment value</td><td>${fmt(r.investmentValueNet)}</td></tr>

      <tr class="dp-detail-section"><td colspan="2">Ownership</td></tr>
      <tr><td>Total maintenance</td><td class="red">−${fmt(r.totalMaintenance)}</td></tr>
      <tr><td>Estimated resale value</td><td class="green">+${fmt(r.residualValue)}</td></tr>

      <tr class="dp-detail-section"><td colspan="2">Summary</td></tr>
      <tr><td>Total cash out</td><td class="red">−${fmt(r.totalCashOut)}</td></tr>
      <tr><td>Ending assets</td><td class="green">+${fmt(r.endingAssets)}</td></tr>
      <tr class="dp-detail-total">
        <td>Net financial position</td>
        <td class="${r.netPosition >= 0 ? 'green' : 'red'}">${r.netPosition >= 0 ? '+' : '−'}${fmt(Math.abs(r.netPosition))}</td>
      </tr>
    </table>
    <p style="font-size:0.78rem;color:var(--vkc-text-light);margin-top:0.75rem;font-style:italic;">
      Net = ending assets (resale + investment) minus total cash out (down + payments + maintenance).
    </p>`;
}


// ============================================
// TERM SELECTION
// ============================================
function selectDpTerm(term) {
  state.selectedTerm = term;
  document.querySelectorAll('.dp-term-tab').forEach(tab => {
    tab.classList.toggle('selected', parseInt(tab.dataset.term) === term);
  });

  const residualInput = document.getElementById('dpResidualPct');
  if (residualInput && residualInput.dataset.userEdited !== 'true') {
    residualInput.value = (CONFIG.downPaymentCalc.residualByTerm[term] * 100).toFixed(0);
    state.residualPct   = CONFIG.downPaymentCalc.residualByTerm[term];
  }

  const aprInput = document.getElementById('dpAprInput');
  if (aprInput && aprInput.dataset.userEdited !== 'true') {
    const info = getAprForTerm(term);
    aprInput.value = (info.apr !== undefined ? info.apr : info.rate).toFixed(2);
  }

  renderMaintenanceRows();
  updateSliderMax();
  dpUpdateResults();
}


// ============================================
// EVENT WIRING
// ============================================
function dpInitEventListeners() {

  // Vehicle price — must set state here (calculator.js init is guarded off)
  const vp = document.getElementById('vehiclePrice');
  if (vp) vp.addEventListener('input', e => {
    state.vehiclePrice = parseNumber(e.target.value);
    updateSliderMax();
    dpUpdateResults();
  });

  // ZIP code
  const zip = document.getElementById('zipCode');
  if (zip) zip.addEventListener('input', e => {
    state.zipCode = e.target.value.replace(/\D/g, '').slice(0, 5);
    e.target.value = state.zipCode;
    updateTaxRate();
    updateTradeEquity();
    updateSliderMax();
    dpUpdateResults();
  });

  // Trade-in values
  const tv = document.getElementById('tradeValue');
  const to = document.getElementById('tradeOwed');
  if (tv) tv.addEventListener('input', e => {
    state.tradeValue = parseNumber(e.target.value);
    updateTradeEquity();
    updateSliderMax();
    dpUpdateResults();
  });
  if (to) to.addEventListener('input', e => {
    state.tradeOwed = parseNumber(e.target.value);
    updateTradeEquity();
    updateSliderMax();
    dpUpdateResults();
  });

  // Trade-in toggle
  const addTradeBtn    = document.getElementById('addTradeInBtn');
  const removeTradeBtn = document.getElementById('removeTradeInBtn');
  if (addTradeBtn) addTradeBtn.addEventListener('click', () => {
    toggleTradeIn(true);
    updateSliderMax();
    dpUpdateResults();
  });
  if (removeTradeBtn) removeTradeBtn.addEventListener('click', () => {
    toggleTradeIn(false);   // clears state, collapses section, hides equity display
    updateSliderMax();
    dpUpdateResults();
  });

  // Term tabs
  document.querySelectorAll('.dp-term-tab').forEach(tab => {
    tab.addEventListener('click', () => selectDpTerm(parseInt(tab.dataset.term)));
  });

  // Credit tier radios
  document.querySelectorAll('.otd-radio-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.otd-radio-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
      state.creditTier = option.dataset.tier;
      const aprInput = document.getElementById('dpAprInput');
      if (aprInput && aprInput.dataset.userEdited !== 'true') {
        const info = getAprForTerm(state.selectedTerm);
        aprInput.value = (info.apr !== undefined ? info.apr : info.rate).toFixed(2);
      }
      dpUpdateResults();
    });
  });

  // APR override
  const aprInput = document.getElementById('dpAprInput');
  if (aprInput) {
    aprInput.addEventListener('input', e => {
      e.target.dataset.userEdited = 'true';
      const rate = parseNumber(e.target.value);
      state.specialAprs = state.specialAprs.filter(a => a.term !== state.selectedTerm);
      if (rate > 0) state.specialAprs.push({ term: state.selectedTerm, rate });
      dpUpdateResults();
    });
    aprInput.addEventListener('blur', e => {
      if (!e.target.value) {
        e.target.dataset.userEdited = 'false';
        state.specialAprs = state.specialAprs.filter(a => a.term !== state.selectedTerm);
        const info = getAprForTerm(state.selectedTerm);
        e.target.value = (info.apr !== undefined ? info.apr : info.rate).toFixed(2);
        dpUpdateResults();
      }
    });
  }

  // Down payment dollar input
  const dpAmt = document.getElementById('downPaymentAmt');
  if (dpAmt) dpAmt.addEventListener('input', e => {
    syncSliderFromDollar(parseNumber(e.target.value));
    dpUpdateResults();
  });

  // Down payment slider
  const slider = document.getElementById('dpSlider');
  if (slider) slider.addEventListener('input', e => {
    syncSliderFromSlider(e.target.value);
    dpUpdateResults();
  });

  // Investment return
  const ir = document.getElementById('dpInvestmentReturn');
  if (ir) ir.addEventListener('input', e => {
    state.investmentReturn = parseNumber(e.target.value) / 100;
    dpUpdateResults();
  });

  // Gains tax rate
  const gtr = document.getElementById('dpGainsTaxRate');
  if (gtr) gtr.addEventListener('input', e => {
    state.gainsTaxRate = parseNumber(e.target.value) / 100;
    dpUpdateResults();
  });

  // Residual %
  const res = document.getElementById('dpResidualPct');
  if (res) {
    res.addEventListener('input', e => {
      e.target.dataset.userEdited = 'true';
      state.residualPct = parseNumber(e.target.value) / 100;
      dpUpdateResults();
    });
    res.addEventListener('blur', e => {
      if (!e.target.value) {
        e.target.dataset.userEdited = 'false';
        e.target.value = (CONFIG.downPaymentCalc.residualByTerm[state.selectedTerm] * 100).toFixed(0);
        state.residualPct = CONFIG.downPaymentCalc.residualByTerm[state.selectedTerm];
        dpUpdateResults();
      }
    });
  }

  // Popovers — position absolute, don't push layout
  document.querySelectorAll('.otd-tooltip-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const popId = btn.dataset.tooltip;
      // Close all others first
      document.querySelectorAll('.dp-popover').forEach(p => {
        if (p.id !== popId) p.classList.remove('dp-popover-open');
      });
      const pop = document.getElementById(popId);
      if (pop) pop.classList.toggle('dp-popover-open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dp-popover').forEach(p => p.classList.remove('dp-popover-open'));
  });

  // Collapsible toggles
  document.querySelectorAll('.otd-details-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('expanded');
      const content = toggle.nextElementSibling;
      if (content && content.classList.contains('otd-details-content')) {
        content.classList.toggle('expanded');
      }
    });
  });
}


// ============================================
// INITIALIZATION
// ============================================
function dpInit() {
  // Initialize ZIP tax rate from pre-filled default
  const zipEl = document.getElementById('zipCode');
  if (zipEl && zipEl.value) {
    state.zipCode = zipEl.value;
    updateTaxRate();
  }

  // Pre-fill APR
  const aprInfo = getAprForTerm(state.selectedTerm);
  const aprEl   = document.getElementById('dpAprInput');
  if (aprEl) aprEl.value = (aprInfo.apr !== undefined ? aprInfo.apr : aprInfo.rate).toFixed(2);

  // Pre-fill residual
  const resEl = document.getElementById('dpResidualPct');
  if (resEl) resEl.value = (CONFIG.downPaymentCalc.residualByTerm[state.selectedTerm] * 100).toFixed(0);

  // Pre-fill investment fields
  const irEl  = document.getElementById('dpInvestmentReturn');
  const gtrEl = document.getElementById('dpGainsTaxRate');
  if (irEl)  irEl.value  = (CONFIG.downPaymentCalc.defaultInvestmentReturn * 100).toFixed(1);
  if (gtrEl) gtrEl.value = (CONFIG.downPaymentCalc.defaultGainsTaxRate * 100).toFixed(0);

  state.downPayment = 0;

  renderMaintenanceRows();
  dpInitEventListeners();

  // Mark default term tab selected
  document.querySelectorAll('.dp-term-tab').forEach(tab => {
    tab.classList.toggle('selected', parseInt(tab.dataset.term) === 60);
  });

  dpUpdateResults();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', dpInit);
} else {
  dpInit();
}


// ============================================
// IFRAME HEIGHT
// ============================================
function dpInitHeightObserver() {
  if (window.self === window.top) return;
  function postHeight() {
    window.parent.postMessage({ type: 'vkc-calculator-height', height: document.documentElement.scrollHeight }, '*');
  }
  setTimeout(postHeight, 100);
  new ResizeObserver(postHeight).observe(document.body);
  window.addEventListener('resize', postHeight);
  document.addEventListener('click', () => setTimeout(postHeight, 50));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', dpInitHeightObserver);
} else {
  dpInitHeightObserver();
}
