/* ==========================================================================
   今天也要加油鸭 · 交互脚本 v2
   模块：存储 / 待办 / 番茄钟（自定义时长） / 音乐（白噪音 + 本地播放）
   ========================================================================== */
(function () {
  "use strict";

  /* SECTION: storage */
  var TODO_KEY = "jyjyd.todos.v2";
  var POMO_KEY = "jyjyd.pomo.v2";
  var VOL_KEY = "jyjyd.vol.v2";

  function readStore(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var val = JSON.parse(raw);
      return val === null || typeof val === "undefined" ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }
  function writeStore(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function isArray(v) { return Object.prototype.toString.call(v) === "[object Array]"; }

  /* SECTION: dom helpers */
  function $(id) { return document.getElementById(id); }
  var FILL_ICONS = { play: 1, pause: 1, tomato: 1, heart: 1, spark: 1, prev: 1, next: 1 };
  function icon(name, cls) {
    var c = cls || (FILL_ICONS[name] ? "fill" : "");
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "icon" + (c ? " " + c : ""));
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#i-" + name);
    s.appendChild(u);
    return s;
  }

  var greetingEl = $("greeting"), todayEl = $("today"), heroNote = $("heroNote");
  var noteIco = $("noteIco"), progressCount = $("progressCount"), barFill = $("barFill");
  var todoInput = $("todoInput"), addBtn = $("addBtn"), inputHint = $("inputHint");
  var todoList = $("todoList"), emptyState = $("emptyState");
  var emptyTitle = $("emptyTitle"), emptySub = $("emptySub"), emptyDuck = $("emptyDuck");
  var todoBadge = $("todoBadge"), clearDone = $("clearDone");
  var segButtons = [].slice.call(document.querySelectorAll(".seg button"));
  var pomoBadge = $("pomoBadge"), ringFg = $("ringFg");
  var timeText = $("timeText"), modeLabel = $("modeLabel"), modeIco = $("modeIco");
  var modeText = $("modeText");
  var startBtn = $("startBtn"), resetBtn = $("resetBtn");
  var modeButtons = [].slice.call(document.querySelectorAll(".pomo-mode button"));
  var settingBtn = $("settingBtn"), panel = $("panel");
  var focusInput = $("focusInput"), breakInput = $("breakInput");
  var applyBtn = $("applyBtn"), panelHint = $("panelHint");
  var presetButtons = [].slice.call(document.querySelectorAll(".chip"));
  var tomatoRow = $("tomatoRow"), tomatoText = $("tomatoText"), tomatoBox = $("tomatoBox");
  var ambButtons = [].slice.call(document.querySelectorAll(".amb"));
  var volRange = $("volRange"), volVal = $("volVal");
  var fileInput = $("fileInput"), playlist = $("playlist"), musicEmpty = $("musicEmpty");
  var nowbar = $("nowbar"), nowTitle = $("nowTitle"), nowEq = $("nowEq");
  var playBtn = $("playBtn"), prevBtn = $("prevBtn"), nextBtn = $("nextBtn");
  var seekBar = $("seekBar"), timeNow = $("timeNow"), timeTotal = $("timeTotal");
  var audio = $("audio");

  /* SECTION: toast */
  var toastEl = $("toast"), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2300);
  }

  /* ==========================================================================
     一、待办清单
     ========================================================================== */
  var SAMPLE = [
    { id: 1, text: "写下今天最重要的 3 件事", done: false },
    { id: 2, text: "喝够 8 杯水", done: false },
    { id: 3, text: "给自己一个鼓励的微笑", done: true }
  ];
  var storedTodos = readStore(TODO_KEY, null);
  var todos = isArray(storedTodos) ? storedTodos : SAMPLE.slice();
  var filter = "all";
  var seq = todos.reduce(function (m, t) { return Math.max(m, Number(t.id) || 0); }, 0) + 1;

  function persistTodos() { writeStore(TODO_KEY, todos); }

  /* SECTION: header render */
  var NOTES = {
    none: { ico: "spark", text: "还没有任务，先写下今天的第一件小事吧" },
    all: { ico: "heart", text: "全部完成！今天超棒的，给自己鼓个掌" },
    most: { ico: "fire", text: "已经过半啦，再加把劲就收工" },
    some: { ico: "sprout", text: "有进展就是好事，慢慢来" },
    zero: { ico: "fire", text: "先挑一件最容易的开始，热个身" }
  };

  function renderHeader() {
    var h = new Date().getHours();
    greetingEl.textContent =
      h < 6 ? "夜深了，早点休息鸭" :
      h < 11 ? "早上好鸭" :
      h < 14 ? "中午好鸭" :
      h < 18 ? "下午好鸭" : "晚上好鸭";

    var d = new Date();
    var weeks = ["日", "一", "二", "三", "四", "五", "六"];
    todayEl.textContent = d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " +
      d.getDate() + " 日 · 星期" + weeks[d.getDay()];

    var total = todos.length;
    var done = todos.filter(function (t) { return t.done; }).length;
    var pct = total === 0 ? 0 : Math.round(done / total * 100);
    progressCount.textContent = done + " / " + total + " 项 · " + pct + "%";
    barFill.style.width = pct + "%";

    var key = total === 0 ? "none" :
      done === total ? "all" :
      pct >= 60 ? "most" :
      done > 0 ? "some" : "zero";
    var n = NOTES[key];
    while (heroNote.firstChild) heroNote.removeChild(heroNote.firstChild);
    heroNote.appendChild(icon(n.ico));
    var span = document.createElement("span");
    span.textContent = n.text;
    heroNote.appendChild(span);

    while (noteIco.firstChild) noteIco.removeChild(noteIco.firstChild);
    noteIco.appendChild(icon("target"));

    var active = total - done;
    todoBadge.textContent = active === 0 ? "全部搞定啦" : active + " 项待完成";
  }

  /* SECTION: list render */
  function visibleTodos() {
    if (filter === "active") return todos.filter(function (t) { return !t.done; });
    if (filter === "done") return todos.filter(function (t) { return t.done; });
    return todos.slice();
  }

  function renderList() {
    while (todoList.firstChild) todoList.removeChild(todoList.firstChild);
    var items = visibleTodos();

    if (items.length === 0) {
      emptyState.hidden = false;
      if (todos.length === 0) {
        emptyTitle.textContent = "这里空空如也";
        emptySub.textContent = "在上面写下一件小事，开始今天的第一个任务吧";
      } else if (filter === "done") {
        emptyTitle.textContent = "还没有已完成的任务";
        emptySub.textContent = "完成一件后它会出现在这里";
      } else {
        emptyTitle.textContent = "待办都清空啦";
        emptySub.textContent = "全部任务已完成，好好休息一下";
      }
      while (emptyDuck.firstChild) emptyDuck.removeChild(emptyDuck.firstChild);
      var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
      u.setAttribute("href", "#duck-logo");
      emptyDuck.appendChild(u);
      return;
    }
    emptyState.hidden = true;

    items.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "todo" + (t.done ? " done" : "");

      var check = document.createElement("button");
      check.type = "button";
      check.className = "check";
      check.setAttribute("aria-label", t.done ? "标记为未完成" : "标记为已完成");
      if (t.done) check.appendChild(icon("check"));
      check.addEventListener("click", function () { toggle(t.id); });

      var text = document.createElement("span");
      text.className = "text";
      text.textContent = t.text;

      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.setAttribute("aria-label", "删除任务");
      del.appendChild(icon("trash"));
      del.addEventListener("click", function () { remove(t.id); });

      li.appendChild(check);
      li.appendChild(text);
      li.appendChild(del);
      todoList.appendChild(li);
    });
  }

  function renderTodos() { renderList(); renderHeader(); }

  /* SECTION: todo actions */
  function addTodo() {
    var text = todoInput.value.replace(/\s+/g, " ").trim();
    if (!text) {
      inputHint.textContent = "先写点内容再添加哦～";
      var field = todoInput.parentNode;
      field.classList.remove("shake");
      void field.offsetWidth;
      field.classList.add("shake");
      todoInput.focus();
      return;
    }
    todos.unshift({ id: seq++, text: text, done: false });
    todoInput.value = "";
    inputHint.textContent = "";
    persistTodos();
    renderTodos();
    toast("已添加：" + text);
    todoInput.focus();
  }

  function toggle(id) {
    var target = null;
    todos.forEach(function (t) { if (t.id === id) { t.done = !t.done; target = t; } });
    persistTodos();
    renderTodos();
    if (target && target.done) {
      var left = todos.filter(function (t) { return !t.done; }).length;
      toast(left === 0 ? "全部完成，太厉害啦" : "完成一项，继续加油");
    }
  }

  function remove(id) {
    var idx = -1;
    todos.forEach(function (t, i) { if (t.id === id) idx = i; });
    if (idx < 0) return;
    var text = todos[idx].text;
    todos.splice(idx, 1);
    persistTodos();
    renderTodos();
    toast("已删除：" + text);
  }

  function setFilter(next) {
    filter = next;
    segButtons.forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.filter === next ? "true" : "false");
    });
    renderList();
  }

  /* ==========================================================================
     二、番茄钟（支持自定义时长）
     ========================================================================== */
  function todayStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  var pomoStore = readStore(POMO_KEY, {}) || {};
  var defaultPomo = { date: todayStamp(), count: 0, focusMin: 25, breakMin: 5 };
  var pomo = {
    date: pomoStore.date === defaultPomo.date ? pomoStore.date : defaultPomo.date,
    count: Number(pomoStore.count) || 0,
    focusMin: clampMin(Number(pomoStore.focusMin) || 25, 1, 180, 25),
    breakMin: clampMin(Number(pomoStore.breakMin) || 5, 1, 60, 5)
  };
  if (pomoStore.date !== todayStamp()) { pomo.count = 0; pomo.date = todayStamp(); }

  function clampMin(v, min, max, dft) {
    if (!isFinite(v)) return dft;
    return Math.min(max, Math.max(min, Math.round(v)));
  }
  function persistPomo() { writeStore(POMO_KEY, pomo); }

  var FOCUS_SEC = pomo.focusMin * 60;
  var BREAK_SEC = pomo.breakMin * 60;
  var mode = "focus";
  var remaining = FOCUS_SEC;
  var running = false;
  var endTime = 0;
  var ticker = null;
  var CIRC = 2 * Math.PI * 88;
  ringFg.style.strokeDasharray = CIRC.toFixed(2);

  function totalSec() { return mode === "focus" ? FOCUS_SEC : BREAK_SEC; }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function fmt(sec) {
    var s = Math.max(0, Math.round(sec));
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  }

  function renderPomo() {
    var ratio = totalSec() > 0 ? remaining / totalSec() : 0;
    ringFg.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(2);
    timeText.textContent = fmt(remaining);
    pomoBadge.textContent = mode === "focus"
      ? "专注 " + pomo.focusMin + " 分钟"
      : "休息 " + pomo.breakMin + " 分钟";
    modeButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false");
    });

    while (modeIco.firstChild) modeIco.removeChild(modeIco.firstChild);
    modeIco.appendChild(icon(running ? "play" : mode === "focus" ? "timer" : "moon"));

    if (running) {
      modeText.textContent = mode === "focus" ? "正在专注中…" : "休息一下～";
      setBtnLabel(startBtn, "pause", "暂停");
    } else {
      var fresh = remaining === totalSec();
      modeText.textContent = fresh
        ? (mode === "focus" ? "准备开始专注" : "准备开始休息")
        : "已暂停";
      setBtnLabel(startBtn, "play", fresh ? "开始" : "继续");
    }

    renderTomatoes();
    document.title = running
      ? fmt(remaining) + " · 今天也要加油鸭"
      : "今天也要加油鸭 · 待办与番茄专注";
  }

  function setBtnLabel(btn, iconName, label) {
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(icon(iconName));
    btn.appendChild(document.createTextNode(label));
  }

  function renderTomatoes() {
    while (tomatoRow.firstChild) tomatoRow.removeChild(tomatoRow.firstChild);
    var count = Math.max(0, Number(pomo.count) || 0);
    var show = Math.min(count, 24);
    for (var i = 0; i < show; i++) tomatoRow.appendChild(icon("tomato", "fill"));
    if (count === 0) {
      var e = document.createElement("span");
      e.className = "empty-t";
      e.textContent = "还没有番茄";
      e.style.fontSize = "12.5px";
      tomatoRow.appendChild(e);
    } else if (count > show) {
      var more = document.createElement("span");
      more.textContent = "+" + (count - show);
      more.style.fontSize = "12.5px";
      tomatoRow.appendChild(more);
    }
    tomatoText.textContent = count === 0
      ? "今天已专注 0 个番茄"
      : "今天已专注 " + count + " 个番茄（共 " + (count * pomo.focusMin) + " 分钟）";
  }

  function tick() {
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    renderPomo();
    if (remaining <= 0) finish();
  }

  function start() {
    if (running) {
      running = false;
      if (ticker) { clearInterval(ticker); ticker = null; }
      remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      renderPomo();
      return;
    }
    running = true;
    endTime = Date.now() + remaining * 1000;
    ticker = setInterval(tick, 500);
    renderPomo();
  }

  function reset() {
    running = false;
    if (ticker) { clearInterval(ticker); ticker = null; }
    remaining = totalSec();
    renderPomo();
  }

  function switchMode(next, silent) {
    mode = next;
    running = false;
    if (ticker) { clearInterval(ticker); ticker = null; }
    remaining = totalSec();
    renderPomo();
    if (!silent) toast(next === "focus" ? "已切换到专注模式" : "已切换到休息模式");
  }

  function finish() {
    running = false;
    if (ticker) { clearInterval(ticker); ticker = null; }
    chime();
    if (mode === "focus") {
      pomo.count = (Number(pomo.count) || 0) + 1;
      pomo.date = todayStamp();
      persistPomo();
      toast("一个番茄完成，起身休息 " + pomo.breakMin + " 分钟吧");
      tomatoBox.classList.remove("flash");
      void tomatoBox.offsetWidth;
      tomatoBox.classList.add("flash");
      mode = "break";
    } else {
      toast("休息结束，准备开始下一个番茄");
      mode = "focus";
    }
    remaining = totalSec();
    renderPomo();
  }

  /* SECTION: chime */
  var chimeCtx = null;
  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!chimeCtx) chimeCtx = new Ctx();
      if (chimeCtx.state === "suspended" && chimeCtx.resume) chimeCtx.resume();
      [0, 0.19, 0.38].forEach(function (delay, i) {
        var osc = chimeCtx.createOscillator(), gain = chimeCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 2 ? 988 : 659;
        var t = chimeCtx.currentTime + delay;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain);
        gain.connect(chimeCtx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } catch (e) {}
  }

  /* SECTION: custom durations */
  function syncPanelInputs() {
    focusInput.value = String(pomo.focusMin);
    breakInput.value = String(pomo.breakMin);
    presetButtons.forEach(function (b) {
      var on = Number(b.dataset.focus) === pomo.focusMin &&
               Number(b.dataset.break) === pomo.breakMin;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyDurations(focusVal, breakVal, msg) {
    var f = clampMin(focusVal, 1, 180, pomo.focusMin);
    var b = clampMin(breakVal, 1, 60, pomo.breakMin);
    pomo.focusMin = f;
    pomo.breakMin = b;
    FOCUS_SEC = f * 60;
    BREAK_SEC = b * 60;
    persistPomo();
    reset();
    syncPanelInputs();
    panelHint.textContent = "";
    if (msg) toast(msg);
  }

  function readPanel() {
    var f = parseInt(focusInput.value, 10);
    var b = parseInt(breakInput.value, 10);
    if (!isFinite(f) || f < 1 || f > 180) {
      panelHint.textContent = "专注时长请填 1 ~ 180 之间的整数分钟";
      focusInput.focus();
      return false;
    }
    if (!isFinite(b) || b < 1 || b > 60) {
      panelHint.textContent = "休息时长请填 1 ~ 60 之间的整数分钟";
      breakInput.focus();
      return false;
    }
    return { f: f, b: b };
  }

  /* ==========================================================================
     三、音乐：环境白噪音 + 本地音乐播放
     ========================================================================== */
  var vol = clampMin(Number(readStore(VOL_KEY, 70)), 0, 100, 70);

  /* SECTION: ambient engine */
  var actx = null, master = null, ambNodes = {};

  function ensureCtx() {
    if (actx) {
      if (actx.state === "suspended" && actx.resume) actx.resume();
      return actx;
    }
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    actx = new Ctx();
    master = actx.createGain();
    master.gain.value = vol / 100 * 0.5;
    master.connect(actx.destination);
    return actx;
  }

  function noiseBuffer(ctx, kind) {
    var len = ctx.sampleRate * 3;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === "brown") {
        last = (last + 0.02 * w) / 1.02;
        data[i] = Math.max(-1, Math.min(1, last * 3.2));
      } else if (kind === "pink") {
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + w * 0.1848) * 0.32));
      } else {
        data[i] = w;
      }
    }
    return buf;
  }

  function lfo(ctx, freq, depth, target) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.frequency.value = freq;
    g.gain.value = depth;
    osc.connect(g);
    g.connect(target);
    osc.start();
    return { osc: osc, gain: g };
  }

  function buildAmbient(kind) {
    var ctx = ensureCtx();
    if (!ctx) return null;
    var src = ctx.createBufferSource();
    var nodes = [src];
    var gain = ctx.createGain();
    gain.gain.value = 0;
    src.buffer = noiseBuffer(ctx, kind === "wave" || kind === "fire" ? "brown" : kind === "cafe" ? "pink" : "white");
    src.loop = true;

    var head = src;
    function chain(node) { head.connect(node); head = node; nodes.push(node); }

    if (kind === "rain") {
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6500;
      chain(hp); chain(lp);
      gain.gain.value = 0.55;
      nodes.push(lfo(ctx, 0.09, 0.12, gain.gain).osc);
    } else if (kind === "wave") {
      var lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 420;
      chain(lp2);
      gain.gain.value = 0.35;
      nodes.push(lfo(ctx, 0.08, 0.3, gain.gain).osc);
    } else if (kind === "fire") {
      var lp3 = ctx.createBiquadFilter(); lp3.type = "lowpass"; lp3.frequency.value = 1100;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.7;
      chain(lp3);
      var crackle = ctx.createGain(); crackle.gain.value = 0.5;
      bp.connect(crackle); crackle.connect(gain); nodes.push(bp, crackle);
      lp3.connect(bp);
      gain.gain.value = 0.5;
      nodes.push(lfo(ctx, 0.6, 0.28, gain.gain).osc);
      nodes.push(lfo(ctx, 2.3, 0.2, crackle.gain).osc);
    } else if (kind === "cafe") {
      var lp4 = ctx.createBiquadFilter(); lp4.type = "lowpass"; lp4.frequency.value = 1300;
      chain(lp4);
      gain.gain.value = 0.34;
      nodes.push(lfo(ctx, 0.14, 0.1, gain.gain).osc);
      nodes.push(lfo(ctx, 0.31, 0.07, gain.gain).osc);
    }

    head.connect(gain);
    gain.connect(master);
    nodes.push(gain);
    src.start();
    return { src: src, gain: gain, nodes: nodes };
  }

  function toggleAmbient(kind, btn) {
    var on = btn.getAttribute("aria-pressed") === "true";
    if (on) {
      var node = ambNodes[kind];
      if (node) {
        try { node.src.stop(); } catch (e) {}
        node.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
      }
      delete ambNodes[kind];
      btn.setAttribute("aria-pressed", "false");
      toast(btn.dataset.name + " 已关闭");
      return;
    }
    var built = buildAmbient(kind);
    if (!built) { toast("当前浏览器不支持音频播放"); return; }
    ambNodes[kind] = built;
    btn.setAttribute("aria-pressed", "true");
    toast("正在播放：" + btn.dataset.name);
  }

  function ambientActive() {
    return ambButtons.some(function (b) { return b.getAttribute("aria-pressed") === "true"; });
  }

  /* SECTION: volume */
  function applyVolume() {
    volVal.textContent = vol + "%";
    volRange.value = String(vol);
    if (audio) audio.volume = vol / 100;
    if (master) master.gain.value = vol / 100 * 0.5;
    writeStore(VOL_KEY, vol);
  }

  /* SECTION: local music playlist */
  var tracks = [];
  var current = -1;
  var seeking = false;

  function cleanName(name) {
    return name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").trim() || "未命名音频";
  }
  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "00:00";
    var s = Math.round(sec);
    if (s >= 3600) return Math.floor(s / 3600) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60);
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  }

  function addFiles(fileList) {
    var list = [].slice.call(fileList || []);
    var audioFiles = list.filter(function (f) {
      return /^audio\//i.test(f.type) || /\.(mp3|m4a|aac|wav|ogg|flac|opus|webm)$/i.test(f.name);
    });
    if (audioFiles.length === 0) {
      toast("没有识别到音频文件，换个文件试试");
      return;
    }
    var firstNew = -1;
    audioFiles.forEach(function (f) {
      var idx = tracks.length;
      tracks.push({ name: cleanName(f.name), url: URL.createObjectURL(f) });
      if (firstNew < 0) firstNew = idx;
    });
    renderPlaylist();
    toast("已加入 " + audioFiles.length + " 首音乐");
    if (current < 0) playIndex(firstNew);
  }

  function renderPlaylist() {
    while (playlist.firstChild) playlist.removeChild(playlist.firstChild);
    musicEmpty.hidden = tracks.length > 0;
    tracks.forEach(function (t, i) {
      var li = document.createElement("li");
      li.className = "track" + (i === current ? " playing" : "");

      var play = document.createElement("button");
      play.type = "button";
      play.className = "play";
      play.setAttribute("aria-label", i === current && !audio.paused ? "暂停这首" : "播放这首");
      play.appendChild(icon(i === current && !audio.paused ? "pause" : "play"));
      play.addEventListener("click", function () {
        if (i === current) togglePlay();
        else playIndex(i);
      });

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = t.name;
      name.title = t.name;

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "rm";
      rm.setAttribute("aria-label", "从列表移除");
      rm.appendChild(icon("x"));
      rm.addEventListener("click", function () { removeTrack(i); });

      li.appendChild(play);
      li.appendChild(name);
      li.appendChild(rm);
      playlist.appendChild(li);
    });
  }

  function removeTrack(i) {
    if (i < 0 || i >= tracks.length) return;
    var t = tracks[i];
    try { URL.revokeObjectURL(t.url); } catch (e) {}
    tracks.splice(i, 1);
    if (i === current) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      current = -1;
      nowbar.hidden = true;
      if (tracks.length > 0) playIndex(Math.min(i, tracks.length - 1));
    } else if (i < current) {
      current--;
    }
    renderPlaylist();
    if (current >= 0) renderNow();
    toast("已移除：" + t.name);
  }

  function playIndex(i) {
    if (i < 0 || i >= tracks.length) return;
    current = i;
    audio.src = tracks[i].url;
    audio.volume = vol / 100;
    nowbar.hidden = false;
    var p = audio.play();
    if (p && typeof p.catch === "function") p.catch(function () {
      toast("浏览器阻止了自动播放，点一下播放按钮");
    });
    renderPlaylist();
    renderNow();
  }

  function togglePlay() {
    if (current < 0) {
      if (tracks.length > 0) playIndex(0);
      else toast("先添加本地音乐文件");
      return;
    }
    if (audio.paused) {
      var p = audio.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } else {
      audio.pause();
    }
  }

  function step(delta) {
    if (tracks.length === 0) { toast("列表还是空的，先添加音乐"); return; }
    var next = (current + delta) % tracks.length;
    if (next < 0) next += tracks.length;
    playIndex(next);
  }

  function renderNow() {
    var t = tracks[current];
    nowTitle.textContent = t ? t.name : "";
    while (nowEq.firstChild) nowEq.removeChild(nowEq.firstChild);
    nowEq.appendChild(icon(!audio.paused && current >= 0 ? "eq" : "note"));
    setBtnLabel(playBtn, !audio.paused && current >= 0 ? "pause" : "play", "");
    playBtn.setAttribute("aria-label", !audio.paused ? "暂停" : "播放");
    timeNow.textContent = fmtTime(audio.currentTime);
    timeTotal.textContent = fmtTime(audio.duration);
    if (!seeking) {
      var max = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      seekBar.max = String(max || 0);
      seekBar.value = String(Math.min(audio.currentTime, max || 0));
      seekBar.disabled = !max;
    }
  }

  /* SECTION: events */
  addBtn.addEventListener("click", addTodo);
  todoInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addTodo(); }
  });
  todoInput.addEventListener("input", function () {
    if (inputHint.textContent) inputHint.textContent = "";
  });
  segButtons.forEach(function (b) {
    b.addEventListener("click", function () { setFilter(b.dataset.filter); });
  });
  clearDone.addEventListener("click", function () {
    var n = todos.filter(function (t) { return t.done; }).length;
    if (n === 0) { toast("没有已完成的任务可清空"); return; }
    todos = todos.filter(function (t) { return !t.done; });
    persistTodos();
    renderTodos();
    toast("已清空 " + n + " 项已完成任务");
  });

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", function () { reset(); toast("计时已重置"); });
  modeButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.mode === mode) return;
      if (running && !window.confirm("计时进行中，切换模式会重置当前计时，继续吗？")) return;
      switchMode(b.dataset.mode);
    });
  });

  settingBtn.addEventListener("click", function () {
    var open = !panel.hasAttribute("hidden");
    if (open) {
      panel.setAttribute("hidden", "");
      settingBtn.setAttribute("aria-expanded", "false");
    } else {
      panel.removeAttribute("hidden");
      settingBtn.setAttribute("aria-expanded", "true");
      syncPanelInputs();
      focusInput.focus();
    }
  });

  applyBtn.addEventListener("click", function () {
    var v = readPanel();
    if (!v) return;
    if (running && !window.confirm("计时进行中，修改时长会重置当前计时，继续吗？")) return;
    applyDurations(v.f, v.b, "时长已更新：专注 " + v.f + " 分钟 / 休息 " + v.b + " 分钟");
  });

  presetButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = Number(b.dataset.focus), br = Number(b.dataset.break);
      if (running && !window.confirm("计时进行中，切换预设会重置当前计时，继续吗？")) return;
      applyDurations(f, br, "已切换到" + b.dataset.name);
    });
  });

  [focusInput, breakInput].forEach(function (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyBtn.click(); }
    });
    inp.addEventListener("input", function () { panelHint.textContent = ""; });
  });

  ambButtons.forEach(function (b) {
    b.addEventListener("click", function () { toggleAmbient(b.dataset.sound, b); });
  });

  volRange.addEventListener("input", function () {
    vol = clampMin(Number(volRange.value), 0, 100, 70);
    applyVolume();
  });

  fileInput.addEventListener("change", function () {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  audio.addEventListener("play", function () { renderPlaylist(); renderNow(); });
  audio.addEventListener("pause", function () { renderPlaylist(); renderNow(); });
  audio.addEventListener("timeupdate", renderNow);
  audio.addEventListener("loadedmetadata", renderNow);
  audio.addEventListener("ended", function () { step(1); });
  audio.addEventListener("error", function () {
    if (current >= 0) toast("这首播放不了，可能是格式不支持");
  });
  seekBar.addEventListener("input", function () {
    seeking = true;
    timeNow.textContent = fmtTime(Number(seekBar.value));
  });
  seekBar.addEventListener("change", function () {
    var v = Number(seekBar.value);
    if (isFinite(v) && isFinite(audio.duration) && audio.duration > 0) audio.currentTime = v;
    seeking = false;
    renderNow();
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.code === "Space") { e.preventDefault(); start(); }
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && running) tick();
  });

  window.addEventListener("beforeunload", function () {
    persistTodos();
    persistPomo();
  });

  /* SECTION: init */
  syncPanelInputs();
  applyVolume();
  renderPlaylist();
  nowbar.hidden = true;
  renderTomatoes();
  renderTodos();
  renderPomo();
})();
