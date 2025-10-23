import frappe
from frappe import _

def get_context(context):
    """Get context for the portal page"""
    context.title = _("Ex Commerce Portal")
    context.no_cache = 1
