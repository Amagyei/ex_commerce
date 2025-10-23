import frappe


def _coerce_int(value, default, min_v, max_v):
	try:
		v = int(value)
		return max(min_v, min(v, max_v))
	except Exception:
		return default


@frappe.whitelist(allow_guest=True)
def get_products(limit=20, offset=0, search=None, category=None):
	"""Public (guest-allowed) product listing with pagination and optional filters.

	Returns a curated, safe projection of Item fields plus best-effort price and stock.
	"""
	limit = _coerce_int(limit, 20, 1, 50)
	offset = _coerce_int(offset, 0, 0, 10_000)

	# Basic filters: only enabled, sellable items (publication flag may vary by version)
	conditions = [
		"disabled = 0",
		"is_sales_item = 1",
	]
	params = {}

	if category:
		conditions.append("item_group = %(category)s")
		params["category"] = category

	if search and isinstance(search, str):
		q = search.strip()
		if q:
			# Guard excessive length
			q = q[:64]
			conditions.append("(item_name like %(q)s or item_code like %(q)s)")
			params["q"] = f"%{q}%"

	where_sql = " and ".join(conditions)

	fields = [
		"name",
		"item_code",
		"item_name",
		"image as image",
		"description",
		"brand",
		"item_group as category",
	]

	items = frappe.db.sql(
		f"""
			select {', '.join(fields)}
			from `tabItem`
			where {where_sql}
			order by modified desc
			limit %(limit)s offset %(offset)s
		""",
		{**params, "limit": limit, "offset": offset},
		as_dict=True,
	)

	item_codes = [i.item_code for i in items if i.get("item_code")]

	prices = {}
	if item_codes:
		price_rows = frappe.db.sql(
			"""
			select item_code, price_list_rate as price
			from `tabItem Price`
			where item_code in %(codes)s and selling = 1
			order by creation desc
		""",
			{"codes": tuple(item_codes)},
			as_dict=True,
		)
		for row in price_rows:
			# keep first seen (latest by creation due to order)
			prices.setdefault(row.item_code, row.price)

	# Stock not relevant for order-based system
	# All items are available for ordering

	products = []
	for it in items:
		code = it.get("item_code")
		p = float(prices.get(code) or 0)
		products.append(
			{
				"name": it.get("name"),
				"item_code": code,
				"item_name": it.get("item_name"),
				"description": it.get("description"),
				"image": it.get("image"),
				"price": p if p > 0 else None,
				"formatted_price": f"{p:,.2f}" if p > 0 else None,
				"in_stock": True,  # All items available for ordering
				"category": it.get("category"),
				"brand": it.get("brand"),
			}
		)

	(total,) = frappe.db.sql(
		f"""
			select count(1) as c
			from `tabItem`
			where {where_sql}
		""",
		params,
	)[0]

	return {
		"products": products,
		"pagination": {
			"limit": limit,
			"offset": offset,
			"total": total,
			"has_more": (offset + len(products)) < total,
		},
	}


@frappe.whitelist(allow_guest=True)
def get_product(item_code: str):
	"""Public (guest-allowed) single product details with price and stock."""
	if not item_code or len(item_code) > 64:
		frappe.throw("Invalid item_code")

	row = frappe.db.get_value(
		"Item",
		{
			"item_code": item_code,
			"disabled": 0,
			"is_sales_item": 1,
		},
		[
			"name",
			"item_code",
			"item_name",
			"image",
			"description",
			"brand",
			"item_group",
		],
		as_dict=True,
	)

	if not row:
		frappe.throw("Product not found")

	price = frappe.db.get_value(
		"Item Price",
		{"item_code": item_code, "selling": 1},
		"price_list_rate",
	) or 0

	price_f = float(price) or 0.0

	return {
		"product": {
			"name": row.name,
			"item_code": row.item_code,
			"item_name": row.item_name,
			"description": row.description,
			"image": row.image,
			"price": price_f if price_f > 0 else None,
			"formatted_price": f"{price_f:,.2f}" if price_f > 0 else None,
			"in_stock": True,  # All items available for ordering
			"category": row.item_group,
			"brand": row.brand,
		},
	}


