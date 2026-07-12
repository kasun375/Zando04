const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');

async function run() {
  console.log('Starting Python web server...');
  const server = spawn('python', ['web-server.py'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    shell: true
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION] ${err.toString()}`);
  });

  console.log('Navigating to http://127.0.0.1:3000...');
  await page.goto('http://127.0.0.1:3000');

  console.log('Waiting 5 seconds for data loading...');
  await new Promise(r => setTimeout(r, 5000));

  // Check the DOM elements
  const cardsCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-card');
    const mockups = document.querySelectorAll('.mockup-product-card');
    return {
      totalCards: cards.length,
      mockupCards: mockups.length,
      realCards: cards.length - mockups.length,
      htmlSample: document.getElementById('app') ? document.getElementById('app').innerHTML.substring(0, 300) : 'no #app'
    };
  });

  console.log('DOM Evaluation Result:', cardsCount);

  await browser.close();
  server.kill();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
