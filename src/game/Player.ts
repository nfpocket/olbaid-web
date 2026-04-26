import { Container, Graphics } from 'pixi.js';
import { MOVE_THRESHOLD, PLAYER_SPEED, TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';
import { PlayerStats } from './PlayerStats';

const LEAP_SPEED = 30; // tiles/sec during leap

export class Player {
  readonly view: Container;
  worldX: number;
  worldY: number;
  private targetX: number;
  private targetY: number;
  private gfx: Graphics;
  readonly stats: PlayerStats;

  private leaping = false;
  private leapOnLand?: () => void;
  private leapTrailCb?: (wx: number, wy: number) => void;
  private trailTimer = 0;

  constructor(startCol: number, startRow: number, stats: PlayerStats) {
    this.worldX = startCol;
    this.worldY = startRow;
    this.targetX = startCol;
    this.targetY = startRow;
    this.stats = stats;

    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    this.drawShape();
    this.syncPosition();
  }

  setTarget(col: number, row: number): void {
    if (this.leaping) return; // ignore move commands during leap
    this.targetX = col;
    this.targetY = row;
  }

  teleport(col: number, row: number): void {
    this.worldX = col;
    this.worldY = row;
    this.targetX = col;
    this.targetY = row;
    this.syncPosition();
  }

  startLeap(
    targetX: number, targetY: number,
    onLand: () => void,
    onTrail?: (wx: number, wy: number) => void,
  ): void {
    this.leaping = true;
    this.targetX = targetX;
    this.targetY = targetY;
    this.leapOnLand = onLand;
    this.leapTrailCb = onTrail;
    this.trailTimer = 0;
  }

  get isLeaping(): boolean { return this.leaping; }

  update(deltaMS: number): void {
    this.stats.tick(deltaMS);

    const dx = this.targetX - this.worldX;
    const dy = this.targetY - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOVE_THRESHOLD) {
      this.worldX = this.targetX;
      this.worldY = this.targetY;
      if (this.leaping) {
        this.leaping = false;
        const cb = this.leapOnLand;
        this.leapOnLand = undefined;
        this.leapTrailCb = undefined;
        cb?.();
      }
      return;
    }

    const speed = this.leaping ? LEAP_SPEED : this.stats.effectiveSpeed(PLAYER_SPEED);
    const step = (speed * deltaMS) / 1000;
    const move = Math.min(step, dist);
    this.worldX += (dx / dist) * move;
    this.worldY += (dy / dist) * move;

    if (this.leaping) {
      this.trailTimer -= deltaMS;
      if (this.trailTimer <= 0) {
        this.leapTrailCb?.(this.worldX, this.worldY);
        this.trailTimer = 40; // emit trail every 40ms
      }
    }

    this.syncPosition();
  }

  private syncPosition(): void {
    const { x, y } = worldToScreen(this.worldX, this.worldY);
    this.view.position.set(x, y);
    this.view.zIndex = Math.round(this.worldY);
  }

  private drawShape(): void {
    const hw = TILE_W * 0.3;
    const hh = TILE_H * 0.7;
    this.gfx
      .moveTo(0, -hh)
      .lineTo(hw, 0)
      .lineTo(0, hh)
      .lineTo(-hw, 0)
      .closePath()
      .fill({ color: 0xffd700 })
      .stroke({ color: 0xffffff, width: 1.5 });
  }
}
