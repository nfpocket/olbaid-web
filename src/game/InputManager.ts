import { Application, Container, Graphics } from 'pixi.js';
import { AbilitySystem, SLOT_E, SLOT_LMB, SLOT_Q, SLOT_R, SLOT_RMB, SLOT_W } from './AbilitySystem';
import { screenToWorld } from './IsometricUtils';
import { Player } from './Player';

const KEY_MAP: Record<string, number> = {
  q: SLOT_Q,
  w: SLOT_W,
  e: SLOT_E,
  r: SLOT_R,
};

export class InputManager {
  onTargetChanged?: (col: number, row: number) => void;
  readonly cursorView: Container;

  private isLMBDown = false;
  private mouseX: number;
  private mouseY: number;
  private prevButtons = 0;
  private locked = false;

  constructor(
    private app: Application,
    private player: Player,
    private abilities: AbilitySystem,
    private worldContainer: Container,
  ) {
    this.mouseX = app.screen.width / 2;
    this.mouseY = app.screen.height / 2;
    this.cursorView = this.buildCursor();
    this.bindPointer();
    this.bindKeyboard();
  }

  tick(): void {
    if (!this.isLMBDown) return;
    const { col, row } = this.toWorld(this.mouseX, this.mouseY);
    this.player.setTarget(col, row);
    this.onTargetChanged?.(col, row);
  }

  private buildCursor(): Container {
    const c = new Container();
    const g = new Graphics();
    const outer = 10, gap = 3;
    g.moveTo(gap, 0).lineTo(outer, 0).stroke({ color: 0xffffff, width: 1.5 });
    g.moveTo(-gap, 0).lineTo(-outer, 0).stroke({ color: 0xffffff, width: 1.5 });
    g.moveTo(0, gap).lineTo(0, outer).stroke({ color: 0xffffff, width: 1.5 });
    g.moveTo(0, -gap).lineTo(0, -outer).stroke({ color: 0xffffff, width: 1.5 });
    g.circle(0, 0, 1.5).fill({ color: 0xffffff });
    c.addChild(g);
    c.position.set(this.mouseX, this.mouseY);
    return c;
  }

  private clientToScreen(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.app.screen.width / rect.width),
      y: (clientY - rect.top) * (this.app.screen.height / rect.height),
    };
  }

  private toWorld(screenX: number, screenY: number) {
    return screenToWorld(screenX - this.worldContainer.x, screenY - this.worldContainer.y);
  }

  // Diffs the current buttons bitmask against the previous one to detect presses
  // and releases regardless of which event delivered the bitmask.
  private syncButtons(buttons: number): void {
    const newlyPressed = buttons & ~this.prevButtons;
    const released    = this.prevButtons & ~buttons;

    if (newlyPressed & 1) {
      this.isLMBDown = true;
      const { col, row } = this.toWorld(this.mouseX, this.mouseY);
      this.abilities.fire(SLOT_LMB, col, row);
    }
    if (newlyPressed & 2) {
      const { col, row } = this.toWorld(this.mouseX, this.mouseY);
      this.abilities.fire(SLOT_RMB, col, row);
    }
    if (released & 1) {
      this.isLMBDown = false;
    }

    this.prevButtons = buttons;
  }

  private bindPointer(): void {
    // Hide the OS cursor — we render our own so it remains visible and
    // correctly positioned whether or not pointer lock is active.
    this.app.canvas.style.cursor = 'none';

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.locked) {
        // Pointer lock: OS cursor is frozen, use movement deltas to track position.
        // Scale by the same ratio used in clientToScreen so the cursor speed
        // matches across any DPR or CSS-scaling setups.
        const rect = this.app.canvas.getBoundingClientRect();
        const sx = this.app.screen.width  / rect.width;
        const sy = this.app.screen.height / rect.height;
        this.mouseX = Math.max(0, Math.min(this.app.screen.width,  this.mouseX + e.movementX * sx));
        this.mouseY = Math.max(0, Math.min(this.app.screen.height, this.mouseY + e.movementY * sy));
      } else {
        const pos = this.clientToScreen(e.clientX, e.clientY);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
      }
      this.cursorView.position.set(this.mouseX, this.mouseY);
      this.syncButtons(e.buttons);
    });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      // First click acquires pointer lock. Once locked, the browser delivers
      // mousedown for every button independently — bypassing Windows' drag-cancel
      // that swallows RMB mousedown while LMB is held.
      if (!this.locked) {
        this.app.canvas.requestPointerLock();
      }
      this.syncButtons(e.buttons);
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      this.syncButtons(e.buttons);
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.app.canvas;
      if (!this.locked) {
        // Reset bitmask so the next absolute-position mousemove doesn't
        // produce false "newly pressed" deltas.
        this.prevButtons = 0;
        this.isLMBDown = false;
      }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private bindKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      const slot = KEY_MAP[e.key.toLowerCase()];
      if (slot !== undefined) {
        e.preventDefault();
        this.abilities.fire(slot);
      }
    });
  }
}
