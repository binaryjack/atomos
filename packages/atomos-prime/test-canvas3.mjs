import pkg from 'jsdom';
const { JSDOM, ResourceLoader } = pkg;
import fs from 'fs';

const html = fs.readFileSync('../atomos-structura/canvas.html', 'utf-8');

class CustomResourceLoader extends ResourceLoader {
  fetch(url, options) {
    console.log('FETCHING:', url);
    return super.fetch(url, options);
  }
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: new CustomResourceLoader(),
  url: 'http://127.0.0.1:8080/packages/atomos-structura/canvas.html'
});

dom.window.console.log = (...args) => console.log('PAGE LOG:', ...args);
dom.window.console.error = (...args) => console.log('PAGE ERROR:', ...args);
dom.window.addEventListener('error', event => {
  console.log('UNHANDLED ERROR:', event.message || event.error);
});

setTimeout(() => {
    console.log('DIV HTML LENGTH:', dom.window.document.getElementById('canvas-root')?.innerHTML.length);
    console.log('Done waiting');
    process.exit();
}, 2000);
