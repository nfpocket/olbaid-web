import { Container, Graphics } from 'pixi.js';
import { TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';

const FADE_MS = 500;

export class MoveIndicator {
  readonly view: Container;
  private gfx: Graphics;
  private timer = 0;

  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.view.zIndex = -1; // always below player entities

    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    this.drawShape();
  }

  show(col: number, row: number): void {
    const { x, y } = worldToScreen(col, row);
    this.view.position.set(x, y);
    this.view.alpha = 1;
    this.view.visible = true;
    this.timer = FADE_MS;
  }

  update(deltaMS: number): void {
    if (!this.view.visible) return;
    this.timer -= deltaMS;
    if (this.timer <= 0) {
      this.view.visible = false;
      return;
    }
    this.view.alpha = this.timer / FADE_MS;
  }

  private drawShape(): void {
    const hw = TILE_W * 0.28;
    const hh = TILE_H * 0.55;

    // Diamond ring
    this.gfx
      .moveTo(0, -hh)
      .lineTo(hw, 0)
      .lineTo(0, hh)
      .lineTo(-hw, 0)
      .closePath()
      .stroke({ color: 0xffffff, width: 1.5 });

    // Centre dot
    this.gfx
      .circle(0, 0, 2.5)
      .fill({ color: 0xffffff });
  }
}
