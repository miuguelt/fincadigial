def calculate_frame_score(sex: str, height_cm: float, age_days: int) -> float | None:
    """
    Calcula el Frame Score basado en las fórmulas de la Beef Improvement Federation (BIF).
    """
    try:
        if not height_cm or not age_days:
            return None

        # Convertir altura de cm a pulgadas (1 pulgada = 2.54 cm)
        height_inches = float(height_cm) / 2.54
        age_days_val = int(age_days)

        if sex == "Macho":
            # Fórmula para machos (Bulls)
            fs = (
                -11.548
                + 0.4878 * height_inches
                - 0.0289 * age_days_val
                + 0.00001947 * (age_days_val**2)
                + 0.0000334 * (height_inches * age_days_val)
            )
        else:
            # Fórmula para hembras (Heifers)
            fs = (
                -11.7086
                + 0.4723 * height_inches
                - 0.0239 * age_days_val
                + 0.0000146 * (age_days_val**2)
                + 0.0000759 * (height_inches * age_days_val)
            )

        return round(fs, 2)
    except Exception as e:
        # No dejar que un error matemático rompa el listado de animales
        from flask import current_app

        if current_app:
            current_app.logger.debug(f"Error calculando frame score: {e}")
        return None


def get_frame_category(score: float) -> str:
    """Retorna la categoría del animal según su Frame Score."""
    if score is None:
        return "N/A"
    if score < 4:
        return "Chica"
    elif score <= 6:
        return "Mediana"
    else:
        return "Grande"
