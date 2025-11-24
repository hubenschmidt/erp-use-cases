import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data"

_products: dict[str, dict] = {}


def _load_data():
    global _products
    if _products:
        return
    with open(DATA_PATH / "products.json") as f:
        _products = {p["sku"]: p for p in json.load(f)["products"]}


def get_all_products() -> list[dict]:
    _load_data()
    return list(_products.values())


def find_product_by_sku(sku: str) -> dict | None:
    _load_data()
    return _products.get(sku)
