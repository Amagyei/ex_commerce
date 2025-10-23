"""
Authentication API endpoints for automatic guest user login
"""

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.utils import now_datetime


@frappe.whitelist(allow_guest=True)
def auto_login_guest():
    """
    Automatically login as guest user for e-commerce portal.
    This mimics the standard Frappe authentication system but automatically
    authenticates users as guests without requiring a login page.
    """
    try:
        # Check if user is already logged in
        if frappe.session.user != "Guest":
            return {
                "message": "User already authenticated",
                "user": frappe.session.user,
                "user_type": frappe.session.get('user_type'),
                "full_name": frappe.session.get('full_name'),
                "session_id": frappe.session.get('sid')
            }
        
        # Force create a new session for guest user
        # This ensures proper session management across devices
        frappe.local.login_manager = LoginManager()
        
        # Set guest user info directly
        frappe.local.login_manager.user = "Guest"
        frappe.local.login_manager.get_user_info()
        
        # Force create a new session (not resume)
        frappe.local.login_manager.make_session(resume=False)
        frappe.local.login_manager.set_user_info()
        
        # Ensure CSRF token is generated
        csrf_token = frappe.sessions.get_csrf_token()
        frappe.local.session['csrf_token'] = csrf_token
        
        # Commit to ensure session is saved
        frappe.db.commit()
        
        # Return session information
        return {
            "message": "Successfully authenticated as guest user",
            "user": frappe.session.user,
            "user_type": frappe.session.get('user_type'),
            "full_name": frappe.session.get('full_name'),
            "session_id": frappe.session.get('sid'),
            "csrf_token": csrf_token,
            "login_time": now_datetime().isoformat(),
            "ip_address": frappe.local.request_ip
        }
        
    except Exception as e:
        frappe.logger().error(f"Auto guest login failed: {str(e)}")
        return {
            "message": "Failed to authenticate as guest user",
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def get_session_info():
    """
    Get current session information for debugging and monitoring.
    """
    try:
        return {
            "user": frappe.session.user,
            "user_type": frappe.session.get('user_type'),
            "full_name": frappe.session.get('full_name'),
            "session_id": frappe.session.get('sid'),
            "csrf_token": frappe.session.get('csrf_token'),
            "login_time": frappe.session.get('login_time'),
            "session_expiry": frappe.session.get('session_expiry'),
            "ip_address": frappe.local.request_ip,
            "user_agent": frappe.get_request_header("User-Agent", "Unknown")
        }
    except Exception as e:
        frappe.logger().error(f"Failed to get session info: {str(e)}")
        return {
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def refresh_guest_session():
    """
    Refresh guest user session to maintain authentication.
    """
    try:
        # Check if user is guest
        if frappe.session.user != "Guest":
            return {
                "message": "User is not a guest, no refresh needed",
                "user": frappe.session.user
            }
        
        # Refresh session
        frappe.local.login_manager.make_session(resume=True)
        
        return {
            "message": "Guest session refreshed successfully",
            "user": frappe.session.user,
            "session_id": frappe.session.get('sid'),
            "csrf_token": frappe.session.get('csrf_token'),
            "refresh_time": now_datetime().isoformat()
        }
        
    except Exception as e:
        frappe.logger().error(f"Failed to refresh guest session: {str(e)}")
        return {
            "message": "Failed to refresh guest session",
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def logout_guest():
    """
    Logout guest user and clear session.
    """
    try:
        if frappe.session.user == "Guest":
            # Clear session
            frappe.local.login_manager.logout()
            return {
                "message": "Guest user logged out successfully"
            }
        else:
            return {
                "message": "User is not a guest user",
                "user": frappe.session.user
            }
            
    except Exception as e:
        frappe.logger().error(f"Failed to logout guest user: {str(e)}")
        return {
            "message": "Failed to logout guest user",
            "error": str(e)
        }
