import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.fill('input[type="email"]', 'mfadel.frigo@easyerp.com');
  await page.fill('input[type="password"]', 'admin123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  const sidebarText = await page.locator('aside').textContent();
  console.log('--- LOCAL TEST SIDEBAR CONTENT ---');
  console.log(sidebarText);
  console.log('---------------------------------');

  await page.screenshot({ path: 'local_frigo_role_test.png' });
  await browser.close();
})();
