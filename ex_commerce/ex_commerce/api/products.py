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
	# Frontend-based pagination: fetch all matching items
	# Keep the params for compatibility but do not apply server-side limit/offset
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
		"has_variants",
		"variant_of",
	]

	items = frappe.db.sql(
		f"""
			select {', '.join(fields)}
			from `tabItem`
			where {where_sql}
			order by modified desc
		""",
		params,
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

	# Collect template codes to compute variant summaries (min_price, count, first image)
	template_codes = [it.get("item_code") for it in items if int(it.get("has_variants") or 0) == 1]
	variant_min_price = {}
	variant_max_price = {}
	variant_count = {}
	variant_first_image = {}

	# Also gather variants present so we can include their template even if template wasn't in the initial list
	templates_from_variants = set()

	if template_codes or True:
		# Fetch variants for these templates
		variant_rows = frappe.db.sql(
			"""
			select item_code, variant_of, image
			from `tabItem`
			where disabled = 0 and is_sales_item = 1
			""",
			{},
			as_dict=True,
		)

		variant_codes = [v.item_code for v in variant_rows if v.get("item_code")]
		templates_from_variants = {v.variant_of for v in variant_rows if v.get("variant_of")}

		# Final set of templates to summarize (those already listed as templates or appearing via variants)
		all_template_codes = set(template_codes) | set(t for t in templates_from_variants if t)

		variant_prices = {}
		if variant_codes:
			v_price_rows = frappe.db.sql(
				"""
				select item_code, price_list_rate as price
				from `tabItem Price`
				where item_code in %(codes)s and selling = 1
				order by creation desc
				""",
				{"codes": tuple(variant_codes)},
				as_dict=True,
			)
			for r in v_price_rows:
				variant_prices.setdefault(r.item_code, r.price)

		# Aggregate per template
		for v in variant_rows:
			tpl = v.get("variant_of")
			if not tpl:
				continue
			price_v = float(variant_prices.get(v.item_code) or 0) or 0.0
			# count
			variant_count[tpl] = (variant_count.get(tpl) or 0) + 1
			# min/max
			if price_v > 0:
				prev_min = variant_min_price.get(tpl)
				prev_max = variant_max_price.get(tpl)
				variant_min_price[tpl] = price_v if prev_min is None else min(prev_min, price_v)
				variant_max_price[tpl] = price_v if prev_max is None else max(prev_max, price_v)
			# first image fallback
			if not variant_first_image.get(tpl) and v.get("image"):
				variant_first_image[tpl] = v.get("image")

	# Ensure templates that exist only via variants are added to items
	if templates_from_variants:
		missing_templates = [t for t in templates_from_variants if t and t not in {i.item_code for i in items}]
		if missing_templates:
			template_rows = frappe.db.sql(
				"""
				select name, item_code, item_name, image as image, description, brand, item_group as category, has_variants, variant_of
				from `tabItem`
				where disabled = 0 and is_sales_item = 1 and item_code in %(codes)s
				""",
				{"codes": tuple(missing_templates)},
				as_dict=True,
			)
			items.extend(template_rows)

	products = []
	for it in items:
		code = it.get("item_code")
		# Skip rendering variants as separate products; variants are summarized under their template
		if it.get("variant_of"):
			continue
		p = float(prices.get(code) or 0)

		is_template = int(it.get("has_variants") or 0) == 1
		tpl_min = variant_min_price.get(code)
		tpl_max = variant_max_price.get(code)
		tpl_count = variant_count.get(code) or 0
		tpl_first_img = variant_first_image.get(code)

		# Choose primary image: template image, else first variant image
		primary_image = it.get("image") or (tpl_first_img if is_template else None)

		prod = {
			"name": it.get("name"),
			"item_code": code,
			"item_name": it.get("item_name"),
			"description": it.get("description"),
			"image": primary_image,
			"price": (p if p > 0 else None) if not is_template else None,
			"formatted_price": (f"{p:,.2f}" if p > 0 else None) if not is_template else None,
			"in_stock": True,  # All items available for ordering
			"category": it.get("category"),
			"brand": it.get("brand"),
			"has_variants": int(it.get("has_variants") or 0),
		}

		if is_template:
			if tpl_min is not None:
				prod["min_price"] = float(tpl_min)
			if tpl_max is not None:
				prod["max_price"] = float(tpl_max)
			prod["variant_count"] = int(tpl_count)
			if tpl_first_img:
				prod["first_available_variant_image"] = tpl_first_img

		products.append(prod)

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
			"limit": len(products),
			"offset": 0,
			"total": total,
			"has_more": False,
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
			"has_variants",
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

	response_product = {
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
		"has_variants": int(row.has_variants or 0),
	}

	# If this is a template with variants, include a variants array (lightweight)
	variants_list = []
	if int(row.has_variants or 0) == 1:
		variant_rows = frappe.db.sql(
			"""
			select item_code, item_name, description, image
			from `tabItem`
			where disabled = 0 and is_sales_item = 1 and variant_of = %(tpl)s
			order by item_name asc
			""",
			{"tpl": row.item_code},
			as_dict=True,
		)

		if variant_rows:
			v_codes = tuple(v.item_code for v in variant_rows)
			v_prices = {}
			if v_codes:
				price_rows = frappe.db.sql(
					"""
					select item_code, price_list_rate as price
					from `tabItem Price`
					where item_code in %(codes)s and selling = 1
					order by creation desc
					""",
					{"codes": v_codes},
					as_dict=True,
				)
				for pr in price_rows:
					v_prices.setdefault(pr.item_code, pr.price)

			for v in variant_rows:
				vp = float(v_prices.get(v.item_code) or 0) or 0.0
				variants_list.append(
					{
						"item_code": v.item_code,
						"item_name": v.item_name,
						"description": v.description,
						"image": v.image,
						"price": vp if vp > 0 else None,
						"formatted_price": f"{vp:,.2f}" if vp > 0 else None,
					}
				)

	if variants_list:
		response_product["variants"] = variants_list

	return {
		"product": response_product,
	}


