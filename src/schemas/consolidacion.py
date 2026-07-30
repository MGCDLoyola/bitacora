from src.schemas.base import SchemaBase
from src.schemas.cobranza import CobranzaRead
from src.schemas.evidencia import EvidenciaRead


class CobranzaConEvidencias(CobranzaRead):

    dia        : int
    evidencias : list[EvidenciaRead] = []


class PreconsolidacionRead(SchemaBase):

    id_expediente : int
    cobranzas     : list[CobranzaConEvidencias]