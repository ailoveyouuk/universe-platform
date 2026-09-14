// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 7: Nuclear Energy
// Source: MOD1_SUB7_NUCLEAR.pdf pages 9–36
//
// Phase 1 images served from /public/images/sm7/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  nuclearShareChart,
  nuclearCapacityChart,
  nuclearLcoeChart,
  nuclearUnderConstructionChart,
  nuclearLifecycleEmissionsChart,
} from './sm7-charts'

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
  return { _type: 'image', asset: { _ref: `/images/sm7/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm7/${filename}` }
}

export const subModule7: SubModule = {
  _id: 'sm-7',
  title: 'SM 7 - Nuclear Energy',
  slug: { _type: 'slug', current: 'nuclear' },
  orderIndex: 7,
  estimatedHours: 2,
  learningObjectives: [
    'Explain the principles of nuclear fission and how nuclear power plants generate electricity',
    'Identify the key types of nuclear fuel and the main components of a nuclear reactor',
    'Describe the role of Small Modular Reactors (SMRs) and fusion energy in the future of nuclear power',
    'Assess nuclear energy\'s contribution to global climate goals, including its carbon footprint and baseload role',
    'Evaluate public perception, energy policies, and regulatory frameworks governing nuclear energy worldwide',
    'Understand the economic viability, decommissioning processes, and waste management challenges of nuclear energy',
    'Recognise the skills and workforce requirements for the growing nuclear sector',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to Nuclear Power ─────────────────────────────
    {
      _id: 'sm7-sec-1-intro',
      title: 'Introduction to Nuclear Power',
      slug: { _type: 'slug', current: 'nuclear-introduction' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s1-hero',
          image: localImage('Images/AdobeStock_572860227.webp', 'Nuclear power station cooling towers at dusk'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s1-text',
          content: [
            h2('sm7-s1-h1', 'What is Nuclear Energy?'),
            p('sm7-s1-p1', 'Nuclear energy comes from the binding energy stored in the centre of an atom, holding it together. To release this energy, the atom must be split into smaller atoms -- a process called fission. During a reaction, the smaller atoms do not need as much binding energy to hold them together, so the extra energy is released as heat and radiation.'),
            p('sm7-s1-p2', 'In nuclear power stations, the heat caused by fission is used to boil water into steam. The steam is then used to turn a turbine that drives generators to produce electricity. Nuclear power generation depends on a natural resource abundant in many places around the world. It has low ongoing running costs, produces reliable baseload electricity, and emits no carbon dioxide during operation.'),
            h2('sm7-s1-h2', 'Nuclear Fuel Sources'),
            p('sm7-s1-p3', 'Nuclear fuel is primarily derived from fissile materials -- those capable of sustaining a nuclear fission chain reaction. The three most important nuclear fuels are:'),
            bullet('sm7-s1-b1', 'Uranium-235 (U-235): The most widely used nuclear fuel. Uranium is mined from the earth and then processed to increase the concentration of U-235, which is the isotope that undergoes fission.'),
            bullet('sm7-s1-b2', 'Plutonium-239 (Pu-239): Produced in reactors when Uranium-238 absorbs neutrons. It is fissile and can be used as fuel in certain reactor types, or recovered through reprocessing of spent fuel.'),
            bullet('sm7-s1-b3', 'Thorium-232: Although not directly fissile, Thorium-232 can be converted into Uranium-233, which is fissile, through neutron absorption. It is considered a promising long-term fuel source due to its greater abundance.'),
            h2('sm7-s1-h3', 'Nuclear Energy in the Global Mix'),
            p('sm7-s1-p4', 'Nuclear energy is a key player in the global energy mix, providing a significant portion of low-carbon electricity. It helps reduce greenhouse gas emissions, making it an important tool in combating climate change. Currently, nuclear energy accounts for about 10% of the world\'s electricity, generated by approximately 440 reactors worldwide.'),
            p('sm7-s1-p5', 'Nuclear is a dispatchable power source -- it can be increased or decreased as demand requires. Nuclear power plants offer a stable and reliable source of baseload electricity, crucial for modern economies. This means that nuclear complements renewable energy very well, providing power when the wind is not blowing and the sun is not shining.'),
          ],
        },
        nuclearCapacityChart,
        nuclearShareChart,
        {
          _type: 'nuclearReactorDiagram' as const, _key: 'sm7-s1-reactor-diagram',
          title: 'How a Pressurised Water Reactor (PWR) Generates Electricity',
          caption: 'The PWR is the world\'s most common reactor design. The primary coolant loop (pressurised water) never becomes steam — it transfers heat to a separate secondary loop where steam is generated to drive the turbine.',
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s1-callout',
          variant: 'info',
          title: 'Nuclear as a Baseload Complement to Renewables',
          body: 'Unlike wind and solar, nuclear power generates electricity continuously, 24 hours a day, regardless of weather conditions. This "always-on" characteristic makes it a critical partner to variable renewable energy sources, helping to maintain grid stability while decarbonising the electricity system.',
        },
      ],
    },

    // ── SECTION 2: Nuclear Reactor Technology & SMRs ─────────────────────────
    {
      _id: 'sm7-sec-2-technology',
      title: 'Nuclear Reactor Technology & Small Modular Reactors',
      slug: { _type: 'slug', current: 'nuclear-technology-smrs' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s2-hero',
          image: localImage('Images/AdobeStock_1080814167.webp', 'Inside a nuclear reactor control room'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s2-text',
          content: [
            h2('sm7-s2-h1', 'Advancements in Nuclear Reactor Technology'),
            p('sm7-s2-p1', 'Nuclear technology is continuously being researched to achieve greater energy outputs with simpler and safer operating conditions. Key innovations include:'),
            bullet('sm7-s2-b1', 'High-Temperature Gas-Cooled Reactors: These reactors use helium or other gases as coolants, which can operate at higher temperatures for improved thermal efficiency.'),
            bullet('sm7-s2-b2', 'Liquid Metal-Cooled Reactors: Using liquid metals like sodium or lead as coolants, these reactors offer better heat transfer and safety characteristics, as well as the potential to "burn" existing nuclear waste.'),
            bullet('sm7-s2-b3', 'Advanced Water-Cooled Reactors: These reactors improve upon existing designs with enhanced safety, efficiency, and reduced waste production.'),
            bullet('sm7-s2-b4', 'Walk-Away Safe Designs: New reactors incorporate passive safety features that allow them to shut down automatically without human intervention or external power in emergency scenarios.'),
            bullet('sm7-s2-b4b', 'Molten Salt Reactors: Utilising liquid fuel, these reactors operate at lower pressures and higher temperatures, enhancing safety and efficiency. The molten salt acts as both fuel and coolant, enabling passive safety features.'),
            bullet('sm7-s2-b4c', 'Fusion Reactors: Aiming to replicate the sun\'s energy production process, fusion reactors promise nearly limitless, clean energy by fusing light atomic nuclei such as hydrogen isotopes. The ITER project in France represents the leading international effort to demonstrate fusion\'s commercial feasibility.'),
            bullet('sm7-s2-b4d', 'Hybrid Energy Systems: Integrating nuclear reactors with renewable energy sources to provide a stable and flexible energy supply, combining nuclear baseload with renewable variability management.'),
            h2('sm7-s2-h2', 'Small Modular Reactors (SMRs)'),
            p('sm7-s2-p2', 'Small Modular Reactors (SMRs) are a type of nuclear reactor that are smaller in size compared to traditional reactors and can be manufactured in a factory setting and then assembled on-site. Typically defined as reactors with an output of less than 300 MWe, SMRs offer several distinct advantages over large conventional nuclear plants.'),
            h3('sm7-s2-h3', 'Key Advantages of SMRs'),
            bullet('sm7-s2-b5', 'Flexible Location: Their smaller footprint allows them to be deployed in locations unsuitable for larger reactors, including remote communities, industrial facilities, and areas with smaller grid systems.'),
            bullet('sm7-s2-b6', 'Scalability: SMRs can be scaled up or down by adding or removing modules, allowing energy output to closely match demand.'),
            bullet('sm7-s2-b7', 'Mass Production: Being simpler and manufactured in larger numbers allows efficiencies from the scale and repetition of production, which could significantly reduce costs.'),
            h3('sm7-s2-h4', 'Challenges Still to be Addressed'),
            bullet('sm7-s2-b8', 'Regulatory Hurdles: Existing nuclear regulations were designed for large reactors, requiring significant adjustments for SMR approval processes.'),
            bullet('sm7-s2-b9', 'Public Perception: Concerns over nuclear waste management and safety remain, requiring transparent communication with communities.'),
            bullet('sm7-s2-b10', 'First-of-a-Kind Costs: The initial commercial SMRs will be expensive; cost reductions from serial manufacturing will only materialise once sufficient numbers are deployed.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s2-case',
          variant: 'info',
          title: 'Case Study: Holtec SMR-300',
          body: 'The Holtec SMR-300 is designed to produce 300 MWe of low-carbon electricity. Built on proven Pressurised Water Reactor (PWR) technology and similar to fuel already used at Sizewell B, Holtec\'s design aims to supply UK homes and businesses with clean power for 80 years. SMRs like the SMR-300 represent a potential step-change in how nuclear energy is deployed globally.',
        },
        nuclearUnderConstructionChart,
      ],
    },

    // ── SECTION 3: Fusion Energy & Climate Change ─────────────────────────────
    {
      _id: 'sm7-sec-3-fusion',
      title: 'Fusion Energy & Nuclear\'s Role in Climate Action',
      slug: { _type: 'slug', current: 'nuclear-fusion-climate' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s3-hero',
          image: localImage('Images/AdobeStock_891921005.webp', 'Fusion energy research facility'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s3-text',
          content: [
            h2('sm7-s3-h1', 'Fusion Energy'),
            p('sm7-s3-p1', 'Fusion energy is the process of combining light atomic nuclei, such as hydrogen isotopes, to form a heavier nucleus, releasing a tremendous amount of energy. This is the same process that powers the sun and other stars. Unlike fission, fusion produces very little long-lived radioactive waste and uses hydrogen isotopes (deuterium and tritium) that are far more abundant than uranium.'),
            p('sm7-s3-p2', 'Achieving practical fusion power has been the goal of researchers for decades. International projects like ITER (the International Thermonuclear Experimental Reactor), currently under construction in southern France, represent a global collaboration of 35 nations committed to demonstrating the scientific and technical feasibility of fusion power. While commercial fusion remains a longer-term prospect -- likely beyond 2040 -- significant private investment is now accelerating progress.'),
            h2('sm7-s3-h2', 'Nuclear Energy and Climate Change'),
            p('sm7-s3-p3', 'Nuclear energy is a pivotal component in the global strategy to combat climate change. As a low-carbon energy source, nuclear power plants generate electricity without emitting carbon dioxide during operation, making them a cleaner alternative to fossil fuels. Life-cycle emissions for nuclear energy are comparable to those of wind and solar energy -- typically 4-12 gCO2e/kWh.'),
            p('sm7-s3-p4', 'The high carbon footprint from construction of nuclear power plants is sometimes raised as a concern. However, these upfront emissions are spread over 60-80 year operational lifetimes, and the long-term climate benefits -- including reduced greenhouse gas emissions and the ability to support variable renewables via baseload -- can significantly outweigh these initial considerations.'),
            bullet('sm7-s3-b1', 'Life-Cycle Emissions: Nuclear energy generates approximately 4-12 gCO2e/kWh over its full lifecycle -- comparable to offshore wind and substantially lower than gas (490 gCO2e/kWh) or coal (820 gCO2e/kWh).'),
            bullet('sm7-s3-b2', 'Role in Climate Agreements: Nuclear energy is formally recognised in several national net-zero strategies as a critical low-carbon technology, alongside renewables and carbon capture.'),
            bullet('sm7-s3-b3', 'Baseload Stability: Nuclear provides the firm, dispatchable power that helps grid operators balance increasingly variable renewable generation without resorting to fossil fuel backup.'),
            p('sm7-s3-p5', 'Nuclear energy can also play a pivotal role in decarbonising hard-to-abate sectors — including heavy industry and transportation — through the production of low-carbon hydrogen via nuclear-powered electrolysis. This is known as "Pink Hydrogen." By using surplus nuclear electricity to power electrolysers, the hydrogen produced carries a near-zero carbon footprint, offering a clean fuel for sectors that cannot be easily electrified.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s3-callout',
          variant: 'key-fact',
          title: 'Nuclear\'s Carbon Footprint vs Fossil Fuels',
          body: 'Nuclear energy emits approximately 4-12 grams of CO2 equivalent per kilowatt-hour over its full lifecycle -- roughly comparable to wind power (7-15 gCO2e/kWh) and solar (20-50 gCO2e/kWh), and around 100 times lower than coal (820 gCO2e/kWh). This makes nuclear one of the most carbon-efficient electricity sources available at scale.',
        },
        nuclearLifecycleEmissionsChart,
      ],
    },

    // ── SECTION 4: Public Perception & Energy Policies ───────────────────────
    {
      _id: 'sm7-sec-4-perception',
      title: 'Public Perception & Global Energy Policies',
      slug: { _type: 'slug', current: 'nuclear-perception-policies' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s4-hero',
          image: localImage('Images/AdobeStock_266553825.webp', 'Nuclear policy discussion and public debate'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s4-text',
          content: [
            h2('sm7-s4-h1', 'Public Perception of Nuclear Energy'),
            p('sm7-s4-p1', 'Public perception of nuclear energy is a complex and emotive issue influenced by historical events, media portrayal, environmental concerns, and economic considerations. High-profile accidents -- notably Three Mile Island (1979), Chernobyl (1986), and Fukushima (2011) -- have significantly shaped public attitudes, contributing to fears about catastrophic failures and radiation exposure.'),
            p('sm7-s4-p2', 'Media portrayal plays a significant role in shaping public opinion. Sensationalist reporting can amplify fears and misconceptions about radiation risk, nuclear waste, and the safety of nuclear facilities. Despite these challenges, there is growing recognition of nuclear\'s role in achieving carbon neutrality -- particularly among younger generations more focused on climate change.'),
            p('sm7-s4-p3', 'Economic factors also influence public perception. The high initial costs of constructing nuclear power plants and long development timescales are often seen as significant barriers. However, the relatively low operating costs and the potential for long-term energy security can make nuclear an attractive option.'),
            h2('sm7-s4-h2', 'Nuclear Energy Policies Around the World'),
            p('sm7-s4-p4', 'Nuclear energy policies vary significantly across the globe, reflecting each country\'s unique energy needs, geography, economic conditions, and public perceptions. These policies encompass nuclear generation, regulation of fuel cycles, safety standards, waste management, and the development of new technologies.'),
            h3('sm7-s4-h3', 'Country Examples'),
            bullet('sm7-s4-b1', 'United States: Focused on maintaining its existing fleet while investing in advanced technologies including SMRs. New incentives under the Inflation Reduction Act are renewing interest in nuclear expansion.'),
            bullet('sm7-s4-b2', 'France: The world\'s most nuclear-dependent large economy (around 70% of electricity from nuclear) is investing in a new fleet of six EPR2 reactors while extending existing plant lifetimes.'),
            bullet('sm7-s4-b3', 'Germany: Following the Fukushima disaster, Germany completed its nuclear phase-out in 2023, shifting to a renewables-focused energy strategy.'),
            bullet('sm7-s4-b4', 'South Korea: Has a strong nuclear programme and aims to increase nuclear\'s share to 30% of electricity by 2030, while also exporting reactor technology.'),
            bullet('sm7-s4-b5', 'United Kingdom: Pursuing new large reactors (Hinkley Point C) and SMRs, with an ambition for nuclear to contribute up to a quarter of UK electricity by 2050.'),
            bullet('sm7-s4-b6', 'India & China: Both are rapidly expanding nuclear capacity to meet growing energy demands and reduce dependence on coal.'),
            bullet('sm7-s4-b7', 'Japan: Japan\'s nuclear policy has been significantly influenced by the Fukushima disaster in 2011. Following the accident, Japan shut down its reactor fleet and moved towards reducing nuclear energy. However, in 2022 the government signalled a major policy reversal, announcing plans to restart existing reactors and explore next-generation nuclear technologies as part of its energy security and net-zero strategy.'),
            bullet('sm7-s4-b8', 'Canada: Canada has a well-established nuclear energy sector, particularly in Ontario, where nuclear power provides a significant proportion of electricity. The country is investing in Small Modular Reactors (SMRs) and advanced nuclear technologies, with several provinces exploring SMR deployment for both grid-scale and remote community applications.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s4-callout',
          variant: 'warning',
          title: 'Managing Public Perception',
          body: 'Building and maintaining public trust in nuclear energy requires transparent communication about risks, open dialogue with affected communities, and robust independent regulation. Evidence consistently shows that public acceptance increases with direct information and engagement -- and declines when decisions are made behind closed doors.',
        },
      ],
    },

    // ── SECTION: Nuclear Energy in Developing Countries ───────────────────────
    {
      _id: 'sm7-sec-developing',
      title: 'Nuclear Energy in Developing Countries',
      slug: { _type: 'slug', current: 'nuclear-developing-countries' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'richText',
          _key: 'sm7-developing-text',
          content: [
            h2('sm7-dev-h1', 'Nuclear Energy in Developing Countries'),
            p('sm7-dev-p1', 'Nuclear energy holds significant promise for developing countries, offering a reliable, low-carbon energy source to support economic growth and reduce dependence on fossil fuels. As the global energy transition accelerates, several emerging economies are exploring nuclear power as a cornerstone of their clean energy strategies.'),
            h3('sm7-dev-h2', 'Opportunities'),
            bullet('sm7-dev-b1', 'Reliable Baseload Power: Nuclear energy can deliver large amounts of electricity continuously, providing the stable baseload supply that growing economies need to support industrialisation and urbanisation.'),
            bullet('sm7-dev-b2', 'Energy Independence: Nuclear reduces dependence on imported fossil fuels, improving energy security and insulating economies from volatile global commodity prices.'),
            bullet('sm7-dev-b3', 'Low Carbon Development: For countries seeking to industrialise without replicating the high-carbon pathways of earlier industrial economies, nuclear offers a pathway to economic growth with minimal greenhouse gas emissions.'),
            h3('sm7-dev-h3', 'Obstacles'),
            bullet('sm7-dev-b4', 'High Capital Costs: The significant upfront investment required for nuclear power plants can be prohibitive for developing countries with limited access to financing and constrained public budgets.'),
            bullet('sm7-dev-b5', 'Technical Expertise and Regulatory Infrastructure: Building and operating nuclear facilities safely requires specialised engineering knowledge, robust regulatory frameworks, and well-trained workforces — all of which take decades to develop.'),
            bullet('sm7-dev-b6', 'Public Opposition: Concerns about nuclear safety, particularly following high-profile accidents, can generate significant public opposition that complicates project development.'),
            bullet('sm7-dev-b7', 'Construction Timescales: Nuclear plants typically take 10-20 years from planning to commissioning, which may not align with the urgent energy needs of rapidly developing economies.'),
            bullet('sm7-dev-b8', 'Geopolitical Considerations: Access to uranium supply chains, nuclear technology transfers, and non-proliferation obligations can create complex geopolitical dependencies for countries entering the nuclear sector.'),
            h3('sm7-dev-h4', 'The Role of International Support'),
            p('sm7-dev-p2', 'The International Atomic Energy Agency (IAEA) plays a critical role in supporting emerging nuclear economies. Through technical assistance programmes, training, safety reviews, and capacity building, the IAEA helps developing countries build the expertise and regulatory frameworks needed to safely develop nuclear energy. Agreements between established nuclear states and emerging economies — such as Russia\'s Rosatom international projects — are also facilitating nuclear development in countries including Egypt, Turkey, Bangladesh, and several African nations.'),
          ],
        },
      ],
    },

    // ── SECTION: Nuclear Energy and Water Usage ───────────────────────────────
    {
      _id: 'sm7-sec-water',
      title: 'Nuclear Energy and Water Usage',
      slug: { _type: 'slug', current: 'nuclear-water-usage' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm7-water-text',
          content: [
            h2('sm7-water-h1', 'Nuclear Energy and Water Usage'),
            p('sm7-water-p1', 'Nuclear energy and water usage are intricately connected, as nuclear power plants require large amounts of water for cooling and heat dissipation. Understanding these water dependencies is important for assessing nuclear\'s overall environmental footprint and its viability in water-stressed regions.'),
            h3('sm7-water-h2', 'Cooling Systems'),
            bullet('sm7-water-b1', 'Once-Through Cooling: Water is drawn from a natural source such as a river, lake, or the sea, used to absorb heat from the steam condenser, and returned to the source at a higher temperature. This method uses large volumes of water but consumes relatively little — most is returned after cooling.'),
            bullet('sm7-water-b2', 'Closed-Loop Cooling: Water is circulated in a closed loop using cooling towers to dissipate heat into the atmosphere. This method consumes more water through evaporation but withdraws far less from natural sources, reducing pressure on local water bodies.'),
            h3('sm7-water-h3', 'Environmental Impacts'),
            bullet('sm7-water-b3', 'Thermal Pollution: The release of warmer water back into rivers or seas can increase local water temperatures, reducing oxygen levels and negatively impacting fish and other aquatic life — a particular concern for plants located on smaller rivers or in ecologically sensitive areas.'),
            bullet('sm7-water-b4', 'Water Scarcity Risk: During periods of drought or low river flows, nuclear plants may face operational challenges or even temporary shutdowns to comply with thermal discharge limits. As climate change intensifies drought frequency, this risk is growing for inland nuclear facilities.'),
            h3('sm7-water-h4', 'Mitigation Approaches'),
            p('sm7-water-p2', 'Dry cooling systems, which use air rather than water to dissipate heat, offer an alternative that significantly reduces water consumption. However, dry cooling is more expensive to build and operate, and is less thermally efficient — typically reducing the plant\'s net electricity output, particularly during hot weather. Hybrid wet-dry systems are increasingly being explored to balance water conservation with operational efficiency.'),
          ],
        },
      ],
    },

    // ── SECTION 5: Regulation & Safety ───────────────────────────────────────
    {
      _id: 'sm7-sec-5-safety',
      title: 'Regulation & Safety Measures',
      slug: { _type: 'slug', current: 'nuclear-regulation-safety' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s5-hero',
          image: localImage('Images/AdobeStock_214046664.webp', 'Nuclear safety inspection and monitoring'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s5-text',
          content: [
            h2('sm7-s5-h1', 'Nuclear Energy Regulation'),
            p('sm7-s5-p1', 'Nuclear energy regulation is a critical aspect of the nuclear industry, ensuring the safe and secure use of nuclear technology. International regulatory bodies -- led by the International Atomic Energy Agency (IAEA) -- play a pivotal role in setting global safety standards, providing guidelines for nuclear security, and facilitating cooperation among countries.'),
            p('sm7-s5-p2', 'The IAEA also assists in non-proliferation efforts, verifying that nuclear materials are not diverted for weapons purposes. National regulators -- such as the UK\'s Office for Nuclear Regulation (ONR) and the US Nuclear Regulatory Commission (NRC) -- implement these standards within their jurisdictions, operating independently of government to maintain public confidence.'),
            p('sm7-s5-p3', 'Effective regulation involves rigorous risk assessments, continuous oversight, and adapting to new challenges such as cyber threats to nuclear facilities. Modern licensing processes for new reactor designs can take 10-15 years, reflecting the complexity and importance of getting nuclear safety right.'),
            h2('sm7-s5-h2', 'Safety Innovations in Nuclear Power Plants'),
            p('sm7-s5-p4', 'Ensuring the safety of nuclear plants is paramount. Several significant innovations have been developed to mitigate risks:'),
            bullet('sm7-s5-b1', 'Passive Safety Systems: Modern reactors are designed to shut down safely using only gravity and natural convection -- without requiring human action or external power. These "walk-away safe" designs represent a fundamental improvement over earlier reactor generations.'),
            bullet('sm7-s5-b2', 'Advanced Monitoring: Sophisticated sensors and real-time data analysis systems detect anomalies early, allowing prompt corrective action before issues escalate.'),
            bullet('sm7-s5-b3', 'Rigorous Training Programmes: Personnel undergo extensive, continuous training to ensure they are well-prepared for normal operations and emergencies alike.'),
            bullet('sm7-s5-b4', 'Multi-Barrier Containment: Modern reactors are designed with multiple independent safety barriers -- fuel cladding, the reactor pressure vessel, and a reinforced containment building -- to prevent radioactive release even in the event of an accident.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s5-callout',
          variant: 'info',
          title: 'The IAEA Safeguards System',
          body: 'The IAEA\'s safeguards system is the cornerstone of international nuclear non-proliferation. Through regular inspections, continuous monitoring, and verification activities, the IAEA ensures that nuclear materials and facilities are used only for peaceful purposes -- providing the world community with confidence that nuclear energy is being used responsibly.',
        },
      ],
    },

    // ── SECTION 6: Economic Viability & Global Landscape ─────────────────────
    {
      _id: 'sm7-sec-6-economics',
      title: 'Economic Viability of Nuclear Energy',
      slug: { _type: 'slug', current: 'nuclear-economics' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s6-hero',
          image: localImage('Images/AdobeStock_230438524.webp', 'Nuclear power plant with financial charts'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s6-text',
          content: [
            h2('sm7-s6-h1', 'The Economics of Nuclear Power'),
            p('sm7-s6-p1', 'The economic viability of nuclear energy is a complex issue that involves analysing both the costs and benefits associated with nuclear power over the very long term and comparing them against other sources of electricity generation. Nuclear plants are characterised by high upfront capital costs but relatively low and predictable operating costs over their 60-80 year lifetimes.'),
            p('sm7-s6-p2', 'Fuel costs for nuclear energy are a minor proportion of total generating costs. Uranium, the primary fuel, is abundant and relatively inexpensive. Additionally, nuclear plants require refuelling only every 18-24 months, which contributes to their cost stability and energy security benefits -- unlike gas plants, which are exposed to volatile fuel markets.'),
            p('sm7-s6-p3', 'Decommissioning and waste disposal costs are fully accounted for in economic analyses of nuclear power. These costs are included in operating expenses and managed through dedicated funds set aside during the plant\'s operational lifetime, a regulatory requirement in most jurisdictions.'),
            h2('sm7-s6-h2', 'Integrating Nuclear with Renewables'),
            p('sm7-s6-p4', 'Integrating nuclear energy with renewable sources like wind, solar, and hydropower is essential for creating a sustainable and reliable energy system. This integration leverages the strengths of both energy types to address the intermittency of renewables. Nuclear plants can adjust their output to complement variable renewables, enhancing grid stability without the emissions of gas peaking plants.'),
          ],
        },
        nuclearLcoeChart,
        {
          _type: 'calloutBlock', _key: 'sm7-s6-callout',
          variant: 'warning',
          title: 'The Cost Challenge for New-Build Nuclear',
          body: 'New nuclear plants have faced cost overruns and construction delays in Western countries -- notably Hinkley Point C in the UK and Vogtle in the USA. These challenges have driven interest in SMRs and advanced reactor designs that aim for more predictable construction timelines and costs through factory manufacturing and standardisation.',
        },
      ],
    },

    // ── SECTION 7: Decommissioning & Waste Management ────────────────────────
    {
      _id: 'sm7-sec-7-waste',
      title: 'Decommissioning & Waste Management',
      slug: { _type: 'slug', current: 'nuclear-decommissioning-waste' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s7-hero',
          image: localImage('Images/AdobeStock_385593052.webp', 'Nuclear waste storage facility'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s7-text',
          content: [
            h2('sm7-s7-h1', 'Decommissioning of Nuclear Plants'),
            p('sm7-s7-p1', 'The decommissioning of nuclear plants is a complex, expensive, but critical stage in the life cycle of a nuclear facility. It typically occurs in three stages: immediate dismantling, safe enclosure, and entombment. Immediate dismantling involves quickly removing all radioactive materials after the plant ceases operation. Safe enclosure involves placing the plant in a state of safe shutdown for a defined period (often 40-100 years) to allow radioactivity to decay before full dismantling.'),
            p('sm7-s7-p2', 'Decommissioning faces technical challenges requiring specialised expertise for tasks such as cutting and handling irradiated components, decontaminating areas, and ensuring the long-term safety of sites. Regulation requires that sufficient decommissioning funds are set aside during the plant\'s operational lifetime, with most countries establishing ring-fenced trust funds for this purpose.'),
            h2('sm7-s7-h2', 'Nuclear Waste Management'),
            p('sm7-s7-p3', 'Nuclear waste management is a critical aspect of the nuclear fuel cycle, encompassing the handling, treatment, and disposal of radioactive materials generated from nuclear reactors. The primary goal is to protect human health and the environment from the harmful effects of radiation.'),
            p('sm7-s7-p4', 'Nuclear waste is classified by its level of radioactivity -- low-level, intermediate-level, and high-level waste. High-level waste, which includes spent fuel rods, accounts for about 3% of the volume but 95% of the radioactivity. It requires shielding and cooling for decades before long-term disposal.'),
            bullet('sm7-s7-b1', 'Geological Disposal: Deep geological repositories are considered the most viable long-term solution for high-level waste. These repositories are located deep underground in stable geological formations, providing isolation from the biosphere for thousands of years. Finland\'s Onkalo facility is the world\'s first purpose-built deep geological repository.'),
            bullet('sm7-s7-b2', 'Interim Storage: Spent fuel is typically stored in water-filled pools at reactor sites for at least 5-10 years to allow cooling and radioactive decay, before being transferred to dry cask storage for longer-term interim management.'),
            bullet('sm7-s7-b3', 'Reprocessing: Some countries -- notably France, the UK, and Russia -- reprocess spent fuel to separate out usable plutonium and uranium, reducing the volume of high-level waste while producing new fuel.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s7-callout',
          variant: 'info',
          title: 'How Much Nuclear Waste Does the World Produce?',
          body: 'All the high-level radioactive waste produced by the global nuclear industry since 1954 would, if stacked together, fill a volume roughly equivalent to a football pitch to a depth of around 10 metres. While the radioactivity is hazardous, the relatively small volume (compared to, say, CO2 emissions from fossil fuels) means that geological disposal is an achievable engineering challenge.',
        },
        {
          _type: 'nuclearWasteClassificationDiagram' as const, _key: 'sm7-s7-waste-diagram',
          title: 'Nuclear Waste Classification: LLW, ILW and HLW',
          caption: 'While high-level waste (HLW) accounts for only ~3% of total waste volume, it contains ~95% of the total radioactivity. The IAEA classification system governs how each waste class is handled, stored, and disposed of worldwide.',
        },
      ],
    },

    // ── SECTION 8: Workforce & International Collaboration ────────────────────
    {
      _id: 'sm7-sec-8-workforce',
      title: 'Nuclear Workforce Development & International Collaboration',
      slug: { _type: 'slug', current: 'nuclear-workforce-collaboration' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s8-hero',
          image: localImage('Images/AdobeStock_258723400.webp', 'Nuclear engineers in a control room'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s8-text',
          content: [
            h2('sm7-s8-h1', 'Nuclear Energy Workforce Development'),
            p('sm7-s8-p1', 'Training and education programmes for the nuclear workforce are essential to prepare professionals capable of addressing the complex challenges of the nuclear energy sector. These programmes span academic, professional, and government pathways, including:'),
            bullet('sm7-s8-b1', 'University Degree Programmes: Bachelor\'s and Master\'s degrees in Nuclear Engineering, Physics, and related fields form the academic foundation. Many programmes include both theoretical coursework and hands-on laboratory training.'),
            bullet('sm7-s8-b2', 'Postgraduate Certification: Designed for professionals already in the workforce, these programmes provide advanced technical knowledge in nuclear safety, environmental impact, and regulatory compliance.'),
            bullet('sm7-s8-b3', 'Professional Development: Organisations like the American Nuclear Society (ANS) and European Nuclear Society (ENS) offer continuous education, conferences, and workshops on emerging topics such as SMRs and fusion.'),
            bullet('sm7-s8-b4', 'Collaborative Research Centres: Joint initiatives between universities and national laboratories -- such as Idaho National Laboratory (US) or the CEA (France) -- offer access to cutting-edge research facilities and real-world nuclear engineering challenges.'),
            bullet('sm7-s8-b5', 'Government and Military Programmes: Government agencies and military nuclear propulsion programmes are major employers and trainers of nuclear engineers, providing structured career pathways.'),
            bullet('sm7-s8-b6', 'Specialised Nuclear Engineering Schools: Institutions such as MIT, Tsinghua University, and Imperial College London have specialised nuclear engineering programmes that produce the physicists, engineers, and materials scientists the sector requires.'),
            bullet('sm7-s8-b7', 'Apprenticeships and Internships: Collaboration between universities and nuclear companies — such as Rolls-Royce, EDF, and Westinghouse — provides students with practical experience on real-world nuclear engineering challenges.'),
            bullet('sm7-s8-b8', 'IAEA Training Programmes: The IAEA offers training workshops, fellowships, and distance learning opportunities to support nuclear workforce development worldwide, particularly in countries entering the nuclear sector for the first time.'),
            bullet('sm7-s8-b9', 'Operator Training Programmes: For plant workers, specialised operator training programmes cover reactor systems, safety procedures, crisis management, and emergency response. These programmes are often accredited through bodies such as the Institute of Nuclear Power Operations (INPO).'),
            h2('sm7-s8-h2', 'International Collaboration in Nuclear Research'),
            p('sm7-s8-p2', 'International collaboration in nuclear research plays a pivotal role in advancing nuclear technology and ensuring its safe, efficient, and sustainable use. Joint efforts between countries, research institutions, and industry are essential for developing next-generation technologies and addressing shared challenges.'),
            p('sm7-s8-p3', 'The Generation IV International Forum (GIF) focuses on the development of next-generation nuclear reactors, with participating countries sharing research, safety standards, and design concepts. ITER represents perhaps the largest scientific collaboration in history -- 35 nations building a fusion reactor to demonstrate the feasibility of fusion energy as a practical power source.'),
            p('sm7-s8-p4', 'Collaborative nuclear research extends beyond power generation to nuclear medicine, radiation protection, and waste management -- all areas where international cooperation multiplies the effectiveness of individual nations\' efforts.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s8-callout',
          variant: 'info',
          title: 'Growing Demand for Nuclear Skills',
          body: 'With multiple new reactor projects under development globally -- from large EPR2s in France to SMRs in the UK, US, and Canada -- demand for nuclear engineers, safety specialists, project managers, and skilled tradespeople is growing rapidly. The sector faces a generational skills challenge as experienced workers retire, making nuclear education and training investment a strategic priority.',
        },
      ],
    },

    // ── SECTION 9: The Future of Nuclear Energy ───────────────────────────────
    {
      _id: 'sm7-sec-9-future',
      title: 'The Future of Nuclear Energy',
      slug: { _type: 'slug', current: 'nuclear-future' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm7-s9-hero',
          image: localImage('Images/AdobeStock_762312626.webp', 'Futuristic nuclear energy concept'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm7-s9-text',
          content: [
            h2('sm7-s9-h1', 'The Future of Nuclear Energy'),
            p('sm7-s9-p1', 'The future of nuclear energy is shaped by both opportunities and challenges as the world seeks sustainable energy solutions to combat climate change and meet growing electricity demands. Several key trends are emerging:'),
            bullet('sm7-s9-b1', 'SMRs and Advanced Reactors: Small Modular Reactors -- which are more flexible and cost-effective than traditional large reactors -- are becoming increasingly likely to be deployed this decade, particularly in the UK, US, Canada, and Eastern Europe.'),
            bullet('sm7-s9-b2', 'Life Extension of Existing Fleets: Many countries are investing in extending the operational lifetimes of existing nuclear plants by 20-40 years, recognising their value as low-carbon baseload assets during the energy transition.'),
            bullet('sm7-s9-b3', 'Nuclear-Renewable Integration: Nuclear is increasingly being positioned as a partner to variable renewables, providing firm low-carbon capacity and potentially producing green hydrogen via electrolysis during periods of low demand.'),
            bullet('sm7-s9-b4', 'Fusion Power: Private investment in fusion has surged, with companies such as Commonwealth Fusion Systems, TAE Technologies, and Helion Energy pursuing commercial fusion by the 2030s -- though significant technical hurdles remain.'),
            bullet('sm7-s9-b5', 'Developing World Expansion: Countries in Asia, the Middle East, and Africa are pursuing nuclear programmes as a means of meeting growing energy demand while reducing fossil fuel dependence.'),
            h2('sm7-s9-h2', 'Conclusion'),
            p('sm7-s9-p2', 'Nuclear power policy plays a pivotal role in the global energy landscape, with countries formulating strategies that balance energy security, sustainability, and socio-economic considerations. The socio-economic impact of nuclear projects -- from high-quality skilled jobs to reliable baseload power -- is significant. As the energy transition accelerates, nuclear energy is increasingly seen as a necessary complement to renewable energy sources rather than an alternative.'),
            p('sm7-s9-p3', 'Increasing skills in nuclear sciences and engineering will be needed as nuclear generation expands globally, requiring a larger and more diverse workforce. International cooperation -- in regulation, research, fuel cycle management, and non-proliferation -- will remain essential to ensuring that nuclear energy contributes positively to global energy security and climate goals.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm7-s9-callout',
          variant: 'key-fact',
          title: 'Nuclear\'s Place in a Net-Zero World',
          body: 'The IPCC Sixth Assessment Report identifies nuclear energy as one of the key low-carbon technologies required to limit warming to 1.5 degrees C. Most credible net-zero scenarios see a role for nuclear as a firm, low-carbon baseload source -- particularly in countries where geography or resource constraints limit renewable potential. Nuclear and renewables are increasingly allies, not rivals, in the clean energy transition.',
        },
      ],
    },


    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm7-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'nuclear-energy-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm7-conc-text',
          content: [
            h2('sm7-conc-h1', 'Sub-Module Summary'),
            p('sm7-conc-p1', 'This sub-module has provided a comprehensive overview of nuclear energy — a low-carbon, high-density power source that currently supplies approximately 10% of global electricity. Nuclear\'s defining characteristic is its ability to provide reliable, dispatchable baseload power with virtually zero operational greenhouse gas emissions. Generation III and III+ reactor designs (such as the EPR and AP1000) represent the current state of the art in commercial deployment, while Generation IV concepts — including molten salt, fast neutron, and high-temperature gas reactors — promise improved safety, fuel efficiency, and waste profiles.'),
            p('sm7-conc-p2', 'Small Modular Reactors (SMRs) are emerging as a potentially transformative development — offering factory-built, lower-capital units that could accelerate deployment, particularly in regions with smaller grids or constrained capital markets. Fusion energy, while still decades from commercial deployment, represents the ultimate prize: near-limitless clean energy from hydrogen isotopes. The economics of new-build nuclear remain challenging — high upfront capital costs and long construction timelines demand policy certainty and long-term financing frameworks — though life-extension programmes for existing plants offer cost-effective low-carbon generation.'),
            p('sm7-conc-p3', 'Safety and waste management are the issues that most shape public perception of nuclear energy. The global safety record — measured per unit of energy produced — is excellent, and the IAEA\'s safeguards system provides international oversight. Radioactive waste management, particularly high-level spent fuel, requires geological disposal solutions that must function over millennia. Workforce development — attracting engineers, physicists, and technicians into a sector competing for talent with renewables and digital industries — is a growing strategic priority. Nuclear\'s role in a net-zero future is increasingly recognised as essential, particularly as the intermittency of wind and solar places a premium on firm, low-carbon generation.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm7-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 7',
          body: 'You now have a thorough grounding in nuclear energy — from reactor technology and safety to economics, waste management, and the workforce needed to sustain and grow the sector. Nuclear\'s role in the net-zero transition remains one of the most actively debated topics in energy policy.',
        },
      ],
    },
    {
      _id: 'sm7-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'nuclear-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm7-col-quiz',
          subModuleSlug: 'nuclear',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
