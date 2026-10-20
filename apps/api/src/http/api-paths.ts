// Express matches routes case-insensitively, so `/API/auth/me` reaches the same
// handler as `/api/auth/me`. Every API-path decision must agree with it.
const API_PATH = /^\/api(?:\/|$)/i;

export const isApiPath = (path: string): boolean => API_PATH.test(path);
