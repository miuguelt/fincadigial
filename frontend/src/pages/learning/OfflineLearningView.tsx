import  { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card";
import { useCallback } from 'react';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { IconBook, IconFileText, IconDownload, IconPlus, IconSearch, IconPlayerPlay, IconCircleCheck } from '@/shared/ui/icons';

import { offlineLearningService } from '@/entities/campesino/api/campesino.service';
import type { OfflineLearningMaterial } from '@/entities/campesino/model/types';
import { useToast } from '@/shared/hooks/use-toast';
import { MaterialUploadDialog } from './components/MaterialUploadDialog';
import { useAuth } from '@/features/auth/model/useAuth';

export default function OfflineLearningView() {
  const [materials, setMaterials] = useState<OfflineLearningMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  const isAdmin = useMemo(() =>
    ['Instructor', 'Administrador', 'Propietario'].includes(role || ''),
    [role]
  );

  const categories = useMemo(() =>
    ['Todos', ...new Set(materials.map(m => m.category).filter(Boolean))],
    [materials]
  );
  const [activeCategory, setActiveCategory] = useState('Todos');

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await offlineLearningService.list();
      setMaterials(response.data || []);
    } catch (error) {
      console.error("Error fetching learning materials:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudieron cargar los materiales de la biblioteca.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkCache = async () => {
      const cache = await caches.open('documents');
      const newCachedMap: Record<string, boolean> = {};

      for (const mat of materials) {
        if (mat.local_uri) {
          const match = await cache.match(mat.local_uri);
          newCachedMap[mat.id!] = !!match;
        }
      }
      setCachedMap(newCachedMap);
    };

    if (materials.length > 0) {
      checkCache();
    }
  }, [materials]);

  const handleDownload = async (mat: OfflineLearningMaterial) => {
    if (!mat.local_uri) return;

    // Abrir en nueva pestaña para que el SW lo intercepte y lo cachee
    window.open(mat.local_uri, '_blank');

    // Simular actualización inmediata del estado
    setCachedMap(prev => ({ ...prev, [mat.id!]: true }));

    toast({
      title: "Material descargado",
      description: "El archivo se ha guardado en la caché para uso offline.",
    });
  };

  const filteredMaterials = materials.filter(m =>
    (activeCategory === 'Todos' || m.category === activeCategory) &&
    (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     m.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getIcon = (type: string) => {
    if (type === 'PDF') return <IconFileText className="w-8 h-8 text-destructive" />;
    if (type === 'VIDEO') return <IconPlayerPlay className="w-8 h-8 text-info" />;
    return <IconBook className="w-8 h-8 text-emerald-500" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 to-emerald-700 p-8 rounded-lg shadow-md text-white">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <IconBook className="w-8 h-8" />
            Biblioteca Rural Offline
          </h1>
          <p className="text-emerald-100 mt-2 max-w-2xl text-lg">
            Materiales educativos, guías ICA y manuales técnicos. Descárgalos con WiFi para leerlos luego en el potrero sin conexión.
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="secondary"
              className="bg-card text-emerald-900 hover:bg-emerald-50 font-semibold shadow-sm"
              onClick={() => setIsUploadOpen(true)}
            >
              <IconPlus size="md" className="mr-2" />
              Subir Nuevo Material
            </Button>
          )}
        </div>
      </div>

      <MaterialUploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={fetchMaterials}
      />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <IconSearch size="md" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar guías, manuales, enfermedades..."
            className="pl-10 border-emerald-200 focus-visible:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className={`cursor-pointer text-sm px-4 py-1 ${
                activeCategory === cat
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "hover:bg-emerald-50 border-emerald-500 text-emerald-700"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid of Materials */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse border-emerald-100 h-64 bg-muted/50/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(mat => (
            <Card key={mat.id} className="group hover:shadow-md transition-all duration-300 border-emerald-100 flex flex-col relative overflow-hidden">
              {mat.id && cachedMap[mat.id] && (
                <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-xl shadow-sm z-10 animate-in fade-in slide-in-from-top-1">
                  <IconCircleCheck size="sm" />
                </div>
              )}

              <CardHeader className="flex flex-row items-start gap-4 pb-2">
                <div className="bg-emerald-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  {getIcon(mat.content_type || 'text')}
                </div>
                <div className="space-y-1 flex-1">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                    {mat.category}
                  </Badge>
                  <CardTitle className="text-xl leading-tight line-clamp-2">{mat.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                  {mat.summary || 'Sin resumen disponible.'}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">Nivel: {mat.reading_level || 'General'}</span>
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">{mat.content_type}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/50/50 rounded-b-xl flex justify-between items-center gap-2">
                {mat.id && cachedMap[mat.id] ? (
                  <Button
                    variant="outline"
                    className="w-full text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100"
                    onClick={() => mat.local_uri && window.open(mat.local_uri, '_blank')}
                  >
                    <IconBook size="sm" className="mr-2" />
                    Abrir Material
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={() => handleDownload(mat)}
                  >
                    <IconDownload size="sm" className="mr-2" />
                    Guardar para Offline
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredMaterials.length === 0 && (
        <div className="text-center py-20 bg-emerald-50/50 rounded-lg border-2 border-dashed border-emerald-200">
          <IconBook className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-emerald-800">No se encontraron materiales</h3>
          <p className="text-emerald-600 mt-2">Intenta buscar con otros términos o pide al Instructor que suba la guía.</p>
        </div>
      )}
    </div>
  );
}
