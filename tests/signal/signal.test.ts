import { describe, beforeEach } from "bun:test";
import { signal } from "../../lib";
import { signalBasic } from "./signal.basic";
import { signalAdvanced } from "./signal.advanced";
import { signalOptions } from "./signal.options";

const count = signal(0, { name: "count" });

describe("signal", () => {
  beforeEach(() => count.set(0));
  signalBasic(count);
  signalAdvanced(count);
  signalOptions(count);
});
