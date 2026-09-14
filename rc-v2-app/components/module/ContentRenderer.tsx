import { PortableText } from '@portabletext/react'
import Image from 'next/image'
import { Reveal } from '../motion/Reveal'
import { CalloutBlock }     from './blocks/CalloutBlock'
import { VideoBlock }       from './blocks/VideoBlock'
import { AudioBlock }       from './blocks/AudioBlock'
import { QuizBlock }        from './blocks/QuizBlock'
import { ChartVisualization } from './blocks/ChartVisualization'
import { EnergySystemDiagram }          from './blocks/EnergySystemDiagram'
import { OffshoreWindArrayDiagram }     from './blocks/OffshoreWindArrayDiagram'
import { WindTurbineComponentsDiagram } from './blocks/WindTurbineComponentsDiagram'
import { TurbineSizeComparison }        from './blocks/TurbineSizeComparison'
import { OffshoreFoundationTypesDiagram } from './blocks/OffshoreFoundationTypesDiagram'
import { FloatingWindTimelineDiagram }    from './blocks/FloatingWindTimelineDiagram'
import { GridIntegrationDiagram }               from './blocks/GridIntegrationDiagram'
import { OffshoreVsOnshoreComparisonDiagram }   from './blocks/OffshoreVsOnshoreComparisonDiagram'
import { OnshoreWindPrinciplesDiagram }           from './blocks/OnshoreWindPrinciplesDiagram'
import { NuclearReactorDiagram }                 from './blocks/NuclearReactorDiagram'
import { NuclearWasteClassificationDiagram }     from './blocks/NuclearWasteClassificationDiagram'
import { SolarPVCellDiagram }                    from './blocks/SolarPVCellDiagram'
import { SolarPanelTypesDiagram }                from './blocks/SolarPanelTypesDiagram'
import { SolarInverterTypesDiagram }             from './blocks/SolarInverterTypesDiagram'
import { BiomassConversionPathwaysDiagram }      from './blocks/BiomassConversionPathwaysDiagram'
import { AnaerobicDigestionDiagram }             from './blocks/AnaerobicDigestionDiagram'
import { BECCSProcessDiagram }                   from './blocks/BECCSProcessDiagram'
import { PumpedStorageHydroDiagram }             from './blocks/PumpedStorageHydroDiagram'
import { HydropowerTypesDiagram }                from './blocks/HydropowerTypesDiagram'
import { GeothermalPlantTypesDiagram }           from './blocks/GeothermalPlantTypesDiagram'
import { HydrogenColoursDiagram }               from './blocks/HydrogenColoursDiagram'
import { HydrogenFuelCellDiagram }              from './blocks/HydrogenFuelCellDiagram'
import { HydrogenLandscapeDiagram }             from './blocks/HydrogenLandscapeDiagram'
import { CarbonPriceTableDiagram }              from './blocks/CarbonPriceTableDiagram'
import { LiquefiedCO2CarrierDiagram }           from './blocks/LiquefiedCO2CarrierDiagram'
import { GlobalCCSMap }                          from './blocks/GlobalCCSMap'
import { NorthSeaMap }                           from './blocks/NorthSeaMap'
import { WaveEnergyConversionDiagram }           from './blocks/WaveEnergyConversionDiagram'
import { TidalEnergyConversionDiagram }          from './blocks/TidalEnergyConversionDiagram'
import { MarineEnergyOpportunitiesDiagram }      from './blocks/MarineEnergyOpportunitiesDiagram'
import { PolicyFrameworksDiagram }               from './blocks/PolicyFrameworksDiagram'
import { DispatchableVsNonDispatchableDiagram }  from './blocks/DispatchableVsNonDispatchableDiagram'
import { NacelleInternalDiagram }               from './blocks/NacelleInternalDiagram'
import { TurbineBladeDiagram }                  from './blocks/TurbineBladeDiagram'
import { FixedFoundationTypesDiagram }          from './blocks/FixedFoundationTypesDiagram'
import { FixedFoundationInstallationDiagram }   from './blocks/FixedFoundationInstallationDiagram'
import { FloatingPlatformTypesDiagram }         from './blocks/FloatingPlatformTypesDiagram'
import MooringSystemsDiagram                    from './blocks/MooringSystemsDiagram'
import AnchorTypesDiagram                       from './blocks/AnchorTypesDiagram'
import SubseaCableTypesDiagram                  from './blocks/SubseaCableTypesDiagram'
import SolarResourceMapDiagram                  from './blocks/SolarResourceMapDiagram'
import GrovesFuelCellDiagram                    from './blocks/GrovesFuelCellDiagram'
import HydrogenVsEVDiagram                      from './blocks/HydrogenVsEVDiagram'
import { GWPCards }         from './blocks/GWPCards'
import { ConfirmationQuiz } from './ConfirmationQuiz'
import { imageUrl }         from '@/lib/media'
import type { ContentBlockType, ImageAsset } from '@/types'

