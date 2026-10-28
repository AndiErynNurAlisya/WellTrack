from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.crud import chart as crud
from app.schemas.dashboard import ChartPeriod, ChartResponse

router = APIRouter(prefix="/charts", tags=["Charts"])


@router.get("", response_model=ChartResponse)
def read_chart(
    db: DbSession,
    current_user: CurrentUser,
    period: ChartPeriod = "mingguan",
    metric: crud.ChartMetric | None = None,
):
    return crud.get_chart(db, current_user, period, metric)