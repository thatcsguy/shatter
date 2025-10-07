import { Vector3 } from "three";
import type { OrthographicCamera, Vector2 } from "three";

interface DamageNumberInstance {
  element: HTMLDivElement;
  basePosition: Vector3;
  offset: Vector3;
  elapsed: number;
  lifetime: number;
  amount: number;
}

const DEFAULT_LIFETIME = 0.9;
const VERTICAL_SCREEN_LIFT = 36;

export class DamageNumberManager {
  private readonly container: HTMLDivElement;
  private readonly numbers: DamageNumberInstance[] = [];
  private readonly scratch = new Vector3();

  constructor(
    private readonly host: HTMLElement,
    private readonly camera: OrthographicCamera,
    private readonly viewport: Vector2
  ) {
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.left = "0";
    this.container.style.top = "0";
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.pointerEvents = "none";
    this.container.style.zIndex = "90";
    this.container.style.overflow = "hidden";
    this.host.appendChild(this.container);
  }

  spawn(amount: number, worldPosition: Vector3) {
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.transform = "translate(-50%, -50%)";
    element.style.fontWeight = "700";
    element.style.fontSize = "18px";
    element.style.color = "#fbbf24";
    element.style.textShadow = "0 1px 2px rgba(15, 23, 42, 0.65)";
    element.style.pointerEvents = "none";
    element.style.transition = "opacity 0.1s linear";
    element.style.willChange = "transform, opacity";
    element.textContent = this.formatAmount(amount);
    this.container.appendChild(element);

    const offset = new Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);

    this.numbers.push({
      element,
      basePosition: worldPosition.clone(),
      offset,
      elapsed: 0,
      lifetime: DEFAULT_LIFETIME,
      amount
    });

    this.update(0);
  }

  update(deltaTime: number) {
    for (let i = this.numbers.length - 1; i >= 0; i -= 1) {
      const instance = this.numbers[i];
      instance.elapsed += deltaTime;
      const progress = instance.elapsed / instance.lifetime;

      if (progress >= 1) {
        this.container.removeChild(instance.element);
        this.numbers.splice(i, 1);
        continue;
      }

      this.scratch.copy(instance.basePosition);
      this.scratch.add(instance.offset);
      this.scratch.y = 1.2;
      this.scratch.project(this.camera);

      const x = (this.scratch.x * 0.5 + 0.5) * this.viewport.x;
      const y = (1 - (this.scratch.y * 0.5 + 0.5)) * this.viewport.y - progress * VERTICAL_SCREEN_LIFT;

      instance.element.style.opacity = (1 - progress).toFixed(2);
      instance.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }
  }

  clear() {
    for (const instance of this.numbers) {
      this.container.removeChild(instance.element);
    }
    this.numbers.length = 0;
  }

  dispose() {
    this.clear();
    this.host.removeChild(this.container);
  }

  private formatAmount(amount: number) {
    return Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
  }
}
