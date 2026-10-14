const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:8765/luxury-v2/index.html';
const legacy = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const forbidden = ['primaryNav','navMoreMenu','assignmentChoices','shoppingHeading','recipegrid','todayMealImage'];
test('luxury v2 is visually and structurally isolated on iPhone', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('[data-page="today"]')).toBeVisible();
  for (const screen of ['today','week','groceries','cook']) {
    await page.locator('[data-nav="'+screen+'"]').click();
    await expect(page.locator('[data-page="'+screen+'"]')).toBeVisible();
    await expect(page.locator('[data-page]:visible')).toHaveCount(1);
    const state = await page.evaluate(() => ({
      styles: [...document.styleSheets].map(s => s.href).filter(Boolean),
      scripts: [...document.scripts].map(s => s.src).filter(Boolean),
      classes: [...document.querySelectorAll('*')].flatMap(e => [...e.classList]),
      font: getComputedStyle(document.body).fontFamily,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth
    }));
    expect(state.styles).toEqual([]);
    expect(state.scripts.every(s => s.endsWith('/luxury-v2/live.js'))).toBeTruthy();
    expect(state.classes.some(c => forbidden.includes(c))).toBeFalsy();
    expect(state.width).toBeLessThanOrEqual(state.viewport);
    expect(state.font).not.toBe('');
    await page.screenshot({ path: 'test-results/luxury-'+screen+'.png', fullPage: true });
  }
  expect(errors).toEqual([]);
});
