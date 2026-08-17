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
  const targetPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    content = content.replace(/&nbsp;/g, '');
    content = content.replace(/\bIif\b/g, 'if');
    content = content.replace(/\bEif\b/g, 'if');
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`Cleaned artifacts in: ${relPath}`);
  } else {
    console.error(`File not found: ${targetPath}`);
  }
});

console.log('Cleanup complete.');
