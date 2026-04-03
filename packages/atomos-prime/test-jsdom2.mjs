import pkg from 'jsdom';
const { JSDOM } = pkg;
import fs from 'fs';

const html = fs.readFileSync('../atomos-structura/canvas.html', 'utf-8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://127.0.0.1:3002/atomos-structura/canvas.html'
});

dom.window.console.log = (...args) => console.log('PAGE LOG:', ...args);
dom.window.console.error = (...args) => console.error('PAGE ERROR:', ...args);
dom.window.addEventListener('error', event => {
  console.error('UNHANDLED ERROR:', event.message || event.error);
});
dom.window.addEventListener('unhandledrejection', event => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

setTimeout(() => {
    const root = dom.window.document.getElementById('canvas-root');
    console.log('ROOT LENGTH:', root ? root.innerHTML.length : null);
    process.exit();
}, 2000);
