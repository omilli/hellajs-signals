import { spyOn } from "bun:test";
import { getCurrentContext } from "../lib";

export const ctx = getCurrentContext();

export const warnSpy = () =>
  spyOn(console, "warn").mockImplementation(() => {});
export const errorSpy = () =>
  spyOn(console, "error").mockImplementation(() => {});
