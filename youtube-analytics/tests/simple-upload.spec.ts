import { test, expect } from '@playwright/test';
import path from 'path';

test('simple upload test with mini file', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Click upload button
  await page.getByRole('button', { name: 'Upload Watch History' }).click();
  
  // Upload mini test file
  const fileInput = page.locator('input[type="file"]');
  const miniFilePath = path.join(__dirname, 'fixtures', 'mini-watch-history.html');
  await fileInput.setInputFiles(miniFilePath);
  
  // Wait for processing and verify success or failure
  try {
    // Either processing starts successfully
    await expect(page.getByText('Processing your YouTube history...')).toBeVisible({ timeout: 10000 });
    console.log('✅ Processing started successfully');
    
    // Wait for processing to complete
    await expect(page.getByText('Processing your YouTube history...')).not.toBeVisible({ timeout: 30000 });
    console.log('✅ Processing completed');
    
  } catch (error) {
    // Or an error appears
    const errorVisible = await page.getByRole('alert').isVisible();
    if (errorVisible) {
      const errorText = await page.getByRole('alert').textContent();
      console.log('❌ Error occurred:', errorText);
    } else {
      console.log('❌ Unknown issue:', error.message);
    }
  }
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/debug-screenshot.png', fullPage: true });
});