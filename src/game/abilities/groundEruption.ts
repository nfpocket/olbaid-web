import { EnemyManager } from '../EnemyManager';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';
import { playExplosion } from '../Sound';

export function makeGroundEruption(
  stats: PlayerStats,
  enemies: EnemyManager,
  fx: ProjectileManager,
  shake: (amt: number, dur: number) => void,
) {
  return (worldX?: number, worldY?: number) => {
    const tx = worldX ?? 0;
    const ty = worldY ?? 0;

    fx.showEruptionWarning(tx, ty);

    setTimeout(() => {
      const damage = 60 * stats.damage;
      enemies.hitCircle(tx, ty, 2.5, damage, stats);
      fx.showEruption(tx, ty);
      shake(12, 400);
      playExplosion();
    }, 350);
  };
}
