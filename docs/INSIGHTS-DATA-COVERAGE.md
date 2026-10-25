# Insights: what the backend holds that Insights does not yet show

Written 2026-10-25 (Lewis asked for a full analysis alongside the layout thinking). Three layers: (A) data already in the anonymised insights database but not drawn, (B) data in the main platform database that could be turned into anonymised aggregates, (C) shared reference data that needs no anonymising. Every aggregate keeps the rule: at least five organisations behind any figure, and nothing identifying unless the organisation consented (`shareIdentityWithUniverse`).

**Correction to my earlier message:** I said logistics rows are not tracked by month. They are: `aggregated_logistics_metrics.effectiveMonth` exists and is filled by the ETL. The queries simply never use it, so logistics trends over time are available without new data work.

## A. Already in the insights database, not yet shown

### Prices (`aggregated_product_prices`)
| Stored | Shown today | Not shown |
|---|---|---|
| category, unitPrice, currency, effectiveMonth | trend per group (average, lowest, highest), one currency at a time | price index across all groups; volatility; month-on-month change; which groups are rising or falling |
| manufactureRegion, destinationRegion, incoterm | three separate breakdowns | any two together (made in X, delivered to Y); region grid |
| freightMode | nothing | price by transport mode; air premium on price |
| quantity, unitOfSupply | nothing | price against order size (volume discounts); typical order sizes |
| attributes (spec snapshot) | nothing | price by specification (strength, pack, etc.) |
| sourceHash | count of organisations per figure | depth of market (organisations per group over time) |
| currency | prices never converted | one-currency view using `ExchangeRateSnapshot`; currency mix |

### Logistics (`aggregated_logistics_metrics`)
| Stored | Shown today | Not shown |
|---|---|---|
| manufacture and destination country, mode, incoterm, commodity group | routes, mode tiles, map, filters | commodity by mode grid; incoterm by mode; country-to-country matrix |
| distanceKm | average distance, route rows | distance bands; distance against CO2; longest and shortest corridors |
| co2TotalKg, co2FactorKgPerTonneKm | averages | CO2 by commodity; factor comparison by mode; total CO2 (not just average) |
| durationDays | one line per route | speed against CO2; lead-time bands; slowest corridors |
| efficiencyScore, scoreBand | average and band on tiles | distribution of scores; share of shipments per band; worst and best commodity |
| effectiveMonth | not used at all | efficiency, CO2, mode mix and volume over time; seasonality |
| shown rows | first 50 routes only | full paged table and export of the aggregate |

### Sourcing (`aggregated_product_sourcing`)
| Stored | Shown today | Not shown |
|---|---|---|
| category, country, approvals | map and table by country, one group at a time | country by group grid; concentration (share held by the top country); number of countries per group (supply risk); groups with a single dominant source |
| (no month stored) | nothing | trend would need a month column added to the ETL |

### Stakeholder ratings (from `getStakeholderRatingSummary`)
Shown as four averages. Not shown: spread of ratings (how many poor, fair, good, excellent), change over time, rating by country.

## B. In the main platform database: candidates for new anonymised aggregates

Each needs a small ETL table in the insights database, the same hashing and five-organisation floor, and (where it touches an organisation's own activity) the existing consent.

| Area | Source models | Insight it would give | Slice |
|---|---|---|---|
| Tender market | Tender, TenderLine, TenderBid, TenderAward, TenderParticipation | tenders per month, bids per tender (competition), time to award, award value bands, which product groups and regions tender most, share of tenders with a single bidder | 3 |
| Frameworks and contracts | TenderContract, TenderCallOff, TenderPriceReview, TenderContractVariation | call-off volume, price-review outcomes (accepted, rejected), variation rates, contract duration | 3 |
| Supplier landscape | SupplierProfile, ManufacturerProfile, OrganizationScope, OrganizationCertification, SupplierCountryPresence | counts by role, country and certification (WHO prequalification, GMP, ISO); countries with thin supplier choice. Directory profiles are identifiable by design, so these are counts, not names, unless an organisation consented | 4 |
| Supplier performance | TenderPerformanceRecord, QualityScorecardSettings, quality scorecards | on-time-in-full, quality and response scores by country and product group (anonymised bands) | 4 |
| Quality complaints | QualityComplaint, actions, events | complaint types, severity, time to close by product group; share escalated to a regulator | 4 |
| Procurement cycle time | Project, ProjectStatusHistory | how long each stage takes (identification to award to delivery); seasonality of orders | 4 |
| Delivery performance | ProjectLine, batches | delivered on time and in full; lateness by corridor and mode | 4 |
| Cold chain | ProductBatch, BatchTemperatureLog | temperature excursions by mode and corridor; share of batches with an excursion | 4 |
| Catalogue health | ProductMaster, ProductIdentifier, ProductFamily | products per group; completeness of GTIN, HS, UNSPSC; growth over time | later |
| Currency | ExchangeRateSnapshot | converted prices and currency mix | with prices |

## C. Shared reference data that needs no anonymising

| Data | Source models | Insight |
|---|---|---|
| Regulatory registrations | ProductRegulatoryRegistration | registered products by authority (stringent regulators, WHO), by group and country |
| Safety notices and recalls | ProductSafetyNotice, RegulatoryWatchItem, RegulatoryWatchMatch | notices per month by source, severity and group; products flagged |
| Export restrictions | ExportRestriction | countries with restrictions, by product class; links to the Geographies map |
| Pharmaceutical reference | PharmaReference, ProductPharmaLink | essential-medicine coverage |
| Countries and regions | Country, Region | already used for the map; regional rollups |

## D. What I would build first

1. **Quick wins with no new data** (Geographies, Modes, Commodities, Distances lenses): everything in section A for logistics and sourcing, plus price by freight mode and quantity, region grids, and logistics over time.
2. **Prices upgrade:** index across groups, month-on-month change, order-size view, optional single currency.
3. **Section C layers on the map:** export restrictions, regulatory coverage and safety notices as toggles on the shared map.
4. **Slice 3 and 4 aggregates** from section B, tender market first.

Privacy note for every new aggregate: counts and averages only, a figure is hidden below five organisations, free text never stored, and any view that names an organisation is shown only for organisations that consented.
