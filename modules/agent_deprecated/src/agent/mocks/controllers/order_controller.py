from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from agent.mocks.services import order_service

router = APIRouter(prefix="/api", tags=["orders"])


class OrderItem(BaseModel):
    sku: str
    qty: int
    unit_price: float
    location: str


class CreateOrderRequest(BaseModel):
    customer_id: str
    items: list[OrderItem]


class UpdateStatusRequest(BaseModel):
    status: str


@router.get("/orders")
async def get_orders(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
):
    return order_service.get_orders(status, customer_id)


@router.get("/orders/summary")
async def get_order_summary():
    return order_service.get_order_summary()


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = order_service.get_order_detail(order_id)
    if not order:
        return {"error": f"Order {order_id} not found"}
    return order


@router.post("/orders")
async def create_order(req: CreateOrderRequest):
    items = [item.model_dump() for item in req.items]
    return order_service.create_order(req.customer_id, items)


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, req: UpdateStatusRequest):
    return order_service.update_order_status(order_id, req.status)


@router.get("/customers")
async def get_customers():
    return order_service.get_customers()
