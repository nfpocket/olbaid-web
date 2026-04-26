import { Application } from 'pixi.js';
import { Game } from './game/Game';

const app = new Application();

await app.init({
  resizeTo: window,
  background: '#1a1a2e',
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio,
});

document.body.appendChild(app.canvas);

new Game(app);
