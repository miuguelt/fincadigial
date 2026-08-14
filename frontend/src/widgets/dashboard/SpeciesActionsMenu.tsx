import React from "react";
import { MoreVertical, List } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SpeciesResponse } from "@/shared/api/generated/swaggerTypes";
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

interface SpeciesActionsMenuProps {
  species: SpeciesResponse;
}

export const SpeciesActionsMenu: React.FC<SpeciesActionsMenuProps> = ({
  species,
}) => {
  const { goTo } = useRoleNavigation();

  const handleViewBreeds = () => {
    // Navegar a la página de razas con el filtro de species_id
    goTo(
      `/admin/breeds?species_id=${species.id}&species_name=${encodeURIComponent(species.name)}`,
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleViewBreeds();
            }}
            className="cursor-pointer"
          >
            <List className="mr-2 h-4 w-4" />
            Ver Razas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
