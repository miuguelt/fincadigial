"""Creación del administrador y de las fincas declaradas por entorno."""

from __future__ import annotations

from app import db
from app.models.finca import Finca
from app.models.user import ApprovalStatus, Role, User
from app.models.user_finca import UserFinca
from .config import BootstrapSettings, FarmDefinition


def ensure_farms(definitions: tuple[FarmDefinition, ...]) -> list[Finca]:
    result: list[Finca] = []
    for definition in definitions:
        finca = Finca.query.filter_by(name=definition.name).first()
        if not finca:
            finca = Finca(
                name=definition.name,
                type=definition.farm_type,
                department=definition.department,
                municipality=definition.municipality,
                address=definition.address,
                nit=definition.nit,
                ica_registration=definition.ica_registration,
                territory_id=definition.territory_id,
                is_active=True,
            )
            db.session.add(finca)
            db.session.flush()
        else:
            finca.type = definition.farm_type
            finca.department = definition.department or finca.department
            finca.municipality = definition.municipality or finca.municipality
            finca.address = definition.address or finca.address
            finca.nit = definition.nit or finca.nit
            finca.ica_registration = definition.ica_registration or finca.ica_registration
            finca.territory_id = definition.territory_id or finca.territory_id
            finca.is_active = True
        result.append(finca)
    db.session.commit()
    return result


def ensure_admin(settings: BootstrapSettings, farms: list[Finca]) -> User:
    """Crea o reconcilia el único administrador de plataforma configurado."""

    user = User.query.filter_by(identification=settings.admin_identification).first()
    by_email = User.query.filter_by(email=settings.admin_email).first()
    if by_email and user and by_email.id != user.id:
        raise ValueError("VILLALUZ_ADMIN_EMAIL y VILLALUZ_ADMIN_IDENTIFICATION pertenecen a usuarios distintos.")
    user = user or by_email
    primary = farms[0]
    if not user:
        user = User(
            identification=settings.admin_identification,
            fullname=settings.admin_fullname,
            email=settings.admin_email,
            phone=settings.admin_phone,
            role=Role.Administrador,
            finca_id=primary.id,
            status=True,
            approval_status=ApprovalStatus.Approved,
        )
        db.session.add(user)
        user.set_password(settings.admin_password)
        db.session.flush()
    else:
        user.identification = settings.admin_identification
        user.fullname = settings.admin_fullname
        user.email = settings.admin_email
        user.phone = settings.admin_phone
        user.role = Role.Administrador
        user.finca_id = primary.id
        user.status = True
        user.approval_status = ApprovalStatus.Approved
    user.set_password(settings.admin_password)
    for index, finca in enumerate(farms):
        UserFinca.assign(
            user_id=user.id,
            finca_id=finca.id,
            role=Role.Administrador.value,
            is_active=True,
            is_primary=index == 0,
            commit=False,
        )
    db.session.commit()
    return user
