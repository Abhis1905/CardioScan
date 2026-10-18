"""add_patient_profile_and_id

Revision ID: e1a2b3c4d5e6
Revises: d9e2a1b3c4f5
Create Date: 2026-10-16 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd9e2a1b3c4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users table with patient identity and baseline biometric fields
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('patient_id', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('height', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('weight', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('dob_updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('height_updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('weight_updated_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_patient_id'), ['patient_id'], unique=True)

    # 2. Create retired_patient_ids tombstone table
    op.create_table(
        'retired_patient_ids',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.String(length=32), nullable=False),
        sa.Column('retired_at', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_retired_patient_ids_id'), 'retired_patient_ids', ['id'], unique=False)
    op.create_index(op.f('ix_retired_patient_ids_patient_id'), 'retired_patient_ids', ['patient_id'], unique=True)

    # 3. Create profile_correction_logs audit table
    op.create_table(
        'profile_correction_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('field_name', sa.String(length=50), nullable=False),
        sa.Column('old_value', sa.String(length=255), nullable=True),
        sa.Column('new_value', sa.String(length=255), nullable=True),
        sa.Column('reason', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_profile_correction_logs_id'), 'profile_correction_logs', ['id'], unique=False)
    op.create_index(op.f('ix_profile_correction_logs_user_id'), 'profile_correction_logs', ['user_id'], unique=False)


def downgrade() -> None:
    # 1. Drop profile_correction_logs
    op.drop_index(op.f('ix_profile_correction_logs_user_id'), table_name='profile_correction_logs')
    op.drop_index(op.f('ix_profile_correction_logs_id'), table_name='profile_correction_logs')
    op.drop_table('profile_correction_logs')

    # 2. Drop retired_patient_ids
    op.drop_index(op.f('ix_retired_patient_ids_patient_id'), table_name='retired_patient_ids')
    op.drop_index(op.f('ix_retired_patient_ids_id'), table_name='retired_patient_ids')
    op.drop_table('retired_patient_ids')

    # 3. Revert users table additions
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_patient_id'))
        batch_op.drop_column('weight_updated_at')
        batch_op.drop_column('height_updated_at')
        batch_op.drop_column('dob_updated_at')
        batch_op.drop_column('updated_at')
        batch_op.drop_column('weight')
        batch_op.drop_column('height')
        batch_op.drop_column('date_of_birth')
        batch_op.drop_column('patient_id')
