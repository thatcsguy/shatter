export interface ComponentType<T> {
  readonly key: string;
  create(): T;
}

export type ComponentInitializer<T> = (component: T) => void;

export type ComponentSetup<T> = Partial<T> | ComponentInitializer<T>;

export type ComponentEntry<T> = readonly [ComponentType<T>, ComponentSetup<T>?];

export function defineComponent<T>(key: string, factory: () => T): ComponentType<T> {
  return {
    key,
    create: () => factory()
  };
}

export function applyComponentSetup<T>(component: T, setup?: ComponentSetup<T>): T {
  if (!setup) return component;

  if (typeof setup === "function") {
    setup(component);
    return component;
  }

  Object.assign(component as object, setup);
  return component;
}

export function component<T>(type: ComponentType<T>, setup?: ComponentSetup<T>): ComponentEntry<T> {
  return [type, setup] as ComponentEntry<T>;
}
