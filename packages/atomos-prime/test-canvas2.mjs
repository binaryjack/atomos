import jsdom from 'jsdom';
import fs from 'fs';

const { JSDOM, ResourceLoader } = jsdom;
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
  url: 'http://127.0.0.1:3002/atomos-structura/canvas.html'
});

dom.window.console.log = (...args) => console.log('PAGE LOG:', ...args);
dom.window.console.error = (...args) => console.log('PAGE ERROR:', ...args);
dom.window.addEventListener('error', event => {
  console.log('UNHANDLED ERROR:', event.message || event.error);
});

setTimeout(() => {
    console.log('DIV:', dom.window.document.getElementById('canvas-root')?.innerHTML.length);
    console.log('Done waiting');
    process.exit();
}, 3000);
