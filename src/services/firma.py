from io import BytesIO

import cv2
import numpy as np
from PIL import Image


class FirmaService:

    MAX_ANCHO = 800
    MAX_ALTO = 300
    PADDING = 10

    @staticmethod
    def procesar(contenido: bytes) -> bytes:
        imagen = Image.open(BytesIO(contenido)).convert("RGB")

        matriz = np.array(imagen)

        gris = cv2.cvtColor(
            matriz,
            cv2.COLOR_RGB2GRAY
        )

        gris = cv2.GaussianBlur(
            gris,
            (5, 5),
            0
        )

        fondo = cv2.GaussianBlur(
            gris,
            (51, 51),
            0
        )

        diferencia = (
            fondo.astype(np.int16)
            - gris.astype(np.int16)
        )

        mascara = np.where(
            diferencia > 20,
            255,
            0
        ).astype(np.uint8)

        kernel = np.ones(
            (3, 3),
            np.uint8
        )

        mascara = cv2.morphologyEx(
            mascara,
            cv2.MORPH_OPEN,
            kernel,
            iterations=1
        )

        mascara = cv2.morphologyEx(
            mascara,
            cv2.MORPH_CLOSE,
            kernel,
            iterations=1
        )

        num_labels, labels, stats, _ = (
            cv2.connectedComponentsWithStats(
                mascara,
                connectivity=8
            )
        )

        componentes = []

        for i in range(1, num_labels):
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]

            if area < 100:
                continue

            componentes.append(
                (x, y, w, h, area)
            )

        if not componentes:
            raise ValueError(
                "No fue posible detectar una firma visible."
            )

        x1 = min(
            x
            for x, y, w, h, area in componentes
        )

        y1 = min(
            y
            for x, y, w, h, area in componentes
        )

        x2 = max(
            x + w
            for x, y, w, h, area in componentes
        )

        y2 = max(
            y + h
            for x, y, w, h, area in componentes
        )

        print(
            "Componentes detectados:",
            len(componentes)
        )

        print(
            "Bounding box:",
            (x1, y1, x2, y2)
        )

        mascara = mascara[y1:y2, x1:x2]

        alto, ancho = mascara.shape

        escala = min(
            (FirmaService.MAX_ANCHO - FirmaService.PADDING * 2) / ancho,
            (FirmaService.MAX_ALTO - FirmaService.PADDING * 2) / alto,
            1
        )

        nuevo_ancho = max(
            1,
            round(ancho * escala)
        )

        nuevo_alto = max(
            1,
            round(alto * escala)
        )

        mascara = cv2.resize(
            mascara,
            (nuevo_ancho, nuevo_alto),
            interpolation=cv2.INTER_AREA
        )

        lienzo = np.zeros(
            (
                FirmaService.MAX_ALTO,
                FirmaService.MAX_ANCHO,
            ),
            dtype=np.uint8
        )

        x = (
            FirmaService.MAX_ANCHO
            - nuevo_ancho
        ) // 2

        y = (
            FirmaService.MAX_ALTO
            - nuevo_alto
        ) // 2

        lienzo[
            y:y + nuevo_alto,
            x:x + nuevo_ancho
        ] = mascara

        resultado = np.zeros(
            (
                FirmaService.MAX_ALTO,
                FirmaService.MAX_ANCHO,
                4
            ),
            dtype=np.uint8
        )

        resultado[:, :, 3] = lienzo

        imagen_resultado = Image.fromarray(
            resultado,
            mode="RGBA"
        )

        salida = BytesIO()

        imagen_resultado.save(
            salida,
            format="PNG"
        )

        return salida.getvalue()