import { beforeEach, describe } from "bun:test";
import { untrackedBasic } from "./untracked.basic";
import { untrackedAdvanced } from "./untracked.advanced";
import { signal } from "../../lib";

const count = signal(0);

describe("untracked", () => {
  beforeEach(() => count.set(0));
  untrackedBasic(count);
  untrackedAdvanced(count);
});
