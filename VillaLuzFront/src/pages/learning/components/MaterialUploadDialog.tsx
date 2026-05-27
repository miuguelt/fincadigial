import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { offlineLearningService } from '@/entities/campesino/api/campesino.service';
import type { OfflineLearningMaterial } from '@/entities/campesino/model/types';
import { useToast } from '@/shared/hooks/use-toast';
import { IconLoader2, IconUpload } from '@/shared/ui/icons';

interface MaterialUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MaterialUploadDialog({ isOpen, onOpenChange, onSuccess }: MaterialUploadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content_type: 'TEXT',
    summary: '',
    local_uri: '',
    reading_level: 'General',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast({
        title: "Campos incompletos",
        description: "El título y la categoría son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await offlineLearningService.createOne(formData as Partial<OfflineLearningMaterial>);
      toast({
        title: "Material subido",
        description: "El material se ha guardado correctamente en la biblioteca.",
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        title: '',
        category: '',
        content_type: 'TEXT',
        summary: '',
        local_uri: '',
        reading_level: 'General',
      });
    } catch (error) {
      console.error("Error uploading material:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo subir el material. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUpload size="md" className="text-emerald-600" />
            Subir Nuevo Material
          </DialogTitle>
          <DialogDescription>
            Agrega guías, manuales o videos para que los campesinos puedan consultarlos offline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Material</Label>
            <Input
              id="title"
              placeholder="Ej: Manual de BPG en Porcinos"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                placeholder="Ej: Sanidad Animal"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_type">Tipo de Contenido</Label>
              <Select
                value={formData.content_type}
                onValueChange={(val) => setFormData({ ...formData, content_type: val })}
              >
                <SelectTrigger id="content_type">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Texto / Guía</SelectItem>
                  <SelectItem value="PDF">Documento PDF</SelectItem>
                  <SelectItem value="VIDEO">Video Tutorial</SelectItem>
                  <SelectItem value="AUDIO">Podcast / Audio</SelectItem>
                  <SelectItem value="IMAGE">Infografía</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_uri">URL del archivo o recurso</Label>
            <Input
              id="local_uri"
              placeholder="https://cdn.villaluz.com/guias/bpg.pdf"
              value={formData.local_uri}
              onChange={(e) => setFormData({ ...formData, local_uri: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading_level">Nivel Sugerido</Label>
            <Input
              id="reading_level"
              placeholder="Ej: Técnico, General, Avanzado"
              value={formData.reading_level}
              onChange={(e) => setFormData({ ...formData, reading_level: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Resumen Corto</Label>
            <Textarea
              id="summary"
              placeholder="Describe brevemente de qué trata este material..."
              className="min-h-[100px]"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size="sm" className="mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Subir a Biblioteca"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

