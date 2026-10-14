const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:8765/luxury-v2/index.html';
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
      headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      rootBackground: getComputedStyle(document.documentElement).backgroundColor,
      forbiddenElements: document.querySelectorAll('iframe, object, embed, link[rel="stylesheet"]').length,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth
    }));
    expect(state.styles).toEqual([]);
    expect(state.scripts.every(s => s.endsWith('/luxury-v2/live.js'))).toBeTruthy();
    expect(state.classes.some(c => forbidden.includes(c))).toBeFalsy();
    expect(state.width).toBeLessThanOrEqual(state.viewport);
    expect(state.font).toContain('Avenir');
    expect(state.headingFont).toContain('Georgia');
    expect(state.rootBackground).toBe('rgb(248, 243, 234)');
    expect(state.forbiddenElements).toBe(0);
    await page.screenshot({ path: 'test-results/luxury-'+screen+'.png', fullPage: true });
  }
  // Evaluate again after switching through every tab to catch delayed injections.
  await page.waitForTimeout(250);
  await expect(page.locator('link[rel="stylesheet"], iframe, object, embed')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('luxury navigation never injects legacy presentation after load', async ({ page }) => {
  await page.addInitScript(() => {
    window.__luxuryLeakLog = [];
    const badClass = /^(primaryNav|navMoreMenu|assignmentChoices|shoppingHeading|recipegrid|todayMealImage)$/;
    const check = () => {
      for (const node of document.querySelectorAll('*')) {
        if ([...node.classList].some(c => badClass.test(c))) window.__luxuryLeakLog.push('legacy class: ' + node.className);
      }
      if (document.querySelector('link[rel="stylesheet"], iframe, object, embed')) window.__luxuryLeakLog.push('foreign document/style');
      for (const sheet of document.styleSheets) {
        if (sheet.href) window.__luxuryLeakLog.push('external CSS: ' + sheet.href);
      }
    };
    document.addEventListener('DOMContentLoaded', () => {
      check();
      new MutationObserver(check).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'href', 'rel'] });
    });
  });
  await page.goto(url);
  for (const tab of ['week','groceries','cook','today','week','today']) {
    await page.locator('[data-nav="' + tab + '"]').click();
    await expect(page.locator('[data-page="' + tab + '"]')).toBeVisible();
  }
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__luxuryLeakLog)).toEqual([]);
});

for (const width of [320, 390, 430]) {
  test('luxury mobile visual contract at ' + width + 'px', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    for (const screen of ['today', 'week', 'groceries', 'cook']) {
      await page.locator('[data-nav="' + screen + '"]').click();
      await expect(page.locator('[data-page="' + screen + '"]')).toBeVisible();
      const snapshot = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const heading = getComputedStyle(document.querySelector('[data-page]:not([hidden]) h1'));
        const nav = document.querySelector('footer');
        const navStyle = getComputedStyle(nav);
        return {
          rootFont: root.fontFamily,
          rootBackground: root.backgroundColor,
          headingFont: heading.fontFamily,
          navPosition: navStyle.position,
          navBackground: navStyle.backgroundColor,
          visiblePages: document.querySelectorAll('[data-page]:not([hidden])').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          stylesheetLinks: document.querySelectorAll('link[rel="stylesheet"]').length
        };
      });
      expect(snapshot.rootFont).toContain('Avenir');
      expect(snapshot.headingFont).toContain('Georgia');
      expect(snapshot.rootBackground).toBe('rgb(248, 243, 234)');
      expect(snapshot.navPosition).toBe('fixed');
      expect(snapshot.navBackground).toBe('rgb(255, 253, 248)');
      expect(snapshot.visiblePages).toBe(1);
      expect(snapshot.overflow).toBe(false);
      expect(snapshot.stylesheetLinks).toBe(0);
      await page.screenshot({ path: 'test-results/luxury-' + width + '-' + screen + '.png', fullPage: true });
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('network interruption and reload never reveal legacy layout', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Simulate remote Firebase/CDN failure while retaining the local app document.
  // A fully offline browser would also block our localhost test server.
  await page.route(/^https:\/\//, route => route.abort('internetdisconnected'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (const screen of ['today', 'week', 'groceries', 'cook']) {
    await page.locator('[data-nav="' + screen + '"]').click();
    await expect(page.locator('[data-page="' + screen + '"]')).toBeVisible();
    const styles = await page.evaluate(() => ({
      root: getComputedStyle(document.documentElement).backgroundColor,
      heading: getComputedStyle(document.querySelector('[data-page]:not([hidden]) h1')).fontFamily,
      forbidden: !!document.querySelector('link[rel="stylesheet"], iframe, object, embed, .primaryNav, .navMoreMenu, .recipegrid, .shoppingHeading'),
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    expect(styles.root).toBe('rgb(248, 243, 234)');
    expect(styles.heading).toContain('Georgia');
    expect(styles.forbidden).toBe(false);
    expect(styles.overflow).toBe(false);
    await page.screenshot({ path: 'test-results/offline-' + screen + '.png', fullPage: true });
  }
  await context.close();
});

test('Firebase CDN failure retains a luxury-only visible account status', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('https://www.gstatic.com/**', route => route.abort('internetdisconnected'));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const banner = page.locator('#accountDataStatus');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Loading your Tablewise plan');
  await expect(page.locator('#accountDataStatus')).toHaveCount(1);
  for (const screen of ['today','week','groceries','cook']) {
    await page.locator('[data-nav="' + screen + '"]').click();
    await expect(page.locator('[data-page="' + screen + '"]')).toBeVisible();
    await expect(banner).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(248, 243, 234)');
    await page.screenshot({ path: 'test-results/auth-unavailable-' + screen + '.png', fullPage: true });
  }
  await context.close();
});
