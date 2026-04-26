import { Application, Container, FederatedPointerEvent, Graphics, Text, TextStyle } from 'pixi.js';
import { getMusicVolume, setMusicVolume } from '../game/Music';
import { getVolume, setVolume } from '../game/Sound';
import { PlayerStats } from '../game/PlayerStats';

const PANEL_W = 720;
const PANEL_H = 480;
const PAD = 24;
const COL_W = PANEL_W / 2 - PAD * 1.5;
const HEADER_H = 62;   // title + divider
const FOOTER_H = 30;
const SCROLL_AREA_H = PANEL_H - HEADER_H - FOOTER_H - PAD;
const SCROLLBAR_W = 6;

const ABILITY_INFO = [
  { key: 'LMB',       name: 'Move',             cd: '—',    desc: 'Click to move to cursor position.' },
  { key: 'Q',         name: 'Bouncing Orb',     cd: '1s',   desc: 'Shoots a projectile that chains to 3 nearby enemies. Kills reset bounces and split the orb.' },
  { key: 'SHIFT+LMB', name: 'Nova',             cd: '4s',   desc: 'Ring of energy burst hitting all enemies within 5.5 tiles.' },
  { key: 'RMB',       name: 'Leap Slam',        cd: '2s',   desc: 'Leap up to 10 tiles toward cursor, crashing down with a shockwave (r=3).' },
  { key: 'W',         name: 'Ground Eruption',  cd: '8s',   desc: 'Targets cursor: brief warning, then spiky explosion (r=2.5).' },
  { key: 'E',         name: 'Dash',             cd: '1s',   desc: 'Short dash toward cursor + 2s double movement speed.' },
  { key: 'R',         name: 'Ultimate',         cd: '12s',  desc: 'Hits every enemy on screen simultaneously.' },
];

