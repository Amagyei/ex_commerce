"""
Customer Lookup API for Ex Commerce Checkout
"""

import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def lookup_customer_by_phone(phone_number):
    """
    Look up customer by phone number for checkout form
    """
    try:
        if not phone_number:
            return {
                "success": False,
                "message": "Phone number is required"
            }
        
        # Clean phone number
        phone_number = phone_number.strip()
        frappe.logger().info(f"🔍 CUSTOMER_LOOKUP: Starting lookup for phone: {phone_number}")
        
        # 1. Check Customer.mobile_no directly
        frappe.logger().info(f"🔍 CUSTOMER_LOOKUP: Checking Customer.mobile_no for: {phone_number}")
        customer = frappe.db.get_value(
            "Customer", 
            {"mobile_no": phone_number}, 
            ["name", "customer_name", "email_id", "mobile_no"],
            as_dict=True
        )
        
        if customer:
            frappe.logger().info(f"✅ CUSTOMER_LOOKUP: Found customer via Customer.mobile_no: {customer.name} - {customer.customer_name}")
            return {
                "success": True,
                "found": True,
                "customer": customer,
                "source": "Customer.mobile_no"
            }
        else:
            frappe.logger().info(f"❌ CUSTOMER_LOOKUP: No customer found via Customer.mobile_no")
        
        # 2. Check Contact.mobile_no and Contact.phone using Dynamic Link
        frappe.logger().info(f"🔍 CUSTOMER_LOOKUP: Checking Contact.mobile_no/phone for: {phone_number}")
        contact_customer = frappe.db.sql("""
            SELECT DISTINCT c.name, c.customer_name, c.email_id, c.mobile_no
            FROM `tabCustomer` c
            INNER JOIN `tabDynamic Link` dl ON dl.link_doctype = 'Customer' AND dl.link_name = c.name AND dl.parenttype = 'Contact'
            INNER JOIN `tabContact` co ON co.name = dl.parent
            WHERE (co.mobile_no = %s OR co.phone = %s)
            LIMIT 1
        """, (phone_number, phone_number), as_dict=True)
        
        if contact_customer:
            frappe.logger().info(f"✅ CUSTOMER_LOOKUP: Found customer via Contact: {contact_customer[0].name} - {contact_customer[0].customer_name}")
            return {
                "success": True,
                "found": True,
                "customer": contact_customer[0],
                "source": "Contact"
            }
        else:
            frappe.logger().info(f"❌ CUSTOMER_LOOKUP: No customer found via Contact")
        
        # 3. Check Address.phone using Dynamic Link
        frappe.logger().info(f"🔍 CUSTOMER_LOOKUP: Checking Address.phone for: {phone_number}")
        address_customer = frappe.db.sql("""
            SELECT DISTINCT c.name, c.customer_name, c.email_id, c.mobile_no
            FROM `tabCustomer` c
            INNER JOIN `tabDynamic Link` dl ON dl.link_doctype = 'Customer' AND dl.link_name = c.name AND dl.parenttype = 'Address'
            INNER JOIN `tabAddress` a ON a.name = dl.parent
            WHERE a.phone = %s
            LIMIT 1
        """, (phone_number,), as_dict=True)
        
        if address_customer:
            frappe.logger().info(f"✅ CUSTOMER_LOOKUP: Found customer via Address: {address_customer[0].name} - {address_customer[0].customer_name}")
            return {
                "success": True,
                "found": True,
                "customer": address_customer[0],
                "source": "Address"
            }
        else:
            frappe.logger().info(f"❌ CUSTOMER_LOOKUP: No customer found via Address")
        
        # 4. No customer found
        frappe.logger().info(f"❌ CUSTOMER_LOOKUP: No customer found for phone: {phone_number}")
        return {
            "success": True,
            "found": False,
            "message": "No existing customer found with this phone number"
        }
        
    except Exception as e:
        frappe.log_error(f"Error in customer lookup: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def get_customer_addresses(customer_name):
    """
    Get customer addresses for checkout form
    """
    try:
        addresses = frappe.get_all(
            "Address",
            filters={
                "link_doctype": "Customer",
                "link_name": customer_name
            },
            fields=["name", "address_type", "address_line1", "address_line2", "city", "state", "country", "pincode", "phone", "email_id"],
            order_by="address_type"
        )
        
        return {
            "success": True,
            "addresses": addresses
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def debug_contact_lookup(phone_number):
    """
    Debug method to test Contact lookup specifically
    """
    try:
        frappe.logger().info(f"🔍 DEBUG: Testing Contact lookup for: {phone_number}")
        
        # Test 1: Check if any contacts have this phone
        contacts = frappe.db.sql("""
            SELECT name, mobile_no, phone, full_name
            FROM `tabContact` 
            WHERE mobile_no = %s OR phone = %s
        """, (phone_number, phone_number), as_dict=True)
        
        frappe.logger().info(f"🔍 DEBUG: Found {len(contacts)} contacts with phone {phone_number}")
        for contact in contacts:
            frappe.logger().info(f"  - {contact.name}: mobile={contact.mobile_no}, phone={contact.phone}, name={contact.full_name}")
        
        # Test 2: Check Dynamic Links for these contacts
        if contacts:
            contact_names = [c.name for c in contacts]
            dynamic_links = frappe.db.sql("""
                SELECT parent, link_doctype, link_name, parenttype
                FROM `tabDynamic Link` 
                WHERE parent IN %s AND link_doctype = 'Customer'
            """, (contact_names,), as_dict=True)
            
            frappe.logger().info(f"🔍 DEBUG: Found {len(dynamic_links)} dynamic links")
            for link in dynamic_links:
                frappe.logger().info(f"  - Contact {link.parent} -> Customer {link.link_name}")
        
        # Test 3: Full query
        result = frappe.db.sql("""
            SELECT DISTINCT c.name, c.customer_name, c.email_id, c.mobile_no
            FROM `tabCustomer` c
            INNER JOIN `tabDynamic Link` dl ON dl.link_doctype = 'Customer' AND dl.link_name = c.name AND dl.parenttype = 'Contact'
            INNER JOIN `tabContact` co ON co.name = dl.parent
            WHERE (co.mobile_no = %s OR co.phone = %s)
            LIMIT 1
        """, (phone_number, phone_number), as_dict=True)
        
        frappe.logger().info(f"🔍 DEBUG: Full query result: {len(result)} customers found")
        for customer in result:
            frappe.logger().info(f"  - {customer.name}: {customer.customer_name}")
        
        return {
            "success": True,
            "contacts": contacts,
            "dynamic_links": dynamic_links if contacts else [],
            "result": result
        }
        
    except Exception as e:
        frappe.logger().error(f"🔍 DEBUG: Error in debug_contact_lookup: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
