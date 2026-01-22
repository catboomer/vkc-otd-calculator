/**
 * V Knows Cars - Out-the-Door Calculator
 * 
 * Main calculator logic file.
 * Requires config.js to be loaded first.
 * 
 * @version 1.0.0
 * @author V Knows Cars
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
  vehiclePrice: 0,
  zipCode: '',
  taxRate: CONFIG.defaultTaxRate,
  taxLocation: '',
  isCookCounty: false,
  tradeInActive: false,  // Whether trade-in section is expanded
  tradeValue: 0,
  tradeOwed: 0,
  addons: [],           // Array of { id, name, price, taxable }
  discounts: [],        // Array of { id, name, amount }
  specialAprs: [],      // Array of { term, rate } - e.g., { term: 36, rate: 1.9 }
  creditTier: 'excellent',
  downPayment: 0,
  selectedTerm: 60
};


// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse a string or number to a valid number
 * Removes non-numeric characters except decimal point
 */
function parseNumber(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Format a number as currency (no decimals)
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a decimal rate as percentage string
 */
function formatPercent(rate) {
  return (rate * 100).toFixed(2) + '%';
}


// ============================================
// CALCULATION ENGINE
// ============================================

/**
 * Get the APR for a specific term
 * Returns { rate, isSpecial } - isSpecial indicates if it's a promotional rate
 */
function getAprForTerm(term) {
  // Check for special promotional rate for this exact term
  const specialRate = state.specialAprs.find(s => s.term === term);
  if (specialRate) {
    return { rate: specialRate.rate, isSpecial: true };
  }
  
  // Fall back to credit tier rates
  return { rate: CONFIG.creditTiers[state.creditTier].rates[term], isSpecial: false };
}

/**
 * Calculate monthly payment using standard amortization formula
 */
function calculateMonthlyPayment(principal, annualRate, termMonths) {
  if (principal <= 0) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return isFinite(payment) ? payment : 0;
}

/**
 * Main calculation function
 * Returns an object with all calculated values
 */
function calculate() {
  const results = {};
  
  // 1. Calculate selling price (vehicle price minus discounts)
  const totalDiscounts = state.discounts.reduce((sum, d) => sum + d.amount, 0);
  results.sellingPrice = Math.max(0, state.vehiclePrice - totalDiscounts);
  results.totalDiscounts = totalDiscounts;
  
  // 2. Calculate add-ons (separate taxable and non-taxable)
  const taxableAddons = state.addons
    .filter(a => a.taxable)
    .reduce((sum, a) => sum + a.price, 0);
  const nonTaxableAddons = state.addons
    .filter(a => !a.taxable)
    .reduce((sum, a) => sum + a.price, 0);
  
  results.taxableAddons = taxableAddons;
  results.nonTaxableAddons = nonTaxableAddons;
  results.totalAddons = taxableAddons + nonTaxableAddons;
  
  // 3. Calculate vehicle subtotal
  results.vehicleSubtotal = results.sellingPrice + results.totalAddons;
  
  // 4. Calculate fees
  results.taxableFees = CONFIG.fees.docPrep.amount + CONFIG.fees.ert.amount;
  results.nonTaxableFees = CONFIG.fees.title.amount + CONFIG.fees.registration.amount;
  
  // Add Cook County fee if applicable
  if (state.isCookCounty) {
    results.nonTaxableFees += CONFIG.fees.cookCounty.amount;
  }
  
  // 5. Calculate taxable amount (before trade-in credit)
  // In Illinois: Vehicle + Taxable Add-ons + Taxable Fees
  results.taxableBeforeTrade = results.sellingPrice + taxableAddons + results.taxableFees;
  
  // 6. Apply trade-in credit (Illinois allows trade-in to reduce taxable amount)
  results.tradeValue = state.tradeValue;
  results.tradeOwed = state.tradeOwed;
  results.tradeEquity = state.tradeValue - state.tradeOwed;
  
  // Taxable amount is reduced by trade-in value
  results.taxableAmount = Math.max(0, results.taxableBeforeTrade - state.tradeValue);
  
  // 7. Calculate sales tax
  results.taxRate = state.taxRate;
  results.salesTax = results.taxableAmount * state.taxRate;
  
  // 8. Calculate trade-in tax savings (for display)
  results.tradeTaxSavings = Math.min(state.tradeValue, results.taxableBeforeTrade) * state.taxRate;
  
  // 9. Calculate total before trade equity
  results.totalBeforeTrade = 
    results.vehicleSubtotal + 
    results.taxableFees + 
    results.salesTax + 
    results.nonTaxableFees;
  
  // 10. Calculate out-the-door price
  results.outTheDoor = results.totalBeforeTrade - results.tradeEquity;
  
  // 11. Calculate amount to finance
  results.amountToFinance = Math.max(0, results.outTheDoor - state.downPayment);
  
  // 12. Calculate monthly payments for all terms
  results.payments = {};
  const terms = [24, 36, 48, 60, 72, 84];
  
  terms.forEach(term => {
    const aprInfo = getAprForTerm(term);
    const payment = calculateMonthlyPayment(results.amountToFinance, aprInfo.rate, term);
    const totalPayments = payment * term;
    const totalInterest = totalPayments - results.amountToFinance;
    
    results.payments[term] = {
      apr: aprInfo.rate,
      isSpecial: aprInfo.isSpecial,
      payment: payment,
      totalPayments: totalPayments,
      totalInterest: totalInterest
    };
  });
  
  return results;
}


// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update all results displays
 */
function updateResults() {
  const hasVehiclePrice = state.vehiclePrice > 0;
  const results = calculate();
  
  // Show/hide results based on whether we have a vehicle price
  const resultsSection = document.getElementById('resultsSection');
  const emptyState = document.getElementById('resultsEmptyState');
  const resultsContent = document.getElementById('resultsContent');
  
  if (!hasVehiclePrice) {
    // Show empty state
    if (emptyState) emptyState.style.display = 'block';
    if (resultsContent) resultsContent.style.display = 'none';
    return;
  }
  
  // Show results content
  if (emptyState) emptyState.style.display = 'none';
  if (resultsContent) resultsContent.style.display = 'block';
  
  // Update main OTD price
  document.getElementById('otdPrice').textContent = formatCurrency(results.outTheDoor);
  
  // Update amount to finance
  document.getElementById('amountToFinance').textContent = formatCurrency(results.amountToFinance);
  
  // Update detailed breakdown
  updateBreakdown(results);
  
  // Update payment display
  updatePaymentDisplay(results);
  
  // Update comparison table
  updateCompareTable(results);
}

/**
 * Update the transaction breakdown section
 */
function updateBreakdown(results) {
  const breakdown = document.getElementById('transactionBreakdown');
  let html = '';
  
  // Vehicle price
  html += `<div class="otd-breakdown-row">
    <span>Vehicle price</span>
    <span>${formatCurrency(state.vehiclePrice)}</span>
  </div>`;
  
  // Discounts (if any)
  if (state.discounts.length > 0) {
    state.discounts.forEach(d => {
      html += `<div class="otd-breakdown-row indent">
        <span>− ${d.name}</span>
        <span class="negative">−${formatCurrency(d.amount)}</span>
      </div>`;
    });
    html += `<div class="otd-breakdown-row subtotal">
      <span>Selling price</span>
      <span>${formatCurrency(results.sellingPrice)}</span>
    </div>`;
  }
  
  // Add-ons (if any)
  if (state.addons.length > 0) {
    state.addons.forEach(a => {
      const taxNote = a.taxable ? '' : ' ★';
      html += `<div class="otd-breakdown-row indent">
        <span>+ ${a.name}${taxNote}</span>
        <span>${formatCurrency(a.price)}</span>
      </div>`;
    });
  }
  
  // Subtotal
  html += `<div class="otd-breakdown-row subtotal">
    <span>Subtotal</span>
    <span>${formatCurrency(results.vehicleSubtotal)}</span>
  </div>`;
  
  // Taxable fees
  html += `<div class="otd-breakdown-row indent">
    <span>+ Doc preparation</span>
    <span>${formatCurrency(CONFIG.fees.docPrep.amount)}</span>
  </div>`;
  html += `<div class="otd-breakdown-row indent">
    <span>+ ERT fee</span>
    <span>${formatCurrency(CONFIG.fees.ert.amount)}</span>
  </div>`;
  
  // Trade-in tax credit (if applicable)
  if (state.tradeValue > 0) {
    html += `<div class="otd-breakdown-row indent">
      <span>− Trade-in (tax credit)</span>
      <span class="negative">−${formatCurrency(state.tradeValue)}</span>
    </div>`;
  }
  
  // Taxable amount
  html += `<div class="otd-breakdown-row subtotal">
    <span>Taxable amount</span>
    <span>${formatCurrency(results.taxableAmount)}</span>
  </div>`;
  
  // Sales tax
  html += `<div class="otd-breakdown-row">
    <span>Sales tax (${formatPercent(results.taxRate)})</span>
    <span>${formatCurrency(results.salesTax)}</span>
  </div>`;
  
  // Non-taxable fees
  html += `<div class="otd-breakdown-row indent">
    <span>+ Title</span>
    <span>${formatCurrency(CONFIG.fees.title.amount)}</span>
  </div>`;
  html += `<div class="otd-breakdown-row indent">
    <span>+ Registration</span>
    <span>${formatCurrency(CONFIG.fees.registration.amount)}</span>
  </div>`;
  
  if (state.isCookCounty) {
    html += `<div class="otd-breakdown-row indent">
      <span>+ Cook County fee</span>
      <span>${formatCurrency(CONFIG.fees.cookCounty.amount)}</span>
    </div>`;
  }
  
  // Total before trade equity
  html += `<div class="otd-breakdown-row subtotal">
    <span>Total</span>
    <span>${formatCurrency(results.totalBeforeTrade)}</span>
  </div>`;
  
  // Trade-in equity (if applicable)
  if (results.tradeEquity !== 0) {
    const sign = results.tradeEquity > 0 ? '−' : '+';
    const cls = results.tradeEquity > 0 ? 'negative' : '';
    html += `<div class="otd-breakdown-row">
      <span>− Trade-in equity</span>
      <span class="${cls}">${sign}${formatCurrency(Math.abs(results.tradeEquity))}</span>
    </div>`;
  }
  
  // Down payment (if applicable)
  if (state.downPayment > 0) {
    html += `<div class="otd-breakdown-row">
      <span>− Down payment</span>
      <span class="negative">−${formatCurrency(state.downPayment)}</span>
    </div>`;
  }
  
  // Final OTD price
  html += `<div class="otd-breakdown-row total">
    <span>Out-the-Door Price</span>
    <span>${formatCurrency(results.outTheDoor)}</span>
  </div>`;
  
  // Legend for non-taxable items
  if (state.addons.some(a => !a.taxable)) {
    html += `<div class="otd-breakdown-legend">★ Non-taxable product</div>`;
  }
  
  breakdown.innerHTML = html;
}

/**
 * Update the monthly payment display for selected term
 */
function updatePaymentDisplay(results) {
  const term = state.selectedTerm;
  const payment = results.payments[term];
  const specialMarker = payment.isSpecial ? ' *' : '';
  
  document.getElementById('monthlyPayment').innerHTML = 
    `${formatCurrency(payment.payment)}<span>/mo</span>`;
  document.getElementById('paymentApr').textContent = 
    `@ ${payment.apr.toFixed(2)}% APR${specialMarker}`;
  document.getElementById('totalInterest').textContent = 
    formatCurrency(payment.totalInterest);
  document.getElementById('totalPayments').textContent = 
    formatCurrency(payment.totalPayments);
}

/**
 * Update the comparison table with all terms
 */
function updateCompareTable(results) {
  const tbody = document.getElementById('compareTableBody');
  const terms = [24, 36, 48, 60, 72, 84];
  let hasSpecialRates = false;
  
  let html = '';
  terms.forEach(term => {
    const p = results.payments[term];
    const isSelected = term === state.selectedTerm;
    const specialMarker = p.isSpecial ? ' *' : '';
    if (p.isSpecial) hasSpecialRates = true;
    
    html += `<tr class="${isSelected ? 'selected' : ''}" data-term="${term}">
      <td>${term} mo</td>
      <td>${p.apr.toFixed(2)}%${specialMarker}</td>
      <td>${formatCurrency(p.payment)}</td>
      <td>${formatCurrency(p.totalInterest)}</td>
    </tr>`;
  });
  
  tbody.innerHTML = html;
  
  // Show/hide special rates legend
  const legend = document.getElementById('compareTableLegend');
  if (legend) {
    legend.style.display = hasSpecialRates ? 'block' : 'none';
  }
  
  // Add click handlers to rows
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      selectTerm(parseInt(row.dataset.term));
    });
  });
}

