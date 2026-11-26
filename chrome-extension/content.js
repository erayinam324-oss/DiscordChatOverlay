(function () {
  if (window.top !== window.self) return;

  const DEFAULTS = {
    enabled: true,
    chatUrl: '',
    statusUrl: '',
    background: 'transparent',
    opacity: 100,
    clickThrough: false,
    chatBox: { right: 20, top: 80, width: 380, height: 520 },
    statusBox: { left: 20, top: 20, width: 320, height: 100 }
  };

  let state = { ...DEFAULTS };
  let boxes = { chat: null, status: null };

  function makeDraggable(box, handle, key) {
    let dragging = false, sx = 0, sy = 0, origL = 0, origT = 0;

    handle.addEventListener('mousedown', (e) => {
      if (state.clickThrough) return;
      dragging = true;
      const r = box.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      origL = r.left;
      origT = r.top;
      box.style.right = 'auto';
      box.style.left = origL + 'px';
      box.style.top = origT + 'px';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const nl = Math.max(0, Math.min(window.innerWidth - 60, origL + (e.clientX - sx)));
      const nt = Math.max(0, Math.min(window.innerHeight - 40, origT + (e.clientY - sy)));
      box.style.left = nl + 'px';
      box.style.top = nt + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      const r = box.getBoundingClientRect();
      chrome.storage.local.set({
        [key]: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
      });
    });
  }

  function makeResizable(box, handle, key) {
    let resizing = false, sx = 0, sy = 0, origW = 0, origH = 0;

    handle.addEventListener('mousedown', (e) => {
      if (state.clickThrough) return;
      resizing = true;
      const r = box.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      origW = r.width;
      origH = r.height;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const nw = Math.max(180, origW + (e.clientX - sx));
      const nh = Math.max(60, origH + (e.clientY - sy));
      box.style.width = nw + 'px';
      box.style.height = nh + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      const r = box.getBoundingClientRect();
      chrome.storage.local.set({
        [key]: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
      });
    });
  }

  function ensureBox(type, url, geom, storageKey) {
    if (!state.enabled || !url) {
      if (boxes[type]) {
        boxes[type].remove();
        boxes[type] = null;
      }
      return;
    }

    let box = boxes[type];
    if (!box) {
      box = document.createElement('div');
      box.className = '__dco_box';

      const drag = document.createElement('div');
      drag.className = '__dco_drag';
      box.appendChild(drag);

      const iframe = document.createElement('iframe');
      iframe.className = '__dco_iframe';
      iframe.setAttribute('allowtransparency', 'true');
      box.appendChild(iframe);

      const resizer = document.createElement('div');
      resizer.className = '__dco_resize';
      box.appendChild(resizer);

      makeDraggable(box, drag, storageKey);
      makeResizable(box, resizer, storageKey);

      document.documentElement.appendChild(box);
      boxes[type] = box;
    }

    const iframe = box.querySelector('iframe');
    if (iframe.src !== url) iframe.src = url;

    box.style.width = (geom.width || 360) + 'px';
    box.style.height = (geom.height || 480) + 'px';
    if (geom.left != null) {
      box.style.left = geom.left + 'px';
      box.style.right = 'auto';
    } else if (geom.right != null) {
      box.style.right = geom.right + 'px';
      box.style.left = 'auto';
    }
    box.style.top = (geom.top != null ? geom.top : 40) + 'px';
    box.style.opacity = String((state.opacity || 100) / 100);

    box.classList.toggle('__dco_dark', state.background === 'dark');
    box.classList.toggle('__dco_locked', !!state.clickThrough);
  }

  function render() {
    ensureBox('chat', state.chatUrl, state.chatBox || DEFAULTS.chatBox, 'chatBox');
    ensureBox('status', state.statusUrl, state.statusBox || DEFAULTS.statusBox, 'statusBox');
  }

  chrome.storage.local.get(DEFAULTS, (cfg) => {
    state = { ...DEFAULTS, ...cfg };
    render();
  });

  chrome.storage.onChanged.addListener((changes) => {
    for (const [k, v] of Object.entries(changes)) {
      state[k] = v.newValue;
    }
    render();
  });

  // Shortcuts inside Chrome: Alt+Shift+L (lock), Alt+Shift+H (hide/show)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyL') {
      chrome.storage.local.set({ clickThrough: !state.clickThrough });
    } else if (e.altKey && e.shiftKey && e.code === 'KeyH') {
      chrome.storage.local.set({ enabled: !state.enabled });
    }
  });
})();
