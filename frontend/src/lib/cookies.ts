// Cookie utility functions for client-side
export function setCookie(name: string, value: string, days: number = 7) {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const expiresString = expires.toUTCString();
    
    const cookieString = `${name}=${encodeURIComponent(value)}; expires=${expiresString}; path=/; SameSite=Lax`;
    document.cookie = cookieString;
  } catch (error) {
    // Silent fail for cookie operations
  }
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}