"""
CSRF Token API endpoints for secure guest authentication
"""

import frappe
from frappe import _


@frappe.whitelist(allow_guest=True, methods=['GET'])
def get_csrf_token():
    """
    Get CSRF token for guest users.
    This endpoint provides CSRF tokens for secure API requests.
    """
    try:
        # Get CSRF token from current session
        csrf_token = frappe.sessions.get_csrf_token()
        
        if not csrf_token:
            # Generate new CSRF token if none exists
            frappe.sessions.generate_csrf_token()
            csrf_token = frappe.sessions.get_csrf_token()
        
        return {
            "message": csrf_token,
            "csrf_token": csrf_token,
            "session_id": frappe.session.get('sid'),
            "user": frappe.session.user
        }
        
    except Exception as e:
        frappe.logger().error(f"CSRF token error: {str(e)}")
        return {
            "message": "Failed to get CSRF token",
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True, methods=['POST'])
def validate_csrf_token(token):
    """
    Validate CSRF token for security.
    """
    try:
        if not token:
            return {"valid": False, "message": "No token provided"}
        
        # Get current session CSRF token
        current_token = frappe.sessions.get_csrf_token()
        
        if token == current_token:
            return {"valid": True, "message": "Token is valid"}
        else:
            return {"valid": False, "message": "Token mismatch"}
            
    except Exception as e:
        frappe.logger().error(f"CSRF validation error: {str(e)}")
        return {
            "valid": False,
            "message": "Validation failed",
            "error": str(e)
        }


