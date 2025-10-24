"""
Secure guest authentication using management_pack patterns
"""

import frappe
from frappe import _
from frappe.utils import now_datetime


@frappe.whitelist(allow_guest=True, methods=['GET'])
def get_guest_session():
    """
    Get or create a secure guest session using standard Frappe patterns.
    This endpoint provides guest access while maintaining security.
    """
    try:
        # Check if user is already authenticated
        if frappe.session.user != "Guest":
            return {
                "message": "User already authenticated",
                "user": frappe.session.user,
                "user_type": frappe.session.get('user_type'),
                "full_name": frappe.session.get('full_name'),
                "session_id": frappe.session.get('sid'),
                "csrf_token": frappe.session.get('csrf_token')
            }
        
        # Let Frappe handle guest session creation automatically
        # No manual session creation - let Frappe's LoginManager handle it
        
        # Get CSRF token from the current session
        csrf_token = frappe.sessions.get_csrf_token()
        
        return {
            "message": "Guest session available",
            "user": frappe.session.user,
            "user_type": frappe.session.get('user_type'),
            "full_name": frappe.session.get('full_name'),
            "session_id": frappe.session.get('sid'),
            "csrf_token": csrf_token,
            "login_time": now_datetime().isoformat(),
            "ip_address": frappe.local.request_ip
        }
        
    except Exception as e:
        frappe.logger().error(f"Guest session error: {str(e)}")
        return {
            "message": "Failed to get guest session",
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def get_session_info():
    """
    Get current session information for debugging and monitoring.
    Uses standard Frappe session handling.
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
