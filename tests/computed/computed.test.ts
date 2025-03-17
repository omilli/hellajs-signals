import { beforeEach, describe } from "bun:test";
import { computedBasic } from "./computed.basic";
import { computedAdvanced } from "./computed.advanced";
import { computedOptions } from "./computed.options";
import { computed, signal } from "../../lib";

const count = signal(1);
const doubled = computed(() => count() * 2, { name: "doubledValue" });

describe("computed", () => {
  beforeEach(() => count.set(1));
  computedBasic(count, doubled);
  computedAdvanced(count, doubled);
  computedOptions(count, doubled);
});
