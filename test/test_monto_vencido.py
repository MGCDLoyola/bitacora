from datetime import date

import pytest

from src.core import monto as monto_module
from src.core.exceptions import ConflictoNegocio
from src.core.monto import obtener_monto_vencido


class FakeTablaV:
    """Simula TABLA_V en memoria: una lista de filas (interlocutor, fecha, monto).
    fake_consultar() aplica el mismo filtro que la query real (Interlocutor =,
    Fecha <= ancla, ORDER BY Fecha DESC, LIMIT 1), para que el test valide
    tanto los parámetros que le pasa monto.py como la lógica de anclaje."""

    def __init__(self, filas):
        self.filas = filas

    def consultar(self, query, params, output="dict"):
        interlocutor = params["interlocutor"]
        fecha_ancla = params["fecha_ancla"]

        candidatas = [
            fila for fila in self.filas
            if fila["interlocutor"] == interlocutor
            and fila["fecha"] <= fecha_ancla
        ]

        if not candidatas:
            return []

        mas_reciente = max(candidatas, key=lambda fila: fila["fecha"])

        return [{"monto_vencimiento": mas_reciente["monto"]}]


@pytest.fixture
def tabla_v(monkeypatch):
    """Da acceso al fixture de datos y lo conecta como pg.consultar."""

    fake = FakeTablaV(filas=[])

    def _cargar(filas):
        fake.filas = filas
        monkeypatch.setattr(monto_module.pg, "consultar", fake.consultar)
        return fake

    return _cargar


def test_ancla_coincide_con_fecha_exacta(tabla_v):
    tabla_v([
        {"interlocutor": "0001", "fecha": date(2026, 8, 17), "monto": 1000.0},
        {"interlocutor": "0001", "fecha": date(2026, 8, 18), "monto": 1500.0},
    ])

    resultado = obtener_monto_vencido("0001", date(2026, 8, 18))

    assert resultado == 1500.0


def test_ancla_en_fin_de_semana_usa_el_ultimo_dia_habil(tabla_v):
    # Viernes 14, sábado y domingo sin bloque. El día 3 de cobranza cayó en
    # sábado (16) -> debe tomar el bloque del viernes 14, no tronar.
    tabla_v([
        {"interlocutor": "0001", "fecha": date(2026, 8, 14), "monto": 2000.0},
        {"interlocutor": "0001", "fecha": date(2026, 8, 17), "monto": 2200.0},
    ])

    resultado = obtener_monto_vencido("0001", date(2026, 8, 16))

    assert resultado == 2000.0


def test_sin_registro_antes_de_la_ancla_regresa_none(tabla_v):
    # El expediente se creó antes de que TABLA_V tuviera cualquier bloque
    # para este interlocutor -> día sin monto, debe verse como N/D, no tronar.
    tabla_v([
        {"interlocutor": "0001", "fecha": date(2026, 8, 20), "monto": 3000.0},
    ])

    resultado = obtener_monto_vencido("0001", date(2026, 8, 10))

    assert resultado is None


def test_interlocutor_sin_ningun_registro_regresa_none(tabla_v):
    tabla_v([
        {"interlocutor": "0002", "fecha": date(2026, 8, 18), "monto": 500.0},
    ])

    resultado = obtener_monto_vencido("0001", date(2026, 8, 18))

    assert resultado is None


def test_fila_encontrada_con_monto_nulo_truena_conflicto_negocio(tabla_v):
    tabla_v([
        {"interlocutor": "0001", "fecha": date(2026, 8, 18), "monto": None},
    ])

    with pytest.raises(ConflictoNegocio):
        obtener_monto_vencido("0001", date(2026, 8, 18))


def test_usa_el_bloque_mas_reciente_no_el_mas_antiguo(tabla_v):
    tabla_v([
        {"interlocutor": "0001", "fecha": date(2026, 8, 10), "monto": 100.0},
        {"interlocutor": "0001", "fecha": date(2026, 8, 15), "monto": 200.0},
        {"interlocutor": "0001", "fecha": date(2026, 8, 20), "monto": 300.0},
    ])

    resultado = obtener_monto_vencido("0001", date(2026, 8, 17))

    assert resultado == 200.0