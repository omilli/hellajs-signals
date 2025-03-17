import { describe } from "bun:test";
import { contextIsolation } from "./context/isolation";
import { contextReactivity } from "./context/reactivity";
import { contextMemory } from "./context/memory";
import { contextUtilities } from "./context/utilities";
import { contextDefault } from "./context/default";

describe("reactive context", () => {
  contextIsolation();
  contextReactivity();
  contextMemory();
  contextUtilities();
  contextDefault();
});
