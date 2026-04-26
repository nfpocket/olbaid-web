import { Application, Container } from 'pixi.js';
import { MAP_COLS, MAP_ROWS } from '../constants';
import { worldToScreen } from './IsometricUtils';
import { AbilitySystem, SLOT_E, SLOT_LMB, SLOT_Q, SLOT_R, SLOT_RMB, SLOT_W } from './AbilitySystem';
import { Boss } from './Boss';
import { ChunkManager } from './ChunkManager';
import { EnemyManager } from './EnemyManager';
import { InputManager } from './InputManager';
import { MoveIndicator } from './MoveIndicator';
import { Player } from './Player';
import { PlayerStats } from './PlayerStats';
import { ProjectileManager } from './ProjectileManager';
import { RunTimer } from './RunTimer';
import { makeBasicAttack } from './abilities/basicAttack';
import { makeBuffDash } from './abilities/buffDash';
import { makeDashSlam } from './abilities/dashSlam';
import { makeGroundEruption } from './abilities/groundEruption';
import { makeNova } from './abilities/nova';
import { makeUltimate } from './abilities/ultimate';
import { HUD } from '../ui/HUD';
import { LevelUpOverlay } from '../ui/LevelUpOverlay';
import { PauseMenu } from '../ui/PauseMenu';
import { StartScreen } from '../ui/StartScreen';
import { startMusic } from './Music';

export class Game {
  private worldContainer: Container;
  private groundLayer: Container;
  private entityLayer: Container;
  private player: Player;
  private stats: PlayerStats;
  private moveIndicator: MoveIndicator;
  private abilities: AbilitySystem;
  private hud: HUD;
  private enemyManager: EnemyManager;
  private chunkManager: ChunkManager;
  private projectiles: ProjectileManager;
  private runTimer: RunTimer;
  private levelUpOverlay: LevelUpOverlay;
  private pauseMenu: PauseMenu;
  private input: InputManager;
  private boss: Boss | null = null;
  private gameOver = false;
  private overlayOpen = false;
  private started = false;

  // Screen shake state
  private shakeAmt = 0;
  private shakeT = 0;

  constructor(private app: Application) {
    // Scene graph
    this.worldContainer = new Container({ isRenderGroup: true });
    this.groundLayer = new Container();
    this.entityLayer = new Container({ sortableChildren: true });
    this.worldContainer.addChild(this.groundLayer, this.entityLayer);
    app.stage.addChild(this.worldContainer);

    this.stats = new PlayerStats();

    const startCol = MAP_COLS / 2;
    const startRow = MAP_ROWS / 2;
    this.player = new Player(startCol, startRow, this.stats);
    this.entityLayer.addChild(this.player.view);

    this.moveIndicator = new MoveIndicator();
    this.entityLayer.addChild(this.moveIndicator.view);

    this.enemyManager = new EnemyManager(this.entityLayer, app.screen.width, app.screen.height);
    this.projectiles = new ProjectileManager(this.entityLayer);
    this.chunkManager = new ChunkManager(this.groundLayer);

    this.enemyManager.onHit = (wx, wy, amt, isDeath, isCrit) => this.projectiles.showDamageNumber(wx, wy, amt, isDeath, isCrit);

    this.abilities = new AbilitySystem();
    this.registerAbilities();

    this.hud = new HUD();
    app.stage.addChild(this.hud.view);
    this.hud.layout(app.screen.width, app.screen.height);
    this.abilities.onFired.push(slot => this.hud.flashSlot(slot));

    this.levelUpOverlay = new LevelUpOverlay(app, this.stats, () => this.closeOverlay());
    this.pauseMenu = new PauseMenu(app);

    this.stats.onLevelUp = () => this.openLevelUp();
    this.stats.onDeath   = () => this.handleDeath();

    this.runTimer = new RunTimer(() => this.spawnBoss());

    this.input = new InputManager(app, this.player, this.abilities, this.worldContainer);
    this.input.onTargetChanged = (col, row) => this.moveIndicator.show(col, row);
    this.input.onPointerLockLost = () => this.openPause();
    app.stage.addChild(this.input.cursorView);

    // Start screen — pause input until dismissed
    this.input.pause();
    new StartScreen(app, () => {
      this.started = true;
      this.input.resume();
      startMusic();
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      } else if (e.key === 'Escape' && this.pauseMenu.isOpen) {
        this.togglePause();
      }
    });

