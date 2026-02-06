import { ClientGame } from './game.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const game = new ClientGame(canvas);
game.start();
