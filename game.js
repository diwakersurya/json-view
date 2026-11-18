// Game mode for JSON View: the parsed JSON becomes a dungeon. Every object or array is a
// room, its children lie on the floor, and you hunt for the value at a given path.
// Loaded by index.html only for ?mode=game. Uses its globals: isBox, pathStr, Num.
window.jsonDungeon = (() => {
  const T = 32;            // tile size in CSS px
  const CW = 5, CH = 4;    // floor cell per child, in tiles: label row, sprite row, value row, gap
  const TOP = 60, BOTTOM = 92;
  const STEP = 110;        // ms per tile at walking pace
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const DIRS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clip = (s, n) => s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
  const clipLeft = (s, n) => s.length > n ? '…' + s.slice(s.length - n + 1) : s;
  const size = v => Array.isArray(v) ? v.length : Object.keys(v).length;
  const kind = v => v === null ? 'null' : Array.isArray(v) ? 'array' : v instanceof Num ? 'number' : typeof v;
  const text = v => isBox(v) ? (Array.isArray(v) ? `[${size(v)}]` : `{${size(v)}}`) : v instanceof Num ? v.src : JSON.stringify(v);
  const keyText = k => typeof k === 'number' ? `[${k}]` : JSON.stringify(k);

  // A room is built only when you walk into it, so big documents cost nothing up front.
  function room(v, k, i) {
    const items = (Array.isArray(v) ? v.map((x, j) => [j, x]) : Object.entries(v)).map(([k, v]) => ({ k, v }));
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length * 1.5)));
    const rows = Math.max(1, Math.ceil(items.length / cols));
    return { v, k, i, items, cols, W: cols * CW + 2, H: rows * CH + 2 };
  }
  const tileOf = (r, i) => [3 + (i % r.cols) * CW, 3 + Math.floor(i / r.cols) * CH];
  function indexAt(r, x, y) {
    const cx = x - 3, cy = y - 3;
    if (cx < 0 || cy < 0 || cx % CW || cy % CH || cx / CW >= r.cols) return -1;
    const i = (cy / CH) * r.cols + cx / CW;
    return i < r.items.length ? i : -1;
  }

  // Random walk from the root to a primitive. Null when the document holds no values.
  function pickTarget(root, rand = Math.random) {
    for (let tries = 0; tries < 40; tries++) {
      const parts = [];
      let v = root;
      while (isBox(v) && size(v)) {
        const keys = Array.isArray(v) ? null : Object.keys(v);
        const i = Math.floor(rand() * size(v)), k = keys ? keys[i] : i;
        parts.push(k);
        v = v[k];
      }
      if (!isBox(v)) return parts;
    }
    return null;
  }

  // Custom properties hold light-dark() pairs, so resolve them through a real element.
  function palette() {
    const probe = document.body.appendChild(document.createElement('i')), out = {};
    for (const n of ['paper', 'panel', 'ink', 'muted', 'line', 'accent', 'on-accent', 'key', 'str', 'num', 'bool', 'd0', 'd1', 'd2', 'd3']) {
      probe.style.color = `var(--${n})`;
      out[n] = getComputedStyle(probe).color;
    }
    probe.remove();
    return out;
  }

  let stop = () => {};

  function start(cv, root, usedSample) {
    stop();
    const ctx = cv.getContext('2d'), ac = new AbortController(), on = { signal: ac.signal };
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = matchMedia('(pointer: coarse)').matches;
    const stack = isBox(root) ? [room(root)] : [];
    const me = { x: 0, y: 0, rx: 0, ry: 0, face: [0, 1] };
    let C = palette(), w = 0, h = 0, dpr = 1, raf = 0, cam = [0, 0];
    let tween = null, held = null, run = false, goal = null, flash = 0, toast = null, spoken = '';
    let target = null, t0 = 0, found = 0;

    const parts = () => stack.slice(1).map(r => r.k);
    const say = msg => { toast = { msg, t: performance.now() }; };
    const place = (x, y) => { me.x = me.rx = x; me.y = me.ry = y; tween = goal = null; flash = calm ? 0 : 1; };
    function newTarget() {
      const old = target && pathStr(target);
      for (let i = 0; i < 5; i++) { target = pickTarget(root); if (!target || pathStr(target) !== old) break; }
      t0 = performance.now();
    }
    function up() {
      if (stack.length < 2) return;
      const { i } = stack.pop();
      place(...tileOf(stack.at(-1), i));
    }
    function act() {
      const r = stack.at(-1);
      if (!r) return;
      if (!me.x && !me.y) return up();
      const i = indexAt(r, me.x, me.y), it = r.items[i];
      if (!it) return;
      if (isBox(it.v)) { stack.push(room(it.v, it.k, i)); place(0, 0); return; }
      if (!target) return;
      if (pathStr([...parts(), it.k]) !== pathStr(target)) return say('Not this one. Keep looking.');
      found++;
      say(`Found in ${((performance.now() - t0) / 1000).toFixed(1)}s. Here is the next one.`);
      newTarget();
    }

    function update(now) {
      const r = stack.at(-1);
      if (!r) return;
      if (tween) {
        const p = Math.min(1, (now - tween.t) / tween.ms);
        me.rx = tween.x + (me.x - tween.x) * p;
        me.ry = tween.y + (me.y - tween.y) * p;
        if (p < 1) return;
        tween = null;
      }
      let d = held, far = 0;
      if (!d && goal) {
        far = Math.abs(goal[0] - me.x) + Math.abs(goal[1] - me.y);
        d = goal[0] !== me.x ? [Math.sign(goal[0] - me.x), 0] : goal[1] !== me.y ? [0, Math.sign(goal[1] - me.y)] : null;
        if (!d) goal = null;
      }
      if (!d) return;
      me.face = d;
      const x = me.x + d[0], y = me.y + d[1];
      if (x < 0 || y < 0 || x >= r.W || y >= r.H) return;
      // Long tap-to-walk trips speed up so crossing a 1,000-item room is not a chore.
      tween = { x: me.x, y: me.y, t: now, ms: far ? Math.max(25, STEP - far * 6) : run ? 45 : STEP };
      me.x = x; me.y = y;
    }

    const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); };
    const box = (x, y, bw, bh, r) => { ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); };
    const colorOf = (v, depth) => isBox(v) ? C['d' + (depth + 1) % 4] : v === null ? C.muted : typeof v === 'string' ? C.str : typeof v === 'boolean' ? C.bool : C.num;

    function sprite(v, cx, cy, depth) {
      const col = colorOf(v, depth);
      ctx.strokeStyle = ctx.fillStyle = col;
      ctx.lineWidth = 2;
      if (isBox(v)) {                        // hatch to the room below, in that room's wall colour
        box(cx - 13, cy - 13, 26, 26, Array.isArray(v) ? 2 : 9);
        ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.font = `700 12px ${MONO}`;
        ctx.fillText(Array.isArray(v) ? '[ ]' : '{ }', cx, cy + 1);
      } else if (v === null) {               // empty ring
        ctx.setLineDash([3, 3]); circle(cx, cy, 9); ctx.stroke(); ctx.setLineDash([]);
      } else if (typeof v === 'boolean') {   // switch, thrown right when true
        box(cx - 13, cy - 7, 26, 14, 7); ctx.stroke();
        circle(cx + (v ? 6 : -6), cy, 3.5); v ? ctx.fill() : ctx.stroke();
      } else if (typeof v === 'string') {    // note with two lines of writing
        box(cx - 12, cy - 9, 24, 18, 3); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx + 7, cy - 3); ctx.moveTo(cx - 7, cy + 3); ctx.lineTo(cx + 2, cy + 3);
        ctx.stroke();
      } else {                               // coin
        circle(cx, cy, 10); ctx.stroke();
        ctx.font = `700 11px ${MONO}`; ctx.fillText('#', cx, cy + 1);
      }
    }

    function draw(now, dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      const r = stack.at(-1), depth = stack.length - 1;
      if (!r) {
        ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `14px ${MONO}`;
        ctx.fillText('This JSON is a single value, so there are no rooms.', w / 2, h / 2 - 12);
        ctx.fillStyle = C.muted;
        ctx.fillText('Exit the game and paste an object or an array.', w / 2, h / 2 + 12);
        return;
      }

      // Camera follows the player; a room smaller than the view sits centred.
      const RW = r.W * T, RH = r.H * T, vh = h - TOP - BOTTOM;
      cam = [
        RW + 2 * T <= w ? (RW - w) / 2 : clamp(me.rx * T + T / 2 - w / 2, -T, RW + T - w),
        RH + 2 * T <= vh ? (RH - vh) / 2 : clamp(me.ry * T + T / 2 - vh / 2, -T, RH + T - vh),
      ];
      ctx.save();
      ctx.beginPath(); ctx.rect(0, TOP, w, vh); ctx.clip();
      ctx.translate(-cam[0], TOP - cam[1]);

      // Walls: braces round the corners of an object, brackets keep an array square.
      box(-T / 2, -T / 2, RW + T, RH + T, Array.isArray(r.v) ? 3 : T);
      ctx.fillStyle = C.panel; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = C['d' + depth % 4]; ctx.stroke();

      const x0 = Math.max(0, Math.floor(cam[0] / T)), x1 = Math.min(r.W - 1, Math.ceil((cam[0] + w) / T));
      const y0 = Math.max(0, Math.floor(cam[1] / T)), y1 = Math.min(r.H - 1, Math.ceil((cam[1] + vh) / T));
      ctx.fillStyle = C.line;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.fillRect(x * T + T / 2 - 1, y * T + T / 2 - 1, 2, 2);

      ctx.textAlign = 'center';
      if (depth) {                           // stairs back to the parent, in the parent's colour
        ctx.strokeStyle = ctx.fillStyle = C['d' + (depth - 1) % 4]; ctx.lineWidth = 2;
        box(3, 3, 26, 26, 4); ctx.stroke();
        ctx.font = `700 14px ${MONO}`; ctx.fillText('↑', T / 2, T / 2 + 1);
        ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.fillText('up', T / 2, T * 1.5 - 4);
      }
      for (let row = Math.max(0, Math.floor((y0 - 4) / CH)); row <= Math.floor(y1 / CH); row++) {
        for (let c = Math.max(0, Math.floor((x0 - 5) / CW)); c <= Math.min(r.cols - 1, Math.floor(x1 / CW)); c++) {
          const it = r.items[row * r.cols + c];
          if (!it) break;
          const cx = (3 + c * CW) * T + T / 2, cy = (3 + row * CH) * T + T / 2;
          ctx.font = `11px ${MONO}`;
          ctx.fillStyle = typeof it.k === 'number' ? C.muted : C.key;
          ctx.fillText(clip(keyText(it.k), 22), cx, cy - T + 4);
          ctx.fillStyle = colorOf(it.v, depth);
          ctx.fillText(clip(it.t ??= text(it.v), 22), cx, cy + T - 4);
          sprite(it.v, cx, cy, depth);
        }
      }

      // The player: a text cursor with eyes.
      const px = me.rx * T + T / 2, py = me.ry * T + T / 2 + (calm ? 0 : Math.sin(now / 260) * 1.5);
      box(px - 10, py - 10, 20, 20, 6); ctx.fillStyle = C.accent; ctx.fill();
      ctx.fillStyle = C['on-accent'];
      for (const side of [-4, 4]) { circle(px + side + me.face[0] * 2, py - 1 + me.face[1] * 2, 2); ctx.fill(); }
      ctx.restore();

      if (flash > 0) {
        ctx.globalAlpha = flash; ctx.fillStyle = C.paper; ctx.fillRect(0, TOP, w, vh); ctx.globalAlpha = 1;
        flash -= dt / 200;
      }

      // Top band: where you are, and what you are looking for.
      ctx.font = `12px ${MONO}`;
      const max = Math.max(8, Math.floor((w - 32) / ctx.measureText('m').width));
      const here = pathStr(parts()), i = indexAt(r, me.x, me.y), it = r.items[i];
      const stats = target ? `${Math.floor((now - t0) / 60000)}:${String(Math.floor((now - t0) / 1000) % 60).padStart(2, '0')}  Found ${found}` : '';
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
      ctx.fillText('Room', 16, 20); ctx.fillText('Find', 16, 42);
      ctx.fillStyle = C.ink;
      const lx = 16 + ctx.measureText('Room ').width;
      ctx.fillText(clipLeft(here, max - 6 - stats.length - 2), lx, 20);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText(stats, w - 16, 20);
      ctx.textAlign = 'left';
      if (target) {
        // The part of the target path you have already reached lights up.
        const at = it ? [...parts(), it.k] : parts();
        let n = 0;
        while (n < at.length && n < target.length && at[n] === target[n]) n++;
        let lit = pathStr(target.slice(0, n)), rest = pathStr(target).slice(lit.length);
        const over = lit.length + rest.length - (max - 6) + 1;
        if (over > 1) lit.length >= over ? lit = '…' + lit.slice(over) : (rest = '…' + rest.slice(over - lit.length), lit = '');
        ctx.fillStyle = C.accent; ctx.fillText(lit, lx, 42);
        ctx.fillStyle = C.ink; ctx.fillText(rest, lx + ctx.measureText(lit).width, 42);
      } else ctx.fillText('Nothing to find: this JSON holds no values.', lx, 42);

      // Bottom band: what you are standing on, and what you can do with it.
      const use = touch ? 'Tap yourself' : 'Enter';
      let lines;
      if (depth && !me.x && !me.y) lines = [`Stairs to ${clipLeft(pathStr(parts().slice(0, -1)), max - 10)}`, '', '', `${use} to go up`];
      else if (it && isBox(it.v)) lines = [`${clip(keyText(it.k), max - 24)}  ${kind(it.v)}, ${size(it.v)} inside`, '', '', `${use} to go down`];
      else if (it) lines = [`${clip(keyText(it.k), max - 10)}  ${kind(it.v)}`, it.t.slice(0, max), clip(it.t.slice(max), max), target ? `${use} to claim it` : ''];
      else lines = touch
        ? ['Tap a spot to walk there.', 'Tap yourself to use what you stand on.', '', '']
        : ['Arrows or WASD to walk. Shift to run.', 'Enter to use what you stand on. Esc to go up.', '', ''];
      ctx.fillStyle = C.line; ctx.fillRect(0, TOP, w, 1); ctx.fillRect(0, h - BOTTOM, w, 1);
      lines.forEach((s, n) => {
        ctx.fillStyle = n === 0 ? C.ink : n === 3 ? C.muted : it ? colorOf(it.v, depth) : C.ink;
        ctx.fillText(s, 16, h - BOTTOM + 18 + n * 19);
      });

      if (toast) {
        const age = now - toast.t;
        if (age > 2400) toast = null;
        else {
          ctx.font = `600 13px ${MONO}`; ctx.textAlign = 'center';
          const tw = ctx.measureText(toast.msg).width + 24;
          ctx.globalAlpha = Math.min(1, (2400 - age) / 400);
          box(w / 2 - tw / 2, h - BOTTOM - 44, tw, 30, 6); ctx.fillStyle = C.ink; ctx.fill();
          ctx.fillStyle = C.paper; ctx.fillText(toast.msg, w / 2, h - BOTTOM - 28);
          ctx.globalAlpha = 1;
        }
      }

      // Canvas fallback content is what assistive tech reads.
      const live = `Room ${here}. ${target ? `Find ${pathStr(target)}. Found ${found}. ` : ''}${lines.filter(Boolean).join('. ')}`;
      if (live !== spoken) cv.textContent = spoken = live;
    }

    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('a, button, input, select, textarea')) return;
      const key = e.key.toLowerCase();
      if (DIRS[key]) { held = DIRS[key]; run = e.shiftKey; goal = null; }
      else if (key === 'enter' || key === ' ') { if (!e.repeat) act(); }
      else if (key === 'escape' || key === 'backspace') { if (!e.repeat) up(); }
      else return;
      e.preventDefault();
    }, on);
    addEventListener('keyup', e => { if (DIRS[e.key.toLowerCase()] === held) held = null; }, on);
    addEventListener('blur', () => { held = null; }, on);
    cv.addEventListener('pointerdown', e => {
      const r = stack.at(-1);
      if (!r || e.offsetY < TOP || e.offsetY > h - BOTTOM) return;
      let x = Math.floor((e.offsetX + cam[0]) / T), y = Math.floor((e.offsetY - TOP + cam[1]) / T);
      // A tap on an item's label or value counts as a tap on the item.
      const [ix, iy] = [3 + Math.floor((x - 1) / CW) * CW, 3 + Math.floor((y - 2) / CH) * CH];
      if (Math.abs(y - iy) <= 1 && indexAt(r, ix, iy) >= 0) [x, y] = [ix, iy];
      if (x === me.x && y === me.y) return act();
      goal = [clamp(x, 0, r.W - 1), clamp(y, 0, r.H - 1)];
    }, on);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { C = palette(); }, on);

    const fit = () => {
      dpr = devicePixelRatio || 1; w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    fit();

    if (stack.length) newTarget();
    if (usedSample) say('That input was not valid JSON, so this is the sample.');
    cv.focus({ preventScroll: true });
    let last = performance.now();
    const frame = now => { update(now); draw(now, now - last); last = now; raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    stop = () => { cancelAnimationFrame(raf); ac.abort(); ro.disconnect(); stop = () => {}; };
  }

  return { start, stop: () => stop(), room, tileOf, indexAt, pickTarget };
})();
