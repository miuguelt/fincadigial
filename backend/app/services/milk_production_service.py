"""Servicio de producción láctea - Lógica de negocio centralizada"""
import logging
from datetime import datetime, date, timedelta
from typing import Optional
from sqlalchemy import func, extract

from app import db
from app.models.milk_production import MilkProduction, MilkSession
from app.models.animals import Animals

logger = logging.getLogger(__name__)


class MilkProductionService:
    """Servicio para operaciones de producción láctea"""

    @staticmethod
    def _period_totals(*conditions) -> dict:
        """Totales de registros y animales distintos para un periodo.

        `animal_count` no se puede derivar sumando los desgloses diarios: un
        mismo animal aparece en varios días y quedaría contado por duplicado.
        """
        row = db.session.query(
            func.count(MilkProduction.id),
            func.count(func.distinct(MilkProduction.animal_id)),
        ).filter(*conditions, MilkProduction.is_deleted == False).one()
        return {'record_count': row[0] or 0, 'animal_count': row[1] or 0}

    @staticmethod
    def get_daily_summary(finca_id: int, target_date: Optional[date] = None) -> dict:
        """Obtiene resumen diario de producción por finca"""
        if target_date is None:
            target_date = date.today()

        production = MilkProduction.query.filter_by(
            finca_id=finca_id,
            date=target_date,
            is_deleted=False,
        ).all()

        total_liters = sum(m.liters for m in production)
        by_session = {}
        for m in production:
            session_name = str(m.milking_session)
            by_session[session_name] = by_session.get(session_name, 0) + m.liters

        return {
            'date': target_date.isoformat(),
            'total_liters': total_liters,
            'by_session': by_session,
            # 'record_count' es el nombre que usan el resumen semanal y el
            # dashboard; 'count' se mantiene para clientes ya publicados.
            'record_count': len(production),
            'count': len(production),
            'animal_count': len({m.animal_id for m in production}),
        }

    @staticmethod
    def get_weekly_summary(finca_id: int, start_date: Optional[date] = None) -> dict:
        """Obtiene resumen semanal con tendencias"""
        if start_date is None:
            today = date.today()
            start_date = today - timedelta(days=today.weekday())

        end_date = start_date + timedelta(days=6)

        daily_stats = db.session.query(
            MilkProduction.date,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
            func.count(func.distinct(MilkProduction.animal_id)).label('animal_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.date).order_by(MilkProduction.date).all()

        session_stats = db.session.query(
            MilkProduction.milking_session,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.milking_session).all()

        week_total = sum(row.total_liters for row in daily_stats) if daily_stats else 0
        week_avg = week_total / len(daily_stats) if daily_stats else 0

        totals = MilkProductionService._period_totals(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
        )

        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
            },
            'total_liters': week_total,
            'avg_daily_liters': round(week_avg, 2),
            'days_with_records': len(daily_stats),
            **totals,
            'daily_breakdown': [
                {
                    'date': row.date.isoformat(),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                    'animal_count': row.animal_count,
                }
                for row in daily_stats
            ],
            'session_breakdown': {
                str(row.milking_session): {
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                }
                for row in session_stats
            },
        }

    @staticmethod
    def get_monthly_summary(finca_id: int, year: Optional[int] = None, month: Optional[int] = None) -> dict:
        """Obtiene resumen mensual con tendencias"""
        if year is None:
            year = date.today().year
        if month is None:
            month = date.today().month

        daily_stats = db.session.query(
            MilkProduction.date,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
            func.count(func.distinct(MilkProduction.animal_id)).label('animal_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.date).order_by(MilkProduction.date).all()

        weekly_stats = db.session.query(
            func.extract('week', MilkProduction.date).label('week_num'),
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
            MilkProduction.is_deleted == False,
        ).group_by(func.extract('week', MilkProduction.date)).order_by(func.extract('week', MilkProduction.date)).all()

        month_total = sum(row.total_liters for row in daily_stats) if daily_stats else 0
        month_avg = month_total / len(daily_stats) if daily_stats else 0

        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1

        prev_month_total = db.session.query(
            func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == prev_year,
            extract('month', MilkProduction.date) == prev_month,
            MilkProduction.is_deleted == False,
        ).scalar() or 0

        trend_pct = 0
        if prev_month_total > 0:
            trend_pct = ((month_total - prev_month_total) / prev_month_total) * 100

        totals = MilkProductionService._period_totals(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
        )

        return {
            'period': {
                'year': year,
                'month': month,
            },
            'total_liters': month_total,
            'avg_daily_liters': round(month_avg, 2),
            'days_with_records': len(daily_stats),
            **totals,
            'trend_vs_previous_month': {
                'previous_month_liters': float(prev_month_total),
                'change_percentage': round(trend_pct, 2),
                'direction': 'up' if trend_pct > 0 else 'down' if trend_pct < 0 else 'stable',
            },
            'daily_breakdown': [
                {
                    'date': row.date.isoformat(),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                    'animal_count': row.animal_count,
                }
                for row in daily_stats
            ],
            'weekly_breakdown': [
                {
                    'week': int(row.week_num),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                }
                for row in weekly_stats
            ],
        }

    @staticmethod
    def get_animal_trend(animal_id: int, finca_id: int, days: int = 30) -> dict:
        """Obtiene tendencia de producción para un animal específico"""
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        daily_stats = db.session.query(
            MilkProduction.date,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.animal_id == animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.date).order_by(MilkProduction.date).all()

        session_stats = db.session.query(
            MilkProduction.milking_session,
            func.avg(MilkProduction.liters).label('avg_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.animal_id == animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.milking_session).all()

        total_liters = sum(row.total_liters for row in daily_stats) if daily_stats else 0
        avg_daily = total_liters / len(daily_stats) if daily_stats else 0

        return {
            'animal_id': animal_id,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days,
            },
            'total_liters': float(total_liters),
            'avg_daily_liters': round(avg_daily, 2),
            'days_with_records': len(daily_stats),
            'daily_breakdown': [
                {
                    'date': row.date.isoformat(),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                }
                for row in daily_stats
            ],
            'session_averages': {
                str(row.milking_session): {
                    'avg_liters': round(float(row.avg_liters), 2) if row.avg_liters else 0,
                    'record_count': row.record_count,
                }
                for row in session_stats
            },
        }

    @staticmethod
    def estimate_revenue(finca_id: int, price_per_liter: float = 1200.0,
                         year: Optional[int] = None, month: Optional[int] = None) -> dict:
        """Estima ingresos por producción de leche"""
        if year is None:
            year = date.today().year
        if month is None:
            month = date.today().month

        total_liters = db.session.query(
            func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
            MilkProduction.is_deleted == False,
        ).scalar() or 0

        estimated_revenue = float(total_liters) * price_per_liter

        session_revenue = db.session.query(
            MilkProduction.milking_session,
            func.sum(MilkProduction.liters).label('total_liters'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
            MilkProduction.is_deleted == False,
        ).group_by(MilkProduction.milking_session).all()

        return {
            'period': {
                'year': year,
                'month': month,
            },
            'total_liters': float(total_liters),
            'price_per_liter': price_per_liter,
            'estimated_revenue': estimated_revenue,
            'currency': 'COP',
            'session_breakdown': [
                {
                    'session': str(row.milking_session),
                    'liters': float(row.total_liters),
                    'revenue': float(row.total_liters) * price_per_liter,
                }
                for row in session_revenue
            ],
        }

    @staticmethod
    def create_batch(date_str: str, finca_id: int, entries: list) -> dict:
        """Crea múltiples registros de leche en una sola operación"""
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}

        created = []
        errors = []

        for i, entry in enumerate(entries):
            try:
                if 'animal_id' not in entry or 'liters' not in entry:
                    errors.append({'index': i, 'error': 'Faltan campos requeridos: animal_id, liters'})
                    continue

                session_str = entry.get('milking_session', 'AM')
                try:
                    session = MilkSession(session_str)
                except ValueError:
                    errors.append({'index': i, 'error': f'Sesión inválida: {session_str}. Use AM, PM o Extra'})
                    continue

                animal = Animals.query.filter_by(id=entry['animal_id'], finca_id=finca_id).first()
                if not animal:
                    errors.append({'index': i, 'error': f'Animal {entry["animal_id"]} no encontrado en esta finca'})
                    continue

                record = MilkProduction(
                    animal_id=entry['animal_id'],
                    finca_id=finca_id,
                    date=target_date,
                    liters=float(entry['liters']),
                    milking_session=session,
                    fat_percentage=entry.get('fat_percentage'),
                    protein_percentage=entry.get('protein_percentage'),
                    somatic_cells=entry.get('somatic_cells'),
                    notes=entry.get('notes'),
                )
                db.session.add(record)
                created.append(record.to_namespace_dict())

            except Exception as e:
                errors.append({'index': i, 'error': str(e)})

        db.session.commit()

        # Recalcular resumen incremental de producción láctea
        if created:
            from app.models.extended_summaries import MilkSummary
            try:
                summary = MilkSummary.get_for_finca(finca_id)
                summary.recalculate()
            except Exception as e:
                logger.warning(f"No se pudo recalcular MilkSummary para finca {finca_id}: {e}")

        return {
            'created': len(created),
            'errors': len(errors),
            'records': created,
            'error_details': errors,
        }
