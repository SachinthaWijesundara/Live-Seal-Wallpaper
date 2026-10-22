// Little particles: sand puffs, flipper tracks, click ripples, hearts, music notes and sleepy Zzz.
(function () {
  const { rand, pick, heartPath } = SB.util;
  const TAU = SB.TAU;

  class Effects {
    constructor() {
      this.particles = [];
      this.prints = [];
      this.ripples = [];
    }

    clear() {
      this.particles.length = 0;
      this.prints.length = 0;
      this.ripples.length = 0;
    }

    puff(x, y, sc) {
      for (let i = 0; i < 7; i++) {
        this.particles.push({
          kind: 'sand',
          x: x + rand(-30, 30) * sc,
          y: y + rand(-3, 3) * sc,
          vx: rand(-40, 40) * sc,
          vy: rand(-45, -15) * sc,
          r: rand(3, 6) * sc,
          life: 0,
          max: rand(0.45, 0.75),
        });
      }
    }

    print(x, y, sc, facing) {
      if (!SB.config.showTracks) return;
      this.prints.push({ x, y, sc, facing, life: 0, max: 9 });
      if (this.prints.length > 120) this.prints.shift();
    }

    ripple(x, y, sc) {
      this.ripples.push({ x, y, sc, life: 0, max: 0.8 });
    }

    hearts(x, y, sc) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          kind: Math.random() < 0.6 ? 'heart' : 'note',
          glyph: pick(['♪', '♫']),
          color: pick(['#ff6f91', '#ff8fab', '#ffb3c6', '#7ec8ff', '#ffd166']),
          x: x + rand(-40, 40) * sc,
          y: y + rand(-10, 10) * sc,
          vx: rand(-35, 35) * sc,
          vy: rand(-110, -60) * sc,
          r: rand(12, 20) * sc,
          spin: rand(-1.5, 1.5),
          life: 0,
          max: rand(1.1, 1.6),
        });
      }
    }

    zzz(x, y, sc) {
      this.particles.push({
        kind: 'z',
        x,
        y,
        vx: 18 * sc,
        vy: -28 * sc,
        r: 14 * sc,
        life: 0,
        max: 2.4,
      });
    }

    update(dt) {
      for (const p of this.particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'sand') {
          p.vy += 140 * dt;
          p.vx *= 0.96;
        } else if (p.kind === 'z') {
          p.x += Math.sin(p.life * 3) * 0.4;
        } else {
          p.vx *= 0.98;
          p.vy *= 0.985;
        }
      }
      this.particles = this.particles.filter((p) => p.life < p.max);
      for (const f of this.prints) f.life += dt;
      this.prints = this.prints.filter((f) => f.life < f.max);
      for (const r of this.ripples) r.life += dt;
      this.ripples = this.ripples.filter((r) => r.life < r.max);
    }

    // Things lying on the sand (drawn under the seal and props).
    drawGround(ctx) {
      for (const f of this.prints) {
        const a = 0.32 * (1 - f.life / f.max);
        ctx.fillStyle = `rgba(140,100,55,${a})`;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(f.x + f.facing * 6 * f.sc, f.y + side * 7 * f.sc, 9 * f.sc, 3.2 * f.sc, f.facing * 0.25 * side, 0, TAU);
          ctx.fill();
        }
      }
      for (const r of this.ripples) {
        const k = r.life / r.max;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.lineWidth = 3 * r.sc;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, (8 + 40 * k) * r.sc, (3 + 14 * k) * r.sc, 0, 0, TAU);
        ctx.stroke();
      }
    }

    // Floating things (drawn above the seal).
    drawAir(ctx) {
      for (const p of this.particles) {
        const k = p.life / p.max;
        if (p.kind === 'sand') {
          ctx.fillStyle = `rgba(214,178,120,${0.7 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 + k), 0, TAU);
          ctx.fill();
          continue;
        }
        const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        ctx.save();
        ctx.globalAlpha = Math.max(0, a);
        ctx.translate(p.x, p.y);
        if (p.kind === 'heart') {
          ctx.rotate(Math.sin(p.life * 4) * 0.25);
          heartPath(ctx, 0, 0, p.r * 1.3);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = Math.max(1, p.r * 0.12);
          ctx.stroke();
        } else if (p.kind === 'note') {
          ctx.rotate(Math.sin(p.life * 5) * 0.3);
          ctx.font = `bold ${p.r * 1.8}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = Math.max(2, p.r * 0.2);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.strokeText(p.glyph, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.glyph, 0, 0);
        } else {
          const size = p.r * (0.8 + k * 0.9);
          ctx.font = `bold ${size}px "Comic Sans MS", "Segoe Print", "Chalkboard SE", cursive`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = Math.max(2, size * 0.18);
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.strokeText('z', 0, 0);
          ctx.fillStyle = '#4a6b8a';
          ctx.fillText('z', 0, 0);
        }
        ctx.restore();
      }
    }
  }

  SB.Effects = Effects;
})();
