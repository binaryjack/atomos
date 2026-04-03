const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('NETWORK FAILED:', request.url(), request.failure()?.errorText || 'Unknown error');
  });

  try {
    await page.goto('http://127.0.0.1:3005/atomos-structura/canvas.html', { waitUntil: 'load' });
  } catch (e) {}

  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
})();
