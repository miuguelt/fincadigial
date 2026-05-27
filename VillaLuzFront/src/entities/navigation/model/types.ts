export interface NavigationEndpoint {
  method: string;
  path: string;
  description: string;
  requires_auth: boolean;
  permissions: string[];
}

export interface NavigationGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  endpoints: NavigationEndpoint[];
  count: number;
}

export interface NavigationStructure {
  version: string;
  base_url: string;
  groups: NavigationGroup[];
}

export interface QuickAccessEndpoint {
  name: string;
  path: string;
  method: string;
  icon: string;
  description: string;
}

export interface QuickAccessResponse {
  endpoints: QuickAccessEndpoint[];
  count: number;
}
