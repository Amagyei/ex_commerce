import frappe
from frappe import _
from frappe.utils import get_request_session
import json


# CSRF validation is working correctly now
# def skip_csrf_for_guest():
# 	if frappe.session.user == "Guest":
# 		frappe.local.flags.disable_csrf = True


def get_guest_cart_id():
	"""Generate a unique cart ID for guest users based on session."""
	# For guest users, use IP address for a stable identifier
	ip_address = frappe.local.request.environ.get('REMOTE_ADDR', 'unknown')
	user_agent = frappe.local.request.environ.get('HTTP_USER_AGENT', 'unknown')[:50]
	# Create a hash of IP for consistency
	import hashlib
	identifier = hashlib.md5(ip_address.encode()).hexdigest()[:12]
	cart_id = f"guest_cart_{identifier}"
	frappe.logger().info(f"GET_GUEST_CART_ID: IP: {ip_address}, User Agent: {user_agent}, Cart ID: {cart_id}")
	return cart_id


def get_cart_items():
	"""Get cart items from cache for guest users."""
	if frappe.session.user == "Guest":
		cart_id = get_guest_cart_id()
		cart_data = frappe.cache().get_value(cart_id) or []
		frappe.logger().info(f"GET_CART_ITEMS: Guest user - Cart ID: {cart_id}, Retrieved: {len(cart_data)} items")
		return cart_data
	else:
		cart_data = frappe.session.get('cart_items', [])
		frappe.logger().info(f"GET_CART_ITEMS: Authenticated user - Retrieved: {len(cart_data)} items from session")
		return cart_data


def save_cart_items(cart_items):
	"""Save cart items to cache for guest users."""
	if frappe.session.user == "Guest":
		cart_id = get_guest_cart_id()
		frappe.cache().set_value(cart_id, cart_items, expires_in_sec=3600)  # 1 hour
		frappe.logger().info(f"SAVE_CART_ITEMS: Guest user - Cart ID: {cart_id}, Saved: {len(cart_items)} items")
	else:
		frappe.session['cart_items'] = cart_items
		frappe.logger().info(f"SAVE_CART_ITEMS: Authenticated user - Saved: {len(cart_items)} items to session")


@frappe.whitelist(allow_guest=True)
def get_cart():
	"""Get current cart items from session."""
	cart_id = get_guest_cart_id()
	cart_items = get_cart_items()
	
	frappe.logger().info(f"GET_CART: Cart ID: {cart_id}")
	frappe.logger().info(f"GET_CART: Retrieved {len(cart_items)} items from cart")
	frappe.logger().info(f"GET_CART: Cart items: {cart_items}")
	
	response = {"cart_items": cart_items, "total_items": len(cart_items)}
	frappe.logger().info(f"GET_CART: Response: {response}")
	
	return response


@frappe.whitelist(allow_guest=True)
def add_to_cart(item_code, qty=1):
	"""Add item to cart."""
	frappe.logger().info(f"ADD_TO_CART: Starting - item_code: {item_code}, qty: {qty}")
	
	if not item_code:
		frappe.throw("Item code is required")
	
	# Validate item exists and is sellable
	item = frappe.db.get_value(
		"Item",
		{"item_code": item_code, "disabled": 0, "is_sales_item": 1},
		["item_code", "item_name", "item_group"],
		as_dict=True
	)
	
	if not item:
		frappe.logger().error(f"ADD_TO_CART: Item not found - item_code: {item_code}")
		frappe.throw("Product not found or not available")
	
	frappe.logger().info(f"ADD_TO_CART: Item found - {item}")
	
	# Get price
	price = frappe.db.get_value(
		"Item Price",
		{"item_code": item_code, "selling": 1},
		"price_list_rate"
	) or 0
	
	qty = max(1, int(qty) if qty else 1)
	
	# Get current cart
	cart_items = get_cart_items()
	cart_id = get_guest_cart_id()
	frappe.logger().info(f"ADD_TO_CART: Current cart ID: {cart_id}, existing items: {len(cart_items)}")
	
	# Check if item already in cart
	existing_item = None
	for i, cart_item in enumerate(cart_items):
		if cart_item['item_code'] == item_code:
			existing_item = i
			break
	
	if existing_item is not None:
		# Update quantity
		old_qty = cart_items[existing_item]['qty']
		cart_items[existing_item]['qty'] += qty
		cart_items[existing_item]['amount'] = cart_items[existing_item]['qty'] * cart_items[existing_item]['rate']
		frappe.logger().info(f"ADD_TO_CART: Updated existing item - {item_code}: {old_qty} -> {cart_items[existing_item]['qty']}")
	else:
		# Add new item
		new_item = {
			'item_code': item_code,
			'item_name': item.item_name,
			'item_group': item.item_group,
			'qty': qty,
			'rate': float(price),
			'amount': qty * float(price)
		}
		cart_items.append(new_item)
		frappe.logger().info(f"ADD_TO_CART: Added new item - {new_item}")
	
	# Save cart items
	save_cart_items(cart_items)
	frappe.logger().info(f"ADD_TO_CART: Cart saved - total items: {len(cart_items)}")
	
	response = {
		"message": f"{item.item_name} added to cart",
		"cart_items": cart_items,
		"total_items": len(cart_items)
	}
	
	frappe.logger().info(f"ADD_TO_CART: Success response - {response}")
	return response


