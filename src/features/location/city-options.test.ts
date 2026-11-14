import { describe, expect, it } from 'vitest';

import { filterCityAreaOptions } from './city-options';

const cities = [
  { id: 'nic', slug: 'nicosia' },
  { id: 'lim', slug: 'limassol' },
  { id: 'lca', slug: 'larnaca' },
  { id: 'paf', slug: 'paphos' },
  { id: 'fam', slug: 'famagusta' },
  { id: 'kyr', slug: 'kyrenia' },
];
const areas = [
  { id: 'strovolos', city_id: 'nic' },
  { id: 'germasogeia', city_id: 'lim' },
  { id: 'aradippou', city_id: 'lca' },
  { id: 'chloraka', city_id: 'paf' },
  { id: 'paralimni', city_id: 'fam' },
  { id: 'lapithos', city_id: 'kyr' },
];

describe('filterCityAreaOptions', () => {
  it('keeps only Nicosia, Limassol and Larnaca for new location choices', () => {
    expect(filterCityAreaOptions(cities, areas)).toEqual({
      cities: [cities[0], cities[1], cities[2]],
      areas: [areas[0], areas[1], areas[2]],
    });
  });

});
