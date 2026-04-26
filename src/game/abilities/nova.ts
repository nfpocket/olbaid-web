import { EnemyManager } from '../EnemyManager';
import { Player } from '../Player';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';
import { playExplosion } from '../Sound';

export function makeNova(
  player: Player,
  stats: PlayerStats,
  enemies: EnemyManager,
  fx: ProjectileManager,
  shake: (amt: number, dur: number) => void,
) {
  return () => {
    const radius = 5.5;
    const damage = 45 * stats.damage;
    enemies.hitCircle(player.worldX, player.worldY, radius, damage, stats);
    fx.showNova(player.worldX, player.worldY);
    shake(8, 350);
    playExplosion();
  };
}
