const BASE_URL = process.env.QC_BASE_URL || 'http://localhost:3000';
const CDP_URL = process.env.QC_CDP_URL || 'http://127.0.0.1:9222';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function getPageTarget(preferredPath = '') {
  const tabs = await getJson(`${CDP_URL}/json`);
  const page =
    tabs.find((tab) => tab.type === 'page' && tab.url?.startsWith(BASE_URL + preferredPath)) ||
    tabs.find((tab) => tab.type === 'page' && tab.url?.startsWith(BASE_URL)) ||
    tabs.find((tab) => tab.type === 'page');

  if (!page?.webSocketDebuggerUrl) {
    throw new Error('No debuggable browser page found. Start Edge with --remote-debugging-port=9222.');
  }

  return page;
}

class CdpClient {
  constructor(webSocketDebuggerUrl) {
    this.ws = new WebSocket(webSocketDebuggerUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(JSON.stringify(message.error)));
        } else {
          resolve(message.result);
        }
      } else if (message.method) {
        this.events.push(message);
      }
    };
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }

    return result.result.value;
  }

  async navigate(path) {
    this.events = [];
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    await this.send('Page.navigate', { url });

    for (let i = 0; i < 160; i++) {
      const state = await this.evaluate(
        '({ ready: document.readyState, hasBody: !!document.body, textLength: document.body ? document.body.innerText.length : 0 })',
      ).catch(() => ({ hasBody: false }));

      if (state.hasBody && state.ready !== 'loading') {
        await sleep(1200);
        return;
      }
      await sleep(150);
    }
  }

  async clearAndType(selector, value) {
    await this.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      modifiers: 2,
      windowsVirtualKeyCode: 65,
      code: 'KeyA',
      key: 'a',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 2,
      windowsVirtualKeyCode: 65,
      code: 'KeyA',
      key: 'a',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      windowsVirtualKeyCode: 8,
      code: 'Backspace',
      key: 'Backspace',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 8,
      code: 'Backspace',
      key: 'Backspace',
    });
    await this.send('Input.insertText', { text: value });
  }

  summarizeNetwork() {
    const responses = this.events
      .filter((event) => event.method === 'Network.responseReceived')
      .map((event) => ({
        url: event.params.response.url,
        status: event.params.response.status,
      }));

    return {
      bad: responses.filter(
        (response) => response.status >= 400 && !response.url.includes('/_next/webpack-hmr'),
      ),
      failed: this.events
        .filter((event) => event.method === 'Network.loadingFailed')
        .map((event) => event.params.errorText),
    };
  }

  close() {
    this.ws.close();
  }
}

async function pageSnapshot(cdp) {
  return cdp.evaluate(`(() => {
    const text = document.body ? document.body.innerText : '';
    return {
      url: location.href,
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1')).map((element) => element.innerText).slice(0, 3),
      hasMit: text.includes('MIT AI Research Fellowship 2026'),
      hasNotFound: /not found|không tìm thấy/i.test(text),
      textSample: text.slice(0, 1200),
      errors: Array.from(document.querySelectorAll('[role=alert], .text-red-500, .text-red-600, .bg-danger-50'))
        .map((element) => element.innerText)
        .filter(Boolean)
        .slice(0, 8),
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      duplicateViewDetailsCards: Array.from(document.querySelectorAll('.grid-equal-height [class*=Card], .grid-equal-height article'))
        .filter((element) => (element.innerText.match(/View Details/g) || []).length > 1)
        .length
    };
  })()`);
}

async function run() {
  const target = await getPageTarget();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.open();

  const results = [];
  for (const test of [
    ['home', '/'],
    ['scholarship-list', '/user/scholarships'],
    ['scholarship-detail-1001', '/user/scholarships/1001'],
    ['login-page', '/auth/login'],
  ]) {
    await cdp.navigate(test[1]);
    results.push({
      test: test[0],
      state: await pageSnapshot(cdp),
      network: cdp.summarizeNetwork(),
    });
  }

  await cdp.navigate('/auth/login');
  await cdp.evaluate('localStorage.clear()');
  await cdp.clearAndType('input[type=email]', 'student1@edumatch.dev');
  await cdp.clearAndType('input[type=password]', 'admin123');
  const formState = await cdp.evaluate(`(() => ({
    emailOk: document.querySelector('input[type=email]').value === 'student1@edumatch.dev',
    passwordLength: document.querySelector('input[type=password]').value.length
  }))()`);
  await cdp.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((element) => /sign in|đăng nhập/i.test(element.innerText)) || document.querySelector('button[type=submit]');
    button.click();
    return true;
  })()`);
  await sleep(6500);
  results.push({
    test: 'login-student',
    formState,
    state: await cdp.evaluate(`(() => ({
      url: location.href,
      token: !!localStorage.getItem('auth_token'),
      hasUser: !!localStorage.getItem('auth_user'),
      textSample: document.body.innerText.slice(0, 1200),
      errors: Array.from(document.querySelectorAll('[role=alert], .text-red-500, .text-red-600, .bg-danger-50'))
        .map((element) => element.innerText)
        .filter(Boolean)
        .slice(0, 8)
    }))()`),
    network: cdp.summarizeNetwork(),
  });

  await cdp.navigate('/user/dashboard');
  await sleep(5000);
  results.push({
    test: 'dashboard-after-reload',
    state: await cdp.evaluate(`(() => ({
      url: location.href,
      token: !!localStorage.getItem('auth_token'),
      hasUser: !!localStorage.getItem('auth_user'),
      textSample: document.body.innerText.slice(0, 1600),
      hasSeedApplication: document.body.innerText.includes('MIT AI Research Fellowship 2026') &&
        !document.body.innerText.includes('No applications yet'),
      errors: Array.from(document.querySelectorAll('[role=alert], .text-red-500, .text-red-600, .bg-danger-50'))
        .map((element) => element.innerText)
        .filter(Boolean)
        .slice(0, 8)
    }))()`),
    network: cdp.summarizeNetwork(),
  });

  cdp.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
