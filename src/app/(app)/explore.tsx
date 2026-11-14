import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

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

type Sheet = 'area' | 'more' | null;

export default function ExploreScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { width } = useWindowDimensions();
  const [filters, setFilters] = useState<MatchFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<MatchFilters>(emptyFilters);
  const [filterAttempt, setFilterAttempt] = useState(0);
  const [filterResult, setFilterResult] = useState<{
    attempt: number;
    data: { cities: MatchCity[]; areas: MatchArea[] } | null;
    error: boolean;
  } | null>(null);
  const [priceText, setPriceText] = useState('');
  const [draftPriceText, setDraftPriceText] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
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
  const draftParsedPrice = parseOptionalPrice(draftPriceText);
  const dateRange = useMemo(() => {
    if (!filters.dateFrom && !filters.dateThrough) return { from: '', through: '' };
    return cyprusDateRange(
      filters.dateFrom || filters.dateThrough,
      filters.dateThrough || filters.dateFrom,
    );
  }, [filters.dateFrom, filters.dateThrough]);
  const draftDateRange = useMemo(() => {
    if (!draftFilters.dateFrom && !draftFilters.dateThrough) return { from: '', through: '' };
    return cyprusDateRange(
      draftFilters.dateFrom || draftFilters.dateThrough,
      draftFilters.dateThrough || draftFilters.dateFrom,
    );
  }, [draftFilters.dateFrom, draftFilters.dateThrough]);
  const invalidDate = dateRange === null;
  const invalidPrice = Number.isNaN(parsedPrice);
  const invalidDraftDate = draftDateRange === null;
  const invalidDraftPrice = Number.isNaN(draftParsedPrice);
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
  const selectedArea = filterData?.areas.find((area) => area.id === filters.areaId);
  const appliedFilterCount =
    Number(Boolean(filters.cityId)) +
    Number(Boolean(filters.areaId)) +
    Number(filters.minimumFreeSpots !== null) +
    Number(Boolean(priceText)) +
    Number(Boolean(filters.dateFrom || filters.dateThrough)) +
    Number(Boolean(filters.skillLevel));
  const styles = makeStyles(colors, width);

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
    setDraftFilters(emptyFilters);
    setPriceText('');
    setDraftPriceText('');
  };
  const openSheet = (next: Exclude<Sheet, null>) => {
    setDraftFilters(filters);
    setDraftPriceText(priceText);
    setSheet(next);
  };
  const applyDraft = () => {
    setFilters({ ...draftFilters, priceMaximum: draftParsedPrice });
    setPriceText(draftPriceText);
    setSheet(null);
  };
  const clearDraft = () => {
    setDraftFilters({ ...emptyFilters, sideSize: filters.sideSize });
    setDraftPriceText('');
  };
  const areasForCity = filterData?.areas.filter(
    (area) => !draftFilters.cityId || area.city_id === draftFilters.cityId,
  );

  return (
    <AppPage title={copy.matchListTitle} description={copy.matchListIntro}>
      <View style={styles.controls}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.matchFormat}
          style={styles.formats}
        >
          {[
            { size: null, label: copy.matchAllFormatsShort },
            ...[5, 7, 8, 11].map((size) => ({ size, label: `${size}v${size}` })),
          ].map(({ size, label }) => {
            const selected = filters.sideSize === size;
            return (
              <Pressable
                key={label}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => setFilters((current) => ({ ...current, sideSize: size }))}
                style={[
                  styles.formatOption,
                  selected && {
                    backgroundColor: colors.primaryButton,
                    borderColor: colors.primaryButton,
                  },
                ]}
              >
                <Text style={[styles.formatText, selected && { color: colors.primaryButtonText }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.selectorRow}>
          <SelectorButton
            label={copy.matchArea}
            value={
              selectedArea
                ? locale === 'el'
                  ? selectedArea.name_el
                  : selectedArea.name_en
                : copy.matchAllAreas
            }
            icon="⌖"
            onPress={() => openSheet('area')}
            accessibilityLabel={`${copy.matchArea}: ${selectedArea ? (locale === 'el' ? selectedArea.name_el : selectedArea.name_en) : copy.matchAllAreas}`}
          />
          <SelectorButton
            label={copy.matchMoreFilters}
            value={
              appliedFilterCount
                ? copy.matchFilterCount.replace('{count}', String(appliedFilterCount))
                : copy.matchNoFilters
            }
            icon="☷"
            onPress={() => openSheet('more')}
          />
        </View>
      </View>

      {filterError ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{copy.matchFiltersLoadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilterAttempt((attempt) => attempt + 1)}
          >
            <Text style={styles.retryText}>{copy.matchRetry}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.resultsHeader}>
        <View style={styles.resultCount}>
          <View style={styles.statusDot} />
          <Text style={styles.resultText}>
            {loading
              ? copy.matchLoading
              : copy.matchResultsCount.replace('{count}', String(matches.length))}
          </Text>
        </View>
        {appliedFilterCount || filters.sideSize ? (
          <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.clearButton}>
            <Text style={styles.clearText}>{copy.matchClearFilters}</Text>
          </Pressable>
        ) : null}
      </View>

      {invalidDate || invalidPrice ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>
            {invalidDate ? copy.matchFilterDateInvalid : copy.matchFilterPriceInvalid}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => openSheet(invalidDate ? 'more' : 'more')}
          >
            <Text style={styles.retryText}>{copy.matchMoreFilters}</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={copy.matchLoading}
          style={styles.stateBox}
        >
          <View style={styles.loadingBall} />
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

      <FilterSheet
        visible={sheet !== null}
        title={sheet === 'area' ? copy.matchChooseArea : copy.matchMoreFilters}
        onClose={() => setSheet(null)}
        footer={
          <View style={styles.sheetActions}>
            <ActionButton label={copy.matchClear} onPress={clearDraft} secondary />
            <ActionButton
              label={copy.matchShowGames}
              onPress={applyDraft}
              disabled={invalidDraftDate || invalidDraftPrice}
            />
          </View>
        }
      >
        {sheet === 'area' ? (
          <View style={styles.areaGrid}>
            <ChoiceButton
              label={copy.matchAllAreas}
              selected={!draftFilters.areaId}
              onPress={() => setDraftFilters((current) => ({ ...current, areaId: null }))}
            />
            {filterData?.areas
              .filter((area) => !draftFilters.cityId || area.city_id === draftFilters.cityId)
              .map((area) => (
                <ChoiceButton
                  key={area.id}
                  label={locale === 'el' ? area.name_el : area.name_en}
                  selected={draftFilters.areaId === area.id}
                  onPress={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      areaId: area.id,
                      cityId: area.city_id,
                    }))
                  }
                />
              ))}
          </View>
        ) : (
          <View style={styles.sheetFields}>
            {filterData ? (
              <FilterRow title={copy.matchCity}>
                <FilterChip
                  label={copy.matchAllCities}
                  selected={!draftFilters.cityId}
                  onPress={() =>
                    setDraftFilters((current) => ({ ...current, cityId: null, areaId: null }))
                  }
                />
                {filterData.cities.map((city) => (
                  <FilterChip
                    key={city.id}
                    label={locale === 'el' ? city.name_el : city.name_en}
                    selected={draftFilters.cityId === city.id}
                    onPress={() =>
                      setDraftFilters((current) => ({ ...current, cityId: city.id, areaId: null }))
                    }
                  />
                ))}
              </FilterRow>
            ) : null}
            <FilterRow title={copy.matchMinimumOpenSpots}>
              {[
                { count: null, label: copy.matchAnySpots },
                { count: 2, label: copy.matchTwoSpots },
                { count: 4, label: copy.matchFourSpots },
              ].map(({ count, label }) => (
                <FilterChip
                  key={label}
                  label={label}
                  selected={draftFilters.minimumFreeSpots === count}
                  onPress={() =>
                    setDraftFilters((current) => ({ ...current, minimumFreeSpots: count }))
                  }
                />
              ))}
            </FilterRow>
            <View style={styles.inputGrid}>
              <FilterInput
                label={copy.matchMaximumPrice}
                value={draftPriceText}
                onChangeText={setDraftPriceText}
                placeholder="€"
                keyboardType="decimal-pad"
                error={invalidDraftPrice}
              />
              <FilterInput
                label={copy.matchDateFrom}
                value={draftFilters.dateFrom}
                onChangeText={(dateFrom) =>
                  setDraftFilters((current) => ({ ...current, dateFrom }))
                }
                placeholder="YYYY-MM-DD"
                error={invalidDraftDate}
              />
              <FilterInput
                label={copy.matchDateThrough}
                value={draftFilters.dateThrough}
                onChangeText={(dateThrough) =>
                  setDraftFilters((current) => ({ ...current, dateThrough }))
                }
                placeholder="YYYY-MM-DD"
                error={invalidDraftDate}
              />
            </View>
            {invalidDraftDate ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {copy.matchFilterDateInvalid}
              </Text>
            ) : null}
            {invalidDraftPrice ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {copy.matchFilterPriceInvalid}
              </Text>
            ) : null}
            <FilterRow title={copy.matchSkill}>
              <FilterChip
                label={copy.matchAllLevels}
                selected={!draftFilters.skillLevel}
                onPress={() => setDraftFilters((current) => ({ ...current, skillLevel: null }))}
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
                  selected={draftFilters.skillLevel === level}
                  onPress={() => setDraftFilters((current) => ({ ...current, skillLevel: level }))}
                />
              ))}
            </FilterRow>
            {areasForCity?.length === 0 ? (
              <Text style={styles.helperText}>{copy.matchNoAreas}</Text>
            ) : null}
          </View>
        )}
      </FilterSheet>
    </AppPage>
  );
}

