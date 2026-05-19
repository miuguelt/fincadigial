import { useMemo } from 'react';
import { alertService, AlertConfig, Alert } from '@/entities/alert/api/alert.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { controlService } from '@/entities/control/api/control.service';
import { milkService } from '@/entities/milk/api/milk.service';
import { animalFieldsService } from '@/entities/animal/api/animalFields.service';
import { useResource } from '@/shared/hooks/useResource';
import { evaluateCondition, getValueByDimension } from '@/shared/utils/conditionEvaluator';

/**
 * Motor de Evaluación Local de Alertas
 * Compara los datos locales (animales y controles) con las reglas configuradas
 * para generar alertas virtuales sin necesidad de conexión.
 */
export const useAlertEngine = () => {
  const { data: configs } = useResource(
    {
      getAll: () => alertService.getConfigs(),
      getPaginated: async (params: any) => {
        const data = await alertService.getConfigs(params);
        return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
      }
    } as any,
    { key: 'alert-configs', cache: true }
  ) as { data: AlertConfig[] | undefined };

  const { data: animals } = useResource(
    {
      getAll: () => animalsService.getAnimals({ limit: 1000 }),
      getPaginated: async (params: any) => {
        const data = await animalsService.getAnimals({ ...params, limit: 1000 });
        return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
      }
    } as any,
    { key: 'animals-local', cache: true }
  ) as { data: any[] | undefined };

  const { data: controls } = useResource(
    {
      getAll: () => controlService.getAll({ limit: 1000 }),
      getPaginated: async (params: any) => {
        const data = await controlService.getAll({ ...params, limit: 1000 });
        return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
      }
    } as any,
    { key: 'controls-local', cache: true }
  ) as { data: any[] | undefined };

  const { data: milkRecords } = useResource(
    {
      getAll: () => milkService.getAll({ limit: 1000 }),
      getPaginated: async (params: any) => {
        const data = await milkService.getAll({ ...params, limit: 1000 });
        return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
      }
    } as any,
    { key: 'milk-local', cache: true }
  ) as { data: any[] | undefined };

  const { data: fieldAssignments } = useResource(
    {
      getAll: () => animalFieldsService.getAnimalFields({ limit: 1000 }),
      getPaginated: async (params: any) => {
        const resp = await animalFieldsService.getAnimalFields({ ...params, limit: 1000 });
        return resp;
      }
    } as any,
    { key: 'field-assignments-local', cache: true }
  ) as { data: any[] | undefined };

  // 3. Evaluar reglas localmente
  const localAlerts = useMemo(() => {
    if (!configs || !animals) return [];

    const virtualAlerts: Alert[] = [];
    const activeConfigs = configs.filter(c => c.is_active);

    const extraData = {
      milkHistory: milkRecords || [],
      fieldAssignments: fieldAssignments || []
    };

    animals.forEach(animal => {
      // Obtener el último control de este animal
      const animalControls = (controls || [])
        .filter(c => c.animal_id === animal.id)
        .sort((a, b) => new Date(b.checkup_date || b.control_date).getTime() - new Date(a.checkup_date || a.control_date).getTime());
      
      const latestControl = animalControls[0];

      activeConfigs.forEach(config => {
        // Si la regla es para un animal específico y no es este, saltar
        if (config.animal_id && config.animal_id !== animal.id) return;

        const value = getValueByDimension(animal, latestControl, config.dimension, extraData);
        const isTriggered = evaluateCondition(value, config.condition_value);

        if (isTriggered) {
          virtualAlerts.push({
            animal_id: animal.id,
            alert_type: config.alert_type,
            message: `${animal.record}: ${config.message}`,
            priority: config.priority,
            is_read: false,
            triggered_at: new Date().toISOString(),
            config_id: config.id,
            recommendation: `Valor detectado: ${value}. Umbral: ${config.condition_value}`
          });
        }
      });
    });

    return virtualAlerts;
  }, [configs, animals, controls]);

  return {
    localAlerts,
    totalLocalCount: localAlerts.length,
    isLoading: !configs || !animals
  };
};

