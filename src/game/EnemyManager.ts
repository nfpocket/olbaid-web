import { Container } from 'pixi.js';
import { ENEMY_ATTACK_INTERVAL_MS, ENEMY_BASE_DAMAGE, ENEMY_BASE_HP, ENEMY_BASE_SPEED, TILE_H, TILE_W, XP_PER_KILL } from '../constants';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { PlayerStats } from './PlayerStats';

const MIN_ENEMIES = 80;
const WAVE_INTERVAL_MS = 1200;
const WAVE_SIZE = 50;
const INITIAL_DELAY_MS = 4000;

export class EnemyManager {
  private enemies: Enemy[] = [];
  private elapsed = 0;
  private waveTimer = 0;
  private playerX = 0;
  private playerY = 0;

  onHit?: (worldX: number, worldY: number, amount: number, isDeath: boolean, isCrit: boolean) => void;

  constructor(
    private entityLayer: Container,
    private screenW: number,
    private screenH: number,
  ) {}

  get all(): readonly Enemy[] {
    return this.enemies;
  }

  spawn(worldX: number, worldY: number): Enemy {
    const scale = 1 + Math.floor(this.elapsed / 60000) * 0.1;
    const e = new Enemy(
      worldX, worldY,
      Math.round(ENEMY_BASE_HP * scale),
      ENEMY_BASE_SPEED,
      ENEMY_BASE_DAMAGE * scale,
      XP_PER_KILL,
      ENEMY_ATTACK_INTERVAL_MS,
    );
    e.onDamage = (wx, wy, amt, dead, crit) => this.onHit?.(wx, wy, amt, dead, crit);
    this.enemies.push(e);
    this.entityLayer.addChild(e.view);
    return e;
  }

  private screenEdgeSpawn(): { wx: number; wy: number } {
    const hw = this.screenW / 2 + TILE_W;
    const hh = this.screenH / 2 + TILE_H;
    let ox: number, oy: number;
    if (Math.random() < 0.5) {
      ox = (Math.random() * 2 - 1) * hw;
      oy = Math.random() < 0.5 ? -hh : hh;
    } else {
      ox = Math.random() < 0.5 ? -hw : hw;
      oy = (Math.random() * 2 - 1) * hh;
    }
    const dc = ox / TILE_W + oy / TILE_H;
    const dr = oy / TILE_H - ox / TILE_W;
    return { wx: this.playerX + dc, wy: this.playerY + dr };
  }

  private spawnWave(): void {
    const count = WAVE_SIZE + Math.floor(this.elapsed / 60000) * 15;
    for (let i = 0; i < count; i++) {
      const { wx, wy } = this.screenEdgeSpawn();
      this.spawn(wx, wy);
    }
  }

  update(deltaMS: number, player: Player): void {
    this.elapsed += deltaMS;
    this.playerX = player.worldX;
    this.playerY = player.worldY;

    if (this.elapsed >= INITIAL_DELAY_MS) {
      this.waveTimer += deltaMS;
      const needsWave = this.enemies.length < MIN_ENEMIES || this.waveTimer >= WAVE_INTERVAL_MS;
      if (needsWave) {
        this.spawnWave();
        this.waveTimer = 0;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(deltaMS, player);
      if (e.isDead) {
        player.stats.addXp(e.xpReward);
        this.entityLayer.removeChild(e.view);
        e.view.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  removeAll(): void {
    for (const e of this.enemies) {
      this.entityLayer.removeChild(e.view);
      e.view.destroy();
    }
    this.enemies = [];
  }

  hitCircle(wx: number, wy: number, radius: number, damage: number, stats?: PlayerStats): number {
    let count = 0;
    for (const e of this.enemies) {
      const dx = e.worldX - wx;
      const dy = e.worldY - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        if (stats) {
          const { damage: d, isCrit } = stats.rollCrit(damage);
          e.takeDamage(d, isCrit);
        } else {
          e.takeDamage(damage);
        }
        count++;
      }
    }
    return count;
  }

  hitCone(
    ox: number, oy: number,
    dirAngle: number, halfAngle: number,
    range: number, damage: number,
    stats?: PlayerStats,
  ): number {
    let count = 0;
    for (const e of this.enemies) {
      const dx = e.worldX - ox;
      const dy = e.worldY - oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;
      const angle = Math.atan2(dy, dx);
      let diff = Math.abs(angle - dirAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= halfAngle) {
        if (stats) {
          const { damage: d, isCrit } = stats.rollCrit(damage);
          e.takeDamage(d, isCrit);
        } else {
          e.takeDamage(damage);
        }
        count++;
      }
    }
    return count;
  }

  hitAll(damage: number, stats?: PlayerStats): number {
    for (const e of this.enemies) {
      if (stats) {
        const { damage: d, isCrit } = stats.rollCrit(damage);
        e.takeDamage(d, isCrit);
      } else {
        e.takeDamage(damage);
      }
    }
    return this.enemies.length;
  }
}
