import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Animal, Breed, Species, Field, Control, Finca, FarmType
from datetime import datetime, date, UTC

compat_bp = Blueprint('compat', __name__, url_prefix='/api')

def serialize_animal(animal):
    # Ensure species is one of the enum values: bovino, porcino, equino, caprino
    species_name = "bovino"
    if animal.breed and animal.breed.species:
        name = animal.breed.species.name.lower()
        if name in ["bovino", "porcino", "equino", "caprino"]:
            species_name = name

    # Format record as COL-XXX-YYYY if not already matching the pattern
    arete = animal.record or ""
    if not re.match(r"^COL-\d{3}-\d{4}$", arete):
        arete = f"COL-001-{animal.id:04d}" if animal.id else "COL-001-2026"

    # Get potrero_id
    potrero_id = None
    active_assignment = animal.animal_fields.filter_by(removal_date=None).first()
    if active_assignment:
        potrero_id = active_assignment.field_id

    return {
        "id": animal.id,
        "nombre": animal.record or f"Animal {animal.id}",
        "arete": arete,
        "especie": species_name,
        "fecha_nacimiento": animal.birth_date.isoformat() if animal.birth_date else date.today().isoformat(),
        "potrero_id": potrero_id,
        "created_at": animal.created_at.isoformat() + "Z" if animal.created_at else datetime.now(UTC).replace(tzinfo=None).isoformat() + "Z"
    }

def serialize_potrero(field):
    return {
        "id": field.id,
        "nombre": field.name or f"Potrero {field.id}",
        "area": float(field.area) if field.area else 0.0,
        "estado": "activo",
        "created_at": field.created_at.isoformat() + "Z" if field.created_at else datetime.now(UTC).replace(tzinfo=None).isoformat() + "Z"
    }

def serialize_control(ctrl):
    tipo = "preventivo"
    if ctrl.health_status and ctrl.health_status.value in ["preventivo", "curativo", "rutina"]:
        tipo = ctrl.health_status.value
    return {
        "id": ctrl.id,
        "animal_id": ctrl.animal_id,
        "fecha": ctrl.checkup_date.isoformat() if ctrl.checkup_date else date.today().isoformat(),
        "tipo": tipo,
        "diagnostico": ctrl.health_status.value if hasattr(ctrl.health_status, 'value') else str(ctrl.health_status),
        "observaciones": ctrl.description or "",
        "created_at": ctrl.created_at.isoformat() + "Z" if ctrl.created_at else datetime.now(UTC).replace(tzinfo=None).isoformat() + "Z"
    }

# --- ANIMALES ---
@compat_bp.route('/animales', methods=['GET'])
@jwt_required()
def get_animales():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = Animal.query
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    data = [serialize_animal(a) for a in pagination.items]
    return jsonify({
        "data": data,
        "total": pagination.total,
        "page": page,
        "per_page": per_page
    })

@compat_bp.route('/animales/<int:id>', methods=['GET'])
@jwt_required()
def get_animal(id):
    animal = Animal.query.get(id)
    if not animal:
        return jsonify({"error": "Not Found", "message": "Animal no encontrado"}), 404
    return jsonify({
        "data": serialize_animal(animal)
    })

