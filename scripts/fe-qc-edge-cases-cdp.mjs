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
  let page =
    tabs.find((tab) => tab.type === 'page' && tab.url?.startsWith(BASE_URL)) ||
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

  async navigate(path, waitMs = 1500) {
    this.events = [];
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    await this.send('Page.navigate', { url });

    for (let i = 0; i < 160; i += 1) {
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
    return {
      url: location.href,
      h1: Array.from(document.querySelectorAll('h1')).map((element) => element.innerText).slice(0, 3),
      hasLoginRequired: /login required|please login/i.test(text),
      hasNotFound: /not found|khÃ´ng tÃ¬m tháº¥y|khong tim thay|không tìm thấy/i.test(text),
      hasAccessDenied: /access denied|forbidden|unauthorized|khÃ´ng cÃ³ quyá»n|không có quyền/i.test(text),
      visibleErrors: Array.from(document.querySelectorAll('[role=alert], .text-red-500, .text-red-600, .bg-danger-50'))
        .map((element) => element.innerText)
        .filter(Boolean)
        .slice(0, 10),
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      textSample: text.slice(0, 1000)
    };
  })()`);
}

async function clearSession(cdp) {
  await cdp.navigate('/auth/login', 700);
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
      .find((element) => /sign in|Ä‘Äƒng nháº­p/i.test(element.innerText)) || document.querySelector('button[type=submit]');
    button.click();
    return true;
  })()`);

  for (let i = 0; i < 50; i += 1) {
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

async function captureRoute(cdp, name, path, waitMs = 1600) {
  await cdp.navigate(path, waitMs);
  return {
    name,
    requestedPath: path,
    state: await snapshot(cdp),
    network: cdp.summarizeNetwork(),
  };
}

async function invalidLogin(cdp) {
  await clearSession(cdp);
  await cdp.navigate('/auth/login', 700);
  await cdp.clearAndType('input[type=email]', 'student1@edumatch.dev');
  await cdp.clearAndType('input[type=password]', 'wrong-password');
  await cdp.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((element) => /sign in|Ä‘Äƒng nháº­p/i.test(element.innerText)) || document.querySelector('button[type=submit]');
    button.click();
    return true;
  })()`);
  await sleep(3000);
  return {
    name: 'invalid-login',
    state: await snapshot(cdp),
    token: await cdp.evaluate('!!localStorage.getItem("auth_token")'),
    network: cdp.summarizeNetwork(),
  };
}

async function providerCreateEmptySubmit(cdp) {
  await cdp.navigate('/employer/scholarships/create', 1600);
  const before = await snapshot(cdp);
  const formState = await cdp.evaluate(`(() => {
    const form = document.querySelector('form');
    const submit = document.querySelector('button[type=submit]') ||
      Array.from(document.querySelectorAll('button')).find((button) => /create|submit|save|táº¡o|lÆ°u/i.test(button.innerText));
    const requiredFields = Array.from(document.querySelectorAll('input[required], textarea[required], select[required]')).length;
    const validBefore = form ? form.checkValidity() : null;
    if (submit) submit.click();
    const validAfter = form ? form.checkValidity() : null;
    return {
      hasForm: !!form,
      hasSubmit: !!submit,
      requiredFields,
      validBefore,
      validAfter
    };
  })()`);
  await sleep(2200);
  return {
    name: 'provider-create-empty-submit',
    before,
    formState,
    state: await snapshot(cdp),
    network: cdp.summarizeNetwork(),
  };
}

function compact(items) {
  return items.map((item) => ({
    name: item.name,
    requestedPath: item.requestedPath,
    finalUrl: item.state?.url,
    h1: item.state?.h1,
    hasLoginRequired: item.state?.hasLoginRequired,
    hasNotFound: item.state?.hasNotFound,
    hasAccessDenied: item.state?.hasAccessDenied,
    horizontalOverflowPx: item.state?.horizontalOverflowPx,
    visibleErrors: item.state?.visibleErrors,
    badNetwork: item.network?.bad,
    failedNetwork: item.network?.failed,
  }));
}

async function run() {
  const target = await getPageTarget();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.open();

  const results = [];

  await clearSession(cdp);
  for (const [name, path] of [
    ['logged-out-admin-dashboard', '/admin/dashboard'],
    ['logged-out-employer-dashboard', '/employer/dashboard'],
    ['logged-out-user-dashboard', '/user/dashboard'],
    ['logged-out-messages', '/messages'],
  ]) {
    results.push(await captureRoute(cdp, name, path));
  }

  results.push(await invalidLogin(cdp));

  const studentLogin = await login(cdp, 'student1@edumatch.dev', '/user');
  for (const [name, path] of [
    ['student-admin-users', '/admin/users'],
    ['student-employer-scholarships', '/employer/scholarships'],
    ['student-nonexistent-scholarship', '/user/scholarships/999999'],
    ['student-messages', '/messages'],
  ]) {
    results.push(await captureRoute(cdp, name, path, 2200));
  }

  const providerLogin = await login(cdp, 'mit.provider@edumatch.dev', '/employer');
  for (const [name, path] of [
    ['provider-admin-users', '/admin/users'],
    ['provider-user-dashboard', '/user/dashboard'],
    ['provider-nonexistent-edit', '/employer/scholarships/999999/edit'],
    ['provider-nonexistent-applications', '/employer/scholarships/999999/applications'],
  ]) {
    results.push(await captureRoute(cdp, name, path, 2200));
  }
  results.push(await providerCreateEmptySubmit(cdp));

  const adminLogin = await login(cdp, 'admin.test@edumatch.dev', '/admin');
  for (const [name, path] of [
    ['admin-user-dashboard', '/user/dashboard'],
    ['admin-employer-dashboard', '/employer/dashboard'],
    ['admin-nonexistent-user', '/admin/users/999999'],
    ['admin-nonexistent-scholarship', '/admin/scholarships/999999'],
  ]) {
    results.push(await captureRoute(cdp, name, path, 2200));
  }

  cdp.close();

  console.log(JSON.stringify({
    logins: { studentLogin, providerLogin, adminLogin },
    summary: compact(results),
    full: results,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
