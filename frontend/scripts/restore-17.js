const fs = require('fs');
const path = require('path');

const coverageFiles = [
  'src/features/diagnostics/api/dependencyCheck.animals.ts',
  'src/features/diagnostics/api/dependencyCheck.farm.ts',
  'src/features/diagnostics/api/dependencyCheck.health.ts',
  'src/features/diagnostics/api/dependencyCheck.users.ts',
  'src/shared/ui/DevLoginPanel.tsx',
  'src/widgets/admin-crud/ui/FKDetailModal.tsx',
  'src/widgets/dashboard/animals/components/RelatedDataSection.tsx',
  'src/widgets/dashboard/animals/LivestockTagWidget.tsx',
  'src/widgets/dashboard/components/AnimalActionModalInstance.tsx',
  'src/widgets/dashboard/components/PerformanceReport.tsx',
  'src/widgets/dashboard/FieldReadyWidget.tsx',
  'src/widgets/dashboard/SyncProgressIndicator.tsx',
  'src/widgets/dashboard/VoiceNoteWidget.tsx'
];

coverageFiles.forEach(relPath => {
  const htmlPath = path.join(__dirname, '../coverage/lcov-report', relPath + '.html');
  const targetPath = path.join(__dirname, '..', relPath);

  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const match = htmlContent.match(/<pre class="prettyprint lang-js">([\s\S]*?)<\/pre>/);
    if (match) {
      let code = match[1];
      // Remove all HTML tags
      code = code.replace(/<[^>]+>/g, '');
      // Decode HTML entities
      code = code.replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&amp;/g, '&')
                 .replace(/&quot;/g, '"')
                 .replace(/&#x27;/g, "'");
      // Clean up leading BOM if present
      if (code.charCodeAt(0) === 0xFEFF) {
        code = code.slice(1);
      }
      fs.writeFileSync(targetPath, code, 'utf8');
      console.log(`Restored from coverage: ${relPath}`);
    } else {
      console.error(`Could not find <pre> block in ${htmlPath}`);
    }
  } else {
    console.error(`Coverage HTML not found: ${htmlPath}`);
  }
});

const commentFixFiles = [
  {
    path: 'src/features/health/ui/EmergencyKit.tsx',
    replacements: [
      ['// Extraer items de la respuesta paginada si es necesario ', '/* Extraer items de la respuesta paginada si es necesario */ ']
    ]
  },
  {
    path: 'src/features/multi-finca/ui/MultiFincaPage.tsx',
    replacements: [
      ['// El usuario tiene finca_memberships inyectados por el AuthContext o cargados ', '/* El usuario tiene finca_memberships inyectados por el AuthContext o cargados */ '],
      ['// Forzar recarga del usuario para obtener nuevo token con el nuevo finca_id ', '/* Forzar recarga del usuario para obtener nuevo token con el nuevo finca_id */ '],
      ['// Recargar página para limpiar estados de React Query / Cache ', '/* Recargar página para limpiar estados de React Query / Cache */ ']
    ]
  },
  {
    path: 'src/features/operational/ui/RationCalculator.tsx',
    replacements: [
      ['// Parámetros de cálculo ', '/* Parámetros de cálculo */ '],
      ['// % del peso vivo ', '/* % del peso vivo */ '],
      ['// g/día (para sal) ', '/* g/día (para sal) */ '],
      ['// Cálculos deterministas ', '/* Cálculos deterministas */ '],
      ['// Asumiendo bultos de 40kg ', '/* Asumiendo bultos de 40kg */ ']
    ]
  },
  {
    path: 'src/features/multi-finca/ui/JoinFincaPage.tsx',
    replacements: [
      ['// Actualizar localmente para mostrar el botón como"Solicitado"inmediatamente ', '/* Actualizar localmente para mostrar el botón como Solicitado inmediatamente */ '],
      ['// Actualizar UI localmente ', '/* Actualizar UI localmente */ '],
      ['// Refrescar el usuario para que vea la nueva finca en su lista ', '/* Refrescar el usuario para que vea la nueva finca en su lista */ '],
      ['// HEADER CRYSTAL ', '/* HEADER CRYSTAL */ '],
      ['// SECCIÓN DE GESTIONES PENDIENTES ', '/* SECCIÓN DE GESTIONES PENDIENTES */ '],
      ['// Invitaciones para el Usuario ', '/* Invitaciones para el Usuario */ '],
      ['// Solicitudes de Entrada (Admin) ', '/* Solicitudes de Entrada (Admin) */ '],
      ['// EXPLORADOR DE FINCAS ', '/* EXPLORADOR DE FINCAS */ '],
      ['// Implementación de reporte ', '/* Implementación de reporte */ '],
      ['// PROPIETARIOS CRYSTAL FOOTER ', '/* PROPIETARIOS CRYSTAL FOOTER */ ']
    ]
  }
];

commentFixFiles.forEach(item => {
  const targetPath = path.join(__dirname, '..', item.path);
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    item.replacements.forEach(([from, to]) => {
      content = content.replace(from, to);
    });
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`Fixed comments in: ${item.path}`);
  } else {
    console.error(`File not found for comment fix: ${targetPath}`);
  }
});

console.log('Restoration of 17 files complete.');
