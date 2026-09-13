# Adopción del estándar en otros proyectos

El estándar global vive en:

- `C:\Users\Miguel\Documents\Aplicaciones\.agents\rules\colombia-software-compliance.md`;
- `C:\Users\Miguel\Documents\Aplicaciones\_core\agents\colombia-legal-compliance-agent.md`;
- `C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Install-ColombiaLegalCompliance.ps1`;
- `C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Test-ColombiaLegalCompliance.ps1`;
- `C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Test-DevBrainLegalLifecycle.ps1`;
- `C:\Users\Miguel\Documents\Aplicaciones\_core\knowledge_base\workflows\legal-responsibility-lifecycle.json`;
- `C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\hooks\legal-lifecycle-audit-hook.ps1`.

Para inicializar otro repositorio:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File `
  C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Install-ColombiaLegalCompliance.ps1 `
  -ProjectPath C:\ruta\al\proyecto
```

Después se deben completar manualmente el responsable, el inventario, la política, los encargados, la retención, los términos y las evidencias. La plantilla no inventa datos legales ni aprueba tratamientos por sí sola.

## Contrato mínimo que debe quedar en cada proyecto

La instalación debe dejar estos archivos y rutas:

- `rules/COLOMBIA_LEGAL_MINIMUM_RULES.md`;
- `agents/colombia-legal-compliance-agent.md`;
- `docs/legal/COMPLIANCE_MANIFEST.json`;
- `docs/legal/LEGAL_IMPLEMENTATION_STATE.json`;
- `scripts/Test-ColombiaLegalCompliance.ps1`;
- `scripts/Test-DevBrainLegalLifecycle.ps1`;
- `docs/legal/evidence/`.

El proyecto debe declarar sus `required_profiles`. El agente usa esos perfiles para activar controles de menores, salud/veterinaria, geolocalización, archivos, offline, transferencias, IA, pagos, entidad pública, integraciones oficiales y licencias. Si no hay manifiesto o estado, el modo de auditoría advierte y el modo de liberación bloquea.

## Uso dentro del ciclo de desarrollo

En cada funcionalidad, DevBrain clasifica el cambio antes de programar, actualiza el inventario y ejecuta la auditoría después de cambiar código o infraestructura. En una solicitud de liberación ejecuta:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Test-DevBrainLegalLifecycle.ps1 -ProjectPath . -Mode Release
```

El script global se puede usar para proyectos que todavía no tengan una compuerta específica. Cuando el proyecto ya tiene `scripts/Test-ColombiaLegalCompliance.ps1`, el ciclo global lo ejecuta como gate específico y conserva su resultado.
