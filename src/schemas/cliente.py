from src.schemas.base import SchemaBase

class ClienteBase(SchemaBase):

    nombre   : str
    correo   : str | None = None
    telefono : str | None = None

class ClienteRead(ClienteBase):

    interlocutor: str