/**
 * Update trade-in equity display
 */
function updateTradeEquity() {
  const equity = state.tradeValue - state.tradeOwed;
  const display = document.getElementById('tradeEquityDisplay');
  const equityValue = document.getElementById('tradeEquityValue');
  const taxSavings = document.getElementById('tradeTaxSavings');
  const taxSavingsValue = document.getElementById('tradeTaxSavingsValue');
  
  if (state.tradeValue > 0 || state.tradeOwed > 0) {
    display.style.display = 'flex';
    equityValue.textContent = formatCurrency(equity);
    equityValue.className = `otd-computed-value ${equity >= 0 ? 'positive' : 'negative'}`;
    
    if (state.tradeValue > 0) {
      const savings = state.tradeValue * state.taxRate;
      taxSavings.style.display = 'flex';
      taxSavingsValue.textContent = formatCurrency(savings);
    } else {
      taxSavings.style.display = 'none';
    }
  } else {
    display.style.display = 'none';
  }
}

/**
 * Update tax rate display based on ZIP code
 */
function updateTaxRate() {
  const display = document.getElementById('taxRateDisplay');
  const rateValue = document.getElementById('taxRateValue');
  const location = document.getElementById('taxRateLocation');
  
  if (state.zipCode.length === 5) {
    const taxInfo = TAX_RATES[state.zipCode];
    
    if (taxInfo) {
      state.taxRate = taxInfo.rate;
      state.taxLocation = taxInfo.city;
      state.isCookCounty = taxInfo.county === 'Cook';
      rateValue.textContent = formatPercent(taxInfo.rate);
      location.textContent = `(${taxInfo.city})`;
    } else {
      state.taxRate = CONFIG.defaultTaxRate;
      state.taxLocation = '';
      state.isCookCounty = false;
      rateValue.textContent = formatPercent(CONFIG.defaultTaxRate);
      location.textContent = '(default rate)';
    }
    display.style.display = 'flex';
  } else {
    display.style.display = 'none';
  }
  
  // Tax rate affects trade-in savings display
  updateTradeEquity();
}

