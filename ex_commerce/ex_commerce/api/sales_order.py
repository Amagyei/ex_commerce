"""
ERPNext Sales Order Integration for Ex Commerce
"""

import frappe
from frappe import _
from frappe.utils import now_datetime


@frappe.whitelist()
def create_erpnext_sales_order(ex_commerce_order_name):
    """
    Create ERPNext Sales Order from Ex Commerce Sales Order
    """
    try:
        # Get Ex Commerce Sales Order
        ex_order = frappe.get_doc("Ex Commerce Sales Order", ex_commerce_order_name)
        
        if not ex_order.customer:
            return {
                "success": False,
                "error": "Customer must be assigned before creating ERPNext Sales Order"
            }
        
        # Check if ERPNext Sales Order already exists
        if ex_order.erpnext_sales_order:
            return {
                "success": True,
                "sales_order": ex_order.erpnext_sales_order,
                "message": "ERPNext Sales Order already exists"
            }
        
        # Create ERPNext Sales Order
        so = frappe.new_doc("Sales Order")
        so.customer = ex_order.customer
        so.customer_name = ex_order.customer_name
        so.transaction_date = ex_order.transaction_date
        so.delivery_date = ex_order.delivery_date
        so.company = ex_order.company
        so.currency = ex_order.currency
        so.selling_price_list = ex_order.selling_price_list
        so.order_type = ex_order.order_type
        so.po_no = ex_order.po_no
        so.po_date = ex_order.po_date
        
        # Set addresses
        if ex_order.guest_billing_address:
            so.customer_address = get_customer_address(ex_order.customer, "Billing")
        if ex_order.guest_shipping_address:
            so.shipping_address_name = get_customer_address(ex_order.customer, "Shipping")
        
        # Copy items
        for item in ex_order.items:
            so.append("items", {
                "item_code": item.item_code,
                "item_name": item.item_name,
                "qty": item.qty,
                "rate": item.rate,
                "amount": item.amount,
                "warehouse": item.warehouse or ex_order.set_warehouse
            })
        
        # Copy taxes
        if ex_order.taxes:
            for tax in ex_order.taxes:
                so.append("taxes", {
                    "charge_type": tax.charge_type,
                    "account_head": tax.account_head,
                    "description": tax.description,
                    "rate": tax.rate,
                    "tax_amount": tax.tax_amount
                })
        
        so.insert()
        so.submit()
        
        # Link back to Ex Commerce Sales Order
        frappe.db.set_value("Ex Commerce Sales Order", ex_order.name, "erpnext_sales_order", so.name)
        
        return {
            "success": True,
            "sales_order": so.name,
            "message": f"ERPNext Sales Order '{so.name}' created successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating ERPNext Sales Order: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def get_customer_address(customer, address_type):
    """Get customer address by type"""
    addresses = frappe.get_all(
        "Address",
        filters={
            "link_doctype": "Customer",
            "link_name": customer,
            "address_type": address_type
        },
        fields=["name"],
        limit=1
    )
    return addresses[0].name if addresses else None


@frappe.whitelist()
def get_erpnext_sales_order_status(ex_commerce_order_name):
    """
    Get status of linked ERPNext Sales Order
    """
    try:
        ex_order = frappe.get_doc("Ex Commerce Sales Order", ex_commerce_order_name)
        
        if not ex_order.erpnext_sales_order:
            return {
                "success": False,
                "message": "No ERPNext Sales Order linked"
            }
        
        so_status = frappe.db.get_value("Sales Order", ex_order.erpnext_sales_order, "status")
        
        return {
            "success": True,
            "sales_order": ex_order.erpnext_sales_order,
            "status": so_status
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


