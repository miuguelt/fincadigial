from datetime import date
import logging
from app import db
from app.models.diseases import Diseases
from app.models.medications import Medications
from app.models.route_administration import RouteAdministration
from app.models.vaccines import Vaccines, VaccineType
from app.models.foodTypes import FoodTypes

logger = logging.getLogger(__name__)

def seed_catalogs_for_finca(finca_id: int):
    """
    Puebla los catálogos base (Rutas, Enfermedades, Vacunas, Medicamentos, Tipos de Alimento/Pastos)
    con información técnica y real para la ganadería en Colombia para una finca específica.
    """
    logger.info(f"Poblando catálogos exhaustivos para la finca ID: {finca_id}...")

    # 1. ---- Rutas de Administración ----
    routes = [
        {"name": "Intramuscular", "description": "Inyección profunda en masa muscular (cuello/tabla del cuello o glúteo)."},
        {"name": "Subcutánea", "description": "Inyección en el tejido celular subcutáneo (pliegue del cuello o detrás de paleta)."},
        {"name": "Intravenosa", "description": "Infusión directa en la vena yugular o mamaria (vías rápidas/emergencia)."},
        {"name": "Oral", "description": "Administración por vía bucal (drench, pistolas de drenching, bolos o alimento)."},
        {"name": "Tópica", "description": "Aplicación directa sobre piel, pelaje o pezuñas (pour-on, baños de aspersión/inmersión)."},
        {"name": "Intramamaria", "description": "Infusión directa por el esfínter del pezón a la cisterna de la ubre (secado o lactancia)."},
        {"name": "Intrauterina", "description": "Infusión o lavado antiséptico/antibiótico directo en el cuerpo o cuernos uterinos."},
        {"name": "Intraruminal", "description": "Aplicación directa al rumen por punción o sonda en el ijar izquierdo."},
        {"name": "Oftálmica", "description": "Aplicación de pomada o solución en el saco conjuntival del ojo."},
        {"name": "Epidural", "description": "Anestesia o analgesia epidural entre la última vértebra sacra y primera caudal."},
    ]
    for r in routes:
        if not RouteAdministration.query.filter_by(name=r["name"], finca_id=finca_id).first():
            db.session.add(RouteAdministration(**r, finca_id=finca_id))
    db.session.flush()

    im_route = RouteAdministration.query.filter_by(name="Intramuscular", finca_id=finca_id).first()
    sc_route = RouteAdministration.query.filter_by(name="Subcutánea", finca_id=finca_id).first()
    iv_route = RouteAdministration.query.filter_by(name="Intravenosa", finca_id=finca_id).first()
    oral_route = RouteAdministration.query.filter_by(name="Oral", finca_id=finca_id).first()
    topica_route = RouteAdministration.query.filter_by(name="Tópica", finca_id=finca_id).first()
    mamaria_route = RouteAdministration.query.filter_by(name="Intramamaria", finca_id=finca_id).first()

    # 2. ---- Enfermedades ----
    diseases_data = [
        {"name": "Fiebre Aftosa", "symptoms": "Fiebre alta (40-41°C), vesículas/aftas en lengua, encías, rodetes coronarios y pezones, salivación profusa y cojera.", "details": "Enfermedad viral (Aftovirus) altamente contagiosa. Notificación obligatoria inmediata al ICA. Sujeta a Plan Nacional de Erradicación."},
        {"name": "Brucelosis Bovina", "symptoms": "Aborto en el último tercio de gestación, retención placentaria, metritis, nacimientos débiles y orquitis en machos.", "details": "Bacteriana (Brucella abortus). Zoonosis crítica. Sujeta a Plan Oficial de Control y Certificación de Hatos Libres por el ICA."},
        {"name": "Tuberculosis Bovina", "symptoms": "Tos crónica progresiva, pérdida gradual de peso, dificultad respiratoria, ganglios linfáticos infartados.", "details": "Bacteriana (Mycobacterium bovis). Enfermedad granulomatosa crónica zoonótica. Notificación obligatoria e insostenible en lecherías."},
        {"name": "Rabia Silvestre Bovina", "symptoms": "Incoordinación, parálisis del tren posterior, salivación excesiva, agresividad o abatimiento, tenesmo y muerte.", "details": "Viral (Lyssavirus) transmitida por mordedura del murciélago vampiro (Desmodus rotundus). Vacunación obligatoria en zonas de foco/riesgo."},
        {"name": "Estomatitis Vesicular", "symptoms": "Vesículas y erosiones en mucosa oral, lengua, pezones y pezuñas, salivación y caída marcada en leche.", "details": "Viral (Vesiculovirus, cepas New Jersey e Indiana). Clínicamente indistinguible de Aftosa; requiere diagnóstico de laboratorio ICA."},
        {"name": "Carbón Bacteridiano (Ántrax)", "symptoms": "Muerte súbita, ausencia de rigor mortis, salida de sangre oscura por orificios naturales (nariz, ano), meteorismo rápido.", "details": "Bacteriana (Bacillus anthracis). Esporulada de alta persistencia en suelo. Prohibido realizar necropsia por riesgo de esporulación zoonótica."},
        {"name": "Carbón Sintomático (Mancha)", "symptoms": "Cojera severa, hinchazón crepitante y dolorosa en grandes masas musculares (pierna, paleta), fiebre alta y muerte súbita.", "details": "Bacteriana (Clostridium chauvoei). Infección endógena por esporas clostridiales en terneros y novillos en desarrollo."},
        {"name": "Edema Maligno", "symptoms": "Edema blando y caliente en heridas quirúrgicas o traumáticas, gangrena subcutánea, depresión profunda y muerte en 24-48h.", "details": "Infección clostridial polimicrobiana (Clostridium septicum, novyi, sordellii). Asociada a agujas sucias o descastes sin asepsia."},
        {"name": "Mastitis Clínica", "symptoms": "Ubre inflamada, roja y caliente; leche anormal con grumos, coágulos, suero o sangre; fiebre y pérdida del apetito.", "details": "Infección bacteriana (Staphylococcus aureus, Streptococcus uberis, E. coli). Pérdida económica severa por descarte de leche y tratamientos."},
        {"name": "Mastitis Subclínica", "symptoms": "Sin síntomas visibles en la ubre o leche, pero con recuento de células somáticas (RCS) > 200,000 cel/ml y prueba CMT positiva.", "details": "Infección latente que reduce entre 10% y 25% la producción total de leche de la vaca sin ser detectada a simple vista."},
        {"name": "Anaplasmosis Bovina", "symptoms": "Fiebre alta (40°C), anemia severa (mucosas pálidas), ictericia (ojos amarillos), estreñimiento con heces oscuras y agresividad por anoxia cerebral.", "details": "Rickettsial (Anaplasma marginale) intraeritrocitaria. Transmitida por garrapatas (Rhipicephalus microplus) y vectores mecánicos (tábanos, agujas)."},
        {"name": "Babesiosis Bovina (Fiebre de Garrapata)", "symptoms": "Fiebre intensa, anemia, ictericia y hemoglobinuria característica (orina de color rojo oscuro o café), debilidad extrema.", "details": "Parasitaria (Babesia bovis / Babesia bigemina) intraeritrocitaria. Transmitida exclusivamente por la garrapata del ganado."},
        {"name": "Tripanosomiasis Bovina (Seca)", "symptoms": "Anemia progresiva, emaciación severa (secadera), edema submandibular (papera) y ventral, lagrimeo y caída reproductiva.", "details": "Protozoario hemotrópico (Trypanosoma vivax / evansi). Transmitido mecánicamente por tábanos (Tabanus spp.) y moscas (Stomoxys calcitrans)."},
        {"name": "Leptospirosis Bovina", "symptoms": "Abortos en cualquier tercio de gestación, síndrome de leche flácida/amarilla ensangrentada, ictericia y hemoglobinuria en terneros.", "details": "Bacteriana (Leptospira interrogans, serovares Hardjo, Pomona, Canicola). Transmitida por orina de roedores y aguas contaminadas. Zoonosis."},
        {"name": "Rinotraqueítis Infecciosa Bovina (IBR)", "symptoms": "Secreción nasal y ocular purulenta, hiperemia en mucosa nasal ('nariz roja'), abortos, vulvovaginitis pustular y caquexia.", "details": "Viral (Herpesvirus bovino tipo 1 - BoHV-1). Causa importante del Complejo Reproductivo y Respiratorio Bovino."},
        {"name": "Diarrea Viral Bovina (DVB)", "symptoms": "Diarrea profusa, erosiones en boca y hocico, problemas reproductivos (reabsorción, aborto, malformaciones) y terneros inmunotolerantes (PI).", "details": "Viral (Pestivirus). Inmunosupresor severo que facilita la entrada de otras enfermedades en el hato."},
        {"name": "Complejo Respiratorio Bovino (Neumonía)", "symptoms": "Tos frecuente, secreción mucopurulenta bilateral, polipnea (respiración rápida), fiebre, orejas gachas y aislamiento.", "details": "Multifactorial (Pasteurella multocida, Mannheimia haemolytica, Histophilus somni + virus IBR/PI3/BRSV) detonado por estrés/transporte."},
        {"name": "Diarrea Neonatal del Ternero (DNT)", "symptoms": "Heces líquidas amarillas o blancas, deshidratación rápida (ojos undidos), debilidad para levantarse y acidosis metabólica.", "details": "Síndrome diarreico en terneros <30 días causado por Rotavirus, Coronavirus, E. coli K99 o Cryptosporidium parvum."},
        {"name": "Pododermatitis Interdigital (Pedera / Gabarro)", "symptoms": "Cojera agudísima, inflamación simétrica del espacio interdigital, mal olor fétido penetrante y necrosis de la piel de la pezuña.", "details": "Bacteriana sinérgica (Dichelobacter nodosus y Fusobacterium necrophorum). Favorecida por barriales y humedad en potreros."},
        {"name": "Leucosis Enzootica Bovina (LEB)", "symptoms": "Linfosarcomas tumores en ganglios linfáticos superficiales, abomaso, corazón o útero; pérdida de peso y exoftalmia (ojos brotados).", "details": "Viral (Deltaretrovirus / BLV). Transmisión iatrogénica por reutilización de agujas, guantes de palpación o descastes sin desinfección."},
        {"name": "Queratoconjuntivitis Infecciosa Bovina", "symptoms": "Lagrimeo abundante (epífora), fotofobia (cierre del ojo al sol), opacidad corneal ('nube blanca') que puede ulcerarse y perforarse.", "details": "Bacteriana (Moraxella bovis). Propagada por moscas (Musca autumnalis) y polvo durante épocas de verano seco."},
        {"name": "Metritis y Endometritis Postparto", "symptoms": "Secreción uterina purulenta o loquial fétida por la vulva, fiebre postparto, atraso en involución uterina y anestro prolongado.", "details": "Infección bacteriana secundaria a partos distócicos, retención de placenta o manipulación obstétrica sin asepsia."},
        {"name": "Cisticercosis Bovina", "symptoms": "Generalmente asintomática en el animal vivo. En canal se observan quistes (Cysticercus bovis) en músculo masetero, corazón y lengua.", "details": "Fase larval de Taenia saginata (tenia humana). Causa de decomiso en plantas de beneficio. Zoonosis transmitida por fecalismo humano."},
        {"name": "Fasciolasis Hepática (Alicuya / Papera)", "symptoms": "Anemia, emaciación, pérdida de condición corporal, edema submandibular ('papera') y muerte por falla hepática.", "details": "Parasitaria por tremátodo (Fasciola hepatica). Transmitida por caracoles de agua dulce (Lymnaea) en zonas húmedas o encharcadas."},
        {"name": "Hipocalcemia (Fiebre de Leche)", "symptoms": "Vaca caída en S postparto, incapacidad para levantarse, hipotermia (orejas frías), constipación y paresia muscular progresiva.", "details": "Trastorno metabólico agudo por déficit severo de calcio sanguíneo al inicio de la lactancia en vacas de alta producción."},
        {"name": "Timpanismo Ruminal (Empaste)", "symptoms": "Distensión marcada y rápida del ijar izquierdo, malestar agudo, salivación, dificultad para respirar y colapso circulatorio.", "details": "Acumulación excesiva de gas libre o espuma en el rumen por consumo repentino de leguminosas tiernas o bloqueo esofágico."},
    ]
    for dd in diseases_data:
        if not Diseases.query.filter_by(name=dd["name"], finca_id=finca_id).first():
            db.session.add(Diseases(**dd, finca_id=finca_id))
    db.session.flush()

    # Mapeo de enfermedades para vincular vacunas
    def get_dis(n): return Diseases.query.filter_by(name=n, finca_id=finca_id).first()

    aftosa_dis = get_dis("Fiebre Aftosa")
    brucelosis_dis = get_dis("Brucelosis Bovina")
    rabia_dis = get_dis("Rabia Silvestre Bovina")
    mancha_dis = get_dis("Carbón Sintomático (Mancha)")
    ibr_dis = get_dis("Rinotraqueítis Infecciosa Bovina (IBR)")
    neumonia_dis = get_dis("Complejo Respiratorio Bovino (Neumonía)")
    estomatitis_dis = get_dis("Estomatitis Vesicular")
    leptospirosis_dis = get_dis("Leptospirosis Bovina")
    anaplasma_dis = get_dis("Anaplasmosis Bovina")

    # 3. ---- Vacunas ----
    if im_route and sc_route:
        vaccines_data = [
            {"name": "Vacuna Bivalente Antiaftosa (Ciclo ICA)", "dosis": "2 ml SC o IM", "route_administration_id": sc_route.id,
             "vaccination_interval": "6 meses (Ciclos Oficiales ICA)", "type": VaccineType.Inactivada, "national_plan": "Sí (Obligatoria)", "target_disease_id": aftosa_dis.id if aftosa_dis else None},
            {"name": "Vacuna Brucelosis Cepa 19", "dosis": "2 ml SC", "route_administration_id": sc_route.id,
             "vaccination_interval": "Dosis única (Terneras 3-9 meses)", "type": VaccineType.Atenuada, "national_plan": "Sí (Obligatoria)", "target_disease_id": brucelosis_dis.id if brucelosis_dis else None},
            {"name": "Vacuna Brucelosis RB51", "dosis": "2 ml SC", "route_administration_id": sc_route.id,
             "vaccination_interval": "Dosis única / Revacunación hembras", "type": VaccineType.Atenuada, "national_plan": "Sí (Obligatoria)", "target_disease_id": brucelosis_dis.id if brucelosis_dis else None},
            {"name": "Vacuna Polivalente Clostridial 10 Vías", "dosis": "5 ml SC o IM", "route_administration_id": sc_route.id,
             "vaccination_interval": "Anual (Primo-vacunación 2 dosis separadas 21 días)", "type": VaccineType.Toxoide, "national_plan": "Recomendada", "target_disease_id": mancha_dis.id if mancha_dis else None},
            {"name": "Vacuna Antirrábica Bovina (Biológica)", "dosis": "2 ml IM o SC", "route_administration_id": im_route.id,
             "vaccination_interval": "Anual en zonas de foco/riesgo de murciélago", "type": VaccineType.Inactivada, "national_plan": "Obligatoria en focos ICA", "target_disease_id": rabia_dis.id if rabia_dis else None},
            {"name": "Vacuna Complejo Reproductivo (Bovi-Shield Gold / Reproguard)", "dosis": "2 ml o 5 ml IM", "route_administration_id": im_route.id,
             "vaccination_interval": "Anual (30-60 días antes del servicio)", "type": VaccineType.Inactivada, "national_plan": "Recomendada", "target_disease_id": ibr_dis.id if ibr_dis else None},
            {"name": "Vacuna Complejo Respiratorio Terneros (CattleMaster / RespiShield)", "dosis": "2 ml SC", "route_administration_id": sc_route.id,
             "vaccination_interval": "Semestral o pre-destete", "type": VaccineType.Subunidad, "national_plan": "Recomendada", "target_disease_id": neumonia_dis.id if neumonia_dis else None},
            {"name": "Vacuna contra Estomatitis Vesicular", "dosis": "2 ml SC", "route_administration_id": sc_route.id,
             "vaccination_interval": "Semestral en zonas de alto riesgo", "type": VaccineType.Inactivada, "national_plan": "Control brotes ICA", "target_disease_id": estomatitis_dis.id if estomatitis_dis else None},
            {"name": "Vacuna Leptospira 6 Cepas", "dosis": "2 ml SC o IM", "route_administration_id": sc_route.id,
             "vaccination_interval": "Semestral en trópico húmedo", "type": VaccineType.Inactivada, "national_plan": "Recomendada", "target_disease_id": leptospirosis_dis.id if leptospirosis_dis else None},
            {"name": "Hemovacuna Vivat (Anaplasma + Babesia ICA)", "dosis": "2 ml SC", "route_administration_id": sc_route.id,
             "vaccination_interval": "Dosis única terneros 3 a 9 meses", "type": VaccineType.Atenuada, "national_plan": "Trópico Bajo", "target_disease_id": anaplasma_dis.id if anaplasma_dis else None},
        ]
        for vd in vaccines_data:
            if vd["target_disease_id"] is not None and not Vaccines.query.filter_by(name=vd["name"], finca_id=finca_id).first():
                db.session.add(Vaccines(**vd, finca_id=finca_id))
        db.session.flush()

    # 4. ---- Medicamentos ----
    if im_route and sc_route and iv_route and oral_route and topica_route and mamaria_route:
        meds_data = [
            {"name": "Oxitetraciclina L.A. 200 mg/ml (Terramicina LA)", "description": "Antibiótico de amplio espectro de larga acción (72 horas de efecto por dosis).", "route_administration_id": im_route.id, "indications": "Tratamiento de anaplasmosis, neumonías, pedera, leptospirosis y heridas infectadas."},
            {"name": "Penicilina G Procaínica + Estreptomicina (Combiotico)", "description": "Antibiótico sinérgico bactericida amplio espectro.", "route_administration_id": im_route.id, "indications": "Infecciones estreptocócicas y estafilocócicas, carbón sintomático, edema maligno, metritis."},
            {"name": "Florfenicol 300 mg/ml (Nuflor / Florgan)", "description": "Antibiótico sintético de alta penetración tisular en tejido pulmonar.", "route_administration_id": im_route.id, "indications": "Tratamiento de elección para Complejo Respiratorio Bovino (Neumonía severa), queratoconjuntivitis y pedera."},
            {"name": "Amoxicilina Trihidrato L.A. 150 mg/ml", "description": "Antibiótico betalactámico bactericida de larga acción.", "route_administration_id": im_route.id, "indications": "Infecciones gastrointestinales, respiratorias, urinarias y prevención de infecciones postparto."},
            {"name": "Ceftiofur Clorhidrato 50 mg/ml (Excenel LA)", "description": "Cefalosporina de 3ra generación. Cero días de tiempo de retiro en leche.", "route_administration_id": im_route.id, "indications": "Metritis aguda postparto, pododermatitis interdigital y neumonías en vacas en lactancia activa."},
            {"name": "Ivermectina 1% (Ivomec / Baymec)", "description": "Antiparasitario endectocida sistémico (acción contra parásitos internos y externos).", "route_administration_id": sc_route.id, "indications": "Control de gusanos gastrointestinales, pulmonares, nuche (tórsalo), garrapatas y piojos chupadores."},
            {"name": "Ivermectina 3.15% L.A. (Ivomec Gold)", "description": "Antiparasitario concentrado de liberación prolongada hasta 120 días.", "route_administration_id": sc_route.id, "indications": "Control prolongado de ectoparásitos y endoparásitos en lotes de levante y ceba."},
            {"name": "Doramectina 1% (Dectomax)", "description": "Endectocida de alta biodisponibilidad y persistencia tisular.", "route_administration_id": sc_route.id, "indications": "Tratamiento y prevención de miasis (gusaneras en ombligo/castración), ácaros de la sarna y parásitos."},
            {"name": "Albendazol 25% + Cobalto (Valbazen 25Co)", "description": "Antiparasitario oral de amplio espectro nematocida, cestocida y fasciolicida.", "route_administration_id": oral_route.id, "indications": "Tratamiento de parásitos gastrointestinales, pulmonares, tenias y Fasciola hepatica (alicuya)."},
            {"name": "Fenbendazol 10% (Panacur 10%)", "description": "Antihelmíntico oral de alta seguridad reproductiva.", "route_administration_id": oral_route.id, "indications": "Control de parásitos gastrointestinales en vacas gestantes, terneros neonatos y novillas."},
            {"name": "Levamisol 12% (Ripercol L 12%)", "description": "Antiparasitario inyectable y potente inmunoestimulante inespecífico.", "route_administration_id": sc_route.id, "indications": "Parásitos gastrointestinales y pulmonares; estimulación de defensas previa a vacunaciones."},
            {"name": "Diminazeno Diaceturato 70 mg/ml (Berenil / Ganaseg)", "description": "Agente quimioterapéutico específico hemotrópico.", "route_administration_id": im_route.id, "indications": "Tratamiento curativo directo de Babesiosis (Babesia bovis/bigemina) y Tripanosomiasis (Trypanosoma vivax)."},
            {"name": "Imidocarb Dipropionato 120 mg/ml (Imizol)", "description": "Hematicida antiprotozoario de larga acción.", "route_administration_id": sc_route.id, "indications": "Tratamiento curativo y preventivo de la Fiebre de Garrapata (Babesia) y Anaplasmosis en ganado introducido a trópico."},
            {"name": "Dexametasona 2 mg/ml (Azium)", "description": "Corticosteroide antiinflamatorio, antialérgico y gluconeogénico de alta potencia.", "route_administration_id": im_route.id, "indications": "Tratamiento de inflamaciones agudas, ketosis/cetosis bovina, reacciones alérgicas y choques anafilácticos."},
            {"name": "Flunixin Meglumine 50 mg/ml (Banamine / Finadyne)", "description": "Antiinflamatorio no esteroideo (AINE), analgésico y antipirético potente sin efecto inmunosupresor.", "route_administration_id": iv_route.id, "indications": "Tratamiento de dolor agudo, fiebre en neumonías, mastitis agudas endotóxicas y cólicos."},
            {"name": "Meloxicam 20 mg/ml (Metacam)", "description": "AINE preferencial COX-2 de larga duración (hasta 48h por dosis).", "route_administration_id": sc_route.id, "indications": "Alivio del dolor e inflamación en diarreas del ternero, descorne, castración y cojeras."},
            {"name": "Dipirona Sódica 500 mg/ml (Novalcina)", "description": "Analgésico, antiespasmódico visceral y antipirético de acción rápida.", "route_administration_id": im_route.id, "indications": "Control inmediato de la fiebre alta, dolores espasmódicos intestinales/uterinos y cólicos."},
            {"name": "Complejo B + Vitamina B12 (Belamyl / Catosal)", "description": "Reconstituyente vitamínico, hematopoyético y estimulante del metabolismo.", "route_administration_id": im_route.id, "indications": "Tratamiento de anemias, debilidad, convalecencia post-enfermedad y estimulación del apetito."},
            {"name": "Calcio + Fósforo + Magnesio + Dextrosa (Calphon Forte)", "description": "Solución mineral inyectable reconstituyente de rápida asimilación.", "route_administration_id": iv_route.id, "indications": "Tratamiento de emergencia para la Fiebre de Leche (hipocalcemia), tetania grasera y colapso metabólico postparto."},
            {"name": "Vitamina ADE Inyectable (Vigantol ADE Fuerte)", "description": "Suplemento concentrado de vitaminas liposolubles A, D3 y E.", "route_administration_id": im_route.id, "indications": "Preparación de vacas para el empadre/IA, prevención de retención placentaria y raquitismo en terneros."},
            {"name": "Oxitocina 10 UI/ml", "description": "Hormona promotora de la contracción del músculo liso uterino y miometrial.", "route_administration_id": im_route.id, "indications": "Inducción de la bajada de la leche en vacas duras, auxilio en retención de placenta y evacuación de metritis."},
            {"name": "Cefapirina Intramamaria Secado (Cefa-Sec)", "description": "Tubo intramamario con antibiótico de liberación lenta para periodo seco.", "route_administration_id": mamaria_route.id, "indications": "Tratamiento y prevención de mastitis subclínica durante el periodo de secado (60 días preparto)."},
            {"name": "Curagusan / Larvicida Aerosol Tópico (Azul de Metileno)", "description": "Antiséptico, desinfectante, cicatrizante y repelente de moscas en spray.", "route_administration_id": topica_route.id, "indications": "Tratamiento de curaciones de ombligo en neonatos, heridas de descorne, castraciones y prevención de gusaneras."},
        ]
        for md in meds_data:
            if not Medications.query.filter_by(name=md["name"], finca_id=finca_id).first():
                db.session.add(Medications(**md, finca_id=finca_id))
        db.session.flush()

    # 5. ---- Tipos de Alimento / Pastos / Forrajes ----
    food_types_data = [
        {"food_type": "Pasto Brachiaria decumbens (Amargo)", "sowing_date": date(2024, 1, 15), "area": 10, "handlings": "Pastoreo rotacional continuo. Fertilización nitrogenada post-pastoreo. Tolera suelos ácidos de trópico bajo.", "gauges": "Aforo promedio: 1.2 kg/m2 (verde). Proteína bruta: 7-10%."},
        {"food_type": "Pasto Brachiaria brizantha (Marandú / Toledo)", "sowing_date": date(2024, 2, 1), "area": 12, "handlings": "Pasto macollador de alto rendimiento. Requiere 30-35 días de descanso en lluvia. Sensible a encharcamiento.", "gauges": "Aforo promedio: 1.8 kg/m2 (verde). Proteína bruta: 9-12%."},
        {"food_type": "Pasto Brachiaria humidicola (Pomerania)", "sowing_date": date(2024, 3, 10), "area": 8, "handlings": "Excelente para suelos húmedos, mal drenados o vegas. Tolera sobrepastoreo severo.", "gauges": "Aforo promedio: 1.0 kg/m2 (verde). Proteína bruta: 6-8%."},
        {"food_type": "Pasto Kikuyo (Pennisetum clandestinum)", "sowing_date": date(2023, 11, 20), "area": 15, "handlings": "Dominante en trópico alto (2.000-3.000 msnm). Control estricto de colchón. Fertilización con urea y gallinaza.", "gauges": "Aforo promedio: 2.2 kg/m2 (verde). Proteína bruta: 14-18%."},
        {"food_type": "Pasto Ryegrass Perenne (Lolium perenne)", "sowing_date": date(2024, 4, 5), "area": 5, "handlings": "Lechería especializada de trópico alto. Riego por aspersión y fertilización alta en nitrógeno/potasio.", "gauges": "Aforo promedio: 2.5 kg/m2 (verde). Proteína bruta: 18-22%."},
        {"food_type": "Pasto Estrella (Cynodon nlemfuensis)", "sowing_date": date(2024, 1, 28), "area": 7, "handlings": "Pasto estolonífero de crecimiento rápido. Rotación corta (21-25 días). Responde muy bien a fertirriego.", "gauges": "Aforo promedio: 1.5 kg/m2 (verde). Proteína bruta: 11-14%."},
        {"food_type": "Pasto Guinea Mombaza (Panicum maximum)", "sowing_date": date(2024, 5, 12), "area": 14, "handlings": "Pasto macollador alto para novillos de ceba. Exigente en fertilidad de suelo y buen drenaje.", "gauges": "Aforo promedio: 2.8 kg/m2 (verde). Proteína bruta: 11-15%."},
        {"food_type": "Botón de Oro (Tithonia diversifolia)", "sowing_date": date(2024, 2, 20), "area": 2, "handlings": "Arbusto forrajero proteico para corte y acarreo o franjas silvopastoriles. Poda a 40 cm cada 50 días.", "gauges": "Aforo promedio: 3.5 kg/planta. Proteína bruta: 20-25%."},
        {"food_type": "Matarratón (Gliricidia sepium)", "sowing_date": date(2024, 1, 10), "area": 2, "handlings": "Leguminosa arbórea fijadora de nitrógeno. Excelente banco proteico para suplementación en verano.", "gauges": "Proteína bruta: 22-26%. Alta digestibilidad ruminal."},
        {"food_type": "Pasto Maralfalfa / Pincoya (Corte)", "sowing_date": date(2024, 3, 1), "area": 4, "handlings": "Pasto de corte de biomasa gigante. Riego continuo y abonado orgánico masivo post-corte (70 días).", "gauges": "Rendimiento: 8-12 kg/m2 por corte. Proteína bruta: 10-13%."},
        {"food_type": "Ensilaje de Maíz (Zea mays)", "sowing_date": date(2024, 6, 1), "area": 6, "handlings": "Cosechado en estado de grano lechoso-pastoso (32-35% materia seca). Compactado y sellado hermético.", "gauges": "Energía neta de lactancia: 1.5 Mcal/kg MS. Proteína bruta: 7-8%."},
        {"food_type": "Torta de Palmiste (Suplemento)", "sowing_date": date(2024, 1, 1), "area": 1, "handlings": "Subproducto de extracción de aceite de palma. Suministro en canoa 1-2 kg/animal/día.", "gauges": "Materia seca: 90%. Proteína bruta: 14-16%. Fibra alta."},
        {"food_type": "Sal Mineralizada 8% Fósforo", "sowing_date": date(2024, 1, 1), "area": 1, "handlings": "Suministro a voluntad en saladeros cubiertos. Consumo esperado: 80-100 g/bovino adulto/día.", "gauges": "Fósforo: 8%, Calcio: 12%, Magnesio: 2%, Azufre: 4%, Microelementos."},
        {"food_type": "Sal Mineralizada 12% Fósforo (Cría/Leche)", "sowing_date": date(2024, 1, 1), "area": 1, "handlings": "Para vacas en lactancia y hembras en reproducción en suelos bajos en fósforo.", "gauges": "Fósforo: 12%, Calcio: 14%, Selenio, Zinc, Cobre, Yodo, Cobalto."},
    ]
    for ft in food_types_data:
        if not FoodTypes.query.filter_by(food_type=ft["food_type"], finca_id=finca_id).first():
            db.session.add(FoodTypes(**ft, finca_id=finca_id))
    db.session.flush()

    try:
        db.session.commit()
        logger.info(f"✨ Catálogos exhaustivos poblados exitosamente para la finca {finca_id}.")
    except Exception as e:
        logger.error(f"Error al poblar catálogos para finca {finca_id}: {e}")
        db.session.rollback()
