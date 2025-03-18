import { describe } from "bun:test";
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
import { effectMicrotasks } from "./effect.microtasks";
import { effectAsync } from "./effect.async";
import { effectDebounce } from "./effect.debounce";
import { effectCleanup } from "./effect.cleanup";
import { effectRace } from "./effect.race";

describe("effect", () => {
  // Reset the count before each test
  effectAdvanced();
  effectAsync();
  effectBasic();
  effectChains();
  effectCleanup();
  effectComplex();
  effectDebounce();
  effectEdgeCases();
  effectError();
  effectMicrotasks();
  effectNested();
  effectOptions();
  effectPerformance();
  effectRace();
  effectRecursive();
  effectScheduling();
});
