from app.models import Animals, Species, Breeds, Finca, FarmType, LivestockSummary, Transaction, AnimalMovement, MovementType
from app.models.animals import Sex, AnimalStatus
from datetime import date
from flask_jwt_extended import decode_token
from app import db

def test_animal_movements_flow(client, auth_headers, app):
    """
    Test de integración para el flujo de ventas y traslados de animales
    siguiendo la legislación colombiana (ICA/SINIGAN).
    """
    with app.app_context():
        # Obtener el finca_id (Finca A) de los headers
        token_str = auth_headers['Authorization'].split(' ')[1]
        claims = decode_token(token_str)
        finca_origen_id = claims['finca_id']

        # 1. Crear finca destino para el traslado interno (Finca B)
        finca_destino = Finca.create(
            name="Finca Destino Test",
            type=FarmType.Tradicional,
            ica_registration="123456789012"  # RPP ICA
        )
        db.session.commit()
        finca_destino_id = finca_destino.id

        # 2. Crear especie y raza
        species = Species(name="Bovino Test Movements")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test Movements", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        # 3. Crear animal en Finca A (origen)
        animal = Animals.create(
            record="BOV-MOVE-001",
            sex=Sex.Hembra,
            weight=300.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_origen_id,
            status=AnimalStatus.Vivo
        )
        db.session.commit()
        animal_id = animal.id

        # Asegurar resúmenes consistentes
        summary_origen = LivestockSummary.get_for_finca(finca_origen_id)
        summary_origen.recalculate()
        summary_destino = LivestockSummary.get_for_finca(finca_destino_id)
        summary_destino.recalculate()

        active_origen_before = summary_origen.active_animals
        active_destino_before = summary_destino.active_animals

        # --- ESCENARIO 1: TRASLADO INTERNO (Finca A -> Finca B) ---
        payload_transfer = {
            "animal_id": animal_id,
            "tipo_movimiento": "Traslado_Interno",
            "fecha_movimiento": date.today().strftime('%Y-%m-%d'),
            "finca_destino_id": finca_destino_id,
            "guia_movilizacion": "GSMI-100200",
            "arete_sinigan": "DIB-790123456",
            "ruv_vacunacion": "RUV-556677",
            "placa_vehiculo": "STV123",
            "nombre_conductor": "Juan Perez",
            "cedula_conductor": "1015123456",
            "precinto_seguridad": "P-9988",
            "notes": "Traslado de prueba de pasturas"
        }

        resp = client.post('/api/v1/animals/movements/', json=payload_transfer, headers=auth_headers)
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert json_data["success"] is True
        
        # Validar cambios en el Animal
        db.session.expire_all()
        animal_moved = Animals.query.get(animal_id)
        assert animal_moved.finca_id == finca_destino_id
        assert animal_moved.status == AnimalStatus.Vivo

        # Validar actualización atómica de LivestockSummary
        summary_origen_after = LivestockSummary.get_for_finca(finca_origen_id)
        summary_destino_after = LivestockSummary.get_for_finca(finca_destino_id)
        assert summary_origen_after.active_animals == active_origen_before - 1
        assert summary_destino_after.active_animals == active_destino_before + 1

        # Validar que se creó la auditoría de movimiento
        movement = AnimalMovement.query.filter_by(animal_id=animal_id).first()
        assert movement is not None
        assert movement.tipo_movimiento == MovementType.Traslado_Interno
        assert movement.finca_origen_id == finca_origen_id
        assert movement.finca_destino_id == finca_destino_id
        assert movement.guia_movilizacion == "GSMI-100200"
        assert movement.arete_sinigan == "DIB-790123456"

        # --- ESCENARIO 2: VENTA CON TRASLADO EXTERNO ---
        # Creamos otro animal en Finca B para venderlo hacia afuera (simulando que estamos operando en Finca B)
        # Nota: Usamos auth_headers que tiene el contexto de Finca A. Así que creamos el animal en Finca A para probar la venta.
        animal_sale = Animals.create(
            record="BOV-SALE-002",
            sex=Sex.Macho,
            weight=450.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_origen_id,
            status=AnimalStatus.Vivo
        )
        db.session.commit()
        animal_sale_id = animal_sale.id
        summary_origen.recalculate()
        active_origen_before_sale = summary_origen.active_animals

        payload_sale = {
            "animal_id": animal_sale_id,
            "tipo_movimiento": "Venta_Traslado_Externo",
            "fecha_movimiento": date.today().strftime('%Y-%m-%d'),
            "finca_destino_externa": "Hacienda El Rubí",
            "rpp_destino_externo": "050880001234",  # 12 dígitos ICA
            "precio_venta": 1850000.0,
            "comprador": "Ganados de Colombia SAS",
            "comprador_nit": "900.123.456-1",
            "guia_movilizacion": "GSMI-300400",
            "arete_sinigan": "DIB-790555666",
            "placa_vehiculo": "TLK789"
        }

        resp_sale = client.post('/api/v1/animals/movements/', json=payload_sale, headers=auth_headers)
        assert resp_sale.status_code == 200
        assert resp_sale.get_json()["success"] is True

        # Validar cambios en el Animal vendido
        db.session.expire_all()
        animal_sold = Animals.query.get(animal_sale_id)
        assert animal_sold.status == AnimalStatus.Vendido
        assert animal_sold.sale_date == date.today()
        assert "Ganados de Colombia" in animal_sold.exit_reason

        # Validar transacción financiera de venta de animal
        tx = Transaction.query.filter_by(animal_id=animal_sale_id).first()
        assert tx is not None
        assert tx.amount == 1850000.0
        assert tx.finca_id == finca_origen_id

        # Validar LivestockSummary origen
        summary_origen_after_sale = LivestockSummary.get_for_finca(finca_origen_id)
        assert summary_origen_after_sale.active_animals == active_origen_before_sale - 1

        # --- ESCENARIO 3: VALIDACIONES ICA ---
        # Guía obligatoria para Traslado_Interno
        payload_invalid_1 = {
            "animal_id": animal_moved.id,  # Actualmente en Finca B, pero operamos con Finca A en token,
            # así que intentamos moverlo (dará error de pertenencia o estado)
            "tipo_movimiento": "Traslado_Interno",
            "fecha_movimiento": date.today().strftime('%Y-%m-%d'),
            "finca_destino_id": finca_origen_id
        }
        # Animal ya no está en Finca A, dará error 403 Forbidden
        resp_inv_1 = client.post('/api/v1/animals/movements/', json=payload_invalid_1, headers=auth_headers)
        assert resp_inv_1.status_code == 403

        # Formato de RPP ICA incorrecto
        animal_err = Animals.create(
            record="BOV-ERR-003",
            sex=Sex.Macho,
            weight=200.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_origen_id,
            status=AnimalStatus.Vivo
        )
        db.session.commit()

        payload_invalid_rpp = {
            "animal_id": animal_err.id,
            "tipo_movimiento": "Venta_Traslado_Externo",
            "fecha_movimiento": date.today().strftime('%Y-%m-%d'),
            "finca_destino_externa": "Predio Test",
            "rpp_destino_externo": "123",  # Menos de 12 dígitos, debe fallar
            "guia_movilizacion": "GSMI-888"
        }
        resp_inv_rpp = client.post('/api/v1/animals/movements/', json=payload_invalid_rpp, headers=auth_headers)
        assert resp_inv_rpp.status_code == 422
        assert "RPP" in resp_inv_rpp.get_json()["error"]["details"]["validation_errors"]["rpp_destino_externo"]
