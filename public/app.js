const messagesEl = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const newChatBtn = document.getElementById('new-chat');

let history = [];
let streaming = false;

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Minimal markdown: fenced code blocks, inline code, bold, italic.
function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => `<pre><code>${code.trimEnd()}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function addMessage(role, text) {
  const welcome = messagesEl.querySelector('.welcome');
  if (welcome) welcome.remove();

  const el = document.createElement('div');
  el.className = `msg ${role}`;
  if (role === 'user' || role === 'error') {
    el.textContent = text;
  } else {
    el.innerHTML = renderMarkdown(text);
  }
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function showTyping(el) {
  el.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
}

function setStreaming(on) {
  streaming = on;
  sendBtn.disabled = on;
  input.disabled = on;
  if (!on) input.focus();
}

async function sendMessage(text) {
  history.push({ role: 'user', text });
  addMessage('user', text);

  const assistantEl = addMessage('assistant', '');
  showTyping(assistantEl);
  setStreaming(true);

  let reply = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!event.startsWith('data:')) continue;
        const payload = JSON.parse(event.slice(5).trim());
        if (payload.error) throw new Error(payload.error);
        if (payload.text) {
          reply += payload.text;
          assistantEl.innerHTML = renderMarkdown(reply);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }
    }

    if (!reply) throw new Error('Empty response from the model');
    history.push({ role: 'assistant', text: reply });
  } catch (err) {
    assistantEl.remove();
    if (reply) history.push({ role: 'assistant', text: reply });
    addMessage('error', `⚠ ${err.message}`);
  } finally {
    setStreaming(false);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || streaming) return;
  input.value = '';
  input.style.height = 'auto';
  sendMessage(text);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});

newChatBtn.addEventListener('click', () => {
  if (streaming) return;
  history = [];
  messagesEl.innerHTML = `
    <div class="welcome">
      <span class="logo big">✦</span>
      <h2>How can I help you today?</h2>
      <p>Powered by Google Gemini</p>
    </div>`;
  input.focus();
});