/**
 * Update totals for add-ons and discounts
 */
function updateTotals() {
  // Add-ons total
  const addonsTotal = state.addons.reduce((sum, a) => sum + a.price, 0);
  const addonsDisplay = document.getElementById('addonsTotal');
  const addonsAmount = document.getElementById('addonsTotalAmount');
  addonsDisplay.style.display = state.addons.length > 0 ? 'flex' : 'none';
  addonsAmount.textContent = formatCurrency(addonsTotal);
  
  // Discounts total
  const discountsTotal = state.discounts.reduce((sum, d) => sum + d.amount, 0);
  const discountsDisplay = document.getElementById('discountsTotal');
  const discountsAmount = document.getElementById('discountsTotalAmount');
  discountsDisplay.style.display = state.discounts.length > 0 ? 'flex' : 'none';
  discountsAmount.textContent = formatCurrency(discountsTotal);
}

/**
 * Select a payment term
 */
function selectTerm(term) {
  state.selectedTerm = term;
  
  // Update tab selection
  document.querySelectorAll('.otd-term-tab').forEach(tab => {
    tab.classList.toggle('selected', parseInt(tab.dataset.term) === term);
  });
  
  updateResults();
}


// ============================================
// LIST MANAGEMENT (Add-ons, Discounts)
// ============================================

