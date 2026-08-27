"""Correcion de constraint

Revision ID: 8582b8693a03
Revises: fcd1b7a3d5e5
Create Date: 2026-08-07 14:05:11.814351

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8582b8693a03"
down_revision: Union[str, Sequence[str], None] = "fcd1b7a3d5e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint("chk_dia", "cobranzas", "dia BETWEEN 1 AND 4")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("chk_dia", "cobranzas", type_="check")
