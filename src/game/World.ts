import { Container, Graphics } from 'pixi.js';
import { MAP_COLS, MAP_ROWS, TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';

export class World {
  readonly groundLayer: Container;
  readonly entityLayer: Container;

  constructor() {
    this.groundLayer = new Container();
    this.entityLayer = new Container({ sortableChildren: true });
    this.buildGrid();
  }

  private buildGrid(): void {
    const g = new Graphics();
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const { x, y } = worldToScreen(col, row);
        const fillColor = (col + row) % 2 === 0 ? 0x2d5a27 : 0x3a7a34;

        g.moveTo(x, y - hh)
          .lineTo(x + hw, y)
          .lineTo(x, y + hh)
          .lineTo(x - hw, y)
          .closePath()
          .fill({ color: fillColor })
          .stroke({ color: 0x1a3a18, width: 0.5 });
      }
    }

    this.groundLayer.addChild(g);
  }
}
