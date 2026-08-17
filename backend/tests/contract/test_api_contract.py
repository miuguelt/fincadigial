import jsonschema
from app import db
from datetime import date, datetime


# --- FACTORIES FOR DATABASE MODELS ---
class AnimalFactory:
    _record_counter = 0

    def __new__(cls, **kwargs):
        return cls.create(**kwargs)

    @classmethod
    def create(cls, **kwargs):
        from app.models import Animal, Species, Breed, Finca, FarmType

        # Ensure finca exists
        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
            db.session.commit()

        # Ensure species exists
        species = Species.query.filter_by(name="bovino").first()
        if not species:
            species = Species(name="bovino")
            db.session.add(species)
            db.session.commit()

        # Ensure breed exists
        breed = Breed.query.filter_by(species_id=species.id).first()
        if not breed:
            breed = Breed(name="Jersey", species_id=species.id)
            db.session.add(breed)
            db.session.commit()

        cls._record_counter += 1
        record_str = f"COL-001-{cls._record_counter:04d}"

        fields = {
            "sex": "Hembra",
            "birth_date": date(2022, 3, 15),
            "weight": 250.0,
            "record": kwargs.get("arete") or record_str,
            "breeds_id": breed.id,
            "finca_id": finca.id,
            "status": "Vivo",
            "entry_date": date(2024, 1, 1),
            "created_at": datetime.utcnow(),
        }
        fields.update(kwargs)

        # Ensure arete is popped since it is not a db field
        if "arete" in fields:
            fields.pop("arete")

        animal = Animal.create(**fields)
        db.session.commit()
        return animal

    @classmethod
    def create_batch(cls, size, **kwargs):
        return [cls.create(**kwargs) for _ in range(size)]


class PotreroFactory:
    _counter = 0

    def __new__(cls, **kwargs):
        return cls.create(**kwargs)

    @classmethod
    def create(cls, **kwargs):
        from app.models import Field, Finca, FarmType

        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
            db.session.commit()

        cls._counter += 1
        fields = {
            "name": f"Potrero {cls._counter}",
            "area": "15.5",  # Database area column is db.String and required
            "state": "Activo",  # Required Enum column LandStatus
            "finca_id": finca.id,
            "created_at": datetime.utcnow(),
        }
        fields.update(kwargs)

        potrero = Field.create(**fields)
        db.session.commit()
        return potrero

    @classmethod
    def create_batch(cls, size, **kwargs):
        return [cls.create(**kwargs) for _ in range(size)]


class ControlFactory:
    def __new__(cls, **kwargs):
        return cls.create(**kwargs)

    @classmethod
    def create(cls, **kwargs):
        from app.models import Control, Animal, Finca, FarmType

        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
            db.session.commit()

        animal = Animal.query.first()
        if not animal:
            animal = AnimalFactory.create()

        fields = {
            "animal_id": animal.id,
            "checkup_date": date.today(),
            "weight": 320.0,
            "height": 1.25,
            "health_status": "Sano",
            "description": "Control de rutina",  # Use description instead of observations which was not in Control db model
            "finca_id": finca.id,
            "created_at": datetime.utcnow(),
        }
        fields.update(kwargs)

        control = Control.create(**fields)
        db.session.commit()
        return control

    @classmethod
    def create_batch(cls, size, **kwargs):
        return [cls.create(**kwargs) for _ in range(size)]


# --- JSON SCHEMAS ---
ANIMAL_SCHEMA = {
    "type": "object",
    "required": ["id", "nombre", "arete", "especie", "fecha_nacimiento", "created_at"],
    "properties": {
        "id": {"type": "integer"},
        "nombre": {"type": "string", "minLength": 1},
        "arete": {"type": "string", "pattern": "^COL-\\d{3}-\\d{4}$"},
        "especie": {
            "type": "string",
            "enum": ["bovino", "porcino", "equino", "caprino"],
        },
        "fecha_nacimiento": {"type": "string", "format": "date"},
        "potrero_id": {"type": ["integer", "null"]},
        "created_at": {"type": "string", "format": "date-time"},
    },
}

LIST_SCHEMA = {
    "type": "object",
    "required": ["data", "total", "page", "per_page"],
    "properties": {
        "data": {"type": "array", "items": ANIMAL_SCHEMA},
        "total": {"type": "integer"},
        "page": {"type": "integer"},
        "per_page": {"type": "integer"},
    },
}

POTRERO_SCHEMA = {
    "type": "object",
    "required": ["id", "nombre", "area", "estado", "created_at"],
    "properties": {
        "id": {"type": "integer"},
        "nombre": {"type": "string", "minLength": 1},
        "area": {"type": "number"},
        "estado": {"type": "string", "enum": ["activo", "descanso", "inactivo"]},
        "created_at": {"type": "string", "format": "date-time"},
    },
}

POTREROS_LIST_SCHEMA = {
    "type": "object",
    "required": ["data", "total", "page", "per_page"],
    "properties": {
        "data": {"type": "array", "items": POTRERO_SCHEMA},
        "total": {"type": "integer"},
        "page": {"type": "integer"},
        "per_page": {"type": "integer"},
    },
}

CONTROL_SCHEMA = {
    "type": "object",
    "required": [
        "id",
        "animal_id",
        "fecha",
        "tipo",
        "diagnostico",
        "observaciones",
        "created_at",
    ],
    "properties": {
        "id": {"type": "integer"},
        "animal_id": {"type": "integer"},
        "fecha": {"type": "string", "format": "date"},
        "tipo": {
            "type": "string",
            "enum": ["preventivo", "curativo", "rutina", "Sano"],
        },  # Handle backend enum mapping
        "diagnostico": {"type": "string"},
        "observaciones": {"type": "string"},
        "created_at": {"type": "string", "format": "date-time"},
    },
}

