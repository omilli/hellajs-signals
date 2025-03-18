import { spyOn } from "bun:test";
import { getCurrentContext } from "../lib";

export const ctx = getCurrentContext();

export const warnSpy = () =>
  spyOn(console, "warn").mockImplementation(() => {});
export const errorSpy = () =>
  spyOn(console, "error").mockImplementation(() => {});

export const effectTick = (ms = 50) =>
  new Promise((resolve) => setTimeout(resolve, ms));
