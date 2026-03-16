/**
 * Extracts a user-friendly error message from an API error.
 * FastAPI returns { detail: "..." } in the response body.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err && typeof err === 'object') {
    // Axios error with a response from the server
    const response = (err as any)?.response;
    if (response) {
      const detail = response.data?.detail;
      if (typeof detail === 'string') return detail;
      if (response.status === 401) return 'Invalid email or password.';
      if (response.status === 403) return 'You do not have permission to do that.';
      if (response.status === 404) return 'Not found.';
      if (response.status === 429) return 'Too many attempts. Please wait a moment.';
      if (response.status >= 500) return 'Server error. Please try again later.';
    }
    // Network error (no response — offline, timeout, etc.)
    const code = (err as any)?.code;
    if (code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (code === 'ERR_NETWORK' || code === 'ERR_INTERNET_DISCONNECTED') {
      return 'No internet connection.';
    }
  }
  return fallback;
}
