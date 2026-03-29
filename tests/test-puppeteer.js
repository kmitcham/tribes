const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (error) => console.log('PAGE ERROR:', error.message));

  await page.goto('http://127.0.0.1:8000');
  await new Promise((r) => setTimeout(r, 1000));

  // Fill login
  await page.type('#playerName', 'Kevin');
  await page.click('#registerBtn');
  await new Promise((r) => setTimeout(r, 1000));

  // Click manage users
  await page.evaluate(() => {
    window.tribesClient.showManageUsersModal();
  });

  await new Promise((r) => setTimeout(r, 1000));

  const rows = await page.evaluate(() => {
    return document.getElementById('usersListContainer').innerHTML;
  });
  console.log('HTML length:', rows.length);
  console.log('HTML head:', rows.substring(0, 100));

  await browser.close();
})();
