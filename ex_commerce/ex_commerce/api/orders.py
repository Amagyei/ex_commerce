import frappe
from frappe import _
from frappe.utils import nowdate, add_days


# CSRF validation is working correctly now
# def skip_csrf_for_guest():
# 	if frappe.session.user == "Guest":
# 		frappe.local.flags.disable_csrf = True


def get_guest_cart_id():
	"""Generate a unique cart ID for guest users based on session."""
	# For guest users, use IP address for a stable identifier
	ip_address = frappe.local.request.environ.get('REMOTE_ADDR', 'unknown')
	# Create a hash of IP for consistency
	import hashlib
	identifier = hashlib.md5(ip_address.encode()).hexdigest()[:12]
	return f"guest_cart_{identifier}"


def get_cart_items():
	"""Get cart items from cache for guest users."""
	if frappe.session.user == "Guest":
		cart_id = get_guest_cart_id()
		cart_data = frappe.cache().get_value(cart_id) or []
		return cart_data
	else:
		return frappe.session.get('cart_items', [])


def clear_cart_items():
	"""Clear cart items for guest users."""
	if frappe.session.user == "Guest":
		cart_id = get_guest_cart_id()
		frappe.cache().delete_value(cart_id)
	else:
		frappe.session['cart_items'] = []


@frappe.whitelist(allow_guest=True)
def create_order(customer_info, delivery_info):
	"""Create a Sales Order from cart items."""
	
	# Validate required fields
	if not customer_info:
		frappe.throw("Customer information is required")
	
	if not delivery_info:
		frappe.throw("Delivery information is required")
	
	# Get cart items
	cart_items = get_cart_items()
	if not cart_items:
		frappe.throw("Cart is empty")
	
	# Create or get customer
	customer = create_or_get_customer(customer_info)
	
	# Get default company, currency, and price list
	default_company = frappe.get_single_value("Global Defaults", "default_company")
	default_currency = frappe.get_single_value("Global Defaults", "default_currency")
	default_price_list = frappe.get_single_value("Selling Settings", "selling_price_list")
	
	# Create Sales Order with proper field mapping
	sales_order = frappe.get_doc({
		"doctype": "Sales Order",
		"customer": customer.name,
		"customer_name": customer.customer_name,
		"transaction_date": nowdate(),
		"delivery_date": add_days(nowdate(), 7),  # Default 7 days delivery
		"company": default_company,
		"currency": default_currency,
		"selling_price_list": default_price_list,
		"order_type": "Sales",
		"status": "Draft",
		"items": []
	})
	
	# Add cart items to Sales Order with proper field mapping
	for cart_item in cart_items:
		sales_order.append("items", {
			"item_code": cart_item['item_code'],
			"item_name": cart_item['item_name'],
			"qty": cart_item['qty'],
			"rate": cart_item['rate'],
			"amount": cart_item['qty'] * cart_item['rate']
		})
	
	# Add delivery information to proper Sales Order fields
	if delivery_info.get('address'):
		sales_order.shipping_address = delivery_info['address']
	
	if delivery_info.get('phone'):
		sales_order.contact_mobile = delivery_info['phone']
	
	if delivery_info.get('notes'):
		sales_order.terms = delivery_info['notes']
	
	# Add delivery information as additional notes
	delivery_notes = []
	if delivery_info.get('address'):
		delivery_notes.append(f"Delivery Address: {delivery_info['address']}")
	if delivery_info.get('phone'):
		delivery_notes.append(f"Contact Phone: {delivery_info['phone']}")
	if delivery_info.get('notes'):
		delivery_notes.append(f"Delivery Notes: {delivery_info['notes']}")
	
	if delivery_notes:
		sales_order.terms = (sales_order.terms or "") + "\n" + "\n".join(delivery_notes)
	
	# Save Sales Order
	sales_order.flags.ignore_permissions = True
	sales_order.insert()
	sales_order.submit()
	
	# Clear cart after successful order
	clear_cart_items()
	
	return {
		"message": "Order created successfully",
		"sales_order": {
			"name": sales_order.name,
			"status": sales_order.status,
			"total": sales_order.total,
			"grand_total": sales_order.grand_total,
			"customer": sales_order.customer,
			"customer_name": sales_order.customer_name,
			"transaction_date": sales_order.transaction_date,
			"delivery_date": sales_order.delivery_date
		}
	}


