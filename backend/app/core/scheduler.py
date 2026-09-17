# backend/app/core/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import SessionLocal
from app.services.expiry_monitor import (
    check_expiry_for_all_inventory
)
from app.services.ai_batch_prediction import ai_batch_prediction_service


scheduler = BackgroundScheduler(
    timezone="Asia/Kolkata"
)


def run_expiry_check():
    db = SessionLocal()

    try:
        check_expiry_for_all_inventory(db)

        print(
            "Expiry check completed successfully."
        )

    except Exception as e:
        print(
            f"Expiry check failed: {e}"
        )

        db.rollback()

    finally:
        db.close()


def start_scheduler():
    if scheduler.running:
        return

    # Run once when the application starts
    run_expiry_check()
    run_ai_batch_prediction()

    # Daily expiry check at 00:00 IST
    scheduler.add_job(
        run_expiry_check,
        trigger=CronTrigger(
            hour=0,
            minute=0,
            timezone="Asia/Kolkata"
        ),
        id="expiry_check",
        replace_existing=True
    )

    # Daily AI prediction at 00:30 IST
    scheduler.add_job(
        run_ai_batch_prediction,
        trigger=CronTrigger(
            hour=0,
            minute=30,
            timezone="Asia/Kolkata"
        ),
        id="ai_batch_prediction",
        replace_existing=True
    )

    scheduler.start()


def stop_scheduler():

    if scheduler.running:
        scheduler.shutdown()

        print("Scheduler stopped.")
        
def run_ai_batch_prediction():
    db = SessionLocal()

    try:
        result = ai_batch_prediction_service.run_batch(db)

        print(
            "AI batch prediction completed: "
            f"{result['successful']} successful, "
            f"{result['failed']} failed."
        )

    except Exception as e:
        print(f"AI batch prediction failed: {e}")
        db.rollback()

    finally:
        db.close()