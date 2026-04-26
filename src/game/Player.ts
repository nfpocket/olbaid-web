import { Container, Graphics } from 'pixi.js';
import { MOVE_THRESHOLD, PLAYER_SPEED, TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';

export class Player {
  readonly view: Container;
  worldX: number;
  worldY: number;
  private targetX: number;
  private targetY: number;
  private gfx: Graphics;

  constructor(startCol: number, startRow: number) {
    this.worldX = startCol;
    this.worldY = startRow;
    this.targetX = startCol;
    this.targetY = startRow;

    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    this.drawShape();
    this.syncPosition();
  }

  setTarget(col: number, row: number): void {
    this.targetX = col;
    this.targetY = row;
  }

  update(deltaMS: number): void {
    const dx = this.targetX - this.worldX;
    const dy = this.targetY - this.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOVE_THRESHOLD) {
      this.worldX = this.targetX;
      this.worldY = this.targetY;
      return;
    }

    const step = (PLAYER_SPEED * deltaMS) / 1000;
    const move = Math.min(step, dist);
    this.worldX += (dx / dist) * move;
    this.worldY += (dy / dist) * move;

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
