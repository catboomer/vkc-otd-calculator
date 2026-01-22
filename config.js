/**
 * V Knows Cars - Out-the-Door Calculator Configuration
 * 
 * This file contains all configurable data for the calculator.
 * Edit this file to update fees, products, rates, and tax information.
 * 
 * Last updated: 2026-01-20
 */

const CONFIG = {
  
  // ============================================
  // FEES
  // ============================================
  // Taxable fees are included in the tax calculation
  // Non-taxable fees are added after tax
  
  fees: {
    docPrep: {
      amount: 377.00,
      label: "Doc Preparation",
      taxable: true,
      note: "Verify with dealer - fees vary"
    },
    ert: {
      amount: 35.00,
      label: "Electronic Registration & Title",
      taxable: true,
      note: ""
    },
    title: {
      amount: 165.00,
      label: "Title Fee",
      taxable: false,
      note: "Illinois standard fee"
    },
    registration: {
      amount: 151.00,
      label: "Registration Fee",
      taxable: false,
      note: "Illinois standard fee"
    },
    cookCounty: {
      amount: 15.00,
      label: "Cook County New Vehicle Fee",
      taxable: false,
      note: "Only applies to Cook County"
    }
  },

  // ============================================
  // ADD-ON PRODUCTS
  // ============================================
  // Products are categorized by taxability per Illinois law:
  // - Protection products (back-end): NOT taxable
  // - Accessories (front-end): Taxable
  
  products: {
    // Non-taxable: Insurance and warranty products
    nonTaxable: [
      { id: "gap-insurance", name: "GAP Insurance" },
      { id: "extended-warranty", name: "Extended Warranty" },
      { id: "prepaid-maintenance", name: "Prepaid Maintenance" },
      { id: "tire-wheel", name: "Tire & Wheel Protection" },
      { id: "key-replacement", name: "Key Replacement" },
      { id: "windshield", name: "Windshield Protection" },
      { id: "other-protection", name: "Other Protection Product" }
    ],
    
    // Taxable: Physical accessories and appearance products
    taxable: [
      { id: "ceramic-coating", name: "Ceramic Coating" },
      { id: "ppf", name: "Paint Protection Film (PPF)" },
      { id: "permaplate", name: "Permaplate" },
      { id: "window-tint", name: "Window Tinting" },
      { id: "floor-mats", name: "Floor Mats" },
      { id: "other-accessory", name: "Other Accessory" }
    ]
  },

  // ============================================
  // DISCOUNT TYPES
  // ============================================
  
  discounts: [
    { id: "dealer-discount", name: "Dealer Discount" },
    { id: "manufacturer-rebate", name: "Manufacturer Rebate" },
    { id: "conquest-rebate", name: "Conquest Rebate" },
    { id: "loyalty-rebate", name: "Loyalty Rebate" },
    { id: "military-rebate", name: "Military Rebate" },
    { id: "first-responder", name: "First Responder Rebate" },
    { id: "college-grad", name: "College Grad Rebate" },
    { id: "other-discount", name: "Other Discount" }
  ],

  // ============================================
  // CREDIT TIERS & INTEREST RATES
  // ============================================
  // Rates are APR percentages by loan term (months)
  // These are estimates - actual rates depend on lender
  
  creditTiers: {
    excellent: {
      label: "Excellent",
      scoreRange: "740+",
      rates: {
        24: 5.49,
        36: 5.99,
        48: 6.49,
        60: 6.49,
        72: 6.99,
        84: 7.49
      }
    },
    good: {
      label: "Good",
      scoreRange: "670-739",
      rates: {
        24: 6.49,
        36: 6.99,
        48: 7.49,
        60: 7.49,
        72: 7.99,
        84: 8.49
      }
    },
    fair: {
      label: "Fair",
      scoreRange: "580-669",
      rates: {
        24: 9.49,
        36: 9.99,
        48: 10.49,
        60: 10.49,
        72: 10.99,
        84: 11.49
      }
    },
    poor: {
      label: "Poor",
      scoreRange: "Below 580",
      rates: {
        24: 12.49,
        36: 12.99,
        48: 13.49,
        60: 13.49,
        72: 13.99,
        84: 14.49
      }
    }
  },

  // ============================================
  // AVAILABLE LOAN TERMS
  // ============================================
  // Terms available for special APR entry
  
  loanTerms: [24, 36, 48, 60, 72, 84],

  // ============================================
  // DEFAULT TAX RATE
  // ============================================
  // Used when ZIP code is not found in the tax rates table
  
  defaultTaxRate: 0.0725
};


