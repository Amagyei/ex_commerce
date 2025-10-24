# Copyright (c) 2025, Nana Kwame Amagyei and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExCommerceSalesOrder(Document):
	def validate(self):
		"""Validate and perform customer lookup"""
		self.check_existing_customer()
	
	def check_existing_customer(self):
		"""Check if customer exists by phone number and log result"""
		if not self.guest_phone:
			return
		
		# Look up customer by phone number in multiple places
		existing_customer = self.find_customer_by_phone(self.guest_phone)
		
		if existing_customer:
			# Customer exists - log and suggest assignment
			frappe.msgprint(
				f"✅ Customer found: {existing_customer.customer_name} ({existing_customer.name})",
				alert=True
			)
			frappe.logger().info(f"Customer lookup by phone {self.guest_phone}: FOUND - {existing_customer.name}")
			
			# Auto-assign customer if not already assigned
			if not self.customer:
				self.customer = existing_customer.name
				self.customer_name = existing_customer.customer_name
				frappe.msgprint(f"Customer automatically assigned to order")
		else:
			# Customer doesn't exist - log and suggest creation
			frappe.msgprint(
				f"❌ No customer found with phone number: {self.guest_phone}",
				alert=True
			)
			frappe.logger().info(f"Customer lookup by phone {self.guest_phone}: NOT FOUND")
			
			# Suggest creating customer from guest info
			frappe.msgprint(
				f"💡 Tip: Use 'Create Customer from Guest Info' button to create new customer",
				alert=True
			)
	
	def find_customer_by_phone(self, phone_number):
		"""Find customer by phone number in Customer, Contact, and Address doctypes"""
		try:
			frappe.logger().info(f"🔍 Starting customer lookup for phone: {phone_number}")
			
			# 1. Check Customer.mobile_no directly
			customer = frappe.db.get_value(
				"Customer", 
				{"mobile_no": phone_number}, 
				["name", "customer_name", "email_id"],
				as_dict=True
			)
			if customer:
				frappe.logger().info(f"✅ Customer found via Customer.mobile_no: {customer.name}")
				return customer
			else:
				frappe.logger().info(f"❌ No customer found via Customer.mobile_no")
			
			# 2. Check Contact.mobile_no and Contact.phone using Dynamic Link
			contact_customer = frappe.db.sql("""
				SELECT DISTINCT c.name, c.customer_name, c.email_id
				FROM `tabCustomer` c
				INNER JOIN `tabContact` co ON co.name IN (
					SELECT dl.parent 
					FROM `tabDynamic Link` dl 
					WHERE dl.link_doctype = 'Customer' 
					AND dl.link_name = c.name
					AND dl.parenttype = 'Contact'
				)
				WHERE (co.mobile_no = %s OR co.phone = %s)
				LIMIT 1
			""", (phone_number, phone_number), as_dict=True)
			
			if contact_customer:
				frappe.logger().info(f"✅ Customer found via Contact: {contact_customer[0].name}")
				return contact_customer[0]
			else:
				frappe.logger().info(f"❌ No customer found via Contact")
			
			# 3. Check Address.phone using Dynamic Link
			address_customer = frappe.db.sql("""
				SELECT DISTINCT c.name, c.customer_name, c.email_id
				FROM `tabCustomer` c
				INNER JOIN `tabAddress` a ON a.name IN (
					SELECT dl.parent 
					FROM `tabDynamic Link` dl 
					WHERE dl.link_doctype = 'Customer' 
					AND dl.link_name = c.name
					AND dl.parenttype = 'Address'
				)
				WHERE a.phone = %s
				LIMIT 1
			""", (phone_number,), as_dict=True)
			
			if address_customer:
				frappe.logger().info(f"✅ Customer found via Address: {address_customer[0].name}")
				return address_customer[0]
			else:
				frappe.logger().info(f"❌ No customer found via Address")
			
			# 4. No customer found
			frappe.logger().info(f"❌ No customer found for phone: {phone_number}")
			return None
			
		except Exception as e:
			frappe.log_error(f"Error in find_customer_by_phone: {str(e)}")
			return None
	
	@frappe.whitelist()
	def test_phone_lookup(self, phone_number):
		"""Test method to debug phone lookup"""
		try:
			frappe.msgprint(f"🔍 Testing phone lookup for: {phone_number}")
			
			# Test 1: Direct customer lookup
			customer = frappe.db.get_value("Customer", {"mobile_no": phone_number}, "name")
			frappe.msgprint(f"Customer.mobile_no lookup: {customer or 'Not found'}")
			
			# Test 2: Contact lookup
			contacts = frappe.db.sql("""
				SELECT name, mobile_no, phone, full_name
				FROM `tabContact` 
				WHERE mobile_no = %s OR phone = %s
			""", (phone_number, phone_number), as_dict=True)
			frappe.msgprint(f"Contact lookup: {len(contacts)} contacts found")
			for contact in contacts:
				frappe.msgprint(f"  - {contact.name}: mobile={contact.mobile_no}, phone={contact.phone}")
			
			# Test 3: Address lookup
			addresses = frappe.db.sql("""
				SELECT name, phone, address_line1
				FROM `tabAddress` 
				WHERE phone = %s
			""", (phone_number,), as_dict=True)
			frappe.msgprint(f"Address lookup: {len(addresses)} addresses found")
			for address in addresses:
				frappe.msgprint(f"  - {address.name}: phone={address.phone}")
			
			# Test 4: Dynamic links
			dynamic_links = frappe.db.sql("""
				SELECT parent, link_doctype, link_name, parenttype
				FROM `tabDynamic Link` 
				WHERE link_doctype = 'Customer'
			""", as_dict=True)
			frappe.msgprint(f"Dynamic links: {len(dynamic_links)} total links found")
			
			return {"success": True, "message": "Test completed - check messages"}
			
		except Exception as e:
			frappe.msgprint(f"Test error: {str(e)}", alert=True)
			return {"success": False, "error": str(e)}
	
	@frappe.whitelist()
	def create_customer_from_guest(self):
		"""JavaScript Action: Create Customer from Guest Info"""
		try:
			if not self.guest_name or not self.guest_email:
				frappe.throw("Guest name and email are required to create customer")
			
			# Check if customer already exists by email
			existing_customer = frappe.db.get_value(
				"Customer", 
				{"email_id": self.guest_email}, 
				"name"
			)
			
			if existing_customer:
				self.customer = existing_customer
				self.customer_name = frappe.db.get_value("Customer", existing_customer, "customer_name")
				self.save()
				frappe.msgprint(f"Customer '{self.customer_name}' already exists and has been assigned")
				return {"success": True, "customer": existing_customer}
			
			# Create new customer
			customer = frappe.new_doc("Customer")
			customer.customer_name = self.guest_name
			customer.customer_type = "Individual"
			customer.customer_group = self.get_default_customer_group()
			customer.territory = self.get_default_territory()
			customer.email_id = self.guest_email
			customer.mobile_no = self.guest_phone
			customer.save()
			
			# Create contact to ensure data consistency
			self.create_customer_contact(customer.name)
			
			# Create addresses
			self.create_customer_addresses(customer.name)
			
			# Assign customer to order
			self.customer = customer.name
			self.customer_name = customer.customer_name
			self.save()
			
			frappe.msgprint(f"Customer '{customer.customer_name}' created and assigned successfully")
			return {"success": True, "customer": customer.name}
			
		except Exception as e:
			frappe.msgprint(f"Error creating customer: {str(e)}", alert=True)
			return {"success": False, "error": str(e)}
	
	@frappe.whitelist()
	def create_erpnext_sales_order(self):
		"""JavaScript Action: Create ERPNext Sales Order"""
		try:
			if not self.customer:
				frappe.throw("Customer must be assigned before creating ERPNext Sales Order")
			
			if self.erpnext_sales_order:
				frappe.msgprint(f"ERPNext Sales Order '{self.erpnext_sales_order}' already exists")
				return {"success": True, "sales_order": self.erpnext_sales_order}
			
			# Create ERPNext Sales Order
			so = frappe.new_doc("Sales Order")
			so.customer = self.customer
			so.customer_name = self.customer_name
			so.transaction_date = self.transaction_date
			so.delivery_date = self.delivery_date
			so.company = self.company
			so.currency = self.currency
			so.selling_price_list = self.selling_price_list
			so.order_type = self.order_type
			so.po_no = self.po_no
			so.po_date = self.po_date
			
			# Set addresses
			if self.guest_billing_address:
				so.customer_address = self.get_customer_address("Billing")
			if self.guest_shipping_address:
				so.shipping_address_name = self.get_customer_address("Shipping")
			
			# Copy items
			for item in self.items:
				so.append("items", {
					"item_code": item.item_code,
					"item_name": item.item_name,
					"qty": item.qty,
					"rate": item.rate,
					"amount": item.amount,
					"warehouse": item.warehouse or self.set_warehouse
				})
			
			# Copy taxes
			if self.taxes:
				for tax in self.taxes:
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
			self.erpnext_sales_order = so.name
			self.save()
			
			frappe.msgprint(f"ERPNext Sales Order '{so.name}' created and submitted successfully")
			return {"success": True, "sales_order": so.name}
			
		except Exception as e:
			frappe.msgprint(f"Error creating ERPNext Sales Order: {str(e)}", alert=True)
			return {"success": False, "error": str(e)}
	
	def get_default_customer_group(self):
		"""Get default customer group"""
		try:
			customer_group = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
			if customer_group:
				return customer_group
			
			if frappe.db.exists("Customer Group", "All Customer Groups"):
				return "All Customer Groups"
			
			frappe.msgprint("No Customer Group found. Please create one first.", alert=True)
			return None
			
		except Exception as e:
			frappe.log_error(f"Error getting default customer group: {str(e)}")
			return None
	
	def get_default_territory(self):
		"""Get default territory"""
		try:
			territory = frappe.db.get_value("Territory", {"is_group": 0}, "name")
			if territory:
				return territory
			
			if frappe.db.exists("Territory", "All Territories"):
				return "All Territories"
			
			frappe.msgprint("No Territory found. Please create one first.", alert=True)
			return None
			
		except Exception as e:
			frappe.log_error(f"Error getting default territory: {str(e)}")
			return None
	
	def create_customer_addresses(self, customer_name):
		"""Create billing and shipping addresses for customer"""
		try:
			# Create billing address
			if self.guest_billing_address:
				billing_address = frappe.new_doc("Address")
				billing_address.address_title = f"{self.guest_name} - Billing"
				billing_address.address_line1 = self.guest_billing_address
				billing_address.address_type = "Billing"
				billing_address.is_primary_address = 1
				billing_address.phone = self.guest_phone
				billing_address.email_id = self.guest_email
				billing_address.links = [{"link_doctype": "Customer", "link_name": customer_name}]
				billing_address.save()
				
				# Update customer with primary address
				frappe.db.set_value("Customer", customer_name, "customer_primary_address", billing_address.name)
			
			# Create shipping address if different from billing
			if (self.guest_shipping_address and 
				self.guest_shipping_address != self.guest_billing_address):
				
				shipping_address = frappe.new_doc("Address")
				shipping_address.address_title = f"{self.guest_name} - Shipping"
				shipping_address.address_line1 = self.guest_shipping_address
				shipping_address.address_type = "Shipping"
				shipping_address.phone = self.guest_phone
				shipping_address.email_id = self.guest_email
				shipping_address.links = [{"link_doctype": "Customer", "link_name": customer_name}]
				shipping_address.save()
				
		except Exception as e:
			frappe.log_error(f"Error creating addresses for customer {customer_name}: {str(e)}")
	
	def get_customer_address(self, address_type):
		"""Get customer address by type"""
		addresses = frappe.get_all(
			"Address",
			filters={
				"link_doctype": "Customer",
				"link_name": self.customer,
				"address_type": address_type
			},
			fields=["name"],
			limit=1
		)
		return addresses[0].name if addresses else None
	
	def create_customer_contact(self, customer_name):
		"""Create contact for customer to ensure data consistency"""
		try:
			contact = frappe.new_doc("Contact")
			contact.first_name = self.guest_name.split()[0] if self.guest_name else ""
			contact.last_name = " ".join(self.guest_name.split()[1:]) if len(self.guest_name.split()) > 1 else ""
			contact.full_name = self.guest_name
			contact.email_id = self.guest_email
			contact.mobile_no = self.guest_phone
			contact.phone = self.guest_phone
			contact.is_primary_contact = 1
			contact.status = "Passive"
			
			# Link to customer
			contact.append("links", {
				"link_doctype": "Customer",
				"link_name": customer_name,
				"link_title": customer_name
			})
			
			contact.save()
			frappe.logger().info(f"Contact created for customer: {customer_name}")
			
		except Exception as e:
			frappe.log_error(f"Error creating contact for customer {customer_name}: {str(e)}")
