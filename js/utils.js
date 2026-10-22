// Shared namespace + small math/drawing helpers.
window.SB = window.SB || {};

SB.TAU = Math.PI * 2;

SB.util = {
  clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  rand(a, b) {
    return a + Math.random() * (b - a);
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Deterministic RNG so the sand texture / decorations look the same on every resize.
  seeded(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeInBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },

  // Adds a rounded rectangle sub-path (does not begin/close the overall path).
  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.25);
    ctx.bezierCurveTo(x - s * 0.45, y - s * 0.55, x - s * 0.05, y - s * 0.5, x, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.05, y - s * 0.5, x + s * 0.45, y - s * 0.55, x + s * 0.5, y - s * 0.25);
    ctx.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
    ctx.closePath();
  },
};
