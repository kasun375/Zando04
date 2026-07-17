const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');

async function run() {
  // 1. Start the node server
  console.log('Starting Node web server...');
  const server = spawn('node', ['web-server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  // Wait for server to start
  await new Promise(r => setTimeout(r, 2000));

  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen for console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION] ${err.toString()}`);
  });

  // Listen for response status codes to find 404s
  page.on('response', response => {
    if (response.status() === 404) {
      console.log(`[BROWSER HTTP 404] ${response.url()}`);
    }
  });

  // Listen for failed requests (network errors, CORS blocks, etc.)
  page.on('requestfailed', request => {
    console.log(`[BROWSER REQUEST FAILED] ${request.url()} - Error: ${request.failure()?.errorText || 'unknown'}`);
  });

  console.log('Navigating to http://127.0.0.1:3000...');
  try {
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch (e) {
    console.log('Navigation warning/timeout:', e.message);
  }

  // Wait 4 more seconds to allow scripts to run
  console.log('Waiting for scripts to execute...');
  await new Promise(r => setTimeout(r, 4000));

  // Get the HTML content of the splash screen and app root
  const splashHTML = await page.evaluate(() => {
    const el = document.getElementById('splash-screen');
    return el ? el.innerHTML : 'No splash screen element';
  });
  console.log('Splash Screen HTML Content:', splashHTML.trim());

  const appDisplay = await page.evaluate(() => {
    const el = document.getElementById('app');
    return el ? { display: el.style.display, htmlSnippet: el.innerHTML.substring(0, 200) } : 'No app element';
  });
  console.log('App Element status:', appDisplay);

  console.log('Closing browser...');
  await browser.close();

  console.log('Stopping Python web server...');
  server.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
