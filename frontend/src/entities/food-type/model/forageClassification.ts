export type ForageCategoryId =
  | "all"
  | "pasture"
  | "cut_grass"
  | "legume_silvopastoral"
  | "silage_hay"
  | "mineral_supplement"
  | "concentrate";

export interface ForageCategoryInfo {
  id: ForageCategoryId;
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  badgeClass: string;
  borderClass: string;
  description: string;
}

export const FORAGE_CATEGORIES: Record<Exclude<ForageCategoryId, "all">, ForageCategoryInfo> = {
  pasture: {
    id: "pasture",
    label: "Pasturas de Pastoreo",
    shortLabel: "Pastoreo",
    icon: "🌿",
    colorClass: "text-emerald-700 dark:text-emerald-300",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    borderClass: "border-l-emerald-500 shadow-emerald-500/10",
    description: "Gramíneas de pastoreo rotacional directo en potrero (Brachiarias, Kikuyo, Ryegrass, Guinea, etc.)",
  },
  cut_grass: {
    id: "cut_grass",
    label: "Pastos de Corte y Biomasa",
    shortLabel: "Pasto de Corte",
    icon: "✂️",
    colorClass: "text-lime-700 dark:text-lime-300",
    badgeClass: "bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-500/20",
    borderClass: "border-l-lime-500 shadow-lime-500/10",
    description: "Forrajes de alta producción de biomasa para corte y acarreo en canoa (Maralfalfa, Cuba 22, Elefante, Caña)",
  },
  legume_silvopastoral: {
    id: "legume_silvopastoral",
    label: "Bancos Proteicos y Silvopastoril",
    shortLabel: "Silvopastoril",
    icon: "🌳",
    colorClass: "text-teal-700 dark:text-teal-300",
    badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    borderClass: "border-l-teal-500 shadow-teal-500/10",
    description: "Arbustos y leguminosas fijadoras de nitrógeno con alto valor proteico (Botón de Oro, Matarratón, Leucaena)",
  },
  silage_hay: {
    id: "silage_hay",
    label: "Ensilajes, Henos y Henilajes",
    shortLabel: "Silos y Henos",
    icon: "🌽",
    colorClass: "text-amber-700 dark:text-amber-300",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    borderClass: "border-l-amber-500 shadow-amber-500/10",
    description: "Conservación de forraje fermentado o deshidratado para suplementación estratégica en sequía",
  },
  mineral_supplement: {
    id: "mineral_supplement",
    label: "Sales Mineralizadas y Suplementos",
    shortLabel: "Sales y Minerales",
    icon: "🧂",
    colorClass: "text-blue-700 dark:text-blue-300",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    borderClass: "border-l-blue-500 shadow-blue-500/10",
    description: "Suplementación mineral, bloques multinutricionales, fuentes proteicas y energéticas",
  },
  concentrate: {
    id: "concentrate",
    label: "Concentrados y Raciones Balanceadas",
    shortLabel: "Concentrados",
    icon: "🥣",
    colorClass: "text-purple-700 dark:text-purple-300",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    borderClass: "border-l-purple-500 shadow-purple-500/10",
    description: "Alimento comercial o mezclado balanceado para lechería, levante intensivo o ceba",
  },
};

export interface ForageNutritionalProfile {
  estimatedProtein: string;
  dryMatter: string;
  restDaysSuggested: number;
  thermalFloor: string;
  recommendedUse: string;
  cuttingIntervalDays?: number;
}

