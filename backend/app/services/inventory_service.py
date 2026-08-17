"""Single write path for physical inventory balances and their audit trail."""

from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from app import db
from app.models.base_model import ValidationError
from app.models.inventory import InventoryLot, InventoryMovement, MovementType


class InventoryStockError(ValidationError):
    """Actionable error raised when an inventory operation is not possible."""


class InventoryService:
    """Apply stock changes atomically and record the before/after balance."""

    QUANTUM = Decimal("0.001")

    @classmethod
    def quantity(cls, value: Any, *, allow_zero: bool = False) -> Decimal:
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise InventoryStockError(
                "La cantidad debe ser un número válido", code="invalid_quantity"
            ) from exc
        if amount < 0 or (amount == 0 and not allow_zero):
            raise InventoryStockError(
                "La cantidad debe ser mayor que cero"
                if not allow_zero
                else "La cantidad no puede ser negativa",
                code="invalid_quantity",
            )
        return amount.quantize(cls.QUANTUM)

    @classmethod
    def register_movement(
        cls,
        lot_id: int,
        movement_type: MovementType,
        quantity: Any,
        *,
        reference_type: str | None = None,
        reference_id: int | None = None,
        notes: str | None = None,
        actor_id: int | None = None,
        allow_expired_reversal: bool = False,
        commit: bool = True,
    ) -> InventoryMovement:
        amount = cls.quantity(quantity, allow_zero=movement_type == MovementType.Ajuste)
        # API resources scope the lot before calling this service. Internal
        # model hooks already validate the treatment/lote finca pair; a plain
        # lookup here also keeps the service usable from background jobs and
        # unit tests that have no JWT tenant context.
        lot = InventoryLot.query.filter_by(id=lot_id).first()
        if not lot:
            raise InventoryStockError("Lote de inventario no encontrado", code="lot_not_found")

        before = Decimal(str(lot.current_quantity or 0)).quantize(cls.QUANTUM)
        opening_entry = movement_type == MovementType.Entrada and reference_type == "lot_entry"
        if (
            movement_type in (MovementType.Entrada, MovementType.Salida)
            and lot.expiry_date < date.today()
            and not opening_entry
            and not allow_expired_reversal
        ):
            raise InventoryStockError(
                "El lote está vencido; cree un lote nuevo o registre una baja",
                code="expired_lot",
            )

        if movement_type in (MovementType.Salida, MovementType.Baja):
            after = before - amount
            if after < 0:
                raise InventoryStockError(
                    f"Stock insuficiente: disponible {before}, solicitado {amount}",
                    code="insufficient_stock",
                )
        elif movement_type == MovementType.Entrada:
            after = before + amount
        elif movement_type == MovementType.Ajuste:
            # Ajuste is a physical count: the quantity is the counted balance,
            # not another delta. The audit columns remove the ambiguity.
            after = amount
        else:
            raise InventoryStockError("Tipo de movimiento no soportado", code="invalid_movement")

        lot.current_quantity = after
        movement = InventoryMovement(
            lot_id=lot.id,
            movement_type=movement_type,
            quantity=amount,
            balance_before=before,
            balance_after=after,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes,
            actor_id=actor_id,
            finca_id=lot.finca_id,
        )
        db.session.add(movement)
        db.session.flush()
        if commit:
            db.session.commit()
            db.session.refresh(movement)
        return movement

    @classmethod
    def create_lot(
        cls,
        data: dict[str, Any],
        *,
        actor_id: int | None = None,
        commit: bool = True,
    ) -> InventoryLot:
        """Create a batch and its opening entry as one transaction."""
        payload = dict(data)
        opening_quantity = payload.get("current_quantity", payload.get("quantity", 0))
        # The opening balance is applied by the Entrada below; starting at
        # zero avoids counting the same stock twice.
        payload["current_quantity"] = 0
        lot = InventoryLot.create(commit=False, **payload)
        db.session.flush()
        if Decimal(str(opening_quantity or 0)) > 0:
            cls.register_movement(
                lot.id,
                MovementType.Entrada,
                opening_quantity,
                reference_type="lot_entry",
                reference_id=lot.id,
                notes="Saldo inicial del lote",
                actor_id=actor_id,
                commit=False,
            )
        if commit:
            db.session.commit()
            db.session.refresh(lot)
        return lot

    @classmethod
    def dispose_expired_lot(
        cls, lot_id: int, *, actor_id: int | None = None, commit: bool = True
    ) -> InventoryMovement:
        lot = InventoryLot.query.filter_by(id=lot_id).first()
        if not lot:
            raise InventoryStockError("Lote de inventario no encontrado", code="lot_not_found")
        if lot.expiry_date >= date.today():
            raise InventoryStockError(
                "El lote todavía no está vencido", code="lot_not_expired"
            )
        if Decimal(str(lot.current_quantity or 0)) <= 0:
            raise InventoryStockError(
                "El lote vencido ya no tiene saldo físico", code="empty_lot"
            )
        return cls.register_movement(
            lot.id,
            MovementType.Baja,
            lot.current_quantity,
            reference_type="expiry",
            reference_id=lot.id,
            notes="Baja por vencimiento",
            actor_id=actor_id,
            commit=commit,
        )

    @classmethod
    def reconcile_consumption(
        cls,
        reference_type: str,
        reference_id: int,
        *,
        old_lot_id: int | None = None,
        old_quantity: Any = 0,
        new_lot_id: int | None = None,
        new_quantity: Any = 0,
        commit: bool = True,
    ) -> None:
        """Reverse the old application and apply the new one as ledger events."""
        old_amount = Decimal(str(old_quantity or 0))
        new_amount = Decimal(str(new_quantity or 0))
        if old_lot_id == new_lot_id and old_amount == new_amount:
            return
        if old_lot_id and old_amount > 0:
            cls.register_movement(
                old_lot_id,
                MovementType.Entrada,
                old_amount,
                reference_type=reference_type,
                reference_id=reference_id,
                notes="Reversión de consumo aplicado",
                allow_expired_reversal=True,
                commit=False,
            )
        if new_lot_id and new_amount > 0:
            cls.register_movement(
                new_lot_id,
                MovementType.Salida,
                new_amount,
                reference_type=reference_type,
                reference_id=reference_id,
                notes="Consumo en aplicación",
                commit=False,
            )
        if commit:
            db.session.commit()
