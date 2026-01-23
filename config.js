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
      throw new Error('Unable to load sales tax data');
    }
  }

  getTaxRate(zipCode) {
    if (!this.loaded || !this.data) {
      return {
        rate: 0.0625,
        location: 'Illinois (Statewide Rate)',
        county: null,
        isEstimate: true
      };
    }

    const normalizedZip = String(zipCode).trim().slice(0, 5);

    // Check if it's a Chicago ZIP code (special 9.50% rate)
    if (this.data.chicagoZips.includes(normalizedZip)) {
      return {
        rate: this.data.countyRates.COOK_CHICAGO,
        location: 'Chicago',
        county: 'Cook',
        isEstimate: false
      };
    }

    // Look up county for this ZIP code
    const county = this.data.zipToCounty[normalizedZip];

    if (county) {
      const rate = this.data.countyRates[county];
      
      return {
        rate: rate,
        location: this._formatCountyName(county),
        county: county,
        isEstimate: false
      };
    }

    // ZIP code not found - return state rate as fallback
    return {
      rate: 0.0625,
      location: 'Illinois (Statewide Rate)',
      county: null,
      isEstimate: true
    };
  }

  _formatCountyName(countyName) {
    if (countyName === 'SAINT CLAIR') return 'St. Clair County';
    if (countyName === 'COOK_CHICAGO') return 'Chicago';
    
    if (countyName.startsWith('MC')) {
      return countyName.charAt(0) + countyName.charAt(1).toLowerCase() + 
             countyName.slice(2).charAt(0).toUpperCase() + 
             countyName.slice(3).toLowerCase() + ' County';
    }
    
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
