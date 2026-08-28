"""se convierte firma a booleano

Revision ID: ee3f3e185587
Revises: 65ef2bfbca56
Create Date: 2026-08-19 13:20:49.699492

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ee3f3e185587"
down_revision: Union[str, Sequence[str], None] = "65ef2bfbca56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "usuarios",
        "firma",
        existing_type=sa.TEXT(),
        type_=sa.Boolean(),
        nullable=False,
        server_default=sa.false(),
        postgresql_using="firma IS NOT NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "usuarios",
        "firma",
        existing_type=sa.Boolean(),
        type_=sa.TEXT(),
        nullable=True,
        server_default=None,
        postgresql_using="CASE WHEN firma THEN 'firma.png' ELSE NULL END",
    )