/**
 * Render the add-ons list
 */
function renderAddonsList() {
  const list = document.getElementById('addonsList');
  
  if (state.addons.length === 0) {
    list.innerHTML = '';
    return;
  }
  
  list.innerHTML = state.addons.map((addon, index) => `
    <div class="otd-item-row" data-index="${index}">
      <span class="otd-item-name">${addon.name}</span>
      <div class="otd-item-price otd-input-prefix">
        <input type="text" class="otd-input addon-price" 
               data-index="${index}" 
               inputmode="decimal" 
               value="${addon.price || ''}">
      </div>
      <button type="button" class="otd-item-remove" data-index="${index}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Add event listeners for price inputs
  list.querySelectorAll('.addon-price').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      state.addons[index].price = parseNumber(e.target.value);
      updateTotals();
      updateResults();
    });
  });
  
  // Add event listeners for remove buttons
  list.querySelectorAll('.otd-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      state.addons.splice(index, 1);
      renderAddonsList();
      updateTotals();
      updateResults();
      populateAddonSelect();
    });
  });
}

/**
 * Render the discounts list
 */
function renderDiscountsList() {
  const list = document.getElementById('discountsList');
  
  if (state.discounts.length === 0) {
    list.innerHTML = '';
    return;
  }
  
  list.innerHTML = state.discounts.map((discount, index) => `
    <div class="otd-item-row" data-index="${index}">
      <span class="otd-item-name">${discount.name}</span>
      <div class="otd-item-price otd-input-prefix">
        <input type="text" class="otd-input discount-amount" 
               data-index="${index}" 
               inputmode="decimal" 
               value="${discount.amount || ''}">
      </div>
      <button type="button" class="otd-item-remove" data-index="${index}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Add event listeners for amount inputs
  list.querySelectorAll('.discount-amount').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      state.discounts[index].amount = parseNumber(e.target.value);
      updateTotals();
      updateResults();
    });
  });
  
  // Add event listeners for remove buttons
  list.querySelectorAll('.otd-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      state.discounts.splice(index, 1);
      renderDiscountsList();
      updateTotals();
      updateResults();
      populateDiscountSelect();
    });
  });
}

