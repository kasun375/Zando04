const http = require('http');
const { spawn } = require('child_process');

// 1. Start the web server
console.log('Starting web server...');
const serverProcess = spawn('node', ['web-server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

setTimeout(() => {
  // 2. Start headless chrome with remote debugging
  console.log('Starting Chrome...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    'http://127.0.0.1:3000'
  ]);

  chromeProcess.on('error', (err) => {
    console.error('Failed to start Chrome:', err);
    serverProcess.kill();
    process.exit(1);
  });

  setTimeout(() => {
    // 3. Connect to Chrome debugging port
    console.log('Fetching Chrome tabs...');
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          console.log('Tabs:', tabs);
          
          // Connect to the tab via WebSocket to get console logs
          const tab = tabs.find(t => t.url.includes('3000'));
          if (!tab) {
            console.error('No tab found for port 3000');
            chromeProcess.kill();
            serverProcess.kill();
            process.exit(1);
          }
          
          const wsUrl = tab.webSocketDebuggerUrl;
          console.log('Connecting to WebSocket:', wsUrl);
          
          const WebSocket = require('ws');
          const ws = new WebSocket(wsUrl);
          
          ws.on('open', () => {
            console.log('Connected to Chrome DevTools Protocol');
            // Enable Console and Runtime
            ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
            ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
          });
          
          ws.on('message', (message) => {
            const msg = JSON.parse(message);
            if (msg.method === 'Runtime.consoleAPICalled') {
              const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a));
              console.log(`[BROWSER CONSOLE - ${msg.params.type.toUpperCase()}]`, ...args);
            } else if (msg.method === 'Runtime.exceptionThrown') {
              console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
            }
          });
          
          setTimeout(() => {
            console.log('Finished logging. Cleaning up...');
            ws.close();
            chromeProcess.kill();
            serverProcess.kill();
            process.exit(0);
          }, 6000);
          
        } catch (e) {
          console.error('Error parsing tabs or connecting:', e);
          chromeProcess.kill();
          serverProcess.kill();
          process.exit(1);
        }
      });
    }).on('error', (err) => {
      console.error('Failed to query Chrome debug port:', err);
      chromeProcess.kill();
      serverProcess.kill();
      process.exit(1);
    });
  }, 3000);
}, 2000);