function SelectorButton({
  label,
  value,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useAppPreferences();
  const styles = makeStyles(colors, 390);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      onPress={onPress}
      style={styles.selector}
    >
      <Text style={styles.selectorIcon}>{icon}</Text>
      <View style={styles.selectorCopy}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.selectorValue}>
          {value}
        </Text>
      </View>
      <Text style={styles.chevron}>⌄</Text>
    </Pressable>
  );
}

function FilterSheet({
  visible,
  title,
  children,
  footer,
  onClose,
}: PropsWithChildren<{ visible: boolean; title: string; footer: ReactNode; onClose: () => void }>) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, 390);
  const copy = translations[locale];
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.matchDismissOverlay}
          onPress={onClose}
          style={styles.scrim}
        />
        <View
          accessibilityViewIsModal
          accessibilityRole="dialog"
          accessibilityLabel={title}
          style={styles.sheet}
        >
          <View style={styles.sheetHeading}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.matchCloseFilters}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            {children}
          </ScrollView>
          <View style={styles.sheetFooter}>{footer}</View>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppPreferences();
  const styles = makeStyles(colors, 390);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[
        styles.choice,
        selected && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
      ]}
    >
      <Text style={[styles.choiceText, selected && { color: colors.primaryButtonText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterRow({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors } = useAppPreferences();
  const styles = makeStyles(colors, 390);
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{title}</Text>
      <View accessibilityRole="radiogroup" style={styles.chips}>
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
  const styles = makeStyles(colors, 390);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: colors.primaryButtonText }]}>
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
  const styles = makeStyles(colors, 390);
  return (
    <View style={styles.filterInput}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={[styles.input, { borderColor: error ? colors.errorText : colors.border }]}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useAppPreferences();
  const styles = makeStyles(colors, 390);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        secondary ? styles.secondaryAction : styles.primaryAction,
        { opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <Text style={[styles.actionText, secondary && { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors'], width: number) {
  const compact = width < 420;
  return StyleSheet.create({
    controls: { gap: 14 },
    formats: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 4,
      backgroundColor: colors.surface,
      gap: 3,
    },
    formatOption: {
      flex: 1,
      minWidth: 0,
      minHeight: compact ? 42 : 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 14,
    },
    formatText: {
      color: colors.textSecondary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: compact ? 11 : 14,
      fontWeight: '700',
    },
    selectorRow: { flexDirection: 'row', gap: 10 },
    selector: {
      flex: 1,
      minWidth: 0,
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: compact ? 10 : 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    selectorIcon: {
      color: colors.accentText,
      fontSize: 24,
      width: 24,
      textAlign: 'center',
      fontWeight: '700',
    },
    selectorCopy: { flex: 1, minWidth: 0, gap: 2 },
    selectorLabel: { color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 11 },
    selectorValue: {
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: compact ? 12 : 14,
      fontWeight: '700',
    },
    chevron: { color: colors.textSecondary, fontSize: 20 },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4,
    },
    resultCount: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accentText },
    resultText: {
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      fontWeight: '700',
    },
    clearButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
    clearText: {
      color: colors.accentText,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '700',
    },
    results: { width: '100%', gap: 14 },
    stateBox: { minHeight: 136, justifyContent: 'center', alignItems: 'center', gap: 12 },
    stateText: { color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 14 },
    loadingBall: {
      width: 19,
      height: 19,
      borderRadius: 10,
      backgroundColor: colors.accentText,
      borderWidth: 4,
      borderColor: colors.surfaceRaised,
    },
    errorBox: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.error },
    errorText: {
      color: colors.errorText,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    retryText: {
      color: colors.accentText,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '800',
    },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(2, 8, 5, 0.72)',
    },
    sheet: {
      width: '100%',
      maxHeight: '84%',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderTopWidth: 1,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
    },
    sheetHeading: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    sheetHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 16,
      backgroundColor: colors.border,
    },
    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sheetTitle: {
      color: colors.textPrimary,
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
    },
    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: { color: colors.textPrimary, fontSize: 28, lineHeight: 32 },
    sheetScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, gap: 20 },
    sheetFooter: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sheetFields: { gap: 20 },
    filterRow: { gap: 9 },
    filterLabel: {
      color: colors.textSecondary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '700',
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: 42,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 13,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipText: {
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '700',
    },
    areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    choice: {
      width: '48%',
      minHeight: 52,
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      paddingHorizontal: 8,
      backgroundColor: colors.background,
    },
    choiceText: {
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    filterInput: { flex: 1, minWidth: 145, gap: 8 },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 12,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
    },
    helperText: { color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13 },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    action: {
      flex: 1,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: 15,
      borderWidth: 1,
    },
    primaryAction: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    secondaryAction: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      flexGrow: 0,
      flexBasis: '28%',
    },
    actionText: {
      color: colors.primaryButtonText,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