/**
 * Populate the add-on select dropdown
 */
function populateAddonSelect() {
  const taxableGroup = document.getElementById('addonTaxable');
  const nonTaxableGroup = document.getElementById('addonNonTaxable');
  const usedIds = state.addons.map(a => a.id);
  
  // Populate taxable products
  taxableGroup.innerHTML = CONFIG.products.taxable
    .filter(p => !usedIds.includes(p.id))
    .map(p => `<option value="${p.id}" data-taxable="true">${p.name}</option>`)
    .join('');
  
  // Populate non-taxable products
  nonTaxableGroup.innerHTML = CONFIG.products.nonTaxable
    .filter(p => !usedIds.includes(p.id))
    .map(p => `<option value="${p.id}" data-taxable="false">${p.name}</option>`)
    .join('');
}

/**
 * Populate the discount select dropdown
 */
function populateDiscountSelect() {
  const select = document.getElementById('discountSelect');
  const usedIds = state.discounts.map(d => d.id);
  
  select.innerHTML = '<option value="">Select a discount...</option>' +
    CONFIG.discounts
      .filter(d => !usedIds.includes(d.id))
      .map(d => `<option value="${d.id}">${d.name}</option>`)
      .join('');
}

/**
 * Render the special APR list (sorted by term)
 */