@compat_bp.route('/animales', methods=['POST'])
@jwt_required()
def post_animal():
    data = request.get_json() or {}
    errors = {}

    # Required validations
    if not data.get('nombre'):
        errors['nombre'] = 'Nombre es requerido'
    if not data.get('arete'):
        errors['arete'] = 'Arete es requerido'
    elif not re.match(r"^COL-\d{3}-\d{4}$", data.get('arete')):
        errors['arete'] = 'Formato de arete inválido (ej. COL-001-2024)'
    if not data.get('especie'):
        errors['especie'] = 'Especie es requerida'
    elif data.get('especie') not in ['bovino', 'porcino', 'equino', 'caprino']:
        errors['especie'] = 'Especie inválida'
    if not data.get('fecha_nacimiento'):
        errors['fecha_nacimiento'] = 'Fecha de nacimiento es requerida'

    if errors:
        return jsonify({"errors": errors, "message": "Validación fallida"}), 422

    # Get or create breed and species
    species = Species.query.filter_by(name=data['especie']).first()
    if not species:
        species = Species(name=data['especie'])
        db.session.add(species)
        db.session.commit()

    breed = Breed.query.filter_by(species_id=species.id).first()
    if not breed:
        breed = Breed(name="Jersey", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
        db.session.commit()

    # Parse date
    try:
        birth_date = datetime.strptime(data['fecha_nacimiento'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"errors": {"fecha_nacimiento": "Formato inválido (YYYY-MM-DD)"}}), 422

    animal = Animal.create(
        record=data['nombre'],
        sex='Hembra',  # default
        birth_date=birth_date,
        weight=250.0,  # default
        breeds_id=breed.id,
        finca_id=finca.id,
        status='Vivo'
    )

    # Update with correct record (arete)
    animal.record = data['arete']
    db.session.commit()

    return jsonify({
        "data": serialize_animal(animal)
    }), 201

@compat_bp.route('/animales/<int:id>', methods=['PUT'])
@jwt_required()
def put_animal(id):
    animal = Animal.query.get(id)
    if not animal:
        return jsonify({"error": "Not Found", "message": "Animal no encontrado"}), 404

    data = request.get_json() or {}
    if 'nombre' in data:
        animal.record = data['nombre']
    if 'arete' in data:
        if not re.match(r"^COL-\d{3}-\d{4}$", data['arete']):
            return jsonify({"errors": {"arete": "Formato de arete inválido"}}), 422
        animal.record = data['arete']
    if 'fecha_nacimiento' in data:
        try:
            animal.birth_date = datetime.strptime(data['fecha_nacimiento'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"errors": {"fecha_nacimiento": "Formato inválido"}}), 422

    db.session.commit()
    return jsonify({
        "data": serialize_animal(animal)
    })

@compat_bp.route('/animales/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_animal(id):
    animal = Animal.query.get(id)
    if not animal:
        return jsonify({"error": "Not Found", "message": "Animal no encontrado"}), 404
    animal.delete()
    db.session.commit()
    return jsonify({"success": True})


# --- POTREROS ---
@compat_bp.route('/potreros', methods=['GET'])
@jwt_required()
def get_potreros():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = Field.query
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    data = [serialize_potrero(f) for f in pagination.items]
    return jsonify({
        "data": data,
        "total": pagination.total,
        "page": page,
        "per_page": per_page
    })

@compat_bp.route('/potreros/<int:id>', methods=['GET'])
@jwt_required()
def get_potrero(id):
    field = Field.query.get(id)
    if not field:
        return jsonify({"error": "Not Found", "message": "Potrero no encontrado"}), 404
    return jsonify({
        "data": serialize_potrero(field)
    })

@compat_bp.route('/potreros', methods=['POST'])
@jwt_required()
def post_potrero():
    data = request.get_json() or {}
    errors = {}

    area_val = data.get('area')
    if not data.get('nombre'):
        errors['nombre'] = 'Nombre es requerido'
    if area_val is None:
        errors['area'] = 'Área es requerida'

    if errors:
        return jsonify({"errors": errors, "message": "Validación fallida"}), 422

    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
        db.session.commit()

    field = Field.create(
        name=data['nombre'],
        area=float(area_val) if area_val is not None else 0.0,
        finca_id=finca.id
    )
    db.session.commit()
    return jsonify({
        "data": serialize_potrero(field)
    }), 201


# --- CONTROLES ---
@compat_bp.route('/controles', methods=['GET'])
@jwt_required()
def get_controles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = Control.query
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    data = [serialize_control(c) for c in pagination.items]
    return jsonify({
        "data": data,
        "total": pagination.total,
        "page": page,
        "per_page": per_page
    })

@compat_bp.route('/controles/<int:id>', methods=['GET'])
@jwt_required()
def get_control(id):
    ctrl = Control.query.get(id)
    if not ctrl:
        return jsonify({"error": "Not Found", "message": "Control no encontrado"}), 404
    return jsonify({
        "data": serialize_control(ctrl)
    })

@compat_bp.route('/controles', methods=['POST'])
@jwt_required()
def post_control():
    data = request.get_json() or {}
    errors = {}

    if not data.get('animal_id'):
        errors['animal_id'] = 'ID de animal es requerido'
    if not data.get('fecha'):
        errors['fecha'] = 'Fecha es requerida'
    if not data.get('tipo'):
        errors['tipo'] = 'Tipo es requerido'
    elif data.get('tipo') not in ['preventivo', 'curativo', 'rutina']:
        errors['tipo'] = 'Tipo de control inválido'

    if errors:
        return jsonify({"errors": errors, "message": "Validación fallida"}), 422

    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
        db.session.commit()

    try:
        checkup_date = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"errors": {"fecha": "Formato inválido"}}), 422

    ctrl = Control.create(
        animal_id=int(data['animal_id']),
        checkup_date=checkup_date,
        weight=300.0, # default
        height=1.20, # default
        health_status=data['tipo'], # map to enum/string
        observations=data.get('observaciones', ''),
        finca_id=finca.id
    )
    db.session.commit()
    return jsonify({
        "data": serialize_control(ctrl)
    }), 201


# --- REPORTE ICA ---
@compat_bp.route('/reportes/ica', methods=['GET'])
@jwt_required()
def get_reporte_ica():
    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name="Finca Contrato", type=FarmType.Tradicional)
        db.session.commit()

    animals = Animal.query.all()

    animales_list = []
    for a in animals:
        arete = a.record or ""
        if not re.match(r"^COL-\d{3}-\d{4}$", arete):
            arete = f"COL-001-{a.id:04d}" if a.id else "COL-001-2026"

        animales_list.append({
            "arete": arete,
            "especie": a.breed.species.name.lower() if (a.breed and a.breed.species) else "bovino",
            "raza": a.breed.name if a.breed else "Jersey",
            "sexo": a.sex.value if hasattr(a.sex, 'value') else str(a.sex),
            "edad_meses": a.age_in_months or 24,
            "peso_kg": float(a.weight) if a.weight else 300.0,
            "estado": a.status.value if hasattr(a.status, 'value') else str(a.status)
        })

    return jsonify({
        "finca_id": finca.id,
        "finca_nombre": finca.name,
        "departamento": finca.department or "Santander",
        "municipio": finca.municipality or "Bucaramanga",
        "propietario": "Propietario Contrato",
        "fecha_generacion": datetime.now(UTC).replace(tzinfo=None).isoformat() + "Z",
        "animales": animales_list
    })
