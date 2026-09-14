// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 8: Solar Power
// Source: MOD1_SUB8_SOLAR.pdf pages 4–29
//
// Phase 1 images served from /public/images/sm8/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  solarLcoeChart,
  solarCapacityChart,
  solarCountriesChart,
  solarApplicationsChart,
} from './sm8-charts'

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
  return { _type: 'image', asset: { _ref: `/images/sm8/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm8/${filename}` }
}

export const subModule8: SubModule = {
  _id: 'sm-8',
  title: 'SM 8 - Solar Power',
  slug: { _type: 'slug', current: 'solar' },
  orderIndex: 8,
  estimatedHours: 2,
  learningObjectives: [
    'Explain the two main types of solar energy technology -- photovoltaic (PV) and solar thermal -- and how each generates electricity',
    'Identify the main types of solar panels (monocrystalline, polycrystalline, thin-film) and compare their advantages and disadvantages',
    'Describe the role of solar inverters in converting DC to AC electricity and the different inverter types available',
    'Understand how solar PV integrates with smart grids and off-grid systems',
    'Assess emerging trends including agrivoltaics, building-integrated PV, community solar, and floating solar',
    'Evaluate the economic, social, and environmental impacts of solar energy deployment globally',
    'Recognise the skills and career opportunities available in the rapidly growing solar sector',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to Solar Energy ───────────────────────────────
    {
      _id: 'sm8-sec-1-intro',
      title: 'Introduction to Solar Energy',
      slug: { _type: 'slug', current: 'solar-introduction' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s1-hero',
          image: localImage('Images/AdobeStock_506744808.webp', 'Large solar farm at sunrise'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm8-s1-text',
          content: [
            h2('sm8-s1-h1', 'The Two Types of Solar Energy Technology'),
            p('sm8-s1-p1', 'Solar energy technology falls into two distinct but complementary categories, each converting sunlight into useful energy through different physical principles:'),
            bullet('sm8-s1-b1', 'Photovoltaic (PV) Technology: Converts sunlight directly into electricity through semiconductor materials, primarily silicon. When photons from sunlight strike a solar cell, they knock electrons loose, creating a flow of electrical current. PV technology is the most widely deployed solar technology globally.'),
            bullet('sm8-s1-b2', 'Solar Thermal Technology: Captures the heat of the sun to generate electricity or provide direct heating. In concentrated solar power (CSP) plants, mirrors or lenses focus sunlight onto a receiver to create high temperatures, driving a turbine. Solar thermal is also widely used for domestic hot water and space heating.'),
            p('sm8-s1-p2', 'The efficiency and cost-effectiveness of photovoltaic technologies have seen dramatic improvements over the years, making them a mainstream choice for electricity generation at scales from individual rooftops to multi-gigawatt utility projects. Solar PV is now the fastest-growing and cheapest electricity source in history.'),
            h2('sm8-s1-h2', 'Why Solar Energy Matters'),
            p('sm8-s1-p3', 'Solar energy is the most abundant energy source on Earth -- the sun delivers more energy to our planet in one hour than humanity uses in an entire year. Unlike fossil fuels, solar energy produces no emissions during operation, no fuel costs, and is available in every country. Its costs have fallen by over 90% since 2010, making it the cheapest source of electricity in most parts of the world.'),
          ],
        },
        {
          _type: 'solarPVCellDiagram' as const, _key: 'sm8-s1-pvcell',
          title: 'How Solar PV Works: From Photon to Grid',
          caption: 'Row 1 traces the photovoltaic physics within a single silicon cell. Row 2 shows how individual cells scale up into modules, strings, and arrays before the inverter feeds AC electricity to the national grid.',
        },
        solarCapacityChart,
        solarLcoeChart,
        {
          _type: 'calloutBlock', _key: 'sm8-s1-callout',
          variant: 'key-fact',
          title: 'Solar PV: The Fastest Cost Reduction in Energy History',
          body: 'The cost of solar PV modules has fallen by approximately 99% since 1976. No other energy technology has achieved anything close to this rate of cost reduction. This "learning curve" -- driven by manufacturing scale, improved materials, and better installation practices -- continues, with solar costs expected to fall by a further 50% by 2030.',
        },
      ],
    },

    // ── SECTION 2: Solar Panel Types ─────────────────────────────────────────
    {
      _id: 'sm8-sec-2-panels',
      title: 'Solar Panel Types & Technologies',
      slug: { _type: 'slug', current: 'solar-panel-types' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s2-hero',
          image: localImage('Images/AdobeStock_247096177.webp', 'Close-up of solar panel cells'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm8-s2-text',
          content: [
            h2('sm8-s2-h1', 'Monocrystalline Solar Panels'),
            p('sm8-s2-p1', 'Monocrystalline solar panels are made of silicon wafers that have a single continuous crystal lattice structure. This means the silicon molecules are perfectly aligned, allowing electrons to move more freely and resulting in the highest efficiency levels of any silicon solar panel technology -- typically 20-24%.'),
            bullet('sm8-s2-b1', 'Advantages: Highest efficiency, best performance in low-light conditions, longest lifespan (25-30+ years), smallest footprint for a given output.'),
            bullet('sm8-s2-b2', 'Disadvantages: Most expensive to manufacture, performance drops more than some alternatives at high temperatures.'),
            h2('sm8-s2-h2', 'Polycrystalline Solar Panels'),
            p('sm8-s2-p2', 'Polycrystalline panels are made by melting raw silicon and pouring it into a mould to harden, resulting in a block with variously sized crystals. This less-controlled crystallisation process results in lower efficiency (15-18%) than monocrystalline panels, but also lower manufacturing costs. Polycrystalline panels have a distinctive blue, speckled appearance.'),
            bullet('sm8-s2-b3', 'Advantages: Lower manufacturing cost, simpler production process, good performance in diffuse light.'),
            bullet('sm8-s2-b4', 'Disadvantages: Lower efficiency than monocrystalline, slightly larger footprint for equivalent power output.'),
            h2('sm8-s2-h3', 'Thin-Film Solar Cells'),
            p('sm8-s2-p3', 'Thin-film solar cells (TFSC) are manufactured using one or multiple layers of PV elements deposited over a surface of glass, plastic, or metal. They use far less semiconductor material than crystalline silicon cells, making them potentially cheaper to produce at scale. The key thin-film technologies include:'),
            bullet('sm8-s2-b5', 'Cadmium Telluride (CdTe): The most commercially successful thin-film technology, with efficiency of 18-21% in commercial modules. First Solar is the world\'s leading CdTe manufacturer.'),
            bullet('sm8-s2-b6', 'CIGS (Copper Indium Gallium Selenide): High-efficiency thin-film technology (19-23%) with excellent performance in real-world conditions. Used in space applications due to its lightweight and radiation resistance.'),
            bullet('sm8-s2-b7', 'Amorphous Silicon (a-Si): The original thin-film technology, now mainly used in small consumer electronics. Lower efficiency (6-9%) but flexible and very cheap.'),
            h2('sm8-s2-h4', 'Emerging Technologies'),
            p('sm8-s2-p4', 'Perovskite solar cells are attracting enormous research interest, having achieved laboratory efficiencies above 29% -- higher than conventional silicon. Commercial perovskite-silicon tandem cells are beginning to emerge, with potential to achieve efficiencies above 35% at competitive costs. Organic photovoltaics, quantum dot cells, and multi-junction concentrator cells are other areas of active development.'),
          ],
        },
        {
          _type: 'solarPanelTypesDiagram' as const, _key: 'sm8-s2-panel-types',
          title: 'Solar Panel Technology Comparison',
          caption: 'Monocrystalline silicon panels lead on efficiency and lifespan. Polycrystalline offers a lower-cost alternative. Thin-film technologies (CdTe, CIGS, a-Si) are lighter and flexible, enabling building-integrated and specialist applications.',
        },
        {
          _type: 'calloutBlock', _key: 'sm8-s2-callout',
          variant: 'info',
          title: 'Which Panel Type is Best?',
          body: 'The "best" solar panel depends on the application. For space-constrained rooftops, high-efficiency monocrystalline panels maximise output. For large utility-scale projects where land is abundant, polycrystalline or thin-film panels may offer the best cost-per-watt. For specialist applications -- flexible surfaces, building integration -- thin-film technologies offer unique advantages.',
        },
      ],
    },

    // ── SECTION 3: Solar Inverters ────────────────────────────────────────────
    {
      _id: 'sm8-sec-3-inverters',
      title: 'Solar Panel Inverters',
      slug: { _type: 'slug', current: 'solar-inverters' },
      estimatedMinutes: 30,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s3-hero',
          image: localImage('Images/AdobeStock_295764570.webp', 'Solar inverter installation'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm8-s3-text',
          content: [
            h2('sm8-s3-h1', 'The Role of Solar Inverters'),
            p('sm8-s3-p1', 'Solar inverters are essential components in solar power systems that convert the direct current (DC) generated by solar panels into alternating current (AC), which is usable by most electrical appliances and can be fed into the electrical grid. Unlike DC, which flows in one direction, AC changes direction periodically, making it compatible with the standard electrical grid.'),
            p('sm8-s3-p2', 'Solar inverters are designed to maximise energy efficiency by tracking the Maximum Power Point (MPP) of the solar array -- the voltage at which the panels produce the most power at any given moment. There are several main types of solar inverter, each suited to different applications:'),
            h3('sm8-s3-h2', 'Standard String Inverters'),
            p('sm8-s3-p3', 'String inverters connect multiple solar panels in a series "string" and convert the combined DC output to AC. They are the most common and cost-effective inverter type for residential and commercial installations without significant shading or orientation differences between panels. Their main limitation is that the performance of the entire string is limited by the lowest-performing panel.'),
            h3('sm8-s3-h3', 'Power Optimisers / Optimised String Inverters'),
            p('sm8-s3-p4', 'Power optimisers are attached to each panel individually, conditioning the DC power before it reaches the string inverter. This reduces the "weakest link" problem and allows panel-level monitoring, improving overall system performance by 5-25% in shaded or complex roof situations.'),
            h3('sm8-s3-h4', 'Microinverters'),
            p('sm8-s3-p5', 'Microinverters convert DC to AC at the individual panel level, eliminating the weakest-link problem entirely. They offer maximum panel-level monitoring, easy scalability, and the best performance on roofs with shading or multiple orientations. They carry a higher upfront cost but often deliver superior long-term energy yields.'),
            h3('sm8-s3-h5', 'Hybrid & Smart Inverters'),
            p('sm8-s3-p6', 'Hybrid inverters combine solar PV conversion with battery storage management, enabling homes and businesses to store excess solar energy for use at night or during grid outages. Smart inverters go further, supporting grid services such as reactive power control and island detection -- capabilities increasingly required by grid operators as solar penetration grows.'),
            h3('sm8-inv-h-bidir', 'Bidirectional Inverters'),
            p('sm8-inv-p-bidir', 'Bidirectional inverters enable the conversion of power in both directions — DC to AC for normal solar generation, and AC to DC to allow energy to be put back into batteries or other energy storage devices. This bidirectional capability makes them central to battery storage systems and vehicle-to-grid (V2G) applications.'),
            bullet('sm8-inv-bidir-b1', 'Support for Grid-Tie Contracts: Enable net metering arrangements where excess energy is fed back to the grid for credit.'),
            bullet('sm8-inv-bidir-b2', 'Load Shifting and Peak Shaving: Allow stored energy to be discharged during peak demand periods, reducing electricity costs.'),
            bullet('sm8-inv-bidir-b3', 'Smart Energy Management: Can be integrated with home energy management systems to optimise charging and discharging based on tariff rates and consumption patterns.'),
            h3('sm8-inv-h-offgrid', 'Off-Grid Inverters'),
            p('sm8-inv-p-offgrid', 'Off-grid inverters are designed for solar systems that operate entirely independently of the national grid. They come in three main types:'),
            bullet('sm8-inv-offgrid-b1', 'Pure Sine Wave Inverters: Produce a smooth, consistent AC output that is ideal for sensitive electronics such as laptops, cameras, and medical equipment. The most expensive off-grid option but compatible with virtually all appliances.'),
            bullet('sm8-inv-offgrid-b2', 'Modified Sine Wave Inverters: Offer a more cost-effective solution for off-grid solar power systems where the connected appliances are less sensitive. Compatible with most standard devices but not suitable for some medical equipment or high-efficiency motors.'),
            bullet('sm8-inv-offgrid-b3', 'Grid-Tied with Battery Backup: A hybrid approach where a grid connection is maintained as backup but the system prioritises solar and battery power. Excess solar generation can be stored in batteries for later use, and allows users to benefit from net metering when the grid is available.'),
            h3('sm8-inv-h-smart', 'Smart Inverters'),
            p('sm8-inv-p-smart', 'Smart inverters go beyond basic power conversion to provide advanced grid support functions. As solar penetration on electricity grids increases, smart inverters are becoming essential for maintaining grid stability.'),
            bullet('sm8-inv-smart-b1', 'Voltage Regulation: Smart inverters can actively regulate voltage at the point of connection, helping to prevent the voltage fluctuations that can occur when large amounts of solar power are fed into the grid.'),
            bullet('sm8-inv-smart-b2', 'Frequency Regulation: They can respond to grid frequency deviations, ramping output up or down to help maintain the 50 or 60 Hz frequency standard.'),
            bullet('sm8-inv-smart-b3', 'Reactive Power Control: Smart inverters can supply or absorb reactive power, helping to maintain power factor and grid stability — a function previously only available from conventional generators.'),
            bullet('sm8-inv-smart-b4', 'Anti-Islanding Protection: Automatically disconnect from the grid during a power outage, preventing the dangerous situation where solar panels continue to energise a section of grid that workers may believe is de-energised.'),
            bullet('sm8-inv-smart-b5', 'Remote Monitoring and Control: Enable utility operators and system owners to monitor performance and adjust settings remotely via digital communication protocols.'),
          ],
        },
        {
          _type: 'solarInverterTypesDiagram' as const, _key: 'sm8-s3-inverters',
          title: 'Solar Inverter Architecture Types',
          caption: 'Each inverter architecture suits different installation contexts. String inverters are the default for simple, uniform arrays. Micro-inverters maximise output from complex or shaded rooftops. Hybrid inverters add battery management. Off-grid inverters remove the grid dependency entirely.',
        },
        {
          _type: 'calloutBlock', _key: 'sm8-s3-callout',
          variant: 'info',
          title: 'Why the Inverter Matters as Much as the Panel',
          body: 'The inverter is often called the "brain" of a solar installation. Even the most efficient solar panels will underperform if paired with a poorly sized or low-quality inverter. Inverter choice affects system efficiency, monitoring capability, battery integration, grid compatibility, and lifetime reliability -- making it one of the most important decisions in system design.',
        },
      ],
    },

    // ── SECTION 4: Grid Integration ───────────────────────────────────────────
    {
      _id: 'sm8-sec-4-grid',
      title: 'Grid Integration & Off-Grid Systems',
      slug: { _type: 'slug', current: 'solar-grid-systems' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s4-hero',
          image: localImage('Images/AdobeStock_556395058.webp', 'Solar panels connected to electricity grid infrastructure'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm8-s4-text',
          content: [
            h2('sm8-s4-h1', 'Solar Energy and Smart Grids'),
            p('sm8-s4-p1', 'The energy grid in most nations was designed and built in the 20th century for a one-way flow of electricity from large central power stations to consumers. These grids are now struggling with the demands of modern energy needs -- including the integration of large amounts of distributed, variable solar generation.'),
            p('sm8-s4-p2', 'Smart grids are dynamic and adaptable, designed for the two-way flow of both electricity and information. They use digital communications technology to detect and react to changes in usage, automatically optimising the balance between supply and demand. In places like California, where solar energy is mature, smart grids have helped integrate solar power smoothly -- leading to more homes powered by the sun and less reliance on fossil fuels.'),
            p('sm8-s4-p3', 'A key challenge for grid operators is the "duck curve" -- the pattern of net demand that dips sharply during sunny midday hours as solar generation peaks, then rises steeply in the evening as the sun sets and demand remains high. Battery storage, flexible demand response, and interconnection with neighbouring regions are the main tools for managing this challenge.'),
            h2('sm8-s4-h2', 'Off-Grid Solar Systems'),
            p('sm8-s4-p4', 'An off-grid system allows complete independence from a grid supplier, relying on solar panels, battery storage, and a backup generator to meet all energy needs. Off-grid solar has transformed energy access in remote communities around the world -- particularly in Sub-Saharan Africa and South and South-East Asia, where grid extension is uneconomic.'),
            bullet('sm8-s4-b1', 'System Components: Off-grid systems typically include solar panels, a charge controller, a battery bank, an off-grid inverter, and a backup generator.'),
            bullet('sm8-s4-b2', 'Mini-Grids: Beyond individual households, solar mini-grids serve entire villages or communities, providing reliable electricity to hundreds of households and businesses with a single shared generation and storage system.'),
            bullet('sm8-s4-b3', 'Energy Access: The International Energy Agency estimates that off-grid and mini-grid solar systems were the most cost-effective solution for around 60% of new electricity connections needed to achieve universal access by 2030.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm8-s4-callout',
          variant: 'info',
          title: 'Solar and Energy Access',
          body: 'Around 750 million people still lack access to electricity. Solar mini-grids and stand-alone systems are the fastest and most cost-effective means of bringing electricity to many of these communities. Unlike large centralised grid extension projects, solar mini-grids can be deployed in months rather than years, transforming healthcare, education, and economic opportunity in the communities they serve.',
        },
      ],
    },

    // ── SECTION 5: Performance, Innovation & Applications ─────────────────────
    {
      _id: 'sm8-sec-5-innovation',
      title: 'Performance, Innovation & Applications',
      slug: { _type: 'slug', current: 'solar-innovation-applications' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s5-hero',
          image: localImage('Images/AdobeStock_449871496.webp', 'Agrivoltaic solar installation over crops'),
          fullWidth: true,
        },
        {
          _type: 'solarResourceMapDiagram' as const,
          _key: 'sm8-s5-pvout-map',
        },
        solarApplicationsChart,
        {
          _type: 'richText', _key: 'sm8-s5-text',
          content: [
            h2('sm8-s5-h1', 'Performance Variations'),
            p('sm8-s5-p1', 'A solar panel\'s real-world energy output depends on many factors beyond just the panel\'s rated efficiency. Irradiance (the intensity of sunlight reaching the panel), temperature, shading, soiling, snow cover, and panel orientation all affect actual energy production. High solar potential regions -- such as the Middle East, North Africa, and Australia -- generate around twice the energy per installed kilowatt compared to northern European countries.'),
            p('sm8-s5-p2', 'Specific yield (kWh/kWp) is the most meaningful measure of a solar installation\'s performance, capturing how much energy is actually produced per unit of installed capacity in real-world conditions. Understanding these performance factors is essential for accurate energy assessment and project financing.'),
            h2('sm8-s5-h2', 'Agrivoltaics'),
            p('sm8-s5-p3', 'Agrivoltaics is the dual use of land for both solar energy production and agriculture. By mounting solar panels at greater height, or in a pattern that allows light through to crops, agrivoltaic installations can simultaneously generate electricity and maintain agricultural production on the same land. Research shows that some crops actually benefit from partial shading, particularly in hot climates where direct sunlight can cause water stress.'),
            p('sm8-s5-p4', 'Agrivoltaics helps address the "green on green" tension between renewable energy land use and agricultural and biodiversity priorities -- a growing concern in many countries as solar farm development accelerates.'),
            h2('sm8-s5-h3', 'Community Solar'),
            p('sm8-s5-p5', 'Community solar projects allow households and businesses that cannot install solar on their own rooftops -- due to rental arrangements, unsuitable roofs, or limited finances -- to benefit from shared solar installations. Participants subscribe to a share of a community solar garden\'s output, receiving credits on their electricity bills proportional to their share.'),
            h2('sm8-s5-h4', 'Building-Integrated Photovoltaics (BIPV)'),
            p('sm8-s5-p6', 'Building-Integrated Photovoltaics (BIPV) embed solar cells directly into building materials -- such as roof tiles, glazing, facades, and canopies -- so that the solar element becomes part of the building fabric rather than an add-on. BIPV reduces the visual impact of solar installations and can replace conventional building materials, partially offsetting the additional cost.'),
            h2('sm8-s5-h5', 'Floating Solar'),
            p('sm8-s5-p7', 'Floating solar -- panels mounted on buoyant platforms on water bodies such as reservoirs, lakes, and irrigation ponds -- is one of the fastest-growing solar applications. Floating solar reduces water evaporation, improves panel cooling (enhancing output), and avoids competition for land. Global floating solar capacity exceeded 5 GW in 2023 and is growing rapidly, particularly in Asia.'),
            h2('sm8-s5-h6', 'Thermophotovoltaic (TPV) Technology'),
            p('sm8-s5-p8', 'Thermophotovoltaic (TPV) technology is a promising emerging approach that uses thermal emitters — heated by sunlight or industrial waste heat — to generate electricity through specially engineered photovoltaic cells. Unlike conventional PV panels, TPV systems can operate at night or in low-light conditions if the thermal emitter is heated by an alternative source. Known for their silent operation and lack of moving parts, TPV systems offer a low-maintenance and potentially highly efficient energy solution, though they are still primarily at the research and development stage.'),
          ],
        },
        {
          _type: 'richText',
          _key: 'sm8-energy-equality-text',
          content: [
            h2('sm8-eq-h1', 'Solar Energy and Energy Equality'),
            p('sm8-eq-p1', 'Solar power plays a vital role in advancing the United Nations Sustainable Development Goal 7 (SDG 7): ensuring access to affordable, reliable, sustainable, and modern energy for all. For the 675 million people who still lack access to electricity — predominantly in sub-Saharan Africa and Asia — solar offers one of the most practical and scalable solutions.'),
            h3('sm8-eq-h2', 'Energy Access in Remote Areas'),
            p('sm8-eq-p2', 'In regions where national grid extension is economically or geographically impractical, solar offers an alternative or complementary pathway. Small-scale solar home systems (SHSs) — consisting of a small panel, battery, and basic lighting — can transform quality of life, enabling children to study after dark, reducing reliance on expensive and polluting kerosene lamps, and powering mobile phone charging that connects communities to wider economic opportunities.'),
            bullet('sm8-eq-b1', 'Solar Home Systems (SHSs): Modular, affordable systems that provide basic electricity for lighting, phone charging, and small appliances. Pay-as-you-go financing models have made SHSs accessible to low-income households across East Africa and South Asia.'),
            bullet('sm8-eq-b2', 'Solar Lighting Systems (SLSs): Simple, low-cost solar lanterns that replace kerosene lighting, reducing indoor air pollution and fuel costs while extending productive hours.'),
            bullet('sm8-eq-b3', 'Solar Microgrids: Community-scale solar and battery systems that can power health clinics, schools, water pumps, and small businesses — providing reliable electricity even in remote areas without grid access.'),
            h3('sm8-eq-h3', 'Solar for Disaster Resilience'),
            p('sm8-eq-p3', 'Solar power is increasingly being deployed for disaster resilience. Following hurricanes, wildfires, and other natural disasters that can knock out centralised grid infrastructure for weeks, solar microgrids with battery storage can maintain power for essential services including hospitals, emergency shelters, and communication centres. Governments are increasingly specifying solar resilience in public infrastructure planning.'),
            h3('sm8-eq-h4', 'Affordability Challenges'),
            p('sm8-eq-p4', 'Despite dramatic cost reductions — solar panel prices have fallen by over 90% in a decade — the upfront cost of solar systems remains a barrier for the world\'s poorest households. Access to affordable finance, particularly in rural and low-income settings, is critical to enabling the energy transition to reach those who need it most. Innovative financing models including microfinance, pay-as-you-go, and government subsidy programmes are progressively expanding access.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm8-s5-callout',
          variant: 'key-fact',
          title: 'Battery Storage: Transforming Solar\'s Role',
          body: 'Battery storage is increasingly deployed alongside solar, dramatically increasing solar\'s value to the grid. Solar-plus-storage systems can deliver power in the evening peak, provide grid stability services, and operate as virtual power plants. Falling lithium-ion battery costs -- down 89% since 2010 -- are making solar-plus-storage competitive with conventional peaking power plants.',
        },
        solarCountriesChart,
      ],
    },

    // ── SECTION 6: People, Skills & the Wider Solar Environment ──────────────
    {
      _id: 'sm8-sec-6-people',
      title: 'People, Skills & the Future of Solar',
      slug: { _type: 'slug', current: 'solar-people-future' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm8-s6-hero',
          image: localImage('Images/AdobeStock_582579710.webp', 'Solar panel installation technicians at work'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm8-s6-text',
          content: [
            h2('sm8-s6-h1', 'Jobs from Solar Power'),
            p('sm8-s6-p1', 'Solar energy is one of the highest job creators in the energy sector, generating approximately 6.38 direct, indirect, and induced jobs per $1 million invested. The solar sector employed over 7 million people globally in 2023, making it the single largest renewable energy employer. The biggest growth has been in the solar PV sector, especially in Asia, which employs 79% of the global total.'),
            p('sm8-s6-p2', 'China dominates employment in most renewable energy sectors and also dominates the manufacture of solar PV panels -- producing around 80% of global solar modules. However, Western countries are investing in domestic manufacturing capacity, driven by energy security concerns and government incentives such as the US Inflation Reduction Act.'),
            h2('sm8-s6-h2', 'Skills for Solar Power'),
            p('sm8-s6-p3', 'The skills required for the solar sector are varied, spanning technical, commercial, and professional disciplines:'),
            bullet('sm8-s6-b1', 'Installation & Commissioning: Electricians, roofers, and solar technicians who design, install, and commission residential and commercial PV systems.'),
            bullet('sm8-s6-b2', 'Engineering & Project Development: Civil, electrical, and structural engineers who design utility-scale solar farms, manage grid connections, and oversee construction.'),
            bullet('sm8-s6-b3', 'Operations & Maintenance: Technicians who monitor system performance, clean panels, repair faults, and manage inverter and battery systems.'),
            bullet('sm8-s6-b4', 'Finance & Commercial: Project finance specialists, lawyers, and business developers who structure and negotiate solar project investments.'),
            bullet('sm8-s6-b5', 'Policy & Regulation: Government officials, regulators, and policy analysts who design and implement solar support programmes.'),
            h2('sm8-s6-h3', 'The Future of Solar Energy'),
            p('sm8-s6-p4', 'Solar PV is expected to be the world\'s largest source of electricity by the mid-2030s. Key trends shaping this future include: continued cost reductions driven by technology improvements and manufacturing scale; rapid growth of solar-plus-storage systems; increasing use of BIPV and agrivoltaics; solar-powered green hydrogen production; and the integration of solar with electric vehicle charging infrastructure.'),
            bullet('sm8-s6-b-uk', 'United Kingdom: The UK is expected to witness significant growth in utility-scale solar farms, with smart grid technologies evolving to better accommodate increasing solar capacity. Hybrid energy projects — solar farms integrated with energy storage systems and wind turbines — will become more common. This combined approach supports the government target of 70 gigawatts of ground and rooftop solar capacity by 2035, representing a five-fold increase on current installed capacity.'),
            p('sm8-s6-p5', 'The environmental benefits of solar are significant and grow over the lifetime of an installation. Solar panels typically repay their manufacturing energy debt within 1-4 years of operation, after which they generate clean electricity for 25-40 years. Modern panels are increasingly designed for end-of-life recycling, addressing concerns about module waste as the industry scales.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm8-s6-callout',
          variant: 'info',
          title: 'Solar\'s Environmental Payback',
          body: 'A modern solar panel typically offsets the carbon emissions associated with its manufacture within 1-4 years of operation -- and then continues generating clean electricity for a further 25-40 years. Over its lifetime, a typical 400W solar panel prevents approximately 8-12 tonnes of CO2 from entering the atmosphere.',
        },
      ],
    },


    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm8-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'solar-energy-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm8-conc-text',
          content: [
            h2('sm8-conc-h1', 'Sub-Module Summary'),
            p('sm8-conc-p1', 'This sub-module has explored solar energy — the fastest cost-reducing energy technology in history. Solar photovoltaic (PV) costs have fallen by over 90% in the last decade, making solar the cheapest source of new electricity generation in most parts of the world. Monocrystalline silicon panels now dominate the market due to their superior efficiency (20–23%), though polycrystalline and thin-film technologies each have roles in cost-sensitive and building-integrated applications respectively.'),
            p('sm8-conc-p2', 'The inverter is as critical to a solar system as the panel itself — converting DC output to AC for grid compatibility, enabling Maximum Power Point Tracking (MPPT), and increasingly incorporating battery management and grid export controls. Grid integration at scale requires careful management of solar\'s intermittency: utility-scale battery storage, smart grid controls, and demand flexibility are all maturing to support high solar penetration. Agrivoltaics, floating solar, and Building-Integrated PV (BIPV) are expanding the deployment footprint beyond traditional ground-mount and rooftop installations.'),
            p('sm8-conc-p3', 'Innovation continues apace: bifacial panels capture reflected light from both surfaces, perovskite solar cells promise efficiencies exceeding 30% at low manufacturing cost, and tandem architectures combining multiple materials are approaching the physical limits of conversion efficiency. The human dimension — skills, diversity, and workforce development — is an increasingly important factor as solar employment grows globally. Solar\'s low environmental payback period (typically 1–4 years), zero operational emissions, and modularity from rooftop to gigawatt-scale make it a cornerstone technology of the energy transition.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm8-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 8',
          body: 'You now have a comprehensive understanding of solar energy — from panel technologies and inverter systems to grid integration, innovation frontiers, and the workforce driving the sector forward. Solar\'s continued cost reduction and versatility make it one of the most important tools in achieving global net zero.',
        },
      ],
    },
    {
      _id: 'sm8-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'solar-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm8-col-quiz',
          subModuleSlug: 'solar',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
