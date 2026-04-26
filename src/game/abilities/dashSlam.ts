import { EnemyManager } from '../EnemyManager';
import { Player } from '../Player';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';
import { playExplosion } from '../Sound';

export function makeDashSlam(
  player: Player,
  stats: PlayerStats,
  enemies: EnemyManager,
  fx: ProjectileManager,
  shake: (amt: number, dur: number) => void,
) {
  return (worldX?: number, worldY?: number) => {
    const tx = worldX ?? player.worldX;
    const ty = worldY ?? player.worldY;
    const dx = tx - player.worldX;
    const dy = ty - player.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const leapDist = Math.min(10, dist);
    const nx = player.worldX + (dx / dist) * leapDist;
    const ny = player.worldY + (dy / dist) * leapDist;

    player.startLeap(
      nx, ny,
      () => {
        const radius = 3;
        const damage = 70 * stats.damage;
        enemies.hitCircle(nx, ny, radius, damage, stats);
        fx.showLeapLanding(nx, ny);
        shake(14, 450);
        playExplosion();
      },
      (wx, wy) => fx.showLeapTrail(wx, wy),
    );
  };
}
