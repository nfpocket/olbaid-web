import { Container, Graphics } from 'pixi.js';
import { TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';
import { Player } from './Player';

export class Enemy {
  readonly view: Container;
  worldX: number;
  worldY: number;
  hp: number;
  readonly maxHp: number;
  readonly speed: number;
  readonly damage: number;
  readonly xpReward: number;
  private attackTimer = 0;
  private readonly attackInterval: number;
  private hpBar: Graphics;

  constructor(
    worldX: number,
    worldY: number,
    hp: number,
    speed: number,
    damage: number,
    xpReward: number,
    attackInterval: number,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.damage = damage;
    this.xpReward = xpReward;
    this.attackInterval = attackInterval;

    this.view = new Container();
    this.view.addChild(this.buildShape());
    this.hpBar = this.buildHpBar();
    this.view.addChild(this.hpBar);
    this.syncPosition();
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  onDamage?: (worldX: number, worldY: number, amount: number, isDeath: boolean, isCrit: boolean) => void;

  takeDamage(amount: number, isCrit = false): void {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHpBar();
    this.onDamage?.(this.worldX, this.worldY, amount, this.isDead, isCrit);
  }

  update(deltaMS: number, player: Player): void {
    const dx = player.worldX - this.worldX;
    const dy = player.worldY - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.5) {
      const step = (this.speed * deltaMS) / 1000;
      const move = Math.min(step, dist - 0.5);
      this.worldX += (dx / dist) * move;
      this.worldY += (dy / dist) * move;
    }

    this.attackTimer -= deltaMS;
    if (this.attackTimer <= 0 && dist < 0.8) {
      this.attackTimer = this.attackInterval;
      player.stats.takeDamage(this.damage);
    }

    this.syncPosition();
  }

  private syncPosition(): void {
    const { x, y } = worldToScreen(this.worldX, this.worldY);
    this.view.position.set(x, y);
    this.view.zIndex = Math.round(this.worldY);
  }

  private buildShape(): Graphics {
    const hw = TILE_W * 0.18;
    const hh = TILE_H * 0.45;
    return new Graphics()
      .moveTo(0, -hh)
      .lineTo(hw, 0)
      .lineTo(0, hh)
      .lineTo(-hw, 0)
      .closePath()
      .fill({ color: 0xcc2222 })
      .stroke({ color: 0xff6666, width: 1 });
  }

  private buildHpBar(): Graphics {
    const g = new Graphics();
    g.position.set(-14, -TILE_H * 0.55);
    this.drawHpBar(g);
    return g;
  }

  private updateHpBar(): void {
    this.hpBar.clear();
    this.drawHpBar(this.hpBar);
  }

  private drawHpBar(g: Graphics): void {
    const w = 28;
    const h = 3;
    const fill = Math.max(0, (this.hp / this.maxHp) * w);
    g.rect(0, 0, w, h).fill({ color: 0x440000 });
    if (fill > 0) g.rect(0, 0, fill, h).fill({ color: 0xff3333 });
  }
}
