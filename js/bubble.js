// Comic speech bubble that pops out of the seal with a "seal sound" written in it.
(function () {
  const { clamp, rand, easeOutBack, easeInBack, roundRect } = SB.util;

  const FONT = '"Comic Sans MS", "Segoe Print", "Chalkboard SE", "Marker Felt", cursive';
  const INK = '#2b3a4a';
  const POP_IN = 0.35;
  const POP_OUT = 0.22;

  class Bubble {
    constructor() {
      this.active = false;
      this.t = 0;
      this.dur = 2.5;
      this.text = '';
      this.rot = 0;
    }

    show(text, dur) {
      this.text = text;
      this.dur = dur;
      this.t = 0;
      this.rot = rand(-0.06, 0.06);
      this.active = true;
    }

    hide() {
      if (this.active && this.t < this.dur) this.t = this.dur;
    }

    get talking() {
      return this.active && this.t < Math.min(0.9, this.dur);
    }

    update(dt) {
      if (!this.active) return;
      this.t += dt;
      if (this.t > this.dur + POP_OUT) this.active = false;
    }

    // anchor = point just above the seal's head that the tail points at.
    draw(ctx, anchor, sc, W, H) {
      if (!this.active) return;
      const t = this.t;
      let k = 1;
      if (t < POP_IN) k = easeOutBack(t / POP_IN);
      else if (t > this.dur) k = 1 - easeInBack(clamp((t - this.dur) / POP_OUT, 0, 1));
      if (k <= 0.01) return;

      let fontSize = clamp(32 * sc, 18, 64);
      ctx.font = `bold ${fontSize}px ${FONT}`;
      let tw = ctx.measureText(this.text).width;
      const maxW = W * 0.6;
      if (tw + fontSize * 1.4 > maxW) {
        fontSize *= maxW / (tw + fontSize * 1.4);
        ctx.font = `bold ${fontSize}px ${FONT}`;
        tw = ctx.measureText(this.text).width;
      }

      const padX = fontSize * 0.7;
      const padY = fontSize * 0.45;
      const bw = tw + padX * 2;
      const bh = fontSize * 1.15 + padY * 2;
      const tail = fontSize * 0.9;

      const ax = anchor.x;
      const ay = Math.max(anchor.y, bh + tail + 12);
      const bx = clamp(ax - bw * 0.4, 12, W - bw - 12);
      const by = ay - tail - bh;
      const tailX = clamp(ax, bx + bh * 0.5, bx + bw - bh * 0.5);
      const tailW = Math.min(fontSize * 0.75, bw * 0.25);

      const path = () => {
        ctx.beginPath();
        roundRect(ctx, bx, by, bw, bh, bh * 0.45);
        ctx.moveTo(tailX - tailW / 2, by + bh - 2);
        ctx.quadraticCurveTo(tailX - tailW * 0.1, by + bh + tail * 0.5, ax, ay);
        ctx.quadraticCurveTo(tailX + tailW * 0.25, by + bh + tail * 0.35, tailX + tailW / 2, by + bh - 2);
        ctx.closePath();
      };

      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(k, k);
      ctx.rotate(this.rot);
      ctx.translate(-ax, -ay);

      // drop shadow
      ctx.save();
      ctx.translate(4, 6);
      path();
      ctx.fillStyle = 'rgba(30,40,60,0.18)';
      ctx.fill();
      ctx.restore();

      // outline then fill (keeps one clean outline around rect + tail)
      const lw = Math.max(2.5, fontSize * 0.1);
      path();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // shine
      ctx.fillStyle = 'rgba(200,230,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(bx + bh * 0.28, by + bh * 0.2, bh * 0.1, bh * 0.05, -0.6, 0, SB.TAU);
      ctx.fill();

      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px ${FONT}`;
      ctx.fillText(this.text, bx + bw / 2, by + bh / 2 + fontSize * 0.04);

      // comic "pop" lines right after appearing
      if (t < 0.5) {
        const a = 1 - t / 0.5;
        ctx.strokeStyle = `rgba(43,58,74,${a})`;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        const cx = bx + bw;
        const cy = by;
        for (let i = 0; i < 3; i++) {
          const ang = -1.2 + i * 0.45;
          const r0 = fontSize * (0.35 + t);
          const r1 = r0 + fontSize * 0.45;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
          ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  SB.Bubble = Bubble;
})();
