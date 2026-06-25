import argparse

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.seed import seed_first_admin


def main() -> None:
    parser = argparse.ArgumentParser(prog="work-dashboard-api")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("seed-first-admin", help="Create or promote the first admin account.")
    args = parser.parse_args()

    if args.command == "seed-first-admin":
        with SessionLocal() as db:
            user = seed_first_admin(db, settings)
        print(f"Seeded admin: {user.email}")
