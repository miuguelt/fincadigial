# 🧭 CORTEX MAP: BackFinca

> Ubicación: `C:\Users\Miguel\Documents\GitHub\BackFinca`

## 📁 Estructura comprimida
```text
├── .trae/
│   └── documents/
│       └── Fix Backend Stability by Switching to Gevent Workers.md
├── app/
│   ├── controllers/
│   │   └── treatments_controller.py
│   ├── extensions/
│   │   └── db.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── activity_daily_agg.py
│   │   ├── activity_log.py
│   │   ├── animalDiseases.py
│   │   ├── animalFields.py
│   │   ├── animal_images.py
│   │   ├── animals.py
│   │   ├── base_model.py
│   │   ├── breeds.py
│   │   ├── control.py
│   │   ├── diseases.py
│   │   ├── fields.py
│   │   ├── foodTypes.py
│   │   ├── geneticImprovements.py
│   │   ├── medications.py
│   │   ├── route_administration.py
│   │   ├── species.py
│   │   ├── treatment_medications.py
│   │   ├── treatment_vaccines.py
│   │   ├── treatments.py
│   │   ├── user.py
│   │   ├── vaccinations.py
│   │   └── vaccines.py
│   ├── namespaces/
│   │   ├── activity_namespace.py
│   │   ├── analytics_namespace.py
│   │   ├── analytics_namespace_backup.py
│   │   ├── animal_diseases_namespace.py
│   │   ├── animal_fields_namespace.py
│   │   ├── animal_images_namespace.py
│   │   ├── animals_namespace.py
│   │   ├── auth_namespace.py
│   │   ├── breeds_namespace.py
│   │   ├── control_namespace.py
│   │   ├── diseases_namespace.py
│   │   ├── fields_namespace.py
│   │   ├── food_types_namespace.py
│   │   ├── genetic_improvements_namespace.py
│   │   ├── medications_namespace.py
│   │   ├── navigation_namespace.py
│   │   ├── route_administration_namespace.py
│   │   ├── security_namespace.py
│   │   ├── species_namespace.py
│   │   ├── treatment_medications_namespace.py
│   │   ├── treatment_vaccines_namespace.py
│   │   ├── treatments_namespace.py
│   │   ├── user_preferences_namespace.py
│   │   ├── users_namespace.py
│   │   ├── vaccinations_namespace.py
│   │   └── vaccines_namespace.py
│   ├── templates/
│   │   ├── api_docs.html
│   │   ├── api_tester.html
│   │   ├── guia_frontend.html
│   │   └── swagger_ui_custom.html
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── activity_logger.py
│   │   ├── analytics.py
│   │   ├── bootstrap.py
│   │   ├── cache_utils.py
│   │   ├── compression.py
│   │   ├── cors_setup.py
│   │   ├── db_optimization.py
│   │   ├── db_protector.py
│   │   ├── debug_utils.py
│   │   ├── email_service.py
│   │   ├── enum_registry.py
│   │   ├── error_handlers.py
│   │   ├── file_storage.py
│   │   ├── integrity_checker.py
│   │   ├── integrity_indexes.sql
│   │   ├── json_middleware.py
│   │   ├── json_utils.py
│   │   ├── jwt_handlers.py
│   │   ├── logging_config.py
│   │   ├── namespace_helpers.py
│   │   ├── rate_limiter.py
│   │   ├── response_handler.py
│   │   ├── security_logger.py
│   │   ├── security_middleware.py
│   │   ├── token_blocklist.py
│   │   ├── tree_builder.py
│   │   └── validators.py
│   ├── __init__.py
│   └── api.py
├── docs/
│   ├── analytics/
│   │   ├── ANALYTICS_API_DOCUMENTATION.md
│   │   ├── CAMBIOS_CALCULOS_REALES.md
│   │   ├── DASHBOARD_STATS_DOCUMENTATION.md
│   │   ├── GUIA_COMPLETA_ANALYTICS.md
│   │   └── RESUMEN_IMPLEMENTACION_ANALYTICS.md
│   ├── backend/
│   │   ├── BACKEND_REQUIREMENTS_FOR_PWA.md
│   │   ├── GUIA_ADSO_COMPLETA.md
│   │   └── RECOMENDACION_ANIMAL_COUNT_FIELDS.md
│   ├── frontend/
│   │   ├── ANIMAL_IMAGES_USAGE.md
│   │   ├── EJEMPLOS_GRAFICOS_REACT.md
│   │   ├── FRONTEND_IMPLEMENTATION_GUIDE.md
│   │   ├── FRONTEND_INTEGRATION.md
│   │   ├── FRONTEND_OPTIMIZATION_GUIDE.md
│   │   ├── GRAFICOS_RECOMENDADOS.md
│   │   ├── GUIA_FRONTEND_REACT.md
│   │   ├── PARA_EL_FRONTEND.md
│   │   ├── PWA_OPTIMIZATION_GUIDE.md
│   │   ├── SOLUCION_IMAGENES_FRONTEND.md
│   │   ├── TROUBLESHOOTING_FRONTEND.md
│   │   └── api-usage-guide-frontend.md
│   ├── migrations/
│   │   ├── GUIA_EJECUCION_MIGRACIONES.md
│   │   ├── INSTRUCCIONES_MIGRACION.md
│   │   └── MIGRACIONES_APLICADAS.md
│   ├── optimization/
│   │   ├── DELETION_OPTIMIZATION_SUMMARY.md
│   │   ├── OPTIMIZATION_COMPLETE_REPORT.md
│   │   ├── OPTIMIZATION_QUICKSTART.md
│   │   ├── PERFORMANCE_IMPROVEMENTS.md
│   │   └── VERIFICACION_Y_MEJORAS_COMPLETAS.md
│   ├── overview/
│   │   ├── IMPLEMENTACION_COMPLETADA.md
│   │   ├── PASOS_INMEDIATOS.md
│   │   └── RESUMEN_IMPLEMENTACION.md
│   ├── search/
│   │   ├── SEARCH_DOCUMENTATION.md
│   │   └── SEARCH_FIX_DOCUMENTATION.md
│   ├── setup/
│   │   └── LOCAL_HTTPS.md
│   ├── testing/
│   │   ├── CRUD_AUDIT_REPORT.md
│   │   ├── TESTING_RAPIDO.md
│   │   ├── frontend_backend_endpoint_map.md
│   │   └── frontend_backend_view_audit.md
│   ├── README.md
│   └── api-usage-guia-frontend.md
├── static/
│   ├── docs/
│   └── uploads/
│       └── animals/
│           ├── 51/
│           ├── 52/
│           └── 58/
├── CORTEX_MAP.md
├── README.md
├── add_animal_fields_count_index.sql
├── add_performance_indexes.sql
├── check_animal_images.py
├── check_db_content.py
├── check_env.py
├── check_imports.py
├── clear_cache_test.py
├── clear_integrity_cache.py
├── config.py
├── dashboard_example.html
├── debug_integrity.py
├── debug_search.py
├── delete_performance_indexes.sql
├── delete_performance_indexes_mysql.sql
├── finca (6).sql
├── inspect_table_schema.py
├── repro_expired_token.py
├── reproduce_validation.py
├── restart_server.py
├── run.py
├── run_migration.py
├── test_add_animal_to_field.py
├── test_auth_password.py
├── test_complete_search_fix.py
├── test_dashboard_stats.py
├── test_delete_optimizations.py
├── test_deletion_workflow.py
├── test_error_handlers.py
├── test_error_handlers_v2.py
├── test_field_animals_endpoint.py
├── test_field_display.py
├── test_fixed_search.py
├── test_integrity_checker.py
├── test_integrity_checker_simple.py
├── test_integrity_fix.py
├── test_integrity_fix_simple.py
├── test_integrity_optimizations.py
├── test_integrity_performance.py
├── test_integrity_unit.py
├── test_logic_only.py
├── test_search_functionality.py
├── test_specific_id.py
├── test_unassign_animal.py
├── upgrade_db.py
├── verify_basic_query.py
├── verify_generic_api.py
├── verify_logging.py
├── verify_namespaces.py
├── verify_optimizations.py
├── verify_sse_fix.py
└── wsgi.py
```
