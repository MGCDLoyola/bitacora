from io import BytesIO
from pathlib import Path

from PIL import Image

from src.services.firma import FirmaService

ENTRADA = Path("test/fixtures/firma_original.jpg")
SALIDA = Path("test/fixtures/firma_procesada.png")


def test_procesar_firma():
    contenido = ENTRADA.read_bytes()

    imagen = Image.open(BytesIO(contenido)).convert("RGB")

    print("Formato:", Image.open(BytesIO(contenido)).format)
    print("Modo:", imagen.mode)
    print("Tamaño:", imagen.size)
    print("Extrema:", imagen.getextrema())

    pequeña = imagen.resize((100, 100))

    colores = {}

    for pixel in pequeña.getdata():
        colores[pixel] = colores.get(pixel, 0) + 1

    print("Colores predominantes:")

    for color, cantidad in sorted(colores.items(), key=lambda x: x[1], reverse=True)[
        :10
    ]:
        print(f"{color}: {cantidad}")

    resultado = FirmaService.procesar(contenido)

    SALIDA.write_bytes(resultado)

    procesada = Image.open(BytesIO(resultado))

    print("Resultado:")
    print("Formato:", procesada.format)
    print("Modo:", procesada.mode)
    print("Tamaño:", procesada.size)

    assert procesada.format == "PNG"
    assert procesada.mode == "RGBA"
    assert SALIDA.exists()
