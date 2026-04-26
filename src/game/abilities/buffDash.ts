import { Player } from '../Player';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';

export function makeBuffDash(
  player: Player,
  stats: PlayerStats,
  fx: ProjectileManager,
) {
  return (worldX?: number, worldY?: number) => {
    const tx = worldX ?? player.worldX;
    const ty = worldY ?? player.worldY;
    const dx = tx - player.worldX;
    const dy = ty - player.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dashDist = Math.min(2, dist);
    const nx = player.worldX + (dx / dist) * dashDist;
    const ny = player.worldY + (dy / dist) * dashDist;

    player.teleport(nx, ny);
    stats.speedBoostTimer = 2000;
    fx.showFlash(nx, ny, 0x44ffaa);
  };
}
