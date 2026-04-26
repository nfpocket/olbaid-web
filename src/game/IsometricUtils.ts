import { TILE_H, TILE_W } from '../constants';

export function worldToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

export function screenToWorld(sx: number, sy: number): { col: number; row: number } {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return {
    col: (sx / hw + sy / hh) / 2,
    row: (sy / hh - sx / hw) / 2,
  };
}
