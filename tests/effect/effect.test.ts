import { describe, beforeEach } from "bun:test";
import { signal } from "../../lib";
import { effectBasic } from "./effect.basic";
import { effectAdvanced } from "./effect.advanced";
import { effectOptions } from "./effect.options";
import { effectNested } from "./effect.nested";
import { effectScheduling } from "./effect.scheduling";
import { effectEdgeCases } from "./effect.edge";
import { effectComplex } from "./effect.complex";
import { effectPerformance } from "./effect.performance";
import { effectRecursive } from "./effect.recursive";
import { effectChains } from "./effect.chains";
import { effectError } from "./effect.error";
import { effectMemory } from "./effects.memory";
import { effectMicrotasks } from "./effect.microtasks";
import { effectAsync } from "./effect.async";
import { effectDebounce } from "./effect.debounce";

// Create a counter signal that will be used across all tests
const count = signal(0);

describe("effect", () => {
  // Reset the count before each test
  beforeEach(() => count.set(0));
  effectBasic(count);
  effectAdvanced(count);
  effectOptions(count);
  effectNested();
  effectScheduling();
  effectEdgeCases();
  effectComplex();
  effectPerformance();
  effectRecursive();
  effectChains();
  effectError();
  effectMemory();
  effectMicrotasks();
  effectAsync();
  effectDebounce();
});
