// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 9: Biomass Conversion
// Source: MOD1_SUB9_BIOMASS.pdf pages 4–23
//
// Phase 1 images served from /public/images/sm9/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  biomassCapacityChart,
  biomassFeedstockChart,
  biofuelRegionChart,
  biomassLcoeChart,
} from './sm9-charts'

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
  return { _type: 'image', asset: { _ref: `/images/sm9/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm9/${filename}` }
}

export const subModule9: SubModule = {
  _id: 'sm-9',
  title: 'SM 9 - Biomass Conversion',
  slug: { _type: 'slug', current: 'biomass' },
  orderIndex: 9,
  estimatedHours: 2,
  learningObjectives: [
    'Describe the history and role of biomass in the global renewable energy mix',
    'Identify the main types of biomass feedstocks and their relative advantages',
    'Explain the key biomass conversion technologies: direct combustion, gasification, and anaerobic digestion',
    'Distinguish between biochemical and thermochemical conversion processes and their energy outputs',
    'Compare the production routes, feedstocks, and applications of bioethanol and biodiesel',
    'Assess the economic, environmental, and social challenges and opportunities of biomass energy',
    'Evaluate the future role of bioenergy, including BECCS, in achieving net-zero emissions',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Overview & History ─────────────────────────────────────────
    {
      _id: 'sm9-sec-1-overview',
      title: 'Overview & History of Biomass Energy',
      slug: { _type: 'slug', current: 'biomass-overview-history' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm9-s1-hero',
          image: localImage('Images/AdobeStock_416761131.webp', 'Biomass energy plant with wood chip feedstock'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm9-s1-text',
          content: [
            h2('sm9-s1-h1', 'History of Biomass Energy'),
            p('sm9-s1-p1', 'Biomass, as a source of energy, has been utilised by civilisation since the time of early homo sapiens. In its simplest form, the heat energy produced by burning organic matter -- such as wood and dry grasses -- was used to provide warmth and for cooking. For the vast majority of human history, biomass was humanity\'s primary energy source.'),
            p('sm9-s1-p2', 'By the time of the Industrial Revolution and the turn of the 20th century, the higher energy density and efficiency of fossil fuels -- coal, then oil and gas -- propelled these energy types beyond biomass as Europe\'s and the world\'s primary energy source. However, biomass never disappeared; today it remains the world\'s largest source of renewable energy by primary energy supply, providing around 55% of all renewable energy according to the IEA.'),
            h2('sm9-s1-h2', 'The Role of Biomass in Renewable Energy'),
            p('sm9-s1-p3', 'Fundamentally, biomass energy relies on organic matter -- plants, wood, and agricultural waste. Organic waste is abundant in the world. As a result, biomass offers a very consistent supply of energy, unlike variable wind and solar. This dispatchability is highly attractive for grid operators needing reliable power.'),
            p('sm9-s1-p4', 'Biomass also offers flexibility: it can be used to generate heat, electricity, biogas, and liquid biofuels such as bioethanol and biodiesel. Since biomass often utilises waste materials -- agricultural residues, forest thinnings, municipal solid waste -- it can contribute to circular economy goals while providing energy.'),
            h2('sm9-s1-h3', 'Types of Biomass Resources'),
            bullet('sm9-s1-b1', 'Wood: Historically the most commonly used biomass resource, including firewood, wood chips, sawdust, and wood pellets (such as those used in Drax Power Station in the UK).'),
            bullet('sm9-s1-b2', 'Energy Crops: Crops grown specifically for energy, such as switchgrass, miscanthus, short-rotation coppice, and miscanthus. These offer high energy yields per hectare.'),
            bullet('sm9-s1-b3', 'Agricultural Waste: Straw, corn stalks, husks, and other residues from food production that would otherwise be discarded or burned in the field.'),
            bullet('sm9-s1-b4', 'Organic Municipal Waste: Food waste, garden waste, and other organic fractions of household and commercial waste that can be composted or converted to energy.'),
            bullet('sm9-s1-b5', 'Algae: An emerging feedstock with very high energy yields per unit area and the ability to grow on non-agricultural land using wastewater or seawater.'),
          ],
        },
        biomassCapacityChart,
        biomassFeedstockChart,
      ],
    },

    // ── SECTION: Biological and Chemical Properties ───────────────────────────
    {
      _id: 'sm9-sec-bio-chem',
      title: 'Biological and Chemical Properties of Biomass',
      slug: { _type: 'slug', current: 'biomass-biological-chemical-properties' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'richText',
          _key: 'sm9-bio-text',
          content: [
            h2('sm9-bio-h1', 'Biological and Chemical Properties of Biomass'),
            p('sm9-bio-p1', 'Understanding the biological and chemical properties of biomass is essential for optimising conversion processes and maximising energy output. These properties determine which conversion technology is most appropriate and how efficiently a given feedstock can be processed.'),
            h3('sm9-bio-h2', 'Composition'),
            p('sm9-bio-p2', 'Biomass is largely comprised of organic materials including proteins, lipids, and carbohydrates. The precise makeup of this organic matter determines the energy content of the feedstock and how easy or challenging it is to process through different conversion pathways.'),
            h3('sm9-bio-h3', 'Energy Density'),
            p('sm9-bio-p3', 'Energy density largely depends on the type of biomass. In general, liquid forms of biomass have higher energy density levels, making them well suited for transportation fuels. Solid forms of biomass typically have lower energy density levels, though this varies significantly between wood, agricultural residues, and other feedstocks.'),
            h3('sm9-bio-h4', 'Chemical Structure — Lignocellulosic Composition'),
            p('sm9-bio-p4', 'How digestible a type of biomass is and its conversion efficiency are heavily influenced by what is called the lignocellulosic structure — that is, the organic materials found within the cell walls of plants. Lignocellulosic biomass is composed of cellulose, hemicellulose, and lignin in varying proportions. The ratio of these three components significantly affects the efficiency of biochemical and thermochemical conversion processes.'),
            h3('sm9-bio-h5', 'Moisture and Ash Content'),
            p('sm9-bio-p5', 'Moisture content constrains the ability to generate heat from combustion — the same reason why dry wood is preferred for fires over damp wood. Water in the feedstock must be evaporated before combustion can occur efficiently, reducing the net energy output. Ash, produced when organic matter is burned, can also negatively affect combustion processes by fouling equipment and reducing thermal efficiency.'),
            h3('sm9-bio-h6', 'Biological Degradability'),
            p('sm9-bio-p6', 'The breaking down of organic matter by micro-organisms is a critical process for biochemical conversion technologies such as anaerobic digestion. However, the rate at which biological degradation takes place is heavily influenced by the feedstock\'s composition, moisture content, pH levels, and other environmental conditions. Optimising these parameters is key to maximising biogas or bioethanol yields.'),
          ],
        },
      ],
    },

    // ── SECTION 2: Conversion Technologies ───────────────────────────────────
    {
      _id: 'sm9-sec-2-conversion',
      title: 'Biomass Conversion Technologies & Processes',
      slug: { _type: 'slug', current: 'biomass-conversion-technologies' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm9-s2-hero',
          image: localImage('Images/AdobeStock_1044420631.webp', 'Biomass gasification plant'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm9-s2-text',
          content: [
            h2('sm9-s2-h1', 'Key Conversion Processes'),
            p('sm9-s2-p1', 'Biomass can be converted into useful energy through several distinct technological pathways, each suited to different feedstocks and energy products. Understanding the differences between these pathways is fundamental to biomass energy:'),
            h3('sm9-s2-h2', 'Direct Combustion'),
            p('sm9-s2-p2', 'Direct combustion is simply the process of burning biomass to generate thermal energy and/or steam. This steam can drive a turbine to generate electricity. Direct combustion is the most established and widely deployed biomass conversion technology -- used in everything from domestic wood burners to large power stations like Drax.'),
            p('sm9-s2-p3', 'As biomass conversion technology has advanced, combustion systems have become increasingly efficient, producing lower levels of emissions compared with older systems. Key innovations include high-efficiency boilers, combined heat and power (CHP) systems that utilise waste heat, and co-firing with other fuels.'),
            h3('sm9-s2-h3', 'Biomass Gasification'),
            p('sm9-s2-p4', 'Through a process of partial combustion in a controlled oxygen environment, biomass is transformed into a synthetic gas (syngas) comprised mostly of hydrogen (H2), carbon monoxide (CO), and methane (CH4). Once the gasification process is complete, the syngas can be used for internal combustion engines, gas turbines, or further refined to create liquid biofuels.'),
            p('sm9-s2-p5', 'Gasification is considered a more efficient process than direct combustion because it produces multiple usable energy products from a single process. Advanced gasification systems can achieve electrical efficiencies of 25-35%, rising to 70-80% in combined heat and power configurations.'),
            h3('sm9-s2-h4', 'Anaerobic Digestion (AD) and Biogas'),
            p('sm9-s2-p6', 'Anaerobic digestion occurs when micro-organisms break down organic matter in an oxygen-free environment, producing biogas -- a mixture of primarily methane (CH4, around 60%) and carbon dioxide (CO2). This biogas can be used directly for heating, electricity generation, or upgraded to biomethane (renewable natural gas) for injection into the gas grid.'),
            p('sm9-s2-p7', 'AD takes place in four distinct stages: hydrolysis, acidogenesis, acetogenesis, and methanogenesis. A key advantage is that AD also produces a nutrient-rich digestate that can be used as a fertiliser, creating a circular system. AD is particularly well-suited to wet feedstocks such as food waste, sewage sludge, and animal manure.'),
            h3('sm9-ferment-h1', 'Fermentation'),
            p('sm9-ferment-p1', 'Fermentation is one of the oldest known biological processes, and remains a critically important biomass conversion pathway for producing liquid biofuels. Many types of biomass contain sugars — either directly accessible (as in sugarcane and corn) or locked within the lignocellulosic structure (as in agricultural residues and wood). Micro-organisms such as yeasts and bacteria can break down these sugars through anaerobic fermentation, producing ethanol as the primary output.'),
            bullet('sm9-ferment-b1', 'Sugar Fermentation: Easily accessible sugars in feedstocks like sugarcane are fermented directly by yeast to produce bioethanol. This is the basis of Brazil\'s world-leading sugarcane ethanol industry.'),
            bullet('sm9-ferment-b2', 'Starch Fermentation: Starch-rich crops such as corn and wheat must first be broken down into sugars through hydrolysis before fermentation can occur. This two-step process is the basis of US corn ethanol production.'),
            bullet('sm9-ferment-b3', 'Lignocellulosic Fermentation: Breaking down the more complex lignocellulosic structure of agricultural residues and wood requires advanced pre-treatment and enzymatic hydrolysis steps, but offers the potential for high-volume, low-competition feedstocks for second-generation biofuels.'),
          ],
        },
        {
          _type: 'biomassConversionPathwaysDiagram' as const,
          _key: 'sm9-s2-pathways-diagram',
          title: 'Biomass Conversion Pathways',
          caption: 'Each feedstock type suits one or more conversion technologies, each producing a distinct energy output. Understanding this matching logic is central to biomass project development.',
        },
        {
          _type: 'anaerobicDigestionDiagram' as const,
          _key: 'sm9-s2-ad-diagram',
          title: 'The Four Stages of Anaerobic Digestion',
          caption: 'Anaerobic digestion proceeds through four microbial stages — hydrolysis, acidogenesis, acetogenesis, and methanogenesis — producing biogas (CH₄ + CO₂) and a nutrient-rich digestate by-product.',
        },
        {
          _type: 'calloutBlock', _key: 'sm9-s2-callout',
          variant: 'info',
          title: 'Choosing the Right Conversion Technology',
          body: 'The choice of biomass conversion technology depends primarily on the feedstock (wet or dry?), the desired energy output (heat, electricity, or transport fuel?), and the scale of the project. Wet feedstocks like food waste suit anaerobic digestion. Dry feedstocks like wood chips suit combustion or gasification. Understanding this match is essential for developing effective biomass projects.',
        },
      ],
    },

    // ── SECTION 3: Biomass-Based Fuels ───────────────────────────────────────
    {
      _id: 'sm9-sec-3-fuels',
      title: 'Biomass-Based Fuels: Bioethanol & Biodiesel',
      slug: { _type: 'slug', current: 'biomass-fuels' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm9-s3-hero',
          image: localImage('Images/AdobeStock_1056820259.webp', 'Biofuel production facility with corn feedstock'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm9-s3-text',
          content: [
            h2('sm9-s3-h1', 'Biochemical vs Thermochemical Conversion'),
            p('sm9-s3-p1', 'Biomass-based fuels are produced through two broad categories of conversion process:'),
            bullet('sm9-s3-b1', 'Biochemical Conversion: Uses micro-organisms or enzymes to break down biomass -- through fermentation, anaerobic digestion, or enzymatic hydrolysis. Produces bioethanol, biogas, and other liquid biofuels. Heat plays a relatively minor role.'),
            bullet('sm9-s3-b2', 'Thermochemical Conversion: Uses heat and chemical processes to convert biomass -- through combustion, gasification, or pyrolysis. Produces syngas, bio-oil, biochar, and heat/electricity.'),
            h2('sm9-s3-h2', 'Bioethanol'),
            p('sm9-s3-p2', 'Bioethanol is produced by fermenting carbohydrate-rich materials. During fermentation, sugars are converted into ethanol using micro-organisms (typically yeasts). Typical feedstocks include:'),
            bullet('sm9-s3-b3', 'First Generation (1G): Sugar and starch crops like sugarcane (Brazil), corn (USA), wheat, and sugar beet. High-yielding but compete with food production.'),
            bullet('sm9-s3-b4', 'Second Generation (2G): Agricultural residues, grasses, and wood (cellulosic ethanol). More sustainable but technically more challenging to produce.'),
            bullet('sm9-s3-b5', 'Third Generation (3G): Algae-based ethanol. Very high potential yields but still largely pre-commercial.'),
            p('sm9-s3-p3', 'Bioethanol has significant carbon-neutral potential. While combustion releases CO2, growing the feedstock crops absorbs roughly an equivalent amount of CO2 from the atmosphere -- creating a closed carbon cycle. Life-cycle greenhouse gas savings compared to petrol typically range from 40-90%, depending on feedstock and production method.'),
            h2('sm9-s3-h3', 'Biodiesel'),
            p('sm9-s3-p4', 'Biodiesel is increasingly being seen as a sustainable alternative to conventional diesel for cars, machinery, and public transport. Unlike bioethanol, which is a biochemical process, biodiesel production is a physiochemical conversion process called transesterification.'),
            p('sm9-s3-p5', 'Biodiesel is usually produced from waste cooking oils, animal fats (tallow), and vegetable oils (rapeseed, soya, palm). The process combines the oil with an alcohol (usually methanol) in the presence of a catalyst to produce fatty acid methyl esters (FAME) -- biodiesel -- and glycerol as a by-product.'),
            p('sm9-s3-p6', 'Biodiesel can be blended with conventional diesel in most proportions, or used as 100% "neat" biodiesel in adapted engines. B5 (5% biodiesel) and B20 (20% biodiesel) blends are the most commonly specified commercial grades.'),
          ],
        },
        biofuelRegionChart,
        {
          _type: 'calloutBlock', _key: 'sm9-s3-callout',
          variant: 'warning',
          title: 'The Food vs Fuel Debate',
          body: 'First-generation biofuels produced from food crops (corn, sugarcane, palm oil) have attracted significant controversy for driving up food prices and contributing to deforestation. Sustainable biofuel policy increasingly focuses on feedstocks that do not compete with food production -- such as agricultural residues, municipal waste, and purpose-grown energy crops on marginal land.',
        },
      ],
    },

    // ── SECTION 4: Geographic Considerations & Economics ─────────────────────
    {
      _id: 'sm9-sec-4-global',
      title: 'Geographic Distribution & Economic Perspectives',
      slug: { _type: 'slug', current: 'biomass-global-economics' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm9-s4-hero',
          image: localImage('Images/AdobeStock_518823228.webp', 'Biomass energy global map and economics'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm9-s4-text',
          content: [
            h2('sm9-s4-h1', 'Global Distribution of Bioenergy'),
            p('sm9-s4-p1', 'Biomass conversion accounts for a sizeable proportion of global energy consumption. According to the International Energy Agency, modern bioenergy accounts for 55% of total renewable energy. Emerging economies will account for nearly the entire growth in bioenergy through the 2030s, particularly in Africa and South-East Asia.'),
            p('sm9-s4-p2', 'In the European Union, a target of 35 billion cubic metres of biomethane production by 2030 was agreed in 2022 as part of the REPowerEU plan, aiming to reduce dependence on Russian natural gas. The US, Brazil, and China are also major producers and consumers of bioenergy, particularly liquid biofuels.'),
            h2('sm9-s4-h2', 'Financial Aspects of Biomass Energy'),
            p('sm9-s4-p3', 'Biomass conversion facilities -- whether biorefineries, biodiesel plants, or gasifiers -- require substantial capital investment (CapEx). The facilities are typically large, requiring significant land and infrastructure. Key financial considerations include:'),
            bullet('sm9-s4-b1', 'Feedstock Costs & Availability: Feedstock is often the largest operating cost for biomass facilities. Feedstock markets can be volatile, and securing reliable, cost-effective supply is critical to project economics.'),
            bullet('sm9-s4-b2', 'Carbon Credits & Policy Support: Many biomass projects depend on government support mechanisms -- such as Renewable Obligation Certificates (ROCs), Contracts for Difference (CfDs), or carbon credits -- to be commercially viable.'),
            bullet('sm9-s4-b3', 'LCOE vs Conventional: Biomass typically has a higher LCOE than onshore wind or solar, but offers the unique advantage of dispatchable generation -- power on demand, regardless of weather.'),
            h2('sm9-s4-h3', 'Challenges of Biomass Conversion'),
            bullet('sm9-s4-b4', 'Feedstock Availability and Quality: The sector relies on consistent feedstock availability. Moisture levels, cellulose ratios, and chemical composition can vary significantly, affecting conversion efficiency.'),
            bullet('sm9-s4-b5', 'Environmental Impact: Some large-scale biomass operations -- particularly wood pellet production -- have raised concerns about biodiversity impacts and deforestation if not properly managed.'),
            bullet('sm9-s4-b6', 'Competition with Food Supply: Some feedstocks compete with food production for land, water, and agricultural resources, raising sustainability and ethical concerns.'),
            bullet('sm9-s4-b7', 'Emissions: While biomass is nominally carbon-neutral, the actual life-cycle carbon savings depend heavily on feedstock choice, land-use change, and conversion efficiency. Poorly managed biomass can, in some cases, have higher emissions than fossil fuels.'),
          ],
        },
        biomassLcoeChart,
        {
          _type: 'beccsProcessDiagram' as const,
          _key: 'sm9-s4-beccs-diagram',
          title: 'BECCS — Bioenergy with Carbon Capture & Storage',
          caption: 'BECCS creates a negative-emissions loop: biomass absorbs CO₂ as it grows, then releases it during combustion — but that CO₂ is captured and stored underground rather than reaching the atmosphere. The net result is more carbon removed from the atmosphere than added.',
        },
        {
          _type: 'calloutBlock', _key: 'sm9-s4-callout',
          variant: 'info',
          title: 'BECCS: Biomass Energy with Carbon Capture & Storage',
          body: 'Bioenergy with Carbon Capture and Storage (BECCS) is identified in most IPCC 1.5 degree C scenarios as a critical tool for removing CO2 from the atmosphere. By capturing and storing the CO2 released when biomass is burned, BECCS achieves net negative emissions -- removing more carbon from the atmosphere than it adds. Drax Power Station in the UK is already operating the world\'s largest BECCS pilot.',
        },
      ],
    },

    // ── SECTION 5: Opportunities & Future of Biomass ──────────────────────────
    {
      _id: 'sm9-sec-5-future',
      title: 'Opportunities & The Future of Biomass',
      slug: { _type: 'slug', current: 'biomass-future' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm9-s5-hero',
          image: localImage('Images/AdobeStock_569452080.webp', 'Advanced biomass biorefinery'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm9-s5-text',
          content: [
            h2('sm9-s5-h1', 'Opportunities of Biomass Conversion'),
            p('sm9-s5-p1', 'Despite its challenges, biomass conversion offers significant and unique opportunities in the clean energy transition:'),
            bullet('sm9-s5-b1', 'Waste Reduction: Biomass conversion can provide economic value from waste streams -- agricultural residues, food waste, sewage sludge -- that would otherwise require costly disposal, supporting circular economy objectives.'),
            bullet('sm9-s5-b2', 'Rural Economic Development: Biomass supply chains create jobs and economic activity in rural and agricultural communities, providing a diversified income stream for farmers.'),
            bullet('sm9-s5-b3', 'Dispatchable Renewable Power: Unlike wind and solar, biomass can generate electricity on demand, providing valuable grid balancing services and baseload power.'),
            bullet('sm9-s5-b4', 'Hard-to-Abate Sectors: Biofuels are one of the few viable low-carbon options for aviation (sustainable aviation fuel), shipping, and heavy road transport in the near term, while clean hydrogen alternatives develop.'),
            bullet('sm9-s5-b5', 'Negative Emissions via BECCS: Combined with carbon capture and storage, bioenergy can actively remove CO2 from the atmosphere -- a capability no other scalable technology currently offers.'),
            bullet('sm9-opp-soil', 'Soil Health Benefits: Certain energy crops — such as switchgrasses and cover crops — can help reduce soil erosion and increase the accumulation of carbon-rich organic matter in soils. This dual benefit of producing biomass feedstock while improving soil health makes these crops particularly attractive for degraded or marginal agricultural land.'),
            h2('sm9-s5-h2', 'Future Trends in Biomass Conversion'),
            p('sm9-s5-p2', 'Key trends shaping the future of biomass energy include: advanced conversion technologies that extract more energy from feedstocks with lower emissions; the growth of biogas and biomethane networks replacing fossil gas; increasing certification and sustainability standards for feedstocks; the development of biojet fuel and green shipping fuels; and the maturation of BECCS as a climate mitigation tool.'),
            p('sm9-s5-p3', 'Biomass, as a source of energy, is highly versatile. There is a wide range of feedstocks that can be used in the conversion process -- all organic materials. When done sustainably, biomass has a range of additional co-benefits, including contributions to BECCS, agroforestry, agriculture, and localised smart energy systems.'),
            bullet('sm9-future-b-hybrid', 'Hybrid Energy Systems: Options for integrating biomass with other renewable energy sources such as solar and wind are being actively explored. Hybrid systems can use biomass as a dispatchable backup when solar or wind generation is low, improving overall system reliability.'),
            bullet('sm9-future-b-genetic', 'Genetic Modification and Plant Breeding: Investment into plant breeding and genetic modification aims to create energy crops that are higher-yielding, more resistant to pests and disease, and better adapted to marginal land. This could significantly expand the biomass resource base without competing with food production.'),
            bullet('sm9-future-b-agroforestry', 'Agroforestry and Sustainable Land Use: Several countries including Brazil, Kenya, and the United States are exploring agroforestry systems where energy crops are integrated with food production. These systems can support not only biomass conversion but also local communities, biodiversity, and soil carbon sequestration.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm9-s5-callout',
          variant: 'key-fact',
          title: 'Sustainable Biomass: The Key to Unlocking Its Potential',
          body: 'The future of biomass as a clean energy source depends critically on sustainability -- ensuring that feedstocks do not drive deforestation, compete with food production, or undermine biodiversity. Robust certification schemes, life-cycle carbon accounting, and careful land-use governance are essential prerequisites for biomass to fulfil its potential as a genuinely renewable energy source.',
        },
      ],
    },


    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm9-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'biomass-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm9-conc-text',
          content: [
            h2('sm9-conc-h1', 'Sub-Module Summary'),
            p('sm9-conc-p1', 'This sub-module has examined biomass energy — a versatile, storable energy carrier derived from organic materials. Unlike wind and solar, biomass can be converted into heat, electricity, liquid fuels, and gas, making it one of the most flexible contributors to decarbonisation. The biological and chemical properties of biomass — its cellulose, hemicellulose, and lignin composition — determine which conversion pathway is most appropriate: direct combustion, gasification, anaerobic digestion, fermentation, or pyrolysis each suit different feedstocks and end uses.'),
            p('sm9-conc-p2', 'Bioethanol (from sugar and starch crops) and biodiesel (from oil-rich plants and waste fats) are the most widely deployed biomass-based fuels, particularly in the transport sector. Brazil and the USA lead global bioethanol production, while the EU\'s Renewable Energy Directive mandates increasing biofuel blending. The food versus fuel debate remains a live tension: first-generation biofuels risk competing with food production and land use, while advanced second and third-generation fuels from agricultural residues, waste, and algae offer a more sustainable pathway. BECCS — Biomass Energy with Carbon Capture and Storage — is one of the few negative-emission technologies with genuine commercial precedent, as demonstrated at Drax Power Station in the UK.'),
            p('sm9-conc-p3', 'Sustainable sourcing is the defining challenge for biomass. Certification schemes (such as the Roundtable on Sustainable Biomaterials), strict lifecycle accounting, and regulatory oversight are all necessary to ensure that biomass genuinely delivers carbon savings rather than displacing them to land-use change. Globally, biomass contributes approximately 10% of primary energy supply — a share that can grow significantly with careful governance and supply chain development. Its unique ability to provide firm, dispatchable, storable energy gives biomass an important role in a diversified low-carbon energy system.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm9-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 9',
          body: 'You now have a well-rounded understanding of biomass energy — its feedstocks, conversion technologies, transport fuel applications, global distribution, and the sustainability criteria that determine whether it truly delivers net carbon benefit.',
        },
      ],
    },
    {
      _id: 'sm9-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'biomass-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm9-col-quiz',
          subModuleSlug: 'biomass',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
