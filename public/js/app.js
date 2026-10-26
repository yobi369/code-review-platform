'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const authPanel = $('#auth-panel');
  const workspace = $('#workspace');
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');
  const authMessage = $('#auth-message');
  const workspaceMessage = $('#workspace-message');
  const tokenKey = 'reviewforge_session_token';
  const token = () => sessionStorage.getItem(tokenKey);

  function message(element, text, isError = false) {
    element.textContent = text || '';
    element.classList.toggle('error', Boolean(isError));
  }
  async function api(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    let response;
    try {
      response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 401 && token()) signOut(false);
      throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
    }
    return payload;
  }
  function setAuthMode(mode) {
    const registering = mode === 'register';
    loginForm.classList.toggle('hidden', registering);
    registerForm.classList.toggle('hidden', !registering);
    $('#show-login').classList.toggle('active', !registering);
    $('#show-register').classList.toggle('active', registering);
    $('#auth-title').textContent = registering ? 'Create your account' : 'Welcome back';
    $('#auth-subtitle').textContent = registering ? 'Set up a private workspace for your reviews.' : 'Sign in to continue your reviews.';
    message(authMessage, '');
  }
  function showWorkspace() {
    authPanel.classList.add('hidden');
    workspace.classList.remove('hidden');
    message(workspaceMessage, '');
    loadReviews();
  }
  function signOut(showMessage = true) {
    sessionStorage.removeItem(tokenKey);
    workspace.classList.add('hidden');
    authPanel.classList.remove('hidden');
    setAuthMode('login');
    if (showMessage) message(authMessage, 'You have signed out.');
  }
  async function withBusy(button, action, busyText) {
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    try { await action(); }
    catch (error) { throw error; }
    finally { button.disabled = false; button.textContent = oldText; }
  }

  $('#show-login').addEventListener('click', () => setAuthMode('login'));
  $('#show-register').addEventListener('click', () => setAuthMode('register'));
  $('#logout-button').addEventListener('click', () => signOut());

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    message(authMessage, '');
    const button = loginForm.querySelector('button[type="submit"]');
    try {
      await withBusy(button, async () => {
        const payload = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#login-username').value.trim(), password: $('#login-password').value }) });
        sessionStorage.setItem(tokenKey, payload.token);
        $('#login-password').value = '';
      }, 'Signing in…');
      showWorkspace();
    } catch (error) { message(authMessage, error.message, true); }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    message(authMessage, '');
    const button = registerForm.querySelector('button[type="submit"]');
    try {
      await withBusy(button, async () => {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: $('#register-username').value.trim(), password: $('#register-password').value }) });
        $('#login-username').value = $('#register-username').value.trim();
        $('#register-password').value = '';
      }, 'Creating account…');
      setAuthMode('login');
      message(authMessage, 'Account created. Sign in to open your workspace.');
    } catch (error) { message(authMessage, error.message, true); }
  });

  $('#review-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    message(workspaceMessage, '');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    try {
      await withBusy(button, async () => {
        await api('/api/review', { method: 'POST', body: JSON.stringify({ title: $('#review-title').value.trim(), description: $('#review-description').value.trim() }) });
        $('#review-form').reset();
        await loadReviews();
      }, 'Creating…');
      message(workspaceMessage, 'Review session created.');
    } catch (error) { message(workspaceMessage, error.message, true); }
  });

  $('#ai-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    message(workspaceMessage, '');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    $('#ai-result').classList.add('hidden');
    try {
      await withBusy(button, async () => {
        const payload = await api('/api/review/analyze', { method: 'POST', body: JSON.stringify({ code: $('#code-input').value }) });
        $('#ai-result-text').textContent = payload.review || 'No review text was returned.';
        $('#ai-result').classList.remove('hidden');
      }, 'Analyzing…');
    } catch (error) { message(workspaceMessage, error.message, true); }
  });

  async function loadReviews() {
    const list = $('#review-list');
    list.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'empty-state';
    loading.textContent = 'Loading your review sessions…';
    list.append(loading);
    try {
      const reviews = await api('/api/review');
      list.replaceChildren();
      if (!Array.isArray(reviews) || reviews.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No reviews yet. Create your first review session above.';
        list.append(empty);
        return;
      }
      for (const review of reviews) {
        const item = document.createElement('article');
        item.className = 'review-item';
        const main = document.createElement('div');
        const title = document.createElement('h4');
        title.textContent = review.title || 'Untitled review';
        const description = document.createElement('p');
        description.textContent = review.description || '';
        main.append(title, description);
        const date = document.createElement('time');
        date.className = 'review-date';
        const parsed = new Date(review.createdAt);
        date.dateTime = Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
        date.textContent = Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString();
        item.append(main, date);
        list.append(item);
      }
    } catch (error) {
      list.replaceChildren();
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = error.message;
      list.append(empty);
    }
  }

  $('#refresh-reviews').addEventListener('click', loadReviews);
  $('#code-input').addEventListener('input', (event) => {
    $('#code-count').textContent = `${event.currentTarget.value.length.toLocaleString()} / 20,000`;
  });

  if (token()) showWorkspace();
  else setAuthMode('login');
})();
