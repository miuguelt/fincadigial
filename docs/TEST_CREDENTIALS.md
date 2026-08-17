# Credenciales de desarrollo y E2E

Las credenciales de pruebas no viven en el repositorio ni en el frontend. Los
scripts las cargan desde el entorno y fallan con instrucciones claras cuando
faltan.

## Variables principales

Para el administrador y las pruebas Playwright:

```powershell
$env:E2E_ADMIN_ID = "<identificacion>"
$env:E2E_ADMIN_PASS = "<contraseña>"
$env:VILLALUZ_E2E_ADMIN_ID = $env:E2E_ADMIN_ID
$env:VILLALUZ_E2E_ADMIN_PASSWORD = $env:E2E_ADMIN_PASS
```

Los seeds multirrol aceptan también estas parejas:

```text
VILLALUZ_E2E_<ROL>_ID
VILLALUZ_E2E_<ROL>_PASSWORD
```

Los roles admitidos son `ADMIN`, `INSTRUCTOR`, `APPRENTICE`, `OWNER`,
`FOREMAN`, `WORKER` y `VET`. Para seeds administrativos se utiliza
`VILLALUZ_SEED_ADMIN_PASSWORD` o `ADMIN_PASSWORD`.

Nunca agregues estos valores a `.env.example`, al código fuente, a fixtures
versionados ni a variables `VITE_*`, porque el frontend las expone al navegador.
