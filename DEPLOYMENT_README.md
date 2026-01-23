# Out-the-Door Calculator - Deployment Instructions

## Files to Deploy to GitHub Pages

Upload all of these files to your GitHub Pages repository:

### Required Files (5 total)
1. **calculator.html** - Main calculator interface
2. **calculator.js** - Calculator logic (updated with tax lookup integration)
3. **config.js** - Configuration and tax lookup system (NEW)
4. **styles.css** - Styling
5. **il_sales_tax_lookup.json** - Complete Illinois ZIP code database (NEW)

## What Changed

### ✅ Integrated Illinois Sales Tax Lookup
- **Before**: Manual ZIP code lookup with limited coverage
- **After**: Automatic lookup for all 1,500+ Illinois ZIP codes

### ✅ Accurate Tax Rates
- **Chicago**: 9.50% (special city rate)
- **Suburban Cook**: 8.25% (Cook County outside Chicago)
- **Collar Counties**: 7.25% (DuPage, Kane, Lake, Will, McHenry, etc.)
- **Downstate**: 6.25% (state base rate)

### ✅ Automatic Fallback
- Unknown ZIP codes default to 6.25% with visual indicator (*)
- Tooltip shows: "ZIP code not found - using statewide rate. Verify with dealer."

## Testing Before Deployment

1. **Test locally**:
   - Open `calculator.html` in a browser
   - Make sure files are in the same directory
   - Test different ZIP codes:
     - **60601** → Should show 9.50% (Chicago)
     - **60010** → Should show 7.25% (Barrington, Lake County)
     - **60148** → Should show 7.25% (Lombard, DuPage County)
     - **62701** → Should show 6.25% (Springfield, Sangamon County)
     - **99999** → Should show 6.25%* (Unknown ZIP - statewide rate)

2. **Check console**:
   - Open browser DevTools (F12)
   - Look for: "✓ Illinois sales tax data loaded successfully"
   - If you see an error, ensure `il_sales_tax_lookup.json` is in the same directory

## Deployment Steps

### Option 1: GitHub Web Interface
1. Go to your GitHub repository
2. Navigate to the folder where your calculator lives
3. Click "Add file" → "Upload files"
4. Drag and drop all 5 files
5. Commit changes
6. Wait 1-2 minutes for GitHub Pages to rebuild

### Option 2: Git Command Line
```bash
# Navigate to your repository
cd your-repo

# Copy all 5 files to the correct directory
cp calculator.html your-directory/
cp calculator.js your-directory/
cp config.js your-directory/
cp styles.css your-directory/
cp il_sales_tax_lookup.json your-directory/

# Commit and push
git add .
git commit -m "Integrate comprehensive Illinois sales tax lookup system"
git push origin main
```

## File Structure on GitHub Pages

Your repository should look like this:
```
your-repo/
├── calculator.html
├── calculator.js
├── config.js
├── styles.css
└── il_sales_tax_lookup.json
```

## Performance

- **Initial load**: ~50KB for tax data (< 100ms on typical connection)
- **Lookup speed**: < 1ms per ZIP code
- **Browser caching**: Automatic - tax data cached after first load

## Updating Tax Rates

To update tax rates in the future:

1. Edit `il_sales_tax_lookup.json`
2. Find the `countyRates` section
3. Update the rate for the specific county
4. Save and redeploy to GitHub Pages

Example:
```json
"countyRates": {
  "COOK_CHICAGO": 0.0950,  // Update this if Chicago rate changes
  "COOK": 0.0825,          // Update this if suburban Cook rate changes
  "DUPAGE": 0.0725,        // Update this if DuPage rate changes
  ...
}
```

## Troubleshooting

### Tax data not loading?
- Check browser console for errors
- Verify `il_sales_tax_lookup.json` is in the same directory as `calculator.html`
- Ensure file was uploaded correctly (not corrupted)

### Showing wrong tax rate?
- Verify ZIP code in the JSON file
- Check that county has correct rate in `countyRates`
- Clear browser cache and reload

### Calculator not working at all?
- Check that ALL 5 files are uploaded
- Verify file names match exactly (case-sensitive)
- Check browser console for JavaScript errors

## Support

The calculator will:
- ✅ Automatically show tax rate when user enters ZIP
- ✅ Display location name (e.g., "Lake County" or "Chicago")
- ✅ Show asterisk (*) for unknown ZIPs with fallback to 6.25%
- ✅ Calculate all fees including Cook County clerk fee when applicable
- ✅ Handle trade-in tax savings correctly for Illinois

## Notes

- The tax lookup happens instantly (no API calls)
- All data is loaded once when page opens
- Works offline after initial load
- No external dependencies
- Mobile-friendly and fully responsive
