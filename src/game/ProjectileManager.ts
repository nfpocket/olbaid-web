import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { playBounceHit, playHit, playKill } from './Sound';
import { Enemy } from './Enemy';
import { EnemyManager } from './EnemyManager';
import { worldToScreen } from './IsometricUtils';
import { PlayerStats } from './PlayerStats';

const BOUNCE_SPEED = 22;   // world tiles/sec
const BOUNCE_RANGE = 9;    // tile radius to search for next bounce target
const PROJ_R = 8;          // orb screen radius (px)
const HIT_R = 0.7;         // world-tile collision radius

interface Effect {
  gfx: Graphics;
  ttl: number;
  maxTtl: number;
  tick: (gfx: Graphics, t: number) => void; // t = remaining/max (1→0)
}

interface DamageNum {
  text: Text;
  vx: number;
  vy: number;
  ttl: number;
  maxTtl: number;
}

interface BounceProj {
  wx: number; wy: number;
  vx: number; vy: number;
  bouncesLeft: number;
  damage: number;
  stats: PlayerStats;
  gfx: Graphics;
  trail: Array<{ sx: number; sy: number }>;
  lifetime: number;
}

export class ProjectileManager {
  private effects: Effect[] = [];
  private bounces: BounceProj[] = [];
  private damageNums: DamageNum[] = [];
  private mutedUntil = 0;

  constructor(private layer: Container) {}

  muteHitSounds(ms: number): void {
    this.mutedUntil = performance.now() + ms;
  }

  private soundsMuted(): boolean {
    return performance.now() < this.mutedUntil;
  }

  // ── Main update ─────────────────────────────────────────────────────────────

  update(deltaMS: number, enemies?: EnemyManager): void {
    this.tickEffects(deltaMS);
    this.tickDamageNums(deltaMS);
    if (enemies) this.tickBounces(deltaMS, enemies);
  }

  // ── Visual effects ──────────────────────────────────────────────────────────

  private addFx(gfx: Graphics, ttl: number, tick: (g: Graphics, t: number) => void): void {
    this.effects.push({ gfx, ttl, maxTtl: ttl, tick });
    this.layer.addChild(gfx);
    gfx.zIndex = 9999;
  }

