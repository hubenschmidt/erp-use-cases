import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data"

_stock: list[dict] = []
_locations: list[dict] = []


def _load_data():
    global _stock, _locations
    if _stock:
        return
    with open(DATA_PATH / "inventory.json") as f:
        data = json.load(f)
    _stock = data["stock"]
    _locations = data["locations"]


def get_all_stock() -> list[dict]:
    _load_data()
    return _stock


def find_stock_by_sku(sku: str) -> list[dict]:
    _load_data()
    return [s for s in _stock if s["sku"] == sku]


def find_stock_by_location(location: str) -> list[dict]:
    _load_data()
    return [s for s in _stock if s["location"] == location]


def find_stock_item(sku: str, location: str) -> dict | None:
    _load_data()
    return next((s for s in _stock if s["sku"] == sku and s["location"] == location), None)


def update_stock_item(sku: str, location: str, updates: dict) -> dict | None:
    _load_data()
    item = find_stock_item(sku, location)
    if not item:
        return None
    item.update(updates)
    return item


def append_stock_item(item: dict) -> dict:
    _load_data()
    _stock.append(item)
    return item


def get_all_locations() -> list[dict]:
    _load_data()
    return _locations
