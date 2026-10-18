"""add_prediction_patient_identity

Revision ID: f2a3b4c5d6e7
Revises: e1a2b3c4d5e6
Create Date: 2026-10-16 11:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add patient_name and patient_id columns to predictions table
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('patient_name', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('patient_id', sa.String(length=32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        batch_op.drop_column('patient_id')
        batch_op.drop_column('patient_name')
