import { test, expect } from '@playwright/test';

test('Verify RESPONSABLE_FRIGO user role isolation', async ({ page }) => {
  // Go to local app
  await page.goto('http://localhost:5173');

  // Fill in Frigo Responsable credentials
  await page.fill('input[type="email"]', 'mfadel.frigo@easyerp.com');
  await page.fill('input[type="password"]', 'admin123456');

  // Click login
  await page.click('button[type="submit"]');

  // Wait for application main view
  await page.waitForTimeout(2000);

  // Check top navbar profile display
  const profileText = await page.locator('header, nav').textContent();
  console.log('Profile Header Text:', profileText);

  // Verify URL/Page heading
  const pageHeading = await page.locator('h1, h2, nav').first().textContent();
  console.log('Page Heading:', pageHeading);

  // Check sidebar navigation elements
  const sidebarText = await page.locator('aside').textContent();
  console.log('Sidebar Items Visible:', sidebarText);

  // Verify restricted modules are NOT in sidebar
  expect(sidebarText).not.toContain('Achats');
  expect(sidebarText).not.toContain('Facturation');
  expect(sidebarText).not.toContain('Trésorerie');
  expect(sidebarText).not.toContain('Comptabilité');
  expect(sidebarText).not.toContain('Paramètres');

  // Take screenshot of frigo responsable view
  await page.screenshot({ path: 'frigo_responsable_local_test.png', fullPage: true });
});
