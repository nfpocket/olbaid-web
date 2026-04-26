# Olbaid

A Diablo-inspired isometric roguelite built with PixiJS v8 and TypeScript.

**Play it:** https://nfpocket.github.io/olbaid-web/

---

## Gameplay

Survive endless enemy waves for 5 minutes, then defeat the boss. Kill enemies to gain XP, level up, and choose upgrades that stack into a build.

### Controls

| Input | Action |
|---|---|
| LMB | Move to cursor |
| Q | Bouncing Orb — chains to nearby enemies; kills reset bounces, crits split the orb |
| Shift+LMB | Nova — ring burst hitting all enemies within 5.5 tiles |
| RMB | Leap Slam — dash up to 10 tiles, shockwave on landing |
| W | Ground Eruption — delayed AoE at cursor position |
| E | Dash — short dash + 2s double movement speed |
| R | Ultimate — hits every enemy on screen |
| P / Esc | Pause |

### Upgrades (on level-up, pick 1 of 3)

| Upgrade | Effect |
|---|---|
| Strength I / II | +20% / +40% damage |
| Iron Skin I / II | +15% / +30% damage resistance |
| Vitality I / II | +50 / +100 max HP (heals to new max) |
| Swiftness I / II | +20% / +40% attack speed (all cooldowns) |
| Precision I / II | +10% / +20% crit chance |
| Brutality I / II | +0.5× / +1.0× crit damage |

---

## Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
```

**Stack:** PixiJS v8 · TypeScript · Vite

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the Actions workflow in `.github/workflows/deploy.yml`. No manual steps needed after the initial setup.
