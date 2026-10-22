// The seal: flops toward clicks, looks at the cursor, blinks, naps, and "talks" when poked.
// It is drawn facing right in local coordinates (ground contact at y = 0, ~175 units long)
// and mirrored with a horizontal scale when it faces left.
(function () {
  const { clamp, lerp, rand, pick } = SB.util;
  const TAU = SB.TAU;

  const OUTLINE = '#4b5b6c';
  const LW = 3.4;
  const HEAD_PIVOT_X = 30;
  const HEAD_PIVOT_Y = -40;
  const FLOP_RATE = 2.3; // flops per second at speed 1
  const LIFT_PART = 0.55; // fraction of each flop spent in the air

  class Seal {
    constructor(scene, effects, bubble) {
      this.scene = scene;
      this.effects = effects;
      this.bubble = bubble;

      this.x = 0;
      this.y = 0;
      this.tx = 0;
      this.ty = 0;
      this.placed = false;

      this.state = 'idle'; // idle | walk
      this.facing = 1;
      this.faceAnim = 1;
      this.phase = 0;
      this.hop = 0;
      this.squash = 0;
      this.tilt = 0;
      this.swing = 0;
      this.headRot = 0;
      this.eyeX = 0;
      this.eyeY = 0;

      this.time = 0;
      this.blinkT = rand(2, 4);
      this.blink = 0;
      this.happyT = 0;
      this.idleTime = 0;
      this.sleeping = false;
      this.sleepK = 0;
      this.zTimer = 0;
      this.delay = 0;
      this.lastSound = '';
      this.wander = { x: 0, y: 0, t: 0 };
    }

    place(x, y) {
      this.x = this.tx = x;
      this.y = this.ty = y;
      this.placed = true;
    }

    get scale() {
      const s = this.scene;
      return (s.H / 1080) * 1.3 * SB.config.sealSize * lerp(0.78, 1.2, s.depth(this.y));
    }

    get faceSign() {
      return this.faceAnim >= 0 ? 1 : -1;
    }

    // Point just above the head, used to anchor the speech bubble.
    get headTop() {
      const sc = this.scale;
      return { x: this.x + this.faceAnim * 48 * sc, y: this.y - this.hop - 100 * sc };
    }

    hitTest(px, py) {
      const sc = this.scale;
      const fx = Math.abs(this.faceAnim) < 0.3 ? 0.3 * this.faceSign : this.faceAnim;
      const lx = (px - this.x) / (sc * fx);
      const ly = (py - this.y + this.hop) / sc;
      const body = Math.pow((lx + 8) / 78, 2) + Math.pow((ly + 30) / 38, 2) <= 1;
      const head = Math.hypot(lx - 48, ly + 56) < 44;
      return body || head;
    }

    wake() {
      this.idleTime = 0;
      if (!this.sleeping) return false;
      this.sleeping = false;
      return true;
    }

    goTo(x, y) {
      const wasAsleep = this.wake();
      this.tx = x;
      this.ty = y;
      if (wasAsleep) {
        this.bubble.show(pick(['!?', 'Huh?!', '!!']), 0.9);
        this.delay = 0.45;
      }
      if (Math.hypot(x - this.x, y - this.y) > 4) this.state = 'walk';
    }

    poke() {
      const wasAsleep = this.wake();
      this.state = 'idle';
      this.tx = this.x;
      this.ty = this.y;
      this.happyT = 1.3;
      this.bubble.show(wasAsleep ? 'Huh?! ...Arf!' : this.nextSound(), SB.config.bubbleTime);
      const h = this.headTop;
      this.effects.hearts(h.x, h.y + 30 * this.scale, this.scale);
    }

    nextSound() {
      const list = SB.config.sounds.length ? SB.config.sounds : SB.DEFAULT_SOUNDS;
      let s = pick(list);
      for (let i = 0; i < 4 && s === this.lastSound && list.length > 1; i++) s = pick(list);
      this.lastSound = s;
      return s;
    }

    update(dt, pointer) {
      const scene = this.scene;
      this.time += dt;
      const sc = this.scale;

      // Blinking
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        this.blink = 1;
        this.blinkT = Math.random() < 0.2 ? 0.25 : rand(2.2, 5.5);
      }
      this.blink = Math.max(0, this.blink - dt * 6);

      if (this.happyT > 0) this.happyT -= dt;
      if (this.delay > 0) this.delay -= dt;

      let hop = 0;
      let squash = 0;
      let tilt = 0;
      let swing = Math.sin(this.time * 1.3) * 0.05;

      if (this.state === 'walk' && this.delay <= 0) {
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const d = Math.hypot(dx, dy);
        if (Math.abs(dx) > 6 * sc) this.facing = dx > 0 ? 1 : -1;

        const prev = this.phase % 1;
        this.phase += dt * FLOP_RATE * Math.sqrt(SB.config.sealSpeed);
        const p = this.phase % 1;
        const lift = p < LIFT_PART ? Math.sin((p / LIFT_PART) * Math.PI) : 0;

        // Seals surge forward while their front end is up, then slump down.
        const speed = 150 * (scene.H / 1080) * SB.config.sealSpeed * lerp(0.85, 1.15, scene.depth(this.y)) * (0.2 + 1.6 * lift);
        const stepLen = Math.min(d, speed * dt);
        if (d > 0.01) {
          this.x += (dx / d) * stepLen;
          this.y += (dy / d) * stepLen;
        }

        hop = lift * 15 * sc;
        squash = p >= LIFT_PART ? Math.sin(((p - LIFT_PART) / (1 - LIFT_PART)) * Math.PI) * 0.09 : -lift * 0.04;
        tilt = -Math.sin(p * TAU) * 0.08;
        swing = Math.sin(p * TAU) * 0.65;

        if (prev < LIFT_PART && p >= LIFT_PART) {
          this.effects.puff(this.x, this.y, sc);
          this.effects.print(this.x, this.y, sc, this.facing);
        }

        if (d < 2) {
          this.state = 'idle';
          this.phase = 0;
          this.idleTime = 0;
        }
      } else {
        this.idleTime += dt;
        const breath = Math.sin(this.time * (this.sleeping ? 1.4 : 2.2));
        squash = breath * (this.sleeping ? 0.025 : 0.015);
      }

      // Happy wiggle when poked
      if (this.happyT > 0) {
        const k = Math.min(1, this.happyT / 0.3);
        hop = Math.max(hop, Math.abs(Math.sin(this.happyT * 11)) * 12 * sc * k);
        swing = -2.1 + Math.sin(this.time * 24) * 0.5;
        tilt = Math.sin(this.time * 14) * 0.06 * k;
      }

      // Naps
      const sleepAfter = SB.config.sleepAfter;
      if (!this.sleeping && sleepAfter > 0 && this.state === 'idle' && this.happyT <= 0 && !this.bubble.active && this.idleTime > sleepAfter) {
        this.sleeping = true;
      }
      this.sleepK += ((this.sleeping ? 1 : 0) - this.sleepK) * Math.min(1, dt * 2);
      if (this.sleeping) {
        this.zTimer -= dt;
        if (this.zTimer <= 0) {
          this.zTimer = 1.3;
          const h = this.headTop;
          this.effects.zzz(h.x + this.faceSign * 20 * sc, h.y + 20 * sc, sc);
        }
      }

      // Where to look: walking -> destination, otherwise the cursor (or idly around).
      let lookX;
      let lookY;
      const now = performance.now();
      const pointerFresh = pointer.seen && now - pointer.lastMove < 6000;
      if (this.state === 'walk') {
        lookX = this.tx;
        lookY = this.ty - 60 * sc;
      } else if (pointerFresh) {
        lookX = pointer.x;
        lookY = pointer.y;
        // Turn around if the cursor is well behind us.
        if (this.happyT <= 0 && !this.sleeping && (pointer.x - this.x) * this.facing < -140 * sc) this.facing *= -1;
      } else {
        this.wander.t -= dt;
        if (this.wander.t <= 0) {
          this.wander.t = rand(2, 4.5);
          this.wander.x = this.x + this.facing * rand(100, 400) * sc;
          this.wander.y = this.y + rand(-260, 40) * sc;
        }
        lookX = this.wander.x;
        lookY = this.wander.y;
      }

      const hx = this.x + this.faceAnim * 44 * sc;
      const hy = this.y - this.hop - 58 * sc;
      const lvx = (lookX - hx) * this.facing;
      const lvy = lookY - hy;
      const len = Math.hypot(lvx, lvy) || 1;
      let rotTarget = clamp(Math.atan2(lvy, Math.max(Math.abs(lvx), 90 * sc)) * 0.55, -0.32, 0.26);
      let ex = clamp((lvx / len) * 2.6, -2.6, 2.6);
      let ey = clamp((lvy / len) * 2.2, -2.2, 2.2);
      rotTarget = lerp(rotTarget, 0.24, this.sleepK);
      ex *= 1 - this.sleepK;
      ey *= 1 - this.sleepK;

      const ease = Math.min(1, dt * 8);
      this.headRot += (rotTarget - this.headRot) * Math.min(1, dt * 5);
      this.eyeX += (ex - this.eyeX) * ease;
      this.eyeY += (ey - this.eyeY) * ease;

      this.hop += (hop - this.hop) * Math.min(1, dt * 25);
      this.squash += (squash - this.squash) * Math.min(1, dt * 20);
      this.tilt += (tilt - this.tilt) * Math.min(1, dt * 15);
      this.swing += (swing - this.swing) * Math.min(1, dt * 18);
      this.faceAnim += (this.facing - this.faceAnim) * Math.min(1, dt * 12);
    }

    // ---------- drawing ----------

    draw(ctx) {
      const sc = this.scale;
      const fa = this.faceAnim;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Ground shadow (stays on the sand while the body hops)
      const hopN = clamp(this.hop / (15 * sc + 0.001), 0, 1);
      ctx.fillStyle = 'rgba(110,75,35,0.24)';
      ctx.beginPath();
      ctx.ellipse(-4 * fa * sc, 3 * sc, 82 * sc * (1 - hopN * 0.2) * Math.max(Math.abs(fa), 0.55), 11 * sc * (1 - hopN * 0.25), 0, 0, TAU);
      ctx.fill();

      ctx.translate(0, -this.hop);
      ctx.scale(sc * fa, sc);
      ctx.scale(1 + this.squash, 1 - this.squash);
      ctx.translate(0, -25);
      ctx.rotate(this.tilt);
      ctx.translate(0, 25);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const wig = Math.sin(this.time * (this.state === 'walk' ? 9 : 2.5)) * (this.state === 'walk' ? 0.2 : 0.08);

      // Far-side front flipper and rear flippers sit behind the body
      this.frontFlipper(ctx, 36, -18, 2.45 + this.swing * 0.9, '#7d91a5');
      this.rearFlipper(ctx, -84, -13, Math.PI + 0.5 + wig, '#8a9db0');
      this.rearFlipper(ctx, -84, -11, Math.PI + 0.06 - wig * 0.6, '#97a9bb');

      // One shared outline around body + head + muzzle: stroke everything, then fill everything.
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = LW * 2;
      this.bodyPath(ctx);
      ctx.stroke();
      this.withHead(ctx, () => {
        this.headPath(ctx);
        ctx.stroke();
        this.muzzlePath(ctx);
        ctx.stroke();
      });

      const bodyGrad = ctx.createLinearGradient(0, -62, 0, 0);
      bodyGrad.addColorStop(0, '#8ea2b5');
      bodyGrad.addColorStop(0.6, '#b4c3d1');
      bodyGrad.addColorStop(1, '#dfe7ee');
      ctx.fillStyle = bodyGrad;
      this.bodyPath(ctx);
      ctx.fill();

      // Belly sheen + spots
      ctx.save();
      this.bodyPath(ctx);
      ctx.clip();
      ctx.fillStyle = 'rgba(243,247,250,0.75)';
      ctx.beginPath();
      ctx.ellipse(2, -4, 60, 13, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(95,115,135,0.42)';
      [[-30, -47, 7, 4.5], [-6, -53, 5, 3.4], [-52, -33, 5, 3], [10, -49, 4, 2.8], [-18, -40, 3.5, 2.4], [-42, -46, 3, 2]].forEach(([x, y, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0.3, 0, TAU);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.ellipse(-12, -52, 30, 5, -0.12, 0, TAU);
      ctx.fill();
      ctx.restore();

      this.withHead(ctx, () => {
        const headGrad = ctx.createRadialGradient(36, -70, 4, 44, -58, 34);
        headGrad.addColorStop(0, '#c6d2de');
        headGrad.addColorStop(1, '#97abbe');
        ctx.fillStyle = headGrad;
        this.headPath(ctx);
        ctx.fill();
        ctx.fillStyle = '#eaf0f5';
        this.muzzlePath(ctx);
        ctx.fill();
      });

      // Near-side front flipper on top of the body
      this.frontFlipper(ctx, 24, -18, 2.55 + this.swing, '#8a9eb2');

      this.withHead(ctx, () => this.face(ctx));

      ctx.restore();
    }

    withHead(ctx, fn) {
      ctx.save();
      ctx.translate(HEAD_PIVOT_X, HEAD_PIVOT_Y);
      ctx.rotate(this.headRot);
      ctx.translate(-HEAD_PIVOT_X, -HEAD_PIVOT_Y);
      fn();
      ctx.restore();
    }

    bodyPath(ctx) {
      ctx.beginPath();
      ctx.moveTo(-88, -12);
      ctx.bezierCurveTo(-70, -40, -40, -60, 0, -60);
      ctx.bezierCurveTo(30, -60, 50, -45, 55, -25);
      ctx.bezierCurveTo(58, -6, 40, 0, 15, 0);
      ctx.lineTo(-40, 0);
      ctx.bezierCurveTo(-65, 0, -82, -4, -88, -12);
      ctx.closePath();
    }

    headPath(ctx) {
      ctx.beginPath();
      ctx.arc(44, -58, 32, 0, TAU);
    }

    muzzlePath(ctx) {
      ctx.beginPath();
      ctx.ellipse(64, -48, 17, 12.5, 0, 0, TAU);
    }

    frontFlipper(ctx, px, py, ang, fill) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(15, 0, 18, 8, 0, 0, TAU);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = LW;
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,91,108,0.5)';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(24, i * 3.3);
        ctx.lineTo(31, i * 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    rearFlipper(ctx, px, py, ang, fill) {
      const len = 30;
      const wid = 8;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -wid * 0.5);
      ctx.quadraticCurveTo(len * 0.6, -wid * 1.4, len, -wid * 1.05);
      ctx.quadraticCurveTo(len * 0.86, 0, len, wid * 1.05);
      ctx.quadraticCurveTo(len * 0.6, wid * 1.4, 0, wid * 0.5);
      ctx.closePath();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = LW;
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }

    face(ctx) {
      const happy = this.happyT > 0;
      const open = Math.max(this.sleepK > 0.5 ? 0 : 1, 0) * (1 - Math.sin(Math.min(1, this.blink) * Math.PI));
      const mode = happy ? 'happy' : this.sleepK > 0.5 ? 'closed' : open < 0.2 ? 'closed' : 'open';

      // Blush
      ctx.fillStyle = 'rgba(255,145,165,0.45)';
      ctx.beginPath();
      ctx.ellipse(30, -49, 7, 3.8, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(53, -53, 4.5, 2.8, 0, 0, TAU);
      ctx.fill();

      this.eye(ctx, 33, -63, 8, 9.5, open, mode);
      this.eye(ctx, 55, -65, 6.5, 8, open, mode);

      // Whisker dots
      ctx.fillStyle = '#8796a5';
      [[56, -47], [59.5, -44], [55.5, -42.5], [60, -50]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 0.95, 0, TAU);
        ctx.fill();
      });

      // Nose
      ctx.fillStyle = '#28303b';
      ctx.beginPath();
      ctx.ellipse(73, -53, 6, 4.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(71.2, -54.4, 1.8, 1.1, -0.3, 0, TAU);
      ctx.fill();

      // Mouth: little "w", open while talking or happy
      const talk = this.bubble.talking ? 0.55 + 0.45 * Math.sin(this.time * 20) : 0;
      const mouthOpen = Math.max(happy ? 0.9 : 0, talk);
      if (mouthOpen > 0.1) {
        ctx.fillStyle = '#7a2f3f';
        ctx.beginPath();
        ctx.ellipse(72, -40.5, 4.6, 4.6 * mouthOpen, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ff8fa3';
        ctx.beginPath();
        ctx.ellipse(72, -38.2, 3, 2 * mouthOpen, 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#3c4756';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(66, -44.5);
      ctx.quadraticCurveTo(69, -40.8, 72, -44.5);
      ctx.quadraticCurveTo(75, -40.8, 78, -44.5);
      ctx.stroke();

      // Whiskers
      ctx.strokeStyle = 'rgba(80,92,108,0.55)';
      ctx.lineWidth = 1.1;
      [[76, -47, 97, -52], [78, -45, 99, -44], [76, -43, 95, -36]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 2, x2, y2);
        ctx.stroke();
      });

      // Sleepy snot bubble
      if (this.sleepK > 0.6) {
        const r = 2.5 + 4.5 * Math.pow(Math.sin(this.time * 1.1), 2);
        ctx.fillStyle = 'rgba(200,232,255,0.45)';
        ctx.strokeStyle = 'rgba(130,180,220,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(80 + r * 0.6, -55 + r * 0.2, r, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    eye(ctx, cx, cy, rx, ry, open, mode) {
      ctx.strokeStyle = '#1b2430';
      ctx.lineWidth = 2.6;
      if (mode === 'happy') {
        ctx.beginPath();
        ctx.moveTo(cx - rx, cy + ry * 0.25);
        ctx.quadraticCurveTo(cx, cy - ry * 1.1, cx + rx, cy + ry * 0.25);
        ctx.stroke();
        return;
      }
      if (mode === 'closed') {
        ctx.beginPath();
        ctx.moveTo(cx - rx, cy);
        ctx.quadraticCurveTo(cx, cy + ry * 0.75, cx + rx, cy);
        ctx.stroke();
        return;
      }
      ctx.save();
      ctx.translate(cx + this.eyeX, cy + this.eyeY);
      ctx.scale(1, Math.max(0.1, open));
      ctx.fillStyle = '#1b2430';
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(70,95,125,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, ry * 0.45, rx * 0.65, ry * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-rx * 0.3, -ry * 0.36, rx * 0.42, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rx * 0.35, ry * 0.3, rx * 0.17, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  SB.Seal = Seal;
})();
