import "./styles/global.css";
import { ShatterGame } from "@app/core/game";
import { registerHotDispose } from "@app/core/hmr";

function bootstrap() {
  const mount = document.getElementById("app");
  if (!mount) {
    throw new Error("Failed to find app mount element");
  }

  const canvas = document.createElement("canvas");
  mount.style.position = "relative";
  mount.appendChild(canvas);

  const game = new ShatterGame(canvas, mount);
  game.start();

  registerHotDispose(import.meta.hot, () => {
    game.dispose();
    mount.removeChild(canvas);
  });
}

bootstrap();
