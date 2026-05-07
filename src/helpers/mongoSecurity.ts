export function containsUnsafeMongoKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUnsafeMongoKey);
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) => {
      return key.startsWith('$') || key.includes('.') || containsUnsafeMongoKey(nestedValue);
    });
  }

  return false;
}
