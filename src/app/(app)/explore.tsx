import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppPage, EmptyState } from '@/components/layout/AppPage';
import { MatchCard } from '@/features/matches/MatchCard';
import {
  loadMatchFilters,
  loadMatches,
  type MatchArea,
  type MatchCity,
  type MatchDiscoveryItem,
  type MatchFilters,
} from '@/features/matches/match-service';
import { cyprusDateRange, parseOptionalPrice } from '@/features/matches/match-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const emptyFilters: MatchFilters = {
  cityId: null,
  areaId: null,
  sideSize: null,
  minimumFreeSpots: null,
  priceMaximum: null,
  skillLevel: null,
  dateFrom: '',
  dateThrough: '',
};

type SearchState = {
  key: string;
  items: MatchDiscoveryItem[];
  hasMore: boolean;
  page: number;
  error: boolean;
};

export default function ExploreScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [filterAttempt, setFilterAttempt] = useState(0);
  const [filterResult, setFilterResult] = useState<{
    attempt: number;
    data: { cities: MatchCity[]; areas: MatchArea[] } | null;
    error: boolean;
  } | null>(null);
  const [priceText, setPriceText] = useState('');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [search, setSearch] = useState<SearchState>({
    key: '',
    items: [],
    hasMore: false,
    page: 0,
    error: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const parsedPrice = parseOptionalPrice(priceText);
  const dateRange = useMemo(() => {
    if (!filters.dateFrom && !filters.dateThrough) return { from: '', through: '' };
    return cyprusDateRange(
      filters.dateFrom || filters.dateThrough,
      filters.dateThrough || filters.dateFrom,
    );
  }, [filters.dateFrom, filters.dateThrough]);
  const invalidDate = dateRange === null;
  const invalidPrice = Number.isNaN(parsedPrice);
  const queryFilters = useMemo<MatchFilters>(
    () => ({
      ...filters,
      priceMaximum: parsedPrice,
      dateFrom: dateRange?.from ?? '',
      dateThrough: dateRange?.through ?? '',
    }),
    [filters, parsedPrice, dateRange],
  );
  const queryKey = JSON.stringify(queryFilters);
  const filterData = filterResult?.attempt === filterAttempt ? filterResult.data : null;
  const filterError = filterResult?.attempt === filterAttempt && filterResult.error;
  const invalidQuery = invalidDate || invalidPrice;
  const loading = !invalidQuery && search.key !== queryKey;
  const matches = loading || invalidQuery ? [] : search.items;
  const hasMore = !loading && !invalidQuery && search.hasMore;
  const loadError = !loading && !invalidQuery && search.error;
  const filteredAreas =
    filterData?.areas.filter((area) => !filters.cityId || area.city_id === filters.cityId) ?? [];

  useEffect(() => {
    let active = true;
    void loadMatchFilters()
      .then((data) => {
        if (active) setFilterResult({ attempt: filterAttempt, data, error: false });
      })
      .catch(() => {
        if (active) setFilterResult({ attempt: filterAttempt, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [filterAttempt]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (invalidQuery) return;
      try {
        const result = await loadMatches(queryFilters, 0);
        if (active) {
          setSearch({
            key: queryKey,
            items: result.items,
            hasMore: result.hasMore,
            page: 0,
            error: false,
          });
        }
      } catch {
        if (active) setSearch({ key: queryKey, items: [], hasMore: false, page: 0, error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [invalidQuery, queryFilters, queryKey, searchAttempt]);

  const loadNextPage = async () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = search.page + 1;
    setLoadingMore(true);
    try {
      const result = await loadMatches(queryFilters, nextPage);
      setSearch((current) =>
        current.key !== queryKey
          ? current
          : {
              ...current,
              items: [...current.items, ...result.items],
              hasMore: result.hasMore,
              page: nextPage,
              error: false,
            },
      );
    } catch {
      setSearch((current) => (current.key === queryKey ? { ...current, error: true } : current));
    } finally {
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setPriceText('');
  };
  const styles = makeStyles(colors);

  return (
    <AppPage title={copy.matchListTitle} description={copy.matchListIntro}>
      <View style={styles.filterPanel}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>{copy.matchFilters}</Text>
          <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.clearButton}>
            <Text style={styles.clearText}>{copy.matchClearFilters}</Text>
          </Pressable>
        </View>
        {filterError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{copy.matchLoadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilterAttempt((attempt) => attempt + 1)}
            >
              <Text style={styles.retryText}>{copy.matchRetry}</Text>
            </Pressable>
          </View>
        ) : null}
        {filterData ? (
          <>
            <FilterRow title={copy.matchCity}>
              <FilterChip
                label={copy.matchAllCities}
                selected={!filters.cityId}
                onPress={() =>
                  setFilters((current) => ({ ...current, cityId: null, areaId: null }))
                }
              />
              {filterData.cities.map((city) => (
                <FilterChip
                  key={city.id}
                  label={locale === 'el' ? city.name_el : city.name_en}
                  selected={filters.cityId === city.id}
                  onPress={() =>
                    setFilters((current) => ({ ...current, cityId: city.id, areaId: null }))
                  }
                />
              ))}
            </FilterRow>
            {filteredAreas.length ? (
              <FilterRow title={copy.matchArea}>
                <FilterChip
                  label={copy.matchAllAreas}
                  selected={!filters.areaId}
                  onPress={() => setFilters((current) => ({ ...current, areaId: null }))}
                />
                {filteredAreas.map((area) => (
                  <FilterChip
                    key={area.id}
                    label={locale === 'el' ? area.name_el : area.name_en}
                    selected={filters.areaId === area.id}
                    onPress={() => setFilters((current) => ({ ...current, areaId: area.id }))}
                  />
                ))}
              </FilterRow>
            ) : null}
          </>
        ) : null}
        <FilterRow title={copy.matchFormat}>
          <FilterChip
            label={copy.matchAllFormats}
            selected={!filters.sideSize}
            onPress={() => setFilters((current) => ({ ...current, sideSize: null }))}
          />
          {[5, 7, 8, 11].map((size) => (
            <FilterChip
              key={size}
              label={`${size}v${size}`}
              selected={filters.sideSize === size}
              onPress={() => setFilters((current) => ({ ...current, sideSize: size }))}
            />
          ))}
        </FilterRow>
        <FilterRow title={copy.matchMinimumOpenSpots}>
          {[
            { count: null, label: copy.matchAnySpots },
            { count: 2, label: copy.matchTwoSpots },
            { count: 4, label: copy.matchFourSpots },
          ].map(({ count, label }) => (
            <FilterChip
              key={label}
              label={label}
              selected={filters.minimumFreeSpots === count}
              onPress={() => setFilters((current) => ({ ...current, minimumFreeSpots: count }))}
            />
          ))}
        </FilterRow>
        <View style={styles.inputGrid}>
          <FilterInput
            label={copy.matchMaximumPrice}
            value={priceText}
            onChangeText={setPriceText}
            placeholder="€"
            keyboardType="decimal-pad"
            error={invalidPrice}
          />
          <FilterInput
            label={copy.matchDateFrom}
            value={filters.dateFrom}
            onChangeText={(dateFrom) => setFilters((current) => ({ ...current, dateFrom }))}
            placeholder="YYYY-MM-DD"
            error={invalidDate}
          />
          <FilterInput
            label={copy.matchDateThrough}
            value={filters.dateThrough}
            onChangeText={(dateThrough) => setFilters((current) => ({ ...current, dateThrough }))}
            placeholder="YYYY-MM-DD"
            error={invalidDate}
          />
        </View>
        {invalidDate ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {copy.matchFilterDateInvalid}
          </Text>
        ) : null}
        {invalidPrice ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {copy.matchFilterPriceInvalid}
          </Text>
        ) : null}
        <FilterRow title={copy.matchSkill}>
          <FilterChip
            label={copy.matchAllLevels}
            selected={!filters.skillLevel}
            onPress={() => setFilters((current) => ({ ...current, skillLevel: null }))}
          />
          {(
            [
              ['beginner', copy.profileBeginner],
              ['intermediate', copy.profileIntermediate],
              ['advanced', copy.profileAdvanced],
            ] as const
          ).map(([level, label]) => (
            <FilterChip
              key={level}
              label={label}
              selected={filters.skillLevel === level}
              onPress={() => setFilters((current) => ({ ...current, skillLevel: level }))}
            />
          ))}
        </FilterRow>
      </View>

      {loading ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={copy.matchLoading}
          style={styles.stateBox}
        >
          <Text style={styles.stateText}>{copy.matchLoading}</Text>
        </View>
      ) : loadError && matches.length === 0 ? (
        <View accessibilityRole="alert" style={styles.stateBox}>
          <Text style={styles.errorText}>{copy.matchLoadError}</Text>
          <ActionButton
            label={copy.matchRetry}
            onPress={() => setSearchAttempt((attempt) => attempt + 1)}
          />
        </View>
      ) : matches.length === 0 ? (
        <EmptyState title={copy.matchEmptyTitle} description={copy.matchEmptyCopy} />
      ) : (
        <View style={styles.results}>
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
          {loadError ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>{copy.matchLoadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => void loadNextPage()}>
                <Text style={styles.retryText}>{copy.matchRetry}</Text>
              </Pressable>
            </View>
          ) : null}
          {hasMore ? (
            <ActionButton
              label={loadingMore ? copy.matchLoading : copy.matchLoadMore}
              onPress={() => void loadNextPage()}
              disabled={loadingMore}
            />
          ) : null}
        </View>
      )}
    </AppPage>
  );
}

function FilterRow({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors } = useAppPreferences();
  return (
    <View style={sharedStyles.filterRow}>
      <Text style={[sharedStyles.filterLabel, { color: colors.textSecondary }]}>{title}</Text>
      <View accessibilityRole="radiogroup" style={sharedStyles.chips}>
        {children}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[
        sharedStyles.chip,
        {
          backgroundColor: selected ? colors.primaryButton : colors.surfaceRaised,
          borderColor: selected ? colors.primaryButton : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primaryButtonText : colors.textPrimary,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  error?: boolean;
}) {
  const { colors } = useAppPreferences();
  return (
    <View style={sharedStyles.filterInput}>
      <Text style={[sharedStyles.filterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={[
          sharedStyles.input,
          {
            color: colors.textPrimary,
            borderColor: error ? colors.errorText : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        sharedStyles.action,
        { backgroundColor: colors.primaryButton, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <Text style={{ color: colors.primaryButtonText, fontWeight: '800', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const sharedStyles = StyleSheet.create({
  filterRow: { gap: 7 },
  filterLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
  },
  filterInput: { flex: 1, minWidth: 150, gap: 7 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, fontSize: 14 },
  action: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    filterPanel: {
      width: '100%',
      gap: 16,
      padding: 18,
      borderWidth: 1,
      borderRadius: 18,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    filterTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    clearButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 6 },
    clearText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },
    inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    errorBox: { gap: 6, padding: 12, borderRadius: 10, backgroundColor: colors.error },
    errorText: { color: colors.errorText, fontSize: 13, lineHeight: 19 },
    retryText: { color: colors.accentText, fontSize: 13, fontWeight: '800' },
    stateBox: { minHeight: 100, justifyContent: 'center', alignItems: 'center', gap: 12 },
    stateText: { color: colors.textSecondary, fontSize: 14 },
    results: { width: '100%', gap: 14 },
  });
}