    this.followPlayer();

    app.ticker.add(ticker => {
      if (!this.started || this.gameOver || this.overlayOpen) return;

      if (this.shakeT > 0) this.shakeT -= ticker.deltaMS;

      this.input.tick();
      this.player.update(ticker.deltaMS);
      this.chunkManager.update(this.player.worldX, this.player.worldY);
      this.enemyManager.update(ticker.deltaMS, this.player);
      this.boss?.update(ticker.deltaMS, this.player);
      this.projectiles.update(ticker.deltaMS, this.enemyManager);
      this.abilities.tick(ticker.deltaMS, 0, this.stats.attackSpeed);
      this.runTimer.update(ticker.deltaMS);
      this.followPlayer();
      this.moveIndicator.update(ticker.deltaMS);
      this.hud.update(ticker.deltaMS, this.stats, this.runTimer, this.abilities);

      if (this.boss?.isDead) {
        this.entityLayer.removeChild(this.boss.view);
        this.boss.view.destroy();
        this.boss = null;
        this.hud.showVictory();
        this.gameOver = true;
      }
    });
  }

  private shake(amount: number, durationMs: number): void {
    this.shakeAmt = amount;
    this.shakeT = durationMs;
  }

  private openLevelUp(): void {
    this.overlayOpen = true;
    this.input.pause();
    this.levelUpOverlay.show();
  }

  private openPause(): void {
    if (this.gameOver || this.levelUpOverlay.isOpen) return;
    this.overlayOpen = true;
    this.input.pause();
    this.pauseMenu.show(this.stats);
  }

  private togglePause(): void {
    if (this.gameOver) return;
    if (this.pauseMenu.isOpen) {
      this.pauseMenu.hide();
      this.closeOverlay();
    } else {
      this.openPause();
    }
  }

  private closeOverlay(): void {
    this.overlayOpen = false;
    this.input.resume();
  }

  private registerAbilities(): void {
    const shake = (amt: number, dur: number) => this.shake(amt, dur);
    this.abilities.setAbility(SLOT_Q,   makeBasicAttack(this.player, this.stats, this.projectiles, this.enemyManager));
    this.abilities.setAbility(SLOT_LMB, makeNova(this.player, this.stats, this.enemyManager, this.projectiles, shake));
    this.abilities.setAbility(SLOT_RMB, makeDashSlam(this.player, this.stats, this.enemyManager, this.projectiles, shake));
    this.abilities.setAbility(SLOT_W,   makeGroundEruption(this.stats, this.enemyManager, this.projectiles, shake));
    this.abilities.setAbility(SLOT_E,   makeBuffDash(this.player, this.stats, this.projectiles));
    this.abilities.setAbility(SLOT_R,   makeUltimate(this.app, this.player, this.stats, this.enemyManager, this.projectiles, shake));
  }

  private spawnBoss(): void {
    const bx = this.player.worldX + 8;
    const by = this.player.worldY;
    this.boss = new Boss(bx, by, this.stats.level, () => {
      this.stats.addXp(this.stats.xpToNext * 10);
    });
    this.entityLayer.addChild(this.boss.view);
  }

  private handleDeath(): void {
    this.gameOver = true;
    this.hud.showDeath();
  }

  private followPlayer(): void {
    const { x, y } = worldToScreen(this.player.worldX, this.player.worldY);
    let ox = 0, oy = 0;
    if (this.shakeT > 0) {
      const s = this.shakeAmt * Math.min(1, this.shakeT / 150);
      ox = (Math.random() - 0.5) * s * 2;
      oy = (Math.random() - 0.5) * s;
    }
    this.worldContainer.x = this.app.screen.width / 2 - x + ox;
    this.worldContainer.y = this.app.screen.height / 2 - y + oy;
  }
}
