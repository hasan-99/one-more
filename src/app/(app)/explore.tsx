import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Rise, useEntrance, useLoop } from '@/components/motion';
import { SegmentedControl } from '@/components/segmented-control';
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
import { translations, type Locale } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';
import { bodyFont, displayFont } from '@/theme/typography';

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

const formatOptions = [null, 5, 7, 8, 11] as const;

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
      priceMaximum: invalidPrice ? null : parsedPrice,
      dateFrom: dateRange?.from ?? '',
      dateThrough: dateRange?.through ?? '',
    }),
    [filters, invalidPrice, parsedPrice, dateRange],
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
  const moreFilterCount =
    Number(Boolean(filters.cityId)) +
    Number(filters.minimumFreeSpots !== null) +
    Number(Boolean(priceText)) +
    Number(Boolean(filters.dateFrom || filters.dateThrough)) +
    Number(Boolean(filters.skillLevel));
  const anyActive = moreFilterCount > 0 || Boolean(filters.areaId) || filters.sideSize !== null;
  const styles = makeStyles(colors, locale);
  const areaName = (area: MatchArea) => (locale === 'el' ? area.name_el : area.name_en);
  const resultLabel =
    matches.length === 1
      ? copy.matchResultsSingle
      : copy.matchResultsCount.replace('{count}', String(matches.length));
  const showLabel = loading
    ? copy.matchShowGames
    : matches.length === 1
      ? copy.matchShowGamesSingle
      : copy.matchShowGamesCount.replace('{count}', String(matches.length));

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
  const update = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const visibleAreas = filterData?.areas.filter(
    (area) => !filters.cityId || area.city_id === filters.cityId,
  );
  const formatIndex = Math.max(
    0,
    formatOptions.findIndex((size) => size === filters.sideSize),
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Rise style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {copy.matchListTitleLead}
              <Text style={{ color: colors.accentText }}>{copy.matchListTitleAccent}</Text>
            </Text>
            <Text style={styles.description}>{copy.matchListIntro}</Text>
          </Rise>

          <Rise delay={100} style={styles.controls}>
            <SegmentedControl
              label={copy.matchFormat}
              index={formatIndex}
              options={formatOptions.map((size) => ({
                key: String(size),
                label: size === null ? copy.matchAllFormatsShort : `${size}v${size}`,
                onPress: () => update('sideSize', size),
              }))}
            />
            <View style={styles.selectorRow}>
              <PickerButton
                label={copy.matchArea}
                value={selectedArea ? areaName(selectedArea) : copy.matchAllAreas}
                set={Boolean(filters.areaId)}
                icon="pin"
                onPress={() => setSheet('area')}
              />
              <PickerButton
                label={copy.matchMoreFilters}
                value={
                  moreFilterCount
                    ? copy.matchFilterCount.replace('{count}', String(moreFilterCount))
                    : copy.matchNoFilters
                }
                set={moreFilterCount > 0}
                icon="sliders"
                onPress={() => setSheet('more')}
              />
            </View>
          </Rise>

          {filterError ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>{copy.matchFiltersLoadError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFilterAttempt((attempt) => attempt + 1)}
                style={styles.inlineButton}
              >
                <Text style={styles.linkText}>{copy.matchRetry}</Text>
              </Pressable>
            </View>
          ) : null}

          <Rise delay={180} style={styles.resultsHeader}>
            <View style={styles.resultCount}>
              <LiveDot color={colors.accentText} />
              <Text accessibilityLiveRegion="polite" style={styles.resultText}>
                {loading ? copy.matchLoading : resultLabel}
              </Text>
            </View>
            {anyActive ? (
              <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.inlineButton}>
                <Text style={styles.linkText}>{copy.matchClearFilters}</Text>
              </Pressable>
            ) : null}
          </Rise>

          {invalidQuery ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>
                {invalidDate ? copy.matchFilterDateInvalid : copy.matchFilterPriceInvalid}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet('more')}
                style={styles.inlineButton}
              >
                <Text style={styles.linkText}>{copy.matchMoreFilters}</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={copy.matchLoading}
              style={styles.stateBox}
            >
              <BouncingBall colors={colors} />
              <Text style={styles.stateText}>{copy.matchLoading}</Text>
            </View>
          ) : loadError && matches.length === 0 ? (
            <View accessibilityRole="alert" style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{copy.matchLoadError}</Text>
              <LimeButton
                label={copy.matchRetry}
                onPress={() => setSearchAttempt((attempt) => attempt + 1)}
              />
            </View>
          ) : matches.length === 0 ? (
            <Rise style={styles.emptyBox}>
              <BouncingBall colors={colors} />
              <Text style={styles.emptyTitle}>{copy.matchEmptyTitle}</Text>
              <Text style={styles.emptyCopy}>{copy.matchEmptyCopy}</Text>
              {anyActive ? <LimeButton label={copy.matchClearFilters} onPress={resetFilters} /> : null}
            </Rise>
          ) : (
            <View style={styles.results}>
              {matches.map((match, index) => (
                <MatchCard key={match.id} match={match} index={index} />
              ))}
              {loadError ? (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{copy.matchLoadError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadNextPage()}
                    style={styles.inlineButton}
                  >
                    <Text style={styles.linkText}>{copy.matchRetry}</Text>
                  </Pressable>
                </View>
              ) : null}
              {hasMore ? (
                <LimeButton
                  label={loadingMore ? copy.matchLoading : copy.matchLoadMore}
                  onPress={() => void loadNextPage()}
                  disabled={loadingMore}
                />
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <FilterSheet
        visible={sheet !== null}
        title={sheet === 'area' ? copy.matchChooseArea : copy.matchMoreFilters}
        onClose={() => setSheet(null)}
        footer={
          <View style={styles.sheetActions}>
            <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>{copy.matchClear}</Text>
            </Pressable>
            <View style={styles.flexOne}>
              <LimeButton
                label={showLabel}
                onPress={() => setSheet(null)}
                disabled={invalidQuery}
                tall
              />
            </View>
          </View>
        }
      >
        {sheet === 'area' ? (
          <OptionGrid label={copy.matchArea} columns={2}>
            <OptionButton
              label={copy.matchAllAreas}
              selected={!filters.areaId}
              onPress={() => {
                update('areaId', null);
                setSheet(null);
              }}
            />
            {visibleAreas?.map((area) => (
              <OptionButton
                key={area.id}
                label={areaName(area)}
                selected={filters.areaId === area.id}
                onPress={() => {
                  setFilters((current) => ({ ...current, areaId: area.id, cityId: area.city_id }));
                  setSheet(null);
                }}
              />
            ))}
            {visibleAreas?.length === 0 ? (
              <Text style={styles.helperText}>{copy.matchNoAreas}</Text>
            ) : null}
          </OptionGrid>
        ) : (
          <View style={styles.sheetFields}>
            {filterData ? (
              <FieldGroup title={copy.matchCity}>
                <OptionGrid label={copy.matchCity} columns={2}>
                  <OptionButton
                    label={copy.matchAllCities}
                    selected={!filters.cityId}
                    onPress={() =>
                      setFilters((current) => ({ ...current, cityId: null, areaId: null }))
                    }
                  />
                  {filterData.cities.map((city) => (
                    <OptionButton
                      key={city.id}
                      label={locale === 'el' ? city.name_el : city.name_en}
                      selected={filters.cityId === city.id}
                      onPress={() =>
                        setFilters((current) => ({ ...current, cityId: city.id, areaId: null }))
                      }
                    />
                  ))}
                </OptionGrid>
              </FieldGroup>
            ) : null}
            <FieldGroup title={copy.matchMinimumOpenSpots}>
              <OptionGrid label={copy.matchMinimumOpenSpots} columns={3}>
                {[
                  { count: null, label: copy.matchAnySpots },
                  { count: 2, label: copy.matchTwoSpots },
                  { count: 4, label: copy.matchFourSpots },
                ].map(({ count, label }) => (
                  <OptionButton
                    key={label}
                    third
                    label={label}
                    selected={filters.minimumFreeSpots === count}
                    onPress={() => update('minimumFreeSpots', count)}
                  />
                ))}
              </OptionGrid>
            </FieldGroup>
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
                onChangeText={(dateFrom) => update('dateFrom', dateFrom)}
                placeholder="YYYY-MM-DD"
                error={invalidDate}
              />
            </View>
            <View style={styles.inputGrid}>
              <FilterInput
                label={copy.matchDateThrough}
                value={filters.dateThrough}
                onChangeText={(dateThrough) => update('dateThrough', dateThrough)}
                placeholder="YYYY-MM-DD"
                error={invalidDate}
              />
              <View style={styles.flexOne} />
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
            <FieldGroup title={copy.matchSkill}>
              <OptionGrid label={copy.matchSkill} columns={2}>
                <OptionButton
                  label={copy.matchAllLevels}
                  selected={!filters.skillLevel}
                  onPress={() => update('skillLevel', null)}
                />
                {(
                  [
                    ['beginner', copy.profileBeginner],
                    ['intermediate', copy.profileIntermediate],
                    ['advanced', copy.profileAdvanced],
                  ] as const
                ).map(([level, label]) => (
                  <OptionButton
                    key={level}
                    label={label}
                    selected={filters.skillLevel === level}
                    onPress={() => update('skillLevel', level)}
                  />
                ))}
              </OptionGrid>
            </FieldGroup>
          </View>
        )}
      </FilterSheet>
    </View>
  );
}

function PickerButton({
  label,
  value,
  set,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  set: boolean;
  icon: 'pin' | 'sliders';
  onPress: () => void;
}) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.picker,
        set && { borderColor: colors.accentText, backgroundColor: 'rgba(207,255,74,0.07)' },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        {icon === 'pin' ? (
          <>
            <Path
              d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z"
              stroke={colors.accentText}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx="12" cy="9.5" r="2.5" stroke={colors.accentText} strokeWidth={2} />
          </>
        ) : (
          <>
            <Path
              d="M4 7h10M18 7h2M4 17h2M10 17h10"
              stroke={colors.accentText}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Circle cx="16" cy="7" r="2" stroke={colors.accentText} strokeWidth={2} />
            <Circle cx="8" cy="17" r="2" stroke={colors.accentText} strokeWidth={2} />
          </>
        )}
      </Svg>
      <View style={styles.pickerCopy}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.pickerValue}>
          {value}
        </Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9l6 6 6-6"
          stroke={colors.textSecondary}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function LiveDot({ color }: { color: string }) {
  const blink = useLoop(800, { alternate: true });
  return (
    <Animated.View
      accessibilityElementsHidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }),
      }}
    />
  );
}

