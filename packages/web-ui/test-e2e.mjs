import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // We don't have Vite running. Let's start it.
    console.log('Starting Vite server...');
    const { spawn } = await import('child_process');
    const viteProcess = spawn('npx', ['vite', '--port', '4123'], { cwd: 'd:/Sources/vbe2/packages/web-ui', shell: true });
    
    // Give it a moment to start
    await new Promise(r => setTimeout(r, 4000));
    
    try {
        await page.goto('http://localhost:4123/canvas.html');
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('Page loaded. Finding settings button...');
        // Find property settings button
        const btn = await page.$('.property-settings-btn, [title="Settings"], svg, g, div');
        
        // Wait, just let's inject a script to trigger the click programmatically
        await page.evaluate(() => {
            const firstEntity = Object.values(window).find(x => x && x.id === 'entity-1');
            console.log('firstEntity found');
        });
        
    } catch(e) {
        console.error(e);
    } finally {
        viteProcess.kill();
        await browser.close();
    }
})();
