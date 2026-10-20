"""add_user_role_and_rbac

Revision ID: h4c5d6e7f8a9
Revises: g3b4c5d6e7f8
Create Date: 2026-10-20 01:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h4c5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'g3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role column to users table with server default 'patient'
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(length=32), nullable=True, server_default='patient'))
        batch_op.create_index('ix_users_role', ['role'], unique=False)

    # 2. Backfill existing users whose role is NULL to 'patient'
    from alembic import context
    if not context.is_offline_mode():
        bind = op.get_bind()
        bind.execute(sa.text("UPDATE users SET role = 'patient' WHERE role IS NULL"))

        # 3. Fail-safe promotion: If an ADMIN_EMAIL is configured in the environment,
        # promote that existing user to 'admin' so administrative access is safely preserved.
        try:
            from app.core.config import settings
            admin_email = (settings.ADMIN_EMAIL or "").strip().lower()
            if admin_email:
                bind.execute(
                    sa.text("UPDATE users SET role = 'admin' WHERE LOWER(email) = :admin_email"),
                    {"admin_email": admin_email},
                )
        except Exception:
            pass


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_role')
        batch_op.drop_column('role')