function renderSpecialAprList() {
  const list = document.getElementById('specialAprList');
  
  if (state.specialAprs.length === 0) {
    list.innerHTML = '';
    return;
  }
  
  // Sort by term
  const sorted = [...state.specialAprs].sort((a, b) => a.term - b.term);
  
  list.innerHTML = sorted.map((apr, index) => `
    <div class="otd-item-row" data-term="${apr.term}">
      <span class="otd-item-name">${apr.term} months</span>
      <div class="otd-apr-rate">
        <input type="text" class="otd-input special-apr-input" 
               data-term="${apr.term}" 
               inputmode="decimal" 
               value="${apr.rate}">
      </div>
      <button type="button" class="otd-item-remove" data-term="${apr.term}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Add event listeners for rate inputs
  list.querySelectorAll('.special-apr-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const term = parseInt(e.target.dataset.term);
      const apr = state.specialAprs.find(a => a.term === term);
      if (apr) {
        apr.rate = parseNumber(e.target.value);
        updateResults();
      }
    });
  });
  
  // Add event listeners for remove buttons
  list.querySelectorAll('.otd-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const term = parseInt(e.currentTarget.dataset.term);
      state.specialAprs = state.specialAprs.filter(a => a.term !== term);
      renderSpecialAprList();
      updateResults();
      populateSpecialAprSelect();
    });
  });
}

/**
 * Populate the special APR term select dropdown
 */
function populateSpecialAprSelect() {
  const select = document.getElementById('specialAprTermSelect');
  const usedTerms = state.specialAprs.map(a => a.term);
  
  select.innerHTML = '<option value="">Select term...</option>' +
    CONFIG.loanTerms
      .filter(term => !usedTerms.includes(term))
      .map(term => `<option value="${term}">${term} months</option>`)
      .join('');
}

/**
 * Toggle trade-in section visibility
 */
function toggleTradeIn(show) {
  state.tradeInActive = show;
  
  const addBtn = document.getElementById('addTradeInBtn');
  const content = document.getElementById('tradeInContent');
  
  if (show) {
    addBtn.style.display = 'none';
    content.style.display = 'block';
  } else {
    // Clear values when hiding
    state.tradeValue = 0;
    state.tradeOwed = 0;
    document.getElementById('tradeValue').value = '';
    document.getElementById('tradeOwed').value = '';
    document.getElementById('tradeDesc').value = '';
    
    addBtn.style.display = 'flex';
    content.style.display = 'none';
    
    // Hide equity display
    document.getElementById('tradeEquityDisplay').style.display = 'none';
  }
  
  updateResults();
}


// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
  // Vehicle Price
  document.getElementById('vehiclePrice').addEventListener('input', (e) => {
    state.vehiclePrice = parseNumber(e.target.value);
    updateResults();
  });
  
  // ZIP Code
  document.getElementById('zipCode').addEventListener('input', (e) => {
    state.zipCode = e.target.value.replace(/\D/g, '').slice(0, 5);
    e.target.value = state.zipCode;
    updateTaxRate();
    updateResults();
  });
  
  // Trade-in Value
  document.getElementById('tradeValue').addEventListener('input', (e) => {
    state.tradeValue = parseNumber(e.target.value);
    updateTradeEquity();
    updateResults();
  });
  
  // Trade-in Amount Owed
  document.getElementById('tradeOwed').addEventListener('input', (e) => {
    state.tradeOwed = parseNumber(e.target.value);
    updateTradeEquity();
    updateResults();
  });
  
  // Down Payment
  document.getElementById('downPayment').addEventListener('input', (e) => {
    state.downPayment = parseNumber(e.target.value);
    updateResults();
  });
  
  // Credit Tier Radio Buttons
  document.querySelectorAll('.otd-radio-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.otd-radio-option').forEach(o => {
        o.classList.remove('selected');
      });
      option.classList.add('selected');
      option.querySelector('input').checked = true;
      state.creditTier = option.dataset.tier;
      updateResults();
    });
  });
  
  // Term Tabs
  document.querySelectorAll('.otd-term-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectTerm(parseInt(tab.dataset.term));
    });
  });
  
  // Add-on Button & Select
  const addAddonBtn = document.getElementById('addAddonBtn');
  const addonSelector = document.getElementById('addonSelector');
  const addonSelect = document.getElementById('addonSelect');
  
  addAddonBtn.addEventListener('click', () => {
    addonSelector.classList.toggle('active');
    if (addonSelector.classList.contains('active')) {
      addonSelect.focus();
    }
  });
  
  addonSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;
    
    const option = e.target.options[e.target.selectedIndex];
    const name = option.textContent;
    const taxable = option.dataset.taxable === 'true';
    
    state.addons.push({ id, name, price: 0, taxable });
    renderAddonsList();
    updateTotals();
    updateResults();
    populateAddonSelect();
    
    addonSelect.value = '';
    addonSelector.classList.remove('active');
    
    // Focus the new price input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.addon-price');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  });
  
  // Discount Button & Select
  const addDiscountBtn = document.getElementById('addDiscountBtn');
  const discountSelector = document.getElementById('discountSelector');
  const discountSelect = document.getElementById('discountSelect');
  
  addDiscountBtn.addEventListener('click', () => {
    discountSelector.classList.toggle('active');
    if (discountSelector.classList.contains('active')) {
      discountSelect.focus();
    }
  });
  
  discountSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;
    
    const option = e.target.options[e.target.selectedIndex];
    const name = option.textContent;
    
    state.discounts.push({ id, name, amount: 0 });
    renderDiscountsList();
    updateTotals();
    updateResults();
    populateDiscountSelect();
    
    discountSelect.value = '';
    discountSelector.classList.remove('active');
    
    // Focus the new amount input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.discount-amount');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  });
  
  // Special APR Button & Select
  const addSpecialAprBtn = document.getElementById('addSpecialAprBtn');
  const specialAprSelector = document.getElementById('specialAprSelector');
  const specialAprTermSelect = document.getElementById('specialAprTermSelect');
  const specialAprRateInput = document.getElementById('specialAprRateInput');
  const specialAprConfirmBtn = document.getElementById('specialAprConfirmBtn');
  
  addSpecialAprBtn.addEventListener('click', () => {
    specialAprSelector.classList.toggle('active');
    if (specialAprSelector.classList.contains('active')) {
      specialAprTermSelect.focus();
      specialAprRateInput.value = '';
    }
  });
  
  specialAprConfirmBtn.addEventListener('click', () => {
    const term = parseInt(specialAprTermSelect.value);
    const rate = parseNumber(specialAprRateInput.value);
    
    if (!term || rate <= 0) return;
    
    state.specialAprs.push({ term, rate });
    renderSpecialAprList();
    updateResults();
    populateSpecialAprSelect();
    
    specialAprTermSelect.value = '';
    specialAprRateInput.value = '';
    specialAprSelector.classList.remove('active');
  });
  
  // Trade-in Toggle
  document.getElementById('addTradeInBtn').addEventListener('click', () => {
    toggleTradeIn(true);
  });
  
  document.getElementById('removeTradeInBtn').addEventListener('click', () => {
    toggleTradeIn(false);
  });
  
  // Tooltip Buttons
  document.querySelectorAll('.otd-tooltip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tooltipId = btn.dataset.tooltip;
      const tooltip = document.getElementById(tooltipId);
      tooltip.classList.toggle('active');
    });
  });
  
  // Toggle Buttons (breakdown, compare, assumptions)
  document.querySelectorAll('.otd-details-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('expanded');
      const content = toggle.nextElementSibling;
      if (content && content.classList.contains('otd-details-content')) {
        content.classList.toggle('expanded');
      }
    });
  });
  
  // Print Button
  document.getElementById('printBtn').addEventListener('click', () => {
    // Expand all sections for printing
    document.querySelectorAll('.otd-details-content').forEach(content => {
      content.classList.add('expanded');
    });
    document.querySelectorAll('.otd-details-toggle').forEach(toggle => {
      toggle.classList.add('expanded');
    });
    
    window.print();
  });
}


// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the calculator
 */
function init() {
  // Populate dropdowns
  populateAddonSelect();
  populateDiscountSelect();
  populateSpecialAprSelect();
  
  // Set up event listeners
  initEventListeners();
  
  // Initial calculation
  updateResults();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// ============================================
// IFRAME HEIGHT COMMUNICATION
// ============================================

/**
 * Send current document height to parent window
 * Used for dynamic iframe resizing in Webflow
 */
function postHeightToParent() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({
    type: 'vkc-calculator-height',
    height: height
  }, '*');
}

/**
 * Initialize height observer for iframe resizing
 */
function initHeightObserver() {
  // Only run if we're in an iframe
  if (window.self === window.top) return;
  
  // Send initial height after a short delay (allow render)
  setTimeout(postHeightToParent, 100);
  
  // Observe DOM changes that might affect height
  const resizeObserver = new ResizeObserver(() => {
    postHeightToParent();
  });
  
  resizeObserver.observe(document.body);
  
  // Also send height on window resize
  window.addEventListener('resize', postHeightToParent);
  
  // Send height when collapsible sections toggle
  document.addEventListener('click', (e) => {
    if (e.target.closest('.otd-details-toggle, .otd-add-item-btn, .otd-item-remove, .otd-remove-section-btn, #addTradeInBtn')) {
      // Small delay to let animation/DOM update complete
      setTimeout(postHeightToParent, 50);
    }
  });
}

// Initialize height observer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeightObserver);
} else {
  initHeightObserver();
}
