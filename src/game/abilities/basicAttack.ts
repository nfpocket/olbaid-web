import { EnemyManager } from '../EnemyManager';
import { Player } from '../Player';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';
import { playQFire } from '../Sound';

const BOUNCE_DAMAGE = 15;
const MAX_BOUNCES = 6;

export function makeBasicAttack(
  player: Player,
  stats: PlayerStats,
  fx: ProjectileManager,
  enemies: EnemyManager,
) {
  return (worldX?: number, worldY?: number) => {
    // Auto-target nearest enemy; fall back to cursor/forward if none found
    let tx = worldX ?? player.worldX + 1;
    let ty = worldY ?? player.worldY;
    let minDist = Infinity;
    for (const e of enemies.all) {
      const dx = e.worldX - player.worldX;
      const dy = e.worldY - player.worldY;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; tx = e.worldX; ty = e.worldY; }
    }
    playQFire();
    fx.spawnBounce(
      player.worldX, player.worldY,
      tx - player.worldX,
      ty - player.worldY,
      MAX_BOUNCES,
      BOUNCE_DAMAGE,
      stats,
    );
  };
}
