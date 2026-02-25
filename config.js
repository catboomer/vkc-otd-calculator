/**
 * V Knows Cars - Calculator Configuration
 * 
 * Contains all configurable values for the Out-the-Door calculator
 * including fees, tax rates, products, discounts, and loan terms.
 */

// ============================================
// ILLINOIS TAX LOOKUP CLASS
// ============================================

class IllinoisSalesTaxLookup {
  constructor() {
    this.data = null;
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    
    try {
      const response = await fetch('il_sales_tax_lookup.json');
      this.data = await response.json();
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load Illinois sales tax data:', error);
      // Don't throw - fall back to default rate
      this.data = {
        countyRates: { DEFAULT: 0.0625 },
        chicagoZips: [],
        zipToCounty: {}
      };
      this.loaded = true;
    }
  }

  getTaxRate(zipCode) {
    if (!this.loaded || !this.data) {
      return {
        rate: 0.0625,
        location: 'Illinois',
        county: null,
        isEstimate: true
      };
    }

    const normalizedZip = String(zipCode).trim().slice(0, 5);

    // Check if it's a Chicago ZIP code (special 9.50% rate)
    if (this.data.chicagoZips && this.data.chicagoZips.includes(normalizedZip)) {
      return {
        rate: this.data.countyRates.COOK_CHICAGO || 0.0950,
        location: 'Chicago',
        county: 'COOK',
        isEstimate: false
      };
    }

    // Try direct ZIP lookup first
    const county = this.data.zipToCounty ? this.data.zipToCounty[normalizedZip] : null;
    
    if (county && this.data.countyRates[county]) {
      return {
        rate: this.data.countyRates[county],
        location: this._formatCountyName(county),
        county: county,
        isEstimate: false
      };
    }

    // Try ZIP prefix matching (60xxx pattern)
    const zipPrefix = normalizedZip.substring(0, 3);
    const county_by_prefix = this._getCountyByPrefix(zipPrefix);
    
    if (county_by_prefix && this.data.countyRates[county_by_prefix]) {
      return {
        rate: this.data.countyRates[county_by_prefix],
        location: this._formatCountyName(county_by_prefix),
        county: county_by_prefix,
        isEstimate: false
      };
    }

    // ZIP code not found - return state rate as fallback
    return {
      rate: this.data.countyRates.DEFAULT || 0.0625,
      location: 'Illinois',
      county: null,
      isEstimate: true
    };
  }

  _getCountyByPrefix(prefix) {
    // Based on Illinois ZIP code geographic patterns
    // 600xx, 601xx, 602xx, 603xx, 604xx, 605xx, 606xx, 607xx, 608xx = Chicago Metro
    // 610xx, 611xx, 612xx, 613xx, 614xx, 615xx, 616xx, 617xx, 618xx = Rockford/North
    // 620xx, 621xx, 622xx = Metro East (St. Clair/Madison)
    // 623xx-629xx = Downstate
    
    const prefixMap = {
      // Cook County Suburban (not Chicago - those are in chicagoZips array)
      '600': 'COOK', '601': 'COOK', '602': 'COOK', '603': 'COOK',
      '604': 'COOK', '605': 'COOK', '607': 'COOK', '608': 'COOK',
      
      // Rockford area - Winnebago County
      '610': 'WINNEBAGO', '611': 'WINNEBAGO',
      
      // Champaign County
      '618': 'CHAMPAIGN',
      
      // Metro East - St. Clair/Madison
      '620': 'MADISON', '621': 'MADISON', '622': 'SAINT_CLAIR',
      
      // Sangamon County (Springfield)
      '627': 'SANGAMON',
      
      // Downstate defaults
      '623': 'DEFAULT', '624': 'DEFAULT', '625': 'DEFAULT',
      '626': 'DEFAULT', '628': 'DEFAULT', '629': 'DEFAULT'
    };
    
    return prefixMap[prefix] || null;
  }

