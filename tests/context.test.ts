import { describe } from "bun:test";
import { contextIsolation } from "./context/isolation";
import { contextReactivity } from "./context/reactivity";
import { contextMemory } from "./context/memory";
import { contextUtilities } from "./context/utilities";

// Add context to lib/index.ts export
// export * from "./context";

describe("reactive context", () => {
  contextIsolation();
  contextReactivity();
  contextMemory();
  contextUtilities();
});
