from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.task import CanvasLink, CanvasNode, CanvasTab
from app.models.user import User
from app.schemas.task import CanvasLinkRead, CanvasNodeRead, CanvasState, CanvasTabRead

router = APIRouter(prefix="/canvas", tags=["canvas"])


@router.get("/state", response_model=CanvasState)
def get_canvas_state(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CanvasState:
    tabs = list(db.scalars(select(CanvasTab).order_by(CanvasTab.sort_order, CanvasTab.id)))
    nodes = list(db.scalars(select(CanvasNode).order_by(CanvasNode.sort_order, CanvasNode.id)))
    links = list(db.scalars(select(CanvasLink).order_by(CanvasLink.created_at, CanvasLink.id)))

    nodes_by_tab = {tab.id: [] for tab in tabs}
    links_by_tab = {tab.id: [] for tab in tabs}
    for node in nodes:
        nodes_by_tab.setdefault(node.tab_id, []).append(
            CanvasNodeRead(
                id=node.id,
                title=node.title,
                body=node.body,
                template=node.template,
                parent_id=node.parent_id,
                todo_items=node.data.get("todoItems", []) if isinstance(node.data, dict) else [],
                x=node.x,
                y=node.y,
            )
        )
    for link in links:
        links_by_tab.setdefault(link.tab_id, []).append(
            CanvasLinkRead(id=link.id, source_id=link.source_id, target_id=link.target_id)
        )
    return CanvasState(
        active_tab_id=tabs[0].id if tabs else None,
        tabs=[
            CanvasTabRead(id=tab.id, label=tab.label, title=tab.title, description=tab.description)
            for tab in tabs
        ],
        nodes_by_tab=nodes_by_tab,
        links_by_tab=links_by_tab,
    )


@router.put("/state", response_model=CanvasState)
def replace_canvas_state(
    payload: CanvasState,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CanvasState:
    db.execute(delete(CanvasLink))
    db.execute(delete(CanvasNode))
    db.execute(delete(CanvasTab))

    for index, tab in enumerate(payload.tabs):
        db.add(
            CanvasTab(
                id=tab.id,
                label=tab.label,
                title=tab.title,
                description=tab.description,
                sort_order=index,
                created_by=current_user.id,
                updated_by=current_user.id,
            )
        )
    db.flush()

    for tab in payload.tabs:
        for index, node in enumerate(payload.nodes_by_tab.get(tab.id, [])):
            db.add(
                CanvasNode(
                    tab_id=tab.id,
                    id=node.id,
                    title=node.title,
                    body=node.body,
                    template=node.template,
                    parent_id=node.parent_id,
                    data={"todoItems": node.todo_items},
                    x=node.x,
                    y=node.y,
                    sort_order=index,
                    created_by=current_user.id,
                    updated_by=current_user.id,
                )
            )
        for link in payload.links_by_tab.get(tab.id, []):
            db.add(
                CanvasLink(
                    tab_id=tab.id,
                    id=link.id,
                    source_id=link.source_id,
                    target_id=link.target_id,
                    created_by=current_user.id,
                    updated_by=current_user.id,
                )
            )

    db.commit()
    return get_canvas_state(current_user, db)
