"""Create the first platform administrator.

Run from backend:
    python -m app.scripts.create_admin
"""
import getpass

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app import models  # noqa: F401


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        email = input("Admin email: ").strip().lower()
        password = getpass.getpass("Admin password (min 8 chars): ")
        if len(password) < 8:
            raise SystemExit("Password must contain at least 8 characters.")

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role != "ADMIN":
                raise SystemExit("That email already belongs to a non-admin account.")
            existing.password_hash = hash_password(password)
            existing.status = "ACTIVE"
            db.commit()
            print(f"Admin account updated: {email}")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            role="ADMIN",
            status="ACTIVE",
            full_name="Platform Administrator",
        )
        db.add(user)
        db.commit()
        print(f"Admin account created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
