import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SLOT_COUNT } from '../game/AbilitySystem';

const LABELS = ['Q', 'W', 'E', 'R', 'LMB', 'RMB'];
const BOX_W = 60;
const BOX_H = 60;
const GAP = 8;
const PAD = 12;

export class HUD {
  readonly view: Container;
  private slotBgs: Graphics[] = [];
  private flashTimers: number[] = new Array(SLOT_COUNT).fill(0);

  constructor() {
    this.view = new Container();
    this.buildAbilityBar();
  }

  private buildAbilityBar(): void {
    const totalW = SLOT_COUNT * BOX_W + (SLOT_COUNT - 1) * GAP + PAD * 2;

    this.view.addChild(
      new Graphics()
        .roundRect(0, 0, totalW, BOX_H + PAD * 2, 8)
        .fill({ color: 0x000000, alpha: 0.6 }),
    );

    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = PAD + i * (BOX_W + GAP);

      const slotBg = new Graphics();
      slotBg.position.set(x, PAD);
      this.slotBgs.push(slotBg);
      this.view.addChild(slotBg);
      this.drawSlot(i, false);

      const label = new Text({
        text: LABELS[i],
        style: new TextStyle({
          fill: 0xaaaaaa,
          fontSize: 13,
          fontFamily: 'monospace',
          fontWeight: 'bold',
        }),
      });
      label.anchor.set(0.5);
      label.position.set(x + BOX_W / 2, PAD + BOX_H / 2);
      this.view.addChild(label);
    }
  }

  private drawSlot(i: number, active: boolean): void {
    const g = this.slotBgs[i];
    g.clear();
    if (active) {
      g.roundRect(0, 0, BOX_W, BOX_H, 4)
        .fill({ color: 0xffd700 })
        .stroke({ color: 0xffffff, width: 1.5 });
    } else {
      g.roundRect(0, 0, BOX_W, BOX_H, 4)
        .fill({ color: 0x333333 })
        .stroke({ color: 0x666666, width: 1 });
    }
  }

  flashSlot(slot: number): void {
    if (this.flashTimers[slot] === 0) this.drawSlot(slot, true);
    this.flashTimers[slot] = 200;
  }

  update(deltaMS: number): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (this.flashTimers[i] > 0) {
        this.flashTimers[i] -= deltaMS;
        if (this.flashTimers[i] <= 0) {
          this.flashTimers[i] = 0;
          this.drawSlot(i, false);
        }
      }
    }
  }

  layout(screenW: number, screenH: number): void {
    const totalW = SLOT_COUNT * BOX_W + (SLOT_COUNT - 1) * GAP + PAD * 2;
    this.view.position.set(
      (screenW - totalW) / 2,
      screenH - BOX_H - PAD * 2 - 20,
    );
  }
}
