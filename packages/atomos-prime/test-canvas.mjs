import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('../atomos-structura/canvas.html', 'utf-8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://127.0.0.1:3002/atomos-structura/canvas.html'
});

dom.window.console.log = (...args) => console.log('PAGE LOG:', ...args);
dom.window.console.error = (...args) => console.log('PAGE ERROR:', ...args);

dom.window.addEventListener('error', event => {
  console.log('UNHANDLED ERROR:', event.message || event.error);
});

setTimeout(() => {
    console.log('Done waiting');
    process.exit();
}, 2000);
