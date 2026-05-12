export function normalizeErrorMessage(error: any): string {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
    const messages = error.errors
      .map((err: any) => normalizeErrorMessage(err))
      .filter(Boolean);
    return messages.join('; ') || 'AggregateError';
  }

  if (Array.isArray(error.errors)) {
    const messages = error.errors
      .map((err: any) => normalizeErrorMessage(err))
      .filter(Boolean);
    return messages.join('; ') || 'Error';
  }

  if (error.code) {
    return `${error.code}${error.message ? `: ${error.message}` : ''}`;
  }

  if (typeof error.toString === 'function') {
    const stringified = error.toString();
    if (stringified && stringified !== '[object Object]') {
      return stringified;
    }
  }

  return 'Unknown error';
}
