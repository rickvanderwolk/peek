(function() {
  if (new URLSearchParams(location.search).get('peek') !== '1') return;

  // State
  let logs = [];
  let requests = [];
  let filter = 'error';
  let netFilter = 'all';
  let activePanel = 'console';
  let customHeight = null;
  let isResizing = false;
  let wasFullscreen = false;

  // CSS
  const css = `
    #peek{position:fixed;bottom:0;left:0;right:0;height:33vh;background:#0f0f0f;color:#e8e8e8;font:11px ui-monospace,SFMono-Regular,SF Mono,Menlo,Monaco,Consolas,monospace;z-index:999999;display:flex;flex-direction:column;box-shadow:0 -2px 10px rgba(0,0,0,.5)}
    #peek.collapsed{height:32px}
    #peek.collapsed #peek-content,#peek.collapsed #peek-input,#peek.collapsed #peek-filters{display:none}
    #peek.fullscreen{height:100%;top:0}
    #peek-resize{height:6px;cursor:ns-resize;background:#2a2a2a;touch-action:none}
    #peek-resize:hover{background:#3a7eff}
    #peek-bar{display:flex;background:#1a1a1a;border-bottom:1px solid #2a2a2a;height:28px}
    #peek-bar button{background:0;color:#999;border:none;border-radius:0;padding:0 12px;cursor:pointer;font:inherit;border-bottom:2px solid transparent;transition:.15s}
    #peek-bar button:hover{color:#fff;background:rgba(255,255,255,.05)}
    #peek-bar button.on{color:#fff;border-bottom-color:#3a7eff}
    #peek-bar [data-p]{font-weight:500}
    #peek-bar .icon{padding:0 8px;font-size:13px}
    .spacer{flex:1}
    #peek-filters{display:flex;gap:2px;padding:4px 8px;background:#141414;border-bottom:1px solid #2a2a2a}
    #peek-filters button{background:0;color:#888;border:none;padding:3px 8px;cursor:pointer;font:10px inherit;transition:.15s}
    #peek-filters button:hover{background:rgba(255,255,255,.08);color:#ccc}
    #peek-filters button.on{background:rgba(58,126,255,.2);color:#6cb2ff}
    #peek[data-p=storage] #peek-filters,#peek[data-p=network] #peek-filters{display:none}
    .cnt{background:rgba(255,255,255,.15);padding:1px 5px;border-radius:10px;font-size:9px;margin-left:4px}
    .cnt-error{background:rgba(255,85,85,.3);color:#ff8888}
    .cnt-warn{background:rgba(255,200,0,.25);color:#ffd666}
    .cnt-info{background:rgba(58,126,255,.25);color:#6cb2ff}
    #peek-content{flex:1;overflow:hidden;display:flex;flex-direction:column}
    #peek-logs,#peek-storage,#peek-network{flex:1;overflow-y:auto}
    #peek-storage,#peek-network{display:none;padding:8px}
    #peek[data-p=storage] #peek-logs,#peek[data-p=storage] #peek-input{display:none}
    #peek[data-p=storage] #peek-storage{display:block}
    #peek[data-p=network] #peek-logs,#peek[data-p=network] #peek-input{display:none}
    #peek[data-p=network] #peek-network{display:block}
    #peek[data-p=network] #peek-net-filters{display:flex}
    #peek-net-filters{display:none;gap:2px;padding:4px 8px;background:#141414;border-bottom:1px solid #2a2a2a}
    #peek-net-filters button{background:0;color:#888;border:none;padding:3px 8px;cursor:pointer;font:10px inherit;transition:.15s}
    #peek-net-filters button:hover{background:rgba(255,255,255,.08);color:#ccc}
    #peek-net-filters button.on{background:rgba(58,126,255,.2);color:#6cb2ff}
    .req{border-bottom:1px solid #1a1a1a;cursor:pointer}
    .req:hover{background:rgba(255,255,255,.02)}
    .req-row{padding:6px 12px;display:flex;align-items:center;gap:8px}
    .req-status{min-width:32px;text-align:center;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:500}
    .req-2xx{background:rgba(80,200,120,.2);color:#5c6}
    .req-3xx{background:rgba(100,150,255,.2);color:#6af}
    .req-4xx{background:rgba(255,180,0,.2);color:#fa0}
    .req-5xx{background:rgba(255,85,85,.2);color:#f88}
    .req-err{background:rgba(255,85,85,.3);color:#f88}
    .req-method{color:#c792ea;min-width:32px;font-size:10px}
    .req-url{flex:1;color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .req-meta{color:#666;font-size:10px;white-space:nowrap}
    .req-detail{display:none;padding:8px 12px;background:#141414;border-top:1px solid #1a1a1a;word-break:break-all;color:#6cb2ff;font-size:10px}
    .req.open .req-detail{display:block}
    .req.open .req-url{white-space:normal;word-break:break-all}
    @media(min-width:600px){.req-detail{display:none!important}.req-url{white-space:normal;word-break:break-all}}
    .log{padding:4px 12px;border-bottom:1px solid #1a1a1a;white-space:pre-wrap;word-break:break-all;line-height:1.4;display:flex}
    .log:hover{background:rgba(255,255,255,.02)}
    .log-debug{color:#888}
    .log-log{color:#e8e8e8}
    .log-info{color:#6cb2ff}
    .log-warn{color:#ffd666;background:rgba(255,200,0,.08);border-left:2px solid #ffd666}
    .log-error{color:#ff8888;background:rgba(255,85,85,.08);border-left:2px solid #ff8888}
    .log-icon{margin-right:8px;width:14px;text-align:center;opacity:.6}
    .log-time{color:#555;margin-right:12px;font-size:10px}
    .log-msg{flex:1;min-width:0}
    #peek-input{display:flex;border-top:1px solid #2a2a2a;background:#141414}
    #peek-input span{color:#3a7eff;padding:8px 4px 8px 12px;font-size:12px}
    #peek-input input{flex:1;background:0;color:#e8e8e8;border:none;padding:8px 12px 8px 4px;font:inherit;outline:none}
    #peek-input input::placeholder{color:#555}
    .sh{margin-bottom:12px}
    .sh-head{color:#6cb2ff;padding:4px 0;cursor:pointer;user-select:none;font-weight:500}
    .sh-head:hover{color:#8ec5ff}
    .sh-items{padding-left:12px}
    .si{padding:2px 0;cursor:pointer;display:flex;flex-wrap:wrap}
    .si:hover>.si-key,.si:hover>.si-tog{background:rgba(255,255,255,.05)}
    .si-key{color:#c792ea}
    .si-tog{color:#555;width:12px;text-align:center}
    .si-empty{color:#555;font-style:italic}
    .si-ch{width:100%;padding-left:12px;border-left:1px solid #2a2a2a;margin-left:5px}
    .si-pre{margin-left:6px}
    .v-str{color:#c3e88d}
    .v-num{color:#f78c6c}
    .v-bool{color:#89ddff}
    .v-null{color:#555}
    .v-brk{color:#888}
  `;

  // HTML
  const html = `
    <div id="peek-resize"></div>
    <div id="peek-bar">
      <button data-p="console" class="on">Console</button>
      <button data-p="network">Network</button>
      <button data-p="storage">Storage</button>
      <span class="spacer"></span>
      <button id="peek-clear" class="icon" title="Clear">🗑</button>
      <button id="peek-full" class="icon" title="Fullscreen">⤢</button>
      <button id="peek-min" class="icon" title="Minimize">−</button>
    </div>
    <div id="peek-filters">
      <button data-f="all">All <span class="cnt" id="c-all">0</span></button>
      <button data-f="error" class="on">Err <span class="cnt cnt-error" id="c-error">0</span></button>
      <button data-f="warn">Warn <span class="cnt cnt-warn" id="c-warn">0</span></button>
      <button data-f="info">Info <span class="cnt cnt-info" id="c-info">0</span></button>
      <button data-f="log">Log <span class="cnt" id="c-log">0</span></button>
      <button data-f="debug">Debug <span class="cnt" id="c-debug">0</span></button>
    </div>
    <div id="peek-net-filters">
      <button data-nf="all" class="on">All</button>
      <button data-nf="fetch">Fetch/XHR</button>
      <button data-nf="script">JS</button>
      <button data-nf="css">CSS</button>
      <button data-nf="img">Img</button>
      <button data-nf="font">Font</button>
      <button data-nf="other">Other</button>
    </div>
    <div id="peek-content">
      <div id="peek-logs"></div>
      <div id="peek-network"></div>
      <div id="peek-storage"></div>
    </div>
    <div id="peek-input">
      <span>›</span>
      <input placeholder="Enter JavaScript...">
    </div>
  `;

  // Create container
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'peek';
  el.dataset.p = 'console';
  el.innerHTML = html;
  document.body.appendChild(el);

  // Cache elements
  const $ = id => document.getElementById(id);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);
  const logsEl = $('peek-logs');
  const storageEl = $('peek-storage');
  const networkEl = $('peek-network');
  const inputEl = el.querySelector('#peek-input input');

  const icons = { debug: '·', log: '▸', info: 'ⓘ', warn: '⚠', error: '✕' };

  // Helpers
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const time = () => new Date().toTimeString().slice(0, 8);

  const fmt = args => args.map(a => {
    if (typeof a === 'object') try { return JSON.stringify(a, null, 2); } catch(e) {}
    return String(a);
  }).join(' ');

  // Render
  function render() {
    const list = filter === 'all' ? logs : logs.filter(l => l.type === filter);
    logsEl.innerHTML = list.map(l => `
      <div class="log log-${l.type}">
        <span class="log-icon">${icons[l.type]}</span>
        <span class="log-time">${l.time}</span>
        <span class="log-msg">${esc(l.msg)}</span>
      </div>
    `).join('');
    logsEl.scrollTop = logsEl.scrollHeight;

    // Update counts
    const c = { all: logs.length, debug: 0, log: 0, info: 0, warn: 0, error: 0 };
    logs.forEach(l => c[l.type]++);
    for (const t in c) $('c-' + t).textContent = c[t];
  }

  // Storage rendering
  function renderVal(v, d = 0) {
    if (d > 10) return '<span class="v-null">...</span>';
    if (v === null) return '<span class="v-null">null</span>';
    if (v === undefined) return '<span class="v-null">undefined</span>';
    if (typeof v === 'boolean') return `<span class="v-bool">${v}</span>`;
    if (typeof v === 'number') return `<span class="v-num">${v}</span>`;
    if (typeof v === 'string') return `<span class="v-str">"${esc(v)}"</span>`;

    const isArr = Array.isArray(v);
    const keys = isArr ? v : Object.keys(v);
    if (keys.length === 0) return `<span class="v-brk">${isArr ? '[]' : '{}'}</span>`;

    return (isArr ? v : Object.entries(v)).map((item, i) => {
      const [k, val] = isArr ? [i, item] : item;
      const exp = typeof val === 'object' && val !== null;
      return `
        <div class="si">
          <span class="si-tog">${exp ? '▶' : ' '}</span>
          <span class="si-key">${esc(k)}:</span>
          <span class="si-pre">${preview(val)}</span>
          ${exp ? `<div class="si-ch" style="display:none">${renderVal(val, d + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function preview(v) {
    if (v === null) return '<span class="v-null">null</span>';
    if (v === undefined) return '<span class="v-null">undefined</span>';
    if (typeof v === 'boolean') return `<span class="v-bool">${v}</span>`;
    if (typeof v === 'number') return `<span class="v-num">${v}</span>`;
    if (typeof v === 'string') return `<span class="v-str">"${esc(v.length > 50 ? v.slice(0, 50) + '...' : v)}"</span>`;
    if (Array.isArray(v)) return `<span class="v-brk">Array(${v.length})</span>`;
    if (typeof v === 'object') return `<span class="v-brk">{${Object.keys(v).length}}</span>`;
    return esc(String(v));
  }

  function parseCookies() {
    if (!document.cookie) return [];
    return document.cookie.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return { key: k, value: decodeURIComponent(v.join('=')) };
    });
  }

  function renderStorage() {
    const section = (name, store) => {
      let items = '';
      if (store.length === 0) {
        items = '<div class="si-empty">(empty)</div>';
      } else {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          let v = store.getItem(k);
          try { v = JSON.parse(v); } catch(e) {}
          items += `
            <div class="si">
              <span class="si-tog">▶</span>
              <span class="si-key">${esc(k)}:</span>
              <span class="si-pre">${preview(v)}</span>
              <div class="si-ch" style="display:none">${renderVal(v)}</div>
            </div>
          `;
        }
      }
      return `<div class="sh"><div class="sh-head">▼ ${name} (${store.length})</div><div class="sh-items">${items}</div></div>`;
    };

    const cookies = parseCookies();
    let cookieItems = '';
    if (cookies.length === 0) {
      cookieItems = '<div class="si-empty">(empty)</div>';
    } else {
      cookies.forEach(c => {
        let v = c.value;
        try { v = JSON.parse(v); } catch(e) {}
        const exp = typeof v === 'object' && v !== null;
        cookieItems += `
          <div class="si">
            <span class="si-tog">${exp ? '▶' : ' '}</span>
            <span class="si-key">${esc(c.key)}:</span>
            <span class="si-pre">${preview(v)}</span>
            ${exp ? `<div class="si-ch" style="display:none">${renderVal(v)}</div>` : ''}
          </div>
        `;
      });
    }
    const cookieSection = `<div class="sh"><div class="sh-head">▼ Cookies (${cookies.length})</div><div class="sh-items">${cookieItems}</div></div>`;

    storageEl.innerHTML = cookieSection + section('localStorage', localStorage) + section('sessionStorage', sessionStorage);
  }

  // Network rendering
  function getReqType(r) {
    if (r.type === 'fetch' || r.type === 'xmlhttprequest') return 'fetch';
    if (r.type === 'script') return 'script';
    if (r.type === 'css' || r.type === 'link') return 'css';
    if (r.type === 'img' || r.type === 'image') return 'img';
    if (r.type === 'font') return 'font';
    return 'other';
  }

  function getStatusClass(s) {
    if (!s || s === 0) return 'req-err';
    if (s >= 200 && s < 300) return 'req-2xx';
    if (s >= 300 && s < 400) return 'req-3xx';
    if (s >= 400 && s < 500) return 'req-4xx';
    return 'req-5xx';
  }

  function formatSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatTime(ms) {
    if (!ms && ms !== 0) return '-';
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
  }

  function getFileName(url) {
    try {
      const u = new URL(url);
      const file = u.pathname.split('/').pop() || '/';
      // If filename is short/just a number, show path
      if (file.length < 5 || /^\d+$/.test(file)) {
        const path = u.pathname;
        return path.length > 50 ? '...' + path.slice(-47) : path;
      }
      return file.length > 40 ? file.slice(0, 37) + '...' : file;
    } catch(e) {
      return url.length > 40 ? url.slice(0, 37) + '...' : url;
    }
  }

  const isDesktop = () => window.innerWidth >= 600;

  function renderNetwork() {
    const list = netFilter === 'all' ? requests : requests.filter(r => getReqType(r) === netFilter);
    networkEl.innerHTML = list.length === 0
      ? '<div class="si-empty" style="padding:12px">(no requests)</div>'
      : list.map(r => {
        const statusClass = getStatusClass(r.status);
        const displayUrl = isDesktop() ? r.url : getFileName(r.url);
        return `
          <div class="req">
            <div class="req-row">
              <span class="req-status ${statusClass}">${r.status || 'ERR'}</span>
              <span class="req-method">${r.method || 'GET'}</span>
              <span class="req-url">${esc(displayUrl)}</span>
              <span class="req-meta">${r.type || '-'} · ${formatSize(r.size)} · ${formatTime(r.duration)}</span>
            </div>
            <div class="req-detail">${esc(r.url)}</div>
          </div>
        `;
      }).join('');
  }

  // Network interceptors
  // 1. PerformanceObserver for all resources
  if (window.PerformanceObserver) {
    // Get existing resources
    performance.getEntriesByType('resource').forEach(entry => {
      requests.push({
        url: entry.name,
        type: entry.initiatorType,
        duration: entry.duration,
        size: entry.transferSize || entry.encodedBodySize,
        status: 200, // Assume success for already loaded resources
        method: 'GET'
      });
    });

    // Watch for new resources
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        // Check if we already have this request from fetch/XHR override
        const existing = requests.find(r => r.url === entry.name);
        if (existing) {
          existing.duration = entry.duration;
          existing.size = entry.transferSize || entry.encodedBodySize || existing.size;
        } else {
          requests.push({
            url: entry.name,
            type: entry.initiatorType,
            duration: entry.duration,
            size: entry.transferSize || entry.encodedBodySize,
            status: 200,
            method: 'GET'
          });
        }
      });
      if (activePanel === 'network') renderNetwork();
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  // 2. Fetch override for details
  const origFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init.method || 'GET';
    const startTime = performance.now();
    // Check if already tracked by PerformanceObserver
    let req = requests.find(r => r.url === url && !r._fromFetch);
    if (req) {
      req._fromFetch = true;
      req.method = method;
      req.type = 'fetch';
    } else {
      req = { url, method, type: 'fetch', status: 0, duration: 0, size: 0, _fromFetch: true };
      requests.push(req);
    }

    try {
      const response = await origFetch(input, init);
      req.status = response.status;
      req.duration = performance.now() - startTime;
      // Clone to read size without consuming body
      const clone = response.clone();
      clone.blob().then(blob => {
        req.size = blob.size;
        if (activePanel === 'network') renderNetwork();
      }).catch(() => {});
      if (activePanel === 'network') renderNetwork();
      return response;
    } catch (err) {
      req.status = 0;
      req.duration = performance.now() - startTime;
      if (activePanel === 'network') renderNetwork();
      throw err;
    }
  };

  // 3. XMLHttpRequest override
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._peekMethod = method;
    this._peekUrl = String(url);
    return origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    const startTime = performance.now();
    const url = this._peekUrl;
    // Check if already tracked by PerformanceObserver
    let req = requests.find(r => r.url === url && !r._fromXHR);
    if (req) {
      req._fromXHR = true;
      req.method = this._peekMethod;
      req.type = 'xmlhttprequest';
    } else {
      req = { url, method: this._peekMethod, type: 'xmlhttprequest', status: 0, duration: 0, size: 0, _fromXHR: true };
      requests.push(req);
    }

    this.addEventListener('load', () => {
      req.status = this.status;
      req.duration = performance.now() - startTime;
      req.size = this.response ? (this.response.byteLength || this.response.length || this.responseText?.length || 0) : 0;
      if (activePanel === 'network') renderNetwork();
    });
    this.addEventListener('error', () => {
      req.status = 0;
      req.duration = performance.now() - startTime;
      if (activePanel === 'network') renderNetwork();
    });

    return origXHRSend.apply(this, arguments);
  };

  // Network click handler (expand/collapse)
  networkEl.addEventListener('click', e => {
    const req = e.target.closest('.req');
    if (req) req.classList.toggle('open');
  });

  // Storage click handler
  storageEl.addEventListener('click', e => {
    const item = e.target.closest('.si');
    if (item) {
      const tog = item.querySelector(':scope > .si-tog');
      const ch = item.querySelector(':scope > .si-ch');
      if (ch && tog?.textContent.trim()) {
        e.stopPropagation();
        const open = ch.style.display === 'none';
        ch.style.display = open ? 'block' : 'none';
        tog.textContent = open ? '▼' : '▶';
      }
      return;
    }
    const head = e.target.closest('.sh-head');
    if (head) {
      const items = head.nextElementSibling;
      const open = items.style.display === 'none';
      items.style.display = open ? 'block' : 'none';
      head.textContent = head.textContent.replace(open ? '▶' : '▼', open ? '▼' : '▶');
    }
  });

  // Override console
  const orig = {};
  ['log', 'debug', 'info', 'warn', 'error', 'trace'].forEach(t => orig[t] = console[t].bind(console));

  ['log', 'debug', 'info', 'warn', 'error'].forEach(type => {
    console[type] = (...args) => {
      orig[type](...args);
      let msg = fmt(args);
      if (type === 'error') {
        const stack = new Error().stack;
        if (stack) msg += '\n' + stack.split('\n').slice(2, 5).join('\n');
      }
      logs.push({ type, msg, time: time() });
      render();
    };
  });

  console.trace = (...args) => {
    orig.trace(...args);
    const stack = new Error().stack?.split('\n').slice(2).join('\n') || '';
    logs.push({ type: 'debug', msg: 'Trace: ' + fmt(args) + '\n' + stack, time: time() });
    render();
  };

  // Catch errors
  window.addEventListener('error', e => {
    logs.push({ type: 'error', msg: `${e.message}\n  at ${e.filename}:${e.lineno}:${e.colno}`, time: time() });
    render();
  });

  window.addEventListener('unhandledrejection', e => {
    logs.push({ type: 'error', msg: `Unhandled Promise: ${e.reason}`, time: time() });
    render();
  });

  // Event handlers
  $$('#peek-bar [data-p]').forEach(btn => btn.onclick = () => {
    $$('#peek-bar [data-p]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    activePanel = btn.dataset.p;
    el.dataset.p = activePanel;
    if (activePanel === 'storage') renderStorage();
    if (activePanel === 'network') renderNetwork();
    // Restore if collapsed
    if (el.classList.contains('collapsed')) {
      el.classList.remove('collapsed');
      if (wasFullscreen) {
        el.classList.add('fullscreen');
        el.style.height = '';
      } else {
        el.style.height = customHeight || '33vh';
      }
    }
  });

  $$('#peek-filters [data-f]').forEach(btn => btn.onclick = () => {
    $$('#peek-filters [data-f]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    filter = btn.dataset.f;
    render();
  });

  $$('#peek-net-filters [data-nf]').forEach(btn => btn.onclick = () => {
    $$('#peek-net-filters [data-nf]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    netFilter = btn.dataset.nf;
    renderNetwork();
  });

  $('peek-clear').onclick = () => {
    if (activePanel === 'console') {
      logs = [];
      render();
    } else if (activePanel === 'network') {
      requests = [];
      renderNetwork();
    } else if (confirm('Clear all cookies, localStorage and sessionStorage?')) {
      // Clear cookies
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim();
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
      localStorage.clear();
      sessionStorage.clear();
      renderStorage();
    }
  };

  $('peek-min').onclick = () => {
    if (el.classList.contains('collapsed')) {
      el.classList.remove('collapsed');
      if (wasFullscreen) {
        el.classList.add('fullscreen');
        el.style.height = '';
      } else {
        el.style.height = customHeight || '33vh';
      }
    } else {
      wasFullscreen = el.classList.contains('fullscreen');
      el.classList.remove('fullscreen');
      el.classList.add('collapsed');
      el.style.height = '';
    }
  };

  // Click on bar to restore when collapsed
  $('peek-bar').onclick = e => {
    if (!el.classList.contains('collapsed')) return;
    if (e.target.closest('button')) return; // Don't trigger on button clicks
    el.classList.remove('collapsed');
    if (wasFullscreen) {
      el.classList.add('fullscreen');
      el.style.height = '';
    } else {
      el.style.height = customHeight || '250px';
    }
  };

  $('peek-full').onclick = () => {
    el.classList.remove('collapsed');
    if (el.classList.contains('fullscreen')) {
      el.classList.remove('fullscreen');
      el.style.height = customHeight || '';
    } else {
      el.classList.add('fullscreen');
      el.style.height = '';
    }
  };

  // Resize
  const resize = $('peek-resize');
  const setHeight = y => {
    if (!isResizing) return;
    customHeight = Math.max(100, Math.min(innerHeight - y, innerHeight - 50)) + 'px';
    el.style.height = customHeight;
  };

  resize.addEventListener('mousedown', e => { isResizing = true; e.preventDefault(); });
  resize.addEventListener('touchstart', e => { isResizing = true; e.preventDefault(); }, { passive: false });
  document.addEventListener('mousemove', e => setHeight(e.clientY));
  document.addEventListener('touchmove', e => { if (e.touches[0]) setHeight(e.touches[0].clientY); }, { passive: true });
  document.addEventListener('mouseup', () => isResizing = false);
  document.addEventListener('touchend', () => isResizing = false);

  // Execute input
  inputEl.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const code = inputEl.value.trim();
    if (!code) return;
    console.log('> ' + code);
    try {
      const result = eval(code);
      if (result !== undefined) console.log(result);
    } catch (err) {
      console.error(err.message);
    }
    inputEl.value = '';
  };

  console.info('peek active');
})();
