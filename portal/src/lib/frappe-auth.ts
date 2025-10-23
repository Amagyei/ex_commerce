// Frappe UI Authentication Adapter for React
// Based on the Vue implementation from management_pack

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// 1) Make sure we have a session SID and CSRF token available.
//    Safe to call at app bootstrap and before writes.
export async function bootstrapFrappeUiAuth(): Promise<void> {
  console.log('🔐 BOOTSTRAP: Starting Frappe UI authentication bootstrap...');
  
  try {
    // First, try to auto-login as guest user
    console.log('🔐 BOOTSTRAP: Attempting auto-login as guest user...');
    const guestLoginResponse = await fetch('/api/method/ex_commerce.ex_commerce.api.auth.auto_login_guest', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (guestLoginResponse.ok) {
      const guestData = await guestLoginResponse.json();
      console.log('🔐 BOOTSTRAP: Guest login successful:', guestData);
      
      // Store session info in localStorage for debugging
      if (guestData.message && guestData.user === 'Guest') {
        const sessionInfo = {
          user: guestData.user,
          user_type: guestData.user_type,
          session_id: guestData.session_id,
          csrf_token: guestData.csrf_token,
          login_time: guestData.login_time,
          ip_address: guestData.ip_address
        };
        localStorage.setItem('frappe_session', JSON.stringify(sessionInfo));
        console.log('🔐 BOOTSTRAP: Session info stored in localStorage');
        
        // Set CSRF token in cookie if provided
        if (guestData.csrf_token) {
          document.cookie = `csrf_token=${guestData.csrf_token}; path=/; SameSite=Lax`;
          console.log('🔐 BOOTSTRAP: CSRF token set in cookie');
        }
      }
    } else {
      console.warn('🔐 BOOTSTRAP: Guest login failed, continuing with existing session');
    }
  } catch (error) {
    console.warn('🔐 BOOTSTRAP: Guest login error, continuing with existing session:', error);
  }

  // Ensure we have a CSRF token for API calls
  if (!getCookie('csrf_token')) {
    console.log('🔐 BOOTSTRAP: No CSRF token found, requesting one...');
    try {
      // Use our custom CSRF token endpoint
      const r = await fetch('/api/method/ex_commerce.ex_commerce.api.csrf.get_csrf_token', { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (r.ok) {
        const { message } = await r.json();
        if (message && message !== 'Guest') {
          localStorage.setItem('csrf_token', message);
          document.cookie = `csrf_token=${message}; path=/; SameSite=Lax`;
          console.log('🔐 BOOTSTRAP: CSRF token obtained and stored');
        }
      } else {
        console.warn('🔐 BOOTSTRAP: CSRF token request failed with status:', r.status);
      }
    } catch (error) { 
      console.warn('🔐 BOOTSTRAP: Failed to get CSRF token:', error);
      // ignore - guest users can still use the app without CSRF token for GET requests
    }
  } else {
    console.log('🔐 BOOTSTRAP: CSRF token already available');
  }

  console.log('🔐 BOOTSTRAP: Authentication bootstrap completed');
}

// 2) Build headers the way Frappe expects.
//    We prefer Frappe-UI token if present, else cookie SID + CSRF.
export function getFrappeUiHeaders({ method = 'GET' }: { method?: string } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  // If Frappe-UI has an OAuth/Access token, include it (doesn't hurt).
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

  // Include CSRF for non-GET methods (cookie or locally cached)
  const upper = (method || 'GET').toUpperCase();
  if (['POST','PUT','PATCH','DELETE'].includes(upper)) {
    const csrf = getCookie('csrf_token') || localStorage.getItem('csrf_token');
    if (csrf) {
      headers['X-Frappe-CSRF-Token'] = csrf;
    }
  }

  return headers;
}

// 3) Quick logged-in check if you need it (optional)
export function isFrappeLoggedIn(): boolean {
  return !!getCookie('sid'); // Guest has no SID
}

// 4) Get current user from cookies
export function getSessionUser(): string | null {
  const cookies = new URLSearchParams(document.cookie.split("; ").join("&"));
  let sessionUser = cookies.get("user_id");
  if (sessionUser === "Guest") {
    sessionUser = null;
  }
  return sessionUser;
}

// 5) Get session information from localStorage or API
export async function getSessionInfo(): Promise<any> {
  try {
    // First check localStorage
    const storedSession = localStorage.getItem('frappe_session');
    if (storedSession) {
      return JSON.parse(storedSession);
    }

    // If not in localStorage, get from API
    const response = await frappeRequest('/api/method/ex_commerce.ex_commerce.api.auth.get_session_info', {
      method: 'GET'
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      // Store in localStorage for future use
      localStorage.setItem('frappe_session', JSON.stringify(sessionData));
      return sessionData;
    }
  } catch (error) {
    console.warn('Failed to get session info:', error);
  }
  
  return null;
}

// 6) Refresh guest session
export async function refreshGuestSession(): Promise<boolean> {
  try {
    const response = await frappeRequest('/api/method/ex_commerce.ex_commerce.api.auth.refresh_guest_session', {
      method: 'POST'
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Guest session refreshed:', result);
      return true;
    }
  } catch (error) {
    console.warn('Failed to refresh guest session:', error);
  }
  
  return false;
}

// 5) Enhanced fetch function with Frappe UI headers
export async function frappeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method || 'GET';
  const headers = {
    ...getFrappeUiHeaders({ method }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}
