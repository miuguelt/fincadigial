import React from 'react';
import { MeshMonitor } from '@/widgets/dashboard/MeshMonitor';
import { AppSharePortal } from '@/widgets/dashboard/AppSharePortal';
import { ConflictLogWidget } from '@/widgets/dashboard/ConflictLogWidget';

export const AdminMeshTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary flex items-center">
        <div className="w-1.5 h-5 bg-warning rounded-full mr-2" />
        Herramientas de Conectividad (Mesh)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <MeshMonitor />
        <AppSharePortal />
        <ConflictLogWidget />
      </div>
    </div>
  );
};
