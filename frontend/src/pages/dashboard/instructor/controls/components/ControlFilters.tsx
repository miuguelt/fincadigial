import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { IconFilter, IconSearch } from '@/shared/ui/icons';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

interface ControlFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAnimalFilter: string;
  setSelectedAnimalFilter: (filter: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  animals: AnimalResponse[];
}

export const ControlFilters: React.FC<ControlFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedAnimalFilter,
  setSelectedAnimalFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
  dateFilter,
  setDateFilter,
  animals,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconFilter size="sm" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Búsqueda</label>
            <div className="relative">
              <IconSearch size="sm" className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar en descripción o estado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Animal</label>
            <Select value={selectedAnimalFilter} onValueChange={setSelectedAnimalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los animales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los animales</SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id.toString()}>
                    {animal.record || `Animal #${animal.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado de Salud</label>
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Excelente">Excelente</SelectItem>
                <SelectItem value="Bueno">Bueno</SelectItem>
                <SelectItem value="Sano">Sano</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Malo">Malo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha</label>
            <Input
              type="month"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filtrar por mes y año"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

