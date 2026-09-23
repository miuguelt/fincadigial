import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  IconBook,
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
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
import {
  BUILTIN_OFFICIAL_CATALOG,
  BUILTIN_QUICK_GUIDES,
  type QuickFieldGuide,
} from './data/builtinOfficialGuides';
import { QuickGuideModal } from './components/QuickGuideModal';
import { OfficialRepositoriesSection } from './components/OfficialRepositoriesSection';

const CATEGORIES = [
  'Todos',
  'Pastos y Aforo',
  'Sanidad y Bioseguridad',
  'Ordeño y Calidad',
  'Cría y Reproducción',
  'Nutrición y Forrajes',
  'Sistemas Sostenibles',
  'Agua y Clima',
];

function MaterialIcon({ contentType }: { contentType?: string }) {
  const normalizedType = String(contentType || '').toUpperCase();
  if (normalizedType === 'PDF') return <IconFileText className="h-6 w-6 text-destructive" aria-hidden={true} />;
  if (normalizedType === 'VIDEO') return <IconPlayerPlay className="h-6 w-6 text-info" aria-hidden={true} />;
  return <IconBook className="h-6 w-6 text-emerald-600" aria-hidden={true} />;
}

function MaterialLoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando materiales">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}

export default function OfflineLearningView() {
  const [activeTab, setActiveTab] = useState<'guides' | 'library' | 'repositories'>('guides');
  const [materials, setMaterials] = useState<OfflineLearningMaterial[]>(BUILTIN_OFFICIAL_CATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<QuickFieldGuide | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const { toast } = useToast();
  const { role } = useAuth();
  const { isOnline } = useOnlineStatus();

  const isAdmin = useMemo(
    () => ['Instructor', 'Administrador', 'Propietario'].includes(role || ''),
    [role],
  );

  const fetchMaterials = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await offlineLearningService.list();
      const serverData = response.data || [];
      if (serverData.length > 0) {
        setMaterials(serverData);
        setIsUsingFallback(false);
      } else {
        // Si el backend no tiene materiales aún, usar el catálogo oficial incorporado
        setMaterials(BUILTIN_OFFICIAL_CATALOG);
        setIsUsingFallback(true);
      }
    } catch (error) {
      console.warn('Error fetching learning materials from backend, using builtin catalog:', error);
      setMaterials(BUILTIN_OFFICIAL_CATALOG);
      setIsUsingFallback(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    let cancelled = false;
    const materialsWithUri = materials.filter((material) => Boolean(material.local_uri));

    if (materialsWithUri.length === 0) {
      setCachedMap({});
      return () => { cancelled = true; };
    }

    void Promise.all(
      materialsWithUri.map(async (material) => [
        String(material.id || material.title),
        await isLearningMaterialCached(material.local_uri),
      ] as const),
    ).then((entries) => {
      if (!cancelled) setCachedMap(Object.fromEntries(entries));
    });

    return () => { cancelled = true; };
  }, [materials]);

  // Filtrado de Guías Rápidas de Campo
  const filteredGuides = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es-CO');
    return BUILTIN_QUICK_GUIDES.filter((guide) => {
      const matchesCategory =
        activeCategory === 'Todos' ||
        guide.category.toLocaleLowerCase('es-CO').includes(activeCategory.toLocaleLowerCase('es-CO')) ||
        activeCategory.toLocaleLowerCase('es-CO').includes(guide.category.toLocaleLowerCase('es-CO'));

      const searchableText = [
        guide.title,
        guide.category,
        guide.entity,
        guide.summary,
        guide.level,
        ...guide.requirements,
        ...guide.steps.map((s) => `${s.title} ${s.description}`),
      ]
        .join(' ')
        .toLocaleLowerCase('es-CO');

      return matchesCategory && (!term || searchableText.includes(term));
    });
  }, [activeCategory, searchTerm]);

  // Filtrado de Manuales y Cartillas Oficiales
  const filteredMaterials = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es-CO');
    return materials.filter((material) => {
      const matCategory = material.category || 'General';
      const matchesCategory =
        activeCategory === 'Todos' ||
        matCategory.toLocaleLowerCase('es-CO').includes(activeCategory.toLocaleLowerCase('es-CO')) ||
        activeCategory.toLocaleLowerCase('es-CO').includes(matCategory.toLocaleLowerCase('es-CO'));

      const searchableText = [material.title, matCategory, material.summary, material.reading_level]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-CO');

      return matchesCategory && (!term || searchableText.includes(term));
    });
  }, [activeCategory, materials, searchTerm]);

  const handleOpenGuide = (guide: QuickFieldGuide) => {
    setSelectedGuide(guide);
    setIsGuideModalOpen(true);
  };

  const openMaterialUrl = (material: OfflineLearningMaterial) => {
    if (material.local_uri) {
      window.open(material.local_uri, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadMaterial = async (material: OfflineLearningMaterial) => {
    const materialKey = material.id || material.title;
    if (!material.local_uri) {
      toast({
        title: 'Documento en línea',
        description: 'Este material se consulta directamente en el repositorio de la entidad.',
      });
      return;
    }

    setDownloadingId(typeof material.id === 'number' ? material.id : 1);
    const cached = await cacheLearningMaterial(material.local_uri);
    setDownloadingId(null);

    if (!cached) {
      toast({
        title: 'Disponible en el repositorio',
        description: 'Abriendo enlace institucional oficial.',
      });
      window.open(material.local_uri, '_blank', 'noopener,noreferrer');
      return;
    }

    setCachedMap((prev) => ({ ...prev, [String(materialKey)]: true }));
    toast({
      title: 'Material guardado en el dispositivo',
      description: 'Ahora puede consultarlo sin conexión en cualquier momento.',
    });
  };

  return (
    <CampesinoViewShell
      title="Aprender en la Finca"
      description="Guías de campo prácticas, cartillas oficiales colombianas y recursos de consulta sin conexión."
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
      {/* Barra de conectividad y estado */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-foreground shadow-xs">
            {isOnline ? (
              <IconWifi className="h-3.5 w-3.5 text-emerald-600" aria-hidden={true} />
            ) : (
              <IconWifiOff className="h-3.5 w-3.5 text-amber-600" aria-hidden={true} />
            )}
            {isOnline
              ? 'Con señal: acceso a repositorios y descargas'
              : 'Sin señal: las guías de campo y materiales guardados están disponibles'}
          </span>
          {isUsingFallback && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <IconCircleCheck className="h-3.5 w-3.5" aria-hidden={true} />
              Catálogo oficial incorporado activo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {Object.values(cachedMap).filter(Boolean).length > 0 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {Object.values(cachedMap).filter(Boolean).length} material{Object.values(cachedMap).filter(Boolean).length === 1 ? '' : 'es'} guardado{Object.values(cachedMap).filter(Boolean).length === 1 ? '' : 's'}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => fetchMaterials(true)}
            disabled={isRefreshing}
          >
            <IconRefresh size="sm" className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden={true} />
            Actualizar
          </Button>
        </div>
      </div>

      <MaterialUploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => fetchMaterials(true)}
      />

      {/* Modal de Lectura de Guía Rápida */}
      <QuickGuideModal
        guide={selectedGuide}
        isOpen={isGuideModalOpen}
        onOpenChange={setIsGuideModalOpen}
      />

      {/* Navegación por pestañas principales */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="guides" className="min-h-10 text-xs sm:text-sm font-semibold">
            <IconSparkles className="mr-1.5 h-4 w-4 text-emerald-600 hidden xs:inline" aria-hidden={true} />
            Guías Rápidas ({BUILTIN_QUICK_GUIDES.length})
          </TabsTrigger>
          <TabsTrigger value="library" className="min-h-10 text-xs sm:text-sm font-semibold">
            <IconBook className="mr-1.5 h-4 w-4 text-emerald-600 hidden xs:inline" aria-hidden={true} />
            Biblioteca ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="repositories" className="min-h-10 text-xs sm:text-sm font-semibold">
            <IconExternalLink className="mr-1.5 h-4 w-4 text-emerald-600 hidden xs:inline" aria-hidden={true} />
            Repositorios Oficiales
          </TabsTrigger>
        </TabsList>

        {/* Buscador y Filtros por Categoría (para Guías y Biblioteca) */}
        {activeTab !== 'repositories' && (
          <section className="space-y-3" aria-label="Buscar y filtrar contenidos">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden={true} />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por tema, aforo, aftosa, ordeño, calostro, ensilaje…"
                aria-label="Buscar contenidos"
                className="min-h-11 rounded-xl pl-10 text-base shadow-xs"
              />
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Filtrar por categoría">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`min-h-10 shrink-0 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    activeCategory === category
                      ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CONTENIDO TAB 1: Guías Rápidas de Campo */}
        <TabsContent value="guides" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {filteredGuides.length} guía{filteredGuides.length === 1 ? '' : 's'} práctica{filteredGuides.length === 1 ? '' : 's'} disponible{filteredGuides.length === 1 ? '' : 's'} para campo (100% offline)
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGuides.map((guide) => (
              <Card
                key={guide.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-border shadow-xs transition-all hover:border-emerald-600/50 hover:shadow-md"
              >
                <CardHeader className="space-y-2.5 p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {guide.category}
                    </Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-xs font-bold text-primary">
                      {guide.entity}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold leading-snug group-hover:text-emerald-700 transition-colors">
                    {guide.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 p-4 pt-1">
                  <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {guide.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium">
                      <IconClock className="h-3 w-3 text-muted-foreground" aria-hidden={true} />
                      {guide.readingTimeMinutes} min
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 font-medium">
                      {guide.steps.length} pasos
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Offline garantizado
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    className="min-h-11 w-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
                    onClick={() => handleOpenGuide(guide)}
                  >
                    <IconBook size="sm" aria-hidden={true} />
                    Consultar Guía de Campo
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredGuides.length === 0 && (
            <section className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-5 py-12 text-center">
              <IconBook className="mx-auto h-10 w-10 text-emerald-500" aria-hidden={true} />
              <h3 className="mt-3 text-base font-bold text-emerald-950 dark:text-emerald-100">
                No encontramos guías con ese criterio
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Pruebe buscando términos como &quot;aforo&quot;, &quot;aftosa&quot;, &quot;mastitis&quot;, &quot;ensilaje&quot; o &quot;calostro&quot;.
              </p>
              <Button
                variant="outline"
                className="mt-4 min-h-10 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
                onClick={() => { setSearchTerm(''); setActiveCategory('Todos'); }}
              >
                Ver todas las guías
              </Button>
            </section>
          )}
        </TabsContent>

        {/* CONTENIDO TAB 2: Biblioteca de Manuales Oficiales */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {filteredMaterials.length} publicación{filteredMaterials.length === 1 ? '' : 'es'} oficial{filteredMaterials.length === 1 ? '' : 'es'} disponible{filteredMaterials.length === 1 ? '' : 's'}
            </p>
          </div>

          {isLoading ? (
            <MaterialLoadingState />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((material) => {
                const materialKey = String(material.id || material.title);
                const isCached = cachedMap[materialKey];
                const isDownloading = downloadingId === (typeof material.id === 'number' ? material.id : 1);

                return (
                  <Card key={materialKey} className="flex flex-col justify-between overflow-hidden rounded-2xl border-border shadow-xs">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50" aria-hidden={true}>
                        <MaterialIcon contentType={material.content_type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge variant="secondary" className="bg-emerald-100 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                          {material.category || 'General'}
                        </Badge>
                        <CardTitle className="mt-1.5 line-clamp-2 text-base font-bold leading-snug">
                          {material.title}
                        </CardTitle>
                      </div>
                      {isCached && (
                        <IconCircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Guardado sin conexión" />
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 space-y-2.5 p-4 pt-1">
                      <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {material.summary || 'Publicación técnica para consulta en la finca.'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                        {material.reading_level && (
                          <span className="rounded-md bg-muted px-2 py-0.5">
                            Nivel: {material.reading_level}
                          </span>
                        )}
                        {material.content_type && (
                          <span className="rounded-md bg-muted px-2 py-0.5">
                            {material.content_type}
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-2 p-4 pt-0 sm:flex-row">
                      {isCached ? (
                        <Button
                          variant="outline"
                          className="min-h-11 w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                          onClick={() => openMaterialUrl(material)}
                        >
                          <IconBook size="sm" aria-hidden={true} />
                          Abrir guardado
                        </Button>
                      ) : (
                        <Button
                          className="min-h-11 w-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
                          onClick={() => handleDownloadMaterial(material)}
                          loading={isDownloading}
                          disabled={!material.local_uri}
                        >
                          <IconDownload size="sm" aria-hidden={true} />
                          {material.local_uri ? 'Guardar sin conexión' : 'Consultar en línea'}
                        </Button>
                      )}

                      {material.local_uri && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openMaterialUrl(material)}
                          aria-label="Abrir enlace externo"
                          title="Abrir en repositorio oficial"
                        >
                          <IconExternalLink className="h-4 w-4" aria-hidden={true} />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredMaterials.length === 0 && !isLoading && (
            <section className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-5 py-12 text-center">
              <IconBook className="mx-auto h-10 w-10 text-emerald-500" aria-hidden={true} />
              <h3 className="mt-3 text-base font-bold text-emerald-950 dark:text-emerald-100">
                No encontramos publicaciones para este filtro
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Pruebe cambiando la categoría o escribiendo otro término de búsqueda.
              </p>
              <Button
                variant="outline"
                className="mt-4 min-h-10 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
                onClick={() => { setSearchTerm(''); setActiveCategory('Todos'); }}
              >
                Ver todas las publicaciones
              </Button>
            </section>
          )}
        </TabsContent>

        {/* CONTENIDO TAB 3: Repositorios Oficiales Abiertos */}
        <TabsContent value="repositories">
          <OfficialRepositoriesSection />
        </TabsContent>
      </Tabs>
    </CampesinoViewShell>
  );
}