CONTROLES_LIST_SCHEMA = {
    "type": "object",
    "required": ["data", "total", "page", "per_page"],
    "properties": {
        "data": {"type": "array", "items": CONTROL_SCHEMA},
        "total": {"type": "integer"},
        "page": {"type": "integer"},
        "per_page": {"type": "integer"},
    },
}

REPORTE_ICA_SCHEMA = {
    "type": "object",
    "required": [
        "finca_id",
        "finca_nombre",
        "departamento",
        "municipio",
        "propietario",
        "fecha_generacion",
        "animales",
    ],
    "properties": {
        "finca_id": {"type": "integer"},
        "finca_nombre": {"type": "string"},
        "departamento": {"type": "string"},
        "municipio": {"type": "string"},
        "propietario": {"type": "string"},
        "fecha_generacion": {"type": "string", "format": "date-time"},
        "animales": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "arete",
                    "especie",
                    "raza",
                    "sexo",
                    "edad_meses",
                    "peso_kg",
                    "estado",
                ],
                "properties": {
                    "arete": {"type": "string", "pattern": "^COL-\\d{3}-\\d{4}$"},
                    "especie": {
                        "type": "string",
                        "enum": ["bovino", "porcino", "equino", "caprino"],
                    },
                    "raza": {"type": "string"},
                    "sexo": {"type": "string"},
                    "edad_meses": {"type": "integer"},
                    "peso_kg": {"type": "number"},
                    "estado": {"type": "string"},
                },
            },
        },
    },
}


# --- TEST SUITE: ANIMALES ---
class TestApiContractAnimales:
    def test_get_lista_estructura(self, client, auth_headers, db_session):
        AnimalFactory.create_batch(3)
        res = client.get("/api/animales", headers=auth_headers)
        assert res.status_code == 200
        assert "application/json" in res.content_type
        jsonschema.validate(res.json, LIST_SCHEMA)

    def test_get_individual_estructura(self, client, auth_headers, db_session):
        animal = AnimalFactory()
        res = client.get(f"/api/animales/{animal.id}", headers=auth_headers)
        assert res.status_code == 200
        jsonschema.validate(res.json["data"], ANIMAL_SCHEMA)

    def test_error_404_estructura(self, client, auth_headers):
        res = client.get("/api/animales/999999", headers=auth_headers)
        assert res.status_code == 404
        assert "error" in res.json
        assert "message" in res.json

    def test_error_422_campos_requeridos(self, client, auth_headers):
        res = client.post("/api/animales", json={}, headers=auth_headers)
        assert res.status_code == 422
        assert "errors" in res.json

    def test_sin_autenticacion_401(self, client):
        res = client.get("/api/animales")
        assert res.status_code == 401


# --- TEST SUITE: POTREROS ---
class TestApiContractPotreros:
    def test_get_lista_estructura(self, client, auth_headers, db_session):
        PotreroFactory.create_batch(3)
        res = client.get("/api/potreros", headers=auth_headers)
        assert res.status_code == 200
        assert "application/json" in res.content_type
        jsonschema.validate(res.json, POTREROS_LIST_SCHEMA)

    def test_get_individual_estructura(self, client, auth_headers, db_session):
        potrero = PotreroFactory()
        res = client.get(f"/api/potreros/{potrero.id}", headers=auth_headers)
        assert res.status_code == 200
        jsonschema.validate(res.json["data"], POTRERO_SCHEMA)

    def test_error_404_estructura(self, client, auth_headers):
        res = client.get("/api/potreros/999999", headers=auth_headers)
        assert res.status_code == 404
        assert "error" in res.json
        assert "message" in res.json

    def test_error_422_campos_requeridos(self, client, auth_headers):
        res = client.post("/api/potreros", json={}, headers=auth_headers)
        assert res.status_code == 422
        assert "errors" in res.json

    def test_sin_autenticacion_401(self, client):
        res = client.get("/api/potreros")
        assert res.status_code == 401


# --- TEST SUITE: CONTROLES ---
class TestApiContractControles:
    def test_get_lista_estructura(self, client, auth_headers, db_session):
        ControlFactory.create_batch(3)
        res = client.get("/api/controles", headers=auth_headers)
        assert res.status_code == 200
        assert "application/json" in res.content_type
        jsonschema.validate(res.json, CONTROLES_LIST_SCHEMA)

    def test_get_individual_estructura(self, client, auth_headers, db_session):
        control = ControlFactory()
        res = client.get(f"/api/controles/{control.id}", headers=auth_headers)
        assert res.status_code == 200
        jsonschema.validate(res.json["data"], CONTROL_SCHEMA)

    def test_error_404_estructura(self, client, auth_headers):
        res = client.get("/api/controles/999999", headers=auth_headers)
        assert res.status_code == 404
        assert "error" in res.json

    def test_error_422_campos_requeridos(self, client, auth_headers):
        res = client.post("/api/controles", json={}, headers=auth_headers)
        assert res.status_code == 422
        assert "errors" in res.json

    def test_sin_autenticacion_401(self, client):
        res = client.get("/api/controles")
        assert res.status_code == 401


# --- TEST SUITE: REPORTES ICA ---
class TestApiContractReportesIca:
    def test_get_reporte_ica_estructura(self, client, auth_headers, db_session):
        AnimalFactory.create_batch(3)
        res = client.get("/api/reportes/ica", headers=auth_headers)
        assert res.status_code == 200
        assert "application/json" in res.content_type
        jsonschema.validate(res.json, REPORTE_ICA_SCHEMA)

    def test_sin_autenticacion_401(self, client):
        res = client.get("/api/reportes/ica")
        assert res.status_code == 401
