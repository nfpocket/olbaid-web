import { Application, Container } from 'pixi.js';
import { MAP_COLS, MAP_ROWS } from '../constants';
import { worldToScreen } from './IsometricUtils';
import { AbilitySystem } from './AbilitySystem';
import { InputManager } from './InputManager';
import { MoveIndicator } from './MoveIndicator';
import { Player } from './Player';
import { World } from './World';
import { HUD } from '../ui/HUD';

export class Game {
  private worldContainer: Container;
  private world: World;
  private player: Player;
  private moveIndicator: MoveIndicator;
  private abilities: AbilitySystem;
  private hud: HUD;

  constructor(private app: Application) {
    // Scene graph
    this.worldContainer = new Container({ isRenderGroup: true });
    this.world = new World();
    this.worldContainer.addChild(this.world.groundLayer, this.world.entityLayer);
    app.stage.addChild(this.worldContainer);

    // Player starts at map centre
    this.player = new Player(MAP_COLS / 2, MAP_ROWS / 2);
    this.world.entityLayer.addChild(this.player.view);

    // Move indicator (below all entities)
    this.moveIndicator = new MoveIndicator();
    this.world.entityLayer.addChild(this.moveIndicator.view);

    // Abilities
    this.abilities = new AbilitySystem();

    // HUD
    this.hud = new HUD();
    app.stage.addChild(this.hud.view);
    this.hud.layout(app.screen.width, app.screen.height);
    this.abilities.onFired.push(slot => this.hud.flashSlot(slot));

    // Input — cursor sprite sits above everything else on the stage
    const input = new InputManager(app, this.player, this.abilities, this.worldContainer);
    input.onTargetChanged = (col, row) => this.moveIndicator.show(col, row);
    app.stage.addChild(input.cursorView);

    // Set initial camera position before first frame
    this.followPlayer();

    // Game loop — input.tick() must run first so the player has a fresh target
    // before update() advances their position this frame.
    app.ticker.add(ticker => {
      input.tick();
      this.player.update(ticker.deltaMS);
      this.followPlayer();
      this.moveIndicator.update(ticker.deltaMS);
      this.hud.update(ticker.deltaMS);
    });
  }

  private followPlayer(): void {
    const { x, y } = worldToScreen(this.player.worldX, this.player.worldY);
    this.worldContainer.x = this.app.screen.width / 2 - x;
    this.worldContainer.y = this.app.screen.height / 2 - y;
  }
}
