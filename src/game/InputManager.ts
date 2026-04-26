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

  onPointerLockLost?: () => void; // fired when user presses Escape to exit pointer lock

  private isLMBDown = false;
  private isShiftHeld = false;
  private mouseX: number;
  private mouseY: number;
  private prevButtons = 0;
  private locked = false;
  private disabled = false;

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

    if (this.isShiftHeld) {
      // SHIFT+LMB: fire basic attack toward cursor (cooldown-gated)
      this.abilities.fire(SLOT_LMB, col, row);
    } else {
      // LMB only: move
      this.player.setTarget(col, row);
      this.onTargetChanged?.(col, row);
    }
  }

  // Called by Game when an overlay (level-up, pause) opens.
  pause(): void {
    this.disabled = true;
    this.isLMBDown = false;
    this.prevButtons = 0;
    this.app.canvas.style.cursor = 'default';
    this.cursorView.visible = false;
    if (document.pointerLockElement === this.app.canvas) {
      document.exitPointerLock();
    }
  }

  resume(): void {
    this.disabled = false;
    this.app.canvas.style.cursor = 'none';
    this.cursorView.visible = true;
  }

  get cursorWorldPos(): { col: number; row: number } {
    return this.toWorld(this.mouseX, this.mouseY);
  }

  private buildCursor(): Container {
    const c = new Container();
    c.eventMode = 'none'; // never intercept pointer events
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

  private syncButtons(buttons: number): void {
    const newlyPressed = buttons & ~this.prevButtons;
    const released    = this.prevButtons & ~buttons;

    if (newlyPressed & 1) {
      this.isLMBDown = true;
      // Attack is handled in tick() when shift is held — no single-shot fire here.
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
    this.app.canvas.style.cursor = 'none';

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.locked) {
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
      if (!this.disabled) this.syncButtons(e.buttons);
    });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.disabled) return;
      if (!this.locked) {
        this.app.canvas.requestPointerLock();
      }
      this.syncButtons(e.buttons);
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (!this.disabled) this.syncButtons(e.buttons);
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.app.canvas;
      if (!this.locked) {
        this.prevButtons = 0;
        this.isLMBDown = false;
        if (!this.disabled) {
          // User pressed Escape to exit pointer lock — treat as pause request.
          this.disabled = true;
          this.app.canvas.style.cursor = 'default';
          this.cursorView.visible = false;
          this.onPointerLockLost?.();
        }
      }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private bindKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Shift') { this.isShiftHeld = true; return; }
      if (this.disabled) return;
      if (e.repeat) return;
      const slot = KEY_MAP[e.key.toLowerCase()];
      if (slot !== undefined) {
        e.preventDefault();
        const { col, row } = this.cursorWorldPos;
        this.abilities.fire(slot, col, row);
      }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'Shift') this.isShiftHeld = false;
    });
  }
}
