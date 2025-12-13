function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnakeCase);
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[camelToSnake(key)] = transformKeysToSnakeCase(value);
      return acc;
    }, {} as Record<string, any>);
  }

  return obj;
}

export {transformKeysToSnakeCase}