def create_or_get_customer(customer_info):
	"""Create or get customer based on contact information."""
	
	# For guest users, use a simplified approach
	if frappe.session.user == "Guest":
		# Use a default customer for guest orders
		customer_name = customer_info.get('name', 'Guest Customer')
		phone = customer_info.get('phone', '')
		email = customer_info.get('email', '')
		
		# Try to find existing guest customer with same contact info
		customer = frappe.db.get_value(
			"Customer",
			{
				"customer_name": customer_name,
				"mobile_no": phone,
				"email_id": email
			},
			"name"
		)
		
		if customer:
			return frappe.get_doc("Customer", customer)
		else:
			# Create a simple guest customer record
			customer_doc = frappe.new_doc("Customer")
			customer_doc.customer_name = customer_name
			customer_doc.customer_type = "Individual"
			customer_doc.mobile_no = phone
			customer_doc.email_id = email
			customer_doc.customer_group = "Individual"
			
			customer_doc.flags.ignore_permissions = True
			customer_doc.insert()
			return customer_doc
	else:
		# For authenticated users, use the original logic
		customer = None
		
		if customer_info.get('email'):
			customer = frappe.db.get_value(
				"Customer",
				{"email_id": customer_info['email']},
				"name"
			)
		
		if not customer and customer_info.get('phone'):
			customer = frappe.db.get_value(
				"Customer",
				{"mobile_no": customer_info['phone']},
				"name"
			)
		
		if customer:
			# Update existing customer with new info
			customer_doc = frappe.get_doc("Customer", customer)
			if customer_info.get('name') and not customer_doc.customer_name:
				customer_doc.customer_name = customer_info['name']
			if customer_info.get('phone') and not customer_doc.mobile_no:
				customer_doc.mobile_no = customer_info['phone']
			if customer_info.get('email') and not customer_doc.email_id:
				customer_doc.email_id = customer_info['email']
			
			customer_doc.save()
			return customer_doc
		else:
			# Create new customer
			customer_doc = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": customer_info.get('name', 'Guest Customer'),
				"customer_type": "Individual",
				"mobile_no": customer_info.get('phone'),
				"email_id": customer_info.get('email'),
				"customer_group": "Individual"
			})
			
			customer_doc.insert()
			return customer_doc


@frappe.whitelist(allow_guest=True)
def get_order(order_id):
	"""Get order details by ID."""
	if not order_id:
		frappe.throw("Order ID is required")
	
	try:
		sales_order = frappe.get_doc("Sales Order", order_id)
		
		return {
			"order": {
				"name": sales_order.name,
				"status": sales_order.status,
				"customer": sales_order.customer,
				"transaction_date": sales_order.transaction_date,
				"delivery_date": sales_order.delivery_date,
				"total": sales_order.total,
				"grand_total": sales_order.grand_total,
				"items": [
					{
						"item_code": item.item_code,
						"item_name": item.item_name,
						"qty": item.qty,
						"rate": item.rate,
						"amount": item.amount
					}
					for item in sales_order.items
				],
				"notes": sales_order.notes
			}
		}
	except frappe.DoesNotExistError:
		frappe.throw("Order not found")


@frappe.whitelist(allow_guest=True)
def get_order_status(order_id):
	"""Get order status by ID."""
	if not order_id:
		frappe.throw("Order ID is required")
	
	try:
		status = frappe.db.get_value("Sales Order", order_id, "status")
		return {"order_id": order_id, "status": status}
	except:
		frappe.throw("Order not found")