@frappe.whitelist(allow_guest=True)
def update_cart(item_code, qty):
	"""Update item quantity in cart."""
	if not item_code or not qty:
		frappe.throw("Item code and quantity are required")
	
	qty = max(0, int(qty))
	cart_items = get_cart_items()
	
	# Find and update item
	for cart_item in cart_items:
		if cart_item['item_code'] == item_code:
			if qty == 0:
				# Remove item
				cart_items.remove(cart_item)
			else:
				# Update quantity
				cart_item['qty'] = qty
				cart_item['amount'] = qty * cart_item['rate']
			break
	else:
		frappe.throw("Item not found in cart")
	
	# Save cart items
	save_cart_items(cart_items)
	
	return {
		"message": "Cart updated",
		"cart_items": cart_items,
		"total_items": len(cart_items)
	}


@frappe.whitelist(allow_guest=True)
def remove_from_cart(item_code):
	"""Remove item from cart."""
	if not item_code:
		frappe.throw("Item code is required")
	
	cart_items = get_cart_items()
	
	# Find and remove item
	for cart_item in cart_items:
		if cart_item['item_code'] == item_code:
			cart_items.remove(cart_item)
			break
	else:
		frappe.throw("Item not found in cart")
	
	# Save cart items
	save_cart_items(cart_items)
	
	return {
		"message": "Item removed from cart",
		"cart_items": cart_items,
		"total_items": len(cart_items)
	}


@frappe.whitelist(allow_guest=True)
def clear_cart():
	"""Clear all items from cart."""
	save_cart_items([])
	return {"message": "Cart cleared", "cart_items": [], "total_items": 0}


@frappe.whitelist(allow_guest=True)
def debug_cart():
	"""Debug endpoint to see cart storage details."""
	cart_id = get_guest_cart_id()
	cart_items = get_cart_items()
	
	# Check what's in cache
	cache_data = frappe.cache().get_value(cart_id)
	
	return {
		"cart_id": cart_id,
		"cart_items": cart_items,
		"total_items": len(cart_items),
		"session_user": frappe.session.user,
		"ip_address": frappe.local.request.environ.get('REMOTE_ADDR', 'unknown'),
		"user_agent": frappe.local.request.environ.get('HTTP_USER_AGENT', 'unknown')[:50],
		"cache_data": cache_data,
		"cache_keys": list(frappe.cache().get_keys(pattern="guest_cart_*")) if hasattr(frappe.cache(), 'get_keys') else "Cache keys not available"
	}


@frappe.whitelist(allow_guest=True)
def test_session():
	"""Test endpoint to check session consistency."""
	return {
		"session_user": frappe.session.user,
		"session_id": frappe.session.get('sid'),
		"ip_address": frappe.local.request.environ.get('REMOTE_ADDR', 'unknown'),
		"user_agent": frappe.local.request.environ.get('HTTP_USER_AGENT', 'unknown'),
		"headers": dict(frappe.local.request.headers),
		"cart_id": get_guest_cart_id()
	}
