import { describe, test, expect } from "bun:test";
import { signal } from "../../../lib";
import { warnSpy } from "../../setup";

export const signalValidators = () =>
  describe("validators", () => {
    // Basic validator test - ensures validators can prevent invalid updates
    // and that warning messages are properly generated
    test("should apply validators and prevent invalid updates", () => {
      const spy = warnSpy();
      const evenOnly = signal(0, {
        name: "evenOnly",
        validators: [
          (value) => {
            return value % 2 === 0 ? value : undefined;
          },
        ],
      });

      evenOnly.set(2);
      expect(evenOnly()).toBe(2);

      // This update should be rejected since 3 is not even
      evenOnly.set(3);
      expect(evenOnly()).toBe(2);

      expect(spy).toHaveBeenCalledWith('Validation failed: "evenOnly"', 3);

      spy.mockRestore();
    });

    // Tests validator chaining - all validators must pass for the update to succeed
    test("should support multiple validators", () => {
      const count = signal(2, {
        name: "validate",
        validators: [
          // Must be positive
          (value) => {
            return value > 0 ? value : undefined;
          },
          // Must be even
          (value) => {
            return value % 2 === 0 ? value : undefined;
          },
        ],
      });

      count.set(4);
      expect(count()).toBe(4);

      // Rejected: not even
      count.set(3);
      expect(count()).toBe(4);

      // Rejected: not positive
      count.set(-2);
      expect(count()).toBe(4);
    });

    // Tests validators with the update method (functional updates)
    test("should support update method with validators", () => {
      const evenOnly = signal(0, {
        name: "validateUpdate",
        validators: [
          (value) => {
            return value % 2 === 0 ? value : undefined;
          },
        ],
      });

      // Valid update: 0 + 2 = 2 (even)
      evenOnly.update((v) => v + 2);
      expect(evenOnly()).toBe(2);

      // Invalid update: 2 + 1 = 3 (odd)
      evenOnly.update((v) => v + 1);
      expect(evenOnly()).toBe(2);
    });

    // Tests a real-world example: email validation with multiple rules
    test("should support complex validation rules", () => {
      // Email format validator using regex
      const emailValidator = (value: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
      };

      // Minimum length validator
      const minLengthValidator = (value: string) => {
        return value.length >= 6 ? value : undefined;
      };

      const email = signal("test@example.com", {
        name: "email",
        validators: [emailValidator, minLengthValidator],
      });

      email.set("new@example.com");
      expect(email()).toBe("new@example.com");

      // Rejected: not a valid email format
      email.set("not-an-email");
      expect(email()).toBe("new@example.com");

      // Rejected: too short (less than 6 chars)
      email.set("a@b.c");
      expect(email()).toBe("new@example.com");
    });

    // Tests validators with complex object types
    test("should compose multiple validators with different types", () => {
      interface User {
        id: number;
        name: string;
        age: number;
      }

      // Age must be 18 or older
      const ageValidator = (user: User) => {
        return user.age >= 18 ? user : undefined;
      };

      // Name must not be empty and must be under 50 chars
      const nameValidator = (user: User) => {
        return user.name.trim().length > 0 && user.name.length <= 50
          ? user
          : undefined;
      };

      const user = signal<User>(
        { id: 1, name: "John", age: 25 },
        {
          validators: [ageValidator, nameValidator],
        }
      );

      // Valid update
      user.set({ id: 2, name: "Alice", age: 30 });
      expect(user().name).toBe("Alice");

      // Rejected: under 18
      user.set({ id: 3, name: "Minor", age: 17 });
      expect(user().name).toBe("Alice");

      // Rejected: empty name
      user.set({ id: 4, name: "", age: 20 });
      expect(user().name).toBe("Alice");
    });
  });
