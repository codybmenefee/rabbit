# Manual QA Testing Flows

## Quick Testing Guide for Developers

### Flow 1: Happy Path Testing (5 minutes)

**Objective**: Verify core functionality works end-to-end

1. **Setup**
   - Open terminal, run `npm run dev`
   - Open `http://localhost:3000` in browser
   - Open browser dev tools (F12)

2. **Empty State**
   - Verify empty state shows upload CTA
   - Check responsive layout on different viewport sizes

3. **Sample Data Upload**
   - Click "Upload Watch History" button
   - Wait for loading animation (2 seconds)
   - Verify populated dashboard appears with sample data
   - Check all KPI cards show reasonable numbers
   - Verify charts placeholders are visible

4. **Quick Validation**
   - Check browser console for any JavaScript errors
   - Test "Clear All Data" button returns to empty state
   - Refresh page, verify data persistence

**Expected Time**: 5 minutes  
**Pass Criteria**: No console errors, state transitions work, data persists

---

### Flow 2: Developer Controls Testing (3 minutes)

**Objective**: Validate development utilities work properly

1. **Access Dev Controls**
   - Look for yellow "DEV" button in bottom-right corner
   - If not visible, check NODE_ENV is set to 'development'
   - Click to expand developer panel

2. **Test Fixture Loading**
   - Click "Load Test Fixtures" - should load edge cases
   - Verify console shows loading message
   - Check dashboard updates immediately

3. **Test Sample Data**
   - Click "Load Sample Data" - should load 200 realistic records
   - Verify dashboard shows more comprehensive data
   - Check date ranges span ~6 months

4. **Test Clear Function**
   - Click "Clear All Data"
   - Verify page reloads to empty state
   - Confirm no residual data remains

**Expected Time**: 3 minutes  
**Pass Criteria**: All dev controls function, data loads correctly

---

### Flow 3: Error Handling Testing (4 minutes)

**Objective**: Ensure app handles edge cases gracefully

1. **Console Monitoring**
   - Keep dev tools open throughout testing
   - Monitor for uncaught errors or warnings

2. **State Transition Errors**
   - Try rapid clicking during loading states
   - Navigate away and back during processing
   - Test browser refresh at different stages

3. **Data Edge Cases**
   - Load fixture data (contains edge cases)
   - Verify private videos don't crash app
   - Check non-ASCII characters display correctly
   - Confirm missing timestamps are handled

4. **UI Stress Testing**
   - Resize browser window during chart rendering
   - Test with browser zoom at 50%, 150%, 200%
   - Test with browser dev tools docked different ways

**Expected Time**: 4 minutes  
**Pass Criteria**: No crashes, graceful error handling, UI remains functional

---

### Flow 4: Data Accuracy Spot Check (6 minutes)

**Objective**: Verify sample data produces reasonable insights

1. **Load Known Dataset**
   - Use "Load Sample Data" from dev controls
   - Note the dataset contains 200 records over 6 months

2. **Validate KPI Cards**
   - Check "Videos Watched (YTD)" shows ~200
   - Verify "Unique Channels" shows 8-12 channels
   - Confirm "Avg. Daily Videos" calculation seems reasonable
   - Check "Top Category" matches fixture data

3. **Verify Data Distribution**
   - Look for content topics badge
   - Confirm variety matches fixture generation logic
   - Check that date ranges align with "past 6 months"

4. **Cross-Reference Console**
   - Check console.log messages during data loading
   - Verify record counts match UI display
   - Look for any data transformation warnings

**Expected Time**: 6 minutes  
**Pass Criteria**: Numbers are mathematically consistent, no obvious data errors

---

### Flow 5: Regression Testing (Quick Check)

Use this flow when code changes are made.

1. **Smoke Test**
   - Load app → should show empty state
   - Upload data → should show populated state
   - Clear data → should return to empty state
   - No console errors throughout

2. **Key Features Check**
   - Dev controls still appear and function
   - Sample data loading works
   - All UI components render properly
   - State persistence works

3. **Performance Check**
   - State transitions feel responsive
   - No obvious memory leaks or performance degradation
   - Charts and UI updates happen smoothly

**Expected Time**: 2 minutes  
**Pass Criteria**: All basic functionality intact, no performance regression

---

## When to Run Each Flow

- **Flow 1 (Happy Path)**: Every development session, before PRs
- **Flow 2 (Dev Controls)**: When dev utilities are modified
- **Flow 3 (Error Handling)**: Weekly, after data processing changes
- **Flow 4 (Data Accuracy)**: When aggregation logic changes
- **Flow 5 (Regression)**: After any code changes

## Bug Reporting Template

```md
**Flow**: [Which flow was being executed]
**Step**: [Specific step that failed]
**Environment**: [Browser, OS, viewport size]
**Console Errors**: [Copy any JavaScript errors]
**Expected**: [What should have happened]
**Actual**: [What actually happened]
**Reproducible**: [Always/Sometimes/Once]
**Severity**: [Critical/High/Medium/Low]
```

## Sign-off for QA

- [ ] All flows completed successfully
- [ ] No critical or high-severity bugs
- [ ] Performance is acceptable for prototype
- [ ] Developer tools facilitate easy testing

**Tested By**: _______________  
**Date**: _______________  
**Build/Commit**: _______________
