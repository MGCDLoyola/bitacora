"""agregar tipo a evidencias

Revision ID: 7c76d2c7e07c
Revises: c26eced01799
Create Date: 2026-08-20 16:07:12.495058

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c76d2c7e07c"
down_revision: Union[str, Sequence[str], None] = "c26eced01799"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("evidencias", sa.Column("tipo", sa.String(length=20), nullable=False))
    op.create_check_constraint(
        "chk_tipo_evidencia", "evidencias", "tipo IN ('AVISO', 'RESPUESTA')"
    )


def downgrade() -> None:
    op.drop_constraint("chk_tipo_evidencia", "evidencias", type_="check")
    op.drop_column("evidencias", "tipo")