  _formatCountyName(countyName) {
    if (!countyName) return 'Illinois';
    if (countyName === 'SAINT_CLAIR') return 'St. Clair County';
    if (countyName === 'COOK_CHICAGO') return 'Chicago';
    if (countyName === 'COOK') return 'Cook County';
    if (countyName === 'ROCK_ISLAND') return 'Rock Island County';
    if (countyName === 'DEFAULT') return 'Illinois';
    
    // Handle McHenry, McLean, etc.
    if (countyName.startsWith('MC')) {
      return 'Mc' + countyName.slice(2).charAt(0).toUpperCase() + 
             countyName.slice(3).toLowerCase() + ' County';
    }
    
    // Standard formatting
    return countyName.charAt(0).toUpperCase() + 
           countyName.slice(1).toLowerCase() + ' County';
  }
}

// Create global instance
const taxLookup = new IllinoisSalesTaxLookup();

// ============================================
// CONFIGURATION OBJECT
// ============================================

const CONFIG = {
  // Default tax rate (Illinois statewide base rate)
  defaultTaxRate: 0.0625, // 6.25%
  
  // Illinois fees (2024/2025 values)
  fees: {
    docPrep: {
      name: 'Doc Fee',
      amount: 377,
      taxable: false
    },
    ert: {
      name: 'ERT Fee',
      amount: 35,
      taxable: true
    },
    title: {
      name: 'Title Fee',
      amount: 165,
      taxable: false
    },
    registration: {
      name: 'Registration',
      amount: 151,
      taxable: false
    },
    cookCounty: {
      name: 'Cook County Clerk Fee',
      amount: 15,
      taxable: false
    }
  },
  
  // Available products (add-ons)
  products: {
    taxable: [
      { id: 'ceramic', name: 'Ceramic Coating', defaultPrice: 1500 },
      { id: 'ppf', name: 'Paint Protection Film', defaultPrice: 2500 },
      { id: 'tint', name: 'Window Tint', defaultPrice: 400 },
      { id: 'wheels', name: 'Wheel Upgrade', defaultPrice: 2000 },
      { id: 'accessories', name: 'Other Accessories', defaultPrice: 500 }
    ],
    nonTaxable: [
      { id: 'gap', name: 'GAP Insurance', defaultPrice: 795 },
      { id: 'warranty', name: 'Extended Warranty', defaultPrice: 2500 },
      { id: 'maintenance', name: 'Prepaid Maintenance', defaultPrice: 1200 },
      { id: 'theft', name: 'Theft Protection', defaultPrice: 895 }
    ]
  },
  
  // Available discounts
  discounts: [
    { id: 'manufacturer', name: 'Manufacturer Rebate', defaultAmount: 1000 },
    { id: 'dealer', name: 'Dealer Discount', defaultAmount: 500 },
    { id: 'military', name: 'Military/First Responder', defaultAmount: 500 },
    { id: 'loyalty', name: 'Brand Loyalty', defaultAmount: 750 },
    { id: 'college', name: 'College Grad', defaultAmount: 500 }
  ],
  
  // Credit tiers and their typical APRs
  creditTiers: {
    excellent: {
      name: 'Excellent (740+)',
      rates: {
        24: 4.99,
        36: 5.49,
        48: 5.99,
        60: 6.49,
        72: 6.99,
        84: 7.49
      }
    },
    good: {
      name: 'Good (670-739)',
      rates: {
        24: 6.99,
        36: 7.49,
        48: 7.99,
        60: 8.49,
        72: 8.99,
        84: 9.49
      }
    },
    fair: {
      name: 'Fair (580-669)',
      rates: {
        24: 9.99,
        36: 10.49,
        48: 10.99,
        60: 11.49,
        72: 11.99,
        84: 12.49
      }
    },
    poor: {
      name: 'Poor (<580)',
      rates: {
        24: 14.99,
        36: 15.49,
        48: 15.99,
        60: 16.49,
        72: 16.99,
        84: 17.49
      }
    }
  },
  
  // Available loan terms (months)
  loanTerms: [24, 36, 48, 60, 72, 84]
};

