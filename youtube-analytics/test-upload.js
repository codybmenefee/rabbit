const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Starting test...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to app');
    
    // Check if we're on the empty state or populated state
    const uploadButton = page.getByRole('button', { name: 'Upload Watch History' });
    const isEmptyState = await uploadButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isEmptyState) {
      // Clear existing data
      console.log('🗑️ Clearing existing data...');
      const clearButton = page.getByRole('button', { name: /Clear.*Data/i });
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Click upload button
    await page.getByRole('button', { name: 'Upload Watch History' }).click();
    console.log('✅ Clicked upload button');
    
    // Upload the sample file
    const fileInput = page.locator('input[type="file"]');
    const path = require('path');
    const sampleFilePath = path.join(__dirname, 'tests/fixtures/watch-history.sample.html');
    await fileInput.setInputFiles(sampleFilePath);
    console.log('✅ Selected file for upload');
    
    // Wait for processing
    const processingVisible = await page.getByText('Processing your YouTube history...').isVisible({ timeout: 10000 }).catch(() => false);
    if (processingVisible) {
      console.log('⏳ Processing file...');
      
      // Wait for import summary
      const summaryVisible = await page.getByText('Import Successful!').isVisible({ timeout: 30000 }).catch(() => false);
      
      if (summaryVisible) {
        console.log('✅ Import successful!');
        
        // Get total records from summary
        const totalRecordsElement = await page.locator('p.text-2xl').first();
        const totalRecordsText = await totalRecordsElement.textContent();
        console.log(`📊 Total records imported: ${totalRecordsText}`);
        
        // Click Continue to Dashboard
        await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
        await page.waitForTimeout(2000);
        
        // Check dashboard header
        const headerText = await page.getByText(/Analyzing \d+ watch records/).textContent().catch(() => null);
        if (headerText) {
          console.log(`📈 Dashboard header: ${headerText}`);
        }
        
        // Check KPI values
        const kpiCards = page.locator('.text-2xl.font-bold.text-white');
        const kpiCount = await kpiCards.count();
        console.log(`\n📊 KPI Values:`);
        
        for (let i = 0; i < Math.min(kpiCount, 4); i++) {
          const kpiText = await kpiCards.nth(i).textContent();
          console.log(`  - KPI ${i+1}: ${kpiText}`);
        }
        
      } else {
        // Check for errors
        const errorAlert = page.getByRole('alert');
        if (await errorAlert.isVisible({ timeout: 1000 }).catch(() => false)) {
          const errorText = await errorAlert.textContent();
          console.log('❌ Import failed:', errorText);
        } else {
          console.log('❌ Import did not complete successfully');
        }
      }
    } else {
      console.log('❌ Processing did not start');
      
      // Check for immediate errors
      const errorAlert = page.getByRole('alert');
      if (await errorAlert.isVisible({ timeout: 1000 }).catch(() => false)) {
        const errorText = await errorAlert.textContent();
        console.log('❌ Error:', errorText);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/test-upload-result.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/test-upload-result.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-results/test-upload-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();