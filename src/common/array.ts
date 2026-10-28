export function padEnd<T, P = null>(array: T[], size: number, value: P): (T | P)[] {
	if (array.length >= size) {
		return [...array];
	}

	const tail = Array.from({ length: size - array.length }, () => value);
	return [...array, ...tail];
}
