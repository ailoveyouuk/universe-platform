// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 11: Green Hydrogen
// Source: MOD1_SUB11_HYDROGEN.pdf pages 4–37
//
// Phase 1 images served from /public/images/sm11/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  hydrogenProductionChart,
  hydrogenCostChart,
  hydrogenSectorsChart,
  electrolyserChart,
} from './sm11-charts'

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
  return { _type: 'image', asset: { _ref: `/images/sm11/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm11/${filename}` }
}

export const subModule11: SubModule = {
  _id: 'sm-11',
  title: 'SM 11 - Green Hydrogen',
  slug: { _type: 'slug', current: 'hydrogen' },
  orderIndex: 11,
  estimatedHours: 2,
  learningObjectives: [
    'Explain the properties of hydrogen as an energy carrier and distinguish between different "colours" of hydrogen',
    'Describe the main methods of hydrogen production, including steam methane reforming, coal gasification, and electrolysis',
    'Compare the key electrolysis technologies: alkaline, PEM, and SOEC',
    'Explain how hydrogen is stored and transported in compressed, liquid, and chemical forms',
    'Describe how hydrogen fuel cells convert hydrogen to electricity and their key advantages',
    'Assess the current and projected costs of green hydrogen and the barriers to its deployment',
    'Evaluate the role of hydrogen in decarbonising hard-to-abate sectors and the global hydrogen landscape',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to Hydrogen ───────────────────────────────────
    {
      _id: 'sm11-sec-1-intro',
      title: 'Introduction to Hydrogen as an Energy Carrier',
      slug: { _type: 'slug', current: 'hydrogen-introduction' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm11-s1-hero',
          image: localImage('Images/AdobeStock_1060117239.webp', 'Green hydrogen electrolysis facility with wind turbines'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm11-s1-text',
          content: [
            h2('sm11-s1-h1', 'What is Hydrogen?'),
            p('sm11-s1-p1', 'Hydrogen is the lightest and most abundant element in the universe, but it rarely exists in its pure form on Earth. As an energy carrier -- like electricity -- hydrogen does not occur naturally as a fuel; it must be produced from other energy sources. When burned or used in a fuel cell, hydrogen releases energy and produces only water as a by-product, making it potentially one of the cleanest energy sources available.'),
            p('sm11-s1-p2', 'Hydrogen has been produced and used in industry for over 100 years -- primarily in chemical manufacturing (ammonia for fertilisers), oil refining, and the production of methanol. The concept of "green hydrogen" -- produced using renewable electricity -- is now at the centre of global decarbonisation strategies.'),
            h2('sm11-s1-h2', 'The Colours of Hydrogen'),
            p('sm11-s1-p3', 'Hydrogen is often categorised by "colour" based on how it was produced -- reflecting its associated carbon emissions:'),
            bullet('sm11-s1-b1', 'Grey Hydrogen: Produced from natural gas via steam methane reforming (SMR), without carbon capture. The most common form today. Produces approximately 9-12 kg of CO2 per kg of hydrogen.'),
            bullet('sm11-s1-b2', 'Blue Hydrogen: Also produced from natural gas or coal, but with carbon capture and storage (CCS) to trap the CO2 by-product. Significantly lower emissions than grey hydrogen, but still fossil-fuel dependent.'),
            bullet('sm11-s1-b3', 'Green Hydrogen: Produced by electrolysis of water using renewable electricity. Produces zero direct carbon emissions. Currently more expensive but falling in cost rapidly.'),
            bullet('sm11-s1-b4', 'Turquoise Hydrogen: Produced by methane pyrolysis -- splitting natural gas into hydrogen and solid carbon (rather than CO2). A low-emission alternative if the carbon is stored or used productively.'),
            bullet('sm11-s1-b5', 'Pink/Red Hydrogen: Produced by electrolysis powered by nuclear energy. Low-carbon, but uses expensive electricity.'),
            h2('sm11-s1-h3', 'Applications of Green Hydrogen'),
            p('sm11-s1-p4', 'Green hydrogen\'s applications span multiple sectors -- making it uniquely valuable in the energy transition. In transportation, hydrogen fuel cells power vehicles -- from passenger cars and buses to trains, ships, and even aircraft -- providing a clean alternative to internal combustion engines. In industry, hydrogen is an essential feedstock for producing steel, chemicals, and fertilisers, and can decarbonise high-temperature industrial heat processes where electrification is impractical.'),
            p('sm11-s1-p5', 'Hydrogen also plays a role in long-duration energy storage -- storing surplus renewable electricity as hydrogen for use when demand exceeds renewable supply. Hydrogen and its derivatives (ammonia, methanol) can also be traded internationally, enabling energy-rich regions to export clean energy to energy-importing nations.'),
          ],
        },
        {
          _type: 'hydrogenColoursDiagram' as const,
          _key: 'sm11-s1-colours',
          title: 'The Hydrogen Colour Spectrum',
        },
        hydrogenProductionChart,
        {
          _type: 'calloutBlock', _key: 'sm11-s1-callout',
          variant: 'info',
          title: 'Why Hydrogen Matters for Hard-to-Abate Sectors',
          body: 'Electrification -- direct use of electricity -- is the most efficient way to decarbonise most energy uses. But some sectors are genuinely hard to electrify directly: steel manufacturing requires reducing agents, aviation needs high-energy-density liquid fuels, and shipping cannot easily carry batteries heavy enough for long voyages. Hydrogen and its derivatives are among the very few viable low-carbon alternatives for these critical industries.',
        },
      ],
    },

    // ── SECTION 2: Methods of Hydrogen Production ─────────────────────────────
    {
      _id: 'sm11-sec-2-production',
      title: 'Methods of Hydrogen Production',
      slug: { _type: 'slug', current: 'hydrogen-production-methods' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm11-s2-hero',
          image: localImage('Images/AdobeStock_558234137.webp', 'Hydrogen electrolysis equipment'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm11-s2-text',
          content: [
            h2('sm11-s2-h1', 'Steam Methane Reforming (SMR)'),
            p('sm11-s2-p1', 'Steam methane reforming is by far the most common hydrogen production method today, accounting for approximately 48% of global supply. High-temperature steam (700-1,000 degrees C) reacts with methane (natural gas) in the presence of a catalyst to produce hydrogen and carbon monoxide. A further reaction converts the CO to CO2 and more H2. The process releases significant CO2 unless carbon capture is applied (making it "blue" hydrogen).'),
            h2('sm11-s2-h2', 'Coal Gasification'),
            p('sm11-s2-p2', 'Coal gasification accounts for around 30% of global hydrogen production, primarily in China. Coal is partially oxidised at high temperature to produce syngas (hydrogen and carbon monoxide), from which hydrogen is separated. This is a highly carbon-intensive process, producing even more CO2 per unit of hydrogen than SMR.'),
            h2('sm11-s2-h3', 'Electrolysis: The Key to Green Hydrogen'),
            p('sm11-s2-p3', 'Electrolysis uses electricity to split water molecules (H2O) into hydrogen (H2) and oxygen (O2). When powered by renewable electricity, this produces green hydrogen with near-zero life-cycle emissions. There are three main electrolysis technologies:'),
            h3('sm11-s2-h4', 'Alkaline Electrolysis (AEL)'),
            p('sm11-s2-p4', 'Alkaline electrolysis is the most mature and widely deployed electrolysis technology. An electric current is applied to a solution of water and an alkaline electrolyte (typically potassium hydroxide, KOH). Water molecules are split at the cathode, producing hydrogen and hydroxide ions. Alkaline electrolysers have lower capital costs and proven long-term durability, but are less flexible in responding to variable renewable power inputs.'),
            h3('sm11-s2-h5', 'Proton Exchange Membrane (PEM) Electrolysis'),
            p('sm11-s2-p5', 'PEM electrolysers use a solid polymer membrane as the electrolyte, which allows protons (H+) to pass through while blocking electrons. At the anode, water is split into oxygen, protons, and electrons. At the cathode, protons combine with electrons to produce hydrogen. PEM electrolysers respond rapidly to fluctuating renewable energy inputs, making them particularly well-suited to integration with variable solar and wind power.'),
            h3('sm11-s2-h6', 'Solid Oxide Electrolyser Cells (SOEC)'),
            p('sm11-s2-p6', 'SOEC technology operates at very high temperatures (700-1,000 degrees C), which significantly improves electrical efficiency. By using waste heat from industrial processes, SOEC can achieve very high overall efficiencies. Still at an earlier stage of commercial development than AEL or PEM, SOEC shows long-term promise for large-scale industrial hydrogen production.'),
            h3('sm11-atr-h1', 'Autothermal Reforming (ATR) with Carbon Capture'),
            p('sm11-atr-p1', 'Autothermal Reforming (ATR) is an efficient method for producing blue hydrogen — hydrogen from natural gas with carbon capture and storage. In ATR, methane reacts with both steam and oxygen in a single reactor, generating syngas (a mixture of hydrogen and carbon monoxide) through a self-sustaining process that does not require external heat input, unlike conventional Steam Methane Reforming (SMR).'),
            bullet('sm11-atr-b1', 'Higher Carbon Capture Rates: ATR can achieve CO₂ capture rates of 90-95%, compared to around 85-90% for SMR with CCS, making it increasingly preferred for blue hydrogen production where near-zero emissions are required.'),
            bullet('sm11-atr-b2', 'Efficiency Advantage: The autothermal process is more thermally efficient than SMR, and the higher temperature outputs are better suited to integration with carbon capture systems.'),
            bullet('sm11-atr-b3', 'Industrial Scale: ATR is well suited to large-scale blue hydrogen production, and several major hydrogen projects in Norway, the Netherlands, and the UK are selecting ATR as their preferred production technology.'),
          ],
        },
        electrolyserChart,
        {
          _type: 'calloutBlock', _key: 'sm11-s2-callout',
          variant: 'key-fact',
          title: 'Technological Progress in Electrolysers',
          body: 'Electrolyser costs have fallen significantly -- from around $1,000/kW in 2010 to below $500/kW in 2023 for alkaline systems -- and are projected to fall further to $200-300/kW by 2030 as manufacturing scales up. IRENA predicts that electrolyser costs could fall by 50% by 2030 through economies of scale and technological innovations, making green hydrogen increasingly competitive.',
        },
      ],
    },

    // ── SECTION: Thermochemical Water Splitting ───────────────────────────────
    {
      _id: 'sm11-sec-thermochem',
      title: 'Thermochemical Water Splitting',
      slug: { _type: 'slug', current: 'hydrogen-thermochemical-water-splitting' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm11-thermochem-text',
          content: [
            h2('sm11-tc-h1', 'Thermochemical Water Splitting'),
            p('sm11-tc-p1', 'Thermochemical water splitting uses heat and chemical reactions to split water into hydrogen and oxygen — without requiring electricity as the primary energy input. This makes it potentially well-suited for integration with high-temperature heat sources such as nuclear reactors or concentrated solar power systems, producing hydrogen at high efficiency without the losses inherent in converting heat to electricity before electrolysis.'),
            h3('sm11-tc-h2', 'Sulfur-Iodine (S-I) Cycle'),
            p('sm11-tc-p2', 'The Sulfur-Iodine cycle is one of the most researched thermochemical hydrogen production processes. It involves three chemical reactions in a closed loop: water is split using sulphur dioxide and iodine at different temperature stages, ultimately yielding hydrogen and oxygen. Operating temperatures of around 800-1,000°C mean this cycle is particularly well matched to high-temperature nuclear reactors such as the Very High Temperature Reactor (VHTR).'),
            h3('sm11-tc-h3', 'Hybrid Sulfur (HyS) Cycle'),
            p('sm11-tc-p3', 'The Hybrid Sulfur cycle combines thermochemical and electrochemical steps. The thermal decomposition of sulphuric acid produces SO₂ and oxygen at high temperatures, while an electrochemical step using SO₂ and water produces hydrogen at a relatively low electrolyser voltage — significantly reducing the electricity input compared to conventional water electrolysis.'),
            h3('sm11-tc-h4', 'Other Thermochemical Cycles'),
            bullet('sm11-tc-b1', 'Calcium-Bromine Cycle: A lower-temperature thermochemical cycle (around 700°C) that uses calcium and bromine compounds in a series of chemical reactions to split water.'),
            bullet('sm11-tc-b2', 'Iron Oxide Cycle: Uses the cyclic oxidation and reduction of iron oxide materials at high temperatures to produce hydrogen, with concentrated solar power as the heat source in some experimental designs.'),
            bullet('sm11-tc-b3', 'Zinc-Oxide Cycle: Uses solar-concentrated heat to drive the reduction of zinc oxide to zinc metal, which then reacts with water to produce hydrogen and regenerate zinc oxide.'),
            p('sm11-tc-p4', 'While thermochemical water splitting remains primarily at the research and demonstration stage, it represents a promising long-term pathway for large-scale, low-carbon hydrogen production — particularly as nuclear and solar thermal technologies scale up.'),
          ],
        },
      ],
    },

    // ── SECTION 3: Storage, Transportation & Fuel Cells ──────────────────────
    {
      _id: 'sm11-sec-3-storage',
      title: 'Hydrogen Storage, Transportation & Fuel Cells',
      slug: { _type: 'slug', current: 'hydrogen-storage-fuel-cells' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm11-s3-hero',
          image: localImage('Images/AdobeStock_1081153279.webp', 'Hydrogen fuel cell vehicle charging station'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm11-s3-text',
          content: [
            h2('sm11-s3-h1', 'The Challenge of Hydrogen Storage & Transportation'),
            p('sm11-s3-p1', 'Hydrogen is the lightest element in the periodic table. While this means it has a very high energy content per unit of mass (approximately 3x that of natural gas), its low density at ambient conditions means it has a very low energy content per unit of volume -- making storage and transportation challenging and expensive.'),
            h3('sm11-s3-h2', 'Compressed Gas Storage'),
            p('sm11-s3-p2', 'Hydrogen gas is compressed to high pressures (typically 350-700 bar) to reduce its volume for storage and transportation. The cylinders or tanks are made from steel, aluminium, or composite materials, often reinforced with fibreglass. This is the most common form of hydrogen storage today -- used in hydrogen vehicles and industrial applications.'),
            h3('sm11-s3-h3', 'Liquid Hydrogen'),
            p('sm11-s3-p3', 'To liquify hydrogen, it must be cooled to -252.87 degrees C (just above absolute zero). Liquid hydrogen has a much higher energy density by volume than compressed gas -- approximately 70.8 kg/m3 versus 0.09 kg/m3 at atmospheric pressure. However, liquefaction requires significant energy (around 30-40% of the hydrogen\'s energy content) and specialised cryogenic infrastructure.'),
            h3('sm11-s3-h4', 'Chemical Storage: Ammonia & Other Carriers'),
            p('sm11-s3-p4', 'Hydrogen can be stored chemically by converting it to ammonia (NH3), methanol, or liquid organic hydrogen carriers (LOHCs). Ammonia, produced by combining hydrogen with nitrogen, is already traded globally in vast quantities and uses existing shipping infrastructure. "Green ammonia" produced from green hydrogen offers a pathway to decarbonise fertiliser production and potentially shipping fuel.'),
            h2('sm11-s3-h5', 'How Hydrogen Fuel Cells Work'),
            p('sm11-s3-p5', 'A hydrogen fuel cell operates by converting the chemical energy of hydrogen directly into electricity through an electrochemical reaction -- essentially the reverse of electrolysis. Hydrogen gas is supplied to the anode, where it is split into protons and electrons. The protons pass through the electrolyte to the cathode, while the electrons travel through an external circuit, generating an electric current. At the cathode, protons, electrons, and oxygen combine to produce water -- the only exhaust product.'),
            bullet('sm11-s3-b1', 'Zero Emissions: Fuel cells produce no carbon dioxide during operation -- only water vapour. They are one of the cleanest possible energy conversion technologies.'),
            bullet('sm11-s3-b2', 'High Efficiency: Fuel cells convert up to 60% of hydrogen\'s chemical energy to electricity (rising to 80-85% in combined heat and power mode) -- significantly more efficient than combustion engines.'),
            bullet('sm11-s3-b3', 'Flexibility: Fuel cells can power anything from mobile phones to buses to ships. They are particularly suited to applications requiring long range or rapid refuelling.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm11-s3-callout',
          variant: 'warning',
          title: 'The Hydrogen Economy Needs Infrastructure Investment',
          body: 'One of the biggest barriers to hydrogen deployment is infrastructure. Developing dedicated hydrogen pipelines, refuelling stations, storage facilities, and port terminals requires enormous investment -- potentially trillions of dollars globally. The EU, US, Japan, and South Korea are all investing heavily in hydrogen infrastructure, but coordination between supply and demand is critical to avoid "chicken and egg" investment paralysis.',
        },
      ],
    },

    // ── SECTION 4: The Future of Hydrogen ─────────────────────────────────────
    {
      _id: 'sm11-sec-4-future',
      title: 'The Future of Green Hydrogen',
      slug: { _type: 'slug', current: 'hydrogen-future' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm11-s4-hero',
          image: localImage('Images/AdobeStock_1367561858.webp', 'Future hydrogen economy concept'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm11-s4-text',
          content: [
            h2('sm11-s4-h1', 'Geographic Readiness'),
            p('sm11-s4-p1', 'Countries worldwide are developing national hydrogen strategies, with varying levels of ambition and readiness:'),
            bullet('sm11-s4-b1', 'Germany: At the forefront of European hydrogen development, with strong government support through the Hydrogen IPCEI. Germany aims to produce 5 GW of hydrogen capacity by 2030 and to import large quantities of green hydrogen from partner countries.'),
            bullet('sm11-s4-b2', 'United States: Aims to produce 10 million metric tonnes of clean hydrogen annually by 2030. The Inflation Reduction Act provides a $3/kg production tax credit for clean hydrogen, dramatically improving economics.'),
            bullet('sm11-s4-b3', 'Australia: Emerging as a potential major green hydrogen exporter, leveraging its abundant solar and wind resources. Several large-scale projects are in development targeting export to Japan and South Korea.'),
            bullet('sm11-s4-b4', 'Middle East & North Africa: Countries including Saudi Arabia, UAE, and Morocco are positioning themselves as future hydrogen exporters, using their vast solar resources to produce competitive green hydrogen at scale.'),
            bullet('sm11-geo-netherlands', 'Netherlands (NortH2 Project): The NortH2 project aims to develop 4 GW of dedicated offshore wind capacity to power large-scale green hydrogen production by 2030, with a vision to scale to 10 GW by 2040. The Netherlands\' existing gas infrastructure and North Sea wind resources make it a prime location for green hydrogen export to the rest of Europe.'),
            bullet('sm11-geo-japan', 'Japan: Japan launched the world\'s first national hydrogen strategy in 2017 and has set a target of 3 million tonnes of hydrogen supply per year by 2030. Companies including Kawasaki Heavy Industries and Toshiba are developing hydrogen import infrastructure and fuel cell systems, while Japan is building international hydrogen supply chains with Australia and the Middle East.'),
            bullet('sm11-geo-southkorea', 'South Korea: South Korea has set an ambitious target of 15 GW of hydrogen fuel cell capacity by 2040 and aims to have 6.2 million hydrogen fuel cell vehicles on the road by 2040. South Korea is investing heavily in both domestic production and hydrogen import infrastructure, and its industrial conglomerates are developing hydrogen applications for heavy industry and shipping.'),
            h2('sm11-s4-h2', 'Financial Viability & Cost Trajectory'),
            p('sm11-s4-p2', 'Green hydrogen currently costs approximately $4-8 per kilogram to produce in most regions -- significantly more than grey hydrogen at $1-2.50/kg. However, the cost of green hydrogen is expected to fall substantially as electrolyser costs decline and renewable electricity becomes cheaper. IRENA projects green hydrogen could reach $1.50-3.00/kg in the best locations by 2030.'),
            p('sm11-s4-p3', 'The cost of natural gas significantly influences the economics of blue hydrogen -- which accounts for 45-75% of production costs. Rising gas prices make blue hydrogen more expensive and green hydrogen relatively more competitive. The long-term trajectory strongly favours green hydrogen as renewable costs continue to fall.'),
            h2('sm11-s4-h3', 'The Future Hydrogen Economy'),
            p('sm11-s4-p4', 'For hydrogen to fulfil its potential, it needs to be used across a wide range of applications simultaneously, creating a "hydrogen economy." Key future trends include: continued cost reduction via electrolyser scale-up and renewable energy cost reductions; development of hydrogen infrastructure including pipelines, ships, and storage facilities; the growth of green ammonia for fertilisers, shipping, and power; and the maturation of hydrogen fuel cells for heavy transport.'),
          ],
        },
        {
          _type: 'hydrogenLandscapeDiagram' as const,
          _key: 'sm11-s4-landscape',
          title: 'The Hydrogen Economy Landscape',
        },
        hydrogenCostChart,
        hydrogenSectorsChart,
        {
          _type: 'calloutBlock', _key: 'sm11-s4-callout',
          variant: 'info',
          title: 'Conclusion: Hydrogen\'s Role in the Energy Transition',
          body: 'There are different colours of hydrogen depending on how it is produced. Hydrogen is currently difficult and expensive to transport and store, requiring significant infrastructure investment. However, hydrogen and its derivatives offer the potential to decarbonise hard-to-abate sectors like aviation, glass and steel production, and shipping -- sectors that cannot easily be electrified directly. The future of the energy transition will very likely include hydrogen as a key part of the clean energy portfolio.',
        },
      ],
    },


    // ── SECTION 1b: History of Hydrogen ───────────────────────────────────────
    {
      _id: 'sm11-sec-1b-history',
      title: 'History of Hydrogen',
      slug: { _type: 'slug', current: 'hydrogen-history' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'grovesFuelCellDiagram' as const, _key: 'sm11-s1b-hero',
        },
        {
          _type: 'richText', _key: 'sm11-s1b-text',
          content: [
            h2('sm11-s1b-h1', 'A Century of Hydrogen Research'),
            p('sm11-s1b-p1', 'Hydrogen has a long scientific history stretching back to the 17th century, but it is only now being developed at scale for energy use. Understanding this history puts the current green hydrogen revolution in context -- many of the core technologies in use today were first demonstrated over a century ago. The challenge has always been economic viability, not scientific feasibility.'),
            p('sm11-s1b-p2', 'Hydrogen has been produced and used in the chemicals industry for over 100 years -- primarily in the synthesis of ammonia for fertilisers and in oil refining. The transition from industrial feedstock to energy carrier is the defining challenge of the current decade, as cost reductions in renewable energy finally make green hydrogen economically plausible at scale.'),
            h2('sm11-s1b-h2', 'Key Milestones in Hydrogen History'),
            bullet('sm11-s1b-b1', '1671 -- Hydrogen was first discovered when iron filings were dissolved in sulphuric acid, releasing a flammable gas. The element was later formally identified and named "hydrogen" (water-former) by Antoine Lavoisier in 1783.'),
            bullet('sm11-s1b-b2', '1800 -- The discovery of electrolysis by William Nicholson and Anthony Carlisle demonstrated that water could be split into hydrogen and oxygen using an electric current -- the foundational principle of green hydrogen production.'),
            bullet('sm11-s1b-b3', '1839 -- Sir William Grove demonstrated the first hydrogen fuel cell, the "Gaseous Voltaic Battery," showing that hydrogen and oxygen could react electrochemically to produce electricity. This invention preceded the internal combustion engine.'),
            bullet('sm11-s1b-b4', '1966 -- General Motors demonstrated the first vehicle powered by hydrogen, a modified van called the Electrovan, using a fuel cell system. The technology was too expensive for commercialisation at the time.'),
            bullet('sm11-s1b-b5', '1974 -- The International Energy Agency (IEA) was founded in response to the oil crisis, with a mandate that would eventually extend to tracking and promoting hydrogen as an energy carrier.'),
            bullet('sm11-s1b-b6', '2002 -- The world\'s first hydrogen-powered mining vehicle entered service, demonstrating hydrogen\'s potential in heavy industrial applications where battery weight and recharging time are impractical.'),
            bullet('sm11-s1b-b7', '2004 -- The world\'s first hydrogen-powered autonomous underwater vehicle (AUV) was deployed, using a fuel cell to provide extended mission duration without the exhaust gases that would compromise a submarine environment.'),
            bullet('sm11-s1b-b8', '2009 -- The world\'s first 100% hydrogen power plant became operational. The same year, the International Renewable Energy Agency (IRENA) was established, with hydrogen later becoming central to its energy transition analysis.'),
            bullet('sm11-s1b-b9', '2017 -- The Hydrogen Council, a global alliance of multinational companies, was formed to accelerate hydrogen deployment across energy, transport, industry, and buildings.'),
            bullet('sm11-s1b-b10', '2019 -- The world\'s first hydrogen-powered aircraft completed its inaugural flight, demonstrating the technology\'s potential for zero-emission aviation.'),
            bullet('sm11-s1b-b11', '2020 -- The world\'s first hydrogen tugboat entered service, a significant milestone for decarbonising maritime port operations.'),
            bullet('sm11-s1b-b12', '2021 -- The EU Clean Hydrogen Partnership was formed as a public-private partnership to accelerate the commercialisation of green hydrogen across Europe.'),
            bullet('sm11-s1b-b13', '2023 -- The world\'s first hydrogen-powered ferry became operational. The same year, the world\'s first underground hydrogen storage facility was commissioned, demonstrating long-duration seasonal storage of hydrogen in geological formations.'),
            h2('sm11-s1b-h3', 'Different Methods of Hydrogen Production'),
            p('sm11-s1b-p3', 'The history of hydrogen production reflects the energy sources available in each era. Coal gasification dominated in the 19th and early 20th centuries. Steam methane reforming from natural gas became the dominant method from the mid-20th century onward, reflecting the growth of the natural gas industry. Electrolysis -- the technology needed for green hydrogen -- has been known since 1800 but has only recently become cost-competitive thanks to falling renewable electricity prices and advances in electrolyser manufacturing.'),
            p('sm11-s1b-p4', 'Today, the global hydrogen industry is at an inflection point. Scaling up green hydrogen from a small fraction of global production to the dominant form requires overcoming cost, infrastructure, and regulatory barriers -- but the trajectory is clear. Every major economy has a national hydrogen strategy, and investment is accelerating rapidly.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm11-s1b-callout',
          variant: 'info',
          title: 'From Laboratory to Energy Transition Cornerstone',
          body: 'The hydrogen fuel cell was invented in 1839 -- 16 years before the first commercial oil well was drilled. For most of the intervening 185 years, hydrogen remained a laboratory curiosity and industrial chemical. It is only now, as the combination of cheap renewable electricity, advanced electrolysers, and urgent climate targets converge, that hydrogen is finally fulfilling its potential as an energy carrier. The science has always been sound; the economics are finally catching up.',
        },
      ],
    },

    // ── SECTION 3b: Hydrogen Fuel Cells ───────────────────────────────────────
    {
      _id: 'sm11-sec-3b-fuelcells',
      title: 'Hydrogen Fuel Cells',
      slug: { _type: 'slug', current: 'hydrogen-fuel-cells' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'hydrogenFuelCellDiagram' as const,
          _key: 'sm11-s3b-fuelcell',
          title: 'How a Hydrogen Fuel Cell Works (PEM)',
        },
        {
          _type: 'richText', _key: 'sm11-s3b-text',
          content: [
            h2('sm11-s3b-h1', 'How Hydrogen Fuel Cells Work'),
            p('sm11-s3b-p1', 'A hydrogen fuel cell operates by converting the chemical energy of hydrogen directly into electricity through an electrochemical reaction -- rather than by combustion. This means that, unlike an engine, a fuel cell has no moving parts in its core reaction, produces no exhaust gases other than water vapour, and operates at high efficiency across a wide range of output levels.'),
            p('sm11-s3b-p2', 'The process mirrors electrolysis in reverse. In electrolysis, electricity splits water into hydrogen and oxygen. In a fuel cell, hydrogen and oxygen recombine to produce electricity and water. The overall cell reaction is: 2H₂ + O₂ → 2H₂O + electricity + heat.'),
            h3('sm11-s3b-h2', 'Step-by-Step: The Fuel Cell Reaction'),
            bullet('sm11-s3b-b1', 'Step 1 -- Hydrogen at the Anode: Hydrogen gas (H₂) is fed to the anode (negative electrode). A platinum catalyst splits each hydrogen molecule into two protons (H⁺) and two electrons (e⁻).'),
            bullet('sm11-s3b-b2', 'Step 2 -- Proton Conduction: The protons pass through the electrolyte membrane from the anode to the cathode. The membrane is designed to conduct protons but block electrons.'),
            bullet('sm11-s3b-b3', 'Step 3 -- Electron Flow (Electricity): The electrons, unable to pass through the membrane, travel through an external circuit -- generating the electric current that powers the device.'),
            bullet('sm11-s3b-b4', 'Step 4 -- Recombination at the Cathode: On the cathode side, oxygen from the air combines with the arriving protons and electrons to form water (H₂O). This water is the only by-product of the reaction.'),
            h2('sm11-s3b-h3', 'Fuel Cell Advantages'),
            bullet('sm11-s3b-b5', 'Zero Carbon Emissions: Fuel cells produce no carbon dioxide during operation -- only water vapour. They are one of the cleanest possible energy conversion technologies and are suitable in environments where exhaust gas emissions are unacceptable, such as underground mines and enclosed spaces.'),
            bullet('sm11-s3b-b6', 'High Efficiency: Fuel cells convert up to 60% of the chemical energy in hydrogen directly to electricity. When waste heat is also captured (combined heat and power, CHP mode), overall system efficiency can reach 80-85% -- significantly higher than internal combustion engines, which typically achieve 25-35%.'),
            bullet('sm11-s3b-b7', 'Long-Duration Energy Storage: Hydrogen produced during periods of excess renewable electricity can be stored for weeks or months, then converted back to electricity via fuel cells. This enables seasonal energy storage at a scale not achievable with batteries.'),
            bullet('sm11-s3b-b8', 'Rapid Refuelling: Unlike battery electric vehicles, hydrogen fuel cell vehicles can be refuelled in 3-5 minutes -- comparable to conventional petrol or diesel refuelling. This is a significant operational advantage for high-utilisation vehicles such as taxis, buses, and heavy trucks.'),
            h2('sm11-s3b-h4', 'Applications of Hydrogen Fuel Cells'),
            h3('sm11-s3b-h5', 'Transport'),
            p('sm11-s3b-p3', 'Hydrogen fuel cells offer longer ranges and faster refuelling times than battery electric vehicles, making them particularly well-suited to heavy-duty transport. Heavy trucks, buses, trains, and maritime ferries are among the most commercially advanced applications. Aviation is in the early stages of development, with projects like the Airbus ZEROe programme targeting hydrogen-powered commercial aircraft by the mid-2030s. Maritime applications are gaining traction, particularly for ferries and short-sea shipping.'),
            h3('sm11-s3b-h6', 'Stationary Power Generation'),
            p('sm11-s3b-p4', 'Fuel cells are widely used in backup power systems for critical infrastructure -- data centres, hospitals, and telecommunications facilities. They offer clean, silent, reliable power during grid outages without the air pollution and noise associated with diesel generators. Combined heat and power (CHP) fuel cell systems are also deployed in buildings, generating both electricity and useful heat from hydrogen.'),
            h3('sm11-s3b-h7', 'Industrial and Remote Applications'),
            p('sm11-s3b-p5', 'In industrial settings, hydrogen fuel cells can provide clean power for processes requiring continuous, reliable electricity -- including steel manufacturing, chemical production, and data centre operations. In remote or off-grid locations where grid access is limited, portable hydrogen fuel cell units can provide clean power to rural communities, military outposts, or disaster relief operations -- replacing diesel generators without the associated emissions and fuel logistics.'),
          ],
        },
        {
          _type: 'hydrogenVsEVDiagram' as const, _key: 'sm11-s3b-infographic',
        },
        {
          _type: 'calloutBlock', _key: 'sm11-s3b-callout',
          variant: 'key-fact',
          title: 'Fuel Cells vs. Batteries: Complementary, Not Competing',
          body: 'Hydrogen fuel cells and lithium-ion batteries are often portrayed as competing technologies, but they are better understood as complementary. Batteries excel at short-range, frequent-cycle applications where charging infrastructure is available. Fuel cells excel at long-range, rapid-refuelling, high-payload applications -- heavy trucks, buses, aviation, and shipping -- where battery weight and charging time create operational challenges. Both technologies will play important roles in the clean energy transition.',
        },
      ],
    },

    // ── SECTION 3c: Technology Development & Financial Viability ──────────────
    {
      _id: 'sm11-sec-3c-technology',
      title: 'Technology Development & Financial Viability',
      slug: { _type: 'slug', current: 'hydrogen-technology-financial' },
      estimatedMinutes: 20,
      content: [
        {
          _type: 'imageBlock', _key: 'sm11-s3c-hero',
          image: localImage('Images/SINOPEC.webp', 'Hydrogen storage tanks at Sinopec\'s Kuqa green hydrogen project, the world\'s largest'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm11-s3c-text',
          content: [
            h2('sm11-s3c-h1', 'Technology Development: Production'),
            p('sm11-s3c-p1', 'Rapid advances across all hydrogen technology sectors are driving down costs and improving performance. In hydrogen production, the focus is on making electrolysis more efficient, durable, and cost-effective to enable the scaling of green hydrogen.'),
            h3('sm11-s3c-h2', 'Electrolysis Advances'),
            bullet('sm11-s3c-b1', 'Electrode and Membrane Innovation: Advances in electrode design and membrane materials are improving durability and efficiency, extending the operational lifespans of electrolysers and reducing replacement costs.'),
            bullet('sm11-s3c-b2', 'Renewable Energy Integration: Electrolysers are becoming more adaptable to the variable power output of wind and solar, allowing them to ramp up and down rapidly without damaging system components.'),
            bullet('sm11-s3c-b3', 'Catalyst Cost Reduction: Research is actively reducing the amount of platinum and other precious metals required in PEM electrolyser catalysts -- a significant cost driver. Some researchers are exploring entirely catalyst-free electrolyser designs.'),
            bullet('sm11-s3c-b4', 'Modular Design: Modular electrolyser units allow for seamless integration and incremental scale-up of production plants, reducing capital risk and enabling projects to grow as hydrogen demand develops.'),
            h3('sm11-s3c-h3', 'Biomass Gasification Advances'),
            bullet('sm11-s3c-b5', 'Biological Assistance: Researchers are exploring the use of microbes to assist in biomass breakdown during the gasification process. Biological pre-treatment could lower the temperatures needed for gasification, significantly improving energy efficiency.'),
            h2('sm11-s3c-h4', 'Technology Development: Storage'),
            p('sm11-s3c-p2', 'Hydrogen\'s low volumetric energy density is one of the most significant engineering challenges for the hydrogen economy. Three storage approaches -- compressed gas, liquid hydrogen, and solid-state storage -- are each advancing rapidly.'),
            h3('sm11-s3c-h5', 'Compressed Hydrogen Gas'),
            bullet('sm11-s3c-b6', 'Nanomaterial Reinforcement: Researchers are experimenting with graphene and carbon nanotubes to reinforce the composite layers of high-pressure storage tanks, improving strength while reducing weight.'),
            bullet('sm11-s3c-b7', 'Hydrogen Hubs: The rise of dedicated hydrogen production, storage, and distribution hubs is creating economies of scale in compression and storage infrastructure, making pipeline-based distribution more economical.'),
            bullet('sm11-s3c-b8', 'Electrochemical Compressors: Novel electrochemical compression methods that use hydrogen ions rather than mechanical pistons are being developed to reduce the energy consumption of the compression process.'),
            h3('sm11-s3c-h6', 'Liquid Hydrogen'),
            bullet('sm11-s3c-b9', 'Advanced Insulation: Aerogels and other advanced insulating materials are being integrated into cryogenic storage tank walls to minimise boil-off losses -- the gradual evaporation of liquid hydrogen due to heat transfer from the environment.'),
            bullet('sm11-s3c-b10', 'Magnetic Refrigeration: Magnetocaloric materials -- which heat or cool in response to magnetic fields -- are being explored as a more energy-efficient alternative to traditional cryogenic refrigeration systems.'),
            h3('sm11-s3c-h7', 'Solid-State Storage'),
            bullet('sm11-s3c-b11', 'Metal-Organic Frameworks (MOFs): Advances in functionalised MOFs allow hydrogen adsorption at moderate pressures and temperatures, avoiding the energy cost of high-pressure or cryogenic storage.'),
            bullet('sm11-s3c-b12', 'Hybrid Materials: Researchers are combining MOFs with metal hydrides to create composite storage systems that benefit from MOFs\' high surface area and hydrides\' stable hydrogen storage characteristics.'),
            h2('sm11-s3c-h8', 'Technology Development: Usage'),
            h3('sm11-s3c-h9', 'Fuel Cells'),
            bullet('sm11-s3c-b13', 'Platinum-Free Catalysts: Developing platinum-free catalysts for PEM fuel cells is a key research priority. Platinum currently accounts for a significant share of fuel cell costs; replacing it would substantially reduce vehicle and stationary power costs.'),
            h3('sm11-s3c-h10', 'Hydrogen in Industry'),
            bullet('sm11-s3c-b14', 'Green Steel: Hydrogen is beginning to replace fossil fuels in steelmaking. It can act as both a fuel and a chemical reducing agent in the direct reduction of iron ore, producing iron without the coal-based blast furnace process. This pathway produces only water as a by-product rather than CO₂.'),
            bullet('sm11-s3c-b15', 'Refineries and Chemicals: Hydrogen is already widely used in oil refinery processes and chemical production. Switching to green hydrogen in these applications would eliminate significant existing industrial emissions without requiring new end-use processes.'),
            h3('sm11-s3c-h11', 'Power Generation'),
            bullet('sm11-s3c-b16', 'Hydrogen Gas Turbines: Existing natural gas power turbines are being adapted to operate on hydrogen blends or pure hydrogen fuel, offering a pathway to decarbonise gas-fired power generation using existing generation infrastructure.'),
            h2('sm11-s3c-h12', 'Financial Viability'),
            p('sm11-s3c-p3', 'Green hydrogen currently faces significant cost challenges compared to fossil-fuel alternatives, but the trajectory is strongly toward cost parity. The cheapest green hydrogen in Europe cost more than $150 per MWh without transport and storage in May 2023 -- compared to European natural gas prices below $32/MWh. However, this gap is narrowing rapidly as electrolyser costs fall and renewable electricity prices decline.'),
            bullet('sm11-s3c-b17', 'Electrolyser Costs: Electrolyser capital costs currently range from $500-$1,000 per kilowatt -- a major component of green hydrogen production costs. IRENA predicts these costs could fall by 50% by 2030 through economies of scale and manufacturing advances.'),
            bullet('sm11-s3c-b18', 'Production Targets: Green hydrogen is expected to reach $2 per kg in the best locations by 2030, making it competitive as a general industrial fuel depending on transport and storage logistics.'),
            bullet('sm11-s3c-b19', 'Policy Support: The US Inflation Reduction Act\'s $3/kg production tax credit for clean hydrogen has made green hydrogen near cost-competitive with fossil fuels in the US market, demonstrating how policy can bridge the cost gap during the technology scale-up phase.'),
            bullet('sm11-s3c-b20', 'Infrastructure Costs: Building hydrogen refuelling stations costs approximately $1-2 million per station -- significantly more than EV fast-charging installations. Developing dedicated hydrogen pipelines is expensive but can substantially reduce per-unit transport costs at scale.'),
            bullet('sm11-s3c-b21', 'Long-Term Demand Outlook: China alone wants to deploy 35 million tonnes of hydrogen capacity by 2030 and 60 million by 2050. IRENA estimates hydrogen could supply 12% of global energy demand by 2050, representing an enormous future market that justifies current investment at scale.'),
            bullet('sm11-s3c-b22', 'Hydrogen Truck Market: The hydrogen truck market alone is valued at $10.8 billion in 2025, with hydrogen vehicles already accounting for 2% of trucks in the EU. This reflects growing commercial confidence in hydrogen as a transport fuel for heavy haulage.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm11-s3c-callout',
          variant: 'key-fact',
          title: 'Blue Hydrogen\'s Gas Price Vulnerability',
          body: 'The cost of natural gas accounts for 45-75% of blue hydrogen production costs. When gas prices spike -- as they did across Europe in 2021-2022 following the Russian invasion of Ukraine -- blue hydrogen becomes dramatically more expensive. Green hydrogen, by contrast, is primarily exposed to electrolyser capital costs and renewable electricity prices -- both of which are falling. This structural difference makes green hydrogen increasingly attractive as a long-term, price-stable alternative to both grey and blue hydrogen.',
        },
      ],
    },

    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm11-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'hydrogen-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm11-conc-text',
          content: [
            h2('sm11-conc-h1', 'Sub-Module Summary'),
            p('sm11-conc-p1', 'This sub-module has provided a comprehensive introduction to hydrogen as an energy carrier and its central role in deep decarbonisation. The hydrogen colour spectrum — from grey (SMR without CCS) through blue (SMR with CCS) to green (electrolysis from renewable electricity) — reflects the range of production pathways, each with very different carbon intensities and cost profiles. Green hydrogen, produced via Proton Exchange Membrane (PEM) or alkaline electrolysers powered by wind or solar, is the ultimate goal: a truly zero-carbon fuel and feedstock with water vapour as its only combustion by-product.'),
            p('sm11-conc-p2', 'Thermochemical water-splitting routes — including the Sulphur-Iodine cycle and high-temperature steam electrolysis using nuclear heat — offer alternative production pathways at scale. Storage and transportation present significant engineering challenges: hydrogen\'s low volumetric density requires compression (700 bar for vehicles), liquefaction (−253°C), or chemical carriers such as ammonia or liquid organic hydrogen carriers (LOHCs) for long-distance shipping. Hydrogen fuel cells — particularly Proton Exchange Membrane Fuel Cells (PEMFCs) — convert hydrogen back to electricity with high efficiency and zero operational emissions, with fuel cell electric vehicles (FCEVs) demonstrating the technology\'s real-world viability.'),
            p('sm11-conc-p3', 'The most compelling near-term applications for hydrogen are in sectors that cannot easily electrify directly: steel production (H2-DRI replacing coal-based coke), heavy aviation and shipping (ammonia and synthetic fuels), and high-temperature industrial process heat. Cost reduction — driven by electrolyser scale-up, renewable electricity cost falls, and manufacturing learning curves — is the critical enabler. Government policy (hydrogen strategies, production subsidies, and demand mandates) is accelerating deployment, with the IEA and IRENA projecting hydrogen contributing 10–12% of global final energy demand by 2050 in net-zero scenarios.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm11-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 11',
          body: 'You now have a thorough understanding of green hydrogen — from production pathways and the colour spectrum through storage, transportation, fuel cells, and the hard-to-abate sectors where hydrogen will play its most important decarbonisation role.',
        },
      ],
    },
    {
      _id: 'sm11-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'hydrogen-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm11-col-quiz',
          subModuleSlug: 'hydrogen',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