// Lazy-import quiz data only when needed (keeps bundle clean)
import { sm1ColQuestions }  from '@/content/sm1-quiz'
import { sm2ColQuestions }  from '@/content/sm2-quiz'
import { sm3ColQuestions }  from '@/content/sm3-quiz'
import { sm4ColQuestions }  from '@/content/sm4-quiz'
import { sm5ColQuestions }  from '@/content/sm5-quiz'
import { sm6ColQuestions }  from '@/content/sm6-quiz'
import { sm7ColQuestions }  from '@/content/sm7-quiz'
import { sm8ColQuestions }  from '@/content/sm8-quiz'
import { sm9ColQuestions }  from '@/content/sm9-quiz'
import { sm10ColQuestions } from '@/content/sm10-quiz'
import { sm11ColQuestions } from '@/content/sm11-quiz'
import { sm12ColQuestions } from '@/content/sm12-quiz'
import { sm13ColQuestions } from '@/content/sm13-quiz'
import { sm14ColQuestions } from '@/content/sm14-quiz'
import { sm15ColQuestions } from '@/content/sm15-quiz'

const COL_QUESTIONS: Record<string, typeof sm1ColQuestions> = {
  'greenhouse-gas-emissions': sm1ColQuestions,
  'global-race-to-net-zero':  sm2ColQuestions,
  'energy-transition':        sm3ColQuestions,
  'fixed-offshore-wind':      sm4ColQuestions,
  'floating-offshore-wind':   sm5ColQuestions,
  'onshore-wind':             sm6ColQuestions,
  'nuclear':                  sm7ColQuestions,
  'solar':                    sm8ColQuestions,
  'biomass':                  sm9ColQuestions,
  'hydropower':               sm10ColQuestions,
  'hydrogen':                 sm11ColQuestions,
  'carbon-capture':           sm12ColQuestions,
  'wave-tidal':               sm13ColQuestions,
  'skills-roles':             sm14ColQuestions,
  'future-renewables':        sm15ColQuestions,
}

// ─────────────────────────────────────────────────────────────────────────────
// ContentRenderer — maps each content block type to its React component
// ─────────────────────────────────────────────────────────────────────────────

interface ContentRendererProps {
  blocks: ContentBlockType[]
}

function RichTextRenderer({ content }: { content: unknown[] }) {
  return (
    <div className="rc-content mb-6">
      <PortableText value={content as any} />
    </div>
  )
}

function ImageRenderer({ image, caption, fullWidth }: { image: ImageAsset; caption?: string; fullWidth?: boolean }) {
  const src = imageUrl(image, fullWidth ? 1200 : 800)
  return (
    <figure className={`mb-8 ${fullWidth ? 'w-full' : 'max-w-2xl'}`}>
      <div className="rounded-xl overflow-hidden bg-rc-bg-main">
        <img
          src={src}
          alt={image.alt ?? caption ?? ''}
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="text-center text-xs text-rc-grey-light mt-2">{caption}</figcaption>
      )}
    </figure>
  )
}

function DividerRenderer() {
  return <hr className="my-8 border-t-2 border-rc-green/30 w-16" />
}

// Dense, non-visual, or already-self-paced blocks skip the reveal
// animation — a quiz shouldn't visually "arrive" while someone is
// mid-interaction with it, and dividers/rich text are cheap enough that
// animating them adds motion without adding clarity.
const NO_REVEAL_TYPES = new Set(['quizBlock', 'confirmationQuizBlock', 'dividerBlock'])

