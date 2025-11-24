from datetime import datetime

from agent.mocks.repositories import order_repo, customer_repo


def get_orders(status: str | None = None, customer_id: str | None = None) -> list[dict]:
    orders = order_repo.get_all_orders()

    if status:
        orders = [o for o in orders if o["status"] == status]
    if customer_id:
        orders = [o for o in orders if o["customer_id"] == customer_id]

    return orders


def get_order_detail(order_id: str) -> dict | None:
    order = order_repo.find_order_by_id(order_id)
    if not order:
        return None

    customer = customer_repo.find_customer_by_id(order["customer_id"]) or {}

    return {
        **order,
        "customer_name": customer.get("name"),
        "customer_email": customer.get("email"),
        "shipping_address": customer.get("shipping_address"),
    }


def create_order(customer_id: str, items: list[dict]) -> dict:
    customer = customer_repo.find_customer_by_id(customer_id)
    if not customer:
        return {"error": f"Customer {customer_id} not found"}

    order_id = f"ORD-{10000 + order_repo.get_order_count() + 1}"
    total = sum(item["qty"] * item["unit_price"] for item in items)

    new_order = {
        "id": order_id,
        "customer_id": customer_id,
        "status": "pending",
        "created_at": datetime.now().isoformat() + "Z",
        "shipped_at": None,
        "items": items,
        "total": total,
    }

    return order_repo.append_order(new_order)


def update_order_status(order_id: str, new_status: str) -> dict:
    valid_statuses = order_repo.get_valid_statuses()
    if new_status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {valid_statuses}"}

    order = order_repo.find_order_by_id(order_id)
    if not order:
        return {"error": f"Order {order_id} not found"}

    order["status"] = new_status
    if new_status == "shipped":
        order["shipped_at"] = datetime.now().isoformat() + "Z"

    return order


def get_order_summary() -> dict:
    orders = order_repo.get_all_orders()
    valid_statuses = order_repo.get_valid_statuses()

    summary = {status: 0 for status in valid_statuses}
    total_value = 0

    for order in orders:
        summary[order["status"]] += 1
        total_value += order["total"]

    return {
        "by_status": summary,
        "total_orders": len(orders),
        "total_value": total_value,
    }


def get_customers() -> list[dict]:
    return customer_repo.get_all_customers()
