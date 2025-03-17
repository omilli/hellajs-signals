import type { ReactiveContext } from "../types";

// Store for context factory to avoid circular imports
let contextFactory: (() => ReactiveContext) | null = null;

export function registerContextFactory(factory: () => ReactiveContext): void {
  contextFactory = factory;
}

export function createDefaultContext(): ReactiveContext {
  if (!contextFactory) {
    throw new Error("Context factory not registered");
  }
  return contextFactory();
}
