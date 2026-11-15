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
  var WIDTHS = ['60', '70', '80'];
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
  var PALETTE_WORDS = ['github'].concat(Object.keys(PALETTES));
  var KEY_WIDTH = 'md-view-width';
  var KEY_THEME = 'md-view-theme';
  var KEY_PALETTE = 'md-view-palette';
  var KEY_TREE = 'md-view-tree';
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
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Undo the escapes of the embedded text, in the reverse of the shell's order.
  function unescapeText(t) {
    return t.split('<\\!--').join('<!--').split('<\\/').join('</').split('\\\\').join('\\');
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
  // element per folder, one link per file, in tree order. Every name goes in
  // with textContent, so a name cannot make an element.
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
    order.forEach(function (enc) {
      var parts = enc.split('/');
      var key = '';
      for (var i = 0; i < parts.length - 1; i++) {
        var next = key ? key + '/' + parts[i] : parts[i];
        if (!boxes[next]) {
          var det = document.createElement('details');
          var sum = document.createElement('summary');
          sum.textContent = decodeText(parts[i]);
          det.appendChild(sum);
          var box = document.createElement('div');
          det.appendChild(box);
          boxes[key].appendChild(det);
          boxes[next] = box;
          treeFolders[next] = det;
        }
        key = next;
      }
      var a = document.createElement('a');
      a.setAttribute('href', pageUrl() + '#/' + enc);
      a.textContent = decName(enc);
      if (tree[enc] !== 'page') a.className = 'md-off';
      boxes[key].appendChild(a);
      treeLinks[enc] = a;
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
  // Scrolls to the heading of FRAG. A decode error keeps the raw text. A
  // missing heading goes to the top.
  function scrollToFrag(frag) {
    if (!frag) { window.scrollTo(0, 0); return; }
    var f = decodeText(frag);
    var el = document.getElementById('user-content-' + f);
    if (!el) el = document.getElementById('user-content-' + f.toLowerCase());
    if (el && el.scrollIntoView) el.scrollIntoView();
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
    tpl.innerHTML = marked.parse(files[enc]);
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

  // Parses each diagram, then draws the good ones with mermaid. A drawn diagram
  // gets its bar when mermaid.run settles, unless the batch was cancelled.
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
          if (it.pre.querySelector('svg')) addBar(it.pre);
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
  // buildViewer makes the dialog, its buttons and its scroll box, once, at the first open.
  function buildViewer() {
    var dlg = document.createElement('dialog');
    dlg.className = 'md-viewer';
    dlg.setAttribute('aria-label', 'Diagram viewer');
    var tools = document.createElement('div');
    tools.className = 'md-vtools';
    var closeBtn = makeButton('×', closeViewer);
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.title = 'Close';
    tools.appendChild(closeBtn);
    var box = document.createElement('div');
    box.className = 'md-vbox';
    dlg.appendChild(tools);
    dlg.appendChild(box);
    dlg.addEventListener('close', closeViewer);
    document.body.appendChild(dlg);
    view = { dlg: dlg, box: box, pre: null, bar: null, svg: null, style: null, w0: 0, h0: 0, k: 1 };
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
  // is open. It does nothing when no svg is in the viewer.
  function closeViewer() {
    if (!view || !view.svg) return;
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
  // fitZoom sets the svg to the largest size that fits the scroll box. The size is
  // not capped at 1.
  function fitZoom() {
    var k = Math.min(view.box.clientWidth / view.w0, view.box.clientHeight / view.h0);
    view.k = k;
    view.svg.style.width = view.w0 * k + 'px';
    view.svg.style.height = view.h0 * k + 'px';
    view.svg.style.maxWidth = 'none';
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
    root.setAttribute('data-width', startWidth);
    root.setAttribute('data-theme', startTheme);
    setPaletteWord(startPalette);
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
