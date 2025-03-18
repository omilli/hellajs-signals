import { describe } from "bun:test";
import { signalBasic } from "./signal.basic";
import { signalAdvanced } from "./signal.advanced";
import { signalOptions } from "./signal.options";
import { signalMemory } from "./signal.memory";
import { signalNested } from "./signal.nested";

describe("signal", () => {
  signalAdvanced();
  signalBasic();
  signalMemory();
  signalNested();
  signalOptions();
});
