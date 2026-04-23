import { chromium } from 'playwright';

(async () => {
  console.log('🔍 Starting Playwright debugging session...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000     // Slow down actions
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    console.log(`🌐 PAGE: ${msg.type()}: ${msg.text()}`);
  });
  
  // Log network requests
  page.on('request', req => {
    console.log(`📡 REQUEST: ${req.method()} ${req.url()}`);
  });
  
  page.on('response', res => {
    console.log(`📥 RESPONSE: ${res.status()} ${res.url()}`);
  });
  
  try {
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    console.log('📄 Page title:', await page.title());
    
    // Check for error messages
    const errors = await page.locator('[role="alert"], .error, .alert').allTextContents();
    if (errors.length > 0) {
      console.log('⚠️  Found error messages:', errors);
    }
    
    // Check if course ID is set
    const courseIdText = await page.locator('text=Course ID').textContent();
    console.log('🎯 Course ID status:', courseIdText);
    
    // Check for cohort selector
    const cohortSelector = await page.locator('[data-testid="cohort-selector"], select, .MuiSelect-root').first();
    const isVisible = await cohortSelector.isVisible().catch(() => false);
    console.log('📋 Cohort selector visible:', isVisible);
    
    if (isVisible) {
      console.log('✅ App loaded successfully - cohort selector is visible');
    } else {
      console.log('❌ App has issues - cohort selector not found');
    }
    
    // Check environment variables by looking at network requests
    console.log('🔧 Waiting for API calls to check configuration...');
    await page.waitForTimeout(3000);
    
    console.log('🎭 Debugging session complete. Browser will stay open for manual inspection.');
    console.log('📝 To close: Close the browser window or press Ctrl+C');
    
    // Keep browser open for manual debugging
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
})();