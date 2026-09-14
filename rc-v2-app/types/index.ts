// ─────────────────────────────────────────────────────────────────────────────
// Renewables Connect V2 — Core TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Media Types ────────────────────────────────────────────────────────────────

export interface ImageAsset {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
  caption?: string
  localSrc: string  // Local image path served from /public, or NEXT_PUBLIC_ASSET_BASE_URL + localSrc (e.g. /images/sm1/filename.jpg)
}

export interface Slug {
  _type: 'slug'
  current: string
}

// Content block types (Portable Text custom blocks)
export type ContentBlockType =
  | RichTextBlock
  | ImageBlock
  | VideoBlock
  | AudioBlock
  | CalloutBlock
  | ChartVisualization
  | GWPCardsBlock
  | QuizBlock
  | DividerBlock
  | ConfirmationQuizBlock
  | EnergySystemDiagramBlock
  | OffshoreWindArrayDiagramBlock
  | WindTurbineComponentsDiagramBlock
  | TurbineSizeComparisonBlock
  | OffshoreFoundationTypesDiagramBlock
  | FloatingWindTimelineDiagramBlock
  | GridIntegrationDiagramBlock
  | OffshoreVsOnshoreComparisonDiagramBlock
  | OnshoreWindPrinciplesDiagramBlock
  | NuclearReactorDiagramBlock
  | NuclearWasteClassificationDiagramBlock
  | SolarPVCellDiagramBlock
  | SolarPanelTypesDiagramBlock
  | SolarInverterTypesDiagramBlock
  | BiomassConversionPathwaysDiagramBlock
  | AnaerobicDigestionDiagramBlock
  | BECCSProcessDiagramBlock
  | PumpedStorageHydroDiagramBlock
  | HydropowerTypesDiagramBlock
  | GeothermalPlantTypesDiagramBlock
  | HydrogenColoursDiagramBlock
  | HydrogenFuelCellDiagramBlock
  | HydrogenLandscapeDiagramBlock
  | CarbonPriceTableDiagramBlock
  | LiquefiedCO2CarrierDiagramBlock
  | GlobalCCSMapBlock
  | NorthSeaMapBlock
  | WaveEnergyConversionDiagramBlock
  | TidalEnergyConversionDiagramBlock
  | MarineEnergyOpportunitiesDiagramBlock
  | PolicyFrameworksDiagramBlock
  | DispatchableVsNonDispatchableDiagramBlock
  | NacelleInternalDiagramBlock
  | TurbineBladeDiagramBlock
  | FixedFoundationTypesDiagramBlock
  | FixedFoundationInstallationDiagramBlock
  | FloatingPlatformTypesDiagramBlock
  | MooringSystemsDiagramBlock
  | AnchorTypesDiagramBlock
  | SubseaCableTypesDiagramBlock
  | SolarResourceMapDiagramBlock
  | GrovesFuelCellDiagramBlock
  | HydrogenVsEVDiagramBlock

export interface RichTextBlock {
  _type: 'richText'
  _key: string
  content: unknown[] // Portable Text array
}

export interface ImageBlock {
  _type: 'imageBlock'
  _key: string
  image: ImageAsset
  caption?: string
  fullWidth?: boolean
}

export interface VideoBlock {
  _type: 'videoBlock'
  _key: string
  title?: string
  azureBlobUrl: string
  posterUrl?: string
  captionsUrl?: string
}

export interface AudioBlock {
  _type: 'audioBlock'
  _key: string
  title?: string
  azureBlobUrl: string
}

export interface CalloutBlock {
  _type: 'calloutBlock'
  _key: string
  variant: 'info' | 'warning' | 'key-fact' | 'quote'
  title?: string
  body: string
}

