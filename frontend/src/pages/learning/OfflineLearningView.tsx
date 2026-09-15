import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import {
  IconAlertCircle,
  IconBook,
  IconCircleCheck,
  IconDownload,
  IconFileText,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconWifi,
  IconWifiOff,
} from '@/shared/ui/icons';
import { offlineLearningService } from '@/entities/campesino/api/campesino.service';
import type { OfflineLearningMaterial } from '@/entities/campesino/model/types';
import { useToast } from '@/shared/hooks/use-toast';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { MaterialUploadDialog } from './components/MaterialUploadDialog';
import { useAuth } from '@/features/auth/model/useAuth';
import { cacheLearningMaterial, isLearningMaterialCached } from './learningCache';
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';

const getCategory = (material: OfflineLearningMaterial) => material.category || 'General';

function MaterialIcon({ contentType }: { contentType?: string }) {
  const normalizedType = String(contentType || '').toUpperCase();
  if (normalizedType === 'PDF') return <IconFileText className="h-7 w-7 text-destructive" />;
  if (normalizedType === 'VIDEO') return <IconPlayerPlay className="h-7 w-7 text-info" />;
  return <IconBook className="h-7 w-7 text-emerald-600" />;
}

function MaterialLoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando materiales">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-muted/50" />
      ))}
    </div>
  );
}