export function classifyFoodType(name?: string | null, description?: string | null): {
  category: ForageCategoryInfo;
  profile: ForageNutritionalProfile;
} {
  const combined = (name + " " + (description || "")).toLowerCase();

  if (
    combined.includes("sal ") ||
    combined.includes("sal mineral") ||
    combined.includes("fósforo") ||
    combined.includes("fosforo") ||
    combined.includes("mineralizada") ||
    combined.includes("bloque multi") ||
    combined.includes("palmiste") ||
    combined.includes("melaza")
  ) {
    const isSal = combined.includes("sal ") || combined.includes("mineralizada");
    return {
      category: FORAGE_CATEGORIES.mineral_supplement,
      profile: {
        estimatedProtein: combined.includes("palmiste") ? "14 - 16% PB" : "0% PB (Mineral)",
        dryMatter: "90 - 95% MS",
        restDaysSuggested: 0,
        thermalFloor: "Todos los climas",
        recommendedUse: isSal
          ? "Suministro permanente a voluntad en saladeros cubiertos (80-100 g/día)"
          : "Suplemento energético-proteico en canoa (1-2 kg/día)",
      },
    };
  }

  if (
    combined.includes("concentrado") ||
    combined.includes("balanceado") ||
    combined.includes("iniciador") ||
    combined.includes("harina de soya") ||
    combined.includes("ración") ||
    combined.includes("racion")
  ) {
    return {
      category: FORAGE_CATEGORIES.concentrate,
      profile: {
        estimatedProtein: combined.includes("lecher") ? "16 - 18% PB" : "14 - 16% PB",
        dryMatter: "88 - 90% MS",
        restDaysSuggested: 0,
        thermalFloor: "Todos los climas",
        recommendedUse: "Suministro individual en sala de ordeño o corral según nivel de producción",
      },
    };
  }

  if (
    combined.includes("silo") ||
    combined.includes("ensilaje") ||
    combined.includes("heno") ||
    combined.includes("henilaje")
  ) {
    return {
      category: FORAGE_CATEGORIES.silage_hay,
      profile: {
        estimatedProtein: combined.includes("maíz") || combined.includes("maiz") ? "7 - 9% PB" : "8 - 11% PB",
        dryMatter: "30 - 35% MS (Silo) / 85% MS (Heno)",
        restDaysSuggested: 0,
        thermalFloor: "Trópico bajo, medio y alto",
        recommendedUse: "Suministro en canoa como base energética o en épocas de sequía (5-15 kg/día)",
      },
    };
  }

  if (
    combined.includes("botón de oro") ||
    combined.includes("boton de oro") ||
    combined.includes("tithonia") ||
    combined.includes("matarratón") ||
    combined.includes("matarraton") ||
    combined.includes("gliricidia") ||
    combined.includes("leucaena") ||
    combined.includes("cratylia") ||
    combined.includes("kudzu") ||
    combined.includes("kudzú") ||
    combined.includes("maní forrajero") ||
    combined.includes("mani forrajero")
  ) {
    return {
      category: FORAGE_CATEGORIES.legume_silvopastoral,
      profile: {
        estimatedProtein: "20 - 26% PB",
        dryMatter: "18 - 24% MS",
        restDaysSuggested: 45,
        cuttingIntervalDays: 45,
        thermalFloor: "Trópico bajo y medio (0 - 1800 msnm)",
        recommendedUse: "Banco de proteína para corte y acarreo o franjas de ramoneo controlado",
      },
    };
  }

  if (
    combined.includes("corte") ||
    combined.includes("maralfalfa") ||
    combined.includes("cuba 22") ||
    combined.includes("elefante") ||
    combined.includes("king grass") ||
    combined.includes("caña") ||
    combined.includes("camerún") ||
    combined.includes("camerun") ||
    combined.includes("pincoya")
  ) {
    return {
      category: FORAGE_CATEGORIES.cut_grass,
      profile: {
        estimatedProtein: "9 - 13% PB",
        dryMatter: "18 - 22% MS",
        restDaysSuggested: 60,
        cuttingIntervalDays: 60,
        thermalFloor: "Trópico bajo y medio (0 - 2200 msnm)",
        recommendedUse: "Pasto de corte de alto volumen picado en verde o ensilado",
      },
    };
  }

  if (combined.includes("kikuyo")) {
    return {
      category: FORAGE_CATEGORIES.pasture,
      profile: {
        estimatedProtein: "14 - 18% PB",
        dryMatter: "16 - 20% MS",
        restDaysSuggested: 38,
        thermalFloor: "Trópico Alto (2000 - 3000 msnm)",
        recommendedUse: "Pastoreo rotacional intensivo con franjas y control de colchón",
      },
    };
  }

  if (combined.includes("ryegrass") || combined.includes("raigras") || combined.includes("raygrass")) {
    return {
      category: FORAGE_CATEGORIES.pasture,
      profile: {
        estimatedProtein: "18 - 22% PB",
        dryMatter: "14 - 18% MS",
        restDaysSuggested: 30,
        thermalFloor: "Trópico Alto Especializado (2200 - 3200 msnm)",
        recommendedUse: "Lechería especializada con alto requerimiento nutricional y fertirriego",
      },
    };
  }

  if (combined.includes("mombaza") || combined.includes("tanzania") || combined.includes("guinea") || combined.includes("maximum")) {
    return {
      category: FORAGE_CATEGORIES.pasture,
      profile: {
        estimatedProtein: "11 - 15% PB",
        dryMatter: "18 - 22% MS",
        restDaysSuggested: 25,
        thermalFloor: "Trópico Bajo y Medio (0 - 1600 msnm)",
        recommendedUse: "Pastoreo rotacional en novillos de ceba y vacas doble propósito",
      },
    };
  }

  if (
    combined.includes("brachiaria") ||
    combined.includes("braquiaria") ||
    combined.includes("decumbens") ||
    combined.includes("brizantha") ||
    combined.includes("humidicola") ||
    combined.includes("toledo") ||
    combined.includes("marandu")
  ) {
    return {
      category: FORAGE_CATEGORIES.pasture,
      profile: {
        estimatedProtein: "8 - 12% PB",
        dryMatter: "20 - 24% MS",
        restDaysSuggested: 30,
        thermalFloor: "Trópico Bajo y Medio (0 - 1800 msnm)",
        recommendedUse: "Excelente adaptación a suelos ácidos, pastoreo rotacional continuo",
      },
    };
  }

  if (combined.includes("estrella") || combined.includes("cynodon") || combined.includes("puntero") || combined.includes("pangola")) {
    return {
      category: FORAGE_CATEGORIES.pasture,
      profile: {
        estimatedProtein: "10 - 14% PB",
        dryMatter: "18 - 22% MS",
        restDaysSuggested: 24,
        thermalFloor: "Trópico Bajo y Medio (0 - 1600 msnm)",
        recommendedUse: "Pasto estolonífero de rápida cobertura y rebrote vigoroso",
      },
    };
  }

  return {
    category: FORAGE_CATEGORIES.pasture,
    profile: {
      estimatedProtein: "9 - 14% PB",
      dryMatter: "18 - 22% MS",
      restDaysSuggested: 30,
      thermalFloor: "Adaptable",
      recommendedUse: "Pastoreo rotacional según aforo y estado biológico del rebrote",
    },
  };
}