function renderBlock(block: ContentBlockType) {
  switch (block._type) {
          case 'richText':
            return <RichTextRenderer key={block._key} content={block.content} />

          case 'imageBlock':
            return (
              <ImageRenderer
                key={block._key}
                image={block.image}
                caption={block.caption}
                fullWidth={block.fullWidth}
              />
            )

          case 'videoBlock':
            return (
              <VideoBlock
                key={block._key}
                title={block.title}
                azureBlobUrl={block.azureBlobUrl}
                posterUrl={block.posterUrl}
                captionsUrl={block.captionsUrl}
              />
            )

          case 'audioBlock':
            return (
              <AudioBlock
                key={block._key}
                title={block.title}
                azureBlobUrl={block.azureBlobUrl}
              />
            )

          case 'calloutBlock':
            return (
              <CalloutBlock
                key={block._key}
                variant={block.variant}
                title={block.title}
                body={block.body}
              />
            )

          case 'chartVisualization':
            return (
              <ChartVisualization
                key={block._key}
                title={block.title}
                description={block.description}
                type={block.type}
                stacked={block.stacked}
                labels={block.labels}
                datasets={block.datasets}
                source={block.source}
                sourceUrl={block.sourceUrl}
              />
            )

          case 'gwpCardsBlock':
            return <GWPCards key={block._key} />

          case 'quizBlock':
            return <QuizBlock key={block._key} questions={block.questions} />

          case 'dividerBlock':
            return <DividerRenderer key={block._key} />

          case 'energySystemDiagram':
            return (
              <EnergySystemDiagram
                key={block._key}
                variant={block.variant}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'offshoreWindArrayDiagram':
            return (
              <OffshoreWindArrayDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'windTurbineComponentsDiagram':
            return (
              <WindTurbineComponentsDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'turbineSizeComparison':
            return (
              <TurbineSizeComparison
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'offshoreFoundationTypesDiagram':
            return (
              <OffshoreFoundationTypesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'floatingWindTimelineDiagram':
            return (
              <FloatingWindTimelineDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'gridIntegrationDiagram':
            return (
              <GridIntegrationDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'offshoreVsOnshoreComparisonDiagram':
            return (
              <OffshoreVsOnshoreComparisonDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'onshoreWindPrinciplesDiagram':
            return (
              <OnshoreWindPrinciplesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'nuclearReactorDiagram':
            return (
              <NuclearReactorDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'nuclearWasteClassificationDiagram':
            return (
              <NuclearWasteClassificationDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'solarPVCellDiagram':
            return (
              <SolarPVCellDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'solarPanelTypesDiagram':
            return (
              <SolarPanelTypesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'solarInverterTypesDiagram':
            return (
              <SolarInverterTypesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'biomassConversionPathwaysDiagram':
            return (
              <BiomassConversionPathwaysDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'anaerobicDigestionDiagram':
            return (
              <AnaerobicDigestionDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'beccsProcessDiagram':
            return (
              <BECCSProcessDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'pumpedStorageHydroDiagram':
            return (
              <PumpedStorageHydroDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'hydropowerTypesDiagram':
            return (
              <HydropowerTypesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'geothermalPlantTypesDiagram':
            return (
              <GeothermalPlantTypesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'hydrogenColoursDiagram':
            return (
              <HydrogenColoursDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'hydrogenFuelCellDiagram':
            return (
              <HydrogenFuelCellDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'hydrogenLandscapeDiagram':
            return (
              <HydrogenLandscapeDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'carbonPriceTableDiagram':
            return (
              <CarbonPriceTableDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'liquefiedCO2CarrierDiagram':
            return (
              <LiquefiedCO2CarrierDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'globalCCSMap':
            return (
              <GlobalCCSMap
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'northSeaMap':
            return (
              <NorthSeaMap
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'waveEnergyConversionDiagram':
            return (
              <WaveEnergyConversionDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'tidalEnergyConversionDiagram':
            return (
              <TidalEnergyConversionDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'marineEnergyOpportunitiesDiagram':
            return (
              <MarineEnergyOpportunitiesDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'policyFrameworksDiagram':
            return (
              <PolicyFrameworksDiagram
                key={block._key}
                title={block.title}
                caption={block.caption}
              />
            )

          case 'dispatchableVsNonDispatchableDiagram':
            return (
              <DispatchableVsNonDispatchableDiagram
                key={block._key}
              />
            )

          case 'nacelleInternalDiagram':
            return (
              <NacelleInternalDiagram
                key={block._key}
              />
            )

          case 'turbineBladeDiagram':
            return (
              <TurbineBladeDiagram
                key={block._key}
              />
            )

          case 'fixedFoundationTypesDiagram':
            return (
              <FixedFoundationTypesDiagram
                key={block._key}
              />
            )

          case 'fixedFoundationInstallationDiagram':
            return (
              <FixedFoundationInstallationDiagram
                key={block._key}
              />
            )

          case 'floatingPlatformTypesDiagram':
            return <FloatingPlatformTypesDiagram key={block._key} />

          case 'mooringSystemsDiagram':
            return <MooringSystemsDiagram key={block._key} />

          case 'anchorTypesDiagram':
            return <AnchorTypesDiagram key={block._key} />

          case 'subseaCableTypesDiagram':
            return <SubseaCableTypesDiagram key={block._key} />

          case 'solarResourceMapDiagram':
            return <SolarResourceMapDiagram key={block._key} />

          case 'grovesFuelCellDiagram':
            return <GrovesFuelCellDiagram key={block._key} />

          case 'hydrogenVsEVDiagram':
            return <HydrogenVsEVDiagram key={block._key} />

          case 'confirmationQuizBlock': {
            const questions = COL_QUESTIONS[block.subModuleSlug]
            if (!questions) return null
            return (
              <ConfirmationQuiz
                key={block._key}
                questions={questions}
                subModuleSlug={block.subModuleSlug}
                moduleId={block.moduleId}
              />
            )
          }

          default:
            return null
        }
}

export function ContentRenderer({ blocks }: ContentRendererProps) {
  return (
    <>
      {blocks.map((block) => {
        const rendered = renderBlock(block)
        if (rendered === null) return null
        if (NO_REVEAL_TYPES.has(block._type)) {
          return <div key={block._key}>{rendered}</div>
        }
        return (
          <Reveal key={block._key}>
            {rendered}
          </Reveal>
        )
      })}
    </>
  )
}