export default function OfflineLearningView() {
  const [materials, setMaterials] = useState<OfflineLearningMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const { isOnline } = useOnlineStatus();

  const isAdmin = useMemo(
    () => ['Instructor', 'Administrador', 'Propietario'].includes(role || ''),
    [role],
  );

  const categories = useMemo(
    () => ['Todos', ...new Set(materials.map(getCategory))],
    [materials],
  );

  const fetchMaterials = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(false);

    try {
      const response = await offlineLearningService.list();
      setMaterials(response.data || []);
    } catch (error) {
      console.error('Error fetching learning materials:', error);
      setLoadError(true);
      toast({
        title: 'No se pudo cargar la biblioteca',
        description: 'Revise la conexión o intente nuevamente. Lo que ya guardó seguirá disponible.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory('Todos');
  }, [activeCategory, categories]);

  useEffect(() => {
    let cancelled = false;
    const materialsWithId = materials.filter((material) => material.id != null);

    if (materialsWithId.length === 0) {
      setCachedMap({});
      return () => { cancelled = true; };
    }

    void Promise.all(
      materialsWithId.map(async (material) => [
        String(material.id),
        await isLearningMaterialCached(material.local_uri),
      ] as const),
    ).then((entries) => {
      if (!cancelled) setCachedMap(Object.fromEntries(entries));
    });

    return () => { cancelled = true; };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es-CO');
    return materials.filter((material) => {
      const matchesCategory = activeCategory === 'Todos' || getCategory(material) === activeCategory;
      const searchableText = [material.title, getCategory(material), material.summary]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-CO');
      return matchesCategory && (!term || searchableText.includes(term));
    });
  }, [activeCategory, materials, searchTerm]);

  const openMaterial = (material: OfflineLearningMaterial) => {
    if (material.local_uri) window.open(material.local_uri, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (material: OfflineLearningMaterial) => {
    if (material.id == null || !material.local_uri) {
      toast({
        title: 'Archivo no disponible',
        description: 'Este material todavía no tiene un archivo asociado.',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingId(material.id);
    const cached = await cacheLearningMaterial(material.local_uri);
    setDownloadingId(null);

    if (!cached) {
      toast({
        title: 'No se pudo guardar',
        description: 'Conéctese a una red estable y vuelva a intentarlo.',
        variant: 'destructive',
      });
      return;
    }

    setCachedMap((previous) => ({ ...previous, [material.id!]: true }));
    toast({
      title: 'Material guardado',
      description: 'Ahora puede abrirlo aunque esté sin señal.',
    });
  };

  return (
    <CampesinoViewShell
      title="Aprender sin conexión"
      description="Guarda guías y materiales cuando tengas Wi‑Fi para consultarlos después en la finca."
      icon={<IconBook className="h-5 w-5 text-white" aria-hidden={true} />}
      actions={isAdmin ? (
        <Button
          variant="secondary"
          className="min-h-11 w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          onClick={() => setIsUploadOpen(true)}
        >
          <IconPlus size="sm" aria-hidden={true} />
          Subir material
        </Button>
      ) : undefined}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
        <span className="inline-flex items-center gap-1.5">
          {isOnline ? <IconWifi className="h-4 w-4" aria-hidden={true} /> : <IconWifiOff className="h-4 w-4" aria-hidden={true} />}
          {isOnline ? 'Con señal: puede guardar materiales' : 'Sin señal: abra lo que ya guardó'}
        </span>
        <span>{Object.values(cachedMap).filter(Boolean).length} guardado{Object.values(cachedMap).filter(Boolean).length === 1 ? '' : 's'}</span>
      </div>

        <MaterialUploadDialog
          isOpen={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onSuccess={() => fetchMaterials(true)}
        />

        <section className="space-y-3" aria-label="Buscar materiales">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden={true} />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por tema, cultivo o enfermedad…"
              aria-label="Buscar materiales"
              className="min-h-11 rounded-xl pl-10 text-base"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Filtrar por categoría">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeCategory === category
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? <MaterialLoadingState /> : loadError ? (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-10 text-center">
            <IconAlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden={true} />
            <h2 className="mt-3 text-lg font-bold">No pudimos cargar los materiales</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pruebe otra vez cuando tenga conexión.</p>
            <Button className="mt-5 min-h-11" onClick={() => fetchMaterials()}>
              <IconRefresh size="sm" aria-hidden={true} />
              Reintentar
            </Button>
          </section>
        ) : (
          <>
            {filteredMaterials.length > 0 && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {filteredMaterials.length} material{filteredMaterials.length === 1 ? '' : 'es'} disponible{filteredMaterials.length === 1 ? '' : 's'}
                {isRefreshing ? ' · actualizando…' : ''}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((material) => {
                const isCached = material.id != null && cachedMap[String(material.id)];
                const isDownloading = material.id != null && downloadingId === material.id;

                return (
                  <Card key={material.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-border shadow-sm">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50" aria-hidden="true">
                        <MaterialIcon contentType={material.content_type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          {getCategory(material)}
                        </Badge>
                        <CardTitle className="mt-2 line-clamp-2 text-base leading-snug">{material.title}</CardTitle>
                      </div>
                      {isCached && <IconCircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Guardado sin conexión" />}
                    </CardHeader>
                    <CardContent className="flex-1 p-4 pt-2">
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {material.summary || 'Material de consulta para el trabajo en la finca.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="rounded-md bg-muted px-2 py-1">Nivel: {material.reading_level || 'General'}</span>
                        {material.content_type && <span className="rounded-md bg-muted px-2 py-1">{material.content_type}</span>}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      {isCached ? (
                        <Button variant="outline" className="min-h-11 w-full text-emerald-700" onClick={() => openMaterial(material)}>
                          <IconBook size="sm" aria-hidden={true} />
                          Abrir material
                        </Button>
                      ) : (
                        <Button
                          className="min-h-11 w-full bg-emerald-700 hover:bg-emerald-800"
                          onClick={() => handleDownload(material)}
                          loading={isDownloading}
                          disabled={!material.local_uri}
                        >
                          <IconDownload size="sm" aria-hidden={true} />
                          {material.local_uri ? 'Guardar sin conexión' : 'Archivo no disponible'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {filteredMaterials.length === 0 && (
              <section className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-12 text-center">
                <IconBook className="mx-auto h-10 w-10 text-emerald-400" aria-hidden={true} />
                <h2 className="mt-3 text-lg font-bold text-emerald-900">
                  {materials.length === 0 ? 'Aún no hay materiales' : 'No encontramos ese material'}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                  {materials.length === 0
                    ? 'Cuando el instructor publique una guía aparecerá aquí para guardarla con Wi‑Fi.'
                    : 'Pruebe con otro término o quite el filtro de categoría.'}
                </p>
                {materials.length > 0 && (
                  <Button variant="outline" className="mt-5 min-h-11" onClick={() => { setSearchTerm(''); setActiveCategory('Todos'); }}>
                    Ver todos los materiales
                  </Button>
                )}
              </section>
            )}
          </>
        )}
    </CampesinoViewShell>
  );
}
