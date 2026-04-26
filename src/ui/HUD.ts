import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { AbilitySystem, SLOT_COUNT } from '../game/AbilitySystem';
import { PlayerStats } from '../game/PlayerStats';
import { RunTimer } from '../game/RunTimer';

const LABELS = ['Q', 'W', 'E', 'R', 'LMB', 'RMB'];
const BOX_W = 60;
const BOX_H = 60;
const GAP = 8;
const PAD = 12;
const BAR_W = 200;
const BAR_H = 14;

export class HUD {
  readonly view: Container;
  private slotBgs: Graphics[] = [];
  private cooldownOverlays: Graphics[] = [];
  private flashTimers: number[] = new Array(SLOT_COUNT).fill(0);

  private hpBarFill!: Graphics;
  private xpBarFill!: Graphics;
  private hpLabel!: Text;
  private xpLabel!: Text;
  private timerText!: Text;
  private victoryOverlay!: Container;

  constructor() {
    this.view = new Container();
    this.buildAbilityBar();
    this.buildStatusBars();
    this.buildTimerText();
    this.buildVictoryOverlay();
  }

  // ── Ability bar ────────────────────────────────────────────────────────────

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

      // Cooldown overlay (dark rect drawn over slot)
      const cd = new Graphics();
      cd.position.set(x, PAD);
      cd.alpha = 0;
      this.cooldownOverlays.push(cd);
      this.view.addChild(cd);

      const label = new Text({
        text: LABELS[i],
        style: new TextStyle({ fill: 0xaaaaaa, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }),
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
      g.roundRect(0, 0, BOX_W, BOX_H, 4).fill({ color: 0xffd700 }).stroke({ color: 0xffffff, width: 1.5 });
    } else {
      g.roundRect(0, 0, BOX_W, BOX_H, 4).fill({ color: 0x333333 }).stroke({ color: 0x666666, width: 1 });
    }
  }

  flashSlot(slot: number): void {
    if (this.flashTimers[slot] === 0) this.drawSlot(slot, true);
    this.flashTimers[slot] = 200;
  }

  // ── Status bars ─────────────────────────────────────────────────────────────

  private buildStatusBars(): void {
    const bars = new Container();
    bars.position.set(0, -(BAR_H * 2 + 8 + PAD));
    this.view.addChild(bars);

    // HP bar background
    bars.addChild(new Graphics().rect(0, 0, BAR_W, BAR_H).fill({ color: 0x440000 }));
    this.hpBarFill = new Graphics();
    bars.addChild(this.hpBarFill);
    bars.addChild(new Graphics().rect(0, 0, BAR_W, BAR_H).stroke({ color: 0xffffff, width: 1 }));

    this.hpLabel = new Text({
      text: 'HP 100/100',
      style: new TextStyle({ fill: 0xffffff, fontSize: 11, fontFamily: 'monospace' }),
    });
    this.hpLabel.position.set(4, 1);
    bars.addChild(this.hpLabel);

    // XP bar background
    bars.addChild(new Graphics().rect(0, BAR_H + 4, BAR_W, BAR_H).fill({ color: 0x443300 }));
    this.xpBarFill = new Graphics();
    bars.addChild(this.xpBarFill);
    bars.addChild(new Graphics().rect(0, BAR_H + 4, BAR_W, BAR_H).stroke({ color: 0xffffff, width: 1 }));

    this.xpLabel = new Text({
      text: 'LV 1',
      style: new TextStyle({ fill: 0xffd700, fontSize: 11, fontFamily: 'monospace' }),
    });
    this.xpLabel.position.set(4, BAR_H + 5);
    bars.addChild(this.xpLabel);
  }

  private buildTimerText(): void {
    this.timerText = new Text({
      text: '5:00',
      style: new TextStyle({ fill: 0xffffff, fontSize: 24, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    this.timerText.anchor.set(0.5, 0);
  }

  private buildVictoryOverlay(): void {
    this.victoryOverlay = new Container();
    this.victoryOverlay.visible = false;
    const bg = new Graphics().rect(0, 0, 400, 120).fill({ color: 0x000000, alpha: 0.8 });
    this.victoryOverlay.addChild(bg);
    const t = new Text({
      text: 'VICTORY!\nPress F5 to restart',
      style: new TextStyle({ fill: 0xffd700, fontSize: 28, fontFamily: 'monospace', fontWeight: 'bold', align: 'center' }),
    });
    t.anchor.set(0.5);
    t.position.set(200, 60);
    this.victoryOverlay.addChild(t);
  }

  showVictory(): void {
    this.victoryOverlay.visible = true;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(deltaMS: number, stats: PlayerStats, timer: RunTimer, abilities: AbilitySystem): void {
    // Flash timers
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (this.flashTimers[i] > 0) {
        this.flashTimers[i] -= deltaMS;
        if (this.flashTimers[i] <= 0) {
          this.flashTimers[i] = 0;
          this.drawSlot(i, false);
        }
      }

      // Cooldown overlays
      const frac = abilities.getCooldownFraction(i);
      const cd = this.cooldownOverlays[i];
      if (frac > 0) {
        cd.clear();
        const h = BOX_H * frac;
        cd.rect(0, BOX_H - h, BOX_W, h).fill({ color: 0x000000, alpha: 0.6 });
        cd.alpha = 1;
      } else {
        cd.alpha = 0;
      }
    }

    // HP bar
    const hpFrac = Math.max(0, stats.hp / stats.maxHp);
    this.hpBarFill.clear();
    this.hpBarFill.rect(0, 0, BAR_W * hpFrac, BAR_H).fill({ color: 0xdd2222 });
    this.hpLabel.text = `HP ${Math.ceil(stats.hp)}/${stats.maxHp}`;

    // XP bar
    const xpFrac = Math.min(1, stats.xp / stats.xpToNext);
    this.xpBarFill.clear();
    this.xpBarFill.rect(0, BAR_H + 4, BAR_W * xpFrac, BAR_H).fill({ color: 0xddaa00 });
    this.xpLabel.text = `LV ${stats.level}`;

    // Timer
    this.timerText.text = timer.format();
    if (timer.remaining <= 30) this.timerText.style.fill = 0xff4444;
  }

  layout(screenW: number, screenH: number): void {
    const totalW = SLOT_COUNT * BOX_W + (SLOT_COUNT - 1) * GAP + PAD * 2;
    this.view.position.set(
      (screenW - totalW) / 2,
      screenH - BOX_H - PAD * 2 - 20,
    );

    this.timerText.position.set(screenW / 2, 16);
    if (!this.timerText.parent) this.view.parent?.addChild(this.timerText);

    this.victoryOverlay.position.set((screenW - 400) / 2, (screenH - 120) / 2);
    if (!this.victoryOverlay.parent) this.view.parent?.addChild(this.victoryOverlay);
  }
}
