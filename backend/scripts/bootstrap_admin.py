"""
CardioScan RBAC Administrator Bootstrap Utility
================================================

Safely assign or promote a user to an administrative role in the database.

Usage:
    python scripts/bootstrap_admin.py --email admin@example.com --role admin
    python scripts/bootstrap_admin.py --list
"""

import argparse
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User


def list_admins():
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role.in_(["admin", "superadmin"])).all()
        print(f"Total Administrative Users: {len(admins)}")
        for u in admins:
            print(f" - [{u.id}] {u.name} <{u.email}> (Role: {u.role}, Verified: {u.is_verified})")
    finally:
        db.close()


def set_user_role(email: str, role: str, db=None) -> bool:
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if not user:
            print(f"Error: User with email '{email}' not found.", file=sys.stderr)
            return False

        old_role = user.role or "patient"
        user.role = role.strip().lower()
        db.commit()
        db.refresh(user)
        print(f"Success: Updated '{user.email}' role from '{old_role}' to '{user.role}'.")
        return True
    finally:
        if close_db:
            db.close()


def main():
    parser = argparse.ArgumentParser(description="CardioScan RBAC Admin Bootstrap Tool")
    parser.add_argument("--email", type=str, help="User email to promote/assign role")
    parser.add_argument(
        "--role",
        type=str,
        default="admin",
        choices=["admin", "superadmin", "patient", "clinician"],
        help="Role to assign (default: admin)",
    )
    parser.add_argument("--list", action="store_true", help="List all users with administrative roles")

    args = parser.parse_args()

    if args.list:
        list_admins()
    elif args.email:
        set_user_role(args.email, args.role)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
