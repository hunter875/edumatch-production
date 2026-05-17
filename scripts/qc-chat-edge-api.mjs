const API_ROOT = process.env.QC_API_ROOT || 'http://localhost:19080';
const CHAT_HEALTH_PATH = '/api/v1/chat/health';
const CHAT_CONVERSATIONS_PATH = '/api/v1/chat/conversations';
const CHAT_MESSAGES_PATH = (conversationId) => `/api/v1/chat/conversations/${conversationId}/messages`;
const CHAT_SEND_PATH = '/api/v1/chat/messages';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep non-JSON body as text.
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function login(username, password = 'admin123') {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok || !response.body?.accessToken) {
    throw new Error(`Login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body.accessToken;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function stompConnect({ token, timeoutMs = 2500 } = {}) {
  const wsUrl = `${API_ROOT.replace(/^http/, 'ws')}/api/ws`;
  const ws = new WebSocket(wsUrl);
  const frames = [];

  return new Promise((resolve) => {
    const finish = (result) => {
      try {
        ws.close();
      } catch {
        // Ignore close errors during cleanup.
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        connected: false,
        timedOut: true,
        frames,
      });
    }, timeoutMs);

    ws.onopen = () => {
      const headers = [
        'CONNECT',
        'accept-version:1.2',
        'heart-beat:0,0',
      ];
      if (token) headers.push(`TOKEN_AUTH:Bearer ${token}`);
      ws.send(`${headers.join('\n')}\n\n\0`);
    };

    ws.onmessage = (event) => {
      const data = String(event.data);
      frames.push(data.replace(/\0/g, '\\0'));
      clearTimeout(timer);
      finish({
        connected: data.startsWith('CONNECTED'),
        error: data.startsWith('ERROR'),
        frames,
      });
    };

    ws.onerror = () => {
      clearTimeout(timer);
      finish({
        connected: false,
        socketError: true,
        frames,
      });
    };

    ws.onclose = () => {
      clearTimeout(timer);
      if (frames.length === 0) {
        finish({
          connected: false,
          closedBeforeFrame: true,
          frames,
        });
      }
    };
  });
}

async function stompSubscribe({ token, destination, timeoutMs = 3500 }) {
  const wsUrl = `${API_ROOT.replace(/^http/, 'ws')}/api/ws`;
  const ws = new WebSocket(wsUrl);
  const frames = [];
  let connected = false;

  return new Promise((resolve) => {
    const finish = (result) => {
      try {
        ws.close();
      } catch {
        // Ignore close errors during cleanup.
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        connected,
        errored: frames.some((frame) => frame.startsWith('ERROR')),
        timedOut: true,
        frames,
      });
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(`CONNECT\naccept-version:1.2\nheart-beat:0,0\nTOKEN_AUTH:Bearer ${token}\n\n\0`);
    };

    ws.onmessage = (event) => {
      const data = String(event.data);
      frames.push(data.replace(/\0/g, '\\0'));

      if (data.startsWith('CONNECTED')) {
        connected = true;
        ws.send(`SUBSCRIBE\nid:qc-sub\ndestination:${destination}\n\n\0`);
        return;
      }

      if (data.startsWith('ERROR')) {
        clearTimeout(timer);
        finish({
          connected,
          errored: true,
          frames,
        });
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      finish({
        connected,
        socketError: true,
        frames,
      });
    };

    ws.onclose = () => {
      if (!connected || frames.some((frame) => frame.startsWith('ERROR'))) return;
      clearTimeout(timer);
      finish({
        connected,
        closed: true,
        frames,
      });
    };
  });
}

function summarizeBody(body) {
  if (!body) return body;
  if (typeof body === 'string') return body.slice(0, 240);
  if (Array.isArray(body)) return { type: 'array', length: body.length, sample: body.slice(0, 2) };
  if (body.content && Array.isArray(body.content)) {
    return {
      type: 'page',
      totalElements: body.totalElements,
      totalPages: body.totalPages,
      contentLength: body.content.length,
      sample: body.content.slice(0, 2),
    };
  }
  return body;
}

async function run() {
  const startedAt = new Date().toISOString();
  const studentToken = await login('student1@edumatch.dev');
  const student2Token = await login('student2@edumatch.dev');
  const providerToken = await login('mit.provider@edumatch.dev');
  const messageText = `QC edge chat ${Date.now()}`;

  const tests = [];
  const add = async (name, fn) => {
    try {
      const result = await fn();
      tests.push({ name, ...result });
    } catch (error) {
      tests.push({ name, error: error.message });
    }
  };

  await add('chat-health-public', async () => {
    const response = await request(CHAT_HEALTH_PATH);
    return { expected: 200, status: response.status, body: summarizeBody(response.body) };
  });

  await add('conversations-unauthorized', async () => {
    const response = await request(CHAT_CONVERSATIONS_PATH);
    return { expected: 401, status: response.status, body: summarizeBody(response.body) };
  });

  await add('send-message-unauthorized', async () => {
    const response = await request(CHAT_SEND_PATH, {
      method: 'POST',
      body: JSON.stringify({ receiverId: 2001, content: 'should not send' }),
    });
    return { expected: 401, status: response.status, body: summarizeBody(response.body) };
  });

  let validMessage;
  await add('send-message-valid-student-to-provider', async () => {
    const response = await request(CHAT_SEND_PATH, {
      method: 'POST',
      headers: auth(studentToken),
      body: JSON.stringify({ receiverId: 2001, content: messageText }),
    });
    validMessage = response.body;
    return {
      expected: 200,
      status: response.status,
      saved: {
        id: response.body?.id,
        conversationId: response.body?.conversationId,
        senderId: response.body?.senderId,
        content: response.body?.content,
      },
    };
  });

  await sleep(500);

  await add('provider-conversations-include-message', async () => {
    const response = await request(CHAT_CONVERSATIONS_PATH, { headers: auth(providerToken) });
    const conversations = Array.isArray(response.body) ? response.body : [];
    const match = conversations.find((item) => item.conversationId === validMessage?.conversationId);
    return {
      expected: 200,
      status: response.status,
      conversationCount: conversations.length,
      matchedConversation: match || null,
    };
  });

  await add('provider-read-valid-conversation', async () => {
    const response = await request(`${CHAT_MESSAGES_PATH(validMessage?.conversationId)}?page=0&size=10`, {
      headers: auth(providerToken),
    });
    const content = response.body?.content || [];
    return {
      expected: 200,
      status: response.status,
      contentLength: content.length,
      containsSentMessage: content.some((item) => item.content === messageText),
      body: summarizeBody(response.body),
    };
  });

  await add('other-student-read-foreign-conversation', async () => {
    const response = await request(`${CHAT_MESSAGES_PATH(validMessage?.conversationId)}?page=0&size=10`, {
      headers: auth(student2Token),
    });
    return { expected: 403, status: response.status, body: summarizeBody(response.body) };
  });

  await add('send-message-empty-content', async () => {
    const response = await request(CHAT_SEND_PATH, {
      method: 'POST',
      headers: auth(studentToken),
      body: JSON.stringify({ receiverId: 2001, content: '' }),
    });
    return {
      expected: '4xx validation error',
      status: response.status,
      savedUnexpectedly: response.ok,
      body: summarizeBody(response.body),
    };
  });

  await add('send-message-missing-receiver', async () => {
    const response = await request(CHAT_SEND_PATH, {
      method: 'POST',
      headers: auth(studentToken),
      body: JSON.stringify({ content: 'missing receiver edge case' }),
    });
    return {
      expected: '4xx validation error',
      status: response.status,
      savedUnexpectedly: response.ok,
      body: summarizeBody(response.body),
    };
  });

  await add('send-message-nonexistent-receiver', async () => {
    const response = await request(CHAT_SEND_PATH, {
      method: 'POST',
      headers: auth(studentToken),
      body: JSON.stringify({ receiverId: 999999, content: 'nonexistent receiver edge case' }),
    });
    return {
      expected: '4xx receiver validation error',
      status: response.status,
      savedUnexpectedly: response.ok,
      body: summarizeBody(response.body),
    };
  });

  await add('notifications-unauthorized', async () => {
    const response = await request('/api/notifications');
    return { expected: 401, status: response.status, body: summarizeBody(response.body) };
  });

  await add('notifications-student-page', async () => {
    const response = await request('/api/notifications?page=0&size=5', {
      headers: auth(studentToken),
    });
    return { expected: 200, status: response.status, body: summarizeBody(response.body) };
  });

  await add('mark-nonexistent-notification-read', async () => {
    const response = await request('/api/notifications/999999/read', {
      method: 'PATCH',
      headers: auth(studentToken),
    });
    return { expected: 404, status: response.status, body: summarizeBody(response.body) };
  });

  await add('stomp-connect-no-token', async () => {
    const response = await stompConnect();
    return { expected: 'reject', ...response };
  });

  await add('stomp-connect-valid-token', async () => {
    const response = await stompConnect({ token: studentToken });
    return { expected: 'CONNECTED', ...response };
  });

  await add('stomp-subscribe-other-user-topic', async () => {
    const response = await stompSubscribe({
      token: studentToken,
      destination: '/topic/messages/2001',
    });
    return { expected: 'reject', ...response };
  });

  console.log(JSON.stringify({ startedAt, apiRoot: API_ROOT, tests }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
