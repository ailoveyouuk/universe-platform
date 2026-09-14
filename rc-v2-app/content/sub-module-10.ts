// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 10: Hydropower & Geothermal Energy
// Source: MOD1_SUB10_HYDRO.pdf pages 4–27
//
// Phase 1 images served from /public/images/sm10/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset, PumpedStorageHydroDiagramBlock, HydropowerTypesDiagramBlock, GeothermalPlantTypesDiagramBlock } from '@/types'
import {
  hydroCountriesChart,
  hydroCapacityChart,
  hydroTypesChart,
  geothermalChart,
} from './sm10-charts'

function p(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function h2(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'h2' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function h3(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'h3' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function bullet(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'normal' as const, listItem: 'bullet' as const, level: 1,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function localImage(filename: string, alt: string): ImageAsset {
  return { _type: 'image', asset: { _ref: `/images/sm10/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm10/${filename}` }
}

export const subModule10: SubModule = {
  _id: 'sm-10',
  title: 'SM 10 - Hydropower & Geothermal',
  slug: { _type: 'slug', current: 'hydropower' },
  orderIndex: 10,
  estimatedHours: 2,
  learningObjectives: [
    'Explain how hydropower harnesses the kinetic energy of water to generate electricity',
    'Identify and compare the main types of hydropower plant: reservoir-based, run-of-river, pumped-storage, and micro-hydro',
    'Trace the history of hydropower from ancient water wheels to modern multi-GW dam projects',
    'Assess the global distribution of hydropower capacity and generation by region',
    'Evaluate the social, economic, and environmental challenges and opportunities of hydropower development',
    'Explain the principles of geothermal energy and the main types of geothermal power plant',
    'Recognise the role of pumped-storage hydro as the world\'s dominant form of grid-scale energy storage',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to Hydropower ─────────────────────────────────
    {
      _id: 'sm10-sec-1-intro',
      title: 'Introduction to Hydropower',
      slug: { _type: 'slug', current: 'hydropower-introduction' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm10-s1-hero',
          image: localImage('Images/AdobeStock_468161904.webp', 'Large hydroelectric dam with reservoir'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm10-s1-text',
          content: [
            h2('sm10-s1-h1', 'What is Hydropower?'),
            p('sm10-s1-p1', 'Hydropower is a renewable energy source that harnesses the kinetic energy of flowing or falling water to generate electricity. Typically, hydropower works through the use of dams, where water is stored in a reservoir at height and then released in a controlled manner through turbines, converting the potential energy of the elevated water into electrical energy.'),
            p('sm10-s1-p2', 'Hydropower is the world\'s largest source of renewable electricity by both installed capacity (over 1,400 GW) and annual generation (approximately 4,200 TWh/year). It provides around 16% of global electricity and over 40% of all renewable electricity. Countries such as Norway (95%), Brazil (65%), and Canada (60%) generate the majority of their electricity from hydropower.'),
            p('sm10-s1-p3', 'However, hydropower also poses significant challenges. The construction of dams and reservoirs can lead to habitat disruption and alter ecosystems, affecting aquatic life. Sedimentation in reservoirs can reduce capacity over time. Large dam projects may require the displacement of local communities. Understanding both the benefits and drawbacks of hydropower is essential for informed energy policy.'),
            h2('sm10-s1-h2', 'The History of Hydropower'),
            p('sm10-s1-p4', 'The classic water wheel is estimated to have existed for several millennia. Archaeological excavations have revealed that water wheels were used in Ancient Rome, Greece, Persia, and China for irrigation, water pumping, and grain grinding. During the medieval period, water-powered mills became an essential mechanism in the European agricultural economy.'),
            p('sm10-s1-p5', 'The first modern hydroelectric power station is generally credited to Cragside in Northumberland, England (1878), which used a water turbine to generate electricity for the house. The Niagara Falls hydropower plant (1895) marked the beginning of large-scale electricity generation from water, and the 20th century saw the construction of iconic dams including Hoover Dam (1936), Grand Coulee (1942), and, most recently, the Three Gorges Dam (2003) -- the world\'s largest power station at 22.5 GW.'),
          ],
        },
        hydroCapacityChart,
        hydroCountriesChart,
      ],
    },

    // ── SECTION 2: Types of Hydropower Plant ─────────────────────────────────
    {
      _id: 'sm10-sec-2-types',
      title: 'Types of Hydropower Plant',
      slug: { _type: 'slug', current: 'hydropower-types' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm10-s2-hero',
          image: localImage('Images/AdobeStock_429767427.webp', 'Pumped-storage hydropower facility'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm10-s2-text',
          content: [
            h2('sm10-s2-h1', 'Reservoir-Based Plants (Conventional Dams)'),
            p('sm10-s2-p1', 'These are the most familiar form of hydropower -- large dams that impound vast volumes of water in a reservoir. As water passes through the dam, the hydraulic force of the flow turns turbines, generating electricity. By regulating the flow, operators can adjust electricity generation to match demand, making reservoir hydro a dispatchable renewable power source.'),
            p('sm10-s2-p2', 'The Three Gorges Dam in China (22.5 GW), Itaipu on the Brazil-Paraguay border (14 GW), and Belo Monte in Brazil (11.2 GW) are among the world\'s largest power stations of any type. These mega-dams can store energy equivalent to weeks or months of generation, providing extraordinary long-duration energy storage capability.'),
            h2('sm10-s2-h2', 'Run-of-River Plants'),
            p('sm10-s2-p3', 'Run-of-river hydropower uses the natural flow of a river to generate electricity, without the need for a large reservoir. Unlike reservoir-based dams, run-of-river plants are significantly smaller and far less ecologically disruptive -- they do not require flooding large areas of land.'),
            p('sm10-s2-p4', 'The trade-off is that generation output varies with the natural flow of the river, meaning run-of-river plants provide less control and storage than reservoir dams. They are particularly well-suited to rivers with reliable, year-round flows in mountainous regions.'),
            h2('sm10-s2-h3', 'Pumped-Storage Hydropower'),
            p('sm10-s2-p5', 'Pumped-storage hydropower (PSH) is the world\'s dominant form of grid-scale energy storage, accounting for over 90% of global storage capacity. PSH operates on two reservoirs at different elevations. During periods of low electricity demand (or excess renewable generation), electricity pumps water from the lower to the upper reservoir. During periods of high demand, water flows back down through turbines to generate electricity.'),
            p('sm10-s2-p6', 'PSH effectively acts as a giant rechargeable battery for the electricity grid, enabling large amounts of variable renewable energy to be balanced and stored. As wind and solar deployment accelerates, the value of pumped storage is increasing rapidly. Global PSH capacity is around 180 GW, with major expansion planned in response to grid balancing needs.'),
            h2('sm10-s2-h4', 'Micro-Hydropower'),
            p('sm10-s2-p7', 'Micro-hydropower systems (typically defined as below 100 kW) can take various forms depending on the physical environment, community preferences, and local energy requirements. These range from small-scale run-of-river systems to traditional water wheels and pico-hydro systems. Pico-hydro systems -- the smallest type -- are used to provide electricity for individual households in remote mountain communities.'),
          ],
        },
        hydroTypesChart,
        {
          _type: 'hydropowerTypesDiagram' as const, _key: 'sm10-s2-types-diag',
          title: 'Types of Hydropower Plant',
          caption: 'The four main hydropower plant types differ significantly in scale, storage capability, ecological impact, and operational role on the grid.',
        } as HydropowerTypesDiagramBlock,
        {
          _type: 'calloutBlock', _key: 'sm10-s2-callout',
          variant: 'info',
          title: 'Pumped Storage: The Grid\'s Giant Battery',
          body: 'Pumped-storage hydropower stores around 9,000 GWh of electricity globally -- more than all other storage technologies combined. As solar and wind provide an ever-larger share of electricity generation, the ability of pumped storage to absorb surplus generation and release it on demand becomes increasingly critical to maintaining grid stability.',
        },
        {
          _type: 'pumpedStorageHydroDiagram' as const, _key: 'sm10-s2-psh-diag',
          title: 'How Pumped-Storage Hydropower Works',
          caption: 'PSH acts as a giant rechargeable battery: surplus renewable electricity pumps water uphill during off-peak periods, and that stored potential energy is released as dispatchable electricity when the grid needs it.',
        } as PumpedStorageHydroDiagramBlock,
      ],
    },

    // ── SECTION 3: Global Landscape & Innovation ──────────────────────────────
    {
      _id: 'sm10-sec-3-global',
      title: 'Global Hydropower Landscape & Technological Innovation',
      slug: { _type: 'slug', current: 'hydropower-global-innovation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm10-s3-hero',
          image: localImage('Images/1088px-Chief_Joseph_Dam.webp', 'Chief Joseph Dam on the Columbia River'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm10-s3-text',
          content: [
            h2('sm10-s3-h1', 'Global Hydropower by Region'),
            p('sm10-s3-p1', 'Hydropower is distributed widely across the globe, with total global installed capacity of approximately 1,416 GW generating around 4,210 TWh per year. East Asia and the Pacific region -- led by China -- dominates with 562 GW of capacity, accounting for nearly 40% of the global total. Europe, North and Central America, and South America each host over 180 GW of capacity.'),
            p('sm10-s3-p2', 'Africa has significant untapped hydropower potential -- particularly the Congo River basin, which has an estimated potential of over 100 GW -- but faces financing, political, and infrastructure challenges in realising this resource. South and Central Asia, led by India, China, and Pakistan, are developing significant new hydropower capacity in the Himalayas and Central Asian mountains.'),
            h2('sm10-s3-h2', 'Technological Innovations in Hydropower'),
            p('sm10-s3-p3', 'Several advanced technologies are shaping the future of hydropower:'),
            bullet('sm10-s3-b1', 'AI and Machine Learning: Algorithms are increasingly being integrated into modern hydropower systems to optimise water flow, predict generation output based on weather and snowmelt forecasts, and respond to real-time changes in grid conditions and market prices.'),
            bullet('sm10-s3-b2', 'Fish-Friendly Turbines: Advanced turbine designs minimise impacts on fish populations migrating through dams, addressing one of the key environmental concerns associated with conventional hydropower.'),
            bullet('sm10-s3-b3', 'Flexible Operation: Modern hydro plants are increasingly operated in more flexible modes, rapidly ramping up and down to provide grid balancing services that complement variable solar and wind generation.'),
            bullet('sm10-s3-b4', 'Small Hydro Upgrades: Many older small and medium hydropower plants are being refurbished and upgraded with modern turbines and control systems, significantly increasing output without building new dams.'),
            bullet('sm10-s3-b5', 'Marine Turbines: Advanced designs are being adapted for use in tidal and river current applications, extending the hydropower concept to marine environments.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm10-s3-callout',
          variant: 'info',
          title: 'Hydropower and Climate Change: A Double Relationship',
          body: 'Climate change presents both challenges and opportunities for hydropower. Changing rainfall patterns, glacial retreat, and increased drought frequency are affecting water availability in many regions -- threatening existing hydropower output. However, climate-driven extreme weather also creates new opportunities for flood control infrastructure with integrated generation, and the need for grid balancing from pumped storage increases with growing renewable penetration.',
        },
      ],
    },

    // ── SECTION: Global Distribution of Hydropower ───────────────────────────
    {
      _id: 'sm10-sec-global-dispersion',
      title: 'Global Distribution of Hydropower',
      slug: { _type: 'slug', current: 'hydropower-global-distribution' },
      estimatedMinutes: 20,
      content: [
        {
          _type: 'richText',
          _key: 'sm10-global-text',
          content: [
            h2('sm10-global-h1', 'Accounting for the Global Dispersion of Hydropower'),
            p('sm10-global-p1', 'Hydropower capacity is not evenly distributed across the globe. Two key factors explain why some regions and countries have developed extensive hydropower resources while others have built relatively little: economics and geography.'),
            h3('sm10-global-h2', 'Economic Factors'),
            p('sm10-global-p2', 'Countries with higher GDP levels tend to rank highly in metrics linked to hydropower development. Wealthier countries have more advanced existing infrastructure — including grid networks, access roads, and engineering capacity — which are critical factors that directly influence the likelihood of attracting investment in large-scale hydropower projects. Access to financing, regulatory stability, and institutional capacity all correlate with economic development, making it easier for wealthier nations to plan and execute complex, multi-decade hydropower projects.'),
            h3('sm10-global-h3', 'Geographic and Topographic Factors'),
            p('sm10-global-p3', 'More efficient hydropower projects rely on fast-flowing water to drive turbines. This is why many hydropower projects harness the gravitational force of water flowing from higher altitudes — hilly and mountainous terrain creates the head (height differential) that drives fast-flowing rivers with significant energy potential. Countries that may not have higher levels of economic development but possess mountainous geography — such as Pakistan, Venezuela, and Nepal — can generate relatively high amounts of hydroelectric power.'),
            bullet('sm10-global-b1', 'Mountain Nations: Countries with significant mountainous terrain such as Norway, Switzerland, Nepal, and New Zealand derive large proportions of their electricity from hydropower, driven by abundant run-off from highland catchments.'),
            bullet('sm10-global-b2', 'Arid Regions: Countries with warmer, drier climates that suffer from water scarcity are significantly less able to support hydropower generation. Much of the Middle East, North Africa, and parts of sub-Saharan Africa have limited hydropower potential due to insufficient and irregular river flows.'),
            bullet('sm10-global-b3', 'Tropical River Basins: Regions with large tropical river systems — such as the Amazon Basin in South America, the Congo Basin in Africa, and the Mekong in Southeast Asia — hold enormous untapped hydropower potential, though development must be carefully balanced against ecological and social considerations.'),
            h3('sm10-global-h4', 'Top Hydropower Nations'),
            p('sm10-global-p4', 'China leads the world in hydropower capacity with over 421,500 MW installed, followed by Brazil (109,400 MW), the United States (102,800 MW), Canada (83,000 MW), and India (52,100 MW). Together these five countries account for more than half of total global hydropower capacity. In terms of generation, China again leads with approximately 1,140 TWh annually, followed by Brazil, Canada, the United States, and Russia.'),
          ],
        },
      ],
    },

    // ── SECTION 4: Challenges & Opportunities ─────────────────────────────────
    {
      _id: 'sm10-sec-4-challenges',
      title: 'Challenges & Opportunities of Hydropower',
      slug: { _type: 'slug', current: 'hydropower-challenges-opportunities' },
      estimatedMinutes: 35,
      content: [
        {
          _type: 'imageBlock', _key: 'sm10-s4-hero',
          image: localImage('Images/AdobeStock_782911062.webp', 'Hydropower dam construction and community'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm10-s4-text',
          content: [
            h2('sm10-s4-h1', 'Social Challenges'),
            bullet('sm10-s4-b1', 'Population Displacement: Larger hydropower projects typically require flooding of large areas. Nearby communities can be displaced, losing homes, land, and livelihoods. The Three Gorges Dam displaced approximately 1.3 million people. Resettlement programmes do not always adequately compensate affected communities.'),
            bullet('sm10-s4-b2', 'Community Opposition: Displacement and environmental impacts frequently generate strong local opposition, complicating planning processes and sometimes leading to project cancellation or delay.'),
            bullet('sm10-social-culture', 'Cultural Erosion: The construction of large hydropower projects can lead to the removal or flooding of land with specific cultural or religious significance. The loss of sacred sites, traditional burial grounds, and landscapes that have shaped communities\' identities for centuries can have profound and long-lasting impacts on local cultures. The Belo Monte Dam on the Xingu River in Brazil — one of the world\'s largest dams with an installed capacity of over 11,000 MW — is a well-documented example, where flooding destroyed sacred sites and traditional hunting grounds that had been central to indigenous communities for centuries.'),
            h2('sm10-s4-h2', 'Economic Challenges'),
            bullet('sm10-s4-b3', 'High Capital Costs: Initial investments for constructing large dams and reservoirs are enormous -- often billions of dollars. The Three Gorges Dam cost approximately $28 billion USD to construct. These costs require long-term financing and government support.'),
            bullet('sm10-s4-b4', 'Maintenance and Sedimentation: Operating and maintaining large hydropower assets is costly. Sedimentation -- sediment carried by rivers accumulating in reservoirs -- gradually reduces reservoir capacity and can damage turbines.'),
            bullet('sm10-econ-unforeseen', 'Unforeseen Costs: As is often the case with large-scale infrastructure projects, unforeseen engineering challenges, geological surprises, and regulatory requirements can lead to significantly higher costs than originally forecasted. This can extend the project\'s payback period and increase financial risk for investors and governments alike.'),
            bullet('sm10-econ-compensation', 'Community Compensation and Resettlement Costs: The displacement and resettlement of communities is itself a major and often underestimated cost. Providing replacement housing, rebuilding community infrastructure such as schools and healthcare facilities, and negotiating fair compensation packages can add substantially to project budgets.'),
            h2('sm10-s4-h3', 'Environmental Challenges'),
            bullet('sm10-s4-b5', 'Biodiversity Loss: Reservoir flooding destroys terrestrial habitats -- forests, wetlands, floodplains. Dams block fish migration routes, disrupt river ecosystems, and alter sediment flows downstream, sometimes affecting coastal deltas thousands of kilometres away.'),
            bullet('sm10-s4-b6', 'Greenhouse Gas Emissions: Reservoirs in tropical regions can generate significant methane emissions as organic matter decomposes in warm, oxygen-depleted water -- potentially making some tropical hydropower projects less climate-friendly than assumed.'),
            bullet('sm10-env-thermal', 'Reduced Water Quality and Thermal Stratification: Since dams trap sediment, this leads to build-up in reservoirs over time, reducing water storage capacity and quality. Additionally, as water gets trapped behind a dam, different temperature layers can form — a phenomenon known as thermal stratification. When this thermally stratified water is released downstream, it can threaten both water quality and aquatic life adapted to the natural temperature range of the river.'),
            bullet('sm10-env-failure', 'Natural Catastrophe Risk: Although rare, dam failures can have catastrophic consequences. The 2021 Brumadinho tailings dam disaster in Brazil, while a mining dam rather than hydropower, illustrates the scale of potential impact — 270 people died and severe mudflows contaminated and destroyed nearby habitats. Hydropower dams, particularly in seismically active regions, require continuous structural monitoring and robust emergency planning.'),
            h2('sm10-s4-h4', 'Opportunities'),
            bullet('sm10-s4-b7', 'Job Creation: Large hydropower projects create thousands of construction and operational jobs, often in remote regions with limited employment alternatives.'),
            bullet('sm10-s4-b8', 'Flood Control and Water Security: Dams provide flood control, water storage for irrigation and drinking water, and can improve water security in drought-prone regions.'),
            bullet('sm10-s4-b9', 'Multi-Purpose Infrastructure: Hydropower dams often serve multiple functions -- electricity generation, flood control, irrigation, navigation, and tourism -- distributing their economic and social benefits more broadly.'),
            bullet('sm10-s4-b10', 'Reliable Clean Baseload: Unlike wind and solar, hydropower provides highly reliable, dispatchable renewable electricity with very low life-cycle emissions -- typically 4-30 gCO2e/kWh.'),
            bullet('sm10-soc-opp-health', 'Improved Health and Sanitation: In some cases, hydropower projects have helped create a more sustainable, long-term water supply for communities who previously lacked access to clean water and sanitation facilities. Reservoirs can serve as water supply sources in addition to generating electricity.'),
            bullet('sm10-soc-opp-education', 'Education and Skills Development: Several projects have led to the upskilling and training of local people during construction and operation phases. Once the project is commissioned, these transferable technical and engineering skills can benefit other sectors of the local economy.'),
            bullet('sm10-econ-opp-stability', 'Price Stability: The hydraulic processes involved in generating electricity are constant and predictable, making hydropower a highly reliable source of baseload power. As a result, hydropower can play an important role in contributing to energy price stability for consumers, insulating economies from the volatile pricing of fossil fuel-based electricity generation.'),
            bullet('sm10-econ-opp-investment', 'Long-Term Investment Returns: Operations and maintenance costs for hydropower can be significant, but hydropower projects can remain operational for 50-100 years — far longer than other energy sources. This longevity offers investors and governments assurances of long-term revenue streams and a reliable return on the substantial upfront capital investment.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm10-s4-callout',
          variant: 'warning',
          title: 'Geopolitical Dimensions of Hydropower',
          body: 'Major rivers cross international borders, and upstream dams can significantly affect downstream water availability, sediment flows, and fish populations. The construction of the Grand Ethiopian Renaissance Dam (GERD) on the Nile has created significant diplomatic tensions between Ethiopia, Sudan, and Egypt -- illustrating how hydropower development can become a source of geopolitical conflict when water is a shared and scarce resource.',
        },
      ],
    },

    // ── SECTION 5: Geothermal Energy ──────────────────────────────────────────
    {
      _id: 'sm10-sec-5-geothermal',
      title: 'Geothermal Energy',
      slug: { _type: 'slug', current: 'geothermal-energy' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm10-s5-hero',
          image: localImage('Images/AdobeStock_901486863.webp', 'Geothermal power plant with steam vents'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm10-s5-text',
          content: [
            h2('sm10-s5-h1', 'Introduction to Geothermal Energy'),
            p('sm10-s5-p1', 'Geothermal energy is derived from the intense heat -- or thermal energy -- stored beneath the Earth\'s crust. Like hydropower, the energy source is taken from a reservoir (this time an underground reservoir of heat rather than water). The kinetic force -- steam rather than water -- directly turns turbines, generating electricity.'),
            p('sm10-s5-p2', 'Geothermal energy is one of the world\'s oldest known energy sources, dating back thousands of years to the use of hot springs for bathing and cooking in ancient civilisations. The first geothermal power plant was built in Larderello, Italy, in 1904 -- and that plant is still operating today.'),
            h2('sm10-s5-h2', 'Types of Geothermal Energy Plants'),
            h3('sm10-s5-h3', 'Dry Steam Plants'),
            p('sm10-s5-p3', 'These plants use steam extracted directly from underground geothermal reservoirs. The steam is piped to the surface and used to drive a turbine, then condensed and returned to the reservoir. Dry steam plants are the simplest and oldest type of geothermal power plant. The Geysers in California -- the world\'s largest geothermal complex -- uses this technology.'),
            h3('sm10-s5-h4', 'Flash Steam Plants'),
            p('sm10-s5-p4', 'Flash steam plants are the most common form of geothermal power plant. Very hot, high-pressure water from deep underground is brought to the surface where the pressure drop causes some of it to "flash" instantly into steam. This steam drives turbines to generate electricity. The remaining water is returned to the reservoir.'),
            h3('sm10-s5-h5', 'Binary Cycle Plants'),
            p('sm10-s5-p5', 'Binary cycle plants are suitable for lower-temperature geothermal resources (typically 70-180 degrees C) that are far more common globally than high-temperature resources. A working fluid with a lower boiling point than water is heated by the geothermal water in a heat exchanger, vaporises, and drives a turbine. Binary cycle plants allow geothermal energy to be harnessed in a much wider range of locations.'),
            h2('sm10-s5-h6', 'Strengths and Weaknesses of Geothermal Energy'),
            bullet('sm10-s5-b1', 'Strengths: Virtually zero carbon emissions during operation; available 24 hours a day regardless of weather; small land footprint; can provide both electricity and direct heat (district heating, greenhouses, industrial processes).'),
            bullet('sm10-s5-b2', 'Weaknesses: Geographic limitation -- the best resources are concentrated near tectonic plate boundaries and volcanic regions; high upfront exploration and drilling costs; some risk of induced seismicity from injection wells; hydrogen sulphide emissions in some applications.'),
            p('sm10-s5-p6', 'Enhanced Geothermal Systems (EGS) -- also called "deep geothermal" -- aim to unlock geothermal energy almost anywhere by drilling deep (5-10 km) into hot dry rock and injecting water to create an artificial reservoir. If EGS can be commercialised, it could expand the accessible geothermal resource by orders of magnitude.'),
          ],
        },
        {
          _type: 'geothermalPlantTypesDiagram' as const, _key: 'sm10-s5-geo-diag',
          title: 'Types of Geothermal Power Plant',
          caption: 'Dry steam and flash steam plants exploit high-temperature volcanic resources; binary cycle plants extend geothermal energy to much lower temperatures, dramatically expanding the resource base.',
        } as GeothermalPlantTypesDiagramBlock,
        geothermalChart,
        {
          _type: 'calloutBlock', _key: 'sm10-s5-callout',
          variant: 'key-fact',
          title: 'Iceland: A Geothermal Success Story',
          body: 'Iceland generates nearly 30% of its electricity and over 90% of its space heating from geothermal energy, sitting directly on the Mid-Atlantic Ridge. Geothermal district heating has made Reykjavik one of the cleanest-air capitals in the world. Iceland\'s example -- combined with the potential of Enhanced Geothermal Systems -- illustrates what geothermal energy could offer at much larger scale globally.',
        },
      ],
    },


    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm10-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'hydropower-geothermal-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm10-conc-text',
          content: [
            h2('sm10-conc-h1', 'Sub-Module Summary'),
            p('sm10-conc-p1', 'This sub-module has covered two mature and important contributors to the global renewable energy mix: hydropower and geothermal energy. Hydropower is the largest source of renewable electricity globally, generating approximately 16% of total world electricity. Run-of-river, reservoir (impoundment), and pumped storage hydropower each serve distinct roles — from continuous baseload generation to the critical grid-balancing function of pumped storage, which acts as the world\'s most widely deployed large-scale energy storage technology. Tidal and wave hydrokinetic systems represent an emerging frontier.'),
            p('sm10-conc-p2', 'The geographical distribution of hydropower is heavily determined by river hydrology: Asia-Pacific (led by China), South America (led by Brazil), and North America (led by Canada and the USA) account for the majority of global capacity. Climate change introduces a dual relationship with hydropower — changing precipitation patterns and glacial retreat threaten long-term resource availability in some regions, while extreme weather events can both enhance and damage infrastructure. The geopolitical dimensions of shared river basins add an additional layer of complexity to international water management.'),
            p('sm10-conc-p3', 'Geothermal energy harnesses the Earth\'s internal heat — a continuous, weather-independent resource that can deliver baseload electricity and district heating with minimal land use and very low lifecycle emissions. Iceland provides the world\'s most compelling model: nearly 100% of its electricity and heating is geothermal-sourced. Beyond traditional high-temperature volcanic regions, advances in Enhanced Geothermal Systems (EGS) and deep drilling technology are opening geothermal potential to geologically stable regions previously considered unsuitable. Together, hydro and geothermal underpin the reliable, low-carbon backbone of electricity systems that intermittent renewables depend on for grid stability.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm10-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 10',
          body: 'You now have a solid understanding of hydropower and geothermal energy — their technologies, global distribution, challenges, and their critical roles as reliable, low-carbon contributors to the global energy mix.',
        },
      ],
    },
    {
      _id: 'sm10-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'hydropower-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm10-col-quiz',
          subModuleSlug: 'hydropower',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
