"""create_pending_firebase_cleanups

Revision ID: d9e2a1b3c4f5
Revises: c8f2a1b3e4d5
Create Date: 2026-10-10 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9e2a1b3c4f5'
down_revision: Union[str, Sequence[str], None] = 'c8f2a1b3e4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create pending_firebase_cleanups table."""
    op.create_table(
        'pending_firebase_cleanups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('firebase_uid', sa.String(length=128), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pending_firebase_cleanups_id'), 'pending_firebase_cleanups', ['id'], unique=False)
    op.create_index(op.f('ix_pending_firebase_cleanups_firebase_uid'), 'pending_firebase_cleanups', ['firebase_uid'], unique=False)


def downgrade() -> None:
    """Drop pending_firebase_cleanups table."""
    op.drop_index(op.f('ix_pending_firebase_cleanups_firebase_uid'), table_name='pending_firebase_cleanups')
    op.drop_index(op.f('ix_pending_firebase_cleanups_id'), table_name='pending_firebase_cleanups')
    op.drop_table('pending_firebase_cleanups')
