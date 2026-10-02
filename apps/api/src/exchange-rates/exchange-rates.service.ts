import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@universe/db";

/**
 * Daily FX conversion for pricing across the platform -- see
 * ExchangeRateSnapshot's and ProjectLine's "Currency conversion" doc
 * comments in schema.prisma.
 *
 * IMPORTANT -- generalized 2026-10-03: Universe is a global, multi-tenant
 * platform, not built around any one organisation's home currency. An
 * earlier pass of this feature hardcoded "GBP" as the reporting currency
 * because the build happened to be working with Unimed at the time --
 * corrected directly by Lewis: that doesn't belong in a currency-agnostic
 * platform. DEFAULT_BASE_CURRENCY below is a neutral internal computation
 * currency (every native-currency price is converted into it and locked,
 * so multi-currency lines can be summed at all), NOT a reporting currency
 * tied to any organisation -- the viewer-facing currency is a separate,
 * dynamic SELECTOR (see convertFromBase() below) that re-expresses an
 * already-computed base-currency total into whatever currency the viewer
 * picks, live, with no locking (it's a display lens, not a historical
 * record). "USD" is used as the default base purely because it's the most
 * universally liquid/supported reference currency for a global FX feed --
 * not a reporting-currency choice for any tenant. Worth revisiting later
 * if a genuinely per-organization base currency is wanted; not built here,
 * since nothing in the current request asked for per-org configurability.
 *
 * "Daily interval" doesn't require a literal cron job here: a rate is a
 * fact about a calendar date, so fetching it lazily the first time that
 * date is needed and caching it in ExchangeRateSnapshot (unique on
 * date+base) gives the same one-fetch-per-day behaviour a scheduled job
 * would, without a new dependency. (Also pragmatic: this sandbox's local
 * npm registry access is blocked by the org's egress policy, confirmed
 * 2026-10-02 -- `npm install @nestjs/schedule` 403'd -- so a cron-module
 * dependency wasn't installable here even if we wanted one.)
 *
 * Data source: Frankfurter (frankfurter.app) -- free, no API key, ECB
 * daily reference rates, supports historical date lookups. Known
 * limitation: ECB only publishes rates for ~30 major currencies (see
 * SUPPORTED_CURRENCIES in packages/types) -- not every currency in the
 * world. Both convertToBaseCcy() and convertFromBase() degrade gracefully
 * (return nulls, log a warning) rather than failing the whole request when
 * a currency isn't covered, so entering/viewing a native price always
 * works even when the converted figure can't be computed.
 */
