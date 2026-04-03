const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('NETWORK FAILED:', request.url(), request.failure()?.errorText || 'Unknown error');
  });

  console.log('Navigating...');
  try {
    // 3002 is the http-server port configured in demo:dev
    await page.goto('http://127.0.0.1:3002/atomos-structura/canvas.html', { waitUntil: 'load' });
  } catch (e) {
    console.error('Goto failed:', e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const content = await page.evaluate(() => document.getElementById('canvas-root')?.innerHTML.length);
  console.log('ROOT LENGTH:', content);

  await browser.close();
})();
