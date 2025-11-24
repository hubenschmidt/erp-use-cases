from .inventory_controller import router as inventory_router
from .order_controller import router as order_router
from .report_controller import router as report_router

__all__ = ["inventory_router", "order_router", "report_router"]
