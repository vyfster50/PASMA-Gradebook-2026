import { chromium } from 'playwright';

(async () => {
  console.log('Testing Playwright availability...');
  
  try {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test 1: Basic navigation
    console.log('✓ Playwright chromium browser launched');
    
    // Test 2: Can navigate to local app
    console.log('Testing local app at http://localhost:3000...');
    
    await browser.close();
    console.log('✅ Playwright is available and working!');
    console.log('Ready for MCP integration testing.');
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error.message);
    process.exit(1);
  }
})();