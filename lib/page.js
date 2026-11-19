(function () {
  'use strict';
  var MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js';
  var MERMAID_SRI = 'sha384-HHW54r639fK42Ip0coGF3mz8oSiGn0eEoWNTLs75X7H63pLSDBa0Tqs0RwGmLlXE';
  var root = document.documentElement;
  var themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var items = [];
  var mermaidReady = false;
  // Mermaid draws one batch at a time. drawChain runs the batches in order, and
  // drawQueued is set while a batch waits and has not read the palette yet.
  // drawnTheme is the palette and the used mode of the last batch that started,
  // as one word such as tokyo:dark. A batch that does not settle in
  // MERMAID_TIMEOUT ms shows its source, and the chain goes on.
  var drawChain = Promise.resolve();
  var drawQueued = false;
  var drawnTheme = null;
  var MERMAID_TIMEOUT = 10000;
  var storageBlocked = false;
  var forced = root.getAttribute('data-forced') === '1';
  var WIDTHS = ['60', '70', '80', '90'];
  var THEMES = ['light', 'dark', 'auto'];
  // The palettes except github, which has no colors: the page keeps its own look.
  // Each palette has a dark and a light map with the same keys. A color reaches
  // the page as the CSS variable --p-<key>. A new palette is one new entry.
  var PALETTES = {
    tokyo: {
      dark: {
        'bg': '#1a1b26',
        'bg-dark': '#16161e',
        'bg-hl': '#292e42',
        'bg-visual': '#283457',
        'fg': '#c0caf5',
        'fg-dark': '#a9b1d6',
        'border': '#3b4261',
        'comment': '#565f89',
        'blue': '#7aa2f7',
        'blue1': '#2ac3de',
        'blue5': '#89ddff',
        'cyan': '#7dcfff',
        'green': '#9ece6a',
        'green1': '#73daca',
        'magenta': '#bb9af7',
        'orange': '#ff9e64',
        'purple': '#9d7cd8',
        'red': '#f7768e',
        'yellow': '#e0af68'
      },
      light: {
        'bg': '#e1e2e7',
        'bg-dark': '#d0d5e3',
        'bg-hl': '#c4c8da',
        'bg-visual': '#b7c1e3',
        'fg': '#3760bf',
        'fg-dark': '#6172b0',
        'border': '#a8aecb',
        'comment': '#848cb5',
        'blue': '#2e7de9',
        'blue1': '#188092',
        'blue5': '#006a83',
        'cyan': '#007197',
        'green': '#587539',
        'green1': '#387068',
        'magenta': '#9854f1',
        'orange': '#b15c00',
        'purple': '#7847bd',
        'red': '#f52a65',
        'yellow': '#8c6c3e'
      }
    }
  };
  // The accent cycle of drawn diagrams: the 8 palette keys in a fixed order.
  var ACCENT_KEYS = ['blue', 'cyan', 'green', 'magenta', 'orange', 'red', 'purple', 'yellow'];
  // The accents of github, which has no palette entry and no --p- variables.
  // One list per mode, in the index order of ACCENT_KEYS.
  var GITHUB_ACCENTS = {
    light: ['#0969da', '#1b7c83', '#1a7f37', '#8250df', '#bc4c00', '#cf222e', '#6639ba', '#9a6700'],
    dark: ['#4493f8', '#33b5c9', '#3fb950', '#a56eff', '#db6d28', '#ff7b72', '#ab7df6', '#d4a72c']
  };
  // The fill-opacity of an accent fill: the accent blends over the diagram
  // background, so no per-mode background is needed.
  var ACCENT_FILL_OPACITY = '0.15';
  var PALETTE_WORDS = ['github'].concat(Object.keys(PALETTES));
  var KEY_WIDTH = 'md-view-width';
  var KEY_THEME = 'md-view-theme';
  var KEY_PALETTE = 'md-view-palette';
  var KEY_TREE = 'md-view-tree';
  var KEY_PANEL = 'md-view-tree-w';
  var narrow = window.matchMedia('(max-width: 699px)');
  var treePanel = document.getElementById('md-tree-panel');
  var treeToggle = document.getElementById('md-tree-toggle');
  var treeLinks = Object.create(null);
  var treeFolders = Object.create(null);
  var gear = document.getElementById('md-gear');
  var pop = document.getElementById('md-pop');
  var widthButtons = {};
  var themeButtons = {};
  var paletteButtons = {};
  var notice = null;
  var paste = null;
  // The open diagram viewer, made by buildViewer at the first open. Null until then.
  var view = null;
  // The zoom factor of one step of the viewer keys and buttons.
  var ZOOM_STEP = 1.25;
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Undo the escapes of the embedded text, in the reverse of the shell's order.
  function unescapeText(t) {
    return t.split('<\\!--').join('<!--').split('<\\/').join('</').split('\\\\').join('\\');
  }
  // The elements the last line landing flashed. See scrollToFrag.
  var lineMarks = [];
  // stampLines stamps each block, list item and table row with its 1-based
  // source line: data-line first, then the id L<n>. The stamp pairs the
  // tokens with the rendered elements one to one in document order.
  function stampLines(tokens, nodes) {
    // The embedded text starts with a newline: the run starts at line 0.
    pairBlocks(tokens, { node: nodes.firstChild, line: 0 }, false);
  }
  function stamp(el, line) {
    el.setAttribute('data-line', line);
    el.setAttribute('id', 'L' + line);
  }
  // pairBlocks pairs the block tokens with the element children at the
  // cursor. A cursor is { node, line }: node is the next child to pair, line
  // the line the next token starts on. A tight list item renders its text
  // inline: its text token takes no element root, only the elements its
  // inline tokens render. A raw html block renders as escaped text, so it
  // takes no element root either. A task box is the input before the text of
  // a tight item: it takes its element and no stamp.
  function pairBlocks(tokens, cur, tight) {
    var i, t, el;
    for (i = 0; tokens && i < tokens.length; i++) {
      t = tokens[i];
      if (t.type === 'space' || t.type === 'def' || t.type === 'html') {
        cur.line += nlCount(t.raw);
      } else if (t.type === 'list') {
        pairList(t, cur);
      } else if (t.type === 'table') {
        pairTable(t, cur);
      } else if (t.type === 'checkbox') {
        nextEl(cur);
      } else if (tight && t.type === 'text') {
        skipInline(cur, t.tokens);
        cur.line += nlCount(t.raw);
      } else {
        el = nextEl(cur);
        if (!el) break;
        stamp(el, cur.line);
        if (t.type === 'blockquote' && t.tokens) {
          pairBlocks(t.tokens, { node: el.firstChild, line: cur.line }, false);
        }
        cur.line += nlCount(t.raw);
      }
    }
  }
  // pairList stamps the list root and each item. An item descends with its
  // own running line. The list raw then sets the line after the list: the
  // last item raw lacks the newline that ends the list when a block follows.
  function pairList(t, cur) {
    var ul = nextEl(cur);
    if (!ul) return;
    stamp(ul, cur.line);
    var sub = { node: ul.firstChild, line: cur.line };
    var i, li, item;
    for (i = 0; i < t.items.length; i++) {
      item = t.items[i];
      li = nextEl(sub);
      if (!li) break;
      stamp(li, sub.line);
      pairBlocks(item.tokens, { node: li.firstChild, line: sub.line }, !item.loose);
      sub.line += nlCount(item.raw);
    }
    cur.line += nlCount(t.raw);
  }
  // pairTable stamps the table, the header row, and one row per body row.
  // A body row starts two lines under the table start, one line each: the
  // count of table.rows, not the raw.
  function pairTable(t, cur) {
    var el = nextEl(cur);
    if (!el) return;
    stamp(el, cur.line);
    var part = nextEl({ node: el.firstChild });
    var tr, i, body;
    if (part) {
      tr = nextEl({ node: part.firstChild });
      if (tr) stamp(tr, cur.line);
      part = nextEl({ node: part.nextSibling });
      if (part) {
        body = { node: part.firstChild, line: cur.line };
        for (i = 0; i < (t.rows ? t.rows.length : 0); i++) {
          tr = nextEl(body);
          if (!tr) break;
          stamp(tr, cur.line + 2 + i);
        }
      }
    }
    cur.line += nlCount(t.raw);
  }
  // nextEl takes the element child at the cursor, skipping text and comment
  // nodes, and moves the cursor on.
  function nextEl(cur) {
    var n = cur.node;
    while (n && n.nodeType !== 1) n = n.nextSibling;
    cur.node = n ? n.nextSibling : null;
    return n || null;
  }
  // skipInline steps over the elements an inline text token renders. A text,
  // an escape and a raw html render as text, the rest one element each.
  function skipInline(cur, tokens) {
    var i, t;
    for (i = 0; tokens && i < tokens.length; i++) {
      t = tokens[i];
      if (t.type !== 'text' && t.type !== 'escape' && t.type !== 'html') nextEl(cur);
    }
  }
  function nlCount(s) {
    var n = 0, i = 0;
    s = String(s);
    while ((i = s.indexOf('\n', i)) >= 0) { n++; i++; }
    return n;
  }
  var treeMode = root.getAttribute('data-tree') === 'on';
  var ENC_RE = /^[A-Za-z0-9._~\/%-]+$/;
  var files = Object.create(null);
  var tree = Object.create(null);
  var order = [];
  var openedEnc = '';
  var openedEl = document.getElementById('md');
  var content = document.getElementById('content');
  function has(obj, k) {
    return Object.prototype.hasOwnProperty.call(obj, k);
  }
  // The files and the tree index are data. An ENC that does not match the
  // pattern is ignored, and a state word is used only if it is page, big or cut.
  (function readPage() {
    var els = document.querySelectorAll('script[type="text/markdown"]');
    if (treeMode) {
      Array.prototype.forEach.call(els, function (el) {
        var e = el.getAttribute('data-path');
        if (e === null || !ENC_RE.test(e)) return;
        files[e] = unescapeText(el.textContent);
      });
      if (openedEl) openedEnc = openedEl.getAttribute('data-path') || '';
      var idx = document.getElementById('md-tree');
      if (idx) {
        idx.textContent.split('\n').forEach(function (line) {
          var m = /^(page|big|cut) (\S+)$/.exec(line);
          if (!m || !ENC_RE.test(m[2]) || has(tree, m[2])) return;
          tree[m[2]] = m[1];
          order.push(m[2]);
        });
      }
    } else if (openedEl) {
      files[''] = unescapeText(openedEl.textContent);
    }
  })();
  // A decode error keeps the text as it is. decodeURIComponent throws on a bad
  // escape, and the value is shown only with textContent.
  function decodeText(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }
  // The base name of an encoded tree path, decoded for display.
  function decName(enc) {
    var parts = enc.split('/');
    return decodeText(parts[parts.length - 1] || '');
  }
  // The page URL without its hash: the target of a tree link, then #/ENC.
  function pageUrl() {
    return window.location.href.split('#')[0];
  }
  // buildTree makes the panel from the tree index: the root name, one details
  // element per folder chain, one link per file, in tree order. In every box
  // the folder rows come first, then the file links, each in tree order.
  // A chain is a run of folders whose only child is a folder; it takes one
  // row, with the names joined by a md-sep span. Every name goes in with
  // textContent, so a name cannot make an element.
  function buildTree() {
    if (!treeMode || !treePanel) return;
    treePanel.textContent = '';
    var head = document.createElement('div');
    head.className = 'md-root';
    head.textContent = decodeText(root.getAttribute('data-root') || '');
    treePanel.appendChild(head);
    var body = document.createElement('div');
    treePanel.appendChild(body);
    var boxes = Object.create(null);
    boxes[''] = body;
    // A box gets its folders as they appear and its links last, so a file
    // never interleaves with the folders. links[key] holds the links of the
    // box of key, oldest first.
    var links = Object.create(null);
    // One pre-pass over order: the child count of every folder, its only
    // child, and the set of folder keys.
    var childCount = Object.create(null);
    var onlyChild = Object.create(null);
    var folderKeys = Object.create(null);
    order.forEach(function (enc) {
      var parts = enc.split('/');
      var key = '';
      for (var i = 0; i < parts.length - 1; i++) {
        var next = key ? key + '/' + parts[i] : parts[i];
        folderKeys[next] = true;
        if (key) {
          childCount[key] = (childCount[key] || 0) + 1;
          onlyChild[key] = next;
        }
        key = next;
      }
      childCount[key] = (childCount[key] || 0) + 1;
      onlyChild[key] = enc;
    });
    order.forEach(function (enc) {
      var parts = enc.split('/');
      var key = '';
      for (var i = 0; i < parts.length - 1; i++) {
        var next = key ? key + '/' + parts[i] : parts[i];
        if (!boxes[next]) {
          // The chain runs while the folder has one child and it is a folder.
          var names = [decodeText(parts[i])];
          var end = next;
          while (childCount[end] === 1 && folderKeys[onlyChild[end]]) {
            end = onlyChild[end];
            var endParts = end.split('/');
            names.push(decodeText(endParts[endParts.length - 1]));
          }
          var det = document.createElement('details');
          var sum = document.createElement('summary');
          for (var j = 0; j < names.length; j++) {
            if (j) {
              var sep = document.createElement('span');
              sep.className = 'md-sep';
              sep.textContent = '\u203A';
              sum.appendChild(sep);
            }
            sum.appendChild(document.createTextNode(names[j]));
          }
          det.appendChild(sum);
          var box = document.createElement('div');
          det.appendChild(box);
          boxes[key].appendChild(det);
          // Every key of the chain shares the one element, so markTree opens
          // the row of the shown file.
          var chain = next;
          while (true) {
            boxes[chain] = box;
            treeFolders[chain] = det;
            if (chain === end) break;
            chain = onlyChild[chain];
          }
        }
        key = next;
      }
      var a = document.createElement('a');
      a.setAttribute('href', pageUrl() + '#/' + enc);
      a.textContent = decName(enc);
      if (tree[enc] !== 'page') a.className = 'md-off';
      treeLinks[enc] = a;
      if (!links[key]) links[key] = [];
      links[key].push(a);
    });
    // Fill the boxes in a second walk over order, so every box gets its
    // links in index order: a chain box holds the links of all its members,
    // and integer-like dir keys enumerate first under Object.keys.
    order.forEach(function (enc) {
      var parts = enc.split('/');
      var key = '';
      for (var i = 0; i < parts.length - 1; i++) {
        key = key ? key + '/' + parts[i] : parts[i];
      }
      boxes[key].appendChild(links[key].shift());
    });
    if (root.getAttribute('data-cap') === '1') {
      var cap = document.createElement('div');
      cap.className = 'md-cap';
      cap.textContent = 'Showing the first ' + root.getAttribute('data-files') + ' files.';
      body.appendChild(cap);
    }
  }
  // markTree marks the shown file and opens its folders. A folder that the
  // reader opened stays open.
  function markTree(enc) {
    if (!treeMode || !treePanel) return;
    var parts = enc.split('/');
    var key = '';
    for (var i = 0; i < parts.length - 1; i++) {
      key = key ? key + '/' + parts[i] : parts[i];
      if (treeFolders[key]) treeFolders[key].open = true;
    }
    Object.keys(treeLinks).forEach(function (e) {
      var a = treeLinks[e];
      if (e === enc) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var cur = treeLinks[enc];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  // treeOpen: the panel is open unless data-panel says closed.
  function treeOpen() {
    return root.getAttribute('data-panel') !== 'closed';
  }
  function setTree(open, keep) {
    root.setAttribute('data-panel', open ? 'open' : 'closed');
    if (treeToggle) treeToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (keep) save(KEY_TREE, open ? 'open' : 'closed');
  }
  // The narrow window hides the panel, and b does nothing there.
  function toggleTree() {
    if (!treeMode || narrow.matches) return;
    setTree(!treeOpen(), true);
  }
  // The saved state, else open. tree=off makes no panel, so no state is read.
  function loadTree() {
    if (!treeMode) return;
    setTree(storageGet(KEY_TREE) !== 'closed', false);
  }
  // The width of the panel: 300 at the start, saved as plain digits under
  // KEY_PANEL. It is clamped on every use, to 200..560 and to half the window,
  // so a stale or moved value cannot break the page.
  var PANEL_MIN = 200;
  var PANEL_MAX = 560;
  var PANEL_START = 300;
  var panelW = PANEL_START;
  var treeResize = document.getElementById('md-tree-resize');
  // panelLimit: the widest panel the window allows: PANEL_MAX, or half of it.
  function panelLimit() {
    return Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.floor(window.innerWidth / 2)));
  }
  // applyPanelWidth sets the width of the panel. keep saves it; a move during
  // a drag does not save, so only the released width is kept.
  function applyPanelWidth(w, keep) {
    w = Math.max(PANEL_MIN, Math.min(panelLimit(), Math.floor(w)));
    panelW = w;
    root.style.setProperty('--md-panel-w', w + 'px');
    if (treeResize) treeResize.setAttribute('aria-valuenow', String(w));
    if (keep) save(KEY_PANEL, String(w));
  }
  // loadPanelWidth: the saved width, but only plain digits 1..4 long.
  function loadPanelWidth() {
    var v = storageGet(KEY_PANEL);
    return /^[0-9]{1,4}$/.test(v || '') ? Number(v) : PANEL_START;
  }
  // wireResize wires the grip: a pointer drag with capture, a double-click
  // that restores the start width, and the arrow keys. The keys are an
  // element assignment, so the page keeps one keydown listener on document.
  function wireResize() {
    if (!treeResize) return;
    treeResize.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try {
        if (treeResize.setPointerCapture) treeResize.setPointerCapture(e.pointerId);
      } catch (err) {}
      var startX = e.clientX;
      var startW = panelW;
      function move(ev) {
        applyPanelWidth(startW + ev.clientX - startX, false);
      }
      function up(ev) {
        if (treeResize.releasePointerCapture && treeResize.hasPointerCapture && treeResize.hasPointerCapture(ev.pointerId)) {
          try { treeResize.releasePointerCapture(ev.pointerId); } catch (err) {}
        }
        treeResize.removeEventListener('pointermove', move);
        treeResize.removeEventListener('pointerup', up);
        applyPanelWidth(startW + ev.clientX - startX, true);
      }
      treeResize.addEventListener('pointermove', move);
      treeResize.addEventListener('pointerup', up);
    });
    treeResize.addEventListener('dblclick', function () {
      applyPanelWidth(PANEL_START, true);
    });
    treeResize.onkeydown = function (e) {
      var step = e.shiftKey ? 64 : 16;
      if (e.key === 'ArrowLeft') applyPanelWidth(panelW - step, true);
      else if (e.key === 'ArrowRight') applyPanelWidth(panelW + step, true);
    };
    // A smaller window lowers the limit: the panel follows, without a save.
    window.addEventListener('resize', function () {
      applyPanelWidth(panelW, false);
    });
  }
  // The focus goes to the reading pane after a click in the tree or on a link.
  function focusContent() {
    if (!content) return;
    content.setAttribute('tabindex', '-1');
    try { content.focus({ preventScroll: true }); } catch (e) { content.focus(); }
  }
  // The encoded form of a tree path: each part is encoded, and each byte
  // outside A-Za-z0-9._~- becomes %XX in upper case. "/" stays.
  function encPath(path) {
    return String(path).split('/').map(function (p) {
      return encodeURIComponent(p).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
      });
    }).join('/');
  }
  // The folder parts of an encoded tree path, decoded.
  function dirOfEnc(enc) {
    var parts = enc.split('/');
    parts.pop();
    return parts.map(decodeText);
  }
  // The URL of the folder of a file, for images and for links that are not
  // Markdown. The encoded parts of the ENC are safe in a URL.
  function fileBaseFor(enc) {
    var parts = enc.split('/');
    parts.pop();
    var rel = parts.join('/');
    try { return new URL(rel ? rel + '/' : '', document.baseURI).href; } catch (e) { return document.baseURI; }
  }
  // The heading slug: lower case, then only letters, digits, space, "-" and "_".
  function slug(text) {
    return String(text).toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
  }
  function badBytes(s) {
    return /[\\?\x00-\x1f\x7f]/.test(s);
  }
  // inRoot PARTS UP: the root rule of step 8. UP is true when a `..` had no
  // part before it. An empty result is out too.
  function inRoot(parts, up) { // root-rule
    return !up && parts.length > 0;
  }
  // target HREF DIR: the text rules 1 to 9. DIR is the folder of the shown file,
  // as decoded parts. The kind is keep, anchor, drop, out, other or candidate.
  function target(href, dir) {
    if (href === '') return { kind: 'keep' };
    if (href.charAt(0) === '#') return { kind: 'anchor', frag: href.slice(1) };
    var clean = href.replace(/[\x00-\x20]/g, '');
    if (/^(javascript|vbscript|data):/i.test(clean)) return { kind: 'drop' };
    var m = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(href);
    if (m) {
      var s = m[0].toLowerCase();
      if (s === 'http:' || s === 'https:' || s === 'mailto:') return { kind: 'other' };
      return { kind: 'out' };
    }
    if (href.charAt(0) === '/') return { kind: 'out' };
    if (badBytes(href)) return { kind: 'out' };
    var i = href.indexOf('#');
    var path = i < 0 ? href : href.slice(0, i);
    var frag = i < 0 ? '' : href.slice(i + 1);
    var dec;
    try { dec = decodeURIComponent(path); } catch (e) { return { kind: 'out' }; }
    if (badBytes(dec)) return { kind: 'out' };
    var parts = dir.slice();
    var up = false;
    var segs = dec.split('/');
    for (var k = 0; k < segs.length; k++) {
      var seg = segs[k];
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        if (!parts.length) { up = true; break; }
        parts.pop();
        continue;
      }
      parts.push(seg);
    }
    if (!inRoot(parts, up)) return { kind: 'out' };
    if (!/\.(md|markdown)$/i.test(parts[parts.length - 1])) return { kind: 'other' };
    return { kind: 'candidate', enc: encPath(parts.join('/')), frag: frag };
  }
  // The note after a link that does not navigate.
  function noteAfter(a) {
    var s = document.createElement('span');
    s.className = 'md-note';
    s.textContent = ' (not in this tree)';
    if (a.parentNode) a.parentNode.insertBefore(s, a.nextSibling);
  }
  // applyLink A DIR FILEBASE PAGEBASE ENC: the link rules of the spec. A link
  // in the tree points to the page and a route. A link that does not go in the
  // tree keeps its text, loses its href and gets the note. The one-file page
  // keeps the links of the one-file page: the base element resolves them, and only a
  // dangerous scheme loses its href.
  function applyLink(a, dir, fileBase, pageBase, enc) {
    var href = a.getAttribute('href');
    if (href === null) return;
    if (!treeMode) {
      if (/^(javascript|vbscript|data):/i.test(href.replace(/[\x00-\x20]/g, ''))) a.removeAttribute('href');
      return;
    }
    var t = target(href, dir);
    if (t.kind === 'keep') return;
    if (t.kind === 'anchor') {
      a.setAttribute('href', pageBase + (treeMode ? '#/' + enc + '#' + t.frag : '#' + t.frag));
      return;
    }
    if (t.kind === 'drop') { a.removeAttribute('href'); return; }
    if (t.kind === 'out') { a.removeAttribute('href'); noteAfter(a); return; }
    if (t.kind === 'other') {
      if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(href)) {
        try { a.setAttribute('href', new URL(href, fileBase).href); } catch (e) { a.removeAttribute('href'); }
      }
      return;
    }
    if (has(tree, t.enc)) {
      a.setAttribute('href', pageBase + '#/' + t.enc + (t.frag ? '#' + t.frag : ''));
      return;
    }
    a.removeAttribute('href');
    noteAfter(a);
  }
  // A relative image gets an absolute URL in the folder of the shown file.
  function applyImage(img, fileBase) {
    var v = img.getAttribute('src');
    if (v === null || v === '' || v.charAt(0) === '/' || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(v)) return;
    try { img.setAttribute('src', new URL(v, fileBase).href); } catch (e) { /* keep the value */ }
  }
  // The heading ids of the spec, with a counter for a repeated slug.
  function headingIds(scope) {
    var seen = Object.create(null);
    Array.prototype.forEach.call(scope.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (h) {
      var s = slug(h.textContent);
      if (has(seen, s)) {
        seen[s] = seen[s] + 1;
        s = s + '-' + seen[s];
      } else {
        seen[s] = 0;
      }
      h.id = 'user-content-' + s;
    });
  }
  // Scrolls to FRAG: first the heading of the decoded text. On a miss a line
  // anchor L<n> or a range L<n>-<m> (also L<n>-L<m>) goes to the last
  // stamped element at or below the start line, or to the first stamped
  // element when none is. A range marks every stamp inside it. A one-line
  // anchor, or a range with no stamp inside it, marks the landing alone. The
  // marks of the last landing are cleared first, on every call. A miss goes
  // to the top.
  function scrollToFrag(frag) {
    Array.prototype.forEach.call(lineMarks, function (e) { e.classList.remove('md-line-target'); });
    lineMarks = [];
    if (!frag) { window.scrollTo(0, 0); return; }
    var f = decodeText(frag);
    var el = document.getElementById('user-content-' + f);
    if (!el) el = document.getElementById('user-content-' + f.toLowerCase());
    if (el && el.scrollIntoView) { el.scrollIntoView(); return; }
    var m = /^L(\d+)(?:-L?(\d+))?$/.exec(f);
    if (!m) { window.scrollTo(0, 0); return; }
    var start = Math.max(1, Number(m[1]));
    var end = m[2] ? Math.max(start, Number(m[2])) : start;
    var stamps = content.querySelectorAll('[data-line]');
    var landing = stamps[0] || null;
    var marks = [];
    Array.prototype.forEach.call(stamps, function (e) {
      var n = Number(e.getAttribute('data-line'));
      if (n <= start) landing = e;
      if (m[2] && n >= start && n <= end) marks.push(e);
    });
    if (!marks.length && landing) marks = [landing];
    lineMarks = marks;
    Array.prototype.forEach.call(marks, function (e) { e.classList.add('md-line-target'); });
    if (landing && landing.scrollIntoView) landing.scrollIntoView();
    else window.scrollTo(0, 0);
  }
  // route: the route of the hash. ENC is null for a hash that is not "#/ENC".
  function route() {
    var h = window.location.hash || '';
    if (h.indexOf('#/') === 0) {
      var rest = h.slice(2);
      var i = rest.indexOf('#');
      return { enc: i < 0 ? rest : rest.slice(0, i), frag: i < 0 ? '' : rest.slice(i + 1) };
    }
    return { enc: null, frag: h.length > 1 ? h.slice(1) : '' };
  }
  // currentRoute: the file to show. An unknown route shows the opened file.
  function currentRoute() {
    var r = route();
    if (!treeMode) return { enc: '', frag: r.frag };
    if (r.enc === null || !has(tree, r.enc)) return { enc: openedEnc, frag: r.enc === null ? r.frag : '' };
    return { enc: r.enc, frag: r.frag };
  }
  function showLimitNote(state) {
    content.textContent = '';
    var p = document.createElement('p');
    p.className = 'md-file-note';
    p.textContent = state === 'big' ? 'This file is too large for the page.' : 'This file is over the page limit.';
    content.appendChild(p);
    items = [];
  }
  // show ENC FRAG: renders one file into #content. It closes the viewer first. The
  // steps are the order of the spec: parse, remove script schemes, ids, links and
  // images, move, highlight, mermaid, title and scroll.
  function show(enc, frag) {
    closeViewer();
    if (!treeMode) enc = '';
    var state = tree[enc];
    if (state === 'big' || state === 'cut') {
      shownEnc = enc;
      showLimitNote(state);
      document.title = decName(enc);
      markTree(enc);
      return;
    }
    if (typeof files[enc] !== 'string') {
      enc = openedEnc;
      frag = '';
      if (typeof files[enc] !== 'string') return;
    }
    var tpl = document.createElement('template');
    var mdTokens = marked.lexer(files[enc]);
    tpl.innerHTML = marked.parser(mdTokens);
    stampLines(mdTokens, tpl.content);
    var nodes = tpl.content;
    Array.prototype.forEach.call(nodes.querySelectorAll('a[href]'), function (a) {
      if (/^(javascript|vbscript|data):/i.test(a.getAttribute('href').replace(/[\x00-\x20]/g, ''))) {
        a.removeAttribute('href');
      }
    });
    headingIds(nodes);
    var dir = dirOfEnc(enc);
    var fileBase = fileBaseFor(enc);
    var pageBase = window.location.href.split('#')[0];
    Array.prototype.forEach.call(nodes.querySelectorAll('a[href]'), function (a) {
      applyLink(a, dir, fileBase, pageBase, enc);
    });
    Array.prototype.forEach.call(nodes.querySelectorAll('img[src]'), function (img) {
      applyImage(img, fileBase);
    });
    content.textContent = '';
    content.appendChild(nodes);
    highlightAll(content);
    items = Array.prototype.map.call(content.querySelectorAll('pre.mermaid'), function (pre) {
      return { pre: pre, src: pre.textContent };
    });
    var mine = items;
    if (mine.length) {
      ensureMermaid(function (ok) {
        if (!ok || items !== mine) return;
        redraw(mine);
      });
    }
    shownEnc = enc;
    if (treeMode) document.title = decName(enc);
    markTree(enc);
    scrollToFrag(frag);
  }
  // A start value is used only if it is an accepted word.
  function accepted(v, words, dflt) {
    return words.indexOf(v) >= 0 ? v : dflt;
  }
  // Each storage call is inside try. A failed read or write sets storageBlocked,
  // and the popover then shows a notice. The page works without storage.
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { storageBlocked = true; return null; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { storageBlocked = true; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { storageBlocked = true; }
  }
  // The start values come from config.ini or a flag. Each is used only if accepted.
  var startWidth = accepted(root.getAttribute('data-start-width'), WIDTHS, '70');
  var startTheme = accepted(root.getAttribute('data-start-theme'), THEMES, 'auto');
  var startPalette = accepted(root.getAttribute('data-start-palette'), PALETTE_WORDS, 'github');
  // The palette in use is the attribute data-palette. The word github has no attribute.
  function setPaletteWord(p) {
    if (p === 'github') root.removeAttribute('data-palette');
    else root.setAttribute('data-palette', p);
  }
  // Sets the used width, theme and palette: the saved choice, unless data-forced is 1, then the start value.
  function load() {
    var w = startWidth;
    var t = startTheme;
    var p = startPalette;
    if (!forced) {
      w = accepted(storageGet(KEY_WIDTH), WIDTHS, startWidth);
      t = accepted(storageGet(KEY_THEME), THEMES, startTheme);
      p = accepted(storageGet(KEY_PALETTE), PALETTE_WORDS, startPalette);
    }
    root.setAttribute('data-width', w);
    root.setAttribute('data-theme', t);
    setPaletteWord(p);
  }
  load();
  // The choice in data-theme: light, dark or auto.
  function themeSetting() {
    var t = root.getAttribute('data-theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  }
  // The theme in use, dark or light. Auto follows the system.
  function usedTheme() {
    var t = themeSetting();
    if (t === 'auto') return themeQuery.matches ? 'dark' : 'light';
    return t;
  }
  // The choice in data-palette: a word of PALETTES, or github when there is no attribute.
  function paletteSetting() {
    return accepted(root.getAttribute('data-palette'), PALETTE_WORDS, 'github');
  }
  // Removes the --p- variables of every palette from html, then sets the ones of
  // the used palette and theme. Github has no variables. It sets colors only.
  function applyPalette() {
    var p = paletteSetting();
    var colors = p === 'github' ? {} : PALETTES[p][usedTheme()];
    Object.keys(PALETTES).forEach(function (w) {
      Object.keys(PALETTES[w].dark).forEach(function (k) {
        root.style.removeProperty('--p-' + k);
      });
    });
    Object.keys(colors).forEach(function (k) {
      root.style.setProperty('--p-' + k, colors[k]);
    });
  }
  // The mermaid variables that take the color of a palette key (spec: Mermaid).
  var MERMAID_KEYS = {
    'bg': ['background', 'edgeLabelBackground'],
    'bg-hl': ['primaryColor', 'actorBkg'],
    'fg': ['primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor', 'titleColor',
      'actorTextColor', 'signalTextColor', 'labelTextColor', 'noteTextColor'],
    'blue': ['primaryBorderColor', 'actorBorder', 'pie1'],
    'fg-dark': ['lineColor', 'actorLineColor', 'signalColor'],
    'bg-dark': ['secondaryColor', 'tertiaryColor', 'clusterBkg', 'labelBoxBkgColor'],
    'border': ['secondaryBorderColor', 'tertiaryBorderColor', 'clusterBorder', 'labelBoxBorderColor', 'noteBorderColor'],
    'bg-visual': ['noteBkgColor'],
    'green': ['pie2'],
    'magenta': ['pie3'],
    'orange': ['pie4'],
    'cyan': ['pie5'],
    'red': ['pie6']
  };
  // The mermaid themeVariables of a color map of the used mode, such as
  // PALETTES.tokyo.dark. darkMode follows the used mode.
  function mermaidVars(colors) {
    var vars = { darkMode: usedTheme() === 'dark' };
    Object.keys(MERMAID_KEYS).forEach(function (k) {
      MERMAID_KEYS[k].forEach(function (name) { vars[name] = colors[k]; });
    });
    return vars;
  }
  // The palette and the used mode as one word, such as tokyo:dark. The diagrams
  // draw again when it changes.
  function paletteMode() {
    return paletteSetting() + ':' + usedTheme();
  }
  function setMedia(id, value) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('media', value);
  }
  // Enables the GitHub style and the highlight theme of the used theme, sets
  // color-scheme and the palette colors, and draws the diagrams again when the
  // palette or the used mode changed.
  function applyTheme() {
    var dark = usedTheme() === 'dark';
    setMedia('gh-light', dark ? 'not all' : 'all');
    setMedia('gh-dark', dark ? 'all' : 'not all');
    setMedia('hl-light', dark ? 'not all' : 'all');
    setMedia('hl-dark', dark ? 'all' : 'not all');
    root.style.colorScheme = dark ? 'dark' : 'light';
    applyPalette();
    if (mermaidReady && paletteMode() !== drawnTheme) redraw(items);
  }
  function onSystemTheme() {
    if (themeSetting() === 'auto') applyTheme();
  }
  if (themeQuery.addEventListener) {
    themeQuery.addEventListener('change', onSystemTheme);
  } else if (themeQuery.addListener) {
    themeQuery.addListener(onSystemTheme);
  }
  marked.use({
    renderer: {
      // Raw HTML in the file is shown as text, never as markup.
      html: function (token) { return esc(token.text); },
      // A mermaid fence becomes a diagram block; other fences stay plain code.
      code: function (token) {
        if ((token.lang || '').split(/\s+/)[0] !== 'mermaid') return false;
        return '<pre class="mermaid">' + esc(token.text) + '</pre>\n';
      }
    }
  });
  // Code with a known language gets highlight.js. A block with no language, with
  // an unknown one, or a mermaid block stays plain. An error leaves it plain.
  function highlightAll(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('pre > code'), function (code) {
      var m = /(?:^|\s)language-(\S+)/.exec(code.className || '');
      if (!m || m[1] === 'mermaid') return;
      try {
        if (window.hljs && hljs.getLanguage(m[1])) hljs.highlightElement(code);
      } catch (e) {
        // The plain block stays.
      }
    });
  }
  // Mermaid is added by a script element created here, and only at the first
  // file with a diagram, so a slow or blocked CDN cannot hide the text. Its load
  // or its error decides how the diagrams are shown. mermaidState: 0 not
  // loaded, 1 loading, 2 ready, 3 failed.
  var mermaidState = 0;
  var mermaidWaiting = [];
  function ensureMermaid(cb) {
    if (mermaidState === 2) { cb(true); return; }
    if (mermaidState === 3) { cb(false); return; }
    mermaidWaiting.push(cb);
    if (mermaidState === 1) return;
    mermaidState = 1;
    function done() {
      mermaidReady = mermaidState === 2;
      var list = mermaidWaiting;
      mermaidWaiting = [];
      list.forEach(function (f) { f(mermaidState === 2); });
    }
    var s = document.createElement('script');
    s.src = MERMAID_URL;
    s.integrity = MERMAID_SRI;
    s.crossOrigin = 'anonymous';
    s.onload = function () {
      mermaidState = typeof mermaid === 'undefined' ? 3 : 2;
      done();
    };
    s.onerror = function () {
      mermaidState = 3;
      done();
    };
    document.head.appendChild(s);
  }
  var shownEnc = null;
  function start() {
    var r = currentRoute();
    show(r.enc, r.frag);
  }
  applyTheme();
  buildPopover();
  if (treeMode) applyPanelWidth(loadPanelWidth(), false);
  buildTree();
  loadTree();
  wireControls();
  start();
  // A new route renders its file. The same file scrolls to its anchor only.
  window.addEventListener('hashchange', function () {
    var r = currentRoute();
    if (r.enc === shownEnc) {
      scrollToFrag(r.frag);
      return;
    }
    show(r.enc, r.frag);
  });

  // Shows a diagram's source as a code block, with the error text when there is one.
  function showCode(pre, text, err) {
    pre.removeAttribute('class');
    pre.removeAttribute('data-processed');
    pre.textContent = '';
    var code = document.createElement('code');
    code.className = 'language-mermaid';
    code.textContent = text;
    pre.appendChild(code);
    if (err) {
      var msg = document.createElement('div');
      msg.className = 'mermaid-error';
      msg.textContent = 'mermaid: ' + (err && err.message ? err.message : String(err));
      pre.appendChild(msg);
    }
  }

  // The accent hex of index i of the cycle, in the palette and the mode in
  // use. tokyo reads the palette map of the mode; github reads its fixed list.
  function accentColor(i) {
    var n = i % ACCENT_KEYS.length;
    var mode = paletteMode().split(':')[1];
    if (paletteSetting() === 'github') return GITHUB_ACCENTS[mode][n];
    return PALETTES[paletteSetting()][mode][ACCENT_KEYS[n]];
  }
  // Accent paint for one shape: the accent as fill and stroke, blended over
  // the background. Every call sets all four properties, so a redraw
  // overwrites the old paint and needs no clearing step.
  function paintShape(el, accent, fillOpacity) {
    if (!el) return;
    el.style.stroke = accent;
    el.style.fill = accent;
    el.style.fillOpacity = fillOpacity;
    el.style.strokeWidth = '2px';
  }
  // The shape child of a node or an actor: the first child with one of these
  // tags, in the given order. The label text is not painted.
  function shapeOf(el, tags) {
    for (var i = 0; i < tags.length; i++) {
      var shape = el.querySelector(':scope > ' + tags[i]);
      if (shape) return shape;
    }
    return null;
  }
  // The box rect of a cluster.
  function clusterRect(cluster) {
    return cluster.querySelector('rect');
  }
  // The center of a node, from the translate of its own transform. The zoom
  // transform of the viewer sits on the root, so it does not reach it. Null
  // when the transform has no parseable translate.
  function nodeCenter(node) {
    var m = /translate\(\s*([-\d.]+)[, ]+([-\d.]+)/.exec(node.getAttribute('transform') || '');
    if (!m) return null;
    return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
  }
  // The index of the cluster that holds a node center: the innermost rect
  // that contains it, the smallest width * height. A tie keeps the later
  // cluster in DOM order. -1 when no rect contains the center.
  function clusterIndexAt(clusters, center) {
    if (!center) return -1;
    var best = -1;
    var bestArea = Infinity;
    for (var i = 0; i < clusters.length; i++) {
      var rect = clusterRect(clusters[i]);
      if (!rect) continue;
      var x = parseFloat(rect.getAttribute('x'));
      var y = parseFloat(rect.getAttribute('y'));
      var w = parseFloat(rect.getAttribute('width'));
      var h = parseFloat(rect.getAttribute('height'));
      if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) continue;
      if (center.x < x || center.x > x + w || center.y < y || center.y > y + h) continue;
      var area = w * h;
      if (area <= bestArea) { best = i; bestArea = area; }
    }
    return best;
  }
  // The source key of a connector. Its data-id is L_<src>_<tgt>_<n>, and a
  // key may itself hold underscores, so the source is the longest node key
  // that fills the start of <src>_<tgt> and ends at a _ boundary.
  // '' when no node key matches.
  function linkSourceKey(dataId, keys) {
    if (!dataId || dataId.indexOf('L_') !== 0) return '';
    var rest = dataId.slice(2, dataId.lastIndexOf('_'));
    var best = '';
    Object.keys(keys).forEach(function (key) {
      if (key.length > best.length && rest.length > key.length &&
          rest.indexOf(key) === 0 && rest.charAt(key.length) === '_') best = key;
    });
    return best;
  }
  // Paints a flowchart: the nodes, the cluster boxes, and the connectors.
  // A clustered diagram gives each node the accent of its cluster, and a
  // node in no cluster the index 0 accent. A flat diagram gives each node
  // its place in document order. A cluster box keeps its own index. A
  // connector takes the accent of its source node; one with no source node
  // keeps the theme stroke and stroke width.
  function paintFlowchart(svg) {
    var clusters = svg.querySelectorAll('g.cluster');
    var nodes = svg.querySelectorAll('g.node');
    var clustered = clusters.length > 0;
    var i;
    for (i = 0; i < clusters.length; i++) {
      paintShape(clusterRect(clusters[i]), accentColor(i), '0.06');
    }
    // The keys map a node key to its accent index, so a connector id can be
    // cut at a _ boundary. A key is the bare node id: the part of the node id
    // between <svgId>-flowchart- and its trailing -<n>.
    var keys = Object.create(null);
    var prefix = svg.id + '-flowchart-';
    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var index = clustered ? clusterIndexAt(clusters, nodeCenter(node)) : i;
      if (index < 0) index = 0;
      var id = node.id || '';
      var key = (id.indexOf(prefix) === 0 ? id.slice(prefix.length) : id).replace(/-\d+$/, '');
      keys[key] = index;
      paintShape(shapeOf(node, ['rect', 'polygon', 'circle', 'ellipse', 'path']),
        accentColor(index), ACCENT_FILL_OPACITY);
    }
    var links = svg.querySelectorAll('path.flowchart-link');
    for (i = 0; i < links.length; i++) {
      var key = linkSourceKey(links[i].getAttribute('data-id'), keys);
      if (key === '') continue;
      links[i].style.stroke = accentColor(keys[key]);
      links[i].style.strokeWidth = '2px';
    }
  }
  // Colors the shapes of a drawn diagram with the accents of the palette in
  // use, following the used mode. A flowchart paints its nodes, their
  // cluster boxes, and its connectors. A sequence diagram paints its
  // actors in document order and leaves messages, activations, and
  // lifelines on the theme colors. The pass adds no element and sets
  // nothing on the root svg.
  function applyAccents(pre) {
    var svg = pre.querySelector('svg');
    if (!svg) return;
    if (svg.querySelectorAll('g.node').length) {
      paintFlowchart(svg);
      return;
    }
    var actors = svg.querySelectorAll('rect.actor, polygon.actor');
    for (var i = 0; i < actors.length; i++) {
      paintShape(actors[i], accentColor(i), ACCENT_FILL_OPACITY);
    }
  }

  // Parses each diagram, then draws the good ones with mermaid. A drawn diagram
  // gets its bar and its accents when mermaid.run settles, unless the batch
  // was cancelled.
  function drawDiagrams(list, batch) {
    // Github keeps the mermaid dark and default themes. Another palette uses the
    // base theme with the colors of the palette.
    var cfg = { startOnLoad: false, securityLevel: 'strict', theme: usedTheme() === 'dark' ? 'dark' : 'default' };
    var p = paletteSetting();
    if (p !== 'github') {
      cfg.theme = 'base';
      cfg.themeVariables = mermaidVars(PALETTES[p][usedTheme()]);
    }
    mermaid.initialize(cfg);
    // Each diagram is parsed alone first, so a broken one shows its error and the
    // others still draw.
    var parsed = list.map(function (it) {
      return mermaid.parse(it.src).then(function () { return it; }, function (err) {
        showCode(it.pre, it.src, err);
        return null;
      });
    });
    return Promise.all(parsed).then(function (results) {
      var good = results.filter(Boolean);
      if (!good.length || batch.cancelled) return;
      return mermaid.run({ nodes: good.map(function (it) { return it.pre; }) }).catch(function (e) {
        console.error(e);
        good.forEach(function (it) {
          if (!it.pre.querySelector('svg')) showCode(it.pre, it.src, null);
        });
      }).then(function () {
        // A cancelled batch adds no bar: its source is already shown.
        if (batch.cancelled) return;
        good.forEach(function (it) {
          if (it.pre.querySelector('svg')) { addBar(it.pre); applyAccents(it.pre); }
        });
      });
    }).catch(function (e) { console.error(e); });
  }

  // Draws each diagram again in the used palette and mode. The open viewer closes
  // first. The batches run one after the other, so a call that overlaps waits for
  // the one before it. A batch that is waiting and has not started is not added
  // again: it reads the palette and the mode when it runs. A batch gets the source
  // text back and loses its earlier drawing.
  function redraw(list) {
    closeViewer();
    if (drawQueued) return;
    drawQueued = true;
    drawChain = drawChain.then(function () {
      drawQueued = false;
      list.forEach(function (it) {
        it.pre.className = 'mermaid';
        it.pre.removeAttribute('data-processed');
        it.pre.textContent = it.src;
      });
      drawnTheme = paletteMode();
      var batch = { cancelled: false };
      return withTimeout(drawDiagrams(list, batch), MERMAID_TIMEOUT, function () {
        // A batch that is late does not draw any more; its source is shown.
        batch.cancelled = true;
        list.forEach(function (it) {
          showCode(it.pre, it.src, new Error('it did not draw in ' + (MERMAID_TIMEOUT / 1000) + ' s'));
        });
      });
    }).catch(function (e) { console.error(e); });
  }
  // Resolves with p, or calls onTimeout and resolves after ms when p has not settled.
  function withTimeout(p, ms, onTimeout) {
    var timer = null;
    var late = new Promise(function (resolve) {
      timer = setTimeout(function () { onTimeout(); resolve(); }, ms);
    });
    return Promise.race([p, late]).then(function (v) {
      clearTimeout(timer);
      return v;
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  // addBar PRE: adds the bar with the Expand button to a drawn diagram. The button
  // opens the viewer on PRE.
  function addBar(pre) {
    var bar = document.createElement('div');
    bar.className = 'md-dbar';
    var b = makeButton('⤢', function () { openViewer(pre); });
    b.setAttribute('aria-label', 'Expand diagram');
    b.title = 'Expand diagram';
    bar.appendChild(b);
    pre.appendChild(bar);
  }
  // viewerButton TEXT NAME ON_CLICK: a button of the viewer. NAME is its aria-label and title.
  function viewerButton(text, name, onClick) {
    var b = makeButton(text, onClick);
    b.setAttribute('aria-label', name);
    b.title = name;
    return b;
  }
  // buildViewer makes the dialog, its buttons and its scroll box, once, at the first
  // open. The box takes the wheel and the drag. The keys are in the page keydown handler.
  function buildViewer() {
    var dlg = document.createElement('dialog');
    dlg.className = 'md-viewer';
    dlg.setAttribute('aria-label', 'Diagram viewer');
    var tools = document.createElement('div');
    tools.className = 'md-vtools';
    tools.appendChild(viewerButton('−', 'Zoom out', zoomOut));
    tools.appendChild(viewerButton('+', 'Zoom in', zoomIn));
    tools.appendChild(viewerButton('Fit', 'Fit', fitZoom));
    tools.appendChild(viewerButton('1:1', 'Actual size', actualSize));
    var laserBtn = viewerButton('●', 'Laser pointer', toggleLaser);
    laserBtn.setAttribute('aria-pressed', 'false');
    tools.appendChild(laserBtn);
    // showModal focuses this button, so Enter or Space does not zoom out at open.
    var closeBtn = viewerButton('×', 'Close', closeViewer);
    closeBtn.autofocus = true;
    tools.appendChild(closeBtn);
    var box = document.createElement('div');
    box.className = 'md-vbox';
    dlg.appendChild(tools);
    dlg.appendChild(box);
    var dot = document.createElement('div');
    dot.className = 'md-laser';
    dlg.appendChild(dot);
    dlg.addEventListener('close', closeViewer);
    // The wheel zooms around the pointer. The default is prevented, so the page does not scroll.
    box.addEventListener('wheel', function (e) {
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      var b = box.getBoundingClientRect();
      setZoom(view.k * Math.pow(ZOOM_STEP, -dy / 100), e.clientX - b.left, e.clientY - b.top);
    }, { passive: false });
    // A mouse or pen drag pans the box. The pointer is captured, so the drag goes on outside the box.
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      // A press on the scroll bar is not a drag: it is outside the client area.
      var b = box.getBoundingClientRect();
      var x = e.clientX - b.left;
      var y = e.clientY - b.top;
      if (x < 0 || y < 0 || x >= box.clientWidth || y >= box.clientHeight) return;
      view.drag = { x: e.clientX, y: e.clientY };
      box.setPointerCapture(e.pointerId);
      box.classList.add('md-drag');
    });
    box.addEventListener('pointermove', function (e) {
      // The laser dot follows the pointer in dialog coordinates. A drag keeps
      // the pointer captured, so panning and the laser compose.
      if (view.laser) {
        var r = view.dlg.getBoundingClientRect();
        view.dot.style.left = (e.clientX - r.left) + 'px';
        view.dot.style.top = (e.clientY - r.top) + 'px';
      }
      if (!view.drag) return;
      box.scrollLeft -= e.clientX - view.drag.x;
      box.scrollTop -= e.clientY - view.drag.y;
      view.drag = { x: e.clientX, y: e.clientY };
    });
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);
    document.body.appendChild(dlg);
    view = { dlg: dlg, box: box, pre: null, bar: null, svg: null, style: null, w0: 0, h0: 0, k: 1, drag: null, laser: false, dot: dot, laserBtn: laserBtn };
  }
  // openViewer PRE: opens the viewer on the svg of PRE, in Fit. The svg is moved
  // into the scroll box, never cloned. It does nothing when the viewer is open or
  // PRE holds no svg.
  function openViewer(pre) {
    var svg = pre.querySelector('svg');
    if (!svg || (view && view.svg)) return;
    if (!view) buildViewer();
    var vb = svg.viewBox.baseVal;
    var cs = window.getComputedStyle(pre);
    view.pre = pre;
    view.bar = pre.querySelector('.md-dbar');
    view.svg = svg;
    view.style = svg.getAttribute('style');
    view.w0 = vb.width;
    view.h0 = vb.height;
    view.box.style.fontFamily = cs.fontFamily;
    view.box.style.fontSize = cs.fontSize;
    view.box.style.lineHeight = cs.lineHeight;
    view.box.appendChild(svg);
    view.dlg.showModal();
    fitZoom();
  }
  // closeViewer: the × button, the dialog close event, show and redraw call it. The
  // svg goes back before its bar, with its style attribute as it was, when the pre
  // is still the one of the open. Else the svg is dropped. The dialog closes if it
  // is open, and a drag ends. It does nothing when no svg is in the viewer.
  function closeViewer() {
    if (!view || !view.svg) return;
    endDrag();
    var svg = view.svg;
    if (view.bar && view.bar.parentNode === view.pre && document.contains(view.pre)) {
      view.pre.insertBefore(svg, view.bar);
      if (view.style === null) svg.removeAttribute('style');
      else svg.setAttribute('style', view.style);
    } else if (svg.parentNode) {
      svg.parentNode.removeChild(svg);
    }
    view.pre = view.bar = view.svg = view.style = null;
    if (view.dlg.open) view.dlg.close();
  }
  // endDrag ends a mouse or pen drag of the viewer. The pointer up and cancel
  // events call it, and closeViewer too.
  function endDrag() {
    view.drag = null;
    view.box.classList.remove('md-drag');
  }
  // setZoom K X Y: sets the zoom to K, clamped to 0.05 to 20, and sets the svg size
  // from w0 and h0. X and Y are box positions. The content under them stays under
  // them, where the scroll position allows it. With no X and Y, the point is the box
  // center.
  function setZoom(k, x, y) {
    var box = view.box;
    var svg = view.svg;
    if (x === undefined) {
      x = box.clientWidth / 2;
      y = box.clientHeight / 2;
    }
    var b = box.getBoundingClientRect();
    var before = svg.getBoundingClientRect();
    // The point as a fraction of the svg size, before the change.
    var fx = (x - (before.left - b.left)) / before.width;
    var fy = (y - (before.top - b.top)) / before.height;
    view.k = Math.min(20, Math.max(0.05, k));
    svg.style.width = view.w0 * view.k + 'px';
    svg.style.height = view.h0 * view.k + 'px';
    svg.style.maxWidth = 'none';
    var after = svg.getBoundingClientRect();
    box.scrollLeft += after.left - b.left + fx * after.width - x;
    box.scrollTop += after.top - b.top + fy * after.height - y;
  }
  // fitZoom sets the zoom to Fit: the largest size that fits the scroll box. The
  // size is not capped at 1.
  function fitZoom() {
    setZoom(Math.min(view.box.clientWidth / view.w0, view.box.clientHeight / view.h0));
  }
  // zoomIn, zoomOut and actualSize change the zoom about the box center.
  function zoomIn() { setZoom(view.k * ZOOM_STEP); }
  function zoomOut() { setZoom(view.k / ZOOM_STEP); }
  function actualSize() { setZoom(1); }
  // toggleLaser flips the laser pointer: a red dot that follows the pointer.
  // On toggle-on the dot moves to the box center, so it does not sit in a corner
  // before the first pointer move.
  function toggleLaser() {
    view.laser = !view.laser;
    view.dlg.classList.toggle('md-laser-on', view.laser);
    view.laserBtn.setAttribute('aria-pressed', view.laser ? 'true' : 'false');
    if (!view.laser) return;
    var d = view.dlg.getBoundingClientRect();
    var b = view.box.getBoundingClientRect();
    view.dot.style.left = (b.left + b.width / 2 - d.left) + 'px';
    view.dot.style.top = (b.top + b.height / 2 - d.top) + 'px';
  }

  // The popover is made with DOM calls, and its text is set with textContent.
  function makeButton(text, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
  function makeRow(name, buttons) {
    var row = document.createElement('div');
    row.className = 'md-row';
    var label = document.createElement('span');
    label.textContent = name;
    row.appendChild(label);
    buttons.forEach(function (b) { row.appendChild(b); });
    return row;
  }
  // The lines of config.ini for the current choice.
  function pasteText() {
    return ['[View]', 'width=' + root.getAttribute('data-width'), 'theme=' + themeSetting(), 'palette=' + paletteSetting()].join('\n');
  }
  // Shows the current choice on the buttons, the notice and the paste block.
  function refresh() {
    var w = root.getAttribute('data-width');
    var t = themeSetting();
    var p = paletteSetting();
    WIDTHS.forEach(function (v) { widthButtons[v].setAttribute('aria-pressed', v === w ? 'true' : 'false'); });
    PALETTE_WORDS.forEach(function (v) { paletteButtons[v].setAttribute('aria-pressed', v === p ? 'true' : 'false'); });
    THEMES.forEach(function (v) { themeButtons[v].setAttribute('aria-pressed', v === t ? 'true' : 'false'); });
    notice.hidden = !storageBlocked;
    paste.textContent = pasteText();
  }
  function setWidth(w) {
    root.setAttribute('data-width', w);
    save(KEY_WIDTH, w);
    refresh();
  }
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    save(KEY_THEME, t);
    applyTheme();
    refresh();
  }
  // Sets the palette to a word of PALETTE_WORDS and saves it. Any other word is ignored.
  function setPalette(p) {
    if (PALETTE_WORDS.indexOf(p) < 0) return;
    save(KEY_PALETTE, p);
    setPaletteWord(p);
    applyTheme();
    refresh();
  }
  // Reset removes the saved choice and applies the start values, in place.
  function resetChoice() {
    storageRemove(KEY_WIDTH);
    storageRemove(KEY_THEME);
    storageRemove(KEY_PALETTE);
    storageRemove(KEY_PANEL);
    root.setAttribute('data-width', startWidth);
    root.setAttribute('data-theme', startTheme);
    setPaletteWord(startPalette);
    if (treeMode) applyPanelWidth(PANEL_START, false);
    applyTheme();
    refresh();
  }
  function nextWord(list, v) {
    return list[(list.indexOf(v) + 1) % list.length];
  }
  function openPop() {
    refresh();
    pop.hidden = false;
    gear.setAttribute('aria-expanded', 'true');
  }
  function closePop() {
    pop.hidden = true;
    gear.setAttribute('aria-expanded', 'false');
  }
  function togglePop() {
    if (pop.hidden) openPop(); else closePop();
  }
  function buildPopover() {
    WIDTHS.forEach(function (v) { widthButtons[v] = makeButton(v, function () { setWidth(v); }); });
    PALETTE_WORDS.forEach(function (v) { paletteButtons[v] = makeButton(v, function () { setPalette(v); }); });
    THEMES.forEach(function (v) { themeButtons[v] = makeButton(v, function () { setTheme(v); }); });
    pop.appendChild(makeRow('Width', WIDTHS.map(function (v) { return widthButtons[v]; })));
    pop.appendChild(makeRow('Style', PALETTE_WORDS.map(function (v) { return paletteButtons[v]; })));
    pop.appendChild(makeRow('Theme', THEMES.map(function (v) { return themeButtons[v]; })));
    var help = document.createElement('p');
    help.textContent = treeMode ? 'Keys: t theme, s style, w width, b tree, ? help' : 'Keys: t theme, s style, w width, ? help';
    pop.appendChild(help);
    notice = document.createElement('p');
    notice.className = 'md-notice';
    notice.textContent = 'Storage is blocked. Your choice is not kept.';
    notice.hidden = true;
    pop.appendChild(notice);
    if (!treeMode) {
      var off = document.createElement('p');
      off.className = 'md-notice';
      off.textContent = treeOffText();
      pop.appendChild(off);
    }
    var label = document.createElement('p');
    label.textContent = 'Paste into config.ini:';
    pop.appendChild(label);
    paste = document.createElement('pre');
    paste.className = 'md-paste';
    pop.appendChild(paste);
    pop.appendChild(makeButton('Reset', resetChoice));
    // The footer: the version, read from the meta of the page head.
    var ver = document.createElement('p');
    ver.className = 'md-version';
    var meta = document.querySelector('meta[name="md-view-version"]');
    ver.textContent = meta ? 'md-view ' + meta.content : 'md-view';
    pop.appendChild(ver);
    refresh();
  }
  // The notice of a one-file page, from data-tree-why.
  function treeOffText() {
    var why = root.getAttribute('data-tree-why');
    if (why === 'flag') return 'File tree: off (--tree off)';
    if (why === 'home') return 'File tree: off (the root is the home folder)';
    if (why === 'slash') return 'File tree: off (the root is /)';
    return 'File tree: off (tree=off in config.ini)';
  }
  // The gear, a click outside the popover, and the keys.
  function wireControls() {
    gear.addEventListener('click', togglePop);
    if (treeToggle) treeToggle.addEventListener('click', toggleTree);
    if (treeMode) wireResize();
    // A click on the svg of a diagram with a bar opens the viewer, unless text is selected.
    content.addEventListener('click', function (e) {
      var svg = e.target;
      while (svg && String(svg.nodeName).toLowerCase() !== 'svg') svg = svg.parentNode;
      if (!svg || !svg.parentNode || !svg.parentNode.querySelector('.md-dbar')) return;
      if (String(window.getSelection())) return;
      openViewer(svg.parentNode);
    });
    // A click in the tree, or on a link, leaves the focus in the reading pane.
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.nodeName && String(t.nodeName).toLowerCase() === 'a') { focusContent(); return; }
        t = t.parentNode;
      }
    });
    document.addEventListener('click', function (e) {
      if (pop.hidden || pop.contains(e.target) || gear.contains(e.target)) return;
      closePop();
    });
    document.addEventListener('keydown', function (e) {
      // Ctrl, Alt and Meta belong to the browser. Form fields keep their own keys.
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // While the viewer is open, its keys apply and the page keys do nothing.
      // + or = zoom in, - zooms out, 0 fits, 1 is 1:1, l toggles the laser.
      if (view && view.dlg.open) {
        if (e.key === '+' || e.key === '=') zoomIn();
        else if (e.key === '-') zoomOut();
        else if (e.key === '0') fitZoom();
        else if (e.key === '1') actualSize();
        else if (e.key === 'l' || e.key === 'L') toggleLaser();
        return;
      }
      var tg = e.target;
      var tag = tg && tg.nodeName ? String(tg.nodeName).toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (tg && tg.isContentEditable)) return;
      if (e.key === 'Escape') {
        if (!pop.hidden) { closePop(); gear.focus(); }
      }
      else if (e.key === 't') setTheme(nextWord(THEMES, themeSetting()));
      else if (e.key === 's') setPalette(nextWord(PALETTE_WORDS, paletteSetting()));
      else if (e.key === 'w') setWidth(nextWord(WIDTHS, root.getAttribute('data-width')));
      else if (e.key === 'b') toggleTree();
      else if (e.key === '?') openPop();
    });
  }
})();
