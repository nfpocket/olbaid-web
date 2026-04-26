import { Application } from 'pixi.js';
import { EnemyManager } from '../EnemyManager';
import { Player } from '../Player';
import { PlayerStats } from '../PlayerStats';
import { ProjectileManager } from '../ProjectileManager';
import { playMegaExplosion } from '../Sound';

export function makeUltimate(
  app: Application,
  player: Player,
  stats: PlayerStats,
  enemies: EnemyManager,
  fx: ProjectileManager,
  shake: (amt: number, dur: number) => void,
) {
  return () => {
    fx.muteHitSounds(700);
    enemies.hitAll(80 * stats.damage, stats);
    fx.showUltimate(app.screen.width, app.screen.height, player.worldX, player.worldY);
    shake(20, 600);
    playMegaExplosion();
  };
}
