import { test, expect } from '@playwright/test';
import path from 'path';

test('upload file and verify dashboard shows non-zero metrics', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Clear any existing data first
  const clearButton = page.getByRole('button', { name: /Clear.*Data/i });
  if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Click upload button
  await page.getByRole('button', { name: 'Upload Watch History' }).click();
  
  // Upload the sample file
  const fileInput = page.locator('input[type="file"]');
  const sampleFilePath = path.join(__dirname, 'fixtures', 'watch-history.sample.html');
  await fileInput.setInputFiles(sampleFilePath);
  
  // Wait for processing
  await expect(page.getByText('Processing your YouTube history...')).toBeVisible({ timeout: 10000 });
  console.log('✅ Processing started');
  
  // Wait for import summary to appear (indicates successful processing)
  await expect(page.getByText('Import Successful!')).toBeVisible({ timeout: 30000 });
  console.log('✅ Import successful');
  
  // Check the import summary shows non-zero records
  const totalRecordsElement = await page.locator('text=/Total Watch Records/').locator('..').locator('p.text-2xl');
  const totalRecordsText = await totalRecordsElement.textContent();
  const totalRecords = parseInt(totalRecordsText?.replace(/,/g, '') || '0');
  
  console.log(`📊 Total records imported: ${totalRecords}`);
  expect(totalRecords).toBeGreaterThan(0);
  
  // Click Continue to Dashboard
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  
  // Wait for dashboard to load
  await expect(page.getByText('YouTube Analytics Dashboard')).toBeVisible({ timeout: 10000 });
  
  // Verify the header shows non-zero records
  const recordCountText = await page.getByText(/Analyzing \d+ watch records/).textContent();
  const recordCount = parseInt(recordCountText?.match(/\d+/)?.[0] || '0');
  
  console.log(`📈 Dashboard shows: ${recordCount} records`);
  expect(recordCount).toBeGreaterThan(0);
  
  // Check that at least one KPI card shows non-zero value
  const kpiCards = page.locator('.text-2xl.font-bold.text-white');
  const kpiCount = await kpiCards.count();
  
  let hasNonZeroKPI = false;
  for (let i = 0; i < kpiCount; i++) {
    const kpiText = await kpiCards.nth(i).textContent();
    const kpiValue = parseFloat(kpiText?.replace(/[^0-9.]/g, '') || '0');
    if (kpiValue > 0) {
      hasNonZeroKPI = true;
      console.log(`✅ Found non-zero KPI: ${kpiText}`);
    }
  }
  
  expect(hasNonZeroKPI).toBe(true);
  
  // Take a screenshot of the populated dashboard
  await page.screenshot({ 
    path: 'test-results/dashboard-with-data.png', 
    fullPage: true 
  });
  
  console.log('✅ Dashboard successfully shows data from uploaded file');
});