// ============================================
// ILLINOIS TAX RATES BY ZIP CODE
// ============================================
// Combined state + local rates for the service area
// Source: Illinois Department of Revenue
// Note: Rates change - verify at tax.illinois.gov

const TAX_RATES = {
  // Cook County (10%)
  "60004": { rate: 0.1000, city: "Arlington Heights", county: "Cook" },
  "60005": { rate: 0.1000, city: "Arlington Heights", county: "Cook" },
  "60006": { rate: 0.1000, city: "Arlington Heights", county: "Cook" },
  "60007": { rate: 0.1000, city: "Elk Grove Village", county: "Cook" },
  "60008": { rate: 0.1000, city: "Rolling Meadows", county: "Cook" },
  "60016": { rate: 0.1000, city: "Des Plaines", county: "Cook" },
  "60017": { rate: 0.1000, city: "Des Plaines", county: "Cook" },
  "60018": { rate: 0.1000, city: "Des Plaines", county: "Cook" },
  "60022": { rate: 0.1000, city: "Glencoe", county: "Cook" },
  "60025": { rate: 0.1000, city: "Glenview", county: "Cook" },
  "60026": { rate: 0.1000, city: "Glenview", county: "Cook" },
  "60029": { rate: 0.1000, city: "Golf", county: "Cook" },
  "60038": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60043": { rate: 0.1000, city: "Kenilworth", county: "Cook" },
  "60053": { rate: 0.1000, city: "Morton Grove", county: "Cook" },
  "60055": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60056": { rate: 0.1000, city: "Mount Prospect", county: "Cook" },
  "60062": { rate: 0.1000, city: "Northbrook", county: "Cook" },
  "60065": { rate: 0.1000, city: "Northbrook", county: "Cook" },
  "60067": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60068": { rate: 0.1000, city: "Park Ridge", county: "Cook" },
  "60070": { rate: 0.1000, city: "Prospect Heights", county: "Cook" },
  "60074": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60076": { rate: 0.1000, city: "Skokie", county: "Cook" },
  "60077": { rate: 0.1000, city: "Skokie", county: "Cook" },
  "60078": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60090": { rate: 0.1000, city: "Wheeling", county: "Cook" },
  "60091": { rate: 0.1000, city: "Wilmette", county: "Cook" },
  "60093": { rate: 0.1000, city: "Winnetka", county: "Cook" },
  "60094": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60095": { rate: 0.1000, city: "Palatine", county: "Cook" },
  "60107": { rate: 0.1000, city: "Streamwood", county: "Cook" },
  "60133": { rate: 0.1000, city: "Hanover Park", county: "Cook" },
  "60169": { rate: 0.1000, city: "Hoffman Estates", county: "Cook" },
  "60173": { rate: 0.1000, city: "Schaumburg", county: "Cook" },
  "60176": { rate: 0.1000, city: "Schiller Park", county: "Cook" },
  "60192": { rate: 0.1000, city: "Hoffman Estates", county: "Cook" },
  "60193": { rate: 0.1000, city: "Schaumburg", county: "Cook" },
  "60194": { rate: 0.1000, city: "Schaumburg", county: "Cook" },
  "60195": { rate: 0.1000, city: "Schaumburg", county: "Cook" },
  "60196": { rate: 0.1000, city: "Schaumburg", county: "Cook" },
  
  // Lake County (7.25%)
  "60010": { rate: 0.0725, city: "Barrington", county: "Lake" },
  "60011": { rate: 0.0725, city: "Barrington", county: "Lake" },
  "60015": { rate: 0.0725, city: "Deerfield", county: "Lake" },
  "60020": { rate: 0.0725, city: "Fox Lake", county: "Lake" },
  "60030": { rate: 0.0725, city: "Grayslake", county: "Lake" },
  "60031": { rate: 0.0725, city: "Gurnee", county: "Lake" },
  "60035": { rate: 0.0725, city: "Highland Park", county: "Lake" },
  "60037": { rate: 0.0725, city: "Fort Sheridan", county: "Lake" },
  "60040": { rate: 0.0725, city: "Highwood", county: "Lake" },
  "60041": { rate: 0.0725, city: "Ingleside", county: "Lake" },
  "60044": { rate: 0.0725, city: "Lake Bluff", county: "Lake" },
  "60045": { rate: 0.0725, city: "Lake Forest", county: "Lake" },
  "60046": { rate: 0.0725, city: "Lake Villa", county: "Lake" },
  "60047": { rate: 0.0725, city: "Lake Zurich", county: "Lake" },
  "60048": { rate: 0.0725, city: "Libertyville", county: "Lake" },
  "60060": { rate: 0.0725, city: "Mundelein", county: "Lake" },
  "60061": { rate: 0.0725, city: "Vernon Hills", county: "Lake" },
  "60064": { rate: 0.0725, city: "North Chicago", county: "Lake" },
  "60069": { rate: 0.0725, city: "Lincolnshire", county: "Lake" },
  "60073": { rate: 0.0725, city: "Round Lake", county: "Lake" },
  "60079": { rate: 0.0725, city: "Waukegan", county: "Lake" },
  "60083": { rate: 0.0725, city: "Wadsworth", county: "Lake" },
  "60084": { rate: 0.0725, city: "Wauconda", county: "Lake" },
  "60085": { rate: 0.0725, city: "Waukegan", county: "Lake" },
  "60087": { rate: 0.0725, city: "Waukegan", county: "Lake" },
  "60088": { rate: 0.0725, city: "Great Lakes", county: "Lake" },
  "60089": { rate: 0.0725, city: "Buffalo Grove", county: "Lake" },
  "60096": { rate: 0.0725, city: "Winthrop Harbor", county: "Lake" },
  "60099": { rate: 0.0725, city: "Zion", county: "Lake" },
  
  // McHenry County (7.25%)
  "60012": { rate: 0.0725, city: "Crystal Lake", county: "McHenry" },
  "60013": { rate: 0.0725, city: "Cary", county: "McHenry" },
  "60014": { rate: 0.0725, city: "Crystal Lake", county: "McHenry" },
  "60021": { rate: 0.0725, city: "Fox River Grove", county: "McHenry" },
  "60033": { rate: 0.0725, city: "Harvard", county: "McHenry" },
  "60034": { rate: 0.0725, city: "Hebron", county: "McHenry" },
  "60042": { rate: 0.0725, city: "Island Lake", county: "McHenry" },
  "60050": { rate: 0.0725, city: "McHenry", county: "McHenry" },
  "60051": { rate: 0.0725, city: "McHenry", county: "McHenry" },
  "60071": { rate: 0.0725, city: "Richmond", county: "McHenry" },
  "60072": { rate: 0.0725, city: "Ringwood", county: "McHenry" },
  "60081": { rate: 0.0725, city: "Spring Grove", county: "McHenry" },
  "60097": { rate: 0.0725, city: "Wonder Lake", county: "McHenry" },
  "60098": { rate: 0.0725, city: "Woodstock", county: "McHenry" },
  "60102": { rate: 0.0725, city: "Algonquin", county: "McHenry" },
  
  // DuPage County (8%)
  "60101": { rate: 0.0800, city: "Addison", county: "DuPage" },
  "60103": { rate: 0.0800, city: "Bartlett", county: "DuPage" },
  "60105": { rate: 0.0800, city: "Bensenville", county: "DuPage" },
  "60106": { rate: 0.0800, city: "Bensenville", county: "DuPage" },
  "60108": { rate: 0.0800, city: "Bloomingdale", county: "DuPage" },
  "60126": { rate: 0.0800, city: "Elmhurst", county: "DuPage" },
  "60139": { rate: 0.0800, city: "Glendale Heights", county: "DuPage" },
  "60143": { rate: 0.0800, city: "Itasca", county: "DuPage" },
  "60148": { rate: 0.0800, city: "Lombard", county: "DuPage" },
  "60157": { rate: 0.0800, city: "Medinah", county: "DuPage" },
  "60172": { rate: 0.0800, city: "Roselle", county: "DuPage" },
  "60181": { rate: 0.0800, city: "Villa Park", county: "DuPage" },
  "60188": { rate: 0.0800, city: "Carol Stream", county: "DuPage" },
  "60191": { rate: 0.0800, city: "Wood Dale", county: "DuPage" },
  
  // Kane County (7.25%)
  "60110": { rate: 0.0725, city: "Carpentersville", county: "Kane" },
  "60118": { rate: 0.0725, city: "Dundee", county: "Kane" },
  "60120": { rate: 0.0725, city: "Elgin", county: "Kane" },
  "60123": { rate: 0.0725, city: "Elgin", county: "Kane" },
  "60124": { rate: 0.0725, city: "Elgin", county: "Kane" }
};
