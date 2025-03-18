import { beforeEach, describe } from "bun:test";
import { computedBasic } from "./computed.basic";
import { computedAdvanced } from "./computed.advanced";
import { computedOptions } from "./computed.options";
import { computed, signal } from "../../lib";

// Create shared test fixtures used across all test suites
const count = signal(1);
// This computed signal doubles the count value and is used in multiple test suites
const doubled = computed(() => count() * 2, { name: "doubledValue" });

describe("computed", () => {
  // Reset count to initial value before each test to ensure consistent test environment
  beforeEach(() => count.set(1));

  // Run test suites for different aspects of computed functionality
  computedBasic(count, doubled);
  computedAdvanced(count, doubled);
  computedOptions(count, doubled);
});
