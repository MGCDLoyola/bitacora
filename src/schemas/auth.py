from pydantic import Field

from src.schemas.base import SchemaBase


class LoginRequest(SchemaBase):

    correo   : str
    password : str


class CambiarPasswordRequest(SchemaBase):

    password_actual : str
    password_nueva  : str = Field(min_length=8)