export interface ForagePreset {
  name: string;
  category: Exclude<ForageCategoryId, "all">;
  handlings: string;
  gauges: string;
  areaDefault?: number;
  restDays: number;
  proteinRange: string;
}

export const COLOMBIAN_FORAGE_PRESETS: ForagePreset[] = [
  {
    name: "Pasto Kikuyo (Pennisetum clandestinum)",
    category: "pasture",
    handlings: "Dominante en trópico alto (2.000-3.000 msnm). Control estricto de colchón. Fertilización con nitrógeno post-pastoreo.",
    gauges: "Aforo esperado: 1.8 - 2.5 kg/m² verde. Proteína: 14-18% PB. Materia Seca: 18%.",
    areaDefault: 10,
    restDays: 38,
    proteinRange: "14 - 18% PB",
  },
  {
    name: "Pasto Brachiaria decumbens (Pasto Amargo)",
    category: "pasture",
    handlings: "Pastoreo rotacional continuo. Excelente tolerancia a suelos ácidos de trópico bajo. Sensible al salivazo.",
    gauges: "Aforo esperado: 1.2 - 1.6 kg/m² verde. Proteína: 7-10% PB. Materia Seca: 22%.",
    areaDefault: 12,
    restDays: 30,
    proteinRange: "7 - 10% PB",
  },
  {
    name: "Pasto Brachiaria brizantha (Marandú / Toledo)",
    category: "pasture",
    handlings: "Pasto macollador de alto porte. Requiere 30-35 días de descanso. Excelente palatabilidad y producción de carne.",
    gauges: "Aforo esperado: 1.6 - 2.2 kg/m² verde. Proteína: 9-13% PB. Materia Seca: 20%.",
    areaDefault: 10,
    restDays: 32,
    proteinRange: "9 - 13% PB",
  },
  {
    name: "Pasto Guinea Mombaza (Panicum maximum)",
    category: "pasture",
    handlings: "Pasto macollador alto para novillos de ceba y lechería tropical. Exigente en fertilidad de suelo y buen drenaje.",
    gauges: "Aforo esperado: 2.2 - 3.0 kg/m² verde. Proteína: 11-15% PB. Materia Seca: 20%.",
    areaDefault: 15,
    restDays: 25,
    proteinRange: "11 - 15% PB",
  },
  {
    name: "Pasto Ryegrass Perenne (Lolium perenne)",
    category: "pasture",
    handlings: "Lechería especializada de trópico alto. Riego tecnificado por aspersión y fertilización alta en nitrógeno/potasio.",
    gauges: "Aforo esperado: 2.2 - 2.8 kg/m² verde. Proteína: 18-22% PB. Materia Seca: 16%.",
    areaDefault: 6,
    restDays: 30,
    proteinRange: "18 - 22% PB",
  },
  {
    name: "Pasto Estrella (Cynodon nlemfuensis)",
    category: "pasture",
    handlings: "Pasto estolonífero rastrero de crecimiento rápido. Rotación corta (21-25 días). Responde excelente al abonado.",
    gauges: "Aforo esperado: 1.4 - 1.8 kg/m² verde. Proteína: 11-14% PB. Materia Seca: 19%.",
    areaDefault: 8,
    restDays: 24,
    proteinRange: "11 - 14% PB",
  },
  {
    name: "Pasto Maralfalfa / Cuba 22 (Pasto de Corte)",
    category: "cut_grass",
    handlings: "Pasto de corte de biomasa gigante. Riego continuo y abonado orgánico masivo post-corte (60-75 días).",
    gauges: "Rendimiento: 8 - 14 kg/m² por corte. Proteína: 10-13% PB. Materia Seca: 19%.",
    areaDefault: 4,
    restDays: 60,
    proteinRange: "10 - 13% PB",
  },
  {
    name: "Botón de Oro (Tithonia diversifolia)",
    category: "legume_silvopastoral",
    handlings: "Arbusto forrajero proteico para corte y acarreo o franjas silvopastoriles. Poda a 40 cm cada 45-50 días.",
    gauges: "Aforo: 3 - 4 kg/planta por corte. Proteína: 20-25% PB. Materia Seca: 20%.",
    areaDefault: 2,
    restDays: 45,
    proteinRange: "20 - 25% PB",
  },
  {
    name: "Matarratón (Gliricidia sepium)",
    category: "legume_silvopastoral",
    handlings: "Leguminosa arbórea fijadora de nitrógeno. Excelente banco proteico para suplementación estival y cercas vivas.",
    gauges: "Proteína bruta: 22-26% PB. Alta digestibilidad ruminal (>65%).",
    areaDefault: 2,
    restDays: 50,
    proteinRange: "22 - 26% PB",
  },
  {
    name: "Ensilaje de Maíz (Zea mays)",
    category: "silage_hay",
    handlings: "Cosechado en estado de grano 1/2 a 3/4 de línea de leche (32-35% materia seca). Compactado y sellado hermético.",
    gauges: "Energía neta: 1.5 Mcal/kg MS. Proteína: 7-9% PB. Consumo: 8-15 kg/vaca/día.",
    areaDefault: 5,
    restDays: 0,
    proteinRange: "7 - 9% PB",
  },
  {
    name: "Sal Mineralizada 8% Fósforo (Ceba / Mantenimiento)",
    category: "mineral_supplement",
    handlings: "Suministro a voluntad en saladeros cubiertos y limpios. Consumo esperado: 80-100 g/bovino adulto/día.",
    gauges: "Fósforo: 8%, Calcio: 12%, Magnesio: 2%, Azufre: 4%, Microelementos quelatados.",
    areaDefault: 1,
    restDays: 0,
    proteinRange: "Mineral (0% PB)",
  },
  {
    name: "Sal Mineralizada 12% Fósforo (Cría y Leche)",
    category: "mineral_supplement",
    handlings: "Especial para vacas en lactancia, hembras de cría y suelos deficientes en fósforo.",
    gauges: "Fósforo: 12%, Calcio: 14%, Selenio, Zinc, Cobre, Yodo y Cobalto.",
    areaDefault: 1,
    restDays: 0,
    proteinRange: "Mineral (0% PB)",
  },
  {
    name: "Concentrado Lechería Especializada (18% PB)",
    category: "concentrate",
    handlings: "Suministro en sala de ordeño a razón de 1 kg de concentrado por cada 3-4 litros de leche producida.",
    gauges: "Proteína: 18% PB, Grasa: 3.5%, FDN: 28%, Humedad: 12%.",
    areaDefault: 1,
    restDays: 0,
    proteinRange: "18% PB",
  },
];