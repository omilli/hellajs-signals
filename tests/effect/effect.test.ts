import { describe, beforeEach } from "bun:test";
import { signal } from "../../lib";
import { effectBasic } from "./effect.basic";
import { effectAdvanced } from "./effect.advanced";
import { effectOptions } from "./effect.options";

// Create a counter signal that will be used across all tests
const count = signal(0);

describe("effect", () => {
  // Reset the count before each test
  beforeEach(() => count.set(0));

  effectBasic(count);
  effectAdvanced(count);
  effectOptions(count);
});
