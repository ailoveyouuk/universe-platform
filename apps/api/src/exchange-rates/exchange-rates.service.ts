import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@universe/db";

/**
 * Daily FX conversion for ProjectLine pricing -- see ExchangeRateSnapshot's
 * and ProjectLine's "Currency conversion" doc comments in schema.prisma.
 *
 * Lewis's direction (2026-10-02): a product's price, entered in its own
 * native currency, needs a converted-and-LOCKED equivalent in Unimed's
 * reporting currency, using the FX rate for the day the price was
 * entered -- never re-fluctuating with a later day's rate. "Daily interval"
 * doesn't require a literal cron job here: a rate is a fact about a
 * calendar date, so fetching it lazily the first time that date is needed
 * and caching it in ExchangeRateSnapshot (unique on date+base) gives the
 * same one-fetch-per-day behaviour a scheduled job would, without a new
 * dependency. (Also pragmatic: this sandbox's local npm registry access is
 * blocked by the org's egress policy, confirmed 2026-10-02 -- `npm install
 * @nestjs/schedule` 403'd -- so a cron-module dependency wasn't installable
 * here even if we wanted one.)
 *
 * Data source: Frankfurter (frankfurter.app) -- free, no API key, ECB daily
 * reference rates, supports historical date lookups. Chosen per Lewis's
 * "a free/open exchange-rate API" direction. Known limitation: ECB only
 * publishes rates for ~30 major currencies (not every currency Unimed's
 * supply chain might touch) -- convertToReportingCcy() degrades gracefully
 * (returns nulls, logs a warning) rather than failing the whole line save
 * when a currency isn't covered, so entering the native price always
 * works even when the converted figure can't be computed.
 */
@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  /** Unimed's reporting/dashboard currency -- hardcoded for now (Unimed is
   * UK-based). Stored on each ProjectLine as reportingCurrencyCode at the
   * point of conversion (not just assumed) so this could become
   * per-organization later without reinterpreting already-locked rows. */
  static readonly REPORTING_CURRENCY = "GBP";

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
   * given date, for REPORTING_CURRENCY as base. Returns null -- never
   * throws -- if Frankfurter is unreachable or returns something
   * unexpected, so a price save never fails just because the FX feed had
   * a bad moment; callers treat null as "conversion unavailable right
   * now" and leave the reporting-currency fields unset. */
  async getSnapshotForDate(rawDate: Date): Promise<{ id: string; date: Date; rates: Record<string, number> } | null> {
    const date = this.toCalendarDate(rawDate);
    const base = ExchangeRatesService.REPORTING_CURRENCY;

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
   * REPORTING_CURRENCY, locked to the rate for `asOfDate` (normally "now" --
   * the date the price was entered/changed). Returns null fields (not a
   * thrown error) when the currency isn't covered by the snapshot or the
   * snapshot itself couldn't be fetched, so the caller can still save the
   * native-currency price regardless.
   */
  async convertToReportingCcy(
    nativeUnitAmount: number,
    nativeTotalAmount: number,
    nativeCurrency: string,
    asOfDate: Date,
  ): Promise<{
    reportingCurrencyCode: string;
    lockedAt: Date;
    exchangeRateSnapshotId: string | null;
    unitReportingCcy: number | null;
    totalReportingCcy: number | null;
  }> {
    const reportingCurrencyCode = ExchangeRatesService.REPORTING_CURRENCY;
    const lockedAt = new Date();
    const currency = nativeCurrency.toUpperCase();

    // Already in the reporting currency -- no snapshot needed, factor is
    // exactly 1 by definition.
    if (currency === reportingCurrencyCode) {
      return {
        reportingCurrencyCode,
        lockedAt,
        exchangeRateSnapshotId: null,
        unitReportingCcy: nativeUnitAmount,
        totalReportingCcy: nativeTotalAmount,
      };
    }

    const snapshot = await this.getSnapshotForDate(asOfDate);
    const rate = snapshot?.rates[currency];
    if (!snapshot || !rate) {
      if (snapshot && !rate) {
        this.logger.warn(`No Frankfurter rate for currency ${currency} (reporting ccy ${reportingCurrencyCode}) -- leaving line's converted amounts unset.`);
      }
      return { reportingCurrencyCode, lockedAt, exchangeRateSnapshotId: snapshot?.id ?? null, unitReportingCcy: null, totalReportingCcy: null };
    }

    // snapshot.rates maps currencyCode -> units of currencyCode per 1 unit
    // of reportingCurrencyCode (Frankfurter's `?from=<reportingCcy>` shape),
    // so converting FROM that currency TO the reporting currency divides.
    return {
      reportingCurrencyCode,
      lockedAt,
      exchangeRateSnapshotId: snapshot.id,
      unitReportingCcy: round2(nativeUnitAmount / rate),
      totalReportingCcy: round2(nativeTotalAmount / rate),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
