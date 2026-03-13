/**
 * Weather system: seasons affect weather type and temperature.
 * Quality: dangerous | bad | normal | good | perfect
 * Park walks in normal/good/perfect weather increase happiness.
 */

export type WeatherQuality = 'dangerous' | 'bad' | 'normal' | 'good' | 'perfect';

export interface WeatherConditions {
  type: string;      // e.g. "Sunny", "Rainy", "Snow"
  tempF: number;     // temperature in Fahrenheit
  quality: WeatherQuality;
}

const DAYS_PER_SEASON = 28;
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

/** Seeded pseudo-random for deterministic weather from dayOfYear + year */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/** Get weather for a given day. Seasons affect type and temp. */
export function getWeatherForDay(year: number, dayOfYear: number): WeatherConditions {
  const seasonIndex = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON);
  const season = SEASONS[seasonIndex];
  const dayInSeason = ((dayOfYear - 1) % DAYS_PER_SEASON) + 1;
  const seed = year * 1000 + dayOfYear;

  // Base temps by season (F)
  const baseTempBySeason: Record<string, number> = {
    Spring: 55,
    Summer: 78,
    Fall: 52,
    Winter: 32,
  };
  const variance = (seededRandom(seed) - 0.5) * 25;
  const tempF = Math.round(baseTempBySeason[season] + variance);

  // Weather types vary by season
  const typesBySeason: Record<string, string[]> = {
    Spring: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Windy'],
    Summer: ['Sunny', 'Hot', 'Partly Cloudy', 'Humid', 'Thunderstorm'],
    Fall: ['Cloudy', 'Rainy', 'Windy', 'Partly Cloudy', 'Sunny'],
    Winter: ['Snow', 'Cold', 'Cloudy', 'Freezing Rain', 'Partly Cloudy'],
  };
  const types = typesBySeason[season];
  const typeIndex = Math.floor(seededRandom(seed + 1) * types.length);
  const type = types[typeIndex];

  // Quality: dangerous (storms, extreme), bad (unpleasant), normal, good, perfect
  const r = seededRandom(seed + 2);
  let quality: WeatherQuality;
  if (type === 'Thunderstorm' || type === 'Freezing Rain' || (type === 'Snow' && tempF < 10)) {
    quality = r < 0.7 ? 'dangerous' : 'bad';
  } else if (type === 'Rainy' || type === 'Cold' || type === 'Hot' || type === 'Humid') {
    quality = r < 0.3 ? 'bad' : r < 0.7 ? 'normal' : 'good';
  } else if (type === 'Sunny' || type === 'Partly Cloudy') {
    quality = r < 0.2 ? 'normal' : r < 0.6 ? 'good' : 'perfect';
  } else {
    quality = r < 0.4 ? 'normal' : r < 0.8 ? 'good' : 'perfect';
  }

  return { type, tempF, quality };
}

/** Get 7-day forecast starting from dayOfYear */
export function getWeekForecast(year: number, dayOfYear: number): Array<{ dayOfYear: number; weather: WeatherConditions }> {
  const result: Array<{ dayOfYear: number; weather: WeatherConditions }> = [];
  for (let i = 0; i < 7; i++) {
    let d = dayOfYear + i;
    let y = year;
    if (d > 112) {
      d -= 112;
      y += 1;
    }
    result.push({ dayOfYear: d, weather: getWeatherForDay(y, d) });
  }
  return result;
}

/** True if walking in the park grants happiness bonus (normal or better) */
export function isGoodWeatherForWalk(quality: WeatherQuality): boolean {
  return quality === 'normal' || quality === 'good' || quality === 'perfect';
}

/** Cute emoji icon for weather type */
export function getWeatherIcon(type: string, _quality?: WeatherQuality): string {
  const icons: Record<string, string> = {
    Sunny: '☀️',
    'Partly Cloudy': '⛅',
    Cloudy: '☁️',
    Rainy: '🌧️',
    Windy: '💨',
    Hot: '🌡️',
    Humid: '💧',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Cold: '🥶',
    'Freezing Rain': '🌨️',
  };
  return icons[type] ?? '🌤️';
}
