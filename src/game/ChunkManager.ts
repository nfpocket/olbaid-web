import { Container, Graphics } from 'pixi.js';
import { CHUNK_LOAD_RADIUS, CHUNK_SIZE, CHUNK_UNLOAD_RADIUS, TILE_H, TILE_W } from '../constants';
import { worldToScreen } from './IsometricUtils';

interface Chunk {
  gfx: Graphics;
  col: number;
  row: number;
}

export class ChunkManager {
  private chunks = new Map<string, Chunk>();

  constructor(private groundLayer: Container) {}

  update(playerWorldX: number, playerWorldY: number): void {
    const pcx = Math.floor(playerWorldX / CHUNK_SIZE);
    const pcy = Math.floor(playerWorldY / CHUNK_SIZE);

    // Load chunks within radius
    for (let dy = -CHUNK_LOAD_RADIUS; dy <= CHUNK_LOAD_RADIUS; dy++) {
      for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
        const cx = pcx + dx;
        const cy = pcy + dy;
        const key = `${cx},${cy}`;
        if (!this.chunks.has(key)) {
          this.loadChunk(cx, cy, key);
        }
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      if (
        Math.abs(chunk.col - pcx) > CHUNK_UNLOAD_RADIUS ||
        Math.abs(chunk.row - pcy) > CHUNK_UNLOAD_RADIUS
      ) {
        this.groundLayer.removeChild(chunk.gfx);
        chunk.gfx.destroy();
        this.chunks.delete(key);
      }
    }
  }

  private loadChunk(cx: number, cy: number, key: string): void {
    const g = new Graphics();
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    for (let row = 0; row < CHUNK_SIZE; row++) {
      for (let col = 0; col < CHUNK_SIZE; col++) {
        const worldCol = cx * CHUNK_SIZE + col;
        const worldRow = cy * CHUNK_SIZE + row;
        const { x, y } = worldToScreen(worldCol, worldRow);
        const fillColor = (worldCol + worldRow) % 2 === 0 ? 0x2d5a27 : 0x3a7a34;

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
    this.chunks.set(key, { gfx: g, col: cx, row: cy });
  }
}
