import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def create_customer_with_details(customer_data):
	"""
	Create a complete customer record with contact and address.
	
	Args:
		customer_data (dict): {
			"customer_name": "John Doe",
			"first_name": "John",
			"last_name": "Doe",
			"phone": "+233557297891",
			"address_line1": "123 Main St",
			"address_line2": "Apt 4B",  # optional
			"city": "Accra",
			"state": "Greater Accra",  # optional
			"pincode": "00233",  # optional
			"country": "Ghana"
		}
	
	Returns:
		dict: {
			"success": True,
			"customer": {...},
			"contact": {...},
			"address": {...}
		}
	"""
	
	# Parse customer_data if it's a string
	if isinstance(customer_data, str):
		import json
		customer_data = json.loads(customer_data)
	
	try:
		# Step 1: Create Customer
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": customer_data.get("customer_name"),
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories"
		})
		
		customer.flags.ignore_permissions = True
		customer.insert()
		frappe.db.commit()
		
		print(f"✅ Customer created: {customer.name}")
		
		# Step 2: Create Contact (linked to customer)
		contact = frappe.get_doc({
			"doctype": "Contact",
			"first_name": customer_data.get("first_name"),
			"last_name": customer_data.get("last_name")
		})
		
		# Add phone number to contact
		contact.append("phone_nos", {
			"phone": customer_data.get("phone"),
			"is_primary_mobile_no": 1
		})
		
		# NO EMAIL - Testing if we can omit it entirely
		
		# Link contact to customer
		contact.append("links", {
			"link_doctype": "Customer",
			"link_name": customer.name
		})
		
		contact.flags.ignore_permissions = True
		contact.insert()
		frappe.db.commit()
		
		print(f"✅ Contact created: {contact.name}")
		
		# Step 3: Create Shipping Address (linked to customer)
		address = frappe.get_doc({
			"doctype": "Address",
			"address_title": customer_data.get("customer_name"),
			"address_type": "Shipping",
			"address_line1": customer_data.get("address_line1"),
			"address_line2": customer_data.get("address_line2", ""),
			"city": customer_data.get("city"),
			"state": customer_data.get("state", ""),
			"country": customer_data.get("country", "Ghana"),
			"pincode": customer_data.get("pincode", ""),
			"phone": customer_data.get("phone"),
			# NO EMAIL - Testing if we can omit it
			"is_primary_address": 1,
			"is_shipping_address": 1
		})
		
		# Link address to customer
		address.append("links", {
			"link_doctype": "Customer",
			"link_name": customer.name
		})
		
		address.flags.ignore_permissions = True
		address.insert()
		frappe.db.commit()
		
		print(f"✅ Address created: {address.name}")
		
		# Step 4: Update Customer with primary contact and address
		customer.customer_primary_contact = contact.name
		customer.customer_primary_address = address.name
		customer.flags.ignore_permissions = True
		customer.save()
		frappe.db.commit()
		
		print(f"✅ Customer updated with primary contact and address")
		
		return {
			"success": True,
			"customer": {
				"name": customer.name,
				"customer_name": customer.customer_name,
				"customer_type": customer.customer_type,
				"customer_group": customer.customer_group,
				"territory": customer.territory,
				"mobile_no": customer.mobile_no,
				"email_id": customer.email_id
			},
			"contact": {
				"name": contact.name,
				"first_name": contact.first_name,
				"last_name": contact.last_name,
				"mobile_no": contact.mobile_no,
				"email_id": contact.email_id
			},
			"address": {
				"name": address.name,
				"address_title": address.address_title,
				"address_type": address.address_type,
				"address_line1": address.address_line1,
				"address_line2": address.address_line2,
				"city": address.city,
				"state": address.state,
				"country": address.country,
				"pincode": address.pincode,
				"phone": address.phone
			}
		}
	
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(f"Customer creation failed: {str(e)}", "Customer Creation Error")
		print(f"❌ Error: {str(e)}")
		
		return {
			"success": False,
			"error": str(e),
			"message": "Failed to create customer. Please try again."
		}

