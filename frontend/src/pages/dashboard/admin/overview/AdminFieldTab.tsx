import React from 'react';
import { MapPin } from 'lucide-react';
import { FieldReadyWidget } from '@/widgets/dashboard/FieldReadyWidget';
import { VoiceNoteWidget } from '@/widgets/dashboard/VoiceNoteWidget';
import { FastWeightEntry } from '@/widgets/dashboard/FastWeightEntry';
import { WorkerMap } from '@/widgets/dashboard/WorkerMap';

export const AdminFieldTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary flex items-center">
        <div className="w-1.5 h-5 bg-success rounded-full mr-2" />
        Operaciones sin conexión y mapa
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FieldReadyWidget />
        <VoiceNoteWidget />
        <FastWeightEntry />
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-md font-bold text-text-primary mb-4 flex items-center">
          <MapPin className="w-4 h-4 text-info mr-2" />
          Mapa de Personal y Cobertura
        </h3>
        <WorkerMap />
      </div>
    </div>
  );
};