export interface ChartDataset {
  label: string
  data: (number | null)[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  /** Dashed line pattern for Chart.js line series — e.g. [6, 3] = 6px dash, 3px gap */
  borderDash?: number[]
  /**
   * Chart.js fill target for line series:
   *   false = no fill
   *   true  = fill to x-axis (default for single-series line charts)
   *   0, 1… = fill to that dataset index (use for range/band charts)
   */
  fill?: boolean | number | string
}

export interface ChartVisualization {
  _type: 'chartVisualization'
  _key: string
  title: string
  description?: string
  type: 'doughnut' | 'bar' | 'horizontalBar' | 'line'
  stacked?: boolean
  labels: string[]
  datasets: ChartDataset[]
  source?: string
  sourceUrl?: string
  xAxisLabel?: string
  yAxisLabel?: string
  /**
   * Whether to show inline data-value labels (rcDataLabels plugin).
   * Defaults to true. Set false for multi-series line charts or band charts
   * where many data points would make labels unreadably dense.
   */
  showDataLabels?: boolean
}

export interface GWPCardsBlock {
  _type: 'gwpCardsBlock'
  _key: string
}

export interface QuizBlock {
  _type: 'quizBlock'
  _key: string
  questions: QuizQuestion[]
}

export interface DividerBlock {
  _type: 'dividerBlock'
  _key: string
}

export interface ConfirmationQuizBlock {
  _type: 'confirmationQuizBlock'
  _key: string
  subModuleSlug: string
  moduleId:      string
}

export interface EnergySystemDiagramBlock {
  _type: 'energySystemDiagram'
  _key: string
  variant: 'problem' | 'solution' | 'distribution'
  title: string
  caption?: string
}

export interface OffshoreWindArrayDiagramBlock {
  _type: 'offshoreWindArrayDiagram'
  _key: string
  title: string
  caption?: string
}

export interface WindTurbineComponentsDiagramBlock {
  _type: 'windTurbineComponentsDiagram'
  _key: string
  title: string
  caption?: string
}

export interface TurbineSizeComparisonBlock {
  _type: 'turbineSizeComparison'
  _key: string
  title: string
  caption?: string
}

export interface OffshoreFoundationTypesDiagramBlock {
  _type: 'offshoreFoundationTypesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface FloatingWindTimelineDiagramBlock {
  _type: 'floatingWindTimelineDiagram'
  _key: string
  title: string
  caption?: string
}

export interface GridIntegrationDiagramBlock {
  _type: 'gridIntegrationDiagram'
  _key: string
  title: string
  caption?: string
}

export interface OffshoreVsOnshoreComparisonDiagramBlock {
  _type: 'offshoreVsOnshoreComparisonDiagram'
  _key: string
  title: string
  caption?: string
}

export interface OnshoreWindPrinciplesDiagramBlock {
  _type: 'onshoreWindPrinciplesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface NuclearReactorDiagramBlock {
  _type: 'nuclearReactorDiagram'
  _key: string
  title: string
  caption?: string
}

export interface NuclearWasteClassificationDiagramBlock {
  _type: 'nuclearWasteClassificationDiagram'
  _key: string
  title: string
  caption?: string
}

export interface SolarPVCellDiagramBlock {
  _type: 'solarPVCellDiagram'
  _key: string
  title: string
  caption?: string
}

export interface SolarPanelTypesDiagramBlock {
  _type: 'solarPanelTypesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface SolarInverterTypesDiagramBlock {
  _type: 'solarInverterTypesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface BiomassConversionPathwaysDiagramBlock {
  _type: 'biomassConversionPathwaysDiagram'
  _key: string
  title: string
  caption?: string
}

export interface AnaerobicDigestionDiagramBlock {
  _type: 'anaerobicDigestionDiagram'
  _key: string
  title: string
  caption?: string
}

export interface BECCSProcessDiagramBlock {
  _type: 'beccsProcessDiagram'
  _key: string
  title: string
  caption?: string
}

export interface PumpedStorageHydroDiagramBlock {
  _type: 'pumpedStorageHydroDiagram'
  _key: string
  title: string
  caption?: string
}

export interface HydropowerTypesDiagramBlock {
  _type: 'hydropowerTypesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface GeothermalPlantTypesDiagramBlock {
  _type: 'geothermalPlantTypesDiagram'
  _key: string
  title: string
  caption?: string
}

export interface HydrogenColoursDiagramBlock {
  _type: 'hydrogenColoursDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface HydrogenFuelCellDiagramBlock {
  _type: 'hydrogenFuelCellDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface HydrogenLandscapeDiagramBlock {
  _type: 'hydrogenLandscapeDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface CarbonPriceTableDiagramBlock {
  _type: 'carbonPriceTableDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface LiquefiedCO2CarrierDiagramBlock {
  _type: 'liquefiedCO2CarrierDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface GlobalCCSMapBlock {
  _type: 'globalCCSMap'
  _key: string
  title?: string
  caption?: string
}

export interface NorthSeaMapBlock {
  _type: 'northSeaMap'
  _key: string
  title?: string
  caption?: string
}

export interface WaveEnergyConversionDiagramBlock {
  _type: 'waveEnergyConversionDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface TidalEnergyConversionDiagramBlock {
  _type: 'tidalEnergyConversionDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface MarineEnergyOpportunitiesDiagramBlock {
  _type: 'marineEnergyOpportunitiesDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface PolicyFrameworksDiagramBlock {
  _type: 'policyFrameworksDiagram'
  _key: string
  title?: string
  caption?: string
}

export interface DispatchableVsNonDispatchableDiagramBlock {
  _type: 'dispatchableVsNonDispatchableDiagram'
  _key: string
}

export interface NacelleInternalDiagramBlock {
  _type: 'nacelleInternalDiagram'
  _key: string
}

export interface TurbineBladeDiagramBlock {
  _type: 'turbineBladeDiagram'
  _key: string
}

export interface FixedFoundationTypesDiagramBlock {
  _type: 'fixedFoundationTypesDiagram'
  _key: string
}

export interface FixedFoundationInstallationDiagramBlock {
  _type: 'fixedFoundationInstallationDiagram'
  _key: string
}

export interface FloatingPlatformTypesDiagramBlock {
  _type: 'floatingPlatformTypesDiagram'
  _key: string
}

export interface MooringSystemsDiagramBlock {
  _type: 'mooringSystemsDiagram'
  _key: string
}

export interface AnchorTypesDiagramBlock {
  _type: 'anchorTypesDiagram'
  _key: string
}

export interface SubseaCableTypesDiagramBlock {
  _type: 'subseaCableTypesDiagram'
  _key: string
}

export interface SolarResourceMapDiagramBlock {
  _type: 'solarResourceMapDiagram'
  _key: string
}

export interface GrovesFuelCellDiagramBlock {
  _type: 'grovesFuelCellDiagram'
  _key: string
}

export interface HydrogenVsEVDiagramBlock {
  _type: 'hydrogenVsEVDiagram'
  _key: string
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  _id: string
  question: string
  options: string[]          // Always 4 options
  correctAnswerIndex: number // 0–3
  explanation: string        // Shown after answering
}

// ── Section ───────────────────────────────────────────────────────────────────

export interface Section {
  _id: string
  title: string
  slug: Slug
  estimatedMinutes: number
  content: ContentBlockType[]
}

// ── Sub-Module ────────────────────────────────────────────────────────────────

export interface SubModule {
  _id: string
  title: string
  slug: Slug
  orderIndex: number
  estimatedHours: number
  thumbnail?: ImageAsset
  learningObjectives: string[]
  sections: Section[]
  module: { _ref: string }
}

export interface SubModuleSummary {
  _id: string
  title: string
  slug: Slug
  orderIndex: number
  estimatedHours: number
  thumbnail?: ImageAsset
}

// ── Module ────────────────────────────────────────────────────────────────────

export type PartNumber = 1 | 2 | 3

export interface Module {
  _id: string
  title: string
  slug: Slug
  description: string
  part: PartNumber
  estimatedHours: number
  subModules: SubModuleSummary[]
}

// ── Progress (from Azure SQL via API) ─────────────────────────────────────────

export interface SectionProgress {
  sectionId: string
  completedAt: string
}

export interface SubModuleProgress {
  subModuleSlug: string
  percentageComplete: number
  sectionsCompleted: SectionProgress[]
  startedAt: string
  completedAt?: string
}

export interface UserProgress {
  userId: string
  subModules: SubModuleProgress[]
}

// ── Certificate ───────────────────────────────────────────────────────────────

export interface Certificate {
  id: string
  userId: string
  certificateType: 'Part 1' | 'Part 2' | 'Part 3' | 'Module 1'
  issuedAt: string
  pdfUrl: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RCUser {
  id: string           // Azure AD B2C object ID
  email: string
  displayName: string
  organisation?: string
}
