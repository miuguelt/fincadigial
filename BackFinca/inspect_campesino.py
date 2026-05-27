import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.campesino import (
    CropPlot, CropActivity, WaterSource, WaterMeasurement,
    ClimateRiskAlert, MarketOffer, TechnicalAssistanceRequest,
    OfflineLearningMaterial
)
from app.models.finca import Finca
from app.models.user import User

def inspect_campesino_data():
    app = create_app()
    with app.app_context():
        print("="*60)
        print("REPORTE DE INTEGRIDAD Y REGISTROS - MÓDULO CAMPESINO")
        print("="*60)
        
        # Helper to print count and relationship details
        def print_stats(model, name):
            count = model.query.count()
            print(f"- Tabla '{name}': {count} registros")
            return count

        print_stats(CropPlot, "CropPlot (Parcelas y Cultivos)")
        print_stats(CropActivity, "CropActivity (Bitácora de Labores)")
        print_stats(WaterSource, "WaterSource (Fuentes de Agua)")
        print_stats(WaterMeasurement, "WaterMeasurement (Mediciones de Agua)")
        print_stats(ClimateRiskAlert, "ClimateRiskAlert (Alertas Climáticas)")
        print_stats(MarketOffer, "MarketOffer (Mercado Campesino)")
        print_stats(TechnicalAssistanceRequest, "TechnicalAssistanceRequest (Asistencia Técnica)")
        print_stats(OfflineLearningMaterial, "OfflineLearningMaterial (Materiales Offline)")
        
        print("\n" + "="*60)
        print("ANÁLISIS DE RELACIONES DE BASE DE DATOS")
        print("="*60)

        # 1. Relación CropPlot -> Finca/Field
        plot = CropPlot.query.first()
        if plot:
            print(f"📍 Relación CropPlot -> Finca & Lote:")
            finca = Finca.query.get(plot.finca_id)
            print(f"  * Parcela '{plot.name}' ({plot.crop_name}) pertenece a la Finca '{finca.name if finca else 'N/A'}' (ID: {plot.finca_id})")
            if plot.field:
                print(f"  * Está ubicada en el lote físico: '{plot.field.name}'")
            else:
                print("  * No está asignada a un lote físico específico (opcional)")
        else:
            print("❌ No hay parcelas registradas")

        # 2. Relación CropActivity -> CropPlot & User
        activity = CropActivity.query.first()
        if activity:
            print(f"\n🚜 Relación CropActivity -> Parcela & Usuario:")
            plot_related = CropPlot.query.get(activity.crop_plot_id)
            actor = User.query.get(activity.performed_by) if activity.performed_by else None
            print(f"  * Actividad: '{activity.activity_type.value}' - {activity.description}")
            print(f"  * Relacionada con la parcela: '{plot_related.name if plot_related else 'N/A'}'")
            print(f"  * Realizada por el usuario/campesino: '{actor.fullname if actor else 'N/A'}' (Rol: {actor.role if actor else 'N/A'})")
            
            # Verificar integración financiera automática (Trigger en .create())
            from app.models.financial import Transaction
            # Buscar transacciones en la fecha de la actividad con descripción similar
            t = Transaction.query.filter_by(finca_id=activity.finca_id, amount=activity.cost).first()
            if t:
                print(f"  * 💳 Integración Financiera Correcta: Se creó automáticamente una transacción de gasto por {t.amount} COP ('{t.description}')")
            else:
                print("  * No se encontró transacción financiera (o costo es 0)")
        else:
            print("❌ No hay actividades registradas")

        # 3. Relación WaterMeasurement -> WaterSource & User
        measurement = WaterMeasurement.query.first()
        if measurement:
            print(f"\n💧 Relación WaterMeasurement -> Fuente de Agua & Usuario:")
            source = WaterSource.query.get(measurement.water_source_id)
            actor = User.query.get(measurement.measured_by) if measurement.measured_by else None
            print(f"  * Medición de nivel: {measurement.level_percent}% el {measurement.measured_at}")
            print(f"  * Relacionada con la fuente: '{source.name if source else 'N/A'}' ({source.source_type.value if source else 'N/A'})")
            print(f"  * Medido por: '{actor.fullname if actor else 'N/A'}'")
        else:
            print("❌ No hay mediciones de agua registradas")

        # 4. Relación TechnicalAssistanceRequest -> User (Requester/Assignee)
        req = TechnicalAssistanceRequest.query.first()
        if req:
            print(f"\n🙋 Relación TechnicalAssistanceRequest -> Usuarios:")
            requester = User.query.get(req.requester_user_id) if req.requester_user_id else None
            assignee = User.query.get(req.assigned_user_id) if req.assigned_user_id else None
            print(f"  * Solicitud: '{req.title}' ({req.category})")
            print(f"  * Solicitado por: '{requester.fullname if requester else 'N/A'}'")
            print(f"  * Asignado a: '{assignee.fullname if assignee else 'Sin asignar'}'")
        else:
            print("❌ No hay solicitudes de asistencia técnica")

        print("="*60)

if __name__ == '__main__':
    inspect_campesino_data()
