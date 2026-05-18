import logging

def register_namespaces(api):
    logger = logging.getLogger(__name__)

    # Importaciones diferidas para evitar ciclos
    from ..namespaces.users.auth_namespace import auth_ns
    from ..namespaces.users.users_namespace import users_ns
    from ..namespaces.animals.animals_namespace import animals_ns
    from ..namespaces.animals.milk_production_namespace import milk_ns
    from ..namespaces.analytics.legacy import legacy_ns
    from ..namespaces.analytics import analytics_ns
    from ..namespaces.analytics.dashboard import dashboard_ns
    from ..namespaces.analytics.animals import animals_ns as analytics_animals_ns
    from ..namespaces.analytics.alerts import alerts_analytics_ns
    from ..namespaces.analytics.production import production_ns
    from ..namespaces.analytics.health import health_analytics_ns
    from ..namespaces.analytics.ai_insights import ai_ns
    from ..namespaces.analytics.predictions import predictions_ns
    from ..namespaces.analytics.live import live_ns
    from ..namespaces.analytics.calendar import calendar_ns
    from ..namespaces.analytics.inventory_analytics_namespace import inventory_analytics_ns
    from ..namespaces.core.security_namespace import security_ns
    from ..namespaces.animals.species_namespace import species_ns
    from ..namespaces.animals.breeds_namespace import breeds_ns
    from ..namespaces.health.control_namespace import control_ns
    from ..namespaces.farm.fields_namespace import fields_ns
    from ..namespaces.health.diseases_namespace import diseases_ns
    from ..namespaces.animals.genetic_improvements_namespace import genetic_improvements_ns
    from ..namespaces.farm.food_types_namespace import food_types_ns
    from ..namespaces.health.treatments_namespace import treatments_ns
    from ..namespaces.health.vaccinations_namespace import vaccinations_ns
    from ..namespaces.health.vaccines_namespace import vaccines_ns
    from ..namespaces.health.medications_namespace import medications_ns
    from ..namespaces.farm.route_administration_namespace import route_admin_ns
    from ..namespaces.animals.animal_diseases_namespace import animal_diseases_ns
    from ..namespaces.animals.animal_fields_namespace import animal_fields_ns
    from ..namespaces.health.treatment_medications_namespace import treatment_medications_ns
    from ..namespaces.health.treatment_vaccines_namespace import treatment_vaccines_ns
    from ..namespaces.users.user_preferences_namespace import prefs_ns
    from ..namespaces.core.navigation_namespace import nav_ns
    from ..namespaces.animals.animal_images_namespace import animal_images_ns
    from ..namespaces.core.activity_namespace import activity_ns
    from ..namespaces.core.alerts_namespace import alerts_ns
    from ..namespaces.farm.inventory_namespace import inventory_ns
    from ..namespaces.animals.reproduction_namespace import reproduction_ns
    from ..namespaces.finanzas.exports_namespace import exports_ns
    from ..namespaces.animals.growth_namespace import growth_ns
    from ..namespaces.core.public_namespace import public_ns
    from ..namespaces.finanzas.multi_finca_namespace import multi_finca_ns
    from ..namespaces.finanzas.regulatory_reports_namespace import regulatory_ns
    from ..namespaces.users.push_notifications_namespace import push_ns
    from ..namespaces.core.api_docs_namespace import docs_ns
    from ..namespaces.farm.fincas_namespace import fincas_ns
    from ..namespaces.users.membership_namespace import membership_ns
    from ..namespaces.core.location_namespace import location_ns
    from ..namespaces.core.chat_namespace import chat_ns
    from ..namespaces.core.sync_namespace import sync_ns
    from ..namespaces.core.devices_namespace import devices_ns
    from ..namespaces.core.node_messages_namespace import node_messages_ns
    from ..namespaces.core.attachments_namespace import attachments_ns
    from ..namespaces.core.stress_test_namespace import stress_ns
    from ..namespaces.core.kb_namespace import kb_ns
    from ..namespaces.finanzas.financial_namespace import financial_ns
    from ..namespaces.farm.tasks_namespace import tasks_ns
    from ..namespaces.farm.operational_namespace import operational_ns
    from ..namespaces.farm.animal_groups_namespace import animal_groups_ns
    from ..namespaces.farm.infrastructure_namespace import infrastructure_ns
    from ..namespaces.farm.management_plans_namespace import management_plans_ns
    from ..namespaces.users.producer_profiles_namespace import producer_profiles_ns
    from ..namespaces.farm.campesino_namespace import (
        crop_plots_ns,
        crop_activities_ns,
        water_sources_ns,
        water_measurements_ns,
        climate_risks_ns,
        market_offers_ns,
        technical_assistance_ns,
        offline_learning_ns,
    )

    # Registro de namespaces
    api.add_namespace(auth_ns)
    api.add_namespace(users_ns)
    api.add_namespace(animals_ns)
    api.add_namespace(milk_ns)
    api.add_namespace(legacy_ns)
    api.add_namespace(analytics_ns)
    api.add_namespace(dashboard_ns)
    api.add_namespace(analytics_animals_ns)
    api.add_namespace(alerts_analytics_ns)
    api.add_namespace(production_ns)
    api.add_namespace(health_analytics_ns)
    api.add_namespace(ai_ns)
    api.add_namespace(predictions_ns)
    api.add_namespace(live_ns)
    api.add_namespace(calendar_ns)
    api.add_namespace(inventory_analytics_ns)
    api.add_namespace(security_ns)
    api.add_namespace(species_ns)
    api.add_namespace(breeds_ns)
    api.add_namespace(control_ns)
    api.add_namespace(fields_ns)
    api.add_namespace(diseases_ns)
    api.add_namespace(genetic_improvements_ns)
    api.add_namespace(food_types_ns)
    api.add_namespace(treatments_ns)
    api.add_namespace(vaccinations_ns)
    api.add_namespace(vaccines_ns)
    api.add_namespace(medications_ns)
    api.add_namespace(route_admin_ns)
    api.add_namespace(animal_diseases_ns)
    api.add_namespace(animal_fields_ns)
    api.add_namespace(treatment_medications_ns)
    api.add_namespace(treatment_vaccines_ns)
    api.add_namespace(prefs_ns)
    api.add_namespace(nav_ns)
    api.add_namespace(animal_images_ns)
    api.add_namespace(activity_ns)
    api.add_namespace(activity_ns, path='/activity-log')
    api.add_namespace(alerts_ns)
    api.add_namespace(inventory_ns)
    api.add_namespace(reproduction_ns)
    api.add_namespace(exports_ns)
    api.add_namespace(growth_ns)
    api.add_namespace(public_ns)
    api.add_namespace(multi_finca_ns)
    api.add_namespace(regulatory_ns)
    api.add_namespace(push_ns)
    api.add_namespace(docs_ns)
    api.add_namespace(fincas_ns)
    api.add_namespace(membership_ns, path='/membership')
    api.add_namespace(location_ns, path='/location')
    api.add_namespace(chat_ns, path='/chat')
    api.add_namespace(sync_ns, path='/sync')
    api.add_namespace(devices_ns, path='/devices')
    api.add_namespace(node_messages_ns, path='/node-messages')
    api.add_namespace(attachments_ns, path='/attachments')
    api.add_namespace(financial_ns, path='/financial')
    api.add_namespace(tasks_ns)
    api.add_namespace(operational_ns)
    api.add_namespace(animal_groups_ns)
    api.add_namespace(infrastructure_ns)
    api.add_namespace(crop_plots_ns)
    api.add_namespace(crop_activities_ns)
    api.add_namespace(water_sources_ns)
    api.add_namespace(water_measurements_ns)
    api.add_namespace(climate_risks_ns)
    api.add_namespace(market_offers_ns)
    api.add_namespace(technical_assistance_ns)
    api.add_namespace(offline_learning_ns)
    api.add_namespace(management_plans_ns)
    api.add_namespace(producer_profiles_ns)
    api.add_namespace(kb_ns, path='/knowledge_base')
    
    stress_ns.authorizations = {}
    api.add_namespace(stress_ns, path='/stress')
    
    from ..utils.health_check import health_ns
    api.add_namespace(health_ns, path='/health')

    return {
        'auth': auth_ns,
        'users': users_ns,
        'activity': activity_ns,
        'exempt_list': [
            diseases_ns, genetic_improvements_ns, food_types_ns, treatments_ns, vaccinations_ns,
            vaccines_ns, medications_ns, route_admin_ns, animal_diseases_ns, animal_fields_ns,
            treatment_medications_ns, treatment_vaccines_ns, prefs_ns, nav_ns, animal_images_ns,
            fincas_ns
        ]
    }
