import { ARENA_HALF_SIZE } from "@config/arena";
import {
  Color,
  OrthographicCamera,
  Scene,
  Vector2,
  WebGLRenderer
} from "three";

export interface RenderContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  viewport: Vector2;
}

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color("#020617"));

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 25, 0);
  camera.lookAt(0, 0, 0);

  const viewport = new Vector2();
  resizeRenderer(renderer, camera, viewport);

  return {
    renderer,
    scene,
    camera,
    viewport
  };
}

export function resizeRenderer(
  renderer: WebGLRenderer,
  camera: OrthographicCamera,
  viewport: Vector2
): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height, false);
  viewport.set(width, height);

  const aspect = width / height || 1;
  const baseHalfSize = ARENA_HALF_SIZE;

  let halfWidth = baseHalfSize;
  let halfHeight = baseHalfSize;

  if (aspect >= 1) {
    halfWidth = baseHalfSize * aspect;
  } else {
    halfHeight = baseHalfSize / aspect;
  }

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
