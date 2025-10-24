// Frappe UI Authentication Adapter for React
// Based on the secure management_pack patterns

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Secure guest session establishment using management_pack patterns
export async function bootstrapFrappeUiAuth(): Promise<boolean> {
  console.log('🔐 BOOTSTRAP: Starting secure guest session establishment...');
  
  try {
    // 1. Touch backend to mint/refresh SID if needed (management_pack pattern)
    const userResponse = await fetch('/api/method/frappe.auth.get_logged_user', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('🔐 BOOTSTRAP: User response status:', userResponse.status);
    
    // 2. Get CSRF token from our custom endpoint (secure pattern)
    const csrfResponse = await fetch('/api/method/ex_commerce.ex_commerce.api.csrf.get_csrf_token', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('🔐 BOOTSTRAP: CSRF response status:', csrfResponse.status);
    
    if (csrfResponse.ok) {
      const { message } = await csrfResponse.json();
      console.log('🔐 BOOTSTRAP: CSRF token received:', message);
      
      if (message) {
        // Store CSRF token securely (management_pack pattern)
        localStorage.setItem('csrf_token', message);
        document.cookie = `csrf_token=${message}; path=/; SameSite=Lax`;
        console.log('🔐 BOOTSTRAP: CSRF token stored in localStorage and cookie');
        console.log('🔐 BOOTSTRAP: Cookie after setting:', document.cookie);
        return true;
      }
    } else {
      const errorText = await csrfResponse.text();
      console.error('🔐 BOOTSTRAP: CSRF token request failed:', errorText);
    }
    
    console.warn('🔐 BOOTSTRAP: Failed to get CSRF token');
    return false;
  } catch (error) {
    console.warn('🔐 BOOTSTRAP: Guest session establishment error:', error);
    return false;
  }
}

// Build headers the way Frappe expects (management_pack pattern)
export function getFrappeUiHeaders({ method = 'GET' }: { method?: string } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  // If Frappe-UI has an OAuth/Access token, include it (doesn't hurt)
  try {
    const oauth =
      (window as any).frappe?.auth?.token ||
      localStorage.getItem('frappe_oauth_token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('frappe_token') ||
      localStorage.getItem('auth_token');
    if (oauth) headers['Authorization'] = `Bearer ${oauth}`;
  } catch { 
    // ignore
  }

  // Include CSRF for non-GET methods (management_pack pattern)
  const upper = (method || 'GET').toUpperCase();
  if (['POST','PUT','PATCH','DELETE'].includes(upper)) {
    const csrf = getCookie('csrf_token') || localStorage.getItem('csrf_token');
    console.log('🔐 HEADERS: CSRF token lookup - cookie:', getCookie('csrf_token'), 'localStorage:', localStorage.getItem('csrf_token'));
    
    if (csrf) {
      headers['X-Frappe-CSRF-Token'] = csrf;
      console.log('🔐 HEADERS: Using CSRF token for', upper, 'request:', csrf);
    } else {
      console.warn('🔐 HEADERS: No CSRF token available for', upper, 'request');
      console.warn('🔐 HEADERS: Available cookies:', document.cookie);
    }
  }

  return headers;
}

// Quick logged-in check if you need it (optional)
export function isFrappeLoggedIn(): boolean {
  return !!getCookie('sid'); // Guest has no SID
}

// Get current user from cookies
export function getSessionUser(): string | null {
  const cookies = new URLSearchParams(document.cookie.split("; ").join("&"));
  let sessionUser = cookies.get("user_id");
  if (sessionUser === "Guest") {
    sessionUser = null;
  }
  return sessionUser;
}

// Get session information using standard Frappe patterns
export async function getSessionInfo(): Promise<any> {
  try {
    const response = await frappeRequest('/api/method/ex_commerce.ex_commerce.api.auth.get_session_info', {
      method: 'GET'
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      return sessionData;
    }
  } catch (error) {
    console.warn('Failed to get session info:', error);
  }
  
  return null;
}

// Enhanced fetch function with management_pack error handling patterns
export async function frappeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method || 'GET';
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const headers = {
        ...getFrappeUiHeaders({ method }),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      // Management pack error handling pattern
      if ([400, 401, 403].includes(response.status)) {
        console.warn(`🔐 API: Auth/CSRF error (attempt ${retryCount + 1}), re-bootstrapping...`);
        
        // Re-bootstrap authentication (management_pack pattern)
        await bootstrapFrappeUiAuth();
        
        // Retry with fresh headers
        const retryHeaders = {
          ...getFrappeUiHeaders({ method }),
          ...options.headers,
        };
        
        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: retryHeaders,
        });
        
        if (retryResponse.ok) {
          return retryResponse;
        }
        
        retryCount++;
        continue;
      }

      return response;
      
    } catch (error) {
      console.warn(`🔐 API: Request failed (attempt ${retryCount + 1}):`, error);
      retryCount++;
      
      if (retryCount < maxRetries) {
        console.log(`🔐 API: Retrying in ${retryCount * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All retry attempts failed');
}
