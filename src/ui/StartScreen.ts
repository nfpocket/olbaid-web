import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

const CONTROLS: [string, string][] = [
  ['LMB',        'Move to cursor'],
  ['Q',          'Bouncing Orb — chains 3×, splits on kill'],
  ['SHIFT+LMB',  'Nova — ring AoE burst'],
  ['RMB',        'Leap Slam — 10-tile leap + shockwave'],
  ['W',          'Ground Eruption — delayed AoE at cursor'],
  ['E',          'Dash — short dash + 2s speed boost'],
  ['R',          'Ultimate — hits every enemy on screen'],
  ['P / ESC',    'Pause / Stats'],
];

export class StartScreen {
  private view: Container;
  private blinkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(app: Application, onStart: () => void) {
    this.view = new Container();
    this.view.zIndex = 100000;
    app.stage.addChild(this.view);

    const W = app.screen.width;
    const H = app.screen.height;
    const cx = W / 2;

    // Background
    this.view.addChild(
      new Graphics().rect(0, 0, W, H).fill({ color: 0x080814 }),
    );

    // Subtle grid pattern
    const grid = new Graphics();
    for (let gx = 0; gx < W; gx += 60) {
      grid.moveTo(gx, 0).lineTo(gx, H).stroke({ color: 0x111128, width: 1 });
    }
    for (let gy = 0; gy < H; gy += 60) {
      grid.moveTo(0, gy).lineTo(W, gy).stroke({ color: 0x111128, width: 1 });
    }
    this.view.addChild(grid);

    // Measure and lay out content as a single block, vertically centered
    const block = new Container();
    this.view.addChild(block);

    let y = 0;

    // Title
    const title = new Text({
      text: 'OLBAID',
      style: new TextStyle({
        fill: 0xffd700, fontSize: 68, fontFamily: 'monospace',
        fontWeight: 'bold', letterSpacing: 14,
        dropShadow: { color: 0xffd700, distance: 0, blur: 24, alpha: 0.6 },
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(0, y);
    block.addChild(title);
    y += title.height + 10;

    // Subtitle
    const sub = new Text({
      text: 'A Diablo-inspired roguelite',
      style: new TextStyle({ fill: 0x888899, fontSize: 15, fontFamily: 'monospace' }),
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(0, y);
    block.addChild(sub);
    y += sub.height + 18;

    // Tagline
    const tag = new Text({
      text: 'Kill enemies · Level up · Survive 5 min · Defeat the Boss',
      style: new TextStyle({ fill: 0x555566, fontSize: 12, fontFamily: 'monospace' }),
    });
    tag.anchor.set(0.5, 0);
    tag.position.set(0, y);
    block.addChild(tag);
    y += tag.height + 22;

    // Divider
    block.addChild(this.hLine(y, 240));
    y += 14;

    // Controls heading
    const ctrlHead = new Text({
      text: '— CONTROLS —',
      style: new TextStyle({ fill: 0xffd700, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    ctrlHead.anchor.set(0.5, 0);
    ctrlHead.position.set(0, y);
    block.addChild(ctrlHead);
    y += ctrlHead.height + 10;

    // Controls rows
    const COL_GAP = 110;
    for (const [key, desc] of CONTROLS) {
      const keyT = new Text({
        text: key,
        style: new TextStyle({ fill: 0x88aaff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      keyT.position.set(-COL_GAP - keyT.width / 2 - 20, y); // right-align key
      keyT.anchor.set(1, 0);
      keyT.position.set(-20, y);
      block.addChild(keyT);

      const descT = new Text({
        text: desc,
        style: new TextStyle({ fill: 0xbbbbcc, fontSize: 12, fontFamily: 'monospace' }),
      });
      descT.position.set(20, y);
      block.addChild(descT);
      y += 20;
    }

    y += 16;

    // Divider
    block.addChild(this.hLine(y, 240));
    y += 20;

    // Click to start
    const prompt = new Text({
      text: '▶  CLICK TO START  ◀',
      style: new TextStyle({
        fill: 0xffd700, fontSize: 19, fontFamily: 'monospace',
        fontWeight: 'bold', letterSpacing: 2,
      }),
    });
    prompt.anchor.set(0.5, 0);
    prompt.position.set(0, y);
    block.addChild(prompt);
    y += prompt.height + 10;

    const hint = new Text({
      text: 'or press any key',
      style: new TextStyle({ fill: 0x444455, fontSize: 11, fontFamily: 'monospace' }),
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(0, y);
    block.addChild(hint);
    y += hint.height;

    // Center the whole block
    block.position.set(cx, (H - y) / 2);

    // Blink the prompt
    let vis = true;
    this.blinkInterval = setInterval(() => {
      vis = !vis;
      prompt.alpha = vis ? 1.0 : 0.2;
    }, 550);

    // Dismiss on click or keydown
    const dismiss = () => {
      if (!this.view.parent) return; // already dismissed
      if (this.blinkInterval) { clearInterval(this.blinkInterval); this.blinkInterval = null; }
      this.view.destroy({ children: true });
      window.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', dismiss);
      onStart();
    };

    window.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', dismiss);
  }

  private hLine(y: number, halfW: number): Graphics {
    return new Graphics()
      .moveTo(-halfW, y).lineTo(halfW, y)
      .stroke({ color: 0x222244, width: 1 });
  }
}
