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
  console.error('WINDOW ERROR:', event.message || event.error, event.filename);
}, true); // useCapture to catch resource load errors

dom.window.document.querySelectorAll('script').forEach(s => {
  s.addEventListener('error', e => console.log('SCRIPT ERROR:', s.src || s.innerHTML.substring(0,20)));
});

setTimeout(() => {
    process.exit();
}, 2000);