// Legacy TAX_RATES object for backward compatibility
// This will be populated dynamically by the tax lookup system
const TAX_RATES = {};

// Initialize tax lookup on page load
(async function initTaxLookup() {
  try {
    await taxLookup.load();
    console.log('✓ Illinois sales tax data loaded successfully');
  } catch (error) {
    console.error('✗ Failed to load tax data:', error);
    console.log('→ Using fallback rate of 6.25%');
  }
})();

// ============================================
// DOWN PAYMENT DECISION CALCULATOR DEFAULTS
// Edit these values to update defaults without
// touching any calculator logic.
// ============================================

CONFIG.downPaymentCalc = {

  // ------------------------------------------
  // INVESTMENT ASSUMPTIONS
  // ------------------------------------------

  // Expected annual return on invested cash (decimal)
  // 7% = moderately aggressive 70/30 stocks/bonds portfolio (historical avg ~10%, conservative est ~6-7%)
  defaultInvestmentReturn: 0.07,

  // Long-term capital gains tax rate applied to investment gains (decimal)
  // IRS tiers: 0% (<$47k income), 15% (most people), 20% (high earners)
  defaultGainsTaxRate: 0.15,

  // ------------------------------------------
  // DEFAULT DOWN PAYMENT
  // ------------------------------------------

  // Starting slider position as a fraction of total amount due
  // 0.10 = 10% down
  defaultDownPaymentPct: 0.10,

  // ------------------------------------------
  // RESIDUAL VALUE BY LOAN TERM
  // Expressed as % of purchase price remaining at end of term.
  // Sources: Edmunds, Black Book, KBB long-term depreciation averages.
  // These are broad averages; luxury/trucks hold value better, economy/EVs worse.
  // ------------------------------------------
  residualByTerm: {
    24: 0.65,  // ~65% after 2 years  (approx. 15-18% depreciation/yr early on)
    36: 0.57,  // ~57% after 3 years
    48: 0.49,  // ~49% after 4 years
    60: 0.41,  // ~41% after 5 years
    72: 0.34,  // ~34% after 6 years
    84: 0.28   // ~28% after 7 years
  },

  // ------------------------------------------
  // ANNUAL MAINTENANCE COST BY YEAR (new vehicle)
  // Sources: AAA Cost of Ownership, Consumer Reports averages.
  // Year 1-2: warranty covers most repairs; tires/oil/filters only
  // Year 3-4: tires, brakes, battery, routine service
  // Year 5+: more repairs likely as warranty expires
  // ------------------------------------------
  maintenanceByYear: {
    1:  500,   // Oil changes, wiper blades, cabin filter — warranty covers the rest
    2:  600,   // Similar to year 1; possible tire rotation/balance
    3:  900,   // First major tire replacement likely; brakes starting
    4: 1000,   // Brakes, battery possible, 4yr service
    5: 1200,   // Out of warranty — repairs start adding up
    6: 1400,   // Higher likelihood of suspension, starter, sensors
    7: 1600    // Older car — meaningful repair risk
  },

  // ------------------------------------------
  // AVERAGE APR BY CREDIT TIER AND TERM (2025)
  // These are shown as editable defaults in the calculator.
  // Source: Experian State of the Auto Finance Market Q4 2024,
  // Bankrate national averages Jan 2025.
  // Note: CONFIG.creditTiers already has APRs; these are the same
  // values but surfaced explicitly here for easy updating.
  // The calculator reads from CONFIG.creditTiers at runtime.
  // Update CONFIG.creditTiers above to change APR defaults.
  // ------------------------------------------
  aprNote: 'Edit CONFIG.creditTiers above to change APR defaults by credit tier and term.'

};
