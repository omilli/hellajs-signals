import type { ReactiveContext } from "../types";

/**
 * A factory function that, when set, is responsible for creating instances of `ReactiveContext`.
 * It allows for custom implementations of the reactive context to be used within the application.
 * If `null`, a default implementation will be used.
 */
let contextFactory: (() => ReactiveContext) | null = null;

/**
 * Registers a factory function that will be used to create instances of `ReactiveContext`.
 * This allows for customization of how the context is created and initialized.
 *
 * @param factory A function that returns a new instance of `ReactiveContext`.
 */
export function registerContextFactory(factory: () => ReactiveContext): void {
	contextFactory = factory;
}

/**
 * Creates a default reactive context using the registered context factory.
 *
 * @returns {ReactiveContext} A new reactive context instance.
 * @throws {Error} If no context factory has been registered.
 */
export function createDefaultContext(): ReactiveContext {
	if (!contextFactory) {
		throw new Error("Context factory not registered");
	}
	return contextFactory();
}
