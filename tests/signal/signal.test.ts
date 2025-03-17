import { describe, beforeEach } from "bun:test";
import { signal } from "../../lib";
import {} from "../setup";
import { signalBasic } from "./basic";
import { signalAdvanced } from "./advanced";
import { signalOptions } from "./options";

const count = signal(0, { name: "count" });

describe("signal", () => {
  beforeEach(() => count.set(0));
  signalBasic(count);
  signalAdvanced(count);
  signalOptions(count);
});
