// The sunny beach: sky, sun, clouds, gulls, sea, shoreline waves, sand, palm tree and sandcastle.
(function () {
  const { clamp, lerp, seeded, roundRect } = SB.util;
  const TAU = SB.TAU;

  class Scene {
    constructor() {
      this.palette = SB.palettes[0];
      this.bg = document.createElement('canvas');
      this.clouds = [];
      this.gulls = [];
      this.glitter = [];
      this.crests = [];
      this.foamDots = [];
      this.t = 0;
    }

    setPalette(index) {
      this.palette = SB.palettes[clamp(index | 0, 0, SB.palettes.length - 1)];
      if (this.W) this.resize(this.W, this.H, this.dpr);
    }

    resize(W, H, dpr) {
      this.W = W;
      this.H = H;
      this.dpr = dpr;

      // Layout bands (fractions of screen height).
      this.horizonY = H * 0.43;
      this.shoreY = H * 0.585;
      this.surgeAmp = H * 0.04;
      this.walkTop = this.shoreY + this.surgeAmp * 0.8 + H * 0.015;
      this.walkBottom = H * 0.93;
      this.walkLeft = W * 0.05;
      this.walkRight = W * 0.95;

      this.palm = { x: W * 0.905, y: H * 0.9 };
      this.castle = { x: W * 0.17, y: H * 0.8 };

      this.buildBackground();
      this.buildClouds();
      this.buildGulls();
      this.buildSea();
    }

    clampToWalk(x, y) {
      return {
        x: clamp(x, this.walkLeft, this.walkRight),
        y: clamp(y, this.walkTop, this.walkBottom),
      };
    }

    // 0 at the shoreline, 1 at the bottom of the walkable sand. Used for perspective scaling.
    depth(y) {
      return clamp((y - this.walkTop) / (this.walkBottom - this.walkTop), 0, 1);
    }

    // ---------- static background (rebuilt only on resize / palette change) ----------

    buildBackground() {
      const { W, H, dpr, palette: p } = this;
      const bg = this.bg;
      bg.width = Math.round(W * dpr);
      bg.height = Math.round(H * dpr);
      const g = bg.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hy = this.horizonY;
      const sy = this.shoreY;

      // Sky
      const sky = g.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, p.skyTop);
      sky.addColorStop(0.55, p.skyMid);
      sky.addColorStop(1, p.skyHorizon);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, hy + 1);

      // Sun glow + disk
      const sx = p.sunX * W;
      const sunY = p.sunY * H;
      const sr = p.sunR * H;
      const glow = g.createRadialGradient(sx, sunY, sr * 0.6, sx, sunY, sr * 8);
      glow.addColorStop(0, `rgba(${p.sunGlow},0.95)`);
      glow.addColorStop(0.2, `rgba(${p.sunGlow},0.4)`);
      glow.addColorStop(1, `rgba(${p.sunGlow},0)`);
      g.fillStyle = glow;
      g.fillRect(0, 0, W, hy);

      const disk = g.createRadialGradient(sx, sunY, 0, sx, sunY, sr);
      disk.addColorStop(0, p.sunCore);
      disk.addColorStop(0.75, p.sunCore);
      disk.addColorStop(1, p.sunRim);
      g.fillStyle = disk;
      g.beginPath();
      g.arc(sx, sunY, sr, 0, TAU);
      g.fill();

      // Far islands on the horizon
      this.drawIsland(g, W * 0.13, hy, W * 0.16, H * 0.03, p.islandFar, false);
      this.drawIsland(g, W * 0.25, hy, W * 0.075, H * 0.024, p.island, true);
      this.drawIsland(g, W * 0.5, hy, W * 0.05, H * 0.01, p.islandFar, false);

      // Sea
      const sea = g.createLinearGradient(0, hy, 0, sy);
      sea.addColorStop(0, p.seaFar);
      sea.addColorStop(0.45, p.seaMid);
      sea.addColorStop(1, p.seaNear);
      g.fillStyle = sea;
      g.fillRect(0, hy, W, sy - hy + 2);

      // Horizon haze
      const haze = g.createLinearGradient(0, hy - H * 0.01, 0, hy + H * 0.02);
      haze.addColorStop(0, 'rgba(255,255,255,0)');
      haze.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      haze.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = haze;
      g.fillRect(0, hy - H * 0.01, W, H * 0.03);

      // Soft sun reflection on the water
      g.save();
      g.translate(sx, hy);
      g.scale(1, 3.2);
      const refl = g.createRadialGradient(0, 0, 0, 0, 0, (sy - hy) / 3);
      refl.addColorStop(0, `rgba(${p.glitter},0.35)`);
      refl.addColorStop(1, `rgba(${p.glitter},0)`);
      g.fillStyle = refl;
      g.beginPath();
      g.arc(0, 0, (sy - hy) / 3, 0, Math.PI);
      g.fill();
      g.restore();

      // Sand
      const sandTop = sy - 6;
      const sand = g.createLinearGradient(0, sandTop, 0, H);
      sand.addColorStop(0, p.sandTop);
      sand.addColorStop(1, p.sandBottom);
      g.fillStyle = sand;
      g.fillRect(0, sandTop, W, H - sandTop);

      // Sand speckles
      const rng = seeded(1337);
      const count = Math.floor((W * (H - sandTop)) / 55);
      for (let i = 0; i < count; i++) {
        const x = rng() * W;
        const y = sandTop + rng() * (H - sandTop);
        const s = 0.6 + rng() * 1.6;
        g.fillStyle = rng() < 0.55 ? `rgba(${p.sandDark},${0.12 + rng() * 0.2})` : `rgba(${p.sandLight},${0.25 + rng() * 0.35})`;
        g.fillRect(x, y, s, s);
      }

      // Wind ripples in the sand
      g.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const y = lerp(sy + H * 0.06, H * 0.98, rng());
        const x = rng() * W;
        const len = W * (0.05 + rng() * 0.08);
        g.strokeStyle = `rgba(${p.sandDark},0.12)`;
        g.lineWidth = 1.5 + rng() * 1.5;
        g.beginPath();
        g.moveTo(x - len / 2, y);
        g.quadraticCurveTo(x, y - H * 0.008, x + len / 2, y);
        g.stroke();
      }

      // Flat beach decorations
      this.drawStarfish(g, W * 0.34, H * 0.9, H * 0.018, 0.3, '#f2875a');
      this.drawStarfish(g, W * 0.63, H * 0.705, H * 0.011, 1.1, '#f6a65f');
      this.drawShell(g, W * 0.46, H * 0.865, H * 0.012, -0.3);
      this.drawShell(g, W * 0.735, H * 0.93, H * 0.015, 0.4);
      this.drawShell(g, W * 0.07, H * 0.72, H * 0.01, 0.1);
      this.drawShell(g, W * 0.56, H * 0.66, H * 0.008, -0.6);
      for (let i = 0; i < 10; i++) {
        const x = rng() * W;
        const y = lerp(sy + H * 0.05, H * 0.97, rng());
        const r = H * (0.003 + rng() * 0.004);
        g.fillStyle = rng() < 0.5 ? '#c9b79c' : '#a89a86';
        g.beginPath();
        g.ellipse(x, y, r * 1.4, r, 0, 0, TAU);
        g.fill();
      }

      // Gentle warm vignette at the bottom
      const vig = g.createLinearGradient(0, H * 0.8, 0, H);
      vig.addColorStop(0, `rgba(${p.sandDark},0)`);
      vig.addColorStop(1, `rgba(${p.sandDark},0.18)`);
      g.fillStyle = vig;
      g.fillRect(0, H * 0.8, W, H * 0.2);
    }

    drawIsland(g, cx, by, w, h, color, withPalm) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(cx - w / 2, by + 1);
      g.bezierCurveTo(cx - w * 0.3, by - h * 1.1, cx + w * 0.15, by - h * 1.35, cx + w / 2, by + 1);
      g.closePath();
      g.fill();
      if (!withPalm) return;
      const px = cx - w * 0.05;
      const py = by - h * 0.95;
      const th = h * 1.6;
      g.strokeStyle = color;
      g.lineWidth = Math.max(1.5, h * 0.12);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + th * 0.15, py - th * 0.5, px + th * 0.05, py - th);
      g.stroke();
      const tx = px + th * 0.05;
      const ty = py - th;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI + (i / 5) * Math.PI;
        g.beginPath();
        g.moveTo(tx, ty);
        g.quadraticCurveTo(tx + Math.cos(a) * th * 0.35, ty + Math.sin(a) * th * 0.25 - th * 0.1, tx + Math.cos(a) * th * 0.55, ty + th * 0.15);
        g.stroke();
      }
    }

    drawStarfish(g, x, y, r, rot, color) {
      g.save();
      g.translate(x, y);
      g.scale(1, 0.6); // lying flat on the sand
      g.rotate(rot);
      g.fillStyle = 'rgba(120,80,40,0.18)';
      this.starPath(g, 2, 3, r);
      g.fill();
      g.fillStyle = color;
      g.strokeStyle = color;
      g.lineJoin = 'round';
      g.lineWidth = r * 0.35;
      this.starPath(g, 0, 0, r);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,240,220,0.7)';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 5;
        for (let k = 1; k <= 2; k++) {
          g.beginPath();
          g.arc(Math.cos(a) * r * 0.32 * k, Math.sin(a) * r * 0.32 * k, r * 0.07, 0, TAU);
          g.fill();
        }
      }
      g.restore();
    }

    starPath(g, ox, oy, r) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.42;
        const px = ox + Math.cos(a) * rr;
        const py = oy + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
    }

    drawShell(g, x, y, r, rot) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.fillStyle = 'rgba(120,80,40,0.18)';
      g.beginPath();
      g.ellipse(2, 3, r * 1.1, r * 0.5, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#f8d9cb';
      g.beginPath();
      g.moveTo(0, r * 0.35);
      g.arc(0, r * 0.35, r, Math.PI * 1.08, Math.PI * 1.92);
      g.closePath();
      g.fill();
      g.strokeStyle = '#d9a28e';
      g.lineWidth = Math.max(1, r * 0.1);
      for (let i = 1; i < 6; i++) {
        const a = Math.PI * (1.08 + (0.84 * i) / 6);
        g.beginPath();
        g.moveTo(0, r * 0.35);
        g.lineTo(Math.cos(a) * r * 0.95, r * 0.35 + Math.sin(a) * r * 0.95);
        g.stroke();
      }
      g.fillStyle = '#e8b8a6';
      g.beginPath();
      g.ellipse(0, r * 0.38, r * 0.22, r * 0.12, 0, 0, TAU);
      g.fill();
      g.restore();
    }

    // ---------- moving pieces ----------

    buildClouds() {
      const { W, H, dpr, palette: p } = this;
      const rng = seeded(42);
      this.clouds = [];
      for (let i = 0; i < 7; i++) {
        const far = rng();
        const w = H * lerp(0.36, 0.18, far);
        const h = w * 0.42;
        this.clouds.push({
          img: this.makeCloud(w, h, p, rng, dpr),
          w,
          h,
          x: rng() * (W + w) - w,
          y: lerp(H * 0.04, this.horizonY - h * 1.05, Math.pow(far, 0.8)),
          speed: H * lerp(0.012, 0.004, far),
          alpha: lerp(0.98, 0.8, far),
        });
      }
      // Draw distant (lower) clouds first.
      this.clouds.sort((a, b) => b.y - a.y);
    }

    makeCloud(w, h, p, rng, dpr) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const grad = g.createLinearGradient(0, h * 0.15, 0, h);
      grad.addColorStop(0, p.cloud);
      grad.addColorStop(0.65, p.cloud);
      grad.addColorStop(1, p.cloudShade);
      g.fillStyle = grad;
      g.beginPath();
      const n = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const cx = w * (0.14 + 0.72 * k);
        const r = h * (0.2 + 0.22 * Math.sin(Math.PI * k)) + rng() * h * 0.06;
        const cy = h * 0.66 - r * 0.45;
        g.moveTo(cx + r, cy);
        g.arc(cx, cy, r, 0, TAU);
      }
      roundRect(g, w * 0.12, h * 0.48, w * 0.76, h * 0.4, h * 0.2);
      g.fill();
      return c;
    }

    buildGulls() {
      const { W, H } = this;
      const rng = seeded(7);
      this.gulls = [];
      for (let i = 0; i < 4; i++) {
        this.gulls.push({
          x: rng() * W,
          y: H * (0.08 + rng() * 0.22),
          speed: H * (0.03 + rng() * 0.025),
          size: H * (0.011 + rng() * 0.008),
          phase: rng() * TAU,
          flap: 5 + rng() * 2,
        });
      }
    }

    buildSea() {
      const { W, H, palette: p } = this;
      const rng = seeded(99);
      const sx = p.sunX * W;
      this.glitter = [];
      for (let i = 0; i < 90; i++) {
        const yn = Math.pow(rng(), 1.3);
        const spread = lerp(p.sunR * H * 1.2, W * 0.16, yn);
        const gx = (rng() + rng() + rng() - 1.5) / 1.5; // ~gaussian
        this.glitter.push({ x: sx + gx * spread, yn, phase: rng() * TAU, speed: 1.5 + rng() * 3 });
      }
      this.crests = [];
      for (let i = 0; i < 46; i++) {
        this.crests.push({ x: rng() * W, yn: rng(), len: 0.5 + rng(), speed: 0.012 + rng() * 0.012 });
      }
      this.foamDots = [];
      for (let i = 0; i < 60; i++) {
        this.foamDots.push({ x: rng() * W, off: rng(), r: 1 + rng() * 2.2 });
      }
    }

    update(dt) {
      this.t += dt;
      const { W } = this;
      for (const c of this.clouds) {
        c.x += c.speed * dt;
        if (c.x > W + 10) c.x = -c.w - 10;
      }
      for (const g of this.gulls) {
        g.x += g.speed * dt;
        g.phase += dt * g.flap;
        if (g.x > W + 60) {
          g.x = -60;
          g.y = this.H * (0.08 + Math.random() * 0.22);
        }
      }
      for (const c of this.crests) {
        c.yn += c.speed * dt;
        if (c.yn > 1) {
          c.yn -= 1;
          c.x = Math.random() * W;
        }
      }
    }

    // Wavy water line on the sand at screen x.
    waterEdge(x, surge) {
      const { H, t } = this;
      return this.shoreY + this.surgeAmp * (surge - 0.3) + Math.sin(x * 0.006 + t * 0.9) * H * 0.006 + Math.sin(x * 0.019 - t * 1.3) * H * 0.003;
    }

    drawBackground(ctx) {
      const { W, H, t, palette: p } = this;
      ctx.drawImage(this.bg, 0, 0, W, H);

      // Slowly turning sun rays
      const sx = p.sunX * W;
      const sunY = p.sunY * H;
      const sr = p.sunR * H;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, this.horizonY);
      ctx.clip();
      ctx.translate(sx, sunY);
      ctx.rotate(t * 0.03);
      ctx.fillStyle = `rgba(${p.rays},0.07)`;
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const a = (i * TAU) / rays;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.06) * sr * 1.3, Math.sin(a - 0.06) * sr * 1.3);
        ctx.lineTo(Math.cos(a - 0.1) * sr * 7, Math.sin(a - 0.1) * sr * 7);
        ctx.lineTo(Math.cos(a + 0.1) * sr * 7, Math.sin(a + 0.1) * sr * 7);
        ctx.lineTo(Math.cos(a + 0.06) * sr * 1.3, Math.sin(a + 0.06) * sr * 1.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Clouds
      for (const c of this.clouds) {
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(c.img, c.x, c.y + Math.sin(t * 0.2 + c.x * 0.001) * 2, c.w, c.h);
      }
      ctx.globalAlpha = 1;

      if (SB.config.showGulls) this.drawGulls(ctx);
      this.drawSea(ctx);
      this.drawShore(ctx);
    }

    drawGulls(ctx) {
      ctx.strokeStyle = 'rgba(55,65,80,0.85)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const g of this.gulls) {
        const s = g.size;
        const f = Math.sin(g.phase);
        const y = g.y + Math.sin(g.phase * 0.15) * s * 1.5;
        const tip = -f * s * 0.7;
        ctx.lineWidth = Math.max(1.5, s * 0.22);
        ctx.beginPath();
        ctx.moveTo(g.x - s, y + tip);
        ctx.quadraticCurveTo(g.x - s * 0.45, y - s * 0.45 - f * s * 0.2, g.x, y);
        ctx.quadraticCurveTo(g.x + s * 0.45, y - s * 0.45 - f * s * 0.2, g.x + s, y + tip);
        ctx.stroke();
      }
    }

    drawSea(ctx) {
      const { t, palette: p, horizonY: hy, shoreY: sy } = this;
      const span = sy - hy;

      // Wave crests drifting toward the shore (perspective spaced)
      ctx.lineCap = 'round';
      for (const c of this.crests) {
        const yn = c.yn;
        const y = hy + span * Math.pow(yn, 1.7);
        const len = c.len * lerp(10, 70, yn);
        const a = 0.32 * Math.sin(Math.PI * yn);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = lerp(0.8, 2.4, yn);
        ctx.beginPath();
        ctx.moveTo(c.x - len / 2, y);
        ctx.quadraticCurveTo(c.x, y - lerp(0.5, 3, yn), c.x + len / 2, y);
        ctx.stroke();
      }

      // Sun glitter
      for (const g of this.glitter) {
        const a = Math.pow(Math.max(0, Math.sin(t * g.speed + g.phase)), 3) * 0.9;
        if (a < 0.02) continue;
        const y = hy + 2 + (span - 26) * g.yn;
        const w = lerp(2, 14, g.yn);
        ctx.fillStyle = `rgba(${p.glitter},${a})`;
        ctx.fillRect(g.x - w / 2, y, w, lerp(1, 2.4, g.yn));
      }
    }

    drawShore(ctx) {
      const { W, H, t, palette: p, shoreY: sy } = this;
      const surge = Math.sin(t * 0.55) * 0.5 + 0.5;
      const step = 14;

      // Wet sand band left by the waves
      ctx.fillStyle = `rgba(${p.wet},0.2)`;
      ctx.beginPath();
      ctx.moveTo(0, sy - 6);
      for (let x = 0; x <= W + step; x += step) {
        ctx.lineTo(x, sy + this.surgeAmp * 0.78 + Math.sin(x * 0.005 + 1) * H * 0.006);
      }
      ctx.lineTo(W, sy - 6);
      ctx.closePath();
      ctx.fill();

      // Shallow water washing up and down
      const top = sy - H * 0.03;
      const water = ctx.createLinearGradient(0, top, 0, sy + this.surgeAmp);
      water.addColorStop(0, `rgba(${p.seaNearRGB},1)`);
      water.addColorStop(0.45, `rgba(${p.seaNearRGB},0.75)`);
      water.addColorStop(1, `rgba(${p.seaNearRGB},0.3)`);
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.moveTo(0, top);
      for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, this.waterEdge(x, surge));
      ctx.lineTo(W, top);
      ctx.closePath();
      ctx.fill();

      // Foam on the leading edge
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = Math.max(2.5, H * 0.0035);
      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const y = this.waterEdge(x, surge);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // A second, incoming wave line a little further out
      const back = (1 - surge) * this.surgeAmp * 0.55 + H * 0.008;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(1.5, H * 0.002);
      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const y = this.waterEdge(x + 120, surge) - back;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Little foam bubbles
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const d of this.foamDots) {
        const y = this.waterEdge(d.x, surge) - d.off * H * 0.012;
        ctx.beginPath();
        ctx.arc(d.x + Math.sin(t + d.off * 9) * 3, y, d.r, 0, TAU);
        ctx.fill();
      }
    }

    // Objects that need depth sorting with the seal.
    props() {
      const list = [{ y: this.palm.y, draw: (c) => this.drawPalm(c) }];
      if (SB.config.showSandcastle) list.push({ y: this.castle.y, draw: (c) => this.drawCastle(c) });
      return list;
    }

    drawPalm(ctx) {
      const { H, t } = this;
      const bx = this.palm.x;
      const by = this.palm.y;
      const h = H * 0.56;
      const sway = Math.sin(t * 0.7) * H * 0.006 + Math.sin(t * 1.7) * H * 0.002;
      const tx = bx - H * 0.11 + sway;
      const ty = by - h;
      const cx = bx + H * 0.07;
      const cy = by - h * 0.55;

      // Shadow (sun is up and to the right, so it falls left)
      ctx.fillStyle = 'rgba(110,75,35,0.2)';
      ctx.beginPath();
      ctx.ellipse(bx - H * 0.03, by + H * 0.004, H * 0.06, H * 0.012, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(80,110,50,0.12)';
      ctx.beginPath();
      ctx.ellipse(bx - H * 0.2, by + H * 0.01, H * 0.14, H * 0.025, -0.05, 0, TAU);
      ctx.fill();

      // Trunk along a quadratic curve
      const N = 18;
      const left = [];
      const right = [];
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        const px = (1 - s) * (1 - s) * bx + 2 * (1 - s) * s * cx + s * s * tx;
        const py = (1 - s) * (1 - s) * by + 2 * (1 - s) * s * cy + s * s * ty;
        const dx = 2 * (1 - s) * (cx - bx) + 2 * s * (tx - cx);
        const dy = 2 * (1 - s) * (cy - by) + 2 * s * (ty - cy);
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const w = lerp(H * 0.03, H * 0.014, s) / 2;
        left.push([px + nx * w, py + ny * w]);
        right.push([px - nx * w, py - ny * w]);
        pts.push([px, py, nx, ny, w]);
      }
      ctx.fillStyle = '#9b7550';
      ctx.beginPath();
      ctx.moveTo(left[0][0], left[0][1]);
      for (const q of left) ctx.lineTo(q[0], q[1]);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
      ctx.fill();
      // Lit side
      ctx.strokeStyle = 'rgba(255,230,180,0.35)';
      ctx.lineWidth = H * 0.004;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const [px, py, nx, ny, w] = pts[i];
        const x = px - nx * w * 0.55;
        const y = py - ny * w * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Rings
      ctx.strokeStyle = '#74553a';
      ctx.lineWidth = Math.max(1.5, H * 0.0025);
      for (let i = 1; i < N; i++) {
        const [px, py, nx, ny, w] = pts[i];
        ctx.beginPath();
        ctx.moveTo(px + nx * w, py + ny * w);
        ctx.quadraticCurveTo(px + ny * w * 0.4, py - nx * w * 0.4, px - nx * w, py - ny * w);
        ctx.stroke();
      }

      // Fronds
      const len = H * 0.17;
      const back = [-2.75, -1.6, -0.45, 2.55];
      const front = [-3.05, -2.2, -1.1, -0.15, 0.35, 2.95];
      back.forEach((a, i) => this.frond(ctx, tx, ty, a + Math.sin(t * 0.9 + i) * 0.05, len * 0.9, '#2b7a46', H * 0.0055));
      front.forEach((a, i) => this.frond(ctx, tx, ty, a + Math.sin(t * 1.1 + i * 1.7) * 0.06, len, '#3d9f58', H * 0.006));

      // Coconuts
      const cr = H * 0.011;
      [[-0.9, 0.7], [0.8, 0.9], [0, 1.5]].forEach(([ox, oy]) => {
        const x = tx + ox * cr;
        const y = ty + oy * cr;
        ctx.fillStyle = '#6b4626';
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,170,0.35)';
        ctx.beginPath();
        ctx.arc(x - cr * 0.35, y - cr * 0.35, cr * 0.35, 0, TAU);
        ctx.fill();
      });
    }

    frond(ctx, x, y, ang, len, col, lw) {
      const ex = x + Math.cos(ang) * len;
      const ey = y + Math.sin(ang) * len * 0.6 + len * 0.45 * Math.abs(Math.cos(ang)) + len * 0.15;
      const mx = x + Math.cos(ang) * len * 0.55;
      const my = y + Math.sin(ang) * len * 0.55 - len * 0.14;
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      const n = 12;
      for (let i = 1; i < n; i++) {
        const s = i / n;
        const px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * mx + s * s * ex;
        const py = (1 - s) * (1 - s) * y + 2 * (1 - s) * s * my + s * s * ey;
        let dx = 2 * (1 - s) * (mx - x) + 2 * s * (ex - mx);
        let dy = 2 * (1 - s) * (my - y) + 2 * s * (ey - my);
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const nx = -dy;
        const ny = dx;
        const L = len * (0.07 + 0.22 * Math.sin(Math.PI * Math.min(1, s * 1.1))) * (1 - s * 0.3);
        ctx.lineWidth = lw * (1 - s * 0.5);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(
            px + nx * L * side * 0.6 + dx * L * 0.2,
            py + ny * L * side * 0.6 + dy * L * 0.2,
            px + nx * L * side + dx * L * 0.5,
            py + ny * L * side + dy * L * 0.5 + L * 0.35
          );
          ctx.stroke();
        }
      }
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }

    drawCastle(ctx) {
      const { H, t } = this;
      const s = H * 0.0012;
      ctx.save();
      ctx.translate(this.castle.x, this.castle.y);
      ctx.scale(s, s);

      const face = '#ebc88a';
      const side = '#d3a768';
      const dark = '#8c6538';

      ctx.fillStyle = 'rgba(110,75,35,0.22)';
      ctx.beginPath();
      ctx.ellipse(-12, 4, 98, 14, 0, 0, TAU);
      ctx.fill();

      const block = (x, y, w, h) => {
        ctx.fillStyle = face;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = side;
        ctx.fillRect(x + w * 0.72, y, w * 0.28, h);
        // crenellations
        const n = Math.max(2, Math.round(w / 14));
        const cw = w / (n * 2 - 1);
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = face;
          ctx.fillRect(x + i * cw * 2, y - 10, cw, 10);
        }
        ctx.fillStyle = side;
        ctx.fillRect(x + (n - 1) * cw * 2 + cw * 0.3, y - 10, cw * 0.7, 10);
      };

      // Keep with flag
      block(-20, -112, 40, 70);
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -122);
      ctx.lineTo(0, -152);
      ctx.stroke();
      const wv = Math.sin(t * 4);
      ctx.fillStyle = '#ef5b5b';
      ctx.beginPath();
      ctx.moveTo(0, -152);
      ctx.quadraticCurveTo(12, -150 + wv * 3, 26, -145 + wv * 2);
      ctx.quadraticCurveTo(12, -140 - wv * 2, 0, -138);
      ctx.closePath();
      ctx.fill();

      // Towers + wall
      block(-78, -88, 34, 88);
      block(44, -88, 34, 88);
      block(-60, -46, 120, 46);

      // Door + windows
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-11, -18);
      ctx.arc(0, -18, 11, Math.PI, 0);
      ctx.lineTo(11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-65, -66, 7, 11);
      ctx.fillRect(57, -66, 7, 11);
      ctx.fillRect(-4, -92, 8, 12);

      // Sand texture
      ctx.fillStyle = 'rgba(150,105,55,0.35)';
      const rng = seeded(5);
      for (let i = 0; i < 70; i++) {
        const x = -78 + rng() * 156;
        const y = -100 + rng() * 100;
        if (y < -46 && Math.abs(x) > 20 && Math.abs(x) < 44) continue;
        if (y < -88 && Math.abs(x) > 20) continue;
        ctx.fillRect(x, y, 1.6, 1.6);
      }

      // Little red bucket
      ctx.fillStyle = '#e8574a';
      ctx.beginPath();
      ctx.moveTo(92, -30);
      ctx.lineTo(120, -30);
      ctx.lineTo(116, 0);
      ctx.lineTo(96, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c94237';
      ctx.fillRect(108, -30, 7, 30);
      ctx.fillStyle = '#ff8c7a';
      ctx.fillRect(92, -32, 28, 5);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(106, -30, 13, Math.PI, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  SB.Scene = Scene;
})();
