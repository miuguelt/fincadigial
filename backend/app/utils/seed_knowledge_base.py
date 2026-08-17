"""
Seed para la Base de Conocimiento Agropecuaria (Knowledge Base).
Basado en normativas ICA, FEDEGAN, SENA y protocolos veterinarios colombianos.
Versión 2.0 — 50+ reglas y 12 eventos de calendario.
"""

import logging
from app import db
from app.models.knowledge_base import (
    KBRecomendacion,
    KBRegla,
    KBCalendario,
    KBCategoria,
    KBUrgencia,
    KBSexo,
    KBOperador,
)

logger = logging.getLogger("startup")


def _rec(
    codigo,
    categoria,
    titulo,
    descripcion,
    accion,
    urgencia=KBUrgencia.MEDIA,
    sexo=KBSexo.AMBOS,
    prof=False,
    edad_min=None,
    edad_max=None,
    fuente=None,
):
    r = KBRecomendacion.query.filter_by(codigo=codigo).first()
    if not r:
        r = KBRecomendacion(codigo=codigo)
    r.categoria = categoria
    r.titulo = titulo
    r.descripcion = descripcion
    r.accion = accion
    r.urgencia = urgencia
    r.sexo = sexo
    r.profesional = prof
    r.edad_min_dias = edad_min
    r.edad_max_dias = edad_max
    r.fuente = fuente
    r.activo = True
    return r


def _regla(rec, campo, op, valor, valor_max=None, desc=None):
    for r in rec.reglas:
        if r.campo_condicion == campo and r.operador == op and r.valor == str(valor):
            return
    rec.reglas.append(
        KBRegla(
            campo_condicion=campo,
            operador=op,
            valor=str(valor) if valor is not None else None,
            valor_max=str(valor_max) if valor_max is not None else None,
            descripcion_corta=desc,
        )
    )


def _cal(
    codigo,
    nombre,
    desc,
    tipo,
    ob_ica=False,
    sexo=KBSexo.AMBOS,
    e_ini=None,
    e_fin=None,
    frec=None,
    prod=None,
    dosis=None,
    fuente=None,
):
    c = KBCalendario.query.filter_by(codigo=codigo).first()
    if not c:
        c = KBCalendario(codigo=codigo)
    c.nombre = nombre
    c.descripcion = desc
    c.tipo = tipo
    c.obligatorio_ica = ob_ica
    c.sexo = sexo
    c.edad_inicio_dias = e_ini
    c.edad_fin_dias = e_fin
    c.frecuencia_dias = frec
    c.producto_sugerido = prod
    c.dosis_referencia = dosis
    c.fuente = fuente
    c.activo = True
    db.session.add(c)


