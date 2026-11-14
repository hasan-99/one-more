type CityOption = { id: string; slug: string };
type AreaOption = { city_id: string };

const unavailableCitySlugs = new Set(['paphos', 'famagusta', 'kyrenia']);

/** Limit all selectable city and area choices to the currently supported cities. */
export function filterCityAreaOptions<TCity extends CityOption, TArea extends AreaOption>(
  cities: readonly TCity[],
  areas: readonly TArea[],
): { cities: TCity[]; areas: TArea[] } {
  const visibleCities = cities.filter((city) => !unavailableCitySlugs.has(city.slug));
  const visibleCityIds = new Set(visibleCities.map((city) => city.id));

  return {
    cities: visibleCities,
    areas: areas.filter((area) => visibleCityIds.has(area.city_id)),
  };
}
