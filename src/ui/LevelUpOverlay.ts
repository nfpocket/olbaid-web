import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { PlayerStats } from '../game/PlayerStats';

interface Upgrade {
  name: string;
  desc: string;
  apply: (s: PlayerStats) => void;
}

const POOL: Upgrade[] = [
  { name: 'Strength I',  desc: '+20% damage',           apply: s => { s.damage *= 1.2; } },
  { name: 'Strength II', desc: '+40% damage',           apply: s => { s.damage *= 1.4; } },
  { name: 'Iron Skin I', desc: '+15% resistance',       apply: s => { s.resistance = Math.min(0.75, s.resistance + 0.15); } },
  { name: 'Iron Skin II',desc: '+30% resistance',       apply: s => { s.resistance = Math.min(0.75, s.resistance + 0.30); } },
  { name: 'Vitality I',  desc: '+50 max HP',            apply: s => { s.maxHp += 50; s.hp = Math.min(s.hp + 50, s.maxHp); } },
  { name: 'Vitality II', desc: '+100 max HP',           apply: s => { s.maxHp += 100; s.hp = Math.min(s.hp + 100, s.maxHp); } },
  { name: 'Swiftness I',  desc: '+20% attack speed\n(all abilities)',  apply: s => { s.attackSpeed *= 1.2; } },
  { name: 'Swiftness II', desc: '+40% attack speed\n(all abilities)',  apply: s => { s.attackSpeed *= 1.4; } },
  { name: 'Precision I',  desc: '+10% crit chance',                   apply: s => { s.critChance = Math.min(0.8, s.critChance + 0.10); } },
  { name: 'Precision II', desc: '+20% crit chance',                   apply: s => { s.critChance = Math.min(0.8, s.critChance + 0.20); } },
  { name: 'Brutality I',  desc: '+0.5× crit damage',                  apply: s => { s.critDamage += 0.5; } },
  { name: 'Brutality II', desc: '+1.0× crit damage',                  apply: s => { s.critDamage += 1.0; } },
];

const CARD_W = 200;
const CARD_H = 130;
const CARD_GAP = 24;

export class LevelUpOverlay {
  readonly view: Container;
  private cards: Container[] = [];

  get isOpen(): boolean { return this.view.visible; }

  constructor(
    private app: Application,
    private stats: PlayerStats,
    private onClose: () => void,
  ) {
    this.view = new Container();
    this.view.visible = false;
    app.stage.eventMode = 'static';
    app.stage.addChild(this.view);
  }

  show(): void {
    this.view.removeChildren();
    this.cards = [];

    // Dim background
    const bg = new Graphics();
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height)
      .fill({ color: 0x000000, alpha: 0.65 });
    this.view.addChild(bg);

    // Title
    const title = new Text({
      text: 'LEVEL UP — Choose an upgrade',
      style: new TextStyle({ fill: 0xffd700, fontSize: 22, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - CARD_H - 50);
    this.view.addChild(title);

    // Pick 3 random upgrades
    const shuffled = [...POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const totalW = 3 * CARD_W + 2 * CARD_GAP;
    const startX = (this.app.screen.width - totalW) / 2;
    const startY = this.app.screen.height / 2 - CARD_H / 2;

    shuffled.forEach((upgrade, i) => {
      const card = this.buildCard(upgrade, startX + i * (CARD_W + CARD_GAP), startY);
      this.view.addChild(card);
      this.cards.push(card);
    });

    this.view.visible = true;
  }

  private buildCard(upgrade: Upgrade, x: number, y: number): Container {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const bg = new Graphics();
    bg.roundRect(0, 0, CARD_W, CARD_H, 8)
      .fill({ color: 0x1a1a3a })
      .stroke({ color: 0x5555aa, width: 2 });
    c.addChild(bg);

    const name = new Text({
      text: upgrade.name,
      style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', wordWrap: true, wordWrapWidth: CARD_W - 20 }),
    });
    name.position.set(10, 14);
    c.addChild(name);

    const desc = new Text({
      text: upgrade.desc,
      style: new TextStyle({ fill: 0xaaaacc, fontSize: 13, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: CARD_W - 20 }),
    });
    desc.position.set(10, 50);
    c.addChild(desc);

    c.on('pointerover', () => { bg.clear().roundRect(0,0,CARD_W,CARD_H,8).fill({color:0x2a2a5a}).stroke({color:0xaaaaff,width:2}); });
    c.on('pointerout',  () => { bg.clear().roundRect(0,0,CARD_W,CARD_H,8).fill({color:0x1a1a3a}).stroke({color:0x5555aa,width:2}); });
    c.on('pointerdown', () => {
      upgrade.apply(this.stats);
      this.close();
    });

    return c;
  }

  private close(): void {
    this.view.visible = false;
    this.onClose();
  }
}
