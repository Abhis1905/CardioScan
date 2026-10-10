"""add_firebase_uid

Revision ID: c8f2a1b3e4d5
Revises: b7e1ba5fdd46
Create Date: 2026-10-10 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f2a1b3e4d5'
down_revision: Union[str, Sequence[str], None] = 'b7e1ba5fdd46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add firebase_uid column to users."""
    op.add_column('users', sa.Column('firebase_uid', sa.String(length=128), nullable=True))
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)


def downgrade() -> None:
    """Drop firebase_uid column from users."""
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_column('users', 'firebase_uid')
