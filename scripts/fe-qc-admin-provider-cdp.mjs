const BASE_URL = process.env.QC_BASE_URL || 'http://localhost:3000';
const CDP_URL = process.env.QC_CDP_URL || 'http://127.0.0.1:9222';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function getPageTarget() {
  const tabs = await getJson(`${CDP_URL}/json`);
  let page = tabs.find((tab) => tab.type === 'page' && tab.url?.startsWith(BASE_URL)) ||
    tabs.find((tab) => tab.type === 'page');

  if (!page) {
    page = await getJson(`${CDP_URL}/json/new?${encodeURIComponent(BASE_URL)}`, { method: 'PUT' });
  }

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
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
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
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
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

  async navigate(path, waitMs = 1300) {
    this.events = [];
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    await this.send('Page.navigate', { url });

    for (let i = 0; i < 180; i += 1) {
      const state = await this.evaluate(
        '({ ready: document.readyState, hasBody: !!document.body, textLength: document.body ? document.body.innerText.length : 0 })',
      ).catch(() => ({ hasBody: false }));

      if (state.hasBody && state.ready !== 'loading') {
        await sleep(waitMs);
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

async function snapshot(cdp) {
  return cdp.evaluate(`(() => {
    const text = document.body ? document.body.innerText : '';
    const badText = /not found|không tìm thấy|failed to load|error loading|service unavailable/i.test(text);
    return {
      url: location.href,
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1')).map((element) => element.innerText).slice(0, 3),
      badText,
      textSample: text.slice(0, 1300),
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      visibleErrors: Array.from(document.querySelectorAll('[role=alert], .text-red-500, .text-red-600, .bg-danger-50'))
        .map((element) => element.innerText)
        .filter(Boolean)
        .slice(0, 8)
    };
  })()`);
}

async function clearSession(cdp) {
  await cdp.navigate('/auth/login', 800);
  await cdp.evaluate(`(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
    });
    return true;
  })()`);
}

async function login(cdp, email, expectedPath) {
  await clearSession(cdp);
  await cdp.navigate('/auth/login', 800);
  await cdp.clearAndType('input[type=email]', email);
  await cdp.clearAndType('input[type=password]', 'admin123');
  await cdp.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((element) => /sign in|đăng nhập/i.test(element.innerText)) || document.querySelector('button[type=submit]');
    button.click();
    return true;
  })()`);

  for (let i = 0; i < 40; i += 1) {
    const state = await cdp.evaluate(`({
      url: location.href,
      token: !!localStorage.getItem('auth_token'),
      hasUser: !!localStorage.getItem('auth_user')
    })`);
    if (state.token && state.hasUser && state.url.includes(expectedPath)) return state;
    await sleep(250);
  }

  return cdp.evaluate(`({
    url: location.href,
    token: !!localStorage.getItem('auth_token'),
    hasUser: !!localStorage.getItem('auth_user'),
    text: document.body.innerText.slice(0, 800)
  })`);
}

async function testRoutes(cdp, routes) {
  const output = [];
  for (const [name, path] of routes) {
    await cdp.navigate(path, 1800);
    output.push({
      test: name,
      state: await snapshot(cdp),
      network: cdp.summarizeNetwork(),
    });
  }
  return output;
}

function summarize(results) {
  return results.map((result) => ({
    test: result.test,
    url: result.state?.url,
    h1: result.state?.h1,
    horizontalOverflowPx: result.state?.horizontalOverflowPx,
    badText: result.state?.badText,
    visibleErrors: result.state?.visibleErrors,
    badNetwork: result.network?.bad,
    failedNetwork: result.network?.failed,
  }));
}

async function run() {
  const target = await getPageTarget();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.open();

  const adminLogin = await login(cdp, 'admin.test@edumatch.dev', '/admin');
  const adminRoutes = await testRoutes(cdp, [
    ['admin-dashboard', '/admin/dashboard'],
    ['admin-users', '/admin/users'],
    ['admin-user-detail-1001', '/admin/users/1001'],
    ['admin-scholarships', '/admin/scholarships'],
    ['admin-scholarship-detail-1001', '/admin/scholarships/1001'],
    ['admin-applications', '/admin/applications'],
    ['admin-employer-requests', '/admin/employer-requests'],
    ['admin-analytics', '/admin/analytics'],
  ]);

  const providerLogin = await login(cdp, 'mit.provider@edumatch.dev', '/employer');
  const providerRoutes = await testRoutes(cdp, [
    ['provider-dashboard', '/employer/dashboard'],
    ['provider-scholarships', '/employer/scholarships'],
    ['provider-scholarship-create', '/employer/scholarships/create'],
    ['provider-scholarship-edit-1001', '/employer/scholarships/1001/edit'],
    ['provider-scholarship-applications-1001', '/employer/scholarships/1001/applications'],
    ['provider-applications', '/employer/applications'],
    ['provider-analytics', '/employer/analytics'],
  ]);

  cdp.close();

  const full = {
    adminLogin,
    adminRoutes,
    providerLogin,
    providerRoutes,
  };

  console.log(JSON.stringify({
    summary: {
      adminLogin,
      admin: summarize(adminRoutes),
      providerLogin,
      provider: summarize(providerRoutes),
    },
    full,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
