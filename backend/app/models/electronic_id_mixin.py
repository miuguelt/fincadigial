"""Identificación electrónica del animal.

Vive aparte del modelo `Animals` porque es una responsabilidad propia, con su
propio servicio (`app.services.nfc`), sus propias reglas de unicidad y su
propio ritmo de cambio: los estándares de identificación ganadera evolucionan
sin que cambie nada del resto de la ficha del animal.

Dos tecnologías conviven y no son intercambiables:

* ``nfc_uid`` — arete NFC de 13,56 MHz (NTAG21x / ICODE). Lo lee y graba
  cualquier celular Android con NFC; es el que programa la aplicación.
* ``lf_tag_code`` — transpondedor de 134,2 kHz (ISO 11784/11785) del bolo
  ruminal o el inyectable. Ningún celular alcanza esa frecuencia: entra por
  bastón lector o digitado, y viene grabado de fábrica.
"""

from app import db


class ElectronicIdMixin:
    """Columnas de identificación electrónica para un animal.

    La unicidad es global y no por finca a propósito: el serial de un chip es
    irrepetible en el mundo, así que el mismo código en dos fincas siempre es
    un dato equivocado, no dos animales distintos.
    """

    nfc_uid = db.Column(db.String(32), unique=True, nullable=True, index=True)
    nfc_written_at = db.Column(db.DateTime, nullable=True)
    lf_tag_code = db.Column(db.String(20), unique=True, nullable=True, index=True)

    #: Campos que los namespaces exponen junto al resto de la ficha.
    ELECTRONIC_ID_FIELDS = ("nfc_uid", "nfc_written_at", "lf_tag_code")

    @property
    def has_electronic_id(self) -> bool:
        """Indica si el animal ya quedó identificado por chip."""
        return bool(self.nfc_uid or self.lf_tag_code)
