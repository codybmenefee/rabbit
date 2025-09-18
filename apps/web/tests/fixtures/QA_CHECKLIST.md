# QA Checklist for YouTube Analytics Prototype

## Pre-Testing Setup

- [ ] Development environment is running (`npm run dev`)
- [ ] Browser dev tools are open (for console monitoring)
- [ ] Sample data files are available in `/fixtures/` directory:
  - [ ] `watch-history.sample.html` (300 entries)
  - [ ] `edge-cases.json`
  - [ ] `missing-data-cases.json`
  - [ ] `time-variations.json`

## Core User Journey Testing

### 1. Fresh Application State

- [ ] Open application in fresh browser/incognito window
- [ ] Verify empty state is displayed with clear upload CTA
- [ ] No JavaScript errors in console
- [ ] Responsive layout works on desktop, tablet, mobile

### 2. File Upload Testing

#### 2.1 Sample HTML File Upload

- [ ] Upload `fixtures/watch-history.sample.html`
- [ ] Import completes without errors
- [ ] Import summary shows:
  - [ ] 300 total records (approximate)
  - [ ] Unique channel count
  - [ ] Date range detection
  - [ ] YouTube vs YouTube Music breakdown
- [ ] No console errors during import

#### 2.2 Error Handling

- [ ] Upload invalid file type (e.g., .txt) - should show error
- [ ] Upload corrupted HTML - should handle gracefully
- [ ] Upload empty file - should show appropriate message
- [ ] Network interruption during upload - should recover or fail gracefully

### 3. Data Persistence

- [ ] Refresh page after successful import
- [ ] Data persists and dashboard shows imported data
- [ ] No re-import required

### 4. Dashboard Functionality

#### 4.1 KPI Cards

- [ ] Total videos count displays correctly
- [ ] Unique channels count displays correctly
- [ ] YTD/QTD/MTD metrics show reasonable values
- [ ] YOY deltas display (may be N/A for single-year data)

#### 4.2 Charts and Visualizations

- [ ] Monthly trend chart renders
- [ ] Top channels bar chart displays
- [ ] Day/time heatmap shows activity patterns
- [ ] Topics leaderboard shows derived topics
- [ ] All charts load without errors

#### 4.3 Global Filters

- [ ] Timeframe filter (MTD, QTD, YTD, etc.)
  - [ ] Filters apply correctly to all components
  - [ ] Charts update in real-time
  - [ ] KPI metrics recalculate
- [ ] Product filter (YouTube vs YouTube Music)
  - [ ] Correctly filters data
  - [ ] Updates all visualizations
- [ ] Topic filters (if implemented)
  - [ ] Multi-select works correctly
  - [ ] Filters combine properly
- [ ] Channel search/filter (if implemented)
  - [ ] Search functionality works
  - [ ] Results filter correctly

### 5. Edge Case Data Handling

#### 5.1 Missing Data

- [ ] Private videos display appropriately
- [ ] Missing timestamps don't crash aggregations
- [ ] Entries without video URLs are handled
- [ ] Non-ASCII characters display correctly

#### 5.2 Time Zone and Date Handling

- [ ] Various timestamp formats parse correctly
- [ ] Year boundaries handle properly
- [ ] Early morning hours (0-6 AM) display in heatmap
- [ ] Weekend vs weekday patterns are visible

## Developer Controls Testing (Development Only)

### 6.1 Dev Controls Panel

- [ ] DEV button appears in bottom-right (development mode only)
- [ ] Controls panel opens/closes correctly
- [ ] All sample data buttons function

### 6.2 Sample Data Loading

- [ ] "Load Test Fixtures" button
  - [ ] Loads edge case data
  - [ ] Updates dashboard immediately
  - [ ] Console shows successful loading message
- [ ] "Load Sample Data" button
  - [ ] Loads 200 realistic records
  - [ ] Covers 6-month timespan
  - [ ] Updates all visualizations
- [ ] "Clear All Data" button
  - [ ] Clears cloud (Convex) data
  - [ ] Reloads page to empty state
  - [ ] Confirms data is truly cleared

## Performance and UX Testing

### 7. Performance

- [ ] Large file import (full watch-history.html) completes reasonably
- [ ] Filter changes are responsive (< 500ms)
- [ ] Chart animations are smooth
- [ ] No memory leaks during extended usage

### 8. Browser Compatibility

- [ ] Chrome/Chromium - latest version
- [ ] Firefox - latest version  
- [ ] Safari - latest version (if on macOS)
- [ ] Edge - latest version

### 9. Accessibility

- [ ] Keyboard navigation works for interactive elements
- [ ] Focus states are visible
- [ ] Charts have appropriate ARIA labels
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader compatibility (basic test)

### 10. Error Recovery

- [ ] Malformed data doesn't crash the app
- [ ] Network failures are handled gracefully
- [ ] Browser refresh during import doesn't corrupt state
- [ ] Multiple rapid filter changes don't cause race conditions

## Data Validation Testing

### 11. Aggregation Accuracy

- [ ] Manually verify sample counts against raw data
- [ ] Check YOY calculations with known data
- [ ] Verify timeframe filters return correct date ranges
- [ ] Confirm channel grouping is accurate

### 12. Parsing Validation

- [ ] Compare parsed data against original HTML
- [ ] Verify video URLs are extracted correctly
- [ ] Check channel names match HTML content
- [ ] Confirm timestamps are parsed to correct timezone

## Regression Testing

### 13. After Code Changes

- [ ] Re-run core user journey
- [ ] Verify data persists correctly
- [ ] Check that all visualizations still render
- [ ] Confirm filters still work properly
- [ ] Test error handling still functions

## Bug Documentation Template

When bugs are found, document with:

```md
**Bug**: [Brief description]
**Steps to Reproduce**: 
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happens]
**Browser**: [Browser and version]
**Console Errors**: [Any JavaScript errors]
**Sample Data Used**: [Which test file/fixture]
**Severity**: [High/Medium/Low]
**Screenshot**: [If applicable]
```

## Sign-off Criteria

- [ ] All core user journey items pass
- [ ] No high-severity bugs remain
- [ ] Performance is acceptable for prototype scope
- [ ] Sample data processing works reliably
- [ ] Dashboard displays meaningful insights from test data
- [ ] Developer tools facilitate easy testing

**QA Completed By**: _______________  
**Date**: _______________  
**Notes**: _______________
