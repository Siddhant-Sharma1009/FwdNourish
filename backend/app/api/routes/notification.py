from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.notification import Notification

from app.schemas.notification import NotificationResponse


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)


@router.get(
    "/",
    response_model=list[NotificationResponse],
)
def get_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )


@router.get(
    "/unread",
    response_model=list[NotificationResponse],
)
def get_unread_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    notification.is_read = True

    db.commit()

    return {
        "message": "Notification marked as read."
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
        .update(
            {
                Notification.is_read: True
            },
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read."
    }