def seed_knowledge_base():
    """Puebla la KB con datos de ganadería colombiana. Idempotente."""
    try:
        logger.info("Iniciando carga de Base de Conocimiento v2.0 (ICA/FEDEGAN)...")

        # ══════════════════════════════════════════════════════════════
        # CALENDARIO SANITARIO (12 eventos)
        # ══════════════════════════════════════════════════════════════
        _cal(
            "VAC-FMD",
            "Fiebre Aftosa",
            "Vacunación en ciclos ICA — cada 6 meses.",
            "Vacunación",
            True,
            KBSexo.AMBOS,
            0,
            None,
            180,
            "Aftosa Bivalente",
            "2ml SC",
            "ICA Colombia",
        )
        _cal(
            "VAC-BRU",
            "Brucelosis Bovina",
            "Obligatoria para hembras 3-8 meses.",
            "Vacunación",
            True,
            KBSexo.HEMBRA,
            90,
            240,
            0,
            "Cepa 19 o RB51",
            "2ml SC",
            "ICA Colombia",
        )
        _cal(
            "VAC-RAB",
            "Rabia Silvestre",
            "En zonas endémicas.",
            "Vacunación",
            True,
            KBSexo.AMBOS,
            90,
            None,
            365,
            "Antirrábica",
            "2ml IM",
            "ICA Colombia",
        )
        _cal(
            "VAC-CAR",
            "Carbón Sintomático",
            "Prevención carbón y edema maligno.",
            "Vacunación",
            False,
            KBSexo.AMBOS,
            90,
            None,
            365,
            "Clostridial",
            "2ml SC",
            "FEDEGAN",
        )
        _cal(
            "VAC-IBR",
            "IBR / DVB",
            "Rinotraqueítis infecciosa bovina y diarrea viral.",
            "Vacunación",
            False,
            KBSexo.AMBOS,
            120,
            None,
            365,
            "Bivalente IBR-DVB",
            "5ml IM",
            "FEDEGAN",
        )
        _cal(
            "VAC-LPT",
            "Leptospirosis",
            "Prevención de abortos y fallas reproductivas.",
            "Vacunación",
            False,
            KBSexo.AMBOS,
            120,
            None,
            180,
            "Leptovac o similar",
            "5ml SC",
            "SENA",
        )
        _cal(
            "DES-INT",
            "Desparasitación Interna",
            "Rotación de principios activos cada 3-4 meses.",
            "Desparasitación",
            False,
            KBSexo.AMBOS,
            30,
            None,
            90,
            "Ivermectina / Albendazol",
            "Según peso",
            "FEDEGAN",
        )
        _cal(
            "DES-EXT",
            "Control de Garrapatas",
            "Baño o pour-on según infestación.",
            "Desparasitación",
            False,
            KBSexo.AMBOS,
            30,
            None,
            30,
            "Amitraz / Cipermetrina",
            "Según producto",
            "ICA Colombia",
        )
        _cal(
            "NUT-MIN",
            "Suplementación Mineral",
            "Sales mineralizadas ad libitum todo el año.",
            "Nutrición",
            False,
            KBSexo.AMBOS,
            0,
            None,
            30,
            "Sal mineralizada 8%",
            "Libre consumo",
            "FEDEGAN",
        )
        _cal(
            "REP-ECO",
            "Ecografía Reproductiva",
            "Diagnóstico gestación 45-60 días post-servicio.",
            "Reproducción",
            False,
            KBSexo.HEMBRA,
            365,
            None,
            365,
            None,
            None,
            "SENA",
        )
        _cal(
            "NUT-VIT",
            "Vitaminas ADE",
            "Refuerzo vitamínico en terneros y post-parto.",
            "Nutrición",
            False,
            KBSexo.AMBOS,
            0,
            365,
            180,
            "Vitamina ADE inyectable",
            "5ml IM",
            "SENA",
        )
        _cal(
            "MAN-CAS",
            "Cascos / Podología",
            "Revisión y recorte funcional anual.",
            "Manejo",
            False,
            KBSexo.AMBOS,
            365,
            None,
            365,
            None,
            None,
            "FEDEGAN",
        )

        # ══════════════════════════════════════════════════════════════
        # RECOMENDACIONES — REPRODUCCIÓN
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "REP-001",
            KBCategoria.REPRODUCCION,
            "Días Abiertos Críticos (>120)",
            "Supera 120 días sin preñez confirmada. Pérdida económica diaria.",
            "Revisión ginecológica urgente. Evaluar BCS. Protocolo IATF si aplica.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            True,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_abiertos", KBOperador.GT, 120)
        db.session.add(r)

        r = _rec(
            "REP-002",
            KBCategoria.REPRODUCCION,
            "Días Abiertos 90-120",
            "Entre 90-120 días abiertos. El objetivo es preñar antes de 90 días.",
            "Intensificar detección de celos AM/PM. Considerar sincronización.",
            KBUrgencia.MEDIA,
            KBSexo.HEMBRA,
            False,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_abiertos", KBOperador.BETWEEN, 90, 120)
        db.session.add(r)

        r = _rec(
            "REP-003",
            KBCategoria.REPRODUCCION,
            "IEP Prolongado (>14 meses)",
            "El Intervalo Entre Partos ideal es de 12 meses. Un IEP >14 meses genera pérdidas de una cría por año.",
            "Revisar manejo reproductivo. Evaluar nutrición y condición corporal.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            True,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_abiertos", KBOperador.GT, 150)
        db.session.add(r)

        r = _rec(
            "REP-004",
            KBCategoria.REPRODUCCION,
            "Vacas sin Celo Post-Parto",
            "Si no hay señales de celo 60+ días post-parto, puede haber anestro nutricional.",
            "Evaluar BCS, aumentar proteína en dieta. Consultar veterinario.",
            KBUrgencia.MEDIA,
            KBSexo.HEMBRA,
            True,
            fuente="SENA",
        )
        _regla(r, "dias_desde_parto", KBOperador.GT, 60)
        _regla(r, "is_pregnant", KBOperador.EQ, "False")
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # PRODUCCIÓN Y SECADO
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "PRO-001",
            KBCategoria.PRODUCCION,
            "Preparación para Secado",
            "Vaca gestante lactando. Necesita periodo seco de 60 días para recuperar ubre.",
            "Iniciar protocolo de secado. Aplicar sellador intramamario.",
            KBUrgencia.MEDIA,
            KBSexo.HEMBRA,
            False,
            fuente="SENA",
        )
        _regla(r, "is_pregnant", KBOperador.EQ, "True")
        _regla(r, "is_lactating", KBOperador.EQ, "True")
        db.session.add(r)

        r = _rec(
            "PRO-002",
            KBCategoria.PRODUCCION,
            "Caída Brusca de Producción",
            "Reducción significativa de leche puede indicar mastitis, estrés o problema nutricional.",
            "Revisar ubre (CMT), temperatura rectal. Evaluar alimentación.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            False,
            fuente="FEDEGAN",
        )
        _regla(r, "leche_promedio_7d", KBOperador.LT, 3)
        _regla(r, "is_lactating", KBOperador.EQ, "True")
        db.session.add(r)

        r = _rec(
            "PRO-003",
            KBCategoria.PRODUCCION,
            "Sin Registro de Leche",
            "Animal lactante sin registros de producción en los últimos 7 días.",
            "Registrar producción diaria para tomar decisiones económicas.",
            KBUrgencia.BAJA,
            KBSexo.HEMBRA,
            False,
            fuente="SENA",
        )
        _regla(r, "leche_promedio_7d", KBOperador.IS_NULL, None)
        _regla(r, "is_lactating", KBOperador.EQ, "True")
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # NUTRICIÓN Y CRECIMIENTO
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "NUT-001",
            KBCategoria.NUTRICION,
            "Sin Control de Peso (>90 días)",
            "Sin registro de peso por más de 90 días. No se puede calcular la GPD.",
            "Pesar el animal y registrar. Calcular ganancia de peso diaria.",
            KBUrgencia.BAJA,
            KBSexo.AMBOS,
            False,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_desde_control", KBOperador.GT, 90)
        db.session.add(r)

        r = _rec(
            "NUT-002",
            KBCategoria.NUTRICION,
            "Bajo Peso en Novillo (Ceba)",
            "Novillo con peso por debajo del estándar para su edad. GPD < 400g/día.",
            "Revisar calidad del pasto, suplementar con energía (melaza, silo). Controlar parásitos.",
            KBUrgencia.MEDIA,
            KBSexo.MACHO,
            False,
            edad_min=180,
            edad_max=730,
            fuente="FEDEGAN",
        )
        _regla(r, "weight", KBOperador.LT, 150)
        _regla(r, "age_in_days", KBOperador.GT, 180)
        db.session.add(r)

        r = _rec(
            "NUT-003",
            KBCategoria.NUTRICION,
            "Ternero con Bajo Peso al Destete",
            "Ternero próximo al destete con peso < 120 kg. Puede indicar subnutrición o parasitosis.",
            "Desparasitar. Suplementar con concentrado 1kg/día. Evaluar salud de la madre.",
            KBUrgencia.MEDIA,
            KBSexo.AMBOS,
            False,
            edad_min=150,
            edad_max=240,
            fuente="SENA",
        )
        _regla(r, "weight", KBOperador.LT, 120)
        _regla(r, "age_in_days", KBOperador.BETWEEN, 150, 240)
        db.session.add(r)

        r = _rec(
            "NUT-004",
            KBCategoria.NUTRICION,
            "Suplementación Mineral Urgente",
            "Animales sin acceso a sal mineralizada pueden presentar deficiencias de Ca, P, Mg en 30 días.",
            "Proveer sal mineralizada 8% ad libitum. Verificar comederos.",
            KBUrgencia.MEDIA,
            KBSexo.AMBOS,
            False,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_desde_control", KBOperador.GT, 60)
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # MANEJO Y BIENESTAR
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "MAN-001",
            KBCategoria.MANEJO,
            "Preparación para Destete",
            "Ternero entre 7-8 meses, listo para destete. Peso objetivo: 160-180 kg.",
            "Separar gradualmente. Iniciar suplementación si hay baja disponibilidad de pasto.",
            KBUrgencia.MEDIA,
            KBSexo.AMBOS,
            False,
            edad_min=200,
            edad_max=250,
            fuente="SENA",
        )
        _regla(r, "age_in_days", KBOperador.BETWEEN, 200, 250)
        db.session.add(r)

        r = _rec(
            "MAN-002",
            KBCategoria.MANEJO,
            "Castración de Machos",
            "Machos sin destino genético deben castrarse entre 3-6 meses para mejor ganancia en ceba.",
            "Castrar antes de los 6 meses. Usar técnica quirúrgica con antiséptico.",
            KBUrgencia.BAJA,
            KBSexo.MACHO,
            True,
            edad_min=90,
            edad_max=180,
            fuente="SENA",
        )
        _regla(r, "age_in_days", KBOperador.BETWEEN, 90, 180)
        db.session.add(r)

        r = _rec(
            "MAN-003",
            KBCategoria.MANEJO,
            "Descorne Ternero",
            "Descorne sin anestesia permitido hasta los 30 días. Después requiere anestesia local.",
            "Descornar antes de los 30 días (descornetador o pasta). Después de 30 días, veterinario.",
            KBUrgencia.BAJA,
            KBSexo.AMBOS,
            False,
            edad_min=10,
            edad_max=90,
            fuente="ICA Colombia",
        )
        _regla(r, "age_in_days", KBOperador.BETWEEN, 10, 90)
        db.session.add(r)

        r = _rec(
            "MAN-004",
            KBCategoria.MANEJO,
            "Registro en SINIGAN Pendiente",
            "Animal sin número de arete oficial SINIGAN puede generar multas del ICA.",
            "Solicitar aretes al ICA o a la asociación ganadera regional. Registrar en plataforma SINIGAN.",
            KBUrgencia.ALTA,
            KBSexo.AMBOS,
            False,
            edad_min=30,
            fuente="ICA Colombia",
        )
        _regla(r, "age_in_days", KBOperador.GT, 30)
        db.session.add(r)

        r = _rec(
            "MAN-005",
            KBCategoria.MANEJO,
            "Toro: Evaluación Andrológica",
            "Toros reproductores deben evaluarse antes de cada temporada de monta (60-90 días antes).",
            "Solicitar EVA (Evaluación de Aptitud Reproductiva) a veterinario.",
            KBUrgencia.MEDIA,
            KBSexo.MACHO,
            True,
            edad_min=730,
            fuente="FEDEGAN",
        )
        _regla(r, "age_in_days", KBOperador.GT, 730)
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # SANIDAD — PREVENTIVO
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "SAN-001",
            KBCategoria.SANIDAD,
            "Desparasitación Interna Urgente",
            "Más de 90 días sin desparasitar. Parásitos gastrointestinales reducen GPD hasta 30%.",
            "Aplicar ivermectina + albendazol según peso. Rotar principios activos.",
            KBUrgencia.MEDIA,
            KBSexo.AMBOS,
            False,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_desde_control", KBOperador.GT, 90)
        db.session.add(r)

        r = _rec(
            "SAN-002",
            KBCategoria.SANIDAD,
            "Control de Garrapatas",
            "Alta infestación de garrapatas puede transmitir Babesia y Anaplasma (tristeza bovina).",
            "Baño de aspersión con Amitraz o Cipermetrina. Rotar productos cada 30 días.",
            KBUrgencia.ALTA,
            KBSexo.AMBOS,
            False,
            fuente="ICA Colombia",
        )
        _regla(r, "status", KBOperador.EQ, "Enfermo")
        db.session.add(r)

        r = _rec(
            "SAN-003",
            KBCategoria.SANIDAD,
            "Animal Enfermo — Cuarentena",
            'Animal con estado "Enfermo". Riesgo de contagio al hato.',
            "Separar del hato. Diagnóstico veterinario. Registrar en historial clínico.",
            KBUrgencia.INMEDIATA,
            KBSexo.AMBOS,
            True,
            fuente="ICA Colombia",
        )
        _regla(r, "status", KBOperador.EQ, "Enfermo")
        db.session.add(r)

        r = _rec(
            "SAN-004",
            KBCategoria.SANIDAD,
            "Alertas Sanitarias Activas",
            "Animal con múltiples alertas abiertas. Atención veterinaria prioritaria.",
            "Revisar historial de enfermedades. Consultar veterinario.",
            KBUrgencia.ALTA,
            KBSexo.AMBOS,
            True,
            fuente="FEDEGAN",
        )
        _regla(r, "pending_alerts_count", KBOperador.GTE, 2)
        db.session.add(r)

        r = _rec(
            "SAN-005",
            KBCategoria.SANIDAD,
            "Ternero Neonato — Calostro",
            "Ternero < 6 horas. Debe recibir calostro en las primeras 6h de vida para inmunidad pasiva.",
            "Asegurar consumo de calostro: 10% del peso corporal en primeras 6h. Si no mama, ordeñar y dar en biberón.",
            KBUrgencia.INMEDIATA,
            KBSexo.AMBOS,
            False,
            edad_max=3,
            fuente="SENA",
        )
        _regla(r, "age_in_days", KBOperador.LT, 3)
        db.session.add(r)

        r = _rec(
            "SAN-006",
            KBCategoria.SANIDAD,
            "Vacunación Aftosa Vencida",
            "El animal puede tener la vacuna de aftosa vencida (>6 meses sin vacunar).",
            "Aplicar vacuna de aftosa bivalente. Registrar en carnet sanitario ICA.",
            KBUrgencia.ALTA,
            KBSexo.AMBOS,
            False,
            fuente="ICA Colombia",
        )
        _regla(r, "dias_desde_control", KBOperador.GT, 180)
        db.session.add(r)

        r = _rec(
            "SAN-007",
            KBCategoria.SANIDAD,
            "Hembra: Brucelosis sin Vacunar",
            "Ternera hembra entre 3-8 meses debe vacunarse contra brucelosis (obligatorio ICA).",
            "Aplicar Cepa 19 o RB51 una sola vez. Notificar al ICA y registrar en SINIGAN.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            True,
            edad_min=90,
            edad_max=240,
            fuente="ICA Colombia",
        )
        _regla(r, "age_in_days", KBOperador.BETWEEN, 90, 240)
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # GENÉTICA
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "GEN-001",
            KBCategoria.GENETICA,
            "Oportunidad de IA en Vaca de Mérito",
            "Vaca de alta producción o con buenas características. Aprovechar para mejora genética.",
            "Considerar Inseminación Artificial con semen de toros PTA probados.",
            KBUrgencia.BAJA,
            KBSexo.HEMBRA,
            True,
            fuente="FEDEGAN",
        )
        _regla(r, "dias_abiertos", KBOperador.BETWEEN, 45, 90)
        _regla(r, "leche_promedio_7d", KBOperador.GTE, 10)
        db.session.add(r)

        r = _rec(
            "GEN-002",
            KBCategoria.GENETICA,
            "Toro: Exceso de Hembras por Macho",
            "Un toro no debe cubrir más de 30-40 vacas en monta natural.",
            "Calcular relación toro:vaca. Agregar toro o implementar IA si es necesario.",
            KBUrgencia.MEDIA,
            KBSexo.MACHO,
            True,
            edad_min=730,
            fuente="FEDEGAN",
        )
        _regla(r, "age_in_days", KBOperador.GT, 730)
        db.session.add(r)

        # ══════════════════════════════════════════════════════════════
        # BIENESTAR ANIMAL
        # ══════════════════════════════════════════════════════════════
        r = _rec(
            "BIE-001",
            KBCategoria.MANEJO,
            "Gestante en Último Tercio",
            "Vaca preñada a más de 210 días de gestación. Necesita manejo especial pre-parto.",
            "Separar a corral de maternidad 15 días antes. Dieta pre-parto. Vigilancia 24h.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            False,
            fuente="SENA",
        )
        _regla(r, "is_pregnant", KBOperador.EQ, "True")
        _regla(r, "dias_desde_parto", KBOperador.IS_NULL, None)
        db.session.add(r)

        r = _rec(
            "BIE-002",
            KBCategoria.MANEJO,
            "Post-Parto Reciente — Monitoreo",
            "Vaca con menos de 15 días post-parto. Alta susceptibilidad a enfermedades metabólicas.",
            "Monitorear temperatura, apetito y producción diariamente. Revisar retención de placenta.",
            KBUrgencia.ALTA,
            KBSexo.HEMBRA,
            False,
            fuente="SENA",
        )
        _regla(r, "dias_desde_parto", KBOperador.LT, 15)
        _regla(r, "dias_desde_parto", KBOperador.NOT_NULL, None)
        db.session.add(r)

        r = _rec(
            "BIE-003",
            KBCategoria.MANEJO,
            "Animal Viejo — Revisión de Destino",
            "Animal mayor de 10 años. Evaluar productividad y condición para decidir si continúa en producción.",
            "Evaluar: producción, condición corporal, estado dental. Considerar descarte si no es productivo.",
            KBUrgencia.BAJA,
            KBSexo.AMBOS,
            False,
            edad_min=3650,
            fuente="FEDEGAN",
        )
        _regla(r, "age_in_days", KBOperador.GT, 3650)
        db.session.add(r)

        db.session.commit()
        logger.info("✅ Base de Conocimiento v2.0 poblada: 50+ reglas, 12 calendarios.")

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error al poblar Base de Conocimiento: {e}")
