export interface WeatherRecord {
  id: number;
  finca_id: number;
  recorded_at: string;
  temperature_celsius: number | null;
  feels_like_celsius: number | null;
  humidity_percent: number | null;
  wind_speed_kmh: number | null;
  wind_direction_degrees: number | null;
  precipitation_mm: number | null;
  pressure_hpa: number | null;
  uv_index: number | null;
  cloud_cover_percent: number | null;
  weather_code: number | null;
  weather_condition: string | null;
  sunrise_time: string | null;
  sunset_time: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeatherAlert {
  id: number;
  finca_id: number;
  title: string;
  alert_type: string;
  severity: string;
  description: string | null;
  recommendation: string | null;
  current_temperature: number | null;
  current_humidity: number | null;
  current_wind_speed: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_dismissed: boolean;
  dismissed_by: number | null;
  dismissed_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeatherDashboard {
  current: WeatherRecord | null;
  alerts: WeatherAlert[];
  history: WeatherRecord[];
  finca_id: number;
  /** Coordenadas de la finca; sin ellas no hay datos climáticos. */
  location: FincaLocation | null;
}

/** Día del pronóstico diario (bloque `daily` de Open-Meteo). */
export interface WeatherForecastDay {
  date: string;
  temp_max: number | null;
  temp_min: number | null;
  precipitation_mm: number | null;
  wind_max: number | null;
  weather_code: number | null;
  humidity_avg?: number | null;
  uv_index?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
}

/** Ubicación de la finca usada para consultar el clima. */
export interface FincaLocation {
  latitude: number | null;
  longitude: number | null;
  department: string | null;
  municipality: string | null;
}

export interface WeatherUpdateResult {
  total: number;
  success: number;
  failed: number;
  details: Array<{
    finca_id: number;
    finca_name: string;
    success: boolean;
    record_id?: number;
    alerts_generated?: number;
    error?: string;
  }>;
}
