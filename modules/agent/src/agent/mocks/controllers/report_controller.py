from fastapi import APIRouter, Query

from agent.mocks.services import inventory_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/low-stock")
async def get_low_stock_report():
    return inventory_service.get_low_stock_alerts()


@router.get("/dead-stock")
async def get_dead_stock_report(days: int = Query(90)):
    return inventory_service.get_dead_stock(days)
