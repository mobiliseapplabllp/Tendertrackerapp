import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'mayank.satyarthi@mobilise.co.in';
const PASSWORD = 'Nice*&12129';

const VIEWPORTS = [
  { name: 'mobile',       width: 375,  height: 812 },
  { name: 'tablet',       width: 768,  height: 1024 },
  { name: 'laptop-small', width: 1024, height: 768 },
  { name: 'laptop',       width: 1280, height: 800 },
  { name: 'desktop',      width: 1440, height: 900 },
];

async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.focus(selector);
  await page.keyboard.type(value, { delay: 40 });
}

async function clickText(page, text) {
  return page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() === t) {
        let el = node.parentElement;
        while (el && el !== document.body) {
          if (['BUTTON', 'A', 'LI'].includes(el.tagName) || el.getAttribute('role') === 'button') {
            el.click();
            return 'clicked: ' + el.tagName + ' "' + t + '"';
          }
          el = el.parentElement;
        }
        node.parentElement?.click();
        return 'clicked parent of: "' + t + '"';
      }
    }
    return null;
  }, text);
}

async function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 30,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  // --- Login ---
  console.log('1. Navigating to login page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step1-login.png' });

  await fillInput(page, '#email', EMAIL);
  await fillInput(page, '#password', PASSWORD);
  await waitMs(300);
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step2-filled.png' });

  await page.click('button[type="submit"]');
  console.log('2. Submitted login, waiting for dashboard...');

  // Wait until login form disappears
  await page.waitForFunction(
    () => !document.querySelector('#email'),
    { timeout: 30000 }
  ).catch(() => console.log('   Warning: email input still present'));

  await waitMs(2000);
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step3-after-login.png' });
  const titleAfterLogin = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  console.log('   Page after login:', titleAfterLogin);

  // --- Switch to Sales CRM ---
  console.log('3. Switching to Sales CRM...');

  // Try clicking any module switcher button in header area
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
    const header = btns.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < 80;
    });
    // Click the one most likely to be module switcher (has module name text or arrow)
    for (const el of header) {
      const txt = el.textContent?.toLowerCase() || '';
      if (txt.includes('crm') || txt.includes('sales') || txt.includes('tender') || txt.includes('module') || txt.includes('dashboard')) {
        el.click();
        return;
      }
    }
    // fallback: click second header button
    if (header.length > 1) header[1].click();
  });

  await waitMs(1000);
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step4-module-switcher.png' });

  const switchResult = await clickText(page, 'Sales CRM');
  console.log('   Module switch:', switchResult);
  await waitMs(2000);
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step5-sales-crm.png' });

  // --- Navigate to Companies & Contacts ---
  console.log('4. Navigating to Companies & Contacts...');
  const navResult = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, a, li'));
    const exact = all.find(el => el.textContent?.trim() === 'Companies & Contacts' && el.offsetParent !== null);
    if (exact) { exact.click(); return 'Companies & Contacts'; }
    const partial = all.find(el => el.textContent?.trim().includes('Companies') && el.offsetParent !== null);
    if (partial) { partial.click(); return partial.textContent.trim(); }
    return null;
  });
  console.log('   Clicked:', navResult);
  await waitMs(2000);
  await page.screenshot({ path: 'c:/React/Tendertrackerapp/test-step6-companies.png' });

  const pageTitle = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  console.log('   Page title:', pageTitle);

  if (!pageTitle?.includes('Compan')) {
    console.log('   ⚠️  Not on Companies page. Current state captured in screenshots.');
  }

  // --- Test all viewports ---
  console.log('\n=== Viewport Tests ===');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await waitMs(600);

    const path = `c:/React/Tendertrackerapp/test-${vp.name}.png`;
    await page.screenshot({ path, fullPage: false });

    const btnResult = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-add-company"]');
      if (!btn) return { found: false };
      const rect = btn.getBoundingClientRect();
      return {
        found: true,
        fullyVisible: rect.right <= window.innerWidth && rect.left >= 0,
        left: Math.round(rect.left), right: Math.round(rect.right), win: window.innerWidth,
      };
    });

    const actResult = await page.evaluate(() => {
      const th = Array.from(document.querySelectorAll('th')).find(h => h.textContent?.trim() === 'Actions');
      if (!th) return { found: false };
      const rect = th.getBoundingClientRect();
      const scrollParent = th.closest('.overflow-x-auto');
      const scrollRect = scrollParent?.getBoundingClientRect();
      return {
        found: true,
        inScrollContainer: !!scrollParent,
        scrollContainerRight: scrollRect ? Math.round(scrollRect.right) : null,
        scrollContainerWidth: scrollParent ? Math.round(scrollParent.clientWidth) : null,
        right: Math.round(rect.right), win: window.innerWidth,
      };
    });

    const btnStatus = !btnResult.found ? '❌ NOT FOUND'
      : btnResult.fullyVisible ? '✅ VISIBLE'
      : `❌ CUT OFF (right=${btnResult.right}, win=${btnResult.win})`;

    const actStatus = !actResult.found ? '❌ NOT FOUND'
      : actResult.inScrollContainer
        ? `✅ IN SCROLL TABLE (container=${actResult.scrollContainerWidth}px, col right=${actResult.right})`
        : actResult.right <= actResult.win + 5 ? '✅ VISIBLE'
        : `❌ CUT OFF (right=${actResult.right}, win=${actResult.win})`;

    console.log(`\n${vp.name} (${vp.width}x${vp.height}):`);
    console.log(`  Add Company : ${btnStatus}`);
    console.log(`  Actions col : ${actStatus}`);
    console.log(`  Screenshot  : ${path}`);
  }

  // Reset to desktop for final view
  await page.setViewport({ width: 1440, height: 900 });
  await waitMs(400);

  console.log('\n✅ Done. Check screenshots in c:/React/Tendertrackerapp/');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
