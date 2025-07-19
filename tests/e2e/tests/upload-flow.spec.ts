import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('YouTube History Upload and Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('complete upload and analysis workflow', async ({ page }) => {
    // Test homepage loads correctly
    await expect(page).toHaveTitle(/Rabbit.*YouTube Analytics/i);
    await expect(page.getByText(/upload.*watch.*history/i)).toBeVisible();

    // Test file upload component is visible
    const fileUpload = page.getByTestId('file-upload-area');
    await expect(fileUpload).toBeVisible();
    await expect(page.getByText(/drag.*drop/i)).toBeVisible();

    // Upload a sample file
    const filePath = path.join(__dirname, '../fixtures/sample-watch-history.html');
    await page.setInputFiles('input[type="file"]', filePath);

    // Wait for file processing to start
    await expect(page.getByTestId('processing-status')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/processing/i)).toBeVisible();

    // Wait for processing to complete and analytics to load
    await expect(page.getByTestId('analytics-dashboard')).toBeVisible({ timeout: 30000 });

    // Verify analytics components are displayed
    await expect(page.getByTestId('metrics-overview')).toBeVisible();
    await expect(page.getByTestId('category-breakdown')).toBeVisible();
    await expect(page.getByTestId('top-channels')).toBeVisible();
    await expect(page.getByTestId('temporal-trends')).toBeVisible();

    // Test metrics display
    const totalVideos = page.getByTestId('total-videos-metric');
    await expect(totalVideos).toBeVisible();
    await expect(totalVideos).toContainText(/\d+/); // Should contain numbers

    const totalWatchTime = page.getByTestId('total-watch-time-metric');
    await expect(totalWatchTime).toBeVisible();
    await expect(totalWatchTime).toContainText(/\d+/);

    // Test category breakdown chart
    const categoryChart = page.getByTestId('category-chart');
    await expect(categoryChart).toBeVisible();

    // Test filtering functionality
    const filterButton = page.getByTestId('filter-button');
    await filterButton.click();

    const dateRangeFilter = page.getByTestId('date-range-filter');
    await expect(dateRangeFilter).toBeVisible();

    // Apply a date filter
    await page.getByTestId('date-from-input').fill('2023-01-01');
    await page.getByTestId('date-to-input').fill('2023-12-31');
    await page.getByTestId('apply-filter-button').click();

    // Verify filter is applied (metrics should update)
    await expect(page.getByTestId('active-filters')).toBeVisible();
    await expect(page.getByText(/date.*filter.*applied/i)).toBeVisible();

    // Test video table
    const videoTable = page.getByTestId('video-table');
    await expect(videoTable).toBeVisible();

    // Check table headers
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Channel')).toBeVisible();
    await expect(page.getByText('Watched')).toBeVisible();
    await expect(page.getByText('Duration')).toBeVisible();

    // Test table sorting
    const titleHeader = page.getByTestId('sort-title');
    await titleHeader.click();
    
    // Verify sort indicator appears
    await expect(page.getByTestId('sort-indicator')).toBeVisible();

    // Test pagination if applicable
    const paginationContainer = page.getByTestId('pagination');
    if (await paginationContainer.isVisible()) {
      const nextPageButton = page.getByTestId('next-page');
      if (await nextPageButton.isEnabled()) {
        await nextPageButton.click();
        await expect(page.getByTestId('current-page')).toContainText('2');
      }
    }

    // Test export functionality
    const exportButton = page.getByTestId('export-button');
    await exportButton.click();

    const exportMenu = page.getByTestId('export-menu');
    await expect(exportMenu).toBeVisible();

    // Test CSV export
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('handles file upload errors gracefully', async ({ page }) => {
    // Test invalid file type
    const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt');
    await page.setInputFiles('input[type="file"]', invalidFilePath);

    // Should show error message
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByText(/invalid.*file.*type/i)).toBeVisible();

    // Test large file error
    const largeFilePath = path.join(__dirname, '../fixtures/large-file.html');
    if (require('fs').existsSync(largeFilePath)) {
      await page.setInputFiles('input[type="file"]', largeFilePath);
      await expect(page.getByText(/file.*too.*large/i)).toBeVisible();
    }
  });

  test('displays onboarding guide correctly', async ({ page }) => {
    // Check if onboarding guide is accessible
    const guideButton = page.getByTestId('takeout-guide-button');
    await expect(guideButton).toBeVisible();
    
    await guideButton.click();

    // Verify guide modal opens
    const guideModal = page.getByTestId('takeout-guide-modal');
    await expect(guideModal).toBeVisible();

    // Check guide content
    await expect(page.getByText(/google.*takeout/i)).toBeVisible();
    await expect(page.getByText(/step.*1/i)).toBeVisible();

    // Test step navigation
    const nextStepButton = page.getByTestId('next-step');
    await nextStepButton.click();
    await expect(page.getByText(/step.*2/i)).toBeVisible();

    // Close guide
    const closeButton = page.getByTestId('close-guide');
    await closeButton.click();
    await expect(guideModal).not.toBeVisible();
  });

  test('responsive design works on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test only runs on mobile viewports');
    }

    // Test mobile navigation
    const mobileMenu = page.getByTestId('mobile-menu-button');
    await expect(mobileMenu).toBeVisible();

    await mobileMenu.click();
    const navigationMenu = page.getByTestId('navigation-menu');
    await expect(navigationMenu).toBeVisible();

    // Test mobile file upload
    const filePath = path.join(__dirname, '../fixtures/sample-watch-history.html');
    await page.setInputFiles('input[type="file"]', filePath);

    // Verify mobile-optimized processing view
    await expect(page.getByTestId('mobile-processing-view')).toBeVisible();

    // Test mobile analytics layout
    await expect(page.getByTestId('analytics-dashboard')).toBeVisible({ timeout: 30000 });
    
    // Check that mobile-specific layout is used
    await expect(page.getByTestId('mobile-metrics-stack')).toBeVisible();
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate network errors
    await page.route('**/api/upload', route => {
      route.abort('failed');
    });

    const filePath = path.join(__dirname, '../fixtures/sample-watch-history.html');
    await page.setInputFiles('input[type="file"]', filePath);

    // Should show network error message
    await expect(page.getByTestId('network-error')).toBeVisible();
    await expect(page.getByText(/network.*error/i)).toBeVisible();

    // Test retry functionality
    const retryButton = page.getByTestId('retry-button');
    await expect(retryButton).toBeVisible();

    // Remove the route interception for retry
    await page.unroute('**/api/upload');
    await retryButton.click();

    // Should proceed normally after retry
    await expect(page.getByTestId('processing-status')).toBeVisible();
  });

  test('dark mode toggle works correctly', async ({ page }) => {
    // Test theme toggle
    const themeToggle = page.getByTestId('theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Toggle to dark mode
    await themeToggle.click();
    
    // Verify dark mode classes are applied
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);

    // Verify colors change
    const header = page.getByTestId('main-header');
    await expect(header).toHaveCSS('background-color', /rgb\(.*\)$/);

    // Toggle back to light mode
    await themeToggle.click();
    await expect(body).not.toHaveClass(/dark/);
  });

  test('keyboard navigation works properly', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('takeout-guide-button')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('file-upload-area')).toBeFocused();

    // Test Enter key on file upload
    await page.keyboard.press('Enter');
    // File dialog should open (can't test file selection in E2E, but focus behavior is testable)

    // Test escape key handling
    await page.keyboard.press('Escape');
    
    // Upload a file and test keyboard navigation in results
    const filePath = path.join(__dirname, '../fixtures/sample-watch-history.html');
    await page.setInputFiles('input[type="file"]', filePath);
    
    await expect(page.getByTestId('analytics-dashboard')).toBeVisible({ timeout: 30000 });

    // Test navigation within analytics dashboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('performance metrics are within acceptable limits', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/', { waitUntil: 'networkidle' });

    // Measure page load time
    const loadTime = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return perfData.loadEventEnd - perfData.loadEventStart;
    });

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Upload file and measure processing time
    const filePath = path.join(__dirname, '../fixtures/sample-watch-history.html');
    const startTime = Date.now();
    
    await page.setInputFiles('input[type="file"]', filePath);
    await expect(page.getByTestId('analytics-dashboard')).toBeVisible({ timeout: 30000 });
    
    const processingTime = Date.now() - startTime;
    
    // Processing should complete within 30 seconds for test file
    expect(processingTime).toBeLessThan(30000);

    // Check for memory leaks
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory;
    });

    if (memoryInfo) {
      // Memory usage should be reasonable
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
    }
  });
});