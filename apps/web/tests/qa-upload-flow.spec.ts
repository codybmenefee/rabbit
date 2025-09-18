import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('YouTube Analytics Upload Flow QA', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('complete file upload flow - sample watch history', async ({ page }) => {
    // Step 1: Verify we're on the empty state page
    await expect(page.getByRole('heading', { name: 'Import Your YouTube Data' })).toBeVisible();
    await expect(page.getByText('Upload your Google Takeout watch history')).toBeVisible();
    
    // Step 2: Click the upload button to navigate to import page
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    
    // Step 3: Verify we're on the import page
    await expect(page.getByRole('heading', { name: 'Upload Your YouTube History' })).toBeVisible();
    await expect(page.getByText('Drag and drop your watch-history.html file')).toBeVisible();
    
    // Step 4: Upload the sample file using the hidden file input
    const fileInput = page.locator('input[type="file"]');
    const sampleFilePath = path.join(__dirname, 'fixtures', 'watch-history.sample.html');
    
    await fileInput.setInputFiles(sampleFilePath);
    
    // Step 5: Verify processing starts
    await expect(page.getByText('Processing your YouTube history...')).toBeVisible();
    
    // Step 6: Wait for processing to complete (may take a while for large files)
    // Look for the summary page or populated state
    await expect(page.getByText('Processing your YouTube history...')).not.toBeVisible({ timeout: 60000 });
    
    // Step 7: Verify we reach either the import summary or the populated dashboard
    // Check for either summary page elements or populated state elements
    const summaryVisible = await page.getByText('Import Summary').isVisible().catch(() => false);
    const dashboardVisible = await page.getByText('Videos Watched (YTD)').isVisible().catch(() => false);
    
    expect(summaryVisible || dashboardVisible).toBe(true);
    
    // If on summary page, continue to dashboard
    if (summaryVisible) {
      await page.getByRole('button', { name: /continue|view dashboard/i }).click();
      await expect(page.getByText('Videos Watched (YTD)')).toBeVisible();
    }
    
    // Step 8: Verify the dashboard shows processed data
    await expect(page.getByText('Videos Watched (YTD)')).toBeVisible();
    await expect(page.getByText('Unique Channels')).toBeVisible();
    await expect(page.getByText('Avg. Daily Videos')).toBeVisible();
    await expect(page.getByText('Top Category')).toBeVisible();
  });

  test('file upload validation - wrong file type', async ({ page }) => {
    // Navigate to import page
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    
    // Try to upload a non-HTML file (create a dummy text file)
    const fileInput = page.locator('input[type="file"]');
    
    // Create a temporary text file for testing
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an HTML file')
    });
    
    // Verify error message appears
    await expect(page.getByText('Please upload a .html file (watch-history.html from Google Takeout)')).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('drag and drop upload functionality', async ({ page }) => {
    // Navigate to import page
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    
    // Get the drop zone
    const dropZone = page.getByRole('button', { name: 'Upload YouTube watch history file' });
    await expect(dropZone).toBeVisible();
    
    // Create a file for drag and drop
    const sampleFilePath = path.join(__dirname, 'fixtures', 'watch-history.sample.html');
    
    // Simulate file drop by uploading through the hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(sampleFilePath);
    
    // Verify processing starts
    await expect(page.getByText('Processing your YouTube history...')).toBeVisible();
    
    // Wait for processing to complete
    await expect(page.getByText('Processing your YouTube history...')).not.toBeVisible({ timeout: 60000 });
  });

  test('data persistence after page reload', async ({ page }) => {
    // First upload a file
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    
    const fileInput = page.locator('input[type="file"]');
    const sampleFilePath = path.join(__dirname, 'fixtures', 'watch-history.sample.html');
    await fileInput.setInputFiles(sampleFilePath);
    
    // Wait for processing
    await expect(page.getByText('Processing your YouTube history...')).not.toBeVisible({ timeout: 60000 });
    
    // Navigate to dashboard if on summary
    const summaryVisible = await page.getByText('Import Summary').isVisible().catch(() => false);
    if (summaryVisible) {
      await page.getByRole('button', { name: /continue|view dashboard/i }).click();
    }
    
    // Verify we're on populated dashboard
    await expect(page.getByText('Videos Watched (YTD)')).toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Verify data persists and we're still on the populated state
    await expect(page.getByText('Videos Watched (YTD)')).toBeVisible();
    await expect(page.getByText('Unique Channels')).toBeVisible();
  });

  test('clear data functionality', async ({ page }) => {
    // First upload and process data
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    
    const fileInput = page.locator('input[type="file"]');
    const sampleFilePath = path.join(__dirname, 'fixtures', 'watch-history.sample.html');
    await fileInput.setInputFiles(sampleFilePath);
    
    await expect(page.getByText('Processing your YouTube history...')).not.toBeVisible({ timeout: 60000 });
    
    // Navigate to dashboard
    const summaryVisible = await page.getByText('Import Summary').isVisible().catch(() => false);
    if (summaryVisible) {
      await page.getByRole('button', { name: /continue|view dashboard/i }).click();
    }
    
    // Clear the data
    await page.getByRole('button', { name: 'Clear All Data' }).click();
    
    // Verify we're back to empty state
    await expect(page.getByRole('heading', { name: 'Import Your YouTube Data' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Watch History' })).toBeVisible();
  });
});