from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from agent.mocks.services import inventory_service

router = APIRouter(prefix="/api", tags=["inventory"])


class TransferRequest(BaseModel):
    sku: str
    from_location: str
    to_location: str
    qty: int


@router.get("/inventory")
async def get_inventory(location: Optional[str] = Query(None)):
    return inventory_service.get_stock(location)


@router.get("/inventory/{sku}")
async def get_inventory_by_sku(sku: str):
    return inventory_service.get_stock_by_sku(sku)


@router.post("/inventory/transfer")
async def transfer_inventory(req: TransferRequest):
    return inventory_service.transfer_stock(
        req.sku, req.from_location, req.to_location, req.qty
    )


@router.get("/locations")
async def get_locations():
    return inventory_service.get_locations()
