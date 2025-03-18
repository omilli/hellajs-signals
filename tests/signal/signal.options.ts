import { describe, test, expect, mock } from "bun:test";
import { signal } from "../../lib";
import { warnSpy, errorSpy, tick } from "../setup";

export const signalOptions = () =>
  describe("options", () => {
    test("should support name option for debugging", () => {
      const count = signal(0, { name: "count" });
      // @ts-ignore: Accessing internal property for testing
      expect(count._name).toBe("count");
    });

    test("should apply validators and prevent invalid updates", () => {
      const spy = warnSpy();
      // Only allow even numbers
      const evenOnly = signal(0, {
        name: "evenOnly",
        validators: [(value) => value % 2 === 0],
      });

      // Valid update
      evenOnly.set(2);
      expect(evenOnly()).toBe(2);

      // Invalid update
      evenOnly.set(3);
      expect(evenOnly()).toBe(2); // Value shouldn't change

      // Verify warning was logged
      expect(spy).toHaveBeenCalledWith('Validation failed: "evenOnly"', 3);

      spy.mockRestore();
    });

    test("should call onSet hook when value changes", () => {
      const onSet = mock();
      const count = signal(0, { onSet });

      count.set(5);

      expect(onSet).toHaveBeenCalledWith(5, 0);
    });

    test("should handle errors in onSet hook", () => {
      const spy = errorSpy();
      const count = signal(0, {
        name: "errorHook",
        onSet: () => {
          throw new Error("Hook error");
        },
      });

      // Should not throw despite error in hook
      expect(() => count.set(5)).not.toThrow();
      expect(count()).toBe(5); // Value should still update

      // Error should be logged
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain('onSet error: "errorHook"');

      spy.mockRestore();
    });

    test("should support multiple validators", () => {
      // Must be positive and even
      const count = signal(2, {
        name: "validate",
        validators: [(value) => value > 0, (value) => value % 2 === 0],
      });

      // Valid (positive and even)
      count.set(4);
      expect(count()).toBe(4);

      // Invalid (not even)
      count.set(3);
      expect(count()).toBe(4);

      // Invalid (not positive)
      count.set(-2);
      expect(count()).toBe(4);
    });

    test("should support update method with validators", () => {
      // Only allow even numbers
      const evenOnly = signal(0, {
        name: "validateUpdate",
        validators: [(value) => value % 2 === 0],
      });

      // Valid update
      evenOnly.update((v) => v + 2);
      expect(evenOnly()).toBe(2);

      // Invalid update
      evenOnly.update((v) => v + 1);
      expect(evenOnly()).toBe(2); // Should remain unchanged
    });

    test("should handle async operations in onSet hook", async () => {
      const results: number[] = [];
      const asyncCounter = signal(0, {
        name: "asyncCounter",
        onSet: async (newValue) => {
          // Simulate async operation
          await tick(10);
          results.push(newValue as number);
        },
      });

      asyncCounter.set(1);
      asyncCounter.set(2);

      // Wait for async operations to complete
      await tick(20);

      // Results should have both values in order
      expect(results).toEqual([1, 2]);
    });

    test("should provide both old and new values to onSet", () => {
      const valueHistory: Array<{ old: number; new: number }> = [];

      const tracked = signal(0, {
        onSet: (newVal, oldVal) => {
          valueHistory.push({ old: oldVal as number, new: newVal as number });
        },
      });

      tracked.set(1); // 0 -> 1
      tracked.set(5); // 1 -> 5
      tracked.set(10); // 5 -> 10

      expect(valueHistory).toEqual([
        { old: 0, new: 1 },
        { old: 1, new: 5 },
        { old: 5, new: 10 },
      ]);
    });

    test("should support complex validation rules", () => {
      // String validator that enforces email format
      const emailValidator = (value: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      };

      // String validator that enforces minimum length
      const minLengthValidator = (value: string) => value.length >= 6; // Changed from 5 to 6

      const email = signal("test@example.com", {
        name: "email",
        validators: [emailValidator, minLengthValidator],
      });

      // Valid update
      email.set("new@example.com");
      expect(email()).toBe("new@example.com");

      // Invalid: not an email format
      email.set("not-an-email");
      expect(email()).toBe("new@example.com"); // Should not change

      // Invalid: too short
      email.set("a@b.c");
      expect(email()).toBe("new@example.com"); // Should not change
    });

    test("should compose multiple validators with different types", () => {
      interface User {
        id: number;
        name: string;
        age: number;
      }

      // Only allow adult users
      const ageValidator = (user: User) => user.age >= 18;

      // Only allow users with valid names
      const nameValidator = (user: User) =>
        user.name.trim().length > 0 && user.name.length <= 50;

      const user = signal<User>(
        { id: 1, name: "John", age: 25 },
        {
          validators: [ageValidator, nameValidator],
        }
      );

      // Valid update
      user.set({ id: 2, name: "Alice", age: 30 });
      expect(user().name).toBe("Alice");

      // Invalid: age too young
      user.set({ id: 3, name: "Minor", age: 17 });
      expect(user().name).toBe("Alice"); // No change

      // Invalid: empty name
      user.set({ id: 4, name: "", age: 20 });
      expect(user().name).toBe("Alice"); // No change
    });
  });
