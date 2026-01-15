from __future__ import annotations

import argparse
import sys
from pathlib import Path

from core.config import settings
from core.db import SessionLocal
from models.crm import User
from services.auth import hash_password


def is_local_database(url: str) -> bool:
    return url.startswith("sqlite:///") or url.startswith("sqlite:////")


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset the local admin password for dev/test use.")
    parser.add_argument("--email", default="admin@example.com", help="Admin email to reset")
    parser.add_argument("--password", default="Admin12345!", help="New dev password")
    args = parser.parse_args()

    if settings.app_env.lower() == "production":
        print("Refusing to run: app environment is production.")
        return 2

    db_url = settings.database_url
    if not is_local_database(db_url):
        print(f"Refusing to run: database_url is not local sqlite ({db_url}).")
        return 2

    with SessionLocal() as session:
        user = session.query(User).filter(User.email == args.email.lower()).first()
        if not user:
            print(f"No user found for {args.email}.")
            return 1
        user.password_hash = hash_password(args.password)
        user.is_active = True
        session.commit()

    db_path = db_url.replace("sqlite:///", "")
    if db_path.startswith("./"):
        db_path = str(Path(db_path).resolve())

    print("Admin password reset complete.")
    print(f"- Email: {args.email}")
    print(f"- Database: {db_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
