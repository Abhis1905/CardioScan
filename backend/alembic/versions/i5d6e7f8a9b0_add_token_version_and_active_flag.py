"""add_token_version_and_active_flag

Revision ID: i5d6e7f8a9b0
Revises: h4c5d6e7f8a9
Create Date: 2026-10-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i5d6e7f8a9b0'
down_revision: Union[str, Sequence[str], None] = 'h4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add token_version and is_active columns with server defaults
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='1'),
    )
    op.add_column(
        'users',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.sql.expression.true()),
    )

    # 2. Backfill any existing users if NULL
    from alembic import context
    if not context.is_offline_mode():
        bind = op.get_bind()
        bind.execute(sa.text("UPDATE users SET token_version = 1 WHERE token_version IS NULL"))
        bind.execute(sa.text("UPDATE users SET is_active = true WHERE is_active IS NULL"))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('token_version')

