import { spyOn } from "bun:test";
import { getCurrentContext } from "../lib";

export const ctx = getCurrentContext();

// Common test case categories
export const testCategories = {
  basic: "basic functionality",
  advanced: "advanced features",
  memory: "memory management",
  errors: "error handling",
  options: "configuration options",
};

export const warnSpy = () =>
  spyOn(console, "warn").mockImplementation(() => {});
export const errorSpy = () =>
  spyOn(console, "error").mockImplementation(() => {});