/** Bouncing ball with its squashing floor shadow (`.ap-ball` / `.ap-shadow`). */
function BouncingBall({ colors }: { colors: ThemeColors }) {
  const bounce = useLoop(1100, { alternate: true, easing: Easing.bezier(0.5, 0, 0.5, 1) });
  return (
    <View accessibilityElementsHidden style={ballStyles.wrap}>
      <Animated.View
        style={[
          ballStyles.ball,
          {
            backgroundColor: colors.textPrimary,
            borderColor: colors.background,
            transform: [
              { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) },
            ],
          },
        ]}
      >
        <View style={ballStyles.ballShade} />
      </Animated.View>
      <Animated.View
        style={[
          ballStyles.shadow,
          {
            opacity: bounce.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
            transform: [{ scaleX: bounce.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          },
        ]}
      />
    </View>
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
  const styles = makeStyles(colors, locale);
  const copy = translations[locale];
  const dim = useEntrance(250, 0, Easing.ease, visible);
  const slide = useEntrance(400, 0, Easing.bezier(0.2, 0.9, 0.2, 1), visible);
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.scrim, { opacity: dim }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.matchDismissOverlay}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="dialog"
          accessibilityLabel={title}
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
              ],
            },
          ]}
        >
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
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 6l12 12M18 6L6 18"
                  stroke={colors.textPrimary}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            {children}
          </ScrollView>
          {footer}
        </Animated.View>
      </View>
    </Modal>
  );
}

function FieldGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{title}</Text>
      {children}
    </View>
  );
}

function OptionGrid({
  label,
  columns,
  children,
}: PropsWithChildren<{ label: string; columns: 2 | 3 }>) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.optionGrid, columns === 3 && styles.optionGridThree]}
    >
      {children}
    </View>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
  third = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  third?: boolean;
}) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        third && styles.optionThird,
        selected && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.optionText, selected && { color: colors.primaryButtonText }]}
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
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.filterInput}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            borderColor: error ? colors.errorText : focused ? colors.accentText : colors.optionBorder,
          },
          focused && styles.inputFocused,
        ]}
      />
    </View>
  );
}

function LimeButton({
  label,
  onPress,
  disabled = false,
  tall = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tall?: boolean;
}) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.limeButton,
        tall && styles.limeButtonTall,
        { opacity: disabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text style={[styles.limeButtonText, tall && { fontSize: 17 }]}>{label}</Text>
    </Pressable>
  );
}

const ballStyles = StyleSheet.create({
  wrap: { height: 56, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  ball: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, overflow: 'hidden' },
  ballShade: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  shadow: { width: 30, height: 6, borderRadius: 15, backgroundColor: '#000000' },
});

function makeStyles(colors: ThemeColors, locale: Locale) {
  const body = bodyFont(locale);
  const semibold = bodyFont(locale, 'semibold');
  const medium = bodyFont(locale, 'medium');
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    page: { flexGrow: 1, alignItems: 'center' },
    content: {
      width: '100%',
      maxWidth: 680,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 28,
      gap: 16,
    },
    heading: { gap: 8 },
    title: {
      color: colors.textPrimary,
      fontFamily: displayFont(locale),
      fontSize: locale === 'el' ? 36 : 42,
      lineHeight: locale === 'el' ? 40 : 41,
      fontWeight: '800',
    },
    description: { color: colors.textSecondary, fontFamily: body, fontSize: 15, lineHeight: 22 },
    controls: { gap: 10 },
    selectorRow: { flexDirection: 'row', gap: 10 },
    picker: {
      flex: 1,
      minWidth: 0,
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.well,
    },
    pickerCopy: { flex: 1, minWidth: 0, gap: 1 },
    pickerLabel: { color: colors.textSecondary, fontFamily: medium, fontSize: 12, fontWeight: '500' },
    pickerValue: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    resultsHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    resultCount: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    resultText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    inlineButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    linkText: { color: colors.accentText, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    results: { width: '100%', gap: 12 },
    stateBox: { minHeight: 150, justifyContent: 'center', alignItems: 'center', gap: 12 },
    stateText: { color: colors.textSecondary, fontFamily: body, fontSize: 15 },
    emptyBox: {
      borderRadius: 22,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.optionBorder,
      paddingVertical: 28,
      paddingHorizontal: 18,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontFamily: displayFont(locale),
      fontSize: locale === 'el' ? 22 : 26,
      lineHeight: locale === 'el' ? 27 : 27,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptyCopy: { color: colors.textSecondary, fontFamily: body, fontSize: 15, textAlign: 'center' },
    errorBox: { gap: 4, padding: 14, borderRadius: 14, backgroundColor: colors.error },
    errorText: { color: colors.errorText, fontFamily: body, fontSize: 14, lineHeight: 20 },
    helperText: { color: colors.textSecondary, fontFamily: body, fontSize: 14 },
    modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
    scrim: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(5, 8, 6, 0.7)',
    },
    sheet: {
      width: '100%',
      maxWidth: 680,
      maxHeight: '88%',
      backgroundColor: colors.surface === '#FFFFFF' ? colors.surface : '#131D17',
      borderColor: colors.optionBorder,
      borderTopWidth: 1.5,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom: 20,
      gap: 16,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      alignSelf: 'center',
      backgroundColor: colors.borderStrong,
    },
    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sheetTitle: {
      flexShrink: 1,
      color: colors.textPrimary,
      fontFamily: displayFont(locale),
      fontSize: locale === 'el' ? 24 : 28,
      lineHeight: 30,
      fontWeight: '800',
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetScroll: { gap: 16 },
    sheetFields: { gap: 16 },
    fieldGroup: { gap: 8 },
    fieldLabel: { color: colors.textSecondary, fontFamily: semibold, fontSize: 14, fontWeight: '600' },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionGridThree: {},
    optionThird: { flexBasis: '28%' },
    option: {
      flexGrow: 1,
      flexBasis: '40%',
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
    },
    optionText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    inputGrid: { flexDirection: 'row', gap: 8 },
    filterInput: { flex: 1, minWidth: 0, gap: 8 },
    input: {
      height: 48,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      backgroundColor: colors.option,
      fontFamily: body,
      fontSize: 16,
    },
    inputFocused: { shadowColor: colors.primaryButton, shadowOpacity: 0.35, shadowRadius: 4 },
    sheetActions: { flexDirection: 'row', gap: 8 },
    flexOne: { flex: 1 },
    ghostButton: {
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostButtonText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16, fontWeight: '600' },
    limeButton: {
      height: 46,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      backgroundColor: colors.primaryButton,
    },
    limeButtonTall: { height: 52, borderRadius: 16 },
    limeButtonText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
