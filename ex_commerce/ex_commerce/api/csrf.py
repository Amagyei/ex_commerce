"""
CSRF Token API endpoints for e-commerce portal
"""

import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def get_csrf_token():
    """
    Get CSRF token for the current session.
    This endpoint provides a reliable way to get CSRF tokens for guest users.
    """
    try:
        # Get CSRF token from session
        csrf_token = frappe.sessions.get_csrf_token()
        
        if not csrf_token:
            # Generate a new CSRF token if none exists
            csrf_token = frappe.generate_hash()
            frappe.local.session['csrf_token'] = csrf_token
        
        return {
            "message": csrf_token,
            "csrf_token": csrf_token,
            "session_id": frappe.session.get('sid'),
            "user": frappe.session.user
        }
        
    except Exception as e:
        frappe.logger().error(f"Failed to get CSRF token: {str(e)}")
        return {
            "message": "Failed to get CSRF token",
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def validate_csrf_token(token):
    """
    Validate a CSRF token.
    """
    try:
        if not token:
            return {
                "valid": False,
                "message": "No token provided"
            }
        
        # Check if token matches session token
        session_token = frappe.session.get('csrf_token')
        if token == session_token:
            return {
                "valid": True,
                "message": "Token is valid"
            }
        else:
            return {
                "valid": False,
                "message": "Token is invalid"
            }
            
    except Exception as e:
        frappe.logger().error(f"Failed to validate CSRF token: {str(e)}")
        return {
            "valid": False,
            "message": "Failed to validate token",
            "error": str(e)
        }