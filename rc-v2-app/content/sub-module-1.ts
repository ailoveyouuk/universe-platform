// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 1: Greenhouse Gas Emissions
// Source: PDF pages 10–44 (verbatim text — do not edit without updating source)
//
// Phase 1 images are served from /public/images/sm1/
// Copy source files from: Platform_Dev/Module Assets/Sub-Module 1/Images/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  co2ConcentrationChart,
  gwpCardsBlock,
  emissionsBySectorChart,
  energySectorChart,
  agricultureChart,
  industrialChart,
  carbonBudgetChart,
  temperatureTargetsChart,
  mitigationChart,
  transportChart,
  ieaElectricityFuelChart,
} from './sm1-charts'

// ── Portable Text block helpers ───────────────────────────────────────────────

function p(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function h2(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'h2' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function h3(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'h3' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function bullet(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    listItem: 'bullet' as const,
    level: 1,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

// ── Image helper ──────────────────────────────────────────────────────────────

function localImage(filename: string, alt: string): ImageAsset {
  return {
    _type: 'image',
    asset: { _ref: `/images/sm1/${filename}`, _type: 'reference' },
    alt,
    localSrc: `/images/sm1/${filename}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 1 Data
// ─────────────────────────────────────────────────────────────────────────────

export const subModule1: SubModule = {
  _id: 'sm-1',
  title: 'SM 1 — Greenhouse Gas Emissions',
  slug: { _type: 'slug', current: 'greenhouse-gas-emissions' },
  orderIndex: 1,
  estimatedHours: 2,
  learningObjectives: [
    'Understand the primary greenhouse gases and their global warming potentials',
    'Identify the key sources of greenhouse gas emissions across sectors',
    'Explain the impacts of greenhouse gas emissions on climate change',
    'Describe methods used to measure and monitor GHG emissions globally',
    'Outline the main strategies for mitigating and adapting to climate change',
    'Recognise the political, economic, and behavioural challenges in addressing emissions',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to Global Warming (PDF pp. 10–14) ─────────────
    {
      _id: 'sec-1-intro',
      title: 'Introduction to Global Warming',
      slug: { _type: 'slug', current: 'introduction-to-global-warming' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'videoBlock', _key: 'sm1-s1-video',
          title: 'An Introduction to the World of Renewables and Clean Energy',
          azureBlobUrl: '/videos/talking-heads/An Introduction to the World of Renewables and Clean Energy.mp4',
        },
        {
          _type: 'imageBlock',
          _key: 's1-hero',
          image: localImage('Images/AdobeStock_538634442.webp', 'Introduction to Global Warming'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's1-intro-text',
          content: [
            h2('s1-h1', 'Introduction to Global Warming'),
            p('s1-p1', 'Global warming is the gradual increase in Earth\'s temperature. Greenhouse gases (GHGs) released by human actions and natural occurrences go into the Earth\'s atmosphere. GHGs have the effect of trapping heat, leading to the greenhouse effect. This increase in heat has the effect of altering the earth climate and weather.'),
            p('s1-p2', 'A change in weather has a knock-on effect of making weather change causing damaging effects. The heat also makes global ice stores melt increasing the sea level. Finally, the additional heat makes hot places even hotter and drier making it more difficult to live in these areas. Global warming and climate change also effects ecosystems, plants and animals.'),
            p('s1-p3', 'As humans adapt to climate change we use more energy, increasing the volume of carbon dioxide and other GHGs making the situation worse. In this module you will learn how global warming occurs, its effects and what we are doing about it.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's1-explanation-text',
          content: [
            h2('s1-h2', 'Explanation of Global Warming'),
            p('s1-p4', 'Greenhouse gases (GHGs) are substances in the Earth\'s atmosphere that trap heat, acting as an insulator on a global scale.'),
            p('s1-p5', 'While this natural process is essential for maintaining a habitable temperature on our planet, human activities have significantly intensified the greenhouse effect by releasing large quantities of these gases.'),
            p('s1-p6', 'The primary greenhouse gases include carbon dioxide (CO₂), methane (CH₄), nitrous oxide (N₂O), fluorinated gases, and water vapor.'),
            p('s1-p7', 'Greenhouse gas emissions play a crucial role in shaping the Earth\'s climate and are a significant factor in the ongoing issue of global climate change. This overview will delve into the definition of greenhouse gases, their sources, impact on climate change and efforts to mitigate and adapt to these emissions.'),
          ],
        },
        co2ConcentrationChart,
        {
          _type: 'richText',
          _key: 's1-gwp-text',
          content: [
            h2('s1-h3', 'Global Warming Potential (GWP)'),
            p('s1-p8', 'Each greenhouse gas has a different warming effect, this is called the Carbon Dioxide equivalent (CO₂e).'),
            p('s1-p9', 'Greenhouse gases (GHGs) are substances in the Earth\'s atmosphere that trap heat. The global warming potential (GWP) is a measure that compares the ability of different greenhouse gases to trap heat over a specific time period, usually 20, 100, or 500 years. This measure is expressed in terms of carbon dioxide equivalents (CO₂e), where 1 CO₂e is equivalent to the warming effect of 1 metric ton of carbon dioxide over a specified time period.'),
            h3('s1-h4', 'GWPs for common greenhouse gases over a 100-year period:'),
            h3('s1-h5', '1. Carbon Dioxide (CO₂)'),
            bullet('s1-b1', 'GWP: 1 (by definition)'),
            bullet('s1-b2', 'CO₂ is the baseline against which other greenhouse gases are measured. It remains in the atmosphere for a very long time, contributing to long-term climate change.'),
            h3('s1-h6', '2. Methane (CH₄)'),
            bullet('s1-b3', 'GWP: 28–36 (over 100 years)'),
            bullet('s1-b4', 'Methane is a potent greenhouse gas emitted from sources such as livestock, agriculture, and the extraction and processing of fossil fuels.'),
            h3('s1-h7', '3. Nitrous Oxide (N₂O)'),
            bullet('s1-b5', 'GWP: 265–298 (over 100 years)'),
            bullet('s1-b6', 'Nitrous oxide is released from agricultural and industrial activities and has a much greater warming potential than CO₂.'),
            h3('s1-h8', '4. Fluorinated Gases (F-gases)'),
            bullet('s1-b7', 'Various GWPs depending on the specific gas (e.g., hydrofluorocarbons - HFCs, perfluorocarbons - PFCs, sulphur hexafluoride - SF₆).'),
            bullet('s1-b8', 'These gases have extremely high GWPs compared to CO₂, often in the thousands or tens of thousands. They are used in various industrial applications, such as refrigeration, air conditioning, and electronics manufacturing.'),
            p('s1-p10', 'Understanding and quantifying these values help policymakers and scientists assess the overall impact of different greenhouse gases on global warming. Efforts to mitigate climate change often focus on reducing emissions of gases with higher GWPs, as they have a more significant short-term impact on the Earth\'s climate.'),
          ],
        },
        gwpCardsBlock,
      ],
    },

    // ── SECTION 2: Sources of Greenhouse Gas Emissions (PDF pp. 15–21) ─────────
    {
      _id: 'sec-2-sources',
      title: 'Sources of Greenhouse Gas Emissions',
      slug: { _type: 'slug', current: 'sources-of-emissions' },
      estimatedMinutes: 35,
      content: [
        {
          _type: 'imageBlock',
          _key: 's2-hero',
          image: localImage('Images/AdobeStock_1068654182.webp', 'Sources of Greenhouse Gas Emissions'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's2-energy',
          content: [
            h2('s2-h1', 'Sources of Greenhouse Gas Emissions'),
            h3('s2-h2', 'Energy Sector'),
            p('s2-p1', 'The combustion of fossil fuels, encompassing coal, oil, and natural gas, remains a pivotal method for energy production globally. Despite its widespread use, this practice is one of the most significant emitters of greenhouse gases, exacerbating climate change.'),
            p('s2-p2', 'The International Energy Agency report (2022) that Power generation accounts for 12,500 mtCO₂e out of the World\'s 37,550 mtCO₂e or 33% of all world emissions (other sources place it at 37% of world emissions).'),
            p('s2-p3', 'Power is gained from burning gas, oil or coal. Coal is globally the most emitting fuel. Coal is a high emitter of CO₂e due to its carbon-dense composition, containing a substantial amount of carbon relative to hydrogen. When combusted, coal releases a significant volume of carbon dioxide. Coal is a high emitter of pollution primarily due to its composition, containing sulphur, heavy metals, and other impurities. When burned, these elements release pollutants such as sulphur dioxide, nitrogen oxides, and particulate matter, contributing to air pollution and posing significant environmental and public health risks. Much of the World is still reliant on coal for electricity generation.'),
            p('s2-p4', 'Natural gas, predominantly composed of methane (CH₄), emits CO₂e during combustion, contributing to the greenhouse effect.'),
            p('s2-p5', 'Oil produces many of the pollutants that coal does but in smaller amounts, however, the refinement of oil is very energy intensive and so oil emits CO₂ in more ways.'),
            p('s2-p6', 'Emissions of methane are produced when extracting gas, coal and oil, during the extraction process. As methane is a potent greenhouse gas on its own, any leakage during extraction or transport also contributes towards climate change.'),
          ],
        },
        ieaElectricityFuelChart,
        emissionsBySectorChart,
        energySectorChart,
        industrialChart,
        {
          _type: 'richText',
          _key: 's2-industrial',
          content: [
            h3('s2-h3', 'Industrial Processes'),
            p('s2-p8', 'Heat: Many industrial processes use large quantities of heat. This heat is often produced by burning fossil fuels. Iron and steel produces one of the highest industrial emissions (around 8–11%). Non ferrous metals also have a high input as does glass making. These are all industries where it is difficult and expensive to transition away from fossil fuel use, partly due to the industrial process, but also due to the cost in infrastructure. Food manufacture, paper and textiles are also major energy users. However, these are easier to transition to low-carbon energy sources.'),
            p('s2-p9', 'Cement: carbon dioxide is produced as a by-product of a chemical conversion process used in the production of clinker, a component of cement. In this reaction, limestone (CaCO₃) is converted to lime (CaO) and produces CO₂ as a by-product.'),
            p('s2-p10', 'Cement production also produces emissions from energy use as substantial heat is required to sinter the constituents. Producing this heat is very difficult to do without fossil fuels. This means that it is estimated that 7–8% of world CO₂ comes from cement manufacture.'),
            p('s2-p11', 'Chemicals & petrochemicals: greenhouse gases can be produced as a by-product from chemical processes – for example, CO₂ can be emitted during the production of ammonia, which is used for purifying water supplies, cleaning products, and as a refrigerant, and used in the production of many materials, including plastic, fertilizers, pesticides, and textiles. Chemical and petrochemical manufacturing also produces emissions from energy used to heat constituents. This constitutes around 3–4% of global CO₂.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's2-agriculture',
          content: [
            h3('s2-h4', 'Agriculture'),
            h3('s2-h4a', 'Greenhouse Gas Emissions:'),
            p('s2-p12', 'Agriculture is a significant contributor to greenhouse gas emissions, with studies indicating that it accounts for approximately 24% of global emissions (IPCC, 2014).'),
            p('s2-p13', 'Livestock production, particularly enteric fermentation (within the gut of livestock) and manure management contributes substantially to methane emissions, a potent greenhouse gas responsible for about 16% of total emissions (Gerber et al., 2013).'),
            p('s2-p14', 'The use of synthetic fertilizers in agriculture releases nitrous oxide, another potent greenhouse gas, contributing to approximately 6% of global emissions (FAO, 2020).'),
            p('s2-p15', 'Deforestation for agricultural expansion is a major source of carbon dioxide emissions, with estimates suggesting that 80% of global deforestation is driven by agriculture (Gibbs et al., 2010).'),
            p('s2-p16', 'Rice cultivation, a staple in many agricultural systems, is a source of methane emissions due to anaerobic conditions (when oxygen is not present) in flooded paddies, accounting for about 12% of global methane emissions (Cai et al., 2017).'),
            h3('s2-h4b', 'Mitigations:'),
            p('s2-p17', 'Sustainable agricultural practices, such as precision farming and agroforestry, have been proposed to mitigate greenhouse gas emissions from the sector (Smith et al., 2008). Carbon sequestration in agricultural soils through improved management practices can help offset emissions, as healthy soils act as a sink for atmospheric carbon dioxide (Lal, 2004). There is also the view that improving the efficiency of livestock production and reducing food waste can significantly decrease the environmental impact of agriculture on greenhouse gas emissions (West et al., 2013).'),
            p('s2-p18', 'The adoption of climate-smart agricultural practices, as recommended by the Food and Agriculture Organization (FAO), is crucial for achieving sustainable food production while minimizing the sector\'s contribution to climate change (FAO, 2017).'),
          ],
        },
        agricultureChart,
        {
          _type: 'richText',
          _key: 's2-landuse',
          content: [
            h3('s2-h5', 'Land Use and Deforestation'),
            h3('s2-h5a', 'Greenhouse Gas Emissions:'),
            p('s2-p19', 'Land-use change, including deforestation and urbanisation, is a major driver of greenhouse gas emissions, contributing to approximately 23% of global man-made emissions (IPCC, 2019).'),
            p('s2-p20', 'The conversion of forests to agricultural land is a significant source of carbon dioxide emissions, releasing stored carbon into the atmosphere. This process contributes to about 11% of global greenhouse gas emissions (Houghton, 2012).'),
            p('s2-p21', 'The draining of wetlands for agricultural purposes results in the release of stored carbon and contributes to approximately 16% of global methane emissions (Bridgham et al., 2013).'),
            p('s2-p22', 'The expansion of urban areas, often leading to land-use change, is associated with increased energy consumption and emissions, contributing to approximately 5% of global greenhouse gas emissions (Seto et al., 2014).'),
            p('s2-p23', 'The conversion of natural grasslands to agricultural land, particularly for livestock grazing, is associated with methane emissions from enteric fermentation, contributing to about 9% of global greenhouse gas emissions (Gerber et al., 2013).'),
            p('s2-p24', 'A study by Meyfroidt et al. (2018) emphasises the role of land-use change in tropical regions, accounting for a substantial portion of global emissions due to activities like shifting cultivation and expansion of agricultural frontiers.'),
            p('s2-p25', 'The Intergovernmental Panel on Climate Change (IPCC) notes that the release of carbon from peatlands, often associated with land-use change, contributes to around 42% of global methane emissions (IPCC, 2014).'),
            p('s2-p26', 'Research by DeFries et al. (2012) underscores the link between land-use change and carbon emissions, emphasising the importance of understanding regional variations in these dynamics.'),
            h3('s2-h5b', 'Mitigations:'),
            p('s2-p27', 'Sustainable land-use practices, such as afforestation and reforestation, are essential for mitigating greenhouse gas emissions associated with land-use change, as highlighted in reports by the United Nations Framework Convention on Climate Change (UNFCCC, 2021).'),
          ],
        },
        {
          _type: 'richText',
          _key: 's2-waste',
          content: [
            h3('s2-h6', 'Waste Management'),
            h3('s2-h6a', 'Greenhouse Gas Emissions:'),
            p('s2-p28', 'Waste management is a significant source of greenhouse gas emissions, contributing to about 5% of global emissions, primarily from the decomposition of organic waste in landfills (IPCC, 2019).'),
            p('s2-p29', 'Methane, a potent greenhouse gas, is released during the anaerobic decomposition of organic waste in landfills, accounting for approximately 16% of global methane emissions (UNEP, 2019).'),
            p('s2-p30', 'The incineration of waste, particularly plastics, releases carbon dioxide and other pollutants, contributing to approximately 2–3% of global greenhouse gas emissions (Geyer et al., 2017).'),
            h3('s2-h6b', 'Mitigations:'),
            p('s2-p31', 'The circular economy approach, as advocated by Ellen MacArthur Foundation (2015), emphasises reducing, reusing, and recycling materials to minimise the environmental impact of waste and associated greenhouse gas emissions.'),
            p('s2-p32', 'The implementation of methane capture technologies in landfills can significantly mitigate emissions by converting methane into energy, as demonstrated by successful projects worldwide (EPA, 2021).'),
            p('s2-p33', 'Waste-to-energy technologies, such as anaerobic digestion and incineration with energy recovery, can help reduce greenhouse gas emissions from waste disposal while generating renewable energy (Hoornweg et al., 2019).'),
            p('s2-p34', 'A study by Stretz et al. (2018) highlights the importance of source separation and efficient recycling systems in reducing emissions from waste disposal. The Kyoto Protocol\'s Clean Development Mechanism (CDM) promotes projects that reduce greenhouse gas emissions from waste management, providing a framework for international collaboration (UNFCCC, 2021).'),
            p('s2-p35', 'The adoption of sustainable consumption patterns and reducing food waste can contribute to mitigating greenhouse gas emissions associated with the production and disposal of goods (FAO, 2019).'),
            p('s2-p36', 'Local and national waste management policies, such as those outlined by the European Union Circular Economy Action Plan (European Commission, 2020), play a crucial role in promoting sustainable waste practices and mitigating greenhouse gas emissions.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's2-transport',
          content: [
            h3('s2-h7', 'Transport'),
            h3('s2-h7a', 'Greenhouse Gas Emissions:'),
            p('s2-p37', 'Transportation is a major contributor to greenhouse gas emissions, accounting for around 16% of global emissions, with road vehicles being the largest source (IPCC, 2014). The burning of fossil fuels in internal combustion engines releases carbon dioxide, contributing to approximately 75% of total transportation-related emissions (IEA, 2019). Aviation and shipping contribute significantly to greenhouse gas emissions, with international shipping accounting for about 2–3% of global CO₂ emissions (IMO, 2020) and aviation contributing to around 2–3% of global emissions (ICAO, 2018).'),
            h3('s2-h7b', 'Mitigations:'),
            p('s2-p38', 'The electrification of transportation through the use of electric vehicles (EVs) is a key strategy to mitigate emissions, as demonstrated by studies indicating that EVs produce lower life-cycle emissions compared to traditional vehicles (Hawkins et al., 2013).'),
            p('s2-p39', 'Improving fuel efficiency in conventional vehicles is crucial for reducing emissions, and regulatory standards, such as Corporate Average Fuel Economy (CAFE) standards in the United States, play a pivotal role in this regard (EPA, 2021).'),
            p('s2-p40', 'The development of sustainable aviation fuels (SAFs) is a promising avenue for reducing emissions from aviation, with studies suggesting that the use of SAFs can significantly decrease the carbon footprint of air travel (ICCT, 2020).'),
            p('s2-p41', 'Mass transit systems, cycling, and walking are sustainable alternatives to private car use, contributing to emission reductions, as emphasised by urban planning strategies (UITP, 2019).'),
            h3('s2-h7c', 'Policy:'),
            p('s2-p42', 'The promotion of remote work and telecommuting, especially in the post-COVID-19 era, can contribute to reduced transportation-related emissions by decreasing the need for daily commuting (World Bank, 2021).'),
            p('s2-p43', 'Integrated transportation planning, as outlined by the International Transport Forum (ITF, 2019), emphasises the importance of coordinated policies to optimise transport networks and reduce emissions.'),
            p('s2-p44', 'The Paris Agreement\'s goal of limiting global temperature rise reinforces the importance of sustainable transportation strategies, calling for increased investments in public transport, cycling infrastructure, and policies that encourage the use of low-emission vehicles (UNFCCC, 2015).'),
          ],
        },
        transportChart,
        {
          _type: 'richText',
          _key: 's2-buildings',
          content: [
            h3('s2-h8', 'Energy Use in Buildings'),
            p('s2-p45', 'Energy consumption in buildings is a significant contributor to global greenhouse gas (GHG) emissions. Buildings account for approximately 40% of total energy use, primarily for heating, cooling, and lighting. This energy is often generated from fossil fuels, leading to substantial GHG emissions.'),
            p('s2-p46', 'The construction industry is increasingly focusing on sustainable practices to mitigate this impact. Green building design incorporates energy-efficient technologies such as high-performance insulation, energy-efficient appliances, and renewable energy sources like solar panels.'),
            p('s2-p47', 'Building energy management systems (BEMS) can further optimise energy use by monitoring and controlling building operations. These systems can significantly reduce energy consumption.'),
            p('s2-p48', 'The causes of high energy use in buildings are multi-faceted, ranging from outdated infrastructure and inefficient appliances to poor insulation and excessive artificial lighting. These factors lead to increased energy demand, which is often met through the combustion of fossil fuels.'),
            p('s2-p49', 'Mitigation strategies include improving energy efficiency, utilising renewable energy, and implementing sustainable construction practices. Energy efficiency can be enhanced through retrofitting better insulation, efficient lighting and appliances, and smart energy management systems.'),
            p('s2-p50', 'Energy efficiency improvements need to be well considered so they do not damage the fabric of the building or cause unwanted effects such as homes that are too hot in the summer and require energy to cool them.'),
            p('s2-p51', 'Policy plays a crucial role in promoting energy efficiency and reducing GHG emissions from buildings. Policies can set energy efficiency standards for buildings, provide incentives for renewable energy use, and encourage sustainable construction practices. Examples of such policies include building codes that specify minimum energy efficiency requirements, subsidies for solar panel installation, and certification programs for green buildings.'),
            p('s2-p52', 'In conclusion, while buildings are major contributors to GHG emissions, various strategies can significantly reduce their environmental impact.'),
            p('s2-p53', 'Addressing the issue of energy use in buildings and associated GHG emissions requires a comprehensive approach that includes understanding the causes and how buildings are used, implementing mitigation strategies, and developing supportive policies. This multi-faceted approach is essential for achieving a sustainable and low-carbon built environment but is complex in nature and the volume of buildings that need energy efficiency measures makes this a significant challenge.'),
          ],
        },
      ],
    },

    // ── SECTION 3: Impact on Climate Change (PDF pp. 22–25) ───────────────────
    {
      _id: 'sec-3-impact',
      title: 'Impact on Climate Change',
      slug: { _type: 'slug', current: 'impact-on-climate-change' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 's3-hero',
          image: localImage('Images/AdobeStock_357537935.webp', 'Impact on Climate Change'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's3-warming',
          content: [
            h2('s3-h1', 'Impact on Climate Change'),
            h3('s3-h2', 'Global Warming'),
            p('s3-p1', 'Global warming has profound impacts on the planet\'s climate and sea levels. The rise in global temperatures intensifies the Earth\'s water cycle, leading to more extreme weather events. Warmer temperatures cause more evaporation, increasing atmospheric moisture and the frequency and intensity of events like heavy rainfall, hurricanes, and heatwaves.'),
            p('s3-p2', 'Global warming also contributes to the melting of polar ice caps and glaciers. As these large bodies of ice melt, they add more water to the oceans, leading to sea-level rise. This rise in sea levels threatens coastal communities with increased flooding, coastal erosion, and storm surge damage.'),
            p('s3-p3', 'Furthermore, warmer ocean temperatures cause thermal expansion, where water volume increases as it warms, contributing further to sea-level rise. This poses serious challenges for ecosystems and human societies, requiring the development of climate-resilient infrastructure to address these effects.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's3-ocean',
          content: [
            h3('s3-h3', 'Ocean Acidification'),
            p('s3-p4', 'Ocean acidification is a significant environmental issue caused by the increase in carbon dioxide (CO₂) in the Earth\'s atmosphere. When CO₂ is absorbed by seawater, chemical reactions occur that reduce seawater pH, carbonate ion concentration, and saturation states of biologically important calcium carbonate minerals. This process is known as ocean acidification.'),
            p('s3-p5', 'The decrease in seawater pH and carbonate ion concentration can have harmful effects on marine life, particularly organisms that build shells or skeletons from calcium carbonate, such as corals, mollusks, and some plankton species. These organisms may find it more difficult to build and maintain their shells or skeletons in more acidic waters.'),
            p('s3-p6', 'Furthermore, ocean acidification can disrupt the food chain. Many species at the base of the ocean food chain, including certain types of plankton and algae, are affected by acidification. Changes to these organisms can have cascading effects up the food chain, potentially impacting many marine species, including commercially important fish populations.'),
            p('s3-p7', 'In conclusion, ocean acidification is a complex issue with far-reaching impacts on the ocean ecosystem. Addressing this issue requires a comprehensive approach, including reducing CO₂ emissions, improving our understanding of ocean acidification processes and impacts, and developing strategies to mitigate its effects on marine biodiversity and human communities that rely on the ocean for their livelihoods.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's3-ice',
          content: [
            h3('s3-h4', 'Melting Ice Caps and Glaciers'),
            p('s3-p8', 'Melting ice caps and glaciers are among the most visible indicators of global warming. As global temperatures rise, the ice stored in these regions melts at an accelerated rate.'),
            p('s3-p9', 'The polar ice caps, located in the Arctic and Antarctic regions, are particularly sensitive to changes in temperature. The loss of sea ice in these regions not only contributes to global sea-level rise but also disrupts local ecosystems and alters ocean circulation patterns.'),
            p('s3-p10', 'Glaciers, found in mountainous regions worldwide, are also rapidly melting. This not only contributes to sea-level rise but also threatens freshwater supplies. Many rivers are fed by glacial meltwater, and the loss of these glaciers can lead to water shortages.'),
            p('s3-p11', 'The melting of ice caps and glaciers also contributes to a feedback loop known as the albedo effect. Ice and snow have high albedo, meaning they reflect a large portion of the sun\'s energy back into space. As ice melts, it exposes darker land or water, which absorbs more of the sun\'s energy, leading to further warming and consequently melting of ice caps and glaciers.'),
            p('s3-p12', 'In conclusion, the melting of ice caps and glaciers is a critical issue in climate change. It contributes to sea-level rise, disrupts ecosystems, affects freshwater resources, and accelerates global warming through the albedo effect.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's3-ecosystems',
          content: [
            h3('s3-h5', 'Changes in Ecosystems'),
            p('s3-p13', 'As temperatures rise, species are forced to adapt, migrate, or face extinction. One of the most visible impacts of global warming on ecosystems is the shift in species distributions. Many species are moving towards the poles or to higher altitudes in response to changing temperatures. This can lead to new interactions between species, potentially disrupting existing ecological communities.'),
            p('s3-p14', 'In aquatic ecosystems, warmer water temperatures and ocean acidification, caused by increased carbon dioxide absorption, are threatening a variety of species, from coral reefs to fish populations. Changes in ocean temperature and acidity can disrupt the growth, reproduction, and survival of these species.'),
            p('s3-p15', 'Terrestrial ecosystems are also significantly affected. Increased temperatures and changing precipitation patterns are exacerbating droughts and wildfires, transforming landscapes, and threatening species adapted to specific climatic conditions.'),
            p('s3-p16', 'Furthermore, global warming is leading to the earlier onset of spring and changes in migration patterns, disrupting the timing of critical biological events like flowering and breeding. This phenomenon, known as phenological mismatch, can lead to reduced survival and reproduction rates.'),
            p('s3-p17', 'Understanding and mitigating these impacts is a critical challenge in conservation biology.'),
          ],
        },
      ],
    },

    // ── SECTION 4: Measuring & Monitoring (PDF pp. 26–28) ─────────────────────
    {
      _id: 'sec-4-measuring',
      title: 'Measuring & Monitoring Greenhouse Gas Emissions',
      slug: { _type: 'slug', current: 'measuring-and-monitoring' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 's4-hero',
          image: localImage('Images/AdobeStock_1030292414.webp', 'Measuring and Monitoring Greenhouse Gas Emissions'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's4-budgets',
          content: [
            h2('s4-h1', 'Measuring and Monitoring Greenhouse Gas Emissions'),
            h3('s4-h2', 'Global Carbon Budgets'),
            p('s4-p1', 'The wealth of climate science research available gives us a good understanding of how much the climate will warm for a given level of greenhouse gas emissions. Therefore, we can work out what level of greenhouse gas emissions would cause us to reach a specific level of global warming, such as 1.5°C. This is a carbon budget.'),
            p('s4-p2', 'Once we have this maximum level of emissions before a given limit is reached, we can use data on historic and current emissions to calculate how much we have already emitted. This gives us a figure for the level of greenhouse gases we can still afford to emit if we are to remain below a particular warming level. We can determine how much of the carbon budget we have already used.'),
            p('s4-p3', 'The global carbon budget is assessed every year. The latest data on past carbon emissions is combined with a detailed understanding of how the Earth will respond to rising levels of greenhouse gases to tell us how much more we can afford to emit. This shows that the remaining carbon budget, if we are to have a 50% likelihood of limiting warming to 1.5°C, is equivalent to 380 Gigatonnes of CO₂.'),
            p('s4-p4', 'This is equivalent to nine more years of emissions at 2022 levels before we will have a less than 50% likelihood of achieving the 1.5°C target set under the Paris Agreement. Alternatively, for a warming level of 2°C we could still emit 1,230 GtCO₂, equivalent to 30 more years of 2022 level emissions.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 's4-budget-fact',
          variant: 'key-fact',
          title: 'Remaining Carbon Budget',
          body: '380 Gt CO₂ remaining for a 50% likelihood of limiting warming to 1.5°C — equivalent to approximately 9 years of emissions at 2022 levels. For the 2°C target, 1,230 GtCO₂ remains — equivalent to 30 years.',
        },
        carbonBudgetChart,
        temperatureTargetsChart,
        {
          _type: 'richText',
          _key: 's4-inventories',
          content: [
            h3('s4-h3', 'Greenhouse Gas Inventories'),
            p('s4-p5', 'GHG inventories are comprehensive accounts of the amount of greenhouse gases produced, emitted, and removed in a specific region over a specific period of time. GHG inventories typically include gases such as carbon dioxide (CO₂), methane (CH₄), nitrous oxide (N₂O), and fluorinated gases.'),
            p('s4-p6', 'The process of creating a GHG inventory involves identifying and categorizing sources and sinks (stores away from the atmosphere) of GHGs and collecting data on these sources and sinks.'),
            p('s4-p7', 'International guidelines, such as those provided by the Intergovernmental Panel on Climate Change (IPCC), offer methodologies for estimating GHG emissions and removals. These methodologies ensure consistency and comparability across different regions and timescales.'),
            p('s4-p8', 'GHG inventories are essential for monitoring progress towards GHG reduction targets, such as those outlined in the Paris Agreement. They also inform policy decisions and help identify opportunities for reducing emissions.'),
            p('s4-p9', 'In conclusion, GHG inventories are a fundamental component of climate change mitigation efforts. They provide the data and insights necessary to understand, monitor, and reduce GHG emissions effectively.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's4-satellite',
          content: [
            h3('s4-h4', 'Satellite Observations'),
            p('s4-p10', 'Satellite observations play a crucial role in monitoring GHG emissions on a global scale. They provide comprehensive, consistent, and long-term data that is essential for understanding the spatial and temporal distribution of GHGs.'),
            p('s4-p11', 'Satellites equipped with spectrometers can measure the concentration of GHGs such as carbon dioxide (CO₂) and methane (CH₄) in the Earth\'s atmosphere. These instruments work by measuring the intensity of sunlight reflected off the Earth\'s surface and atmosphere. By analysing the absorption patterns in the reflected light, scientists can determine the concentration of various gases.'),
            p('s4-p12', 'One of the key advantages of satellite observations is their global coverage. They can monitor GHG concentrations over remote areas, such as oceans and forests, where ground-based measurements are challenging to obtain. This allows for a more accurate and complete picture of global GHG emissions.'),
            p('s4-p13', 'Satellite data also enables the identification of emission hotspots, such as large industrial facilities, where venting of GHG is taking place or deforestation areas, contributing significantly to GHG emissions. This information is crucial for policy-making and mitigation efforts.'),
            p('s4-p14', 'Furthermore, long-term satellite observations allow scientists to study trends and changes in GHG concentrations over time. This is essential for assessing the effectiveness of emission reduction efforts and for predicting future climate scenarios.'),
            p('s4-p15', 'However, satellite observations also have limitations. For instance, they can be affected by cloud cover and cannot directly measure emissions at the source. Therefore, they are often used in combination with ground-based measurements and modelling techniques to estimate GHG emissions.'),
          ],
        },
      ],
    },

    // ── SECTION 5: Mitigation Strategies (PDF pp. 29–33) ──────────────────────
    {
      _id: 'sec-5-mitigation',
      title: 'Mitigation Strategies',
      slug: { _type: 'slug', current: 'mitigation-strategies' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock',
          _key: 's5-hero',
          image: localImage('Images/AdobeStock_358748240.webp', 'Mitigation Strategies'),
          fullWidth: true,
        },
        mitigationChart,
        {
          _type: 'richText',
          _key: 's5-renewable',
          content: [
            h2('s5-h1', 'Mitigation Strategies'),
            h3('s5-h2', 'Renewable Energy'),
            p('s5-p1', 'Renewable energy is a key strategy in mitigating GHG emissions by replacing fossil fuels when generating electricity and for other energy uses.'),
            p('s5-p2', 'Moreover, renewable energy technologies are becoming increasingly efficient and cost-effective, making them a viable alternative to traditional energy sources. Advances in solar photovoltaic and wind turbine technologies, for instance, have led to a significant decrease in the cost of renewable energy.'),
            p('s5-p3', 'In addition to reducing GHG emissions, renewable energy has other environmental benefits. For example, it uses less water compared to conventional power plants and does not produce harmful pollutants like sulphur dioxide and nitrogen oxides that contribute to air pollution.'),
            p('s5-p4', 'We will be looking at all the types of Renewable Energy generation in detail later on in the module and in other modules in the series.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's5-efficiency',
          content: [
            h3('s5-h3', 'Energy Efficiency'),
            p('s5-p5', 'Energy efficiency stands as a fundamental pillar in mitigating greenhouse gas emissions, offering a pragmatic and cost-effective approach to combatting climate change. By optimising the use of energy resources across various sectors, energy efficiency measures aim to minimise waste and reduce the carbon intensity of economic activities.'),
            p('s5-p6', 'Retrofitting existing buildings with energy-saving technologies further enhances their efficiency, contributing to substantial reductions in greenhouse gas emissions. Industrial processes represent another significant domain where energy efficiency measures play a crucial role in emissions reduction. Adoption of advanced technologies, such as combined heat and power (CHP) systems and process optimisation techniques, enables industries to achieve greater energy efficiency and lower emissions intensity in their operations. Furthermore, appliance and equipment standards, along with consumer education initiatives, encourage the adoption of energy-efficient technologies in households and businesses, leading to reduced energy consumption and lower emissions.'),
            p('s5-p7', 'Finally, changes in culture and individual awareness of global warming has resulted in reduced energy use driven by individuals travelling less, re-using products, using products more efficiently and consciously trying to reduce their \'carbon footprint\' by consuming less.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's5-forestry',
          content: [
            h3('s5-h4', 'Afforestation and Reforestation'),
            p('s5-p8', 'Afforestation and reforestation offer promising avenues for combating climate change by sequestering carbon dioxide from the atmosphere. Afforestation involves the establishment of forests on lands that have not been forested for a considerable period, while reforestation entails the restoration of previously forested areas that have been deforested or degraded.'),
            p('s5-p9', 'Forests act as natural carbon sinks, absorbing CO₂ through the process of photosynthesis and storing it in biomass and soil organic matter. Beyond carbon sequestration, forests provide a myriad of ecosystem services, including biodiversity conservation, soil stabilisation, and watershed protection, contributing to climate resilience and environmental sustainability.'),
            p('s5-p10', 'Successful implementation of afforestation and reforestation initiatives requires careful planning, taking into account factors such as site suitability, species selection, and land tenure arrangements. Community involvement and stakeholder engagement are essential for ensuring the success and sustainability of forest restoration efforts.'),
            p('s5-p11', 'In conclusion, afforestation and reforestation are effective greenhouse gas mitigation strategies, offering multiple co-benefits for biodiversity conservation, ecosystem resilience, and sustainable development.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's5-ccs',
          content: [
            h3('s5-h5', 'Carbon Capture and Storage (CCS)'),
            p('s5-p12', 'CCS is a prominent greenhouse gas mitigation strategy, aiming to reduce carbon dioxide emissions from industrial processes and power generation by capturing CO₂ emissions at their source and storing them underground in geological formations. CCS holds great promise in addressing the challenge of climate change by enabling the continued use of fossil fuels while minimizing their environmental impact.'),
            p('s5-p13', 'The process of CCS involves three main steps: capture, transport, and storage. Carbon dioxide is captured from industrial sources such as power plants, refineries, and cement factories using various technologies, including post-combustion, pre-combustion, and oxy-fuel combustion capture methods. CO₂ can also be captured directly from the air.'),
            p('s5-p14', 'Once captured, the CO₂ is transported via pipelines or ships to suitable storage sites, typically deep saline aquifers, depleted oil and gas reservoirs, or old mines, where it is injected and securely stored underground to prevent its release into the atmosphere.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's5-agri',
          content: [
            h3('s5-h6', 'Sustainable Agriculture Practices'),
            p('s5-p15', 'Sustainable agriculture practices play a pivotal role in mitigating greenhouse gas emissions, offering a pathway towards environmentally responsible farming methods. Through innovative techniques and conscientious management, these practices aim to minimise the carbon footprint of agricultural activities while promoting long-term ecological balance.'),
            p('s5-p16', 'Sustainable agriculture prioritises soil health as a fundamental component of greenhouse gas mitigation, emphasising practices such as minimal tillage and cover cropping to enhance carbon sequestration.'),
            p('s5-p17', 'Agroforestry systems within sustainable agriculture, integrates trees into farming landscapes, fostering carbon storage while providing additional environmental benefits such as biodiversity conservation and erosion control.'),
            p('s5-p18', 'Livestock management techniques, such as rotational grazing and improved feed formulations, are integral to sustainable agriculture\'s greenhouse gas mitigation strategy by optimising animal productivity and reducing methane emissions.'),
            p('s5-p19', 'Precision agriculture technologies and integrated pest management practices enable farmers to optimise resource use, minimise emissions from inputs like fertilisers and pesticides, and enhance overall productivity, contributing to greenhouse gas reduction efforts.'),
          ],
        },
      ],
    },

    // ── SECTION 6: Adaptation Strategies (PDF pp. 34–37) ──────────────────────
    {
      _id: 'sec-6-adaptation',
      title: 'Adaptation Strategies',
      slug: { _type: 'slug', current: 'adaptation-strategies' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock',
          _key: 's6-hero',
          image: localImage('Images/AdobeStock_1033564654.webp', 'Adaptation Strategies'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's6-infrastructure',
          content: [
            h2('s6-h1', 'Adaptation Strategies'),
            h3('s6-h2', 'Climate-Resilient Infrastructure'),
            p('s6-p1', 'Climate-resilient infrastructure serves as a cornerstone in adapting to the impacts of climate change while concurrently mitigating greenhouse gas emissions.'),
            p('s6-p2', 'Climate-resilient infrastructure integrates design principles that anticipate and withstand the physical impacts of climate change, such as extreme weather events and sea-level rise, thereby reducing the need for future emissions-intensive reconstruction efforts.'),
            p('s6-p3', 'Green infrastructure solutions, including green roofs, permeable pavements, and urban green spaces, mitigate the urban heat island effect, enhance air quality, and sequester carbon dioxide.'),
            p('s6-p4', 'Climate-resilient infrastructure planning considers future climate projections and incorporates flexible, adaptive design strategies that can accommodate changing conditions, thereby reducing the risk of maladaptation (such as making buildings too hot in summer) and future greenhouse gas emissions.'),
            p('s6-p5', 'Risk-informed decision-making processes in climate-resilient infrastructure planning and investment prioritise actions that reduce vulnerability to climate-related hazards, enhance adaptive capacity, and promote long-term sustainability and resilience.'),
            p('s6-p6', 'Innovative financing mechanisms, such as green bonds, climate resilience funds, and public-private partnerships, help mobilise resources for climate-resilient infrastructure investments, thereby facilitating the transition to low-carbon, climate-resilient development pathways.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's6-water',
          content: [
            h3('s6-h3', 'Water Management'),
            p('s6-p7', 'Climate change poses multi-faceted challenges to water resources worldwide. Water management emerges as a frontline adaptation strategy to climate change impacts.'),
            p('s6-p8', 'Adaptive water management encompasses a suite of measures to address changing hydrological conditions. It involves the strategic allocation and conservation of water resources in response to climate variability. Through robust planning and infrastructure development, water management seeks to enhance resilience to climate-induced stresses. Investment in climate-resilient infrastructure fortifies water systems against extreme weather events.'),
            p('s6-p9', 'Nature-based solutions such as wetland restoration and watershed management bolster adaptive capacity.'),
            p('s6-p10', 'Public awareness campaigns foster water conservation behaviours essential for climate resilience. Adaptive pricing mechanisms can incentivise efficient water use and investment in conservation measures.'),
            p('s6-p11', 'Agricultural water management practices evolve to optimise productivity amidst climate uncertainty. Groundwater management strategies integrate climate projections to sustainably manage aquifers.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's6-ecosystem',
          content: [
            h3('s6-h4', 'Ecosystem Restoration'),
            p('s6-p12', 'Climate change poses unprecedented challenges to global ecosystems, threatening biodiversity and ecosystem services. Ecosystem restoration emerges as an adaptation strategy to mitigate climate change impacts.'),
            p('s6-p13', 'Restoration efforts aim to enhance ecosystem resilience by reinstating natural functions and processes disrupted by climate stressors. Restored ecosystems act as carbon sinks, sequestering atmospheric carbon dioxide and mitigating climate change.'),
            p('s6-p14', 'Through reforestation and afforestation initiatives, degraded landscapes are transformed into carbon-rich habitats, combating greenhouse gas emissions.'),
            p('s6-p15', 'Wetland restoration projects not only store carbon but also buffer against sea-level rise and storm surges, safeguarding coastal communities. Restoring degraded forests, grasslands, and mangroves enhances biodiversity and strengthens ecosystems\' ability to withstand climate extremes.'),
            p('s6-p16', 'Biodiversity restoration along rivers and streams mitigates flooding risks and improves water quality, vital for climate-resilient communities. Restoration of degraded peatlands mitigates carbon emissions and reduces fire risks, crucial in regions vulnerable to climate-induced wildfires. Restoration of coral reefs and marine habitats enhances coastal resilience by protecting against erosion and storm damage.'),
            p('s6-p17', 'Restoration of freshwater ecosystems supports water security by replenishing aquifers and regulating water flow, critical in water-stressed regions. Restoration of degraded mountain ecosystems protects against landslides and enhances water retention, vital for downstream communities.'),
            p('s6-p18', 'Indigenous and local knowledge systems play a pivotal role in guiding ecosystem restoration efforts, drawing on traditional ecological wisdom. Policy frameworks are needed to integrate ecosystem restoration into national climate adaptation plans, recognising its value in building resilience.'),
          ],
        },
        {
          _type: 'richText',
          _key: 's6-ews',
          content: [
            h3('s6-h5', 'Early Warning Systems'),
            p('s6-p19', 'Early warning systems (EWS) serve as crucial tools for enhancing climate change adaptation efforts by providing timely information and alerts about impending hazards and risks. EWS play a pivotal role in enhancing preparedness and reducing vulnerability to climate-related hazards such as extreme weather events, sea-level rise, and droughts. By forecasting and monitoring these hazards, EWS enable governments, communities, and individuals to take timely action to minimise damage and protect lives and livelihoods. For instance, advance warnings of hurricanes or cyclones allow for the evacuation of at-risk populations and the implementation of measures to secure infrastructure and assets.'),
            p('s6-p20', 'Key components of effective early warning systems include robust monitoring and observation networks, reliable data collection and analysis mechanisms, and efficient dissemination channels for alerts and warnings. Technologies, such as satellite imagery, weather radar, and climate modelling, facilitate accurate hazard detection and prediction, enabling authorities to issue timely warnings.'),
            p('s6-p21', 'Moreover, community engagement and stakeholder participation are essential for ensuring the effectiveness and relevance of early warning systems, as local knowledge and insights enhance the accuracy of hazard assessments and response strategies.'),
          ],
        },
      ],
    },

    // ── SECTION 7: Political & Economic Challenges (PDF pp. 38–39) ────────────
    {
      _id: 'sec-7-political',
      title: 'Political & Economic Challenges',
      slug: { _type: 'slug', current: 'political-and-economic-challenges' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 's7-hero',
          image: localImage('Images/AdobeStock_1033564654.webp', 'Challenges and Future Outlook'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's7-political',
          content: [
            h2('s7-h1', 'Challenges and Future Outlook'),
            h3('s7-h2', 'Political and Economic Challenges'),
            p('s7-p1', 'There are many different political views on Renewable Energy and thus there are many policy mechanisms, each with very different stakeholders. These includes; international organisations, national government, local authorities, interest groups, business associations, financial institutions and the wider public.'),
            h3('s7-h3', 'Political Challenges:'),
            p('s7-p2', 'International Cooperation: Addressing climate change requires global collaboration. However, achieving consensus among nations with varying interests, priorities, and historical responsibilities is challenging. Negotiating effective international agreements (such as the Paris Agreement) demands diplomatic efforts and compromises.'),
            p('s7-p3', 'Balancing Priorities: Policymakers must strike a balance between environmental protection and economic growth. Implementing stringent emission reduction measures can impact industries, jobs, and economic stability. Finding a middle ground that ensures sustainability without hindering development is complex.'),
            p('s7-p4', 'Public Opinion and Lobbying: Public awareness and support for climate action are crucial. However some stakeholders can lobby against environmental regulations. Navigating these conflicting interests while prioritising the planet\'s well-being is a political challenge.'),
            p('s7-p5', 'Regulatory Frameworks: Developing and enforcing effective policies, regulations, and incentives to reduce emissions requires political will. Policymakers must overcome resistance from various stakeholders and ensure compliance across sectors.'),
            h3('s7-h4', 'Economic Challenges:'),
            p('s7-p6', 'Cost Allocation: Implementing climate policies incurs costs. Deciding how to allocate these costs among different sectors (industry, agriculture, transportation, etc.) and countries is a complex economic challenge. Fair distribution ensures equitable burden-sharing.'),
            p('s7-p7', 'Job Transitions: As economies transition, some jobs in traditional energy sectors (e.g., coal mining) may be lost. Simultaneously, new opportunities arise in green industries (e.g., solar energy). Managing this workforce transition is critical for social and economic stability.'),
            p('s7-p8', 'Economic Benefits and Losses: While reducing emissions has costs, there are also economic benefits. For instance, investing in clean energy can create jobs and enhance energy security. However, the gains may not be evenly distributed globally, leading to economic disparities.'),
          ],
        },
      ],
    },

    // ── SECTION 8: Technical Innovation (PDF p. 40) ───────────────────────────
    {
      _id: 'sec-8-technical',
      title: 'Technical Innovation',
      slug: { _type: 'slug', current: 'technical-innovation' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 's8-hero',
          image: localImage('Images/AdobeStock_279516743.webp', 'Technical Innovation'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's8-text',
          content: [
            h2('s8-h1', 'Technical Innovation'),
            p('s8-p1', 'Reducing greenhouse gas emissions involves overcoming several technical challenges. We have explored many of the causes of greenhouse gasses but the technology to address the causes is an important future solution to becoming Carbon Net Zero:'),
            h3('s8-h2', 'Carbon Capture, Utilisation, and Storage (CCUS):'),
            p('s8-p2', 'Carbon capture: Capturing CO₂ emissions from industrial processes and power plants is essential. Innovations like the Net Zero Teesside (NZT) project aim to sequester CO₂ by transporting it via pipelines to offshore storage sites beneath the North Sea. This prevents the emitted carbon from contributing to the greenhouse effect.'),
            p('s8-p3', 'Carbon utilisation: Finding ways to use captured CO₂ productively, such as using it instead of manufactured CO₂ is an exciting challenge but there are concerns over how clean this waste CO₂ is.'),
            p('s8-p4', 'Carbon storage: Ensuring secure, long-term storage of sequestered carbon without leaks or environmental risks is critical.'),
            h3('s8-h3', 'Digital Technologies:'),
            p('s8-p5', 'Big data analytics, artificial intelligence, and digital twins can help industries decarbonise operations and value chains.'),
            p('s8-p6', 'Cloud computing, 5G, and blockchain enable efficient energy management.'),
            p('s8-p7', 'Internet of Things (IoT) and automation enhance energy efficiency and reduce emissions.'),
            h3('s8-h4', 'Energy of the Future:'),
            p('s8-p8', 'New energy technologies such as Small Modular Nuclear Reactors and the use of hydrogen and ammonia for transport have not been fully developed and will take time to introduce into mainstream use.'),
          ],
        },
      ],
    },

    // ── SECTION 9: Behavioural Change (PDF p. 41) ─────────────────────────────
    {
      _id: 'sec-9-behavioural',
      title: 'Behavioural Change',
      slug: { _type: 'slug', current: 'behavioural-change' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 's9-hero',
          image: localImage('Images/AdobeStock_315659751.webp', 'Behavioural Change'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's9-text',
          content: [
            h2('s9-h1', 'Behavioural Change'),
            p('s9-p1', 'Behavioral changes play a crucial role in addressing greenhouse gas emissions. While technological advancements are essential, individual actions and habits significantly impact our carbon footprint. Here are some key behavioral changes needed:'),
            h3('s9-h2', 'Transportation:'),
            bullet('s9-b1', 'Carpooling and Public Transportation: Sharing rides and using public transport reduces the number of individual vehicles on the road, thus lowering emissions.'),
            bullet('s9-b2', 'Walking and Cycling: Choosing active modes of transportation instead of driving contributes to a greener lifestyle.'),
            bullet('s9-b3', 'Reduce Air Travel: Aircraft produce substantial greenhouse gas emissions. People could reduce their use of flights and consider alternatives like trains or buses.'),
            h3('s9-h3', 'Energy Use:'),
            bullet('s9-b4', 'Reduce Electricity Consumption: By turning off lights, appliances, and electronics when not in use can reduce greenhouse gas emissions, as can using energy-efficient bulbs and appliances.'),
            bullet('s9-b5', 'Insulate Homes: Proper insulation reduces the need for heating and cooling, saving energy.'),
            bullet('s9-b6', 'Plant Trees: Trees absorb carbon dioxide, mitigating its impact on the atmosphere.'),
            h3('s9-h4', 'Consumer Behaviour:'),
            bullet('s9-b7', 'Buying Responsibly: Supporting companies that prioritise sustainability and eco-friendly practices.'),
            bullet('s9-b8', 'Choose Energy-Efficient Products: When purchasing appliances or vehicles, opt for energy-efficient models.'),
            h3('s9-h5', 'Lifestyle Choices:'),
            bullet('s9-b9', 'Remote Working: Remote work can reduce business travel, positively impacting emissions.'),
            bullet('s9-b10', 'Vacation Choices: Opting for holidays closer to home to reduce travel emissions.'),
            p('s9-p2', 'These and other small individual actions collectively can make a big difference. By adopting sustainable behaviours, people can contribute to a healthier planet and a more sustainable future.'),
          ],
        },
      ],
    },

    // ── SECTION 10: Conclusion & Next Steps (PDF pp. 42–44) ───────────────────
    {
      _id: 'sec-10-conclusion',
      title: 'Conclusion & Next Steps',
      slug: { _type: 'slug', current: 'conclusion-and-next-steps' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 's10-hero',
          image: localImage('Images/AdobeStock_538634442.webp', 'Conclusion — Greenhouse Gas Emissions'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 's10-conclusion',
          content: [
            h2('s10-h1', 'Conclusion'),
            p('s10-p1', 'In conclusion, greenhouse gas emissions represent one of the most critical environmental challenges of our time, deeply influencing the Earth\'s climate system and global sustainability. This module has provided a comprehensive understanding of the sources and impacts of these emissions, from industrial processes and energy production to agriculture and deforestation. Mitigating their effects requires a multi-dimensional approach, combining technological innovation, sustainable practices, and policy frameworks. The transition to renewable energy sources like wind, solar, and hydropower, along with carbon capture and storage (CCS) techniques, are essential components of global mitigation strategies.'),
            p('s10-p2', 'Moreover, adaptation measures such as climate-resilient infrastructure, water management, and ecosystem restoration play an equally important role in addressing the ongoing and future impacts of climate change. International cooperation and individual behavioural changes are also vital in promoting sustainable practices and reducing carbon footprints. As we continue the journey towards achieving net-zero emissions, collective global efforts, supported by scientific advancements and societal commitment, will be paramount in ensuring a sustainable future for the planet.'),
            p('s10-p3', 'In the subsequent sub-modules we will be looking at how the World is moving to a Net Zero future via the energy transition and electrification of our lives.'),
          ],
        },
        {
          _type: 'dividerBlock',
          _key: 's10-div1',
        },
        {
          _type: 'richText',
          _key: 's10-selfled',
          content: [
            h2('s10-h2', 'Self-Led Learning'),
            p('s10-p4', 'Look at the following websites and take yourself through the areas of particular interest to you:'),
            bullet('s10-b1', 'Look at the introduction to Net Zero pages on the UN website — Net Zero Coalition | United Nations: https://www.un.org/en/climatechange/net-zero-coalition'),
            bullet('s10-b2', 'European Union Green Deal — EUR-Lex 52019DC0640: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52019DC0640'),
            bullet('s10-b3', 'Read and Watch 5–10 of the articles on this site on Climate Change — Climate Change (nationalgeographic.org): https://www.nationalgeographic.org/topics/resource-library-climate/'),
            bullet('s10-b4', 'Energy Transition basics — A beginner\'s guide to the energy transition in five steps | World Economic Forum: https://www.weforum.org/agenda/2021/06/energy-transition-beginner-guide/'),
            bullet('s10-b5', 'Jobs — Renewable energy and jobs: Annual review 2023 (ilo.org): https://www.ilo.org/publications/renewable-energy-and-jobs-annual-review-2023'),
            bullet('s10-b6', 'Planning and Approvals Information — Offshore wind in the UK Consenting Information — OWIC | Pathways to Growth: https://www.owic.org.uk/pathways-to-growth'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 's10-exercise',
          variant: 'info',
          title: 'Own Exercise — Personal Case Study',
          body: 'Identify the greenhouse gases from your own business, institution, or area. What type of gases are they, what level of emissions are produced and from what sources. Draft a document outlining this information with as much detail as possible.',
        },
        {
          _type: 'calloutBlock',
          _key: 's10-end',
          variant: 'key-fact',
          title: 'End of Sub-Module 1',
          body: 'Having gone through this module, the suggested additional material and conducting your own research, you should now have an excellent introductory knowledge of what greenhouse gases are, how they are produced and their effect on climate change. You should also be aware of Low Carbon Power production and what is needed to make the necessary move towards Net Zero.\n\nIn the subsequent elective modules we will explore other elements covered in this module in greater detail, as well as looking at new topic areas.',
        },
      ],
    },

    // ── SECTION 11: Confirmation of Learning ─────────────────────────────────
    {
      _id: 'sec-11-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'confirmation-of-learning' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'richText',
          _key: 's11-intro',
          content: [
            h2('s11-h1', 'Confirmation of Learning'),
            p('s11-p1', 'Now that you have completed Sub-Module 1, test your understanding with the questions below. Answer each question and read the feedback carefully — if you are unsure about any answer, use the review links to go back to the relevant section.'),
            p('s11-p2', 'You need to score 70% or above to pass this assessment. You can retake it as many times as you like.'),
          ],
        },
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 's11-col-quiz',
          subModuleSlug: 'greenhouse-gas-emissions',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