  private tickEffects(deltaMS: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.ttl -= deltaMS;
      if (e.ttl <= 0) {
        this.layer.removeChild(e.gfx);
        e.gfx.destroy();
        this.effects.splice(i, 1);
      } else {
        e.tick(e.gfx, e.ttl / e.maxTtl);
      }
    }
  }

  private gfxAt(wx: number, wy: number): { g: Graphics; sx: number; sy: number } {
    const { x: sx, y: sy } = worldToScreen(wx, wy);
    const g = new Graphics();
    g.position.set(sx, sy);
    return { g, sx, sy };
  }

  // Nova: 3 staggered rings + center burst
  showNova(wx: number, wy: number): void {
    const { g: burst, sx, sy } = this.gfxAt(wx, wy);
    burst.circle(0, 0, 50).fill({ color: 0xffffff, alpha: 0.9 });
    this.addFx(burst, 200, (g, t) => { g.alpha = t; g.scale.set(1 + (1 - t) * 2); });

    [
      { r: 2.2, color: 0xffffff, delay: 0,   w: 4, ttl: 550 },
      { r: 3.8, color: 0xbbbbff, delay: 70,  w: 3, ttl: 600 },
      { r: 5.5, color: 0x7777ff, delay: 150, w: 2, ttl: 650 },
    ].forEach(({ r, color, delay, w, ttl }) => {
      setTimeout(() => {
        const { g } = this.gfxAt(wx, wy);
        g.ellipse(0, 0, r * 32, r * 16).stroke({ color, width: w });
        // inner glow
        g.ellipse(0, 0, r * 32, r * 16).fill({ color, alpha: 0.12 });
        this.addFx(g, ttl, (gr, t) => { gr.alpha = t; gr.scale.set(1 + (1 - t) * 0.5); });
      }, delay);
    });
  }

  // Ground eruption: pulsing warning then spiky explosion
  showEruptionWarning(wx: number, wy: number): void {
    const { g } = this.gfxAt(wx, wy);
    g.ellipse(0, 0, 2.5 * 32, 2.5 * 16).stroke({ color: 0xff3300, width: 3 });
    // X cross
    g.moveTo(-20, -10).lineTo(20, 10).stroke({ color: 0xff3300, width: 2 });
    g.moveTo(20, -10).lineTo(-20, 10).stroke({ color: 0xff3300, width: 2 });
    this.addFx(g, 350, (gr, t) => {
      gr.alpha = 0.4 + Math.sin((1 - t) * Math.PI * 7) * 0.5;
    });
  }

  showEruption(wx: number, wy: number): void {
    // Core flash
    const { g: core } = this.gfxAt(wx, wy);
    core.ellipse(0, 0, 120, 60).fill({ color: 0xff7700, alpha: 0.9 });
    this.addFx(core, 250, (g, t) => { g.alpha = t; g.scale.set(0.4 + (1 - t) * 1.2); });

    // Spikes in 8 directions
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const { g } = this.gfxAt(wx, wy);
      const len = 130 + Math.random() * 40;
      g.moveTo(0, 0)
        .lineTo(Math.cos(angle - 0.18) * len * 0.7, Math.sin(angle - 0.18) * len * 0.35)
        .lineTo(Math.cos(angle) * len, Math.sin(angle) * len * 0.5)
        .lineTo(Math.cos(angle + 0.18) * len * 0.7, Math.sin(angle + 0.18) * len * 0.35)
        .closePath()
        .fill({ color: 0xff9900, alpha: 0.85 });
      this.addFx(g, 380, (gr, t) => { gr.alpha = t * 0.9; gr.scale.set(0.2 + (1 - t) * 1.0); });
    }

    // Outer ring
    const { g: ring } = this.gfxAt(wx, wy);
    ring.ellipse(0, 0, 3 * 32, 3 * 16).stroke({ color: 0xffcc00, width: 5 });
    this.addFx(ring, 500, (g, t) => { g.alpha = t; g.scale.set(1 + (1 - t) * 1.2); });
  }

  // Leap trail ghost
  showLeapTrail(wx: number, wy: number): void {
    const { g } = this.gfxAt(wx, wy);
    g.ellipse(0, 0, 22, 11).fill({ color: 0xff6622, alpha: 0.7 });
    this.addFx(g, 280, (gr, t) => { gr.alpha = t * 0.6; });
  }

  // Leap landing shockwave
  showLeapLanding(wx: number, wy: number): void {
    const { g: fill } = this.gfxAt(wx, wy);
    fill.ellipse(0, 0, 160, 80).fill({ color: 0xff5500, alpha: 0.75 });
    this.addFx(fill, 350, (g, t) => { g.alpha = t * 0.8; g.scale.set(0.1 + (1 - t) * 1.5); });

    for (let i = 0; i < 4; i++) {
      const delay = i * 60;
      setTimeout(() => {
        const { g } = this.gfxAt(wx, wy);
        g.ellipse(0, 0, (3 + i * 1.5) * 32, (3 + i * 1.5) * 16)
          .stroke({ color: i === 0 ? 0xffffff : 0xff7733, width: 4 - i });
        this.addFx(g, 550, (gr, t) => { gr.alpha = t; gr.scale.set(1 + (1 - t) * (0.6 + i * 0.2)); });
      }, delay);
    }

    // Spikes on impact
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const { g } = this.gfxAt(wx, wy);
      const len = 90 + Math.random() * 30;
      g.moveTo(0, 0)
        .lineTo(Math.cos(angle - 0.2) * len * 0.6, Math.sin(angle - 0.2) * len * 0.3)
        .lineTo(Math.cos(angle) * len, Math.sin(angle) * len * 0.5)
        .lineTo(Math.cos(angle + 0.2) * len * 0.6, Math.sin(angle + 0.2) * len * 0.3)
        .closePath()
        .fill({ color: 0xff8844, alpha: 0.8 });
      this.addFx(g, 300, (gr, t) => { gr.alpha = t; gr.scale.set(0.3 + (1 - t) * 0.9); });
    }
  }

  // Ultimate: screen flash + cascading rings from player
  showUltimate(screenW: number, screenH: number, wx: number, wy: number): void {
    const flash = new Graphics();
    flash.rect(0, 0, screenW, screenH).fill({ color: 0xffffff, alpha: 0.75 });
    flash.zIndex = 99999;
    this.addFx(flash, 500, (g, t) => { g.alpha = t * 0.75; });

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const { g } = this.gfxAt(wx, wy);
        const r = 5 + i * 4;
        g.ellipse(0, 0, r * 32, r * 16)
          .stroke({ color: i % 2 === 0 ? 0xffffff : 0xff8888, width: 3 });
        this.addFx(g, 800, (gr, t) => { gr.alpha = t * 0.9; gr.scale.set(1 + (1 - t) * 0.6); });
      }, i * 90);
    }
  }

  showDamageNumber(wx: number, wy: number, amount: number, isDeath = false, isCrit = false): void {
    const { x: sx, y: sy } = worldToScreen(wx, wy);
    const rounded = Math.round(amount);

    const color = (isDeath && isCrit) ? 0xff9900
      : isDeath              ? 0xffd700
      : isCrit               ? 0xff6600
      : rounded >= 60        ? 0xffee44
      : 0xffffff;

    const baseSize = isDeath ? 52 : isCrit ? 44 : rounded >= 60 ? 36 : 26;

    const text = new Text({
      text: isCrit ? `${rounded}!` : `${rounded}`,
      style: new TextStyle({
        fill: color,
        fontSize: baseSize,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 5 },
        dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.9 },
      }),
    });
    text.anchor.set(0.5, 1);
    text.position.set(sx + (Math.random() - 0.5) * 24, sy);
    text.zIndex = 99990;
    this.layer.addChild(text);
    const ttl = isDeath ? 1500 : isCrit ? 1200 : 950;
    this.damageNums.push({
      text,
      vx: (Math.random() - 0.5) * 22,
      vy: -((isDeath || isCrit) ? 60 : 44) - Math.random() * 20,
      ttl,
      maxTtl: ttl,
    });

    if (!this.soundsMuted()) {
      if (isDeath) {
        this.showDeathBurst(wx, wy);
        playKill();
      } else {
        playHit();
      }
    } else if (isDeath) {
      this.showDeathBurst(wx, wy);
    }
  }

  showDeathBurst(wx: number, wy: number): void {
    const { x: sx, y: sy } = worldToScreen(wx, wy);
    const count = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * 0.45;
      const r = 3 + Math.random() * 3.5;
      const color = Math.random() > 0.35 ? 0xff2200 : 0xffaa00;
      const g = new Graphics();
      g.circle(0, 0, r).fill({ color });
      g.position.set(sx, sy);
      g.zIndex = 9997;
      this.layer.addChild(g);
      const maxTtl = 420 + Math.random() * 160;
      const totalT = maxTtl / 1000;
      this.addFx(g, maxTtl, (gr, t) => {
        const f = 1 - t;
        gr.x = sx + vx * f * totalT;
        gr.y = sy + vy * f * totalT + 180 * f * f;
        gr.alpha = t * t;
        gr.scale.set(0.3 + t * 0.7);
      });
    }
  }

  showHitSpark(wx: number, wy: number): void {
    const { x: sx, y: sy } = worldToScreen(wx, wy);
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * 0.4;
      const g = new Graphics();
      g.circle(0, 0, 2 + Math.random() * 2).fill({ color: 0xffffff });
      g.position.set(sx, sy);
      g.zIndex = 9998;
      this.layer.addChild(g);
      const maxTtl = 120 + Math.random() * 80;
      const totalT = maxTtl / 1000;
      this.addFx(g, maxTtl, (gr, t) => {
        const f = 1 - t;
        gr.x = sx + vx * f * totalT;
        gr.y = sy + vy * f * totalT;
        gr.alpha = t;
      });
    }
  }

  private tickDamageNums(deltaMS: number): void {
    const dt = deltaMS / 1000;
    for (let i = this.damageNums.length - 1; i >= 0; i--) {
      const n = this.damageNums[i];
      n.ttl -= deltaMS;
      if (n.ttl <= 0) {
        this.layer.removeChild(n.text);
        n.text.destroy();
        this.damageNums.splice(i, 1);
        continue;
      }
      const t = n.ttl / n.maxTtl; // 1→0
      // Pop-scale: spawn at 1.6x, shrink to 1.0 over first 15% of lifetime
      const popT = Math.min(1, (1 - t) / 0.15);
      const scale = 1.6 - 0.6 * popT;
      n.text.scale.set(scale);
      n.text.x += n.vx * dt;
      n.text.y += n.vy * dt;
      n.vx *= 0.88;
      n.vy *= 0.88;
      // Fade only during last 50%
      n.text.alpha = t < 0.5 ? t * 2 : 1;
    }
  }

  showFlash(wx: number, wy: number, color: number): void {
    const { g } = this.gfxAt(wx, wy);
    g.ellipse(0, 0, 44, 22).fill({ color, alpha: 0.85 });
    this.addFx(g, 180, (gr, t) => { gr.alpha = t; });
  }

  showCircle(wx: number, wy: number, radius: number, color: number): void {
    const { g } = this.gfxAt(wx, wy);
    g.ellipse(0, 0, radius * 32, radius * 16).fill({ color, alpha: 0.55 });
    this.addFx(g, 380, (gr, t) => { gr.alpha = t * 0.7; gr.scale.set(1 + (1 - t) * 0.5); });
  }

  showScreenFlash(screenW: number, screenH: number): void {
    const g = new Graphics();
    g.rect(0, 0, screenW, screenH).fill({ color: 0xffffff, alpha: 0.6 });
    g.zIndex = 99999;
    this.addFx(g, 300, (gr, t) => { gr.alpha = t * 0.6; });
  }

  // ── Bounce projectiles ──────────────────────────────────────────────────────

  spawnBounce(
    wx: number, wy: number,
    dirX: number, dirY: number,
    bouncesLeft: number,
    damage: number,
    stats: PlayerStats,
  ): void {
    const g = new Graphics();
    g.zIndex = 9998;
    this.layer.addChild(g);
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    this.bounces.push({
      wx, wy,
      vx: (dirX / len) * BOUNCE_SPEED,
      vy: (dirY / len) * BOUNCE_SPEED,
      bouncesLeft,
      damage,
      stats,
      gfx: g,
      trail: [],
      lifetime: 4000,
    });
  }

  private tickBounces(deltaMS: number, enemies: EnemyManager): void {
    const dt = deltaMS / 1000;
    const toAdd: BounceProj[] = [];

    for (let i = this.bounces.length - 1; i >= 0; i--) {
      const proj = this.bounces[i];
      proj.lifetime -= deltaMS;

      if (proj.lifetime <= 0) {
        this.killBounce(proj, i);
        continue;
      }

      // Home toward nearest alive enemy
      let nearest: Enemy | null = null;
      let nearDist = Infinity;
      for (const e of enemies.all) {
        if (e.isDead) continue;
        const dx = e.worldX - proj.wx;
        const dy = e.worldY - proj.wy;
        const d = dx * dx + dy * dy;
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest) {
        const dx = nearest.worldX - proj.wx;
        const dy = nearest.worldY - proj.wy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const tvx = (dx / d) * BOUNCE_SPEED;
        const tvy = (dy / d) * BOUNCE_SPEED;
        const turn = Math.min(1, 7 * dt);
        proj.vx += (tvx - proj.vx) * turn;
        proj.vy += (tvy - proj.vy) * turn;
        const spd = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) || 1;
        proj.vx = (proj.vx / spd) * BOUNCE_SPEED;
        proj.vy = (proj.vy / spd) * BOUNCE_SPEED;
      }

      proj.wx += proj.vx * dt;
      proj.wy += proj.vy * dt;

      const { x: sx, y: sy } = worldToScreen(proj.wx, proj.wy);
      proj.trail.push({ sx, sy });
      if (proj.trail.length > 10) proj.trail.shift();

      this.drawBounce(proj, sx, sy);

      // Collision
      for (const enemy of enemies.all) {
        if (enemy.isDead) continue;
        const dx = enemy.worldX - proj.wx;
        const dy = enemy.worldY - proj.wy;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
          this.processBounceHit(proj, enemy, toAdd);
          break;
        }
      }

      if (proj.lifetime <= 0) this.killBounce(proj, i);
    }

    for (const p of toAdd) this.bounces.push(p);
  }

  private processBounceHit(
    proj: BounceProj,
    enemy: Enemy,
    toAdd: BounceProj[],
  ): void {
    const { damage: actualDmg, isCrit } = proj.stats.rollCrit(proj.damage * proj.stats.damage);
    enemy.takeDamage(actualDmg, isCrit);
    this.showFlash(proj.wx, proj.wy, isCrit ? 0xff8800 : 0xffffff);
    this.showHitSpark(proj.wx, proj.wy);
    playBounceHit();

    if (!enemy.isDead) {
      // Hit but no kill → die
      proj.lifetime = 0;
      return;
    }

    // Killed the enemy → use one bounce charge
    proj.bouncesLeft--;

    if (isCrit) {
      // Crit kill → also spawn a duplicate with remaining charges
      const angle = Math.atan2(proj.vy, proj.vx);
      const spread = 0.5 + Math.random() * 0.4;
      const dupAngle = angle + (Math.random() > 0.5 ? spread : -spread);
      const dupG = new Graphics();
      dupG.zIndex = 9998;
      this.layer.addChild(dupG);
      toAdd.push({
        wx: proj.wx, wy: proj.wy,
        vx: Math.cos(dupAngle) * BOUNCE_SPEED,
        vy: Math.sin(dupAngle) * BOUNCE_SPEED,
        bouncesLeft: proj.bouncesLeft,
        damage: proj.damage,
        stats: proj.stats,
        gfx: dupG,
        trail: [],
        lifetime: 4000,
      });
    }

    if (proj.bouncesLeft <= 0) proj.lifetime = 0;
    // Homing in tickBounces will steer to next target automatically
  }

  private drawBounce(proj: BounceProj, sx: number, sy: number): void {
    proj.gfx.clear();

    // Trail
    const len = proj.trail.length;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const pos = proj.trail[i];
      const r = PROJ_R * t * 0.9;
      if (r < 1.5) continue;
      proj.gfx.circle(pos.sx, pos.sy, r).fill({ color: 0x88ccff, alpha: t * 0.45 });
    }

    // Glow halo
    const bounceColor = proj.bouncesLeft >= 3 ? 0xffffff
      : proj.bouncesLeft === 2 ? 0xaaddff
      : 0x6688ff;
    proj.gfx.circle(sx, sy, PROJ_R * 2).fill({ color: bounceColor, alpha: 0.2 });
    proj.gfx.circle(sx, sy, PROJ_R * 1.3).fill({ color: 0xffffff, alpha: 0.5 });
    proj.gfx.circle(sx, sy, PROJ_R).fill({ color: 0xffffff, alpha: 1.0 });
  }

  private killBounce(proj: BounceProj, index: number): void {
    this.layer.removeChild(proj.gfx);
    proj.gfx.destroy();
    this.bounces.splice(index, 1);
  }
}
