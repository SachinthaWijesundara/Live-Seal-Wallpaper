// Boot: canvas sizing, input, the animation loop and the Lively Wallpaper property bridge.
(function () {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const demo = params.has('demo'); // ?demo -> seal starts mid-"Arf!" (used for screenshots)

  const scene = new SB.Scene();
  const effects = new SB.Effects();
  const bubble = new SB.Bubble();
  const seal = new SB.Seal(scene, effects, bubble);
  const pointer = { x: 0, y: 0, seen: false, lastMove: 0 };

  let W = 0;
  let H = 0;
  let dpr = 1;

  function resize() {
    const oldW = W;
    const oldH = H;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    scene.resize(W, H, dpr);

    if (!seal.placed) {
      const p = scene.clampToWalk(W * 0.52, H * 0.78);
      seal.place(p.x, p.y);
    } else if (oldW && oldH) {
      const p = scene.clampToWalk((seal.x / oldW) * W, (seal.y / oldH) * H);
      const t = scene.clampToWalk((seal.tx / oldW) * W, (seal.ty / oldH) * H);
      seal.x = p.x;
      seal.y = p.y;
      seal.tx = t.x;
      seal.ty = t.y;
      effects.clear();
    }
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.seen = true;
    pointer.lastMove = performance.now();
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    pointer.x = x;
    pointer.y = y;
    pointer.seen = true;
    pointer.lastMove = performance.now();

    if (seal.hitTest(x, y)) {
      seal.poke();
    } else {
      const t = scene.clampToWalk(x, y);
      seal.goTo(t.x, t.y);
      effects.ripple(t.x, t.y, (scene.H / 1080) * lerpDepth(t.y));
    }
  });

  function lerpDepth(y) {
    return SB.util.lerp(0.78, 1.2, scene.depth(y));
  }

  window.addEventListener('contextmenu', (e) => e.preventDefault());

  if (demo) {
    seal.lastSound = 'Arf! Arf!';
    bubble.show('Arf! Arf!', 1e9);
  }

  // ?mood=1 -> start in Golden Hour (handy when previewing in a normal browser).
  if (params.has('mood')) {
    SB.config.skyMood = Number(params.get('mood')) || 0;
    scene.setPalette(SB.config.skyMood);
  }

  // ---------- loop ----------

  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const limit = SB.config.fpsLimit;
    if (limit > 0 && now - last < 1000 / limit - 2) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    scene.update(dt);
    seal.update(dt, pointer);
    effects.update(dt);
    bubble.update(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.drawBackground(ctx);
    effects.drawGround(ctx);

    const items = scene.props();
    items.push({ y: seal.y, draw: (c) => seal.draw(c) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw(ctx);

    effects.drawAir(ctx);
    bubble.draw(ctx, seal.headTop, seal.scale, W, H);
  }

  requestAnimationFrame(frame);

  // ---------- Lively Wallpaper customisation ----------
  // Lively calls this once per property on load, and again whenever a value changes in its
  // "Customise" panel. Names match the keys in LivelyProperties.json.
  window.livelyPropertyListener = function (name, val) {
    const cfg = SB.config;
    switch (name) {
      case 'skyMood':
        cfg.skyMood = Number(val) || 0;
        scene.setPalette(cfg.skyMood);
        break;
      case 'sealSize':
        cfg.sealSize = Number(val) || 1;
        break;
      case 'sealSpeed':
        cfg.sealSpeed = Number(val) || 1;
        break;
      case 'bubbleTime':
        cfg.bubbleTime = Number(val) || 2.5;
        break;
      case 'sleepAfter':
        cfg.sleepAfter = Number(val) || 0;
        if (cfg.sleepAfter === 0) seal.wake();
        break;
      case 'showGulls':
        cfg.showGulls = !!val;
        break;
      case 'showTracks':
        cfg.showTracks = !!val;
        break;
      case 'showSandcastle':
        cfg.showSandcastle = !!val;
        break;
      case 'fpsLimit':
        cfg.fpsLimit = [30, 60, 0][Number(val)] ?? 60;
        break;
      case 'sounds': {
        const list = String(val || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        cfg.sounds = list.length ? list : SB.DEFAULT_SOUNDS.slice();
        break;
      }
      case 'resetSeal': {
        const p = scene.clampToWalk(W * 0.52, H * 0.78);
        seal.goTo(p.x, p.y);
        break;
      }
    }
  };
})();
