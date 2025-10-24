import frappe
from frappe import _
from frappe.utils import nowdate, add_days


# CSRF validation is now properly handled through guest session establishment
# No need to skip CSRF validation - guest users get proper CSRF tokens


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
	
	# Get default company, currency, and price list
	default_company = frappe.get_single_value("Global Defaults", "default_company")
	default_currency = frappe.get_single_value("Global Defaults", "default_currency")
	default_price_list = frappe.get_single_value("Selling Settings", "selling_price_list")
	
	# Ensure we have valid email and phone values
	guest_email = customer_info.get('email') or 'guest@example.com'
	guest_phone = customer_info.get('phone') or '000-000-0000'
	# Create Ex Commerce Sales Order with proper field mapping
	ex_commerce_order = frappe.get_doc({
		"doctype": "Ex Commerce Sales Order",
		"naming_series": "EXC-ORD-.YYYY.-",  # Set explicit naming series
		"guest_name": customer_info.get('name', 'Guest Customer'),
		"guest_email": customer_info.get('email', 'guest@example.com'),  # Required field
		"guest_phone": customer_info.get('phone', '000-000-0000'),  # Required field
		"transaction_date": nowdate(),
		"delivery_date": add_days(nowdate(), 7),  # Default 7 days delivery
		"company": default_company,
		"currency": default_currency,
		"conversion_rate": 1.0,  # Required field - default to 1 for same currency
		"selling_price_list": default_price_list,
		"price_list_currency": default_currency,  # Required field
		"plc_conversion_rate": 1.0,  # Required field - price list conversion rate
		"order_type": "Sales",
		"status": "Draft",
		"items": []
	})
	
	# Set guest information after document creation
	ex_commerce_order.guest_email = guest_email
	ex_commerce_order.guest_phone = guest_phone
	
	# Add cart items to Ex Commerce Sales Order with proper field mapping
	for cart_item in cart_items:
		# Get item details for required fields
		item_doc = frappe.get_doc("Item", cart_item['item_code'])
		
		ex_commerce_order.append("items", {
			"item_code": cart_item['item_code'],
			"item_name": cart_item['item_name'],
			"qty": cart_item['qty'],
			"rate": cart_item['rate'],
			"amount": cart_item['qty'] * cart_item['rate'],
			"uom": item_doc.stock_uom,  # Required field - get from Item
			"conversion_factor": 1.0,  # Required field - default to 1
			"stock_uom": item_doc.stock_uom,
			"warehouse": frappe.get_single_value("Stock Settings", "default_warehouse") or ""
		})
	
	# Add delivery information to proper Ex Commerce Sales Order fields
	if delivery_info.get('address'):
		ex_commerce_order.guest_billing_address = delivery_info['address']
	
	if delivery_info.get('phone'):
		# Update guest phone if different from customer phone
		if delivery_info['phone'] != customer_info.get('phone', ''):
			ex_commerce_order.guest_phone = delivery_info['phone']
	
	if delivery_info.get('notes'):
		ex_commerce_order.terms = delivery_info['notes']
	
	# Add delivery information as additional notes
	delivery_notes = []
	if delivery_info.get('address'):
		delivery_notes.append(f"Delivery Address: {delivery_info['address']}")
	if delivery_info.get('phone'):
		delivery_notes.append(f"Contact Phone: {delivery_info['phone']}")
	if delivery_info.get('notes'):
		delivery_notes.append(f"Delivery Notes: {delivery_info['notes']}")
	
	if delivery_notes:
		ex_commerce_order.terms = (ex_commerce_order.terms or "") + "\n" + "\n".join(delivery_notes)
	
	# Save Ex Commerce Sales Order
	ex_commerce_order.flags.ignore_permissions = True
	ex_commerce_order.insert()
	ex_commerce_order.submit()
	
	# Clear cart after successful order
	clear_cart_items()
	
	return {
		"message": "Order created successfully",
		"ex_commerce_sales_order": {
			"name": ex_commerce_order.name,
			"status": ex_commerce_order.status,
			"total": ex_commerce_order.total,
			"grand_total": ex_commerce_order.grand_total,
			"guest_name": ex_commerce_order.guest_name,
			"guest_email": ex_commerce_order.guest_email,
			"guest_phone": ex_commerce_order.guest_phone,
			"transaction_date": ex_commerce_order.transaction_date,
			"delivery_date": ex_commerce_order.delivery_date
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

