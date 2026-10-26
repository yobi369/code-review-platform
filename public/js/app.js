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
  let activeSocket = null;
  let activeReviewId = null;
  let socketAuthenticated = false;

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
    if (activeSocket) { activeSocket.close(1000, 'Signed out'); activeSocket = null; }
    activeReviewId = null;
    socketAuthenticated = false;
    $('#collab-panel').classList.add('hidden');
    $('#send-comment').disabled = true;
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
        const actions = document.createElement('div');
        actions.className = 'review-actions';
        const openRoom = document.createElement('button');
        openRoom.type = 'button';
        openRoom.className = 'button secondary open-room';
        openRoom.textContent = 'Open live room →';
        openRoom.setAttribute('aria-label', 'Open live room for ' + (review.title || 'review'));
        openRoom.addEventListener('click', () => openCollaboration(review));
        actions.append(openRoom);
        item.append(main, date, actions);
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


  function appendComment(comment) {
    const list = $('#comment-list');
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();
    const item = document.createElement('article');
    item.className = 'comment-item';
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const author = document.createElement('strong');
    author.textContent = comment.username || 'Reviewer';
    const time = document.createElement('time');
    const date = new Date(comment.createdAt);
    if (!Number.isNaN(date.getTime())) {
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleString();
    }
    meta.append(author, time);
    const text = document.createElement('p');
    text.textContent = comment.text || '';
    item.append(meta, text);
    list.append(item);
    list.scrollTop = list.scrollHeight;
  }

  function openCollaboration(review) {
    if (activeSocket) activeSocket.close(1000, 'Switching review room');
    activeReviewId = String(review._id);
    socketAuthenticated = false;
    $('#send-comment').disabled = true;
    $('#collab-panel').classList.remove('hidden');
    $('#collab-review-title').textContent = review.title || 'Live review room';
    $('#collab-status').textContent = 'Connecting securely…';
    $('#collab-status').classList.remove('collab-status-live');
    $('#comment-list').replaceChildren();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(protocol + '//' + window.location.host + '/ws');
    activeSocket = socket;
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'authenticate', token: token(), reviewId: activeReviewId }));
    });
    socket.addEventListener('message', (event) => {
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (payload.type === 'authenticated') {
        socketAuthenticated = true;
        $('#send-comment').disabled = false;
        $('#collab-review-title').textContent = payload.reviewTitle || review.title || 'Live review room';
        $('#collab-status').textContent = 'Connected · comments sync live';
        $('#collab-status').classList.add('collab-status-live');
        $('#comment-list').replaceChildren();
        if (Array.isArray(payload.comments) && payload.comments.length) payload.comments.forEach(appendComment);
        else {
          const empty = document.createElement('p');
          empty.className = 'empty-state';
          empty.textContent = 'No comments yet. Start the discussion.';
          $('#comment-list').append(empty);
        }
      } else if (payload.type === 'comment' && payload.comment) {
        appendComment(payload.comment);
      } else if (payload.type === 'presence') {
        $('#collab-status').textContent = payload.state === 'joined' ? 'Connected · ' + payload.username + ' joined' : 'Connected · ' + payload.username + ' left';
      } else if (payload.type === 'access_revoked') {
        $('#collab-status').textContent = 'Your access to this review has been revoked.';
        socket.close(1008, 'Access revoked');
      } else if (payload.type === 'error') {
        message(workspaceMessage, payload.error || 'Collaboration error', true);
      }
    });
    socket.addEventListener('close', (event) => {
      if (activeSocket !== socket) return;
      socketAuthenticated = false;
      $('#send-comment').disabled = true;
      $('#collab-status').classList.remove('collab-status-live');
      $('#collab-status').textContent = event.code === 1000 ? 'Room disconnected' : 'Connection closed. Reopen the room to reconnect.';
    });
    socket.addEventListener('error', () => {
      $('#collab-status').textContent = 'Could not connect to the live room.';
    });
    $('#collab-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#comment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = $('#comment-input').value.trim();
    if (!text || text.length > 2000 || !activeSocket || activeSocket.readyState !== WebSocket.OPEN || !socketAuthenticated) {
      message(workspaceMessage, 'Connect to a review room before sending a comment.', true);
      return;
    }
    activeSocket.send(JSON.stringify({ type: 'comment', text }));
    $('#comment-input').value = '';
    message(workspaceMessage, 'Comment sent.');
  });

  $('#invite-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeReviewId) return message(workspaceMessage, 'Open a review room before inviting a collaborator.', true);
    const username = $('#invite-username').value.trim();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    try {
      await withBusy(button, async () => {
        const result = await api('/api/review/' + encodeURIComponent(activeReviewId) + '/collaborators', {
          method: 'POST',
          body: JSON.stringify({ username })
        });
        $('#invite-form').reset();
        message(workspaceMessage, 'Collaborator ' + result.username + ' added. They can now open this review from their workspace.');
      }, 'Inviting…');
    } catch (error) {
      message(workspaceMessage, error.message, true);
    }
  });

  $('#remove-collaborator-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeReviewId) return message(workspaceMessage, 'Open a review room first.', true);
    const username = $('#remove-username').value.trim();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    try {
      await withBusy(button, async () => {
        await api('/api/review/' + encodeURIComponent(activeReviewId) + '/collaborators/' + encodeURIComponent(username), { method: 'DELETE' });
        $('#remove-collaborator-form').reset();
        message(workspaceMessage, 'Access revoked for ' + username + '.');
      }, 'Revoking…');
    } catch (error) {
      message(workspaceMessage, error.message, true);
    }
  });
  $('#close-collab').addEventListener('click', () => {
    if (activeSocket) { activeSocket.close(1000, 'Room closed'); activeSocket = null; }
    activeReviewId = null;
    socketAuthenticated = false;
    $('#send-comment').disabled = true;
    $('#collab-panel').classList.add('hidden');
  });
  $('#refresh-reviews').addEventListener('click', loadReviews);
  $('#code-input').addEventListener('input', (event) => {
    $('#code-count').textContent = `${event.currentTarget.value.length.toLocaleString()} / 20,000`;
  });

  if (token()) showWorkspace();
  else setAuthMode('login');
})();
