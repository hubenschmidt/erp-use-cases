import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data"

_customers: dict[str, dict] = {}


def _load_data():
    global _customers
    if _customers:
        return
    with open(DATA_PATH / "customers.json") as f:
        _customers = {c["id"]: c for c in json.load(f)["customers"]}


def get_all_customers() -> list[dict]:
    _load_data()
    return list(_customers.values())


def find_customer_by_id(customer_id: str) -> dict | None:
    _load_data()
    return _customers.get(customer_id)
