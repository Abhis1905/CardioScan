"""add_prediction_report_id

Revision ID: g3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-10-18 00:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add report_id column to predictions table with unique index
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('report_id', sa.String(length=32), nullable=True))
        batch_op.create_index('ix_predictions_report_id', ['report_id'], unique=True)

    # 2. Deterministic backfill for any existing rows to guarantee stability and prevent collisions
    bind = op.get_bind()
    preds = bind.execute(sa.text("SELECT id FROM predictions WHERE report_id IS NULL")).fetchall()
    for row in preds:
        pred_id = row[0]
        rep_id = f"CS-REP-{pred_id:06d}"
        bind.execute(
            sa.text("UPDATE predictions SET report_id = :rep_id WHERE id = :id"),
            {"rep_id": rep_id, "id": pred_id}
        )


def downgrade() -> None:
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        batch_op.drop_index('ix_predictions_report_id')
        batch_op.drop_column('report_id')