@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  /** Neutral internal computation/aggregation currency -- see the class
   * doc comment above for why this is NOT a reporting currency tied to any
   * one organisation. Stored on each ProjectLine as reportingCurrencyCode
   * at the point of conversion (not just assumed) so this could change
   * later without reinterpreting already-locked rows. */
  static readonly DEFAULT_BASE_CURRENCY = "USD";

  private readonly FRANKFURTER_BASE_URL = "https://api.frankfurter.app";

  /** Normalizes any Date to a UTC midnight Date carrying just the calendar
   * date -- matches the @db.Date column (time-of-day is meaningless for an
   * FX snapshot and would otherwise fragment the cache key across
   * timezones). */
  private toCalendarDate(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private formatDateParam(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Fetches (from cache, else Frankfurter) the rate snapshot covering the
   * given date, for DEFAULT_BASE_CURRENCY as base. Returns null -- never
   * throws -- if Frankfurter is unreachable or returns something
   * unexpected, so a price save/view never fails just because the FX feed
   * had a bad moment; callers treat null as "conversion unavailable right
   * now". */
  async getSnapshotForDate(rawDate: Date): Promise<{ id: string; date: Date; rates: Record<string, number> } | null> {
    const date = this.toCalendarDate(rawDate);
    const base = ExchangeRatesService.DEFAULT_BASE_CURRENCY;

    const cached = await prisma.exchangeRateSnapshot.findUnique({
      where: { date_baseCurrencyCode: { date, baseCurrencyCode: base } },
    });
    if (cached) {
      return { id: cached.id, date: cached.date, rates: JSON.parse(cached.ratesJson) as Record<string, number> };
    }

    try {
      const dateParam = this.formatDateParam(date);
      const res = await fetch(`${this.FRANKFURTER_BASE_URL}/${dateParam}?from=${base}`);
      if (!res.ok) {
        this.logger.warn(`Frankfurter returned HTTP ${res.status} for ${dateParam} (base ${base})`);
        return null;
      }
      const body = (await res.json()) as { date: string; rates: Record<string, number> };
      // Frankfurter returns the nearest prior business day's rates if the
      // requested date had none published (weekend/holiday) -- store the
      // date IT reports, not the one we asked for, so this row always
      // represents a real published rate.
      const actualDate = this.toCalendarDate(new Date(`${body.date}T00:00:00Z`));
      const ratesJson = JSON.stringify(body.rates);

      const snapshot = await prisma.exchangeRateSnapshot.upsert({
        where: { date_baseCurrencyCode: { date: actualDate, baseCurrencyCode: base } },
        create: { date: actualDate, baseCurrencyCode: base, ratesJson, source: "frankfurter" },
        update: {},
      });
      return { id: snapshot.id, date: snapshot.date, rates: JSON.parse(snapshot.ratesJson) as Record<string, number> };
    } catch (err) {
      this.logger.warn(`Failed to fetch exchange rate snapshot: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Converts a unit price + its native-currency total into
   * DEFAULT_BASE_CURRENCY, locked to the rate for `asOfDate` (normally
   * "now" -- the date the price was entered/changed). Returns null fields
   * (not a thrown error) when the currency isn't covered by the snapshot
   * or the snapshot itself couldn't be fetched, so the caller can still
   * save the native-currency price regardless.
   */
  async convertToBaseCcy(
    nativeUnitAmount: number,
    nativeTotalAmount: number,
    nativeCurrency: string,
    asOfDate: Date,
  ): Promise<{
    baseCurrencyCode: string;
    lockedAt: Date;
    exchangeRateSnapshotId: string | null;
    unitInBase: number | null;
    totalInBase: number | null;
  }> {
    const baseCurrencyCode = ExchangeRatesService.DEFAULT_BASE_CURRENCY;
    const lockedAt = new Date();
    const currency = nativeCurrency.toUpperCase();

    // Already in the base currency -- no snapshot needed, factor is
    // exactly 1 by definition.
    if (currency === baseCurrencyCode) {
      return {
        baseCurrencyCode,
        lockedAt,
        exchangeRateSnapshotId: null,
        unitInBase: nativeUnitAmount,
        totalInBase: nativeTotalAmount,
      };
    }

    const snapshot = await this.getSnapshotForDate(asOfDate);
    const rate = snapshot?.rates[currency];
    if (!snapshot || !rate) {
      if (snapshot && !rate) {
        this.logger.warn(`No Frankfurter rate for currency ${currency} (base ccy ${baseCurrencyCode}) -- leaving this amount's converted figures unset.`);
      }
      return { baseCurrencyCode, lockedAt, exchangeRateSnapshotId: snapshot?.id ?? null, unitInBase: null, totalInBase: null };
    }

    // snapshot.rates maps currencyCode -> units of currencyCode per 1 unit
    // of baseCurrencyCode (Frankfurter's `?from=<base>` shape), so
    // converting FROM that currency TO the base currency divides.
    return {
      baseCurrencyCode,
      lockedAt,
      exchangeRateSnapshotId: snapshot.id,
      unitInBase: round2(nativeUnitAmount / rate),
      totalInBase: round2(nativeTotalAmount / rate),
    };
  }

  /**
   * LIVE (never locked) conversion of an already-base-currency amount into
   * whatever currency a viewer picks -- the mechanism behind the currency
   * SELECTOR on the dashboard and per-project financial summaries. Always
   * uses the rate for `asOfDate` (callers pass "now" for a live view),
   * since this is a display preference, not a fact to preserve. Returns
   * null (not a thrown error) if the target currency isn't covered or the
   * snapshot can't be fetched.
   */
  async convertFromBase(amountInBase: number, targetCurrency: string, asOfDate: Date): Promise<number | null> {
    const target = targetCurrency.toUpperCase();
    if (target === ExchangeRatesService.DEFAULT_BASE_CURRENCY) return round2(amountInBase);

    const snapshot = await this.getSnapshotForDate(asOfDate);
    const rate = snapshot?.rates[target];
    if (!snapshot || !rate) {
      if (snapshot && !rate) {
        this.logger.warn(`No Frankfurter rate for currency ${target} -- can't convert from base for display.`);
      }
      return null;
    }
    return round2(amountInBase * rate);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
