import { describe } from "bun:test";
import { signalBasic } from "./signal.basic";
import { signalAdvanced } from "./signal.advanced";
import { signalOptions } from "./signal.options";
import { signalMemory } from "./signal.memory";

describe("signal", () => {
  signalBasic();
  signalAdvanced();
  signalOptions();
  signalMemory();
});