const HEAD  = new TextStyle({ fill: 0xffd700, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' });
const BODY  = new TextStyle({ fill: 0xcccccc, fontSize: 12, fontFamily: 'monospace' });
const KEY_S = new TextStyle({ fill: 0x88aaff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
const CD_S  = new TextStyle({ fill: 0xaaaaaa, fontSize: 11, fontFamily: 'monospace' });

export class PauseMenu {
  readonly view: Container;

  private scrollY = 0;
  private contentH = 0;
  private abilityContent: Container | null = null;
  private scrollThumb: Graphics | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private deathKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(private app: Application, private onRestart?: () => void) {
    this.view = new Container();
    this.view.visible = false;
    app.stage.eventMode = 'static';
    app.stage.addChild(this.view);
  }

  get isOpen(): boolean { return this.view.visible; }

  show(stats: PlayerStats): void {
    this.scrollY     = 0;
    this.view.removeChildren();
    this.abilityContent = null;
    this.scrollThumb    = null;

    // Dim background
    this.view.addChild(
      new Graphics()
        .rect(0, 0, this.app.screen.width, this.app.screen.height)
        .fill({ color: 0x000000, alpha: 0.7 }),
    );

    // Panel
    const px = (this.app.screen.width - PANEL_W) / 2;
    const py = (this.app.screen.height - PANEL_H) / 2;
    const panel = new Container();
    panel.position.set(px, py);
    this.view.addChild(panel);

    panel.addChild(
      new Graphics()
        .roundRect(0, 0, PANEL_W, PANEL_H, 10)
        .fill({ color: 0x0d0d1f })
        .stroke({ color: 0x3333aa, width: 2 }),
    );

    // Title
    const title = new Text({ text: '— PAUSED —', style: new TextStyle({ fill: 0xffd700, fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold' }) });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, PAD);
    panel.addChild(title);

    // Horizontal divider
    panel.addChild(
      new Graphics()
        .moveTo(PAD, HEADER_H - 4).lineTo(PANEL_W - PAD, HEADER_H - 4)
        .stroke({ color: 0x333366, width: 1 }),
    );

    // Vertical divider
    panel.addChild(
      new Graphics()
        .moveTo(PANEL_W / 2, HEADER_H).lineTo(PANEL_W / 2, PANEL_H - FOOTER_H)
        .stroke({ color: 0x333366, width: 1 }),
    );

    // Left column — Stats (no overflow, always fits)
    this.buildStats(panel, stats);

    // Right column — scrollable abilities
    this.buildAbilitiesScroll(panel);

    // Restart button
    const btnW = 140, btnH = 28;
    const btnX = PAD;
    const btnY = PANEL_H - FOOTER_H - btnH / 2 - 2;
    const btnBg = new Graphics()
      .roundRect(btnX, btnY - btnH / 2, btnW, btnH, 5)
      .fill({ color: 0x440000 })
      .stroke({ color: 0xaa2222, width: 1 });
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerover', () => { btnBg.tint = 0xff5555; });
    btnBg.on('pointerout',  () => { btnBg.tint = 0xffffff; });
    btnBg.on('pointerdown', () => {
      this.hide();
      if (this.onRestart) this.onRestart();
      else window.location.reload();
    });
    panel.addChild(btnBg);

    const btnLabel = new Text({
      text: '↺  RESTART',
      style: new TextStyle({ fill: 0xff6666, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(btnX + btnW / 2, btnY);
    btnLabel.eventMode = 'none';
    panel.addChild(btnLabel);

    // Footer
    const footer = new Text({
      text: 'P or ESC to resume',
      style: new TextStyle({ fill: 0x666688, fontSize: 12, fontFamily: 'monospace' }),
    });
    footer.anchor.set(1, 1);
    footer.position.set(PANEL_W - PAD, PANEL_H - 8);
    panel.addChild(footer);

    const sliderCy = PANEL_H - FOOTER_H / 2;
    this.buildSlider(panel, 'SFX', 230, sliderCy, getVolume,      setVolume);
    this.buildSlider(panel, 'MUS', 430, sliderCy, getMusicVolume, setMusicVolume);

    this.view.visible = true;
    this.bindScroll();
  }

  private buildSlider(
    panel: Container,
    label: string,
    trackX: number,
    cy: number,
    getter: () => number,
    setter: (v: number) => void,
  ): void {
    const TRACK_W = 110;
    const TRACK_H = 6;
    const THUMB_R = 7;
    const ty = cy - TRACK_H / 2;

    const lbl = new Text({ text: label, style: new TextStyle({ fill: 0x888899, fontSize: 11, fontFamily: 'monospace' }) });
    lbl.anchor.set(1, 0.5);
    lbl.position.set(trackX - 6, cy);
    panel.addChild(lbl);

    panel.addChild(new Graphics().rect(trackX, ty, TRACK_W, TRACK_H).fill({ color: 0x1a1a3a }).stroke({ color: 0x333366, width: 1 }));

    const fillGfx = new Graphics();
    panel.addChild(fillGfx);

    const thumb = new Graphics();
    panel.addChild(thumb);

    const draw = (v: number) => {
      fillGfx.clear().rect(trackX, ty, TRACK_W * v, TRACK_H).fill({ color: 0x5555cc });
      thumb.clear()
        .circle(0, 0, THUMB_R).fill({ color: 0x7777ee })
        .circle(0, 0, THUMB_R).stroke({ color: 0xaaaaff, width: 1.5 });
      thumb.position.set(trackX + TRACK_W * v, cy);
    };
    draw(getter());

    const hit = new Graphics()
      .rect(trackX - THUMB_R, ty - 10, TRACK_W + THUMB_R * 2, TRACK_H + 20)
      .fill({ color: 0, alpha: 0 });
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    panel.addChild(hit);

    let dragging = false;
    const apply = (e: FederatedPointerEvent) => {
      const local = panel.toLocal(e.global);
      const v = Math.max(0, Math.min(1, (local.x - trackX) / TRACK_W));
      setter(v);
      draw(v);
    };
    hit.on('pointerdown', (e) => { dragging = true; apply(e); });
    hit.on('pointermove', (e) => { if (dragging) apply(e); });
    hit.on('pointerup',        () => { dragging = false; });
    hit.on('pointerupoutside', () => { dragging = false; });
  }

  showDeath(stats: PlayerStats, elapsedMs: number): void {
    this.scrollY = 0;
    this.view.removeChildren();
    this.abilityContent = null;
    this.scrollThumb = null;

    this.view.addChild(
      new Graphics()
        .rect(0, 0, this.app.screen.width, this.app.screen.height)
        .fill({ color: 0x000000, alpha: 0.85 }),
    );

    const px = (this.app.screen.width - PANEL_W) / 2;
    const py = (this.app.screen.height - PANEL_H) / 2;
    const panel = new Container();
    panel.position.set(px, py);
    this.view.addChild(panel);

    panel.addChild(
      new Graphics()
        .roundRect(0, 0, PANEL_W, PANEL_H, 10)
        .fill({ color: 0x0d0d1f })
        .stroke({ color: 0xaa2222, width: 2 }),
    );

    const title = new Text({
      text: '— YOU DIED —',
      style: new TextStyle({ fill: 0xff3333, fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(PANEL_W / 2, PAD);
    panel.addChild(title);

    panel.addChild(
      new Graphics()
        .moveTo(PAD, HEADER_H - 4).lineTo(PANEL_W - PAD, HEADER_H - 4)
        .stroke({ color: 0x333366, width: 1 }),
    );
    panel.addChild(
      new Graphics()
        .moveTo(PANEL_W / 2, HEADER_H).lineTo(PANEL_W / 2, PANEL_H - FOOTER_H)
        .stroke({ color: 0x333366, width: 1 }),
    );

    this.buildStats(panel, stats);
    this.buildRunSummary(panel, stats, elapsedMs);

    // Restart button — centered in footer
    const btnW = 180, btnH = 28;
    const btnX = (PANEL_W - btnW) / 2;
    const btnY = PANEL_H - FOOTER_H / 2;
    const btnBg = new Graphics()
      .roundRect(btnX, btnY - btnH / 2, btnW, btnH, 5)
      .fill({ color: 0x1a1a00 })
      .stroke({ color: 0xaa8800, width: 1 });
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerover', () => { btnBg.tint = 0xffdd55; });
    btnBg.on('pointerout',  () => { btnBg.tint = 0xffffff; });
    btnBg.on('pointerdown', () => this.triggerRestart());
    panel.addChild(btnBg);

    const btnLabel = new Text({
      text: '↺  PLAY AGAIN  (R)',
      style: new TextStyle({ fill: 0xffcc00, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(PANEL_W / 2, btnY);
    btnLabel.eventMode = 'none';
    panel.addChild(btnLabel);

    this.view.visible = true;

    this.deathKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') this.triggerRestart();
    };
    document.addEventListener('keydown', this.deathKeyHandler);
  }

  private buildRunSummary(panel: Container, s: PlayerStats, elapsedMs: number): void {
    let y = HEADER_H + 4;
    const x = PANEL_W / 2 + PAD;

    const addLabel = (text: string) => {
      const t = new Text({ text, style: HEAD });
      t.position.set(x, y);
      panel.addChild(t);
      y += 22;
    };

    const addRow = (label: string, value: string) => {
      const lbl = new Text({ text: label, style: BODY });
      lbl.position.set(x, y);
      panel.addChild(lbl);
      const val = new Text({ text: value, style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace' }) });
      val.position.set(x + COL_W - 4, y);
      val.anchor.set(1, 0);
      panel.addChild(val);
      y += 19;
    };

    const secs = Math.floor(elapsedMs / 1000);
    const mm = Math.floor(secs / 60);
    const ss = secs % 60;

    addLabel('RUN SUMMARY');
    y += 2;
    addRow('Time Survived', `${mm}:${ss.toString().padStart(2, '0')}`);
    addRow('Level Reached', `${s.level}`);
    addRow('Total XP',      `${s.xp}`);
    addRow('Final HP',      `${Math.ceil(s.hp)} / ${s.maxHp}`);
  }

  private triggerRestart(): void {
    if (this.deathKeyHandler) {
      document.removeEventListener('keydown', this.deathKeyHandler);
      this.deathKeyHandler = null;
    }
    if (this.onRestart) this.onRestart();
    else window.location.reload();
  }

  hide(): void {
    this.view.visible = false;
    if (this.wheelHandler) {
      window.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  private buildStats(panel: Container, s: PlayerStats): void {
    let y = HEADER_H + 4;
    const x = PAD;
    const DESC_S = new TextStyle({ fill: 0x555577, fontSize: 10, fontFamily: 'monospace' });

    const addLabel = (text: string) => {
      const t = new Text({ text, style: HEAD });
      t.position.set(x, y);
      panel.addChild(t);
      y += 22;
    };

    const addRow = (label: string, value: string) => {
      const lbl = new Text({ text: label, style: BODY });
      lbl.position.set(x, y);
      panel.addChild(lbl);
      const val = new Text({ text: value, style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace' }) });
      val.position.set(x + COL_W - 4, y);
      val.anchor.set(1, 0);
      panel.addChild(val);
      y += 19;
    };

    const addAttr = (label: string, value: string, desc: string) => {
      addRow(label, value);
      const d = new Text({ text: desc, style: DESC_S });
      d.position.set(x + 2, y);
      panel.addChild(d);
      y += 15;
    };

    addLabel('PLAYER STATS');
    y += 2;
    addRow('Level',       `${s.level}`);
    addRow('Experience',  `${s.xp} / ${s.xpToNext}`);
    addRow('HP',          `${Math.ceil(s.hp)} / ${s.maxHp}`);
    y += 10;
    addLabel('ATTRIBUTES');
    y += 2;
    addAttr('Damage',
      `×${s.damage.toFixed(2)}`,
      'Multiplies all ability damage');
    addAttr('Resistance',
      `${Math.round(s.resistance * 100)}%`,
      'Blocks this fraction of incoming damage (max 75%)');
    addAttr('Atk Speed',
      `×${s.attackSpeed.toFixed(2)}`,
      'Speeds up ALL ability cooldowns equally');
    addAttr('Crit Chance',
      `${Math.round(s.critChance * 100)}%`,
      'Chance to deal a critical hit');
    addAttr('Crit Damage',
      `×${s.critDamage.toFixed(1)}`,
      'Damage multiplier on a critical hit');
  }

  // ── Scrollable abilities column ──────────────────────────────────────────────

  private buildAbilitiesScroll(panel: Container): void {
    const colX = PANEL_W / 2 + PAD;
    const colY = HEADER_H + 4;
    const viewW = PANEL_W / 2 - PAD * 2 - SCROLLBAR_W - 4;

    // Build content into a free container to measure its height
    const content = new Container();
    this.abilityContent = content;

    let y = 0;
    const head = new Text({ text: 'ABILITIES', style: HEAD });
    content.addChild(head);
    y += 24;

    for (const a of ABILITY_INFO) {
      const row1 = new Container();
      row1.position.set(0, y);

      const keyText = new Text({ text: a.key, style: KEY_S });
      row1.addChild(keyText);

      const cdText = new Text({ text: `CD: ${a.cd}`, style: CD_S });
      cdText.position.set(viewW, 0);
      cdText.anchor.set(1, 0);
      row1.addChild(cdText);

      content.addChild(row1);
      y += 16;

      const nameText = new Text({ text: a.name, style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }) });
      nameText.position.set(8, y);
      content.addChild(nameText);
      y += 15;

      const descText = new Text({
        text: a.desc,
        style: new TextStyle({ fill: 0x888888, fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: viewW - 8 }),
      });
      descText.position.set(8, y);
      content.addChild(descText);
      y += descText.height + 10;
    }

    this.contentH = y;

    // Clip mask
    const mask = new Graphics().rect(0, 0, viewW, SCROLL_AREA_H).fill({ color: 0xffffff });
    mask.position.set(colX, colY);

    const scrollContainer = new Container();
    scrollContainer.position.set(colX, colY);
    scrollContainer.addChild(content);
    scrollContainer.mask = mask;
    panel.addChild(mask);
    panel.addChild(scrollContainer);

    // Scrollbar track
    const trackX = colX + viewW + 6;
    panel.addChild(
      new Graphics()
        .rect(trackX, colY, SCROLLBAR_W, SCROLL_AREA_H)
        .fill({ color: 0x222244 }),
    );

    // Scrollbar thumb (redrawn on scroll)
    const thumb = new Graphics();
    thumb.position.set(trackX, colY);
    panel.addChild(thumb);
    this.scrollThumb = thumb;
    this.drawThumb();
  }

  private drawThumb(): void {
    if (!this.scrollThumb) return;
    const overflow = Math.max(0, this.contentH - SCROLL_AREA_H);
    const thumbH = overflow === 0
      ? SCROLL_AREA_H
      : Math.max(20, (SCROLL_AREA_H / this.contentH) * SCROLL_AREA_H);
    const thumbY = overflow === 0
      ? 0
      : (this.scrollY / overflow) * (SCROLL_AREA_H - thumbH);
    this.scrollThumb.clear()
      .rect(0, thumbY, SCROLLBAR_W, thumbH)
      .fill({ color: 0x5555aa });
  }

  private bindScroll(): void {
    const overflow = Math.max(0, this.contentH - SCROLL_AREA_H);
    if (overflow <= 0) return;

    this.wheelHandler = (e: WheelEvent) => {
      if (!this.view.visible) return;
      this.scrollY = Math.max(0, Math.min(overflow, this.scrollY + e.deltaY * 0.4));
      if (this.abilityContent) this.abilityContent.y = -this.scrollY;
      this.drawThumb();
    };
    window.addEventListener('wheel', this.wheelHandler, { passive: true });
  }
}
