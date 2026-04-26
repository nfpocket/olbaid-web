import { Container, Graphics } from 'pixi.js';
import { TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';
import { Player } from './Player';

const CHARGE_SPEED = 12;
const TRACK_SPEED = 1.2;
const CHARGE_INTERVAL = 4000;
const CHARGE_DURATION = 500;
const ATTACK_RANGE = 1.2;
const ATTACK_DAMAGE = 25;
const ATTACK_INTERVAL = 1200;

export class Boss {
  readonly view: Container;
  worldX: number;
  worldY: number;
  hp: number;
  readonly maxHp: number;
  private gfx: Graphics;
  private hpBar: Graphics;
  private pulseT = 0;
  private chargeTimer = CHARGE_INTERVAL;
  private chargeActive = false;
  private chargeDirX = 0;
  private chargeDirY = 0;
  private chargeLeft = 0;
  private attackTimer = 0;

  constructor(
    worldX: number,
    worldY: number,
    level: number,
    private onDefeated: () => void,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.hp = 1000 * level;
    this.maxHp = this.hp;

    this.view = new Container();
    this.gfx = new Graphics();
    this.hpBar = new Graphics();
    this.view.addChild(this.gfx, this.hpBar);
    this.drawShape();
    this.drawHpBar();
    this.syncPosition();
  }

  get isDead(): boolean { return this.hp <= 0; }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.drawHpBar();
    if (this.isDead) this.onDefeated();
  }

  update(deltaMS: number, player: Player): void {
    this.pulseT += deltaMS / 600;
    this.gfx.alpha = 0.7 + Math.sin(this.pulseT) * 0.3;

    this.attackTimer -= deltaMS;
    if (this.attackTimer <= 0) {
      const dx = player.worldX - this.worldX;
      const dy = player.worldY - this.worldY;
      if (Math.sqrt(dx * dx + dy * dy) < ATTACK_RANGE) {
        player.stats.takeDamage(ATTACK_DAMAGE);
      }
      this.attackTimer = ATTACK_INTERVAL;
    }

    if (this.chargeActive) {
      const step = (CHARGE_SPEED * deltaMS) / 1000;
      this.worldX += this.chargeDirX * step;
      this.worldY += this.chargeDirY * step;
      this.chargeLeft -= deltaMS;
      if (this.chargeLeft <= 0) this.chargeActive = false;
    } else {
      // Slow track toward player
      const dx = player.worldX - this.worldX;
      const dy = player.worldY - this.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.5) {
        const step = (TRACK_SPEED * deltaMS) / 1000;
        this.worldX += (dx / dist) * step;
        this.worldY += (dy / dist) * step;
      }

      this.chargeTimer -= deltaMS;
      if (this.chargeTimer <= 0) {
        this.chargeTimer = CHARGE_INTERVAL;
        this.chargeActive = true;
        this.chargeLeft = CHARGE_DURATION;
        const dx2 = player.worldX - this.worldX;
        const dy2 = player.worldY - this.worldY;
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        this.chargeDirX = dx2 / d;
        this.chargeDirY = dy2 / d;
      }
    }

    this.syncPosition();
  }

  private syncPosition(): void {
    const { x, y } = worldToScreen(this.worldX, this.worldY);
    this.view.position.set(x, y);
    this.view.zIndex = Math.round(this.worldY) + 1000;
  }

  private drawShape(): void {
    this.gfx.clear();
    const rx = TILE_W * 0.55;
    const ry = TILE_H * 0.9;
    this.gfx.ellipse(0, 0, rx, ry)
      .fill({ color: 0xcc00cc })
      .stroke({ color: 0xff88ff, width: 3 });
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = 60;
    const h = 5;
    const fill = (this.hp / this.maxHp) * w;
    this.hpBar.rect(-w / 2, -TILE_H * 1.2, w, h).fill({ color: 0x440044 });
    if (fill > 0) this.hpBar.rect(-w / 2, -TILE_H * 1.2, fill, h).fill({ color: 0xff00ff });
  }
}
