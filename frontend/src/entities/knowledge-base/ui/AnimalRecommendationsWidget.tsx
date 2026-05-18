import React, { useEffect, useState } from 'react';
import { KBRecomendacion, kbService } from '../api/kb.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { IconAlertTriangle, IconInfoCircle, IconCircleCheck, IconStethoscope, IconFileText } from '@/shared/ui/icons';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

export function AnimalRecommendationsWidget({ animalId }: { animalId: number }) {
  const [recommendations, setRecommendations] = useState<KBRecomendacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await kbService.getAnimalRecommendations(animalId);
        setRecommendations(data);
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [animalId]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-20 bg-gray-200 rounded-xl" />
      <div className="h-20 bg-gray-200 rounded-xl" />
    </div>;
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
          <IconCircleCheck size="md" className="text-emerald-500 mb-2" />
          <p className="font-bold text-emerald-800">Sin recomendaciones pendientes</p>
          <p className="text-sm text-emerald-600">Este animal cumple con los estándares productivos y sanitarios.</p>
        </CardContent>
      </Card>
    );
  }

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case 'Inmediata': return 'bg-red-600 text-white border-red-700';
      case 'Alta': return 'bg-orange-500 text-white border-orange-600';
      case 'Media': return 'bg-amber-400 text-amber-900 border-amber-500';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getUrgencyIcon = (urgencia: string) => {
    switch (urgencia) {
      case 'Inmediata': 
      case 'Alta': return <IconAlertTriangle size="md" />;
      default: return <IconInfoCircle size="md" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconFileText size="md" className="text-gray-500" /> 
        Recomendaciones del Motor (Offline)
      </h3>
      {recommendations.map((rec) => (
        <Card key={rec.id} className="overflow-hidden border-2 border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className={`px-4 py-2 flex items-center justify-between border-b ${getUrgencyColor(rec.urgencia)}`}>
            <div className="flex items-center gap-2 font-bold">
              {getUrgencyIcon(rec.urgencia)}
              <span>{rec.urgencia.toUpperCase()}</span>
            </div>
            <Badge variant="outline" className="bg-white/20 text-current border-none">
              {rec.categoria}
            </Badge>
          </div>
          
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-lg leading-tight text-gray-900">{rec.titulo}</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{rec.descripcion}</p>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <strong className="text-sm block text-gray-900 mb-1">Acción sugerida:</strong>
              <p className="text-gray-700 font-medium">{rec.accion}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                ⚙️ {rec.contexto_aplicado}
              </span>
              {rec.fuente && (
                <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  📚 Fuente: {rec.fuente}
                </span>
              )}
              {rec.profesional && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                  <IconStethoscope size="sm" /> Requiere Veterinario
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

