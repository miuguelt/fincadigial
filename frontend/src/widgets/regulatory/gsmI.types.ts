export type MovementDestinationType =
  | 'slaughterhouse'
  | 'auction'
  | 'other_farm'
  | 'fair';

export interface GSMIDestinationValues {
  name: string;
  municipality: string;
  dane: string;
  receiverName: string;
  receiverId: string;
  truckPlate: string;
  driverName: string;
  driverId: string;
  movementDate: string;
}

export interface GSMIAnimalCategory {
  count: number;
  weightSum: number;
  animals: any[];
}

export type GSMIAnimalCategories = Record<string, GSMIAnimalCategory>;
