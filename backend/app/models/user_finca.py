"""
Modelo UserFinca - Relación Usuario-Finca (N:M)
==============================================

Permite que un usuario pertenezca a múltiples fincas con diferentes roles.
Cada usuario tiene una "finca activa" que determina el contexto actual.

Uso:
    from app.models.user_finca import UserFinca

    # Asignar usuario a finca
    UserFinca.assign(user_id=1, finca_id=2, role=Role.Capataz)

    # Obtener fincas del usuario
    fincas = UserFinca.get_user_fincas(user_id=1)

    # Cambiar finca activa
    UserFinca.set_active_finca(user_id=1, finca_id=2)

    # Verificar si usuario tiene acceso a finca
    has_access = UserFinca.has_access(user_id=1, finca_id=2)
"""

from app import db
from datetime import datetime, UTC
from typing import Any


class UserFinca(db.Model):
    """
    Tabla de unión para relación N:M entre User y Finca.
    Almacena el rol específico del usuario en cada finca.
    """
    __tablename__ = 'user_finca'
    __table_args__ = (
        # Índice compuesto para búsquedas eficientes
        db.Index('ix_user_finca_user_finca', 'user_id', 'finca_id', unique=True),
        db.Index('ix_user_finca_user_id', 'user_id'),
        db.Index('ix_user_finca_finca_id', 'finca_id'),
        db.Index('ix_user_finca_is_active', 'is_active'),
        db.Index('ix_user_finca_is_primary', 'is_primary'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id', ondelete='CASCADE'), nullable=False)

    # Rol específico del usuario en esta finca
    role = db.Column(db.String(50), nullable=False, default='Operario')

    # Supervisor (ej: Instructor SENA supervisando al aprendiz)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)

    # Estado de la relación
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Finca principal/activa del usuario
    is_primary = db.Column(db.Boolean, default=False, nullable=False)

    # Fechas
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relaciones
    user = db.relationship('User', backref='finca_memberships', lazy='selectin', foreign_keys=[user_id])
    finca = db.relationship('Finca', backref='user_memberships', lazy='selectin')
    supervisor = db.relationship('User', foreign_keys=[supervisor_id], lazy='selectin')

    def __repr__(self):
        return f'<UserFinca user={self.user_id} finca={self.finca_id} role={self.role}>'

    # =============================================================================
    # Métodos de clase
    # =============================================================================

    @classmethod
    def assign(cls, user_id: int, finca_id: int, role: str = 'Operario',
               is_active: bool = True, is_primary: bool = False, commit: bool = True) -> 'UserFinca':
        """
        Asignar un usuario a una finca.

        Args:
            user_id: ID del usuario
            finca_id: ID de la finca
            role: Rol del usuario en la finca
            is_active: Si la relación está activa
            is_primary: Si es la finca principal del usuario
            commit: Si persistir cambios inmediatamente

        Returns:
            UserFinca creado o existente actualizado
        """
        # Buscar si ya existe la relación
        membership = cls.query.filter_by(
            user_id=user_id,
            finca_id=finca_id
        ).first()

        if membership:
            # Actualizar relación existente
            membership.role = role
            membership.is_active = is_active
            if is_primary:
                membership.is_primary = True
                # Desmarcar otras fincas primarias del usuario
                cls.query.filter(
                    cls.user_id == user_id,
                    cls.finca_id != finca_id
                ).update({'is_primary': False}, synchronize_session=False)
        else:
            # Crear nueva relación
            membership = cls(
                user_id=user_id,
                finca_id=finca_id,
                role=role,
                is_active=is_active,
                is_primary=is_primary
            )
            db.session.add(membership)

            # Si es primary, desmarcar otras
            if is_primary:
                cls.query.filter(
                    cls.user_id == user_id,
                    cls.finca_id != finca_id
                ).update({'is_primary': False}, synchronize_session=False)

        if commit:
            db.session.commit()
        return membership

    @classmethod
    def remove(cls, user_id: int, finca_id: int) -> bool:
        """
        Eliminar la asignación de un usuario a una finca.

        Args:
            user_id: ID del usuario
            finca_id: ID de la finca

        Returns:
            True si se eliminó, False si no existía
        """
        membership = cls.query.filter_by(
            user_id=user_id,
            finca_id=finca_id
        ).first()

        if membership:
            db.session.delete(membership)
            db.session.commit()
            return True
        return False

    @classmethod
    def get_user_fincas(cls, user_id: int, active_only: bool = True) -> list[dict[str, Any]]:
        """
        Obtener todas las fincas de un usuario.

        Args:
            user_id: ID del usuario
            active_only: Si solo retornar relaciones activas

        Returns:
            Lista de diccionarios con finca y rol
        """
        query = cls.query.filter_by(user_id=user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        memberships = query.all()

        return [
            {
                'id': m.id,
                'finca_id': m.finca_id,
                'finca_name': m.finca.name if m.finca else None,
                'finca_type': getattr(m.finca.type, 'value', str(m.finca.type)) if m.finca and m.finca.type else None,
                'role': m.role,
                'is_active': m.is_active,
                'is_primary': m.is_primary,
                'created_at': m.created_at.isoformat() if m.created_at else None,
            }
            for m in memberships
        ]

    @classmethod
    def get_finca_users(cls, finca_id: int, active_only: bool = True) -> list[dict[str, Any]]:
        """
        Obtener todos los usuarios de una finca.

        Args:
            finca_id: ID de la finca
            active_only: Si solo retornar relaciones activas

        Returns:
            Lista de diccionarios con usuario y rol
        """
        query = cls.query.filter_by(finca_id=finca_id)

        if active_only:
            query = query.filter_by(is_active=True)

        memberships = query.all()

        return [
            {
                'id': m.id,
                'user_id': m.user_id,
                'user_fullname': m.user.fullname if m.user else None,
                'user_email': m.user.email if m.user else None,
                'role': m.role,
                'is_active': m.is_active,
                'is_primary': m.is_primary,
            }
            for m in memberships
        ]

    @classmethod
    def get_active_finca(cls, user_id: int) -> dict[str, Any] | None:
        """
        Obtener la finca activa/principal de un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Diccionario con la finca activa o None
        """
        # Primero buscar la marcada como primary
        membership = cls.query.filter_by(
            user_id=user_id,
            is_active=True,
            is_primary=True
        ).first()

        # Si no hay primary, tomar la primera activa
        if not membership:
            membership = cls.query.filter_by(
                user_id=user_id,
                is_active=True
            ).first()

        if membership and membership.finca:
            return {
                'id': membership.id,
                'finca_id': membership.finca_id,
                'finca_name': membership.finca.name,
                'finca_type': getattr(membership.finca.type, 'value', str(membership.finca.type)) if membership.finca.type else None,
                'role': membership.role,
                'is_primary': membership.is_primary,
            }

        return None

    @classmethod
    def set_active_finca(cls, user_id: int, finca_id: int) -> bool:
        """
        Cambiar la finca activa de un usuario.

        Args:
            user_id: ID del usuario
            finca_id: ID de la finca a activar

        Returns:
            True si se cambió exitosamente
        """
        # Verificar que el usuario tenga acceso a la finca
        membership = cls.query.filter_by(
            user_id=user_id,
            finca_id=finca_id,
            is_active=True
        ).first()

        if not membership:
            return False

        # Desmarcar todas las fincas primarias del usuario
        cls.query.filter_by(
            user_id=user_id
        ).update({'is_primary': False}, synchronize_session=False)

        # Marcar la nueva finca como primary
        membership.is_primary = True
        membership.updated_at = datetime.now(UTC)

        # Actualizar también el finca_id en User (para compatibilidad)
        from app.models import User
        user = db.session.get(User, user_id)
        if user:
            user.finca_id = finca_id
            user.role = membership.role

        db.session.commit()
        return True

    @classmethod
    def has_access(cls, user_id: int, finca_id: int) -> bool:
        """
        Verificar si un usuario tiene acceso a una finca.

        Args:
            user_id: ID del usuario
            finca_id: ID de la finca

        Returns:
            True si tiene acceso activo
        """
        if not user_id or not finca_id:
            return False

        from app.models.user import User
        user = db.session.get(User, user_id)
        if not user:
            return False

        # 1. Finca principal vinculada directamente en el modelo User
        if user.finca_id == finca_id:
            return True

        # 2. Membresía activa en la tabla de unión user_finca
        return cls.query.filter_by(
            user_id=user_id,
            finca_id=finca_id,
            is_active=True
        ).first() is not None

    @classmethod
    def get_role_in_finca(cls, user_id: int, finca_id: int) -> str | None:
        """
        Obtener el rol de un usuario en una finca específica.

        Args:
            user_id: ID del usuario
            finca_id: ID de la finca

        Returns:
            Rol del usuario o None si no tiene acceso
        """
        membership = cls.query.filter_by(
            user_id=user_id,
            finca_id=finca_id,
            is_active=True
        ).first()

        return membership.role if membership else None

    @classmethod
    def count_fincas(cls, user_id: int, active_only: bool = True) -> int:
        """
        Contar cuántas fincas tiene asignadas un usuario.

        Args:
            user_id: ID del usuario
            active_only: Si solo contar relaciones activas

        Returns:
            Número de fincas
        """
        query = cls.query.filter_by(user_id=user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        return query.count()

    @classmethod
    def is_multi_finca(cls, user_id: int) -> bool:
        """
        Verificar si un usuario pertenece a múltiples fincas.

        Args:
            user_id: ID del usuario

        Returns:
            True si tiene más de una finca
        """
        return cls.count_fincas(user_id) > 1

    def to_dict(self) -> dict[str, Any]:
        """Convertir a diccionario con información expandida del usuario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_fullname': self.user.fullname if self.user else 'N/A',
            'user_ident': self.user.identification if self.user else 'N/A',
            'finca_id': self.finca_id,
            'finca_name': self.finca.name if self.finca else None,
            'finca_type': getattr(self.finca.type, 'value', str(self.finca.type)) if self.finca and self.finca.type else None,
            'role': self.role,
            'is_active': self.is_active,
            'is_primary': self.is_primary,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
