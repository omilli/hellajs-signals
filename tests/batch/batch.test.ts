import { describe, beforeEach } from "bun:test";
import { signal } from "../../lib";
import {} from "../setup";
import { batchBasic } from "./batch.basic";
import { batchAdvanced } from "./batch.advanced";

// Create a counter signal that will be used across all tests
const count = signal(0);

describe("batch", () => {
  // Reset the count before each test
  beforeEach(() => count.set(0));

  batchBasic(count);
  batchAdvanced(count);
});
