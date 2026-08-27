"""agregar fecha_desfase a expedientes

Revision ID: 33df6626b2d3
Revises: 7c76d2c7e07c
Create Date: 2026-08-21 08:12:38.348841

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "33df6626b2d3"
down_revision: Union[str, Sequence[str], None] = "7c76d2c7e07c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("expedientes", sa.Column("fecha_desfase", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("expedientes", "fecha_desfase")
