import { describe } from "bun:test";
import { contextIsolation } from "./isolation";
import { contextReactivity } from "./reactivity";
import { contextMemory } from "./memory";
import { contextUtilities } from "./utilities";
import { contextDefault } from "./default";

describe("reactive context", () => {
  contextIsolation();
  contextReactivity();
  contextMemory();
  contextUtilities();
  contextDefault();
});
