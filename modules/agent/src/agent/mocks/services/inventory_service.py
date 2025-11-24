from datetime import datetime, timedelta

from agent.mocks.repositories import inventory_repo, product_repo


def get_stock(location: str | None = None) -> list[dict]:
    if location:
        return inventory_repo.find_stock_by_location(location)
    return inventory_repo.get_all_stock()


def get_stock_by_sku(sku: str) -> dict:
    items = inventory_repo.find_stock_by_sku(sku)
    total_on_hand = sum(s["qty_on_hand"] for s in items)
    total_reserved = sum(s["qty_reserved"] for s in items)
    product_name = items[0]["product_name"] if items else None

    return {
        "sku": sku,
        "product_name": product_name,
        "total_on_hand": total_on_hand,
        "total_available": total_on_hand - total_reserved,
        "by_location": items,
    }


def get_low_stock_alerts() -> list[dict]:
    stock = inventory_repo.get_all_stock()
    sku_totals: dict[str, dict] = {}

    for s in stock:
        if s["sku"] not in sku_totals:
            sku_totals[s["sku"]] = {
                "sku": s["sku"],
                "product_name": s["product_name"],
                "total_available": 0,
                "reorder_point": s["reorder_point"],
                "locations_below": [],
            }

        available = s["qty_on_hand"] - s["qty_reserved"]
        sku_totals[s["sku"]]["total_available"] += available

        if available < s["reorder_point"]:
            sku_totals[s["sku"]]["locations_below"].append({
                "location": s["location"],
                "available": available,
                "reorder_point": s["reorder_point"],
            })

    return [data for data in sku_totals.values() if data["locations_below"]]


def get_dead_stock(days_threshold: int = 90) -> list[dict]:
    cutoff = datetime.now() - timedelta(days=days_threshold)
    stock = inventory_repo.get_all_stock()
    dead_items = []

    for s in stock:
        last_move = datetime.fromisoformat(s["last_movement"])
        if last_move >= cutoff:
            continue
        if s["qty_on_hand"] <= 0:
            continue

        days_stale = (datetime.now() - last_move).days
        product = product_repo.find_product_by_sku(s["sku"]) or {}
        unit_cost = product.get("unit_cost", 0)
        carrying_cost = s["qty_on_hand"] * unit_cost * 0.25 * (days_stale / 365)

        dead_items.append({
            **s,
            "days_since_movement": days_stale,
            "estimated_carrying_cost": round(carrying_cost, 2),
        })

    return sorted(dead_items, key=lambda x: x["days_since_movement"], reverse=True)


def transfer_stock(sku: str, from_location: str, to_location: str, qty: int) -> dict:
    from_item = inventory_repo.find_stock_item(sku, from_location)
    if not from_item:
        return {"error": f"SKU {sku} not found in {from_location}"}

    available = from_item["qty_on_hand"] - from_item["qty_reserved"]
    if available < qty:
        return {"error": f"Insufficient available stock. Available: {available}"}

    today = datetime.now().strftime("%Y-%m-%d")

    inventory_repo.update_stock_item(sku, from_location, {
        "qty_on_hand": from_item["qty_on_hand"] - qty,
        "last_movement": today,
    })

    to_item = inventory_repo.find_stock_item(sku, to_location)
    if to_item:
        inventory_repo.update_stock_item(sku, to_location, {
            "qty_on_hand": to_item["qty_on_hand"] + qty,
            "last_movement": today,
        })
    else:
        inventory_repo.append_stock_item({
            "sku": sku,
            "product_name": from_item["product_name"],
            "location": to_location,
            "qty_on_hand": qty,
            "qty_reserved": 0,
            "reorder_point": from_item["reorder_point"],
            "last_movement": today,
        })

    return {
        "success": True,
        "transfer": {
            "sku": sku,
            "from": from_location,
            "to": to_location,
            "qty": qty,
        },
    }


def get_locations() -> list[dict]:
    return inventory_repo.get_all_locations()
