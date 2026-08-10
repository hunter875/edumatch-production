/**
 * Canonical in-memory token store.
 *
 * Access token is held in memory only (never localStorage/cookie).
 * Refresh token is an HttpOnly cookie managed by the backend — JavaScript
 * cannot read it, which prevents XSS exfiltration.
 *
 * All HTTP clients, WebSocket connections, and auth flows MUST read/write
 * the access token through this module.
 */

let accessToken: string | null = null;

// ---- Single-flight refresh ----
let refreshPromise: Promise<string | null> | null = null;

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,

  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
    refreshPromise = null;
  },

  /**
   * Single-flight refresh: if a refresh is already in progress,
   * all concurrent callers wait on the same promise.
   *
   * The backend reads the refresh token from the HttpOnly cookie
   * (credentials: 'include'), so no body is sent.
   *
   * @param performRefresh — async function that returns a new access token
   *   (or null if refresh failed).
   */
  async refreshOnce(
    performRefresh: () => Promise<string | null>,
  ): Promise<string | null> {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  },
};
