import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data"

_orders: list[dict] = []
_valid_statuses: list[str] = []


def _load_data():
    global _orders, _valid_statuses
    if _orders:
        return
    with open(DATA_PATH / "orders.json") as f:
        data = json.load(f)
    _orders = data["orders"]
    _valid_statuses = data["statuses"]


def get_all_orders() -> list[dict]:
    _load_data()
    return _orders


def find_order_by_id(order_id: str) -> dict | None:
    _load_data()
    return next((o for o in _orders if o["id"] == order_id), None)


def append_order(order: dict) -> dict:
    _load_data()
    _orders.append(order)
    return order


def get_valid_statuses() -> list[str]:
    _load_data()
    return _valid_statuses


def get_order_count() -> int:
    _load_data()
    return len(_orders)
