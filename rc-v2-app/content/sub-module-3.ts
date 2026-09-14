// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 3: The Energy Transition
// Source: PDF pages 4–36 (verbatim text — do not edit without updating source)
//
// Phase 1 images are served from /public/images/sm3/
// Copy source files from: Platform_Dev/Module Assets/Sub-Module 3/Images/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  globalElecProductionChart,
  globalEnergyConsumptionChart,
  renewableShareByCountryChart,
  energyInvestmentProjectionChart,
  renewableJobsChart,
  energyInvestmentChart,
  evAdoptionChart,
  renewableShareChart,
  storageTechnologyChart,
  reEmploymentByTechChart,
  reEmploymentSnapshot2023Chart,
} from './sm3-charts'

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
    asset: { _ref: `/images/sm3/${filename}`, _type: 'reference' },
    alt,
    localSrc: `/images/sm3/${filename}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 3 Data
// ─────────────────────────────────────────────────────────────────────────────

export const subModule3: SubModule = {
  _id: 'sm-3',
  title: 'SM 3 — The Energy Transition',
  slug: { _type: 'slug', current: 'energy-transition' },
  orderIndex: 3,
  estimatedHours: 2,
  learningObjectives: [
    'Define the energy transition and understand why it is critical for achieving Net Zero',
    'Identify the key renewable energy technologies driving the transition',
    'Explain the role of energy efficiency in reducing emissions immediately',
    'Understand decarbonisation strategies across transport, industry, and buildings',
    'Recognise the importance of grid modernisation and energy storage for a renewable future',
    'Assess the economic and social impacts of the energy transition on communities and workers',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction — Defining the Energy Transition (PDF pp. 4–8) ──
    {
      _id: 'sm3-sec-1-intro',
      title: 'Introduction — What Is the Energy Transition?',
      slug: { _type: 'slug', current: 'what-is-the-energy-transition' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s1-hero',
          image: localImage('Images/AdobeStock_1306220361.webp', 'The Energy Transition — from fossil fuels to clean energy'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s1-text',
          content: [
            h2('sm3-s1-h1', 'What Is the Energy Transition?'),
            p('sm3-s1-p1', 'The energy transition is one of the most important shifts in human history — a fundamental restructuring of how the world produces, distributes, and consumes energy. There are many ways to define it:'),
            bullet('sm3-s1-b1', '"Humanity\'s global shift from fossil-based systems of energy production and consumption toward a future defined by clean, zero-carbon energy."'),
            bullet('sm3-s1-b2', '"The strategic reconfiguration of national and global energy systems to eliminate fossil fuel reliance and achieve Net-Zero emissions."'),
            bullet('sm3-s1-b3', '"A global re-industrialisation effort to replace legacy energy infrastructure with sustainable, low-carbon technologies and supply chains."'),
            bullet('sm3-s1-b4', '"The systemic shift from carbon-intensive energy production and consumption to integrated, renewable, and Net-Zero energy systems."'),
            bullet('sm3-s1-b5', '"A defining chapter in human progress — the bold transformation from fossil-fuel dependence to a resilient, zero-carbon energy future."'),
            p('sm3-s1-p2', 'In essence: the energy transition is the world\'s transformation toward clean, secure, and sustainable energy.'),
            h3('sm3-s1-h2', 'Why Energy Matters'),
            p('sm3-s1-p3', '"A secure, affordable, and abundant supply of clean energy is critical for our collective future. We use it to heat and light our homes, to power our businesses and to transport people and goods. Without it, we simply could not function as an economy or modern society."'),
            p('sm3-s1-p4', 'Energy is fundamental to everything we do. It is our historic dependence on fossil fuels — and the lack of understanding of the alternatives — that has largely led to our current climate crisis. Renewable energy now plays a significant and growing role in the global energy mix. However, the wind doesn\'t blow and the sun doesn\'t shine 24 hours a day, 7 days a week. Storage is key to managing this variability.'),
            p('sm3-s1-p5', 'The role of nuclear is also important — not only as a source of continuous, flexible baseload power, but as a potential source of heat for future low-carbon energy production. Both renewable energy and nuclear must work in partnership to stimulate new opportunities in storage, hydrogen, and Net-Zero technologies.'),
          ],
        },
        globalEnergyConsumptionChart,
        {
          _type: 'energySystemDiagram' as const,
          _key: 'sm3-s1-diagram-problem',
          variant: 'problem' as const,
          title: 'The Problem: A Fossil-Fuel-Dependent Grid',
          caption: 'Today\'s energy system relies on fossil fuels supplemented by intermittent renewables — resulting in volatile supply, high emissions, and an unstable grid.',
        },
        {
          _type: 'energySystemDiagram' as const,
          _key: 'sm3-s1-diagram-solution',
          variant: 'solution' as const,
          title: 'The Solution: An Integrated Clean Energy System',
          caption: 'The energy transition replaces fossil generation with wind, solar, and battery storage — backed by low-carbon baseload — creating a smart, resilient, zero-emission grid.',
        },
      ],
    },

    // ── SECTION 2: Access to Electricity (PDF p. 8) ───────────────────────────
    {
      _id: 'sm3-sec-2-access',
      title: 'Access to Electricity for All',
      slug: { _type: 'slug', current: 'access-to-electricity' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s2-hero',
          image: localImage('Images/AdobeStock_172956774.webp', 'Bringing electricity access to all people'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s2-text',
          content: [
            h2('sm3-s2-h1', 'Access to Reliable and Affordable Electricity for Everyone'),
            p('sm3-s2-p1', 'Over the last century, more people have come to enjoy reliable and affordable electricity. That is — unless you are among the roughly 850 million people left behind, as reported by the International Energy Agency. And it is not only people who suffer — it is schools, hospitals, businesses, cities, and industries that cannot flourish without access to electricity.'),
            p('sm3-s2-p2', 'Daily life without electricity can be an immense struggle. Imagine dealing with extreme environments where heating or cooling are inaccessible. Imagine not being able to cook a warm meal, or operate modern hospital equipment that can save lives. Imagine not having access to the internet and the countless possibilities it offers. The list goes on and on.'),
            p('sm3-s2-p3', 'Most societies believe that access to electricity is a basic human need. It is the backbone of economic and societal development. The demand for electricity continues to rise and the world needs a sustainable, affordable, and reliable energy supply. This is why the world is driving the energy transition towards more sustainable, greener energy systems.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-s2-keyfact',
          variant: 'key-fact',
          title: '850 Million Without Access',
          body: 'Despite decades of progress, the International Energy Agency (IEA) estimates that approximately 850 million people around the world still lack access to reliable electricity. Ensuring universal access to affordable clean energy is a central pillar of the UN\'s Sustainable Development Goal 7 (SDG7) — "Affordable and Clean Energy."',
        },
        {
          _type: 'richText',
          _key: 'sm3-s2-status-text',
          content: [
            h3('sm3-s2-h2', 'The Current State of the Energy Transition'),
            p('sm3-s2-p4', 'The International Energy Agency (IEA) states that the share of renewable energy in global electricity generation has grown to 26 percent. But the fact is that the reality of today\'s energy system still depends on fossil fuels. Coal, gas, oil, and nuclear are still required to meet global power generation needs in many countries. Much-needed progress is being made, but the necessary transformation of existing infrastructure takes time.'),
            p('sm3-s2-p5', 'The pathway to addressing the energy transition will be different for every country and its individual energy system, depending on their circumstances, resources, and needs. Crucially, as of 2023, global energy investment in clean energy is currently nearly double that of fossil fuels — a remarkable milestone in the reorientation of global capital.'),
          ],
        },
        renewableShareChart,
        energyInvestmentChart,
        globalElecProductionChart,
        renewableShareByCountryChart,
        {
          _type: 'energySystemDiagram' as const,
          _key: 'sm3-s2-diagram-distribution',
          variant: 'distribution' as const,
          title: 'Electricity for Everyone: How the Grid Reaches Society',
          caption: 'A modernised grid powered by clean energy delivers electricity to homes, schools, offices, and industry — the foundation of economic and social development.',
        },
      ],
    },

    // ── SECTION 3: Renewable Energy Technologies (PDF pp. 9–10) ──────────────
    {
      _id: 'sm3-sec-3-renewables',
      title: 'Renewable Energy Technologies',
      slug: { _type: 'slug', current: 'renewable-energy-technologies' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s3-hero',
          image: localImage('Images/AdobeStock_1040568127.webp', 'Renewable energy technologies — solar, wind, and hydro'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s3-text',
          content: [
            h2('sm3-s3-h1', 'Renewable Energy Technologies'),
            p('sm3-s3-p1', 'Renewable energy technologies are central to the global energy transition. They offer sustainable alternatives to fossil fuels by harnessing natural resources that are continually replenished. Key technologies include solar, wind (onshore and offshore), and hydroelectric power, each with distinctive mechanisms, benefits, and challenges. These technologies, while clean, vary in their spatial, temporal, and ecological footprints. A balanced deployment strategy, combined with supportive policy and innovation in grid integration and storage, is essential to maximise their contribution to a Net-Zero energy system.'),
            h3('sm3-s3-h2', 'Solar Energy'),
            p('sm3-s3-p2', 'Solar energy technologies convert sunlight into electricity using photovoltaic (PV) cells or into thermal energy through Concentrated Solar Power (CSP) systems. PV panels convert sunlight directly into electricity through semiconductors, while CSP uses mirrors to focus sunlight, producing heat that drives turbines. Solar energy is one of the fastest-growing renewable technologies, with dramatically decreasing costs and increasing efficiency. It is widely used for residential, commercial, and utility-scale power generation. Solar farms can be deployed on rooftops, open land, or even floating on water bodies.'),
            h3('sm3-s3-h3', 'Onshore Wind Energy'),
            p('sm3-s3-p3', 'Onshore wind features turbines installed on land to generate electricity from the kinetic energy of wind. Wind turns the turbine blades, driving a generator that produces electrical power. Onshore wind farms are among the most cost-effective renewable energy sources, with a low carbon footprint. They can be deployed in rural areas, hills, and plains with consistent wind speeds. Modern turbines have grown significantly in size and efficiency, generating far more power per unit than earlier generations.'),
            h3('sm3-s3-h4', 'Offshore Wind Energy'),
            p('sm3-s3-p4', 'Offshore wind energy involves wind turbines installed in bodies of water — typically oceans or large lakes — to harness stronger and more consistent wind speeds. Offshore wind farms generally have higher capacity factors than onshore ones due to steadier wind conditions. Floating wind technology is expanding opportunities to deploy turbines in deeper waters where fixed foundations are not viable. Offshore wind projects require complex engineering and infrastructure, including subsea cables and grid connections, and face higher installation and maintenance costs compared to onshore. However, economies of scale and technological advancements are steadily driving down costs.'),
            h3('sm3-s3-h5', 'Hydroelectric Energy'),
            p('sm3-s3-p5', 'Hydroelectric power harnesses the energy of moving water to generate electricity, primarily using dams and turbines. Large-scale hydropower plants store water in reservoirs and release it through turbines to generate power on demand. Run-of-river systems generate electricity from natural water flow without large reservoirs, reducing environmental disruption. Hydropower is one of the most reliable and established renewable energy sources, providing steady baseload power. Pumped-storage hydropower acts as a natural battery, storing excess electricity by pumping water to a higher elevation and releasing it when needed. However, environmental and social impacts — such as habitat disruption and displacement of communities — remain ongoing concerns.'),
            h3('sm3-s3-h6', 'Nuclear Energy'),
            p('sm3-s3-p6', 'Nuclear energy generates electricity through controlled nuclear fission reactions, where uranium or plutonium atoms split to release heat. This heat produces steam that drives turbines, generating power with zero direct carbon emissions. Nuclear power provides a stable, high-capacity energy source with a minimal land footprint. Modern reactors, including Small Modular Reactors (SMRs), are being developed for safer and more flexible deployment. High upfront costs and long construction times have historically slowed nuclear expansion — but growing interest in reliable low-carbon baseload power is prompting a global reassessment.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-s3-callout',
          variant: 'info',
          title: 'More Detail Ahead',
          body: 'These renewable energy technologies — and others including geothermal, tidal, bioenergy, and green hydrogen — are explored in much greater detail in subsequent sub-modules throughout this course.',
        },
      ],
    },

    // ── SECTION 4: Energy Efficiency (PDF pp. 11–12) ──────────────────────────
    {
      _id: 'sm3-sec-4-efficiency',
      title: 'Energy Efficiency',
      slug: { _type: 'slug', current: 'energy-efficiency' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s4-hero',
          image: localImage('Images/AdobeStock_1070495313.webp', 'Energy efficiency — reducing demand across sectors'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s4-text',
          content: [
            h2('sm3-s4-h1', 'Energy Efficiency'),
            p('sm3-s4-p1', 'Energy efficiency in its simplest form is the use of less energy to perform the same task or produce the same outcome. Improving efficiency is a foundational pillar of the energy transition, offering immediate reductions in emissions and costs without necessarily requiring new energy generation infrastructure.'),
            h3('sm3-s4-h2', 'In the Built Environment'),
            p('sm3-s4-p2', 'Strategies include better insulation, energy-efficient lighting, heating and cooling systems, and smart controls. Retrofitting buildings with modern insulation and glazing can significantly reduce heating demand, particularly in colder climates. LED lighting and smart thermostats also reduce electricity consumption. Energy audits can help identify inefficiencies, and digital technologies such as AI and IoT are increasingly deployed for real-time monitoring and optimisation.'),
            h3('sm3-s4-h3', 'In Industry'),
            p('sm3-s4-p3', 'Industrial energy efficiency focuses on upgrading machinery, improving process controls, and recovering waste heat. Energy audits help identify where energy is being wasted and digital technologies enable real-time monitoring.'),
            h3('sm3-s4-h4', 'In Transport'),
            p('sm3-s4-p4', 'Vehicle efficiency improvements include hybrid and electric drivetrains, lightweight materials, and aerodynamic design. Modal shifts towards public transport, cycling, and walking also contribute to reduced energy demand.'),
            h3('sm3-s4-h5', 'Key Energy Efficiency Technologies and Methods'),
            bullet('sm3-s4-b1', 'Smart Sensors — Real-time monitoring detects inefficiencies and optimises energy usage.'),
            bullet('sm3-s4-b2', 'Variable Frequency Drives (VFDs) — Adjust motor speed based on load requirements, minimising wasted energy.'),
            bullet('sm3-s4-b3', 'Waste Heat Recovery — Capturing and re-using heat from industrial processes improves overall energy efficiency.'),
            bullet('sm3-s4-b4', 'Cogeneration (CHP Systems) — Combined Heat and Power (CHP) generates electricity while utilising waste heat simultaneously.'),
            bullet('sm3-s4-b5', 'Industrial Heat Pumps — Using heat pump technology improves process heating efficiency.'),
            bullet('sm3-s4-b6', 'Energy-Efficient Lighting — LED lighting and smart controls reduce electricity consumption.'),
            bullet('sm3-s4-b7', 'Energy-Efficient Equipment — Upgrading to high-efficiency motors, pumps, and compressors reduces energy demand.'),
            bullet('sm3-s4-b8', 'Insulation and Thermal Management — Proper insulation prevents energy loss in industrial facilities and buildings.'),
            bullet('sm3-s4-b9', 'Digital Twins — Simulating industrial processes helps identify and correct inefficiencies before they occur in the real system.'),
            bullet('sm3-s4-b10', 'Electrification of Processes — Replacing fossil-fuel-powered machinery with electric alternatives will be the greatest source of carbon savings as grids are decarbonised.'),
            bullet('sm3-s4-b11', 'Advanced Manufacturing Techniques — 3D printing and precision machining minimise material waste and energy use.'),
            bullet('sm3-s4-b12', 'Hybrid Industrial Vehicles — Electrification of transport fleets lowers fuel consumption.'),
            p('sm3-s4-p5', 'Behavioural change is equally important. Raising awareness and encouraging responsible consumption patterns can complement technical interventions. Government incentives, regulations, and standards play a crucial role in mainstreaming energy efficiency across all sectors.'),
          ],
        },
      ],
    },

    // ── SECTION 5: Decarbonisation Strategies (PDF p. 13) ────────────────────
    {
      _id: 'sm3-sec-5-decarb',
      title: 'Decarbonisation Strategies',
      slug: { _type: 'slug', current: 'decarbonisation-strategies' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s5-hero',
          image: localImage('Images/AdobeStock_494113550.webp', 'Decarbonisation strategies across sectors'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s5-text',
          content: [
            h2('sm3-s5-h1', 'Decarbonisation Strategies'),
            p('sm3-s5-p1', 'Decarbonisation involves reducing or eliminating carbon dioxide emissions from energy systems and industrial processes. It is essential for achieving climate targets such as those outlined in the Paris Agreement. Strategies span multiple sectors and are underpinned by a combination of technological, economic, and behavioural shifts.'),
            h3('sm3-s5-h2', 'Electrification of End-Uses'),
            p('sm3-s5-p2', 'Electrification of end-uses — particularly in heating and transport — is a major decarbonisation pathway, especially when combined with renewable electricity. The deployment of electric vehicles and heat pumps exemplifies this shift. In industry, fuel switching from coal and natural gas to hydrogen or electricity can substantially reduce emissions.'),
            h3('sm3-s5-h3', 'Carbon Capture, Utilisation and Storage (CCUS)'),
            p('sm3-s5-p3', 'CCUS technologies aim to trap carbon dioxide from industrial processes or directly from the atmosphere. While still at an early stage of commercial deployment, CCUS is considered crucial for hard-to-abate sectors such as cement and steel — industries where direct electrification is not yet technically or economically feasible.'),
            h3('sm3-s5-h4', 'Demand-Side Measures'),
            p('sm3-s5-p4', 'Demand-side measures — including energy efficiency improvements and circular economy principles — reduce the total energy and resource input required across the economy. Less energy demand means less generation is needed, making it easier and cheaper to meet remaining needs from clean sources.'),
            h3('sm3-s5-h5', 'Land-Use Strategies'),
            p('sm3-s5-p5', 'Land-use strategies such as afforestation, reforestation, and soil carbon enhancement contribute to carbon removal from the atmosphere — complementing emissions reductions from the energy sector.'),
            h3('sm3-s5-h6', 'EVs and Vehicle-to-Grid Technology'),
            p('sm3-s5-p6', 'Electric vehicles (EVs) play a dual role in the energy transition: reducing reliance on fossil fuels and offering flexible energy storage to support grid stability. As renewable energy sources increase, managing fluctuations in supply and demand becomes more complex. EVs, when integrated intelligently, can help balance the system.'),
            p('sm3-s5-p7', 'Vehicle-to-Grid (V2G) technology enables bi-directional energy flow between EVs and the electricity grid. This allows EVs to charge during off-peak periods and discharge electricity back to homes or the grid during times of high demand. In doing so, EVs function as mobile energy storage units, helping to smooth variability associated with renewable generation — such as periods of low wind or solar output.'),
            p('sm3-s5-p8', 'For consumers, V2G presents opportunities to reduce electricity costs by storing cheaper, off-peak energy and using it during peak periods. Smart charging systems automate this process while allowing users to maintain control. Automakers are increasingly equipping EVs with bi-directional charging capabilities — notable examples include Volkswagen\'s ID range and the Renault 5. In 2024, Nissan announced plans to make V2G-compatible chargers available at cost parity with existing models.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-s5-callout',
          variant: 'key-fact',
          title: 'Just Transition',
          body: 'A "just transition" — ensuring that workers and communities dependent on high-emission industries are supported — is a critical consideration in designing and implementing decarbonisation pathways. Economic transformation must be inclusive to be sustainable.',
        },
      ],
    },

    // ── SECTION 6: Case Study — Norway EV Revolution (PDF pp. 14–15) ──────────
    {
      _id: 'sm3-sec-6-norway',
      title: 'Case Study: Norway — The World\'s EV Pioneer',
      slug: { _type: 'slug', current: 'norway-ev-case-study' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s6-hero',
          image: localImage('Images/AdobeStock_1269994262_Editorial_Use_Only.webp', 'Norway — leading the global EV transition'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s6-text',
          content: [
            h2('sm3-s6-h1', 'Case Study: Norway — The World\'s Electric Vehicle Pioneer'),
            p('sm3-s6-p1', 'Norway is the world leader when it comes to the take-up of electric cars. In 2024, EVs accounted for 88.9% of new vehicles sold in the country — up from 82.4% in 2023. Norway is now on the cusp of becoming the first country to phase out the sale of new fossil fuel cars entirely, with a target that has been set at some point in 2025.'),
            p('sm3-s6-p2', 'For more than 75 years, Oslo-based car dealership Harald A Møller has been importing Volkswagens. In early 2024, it bid farewell to fossil fuel cars entirely. "We think it\'s wrong to advise a customer coming in here today to buy an internal combustion engine car, because the future is electric," said chief executive Ulf Tore Hekneby.'),
            p('sm3-s6-p3', 'On the streets of Norway\'s capital, Oslo, battery-powered cars aren\'t a novelty — they\'re the norm. The Nordic nation of 5.5 million people has adopted EVs faster than any other country. In 2024, the number of electric cars on Norwegian roads outnumbered those powered by petrol for the first time.'),
            h3('sm3-s6-h2', 'Three Decades in the Making'),
            p('sm3-s6-p4', 'Norway\'s EV revolution has been thirty years in the making, starting in the early 1990s. Rather than banning combustion engine vehicles, the government steered consumer choices. Petrol and diesel engine cars have been gradually taxed more heavily over time, making them more expensive to purchase. Electric cars have been exempted from these taxes, as well as VAT and import duties. A string of additional perks — free parking, discounted road tolls, and access to bus lanes — followed.'),
            p('sm3-s6-p5', '"It\'s our goal to see that it\'s always a good and viable choice to choose zero emission," says Norway\'s Deputy Transport Minister, Cecilie Knibe Kroglund. "Key to Norway\'s success has been long-term and predictable policies." The EU plans to ban sales of new fossil-fuel cars by 2035, and the UK\'s current government wants to prohibit their sale by 2030. Petrol and diesel car sales are still technically permitted in Norway — but few are choosing to buy them.'),
            h3('sm3-s6-h3', 'International Comparison (2024)'),
            p('sm3-s6-p6', 'By contrast, in the UK, electric cars made up only 20% of new car registrations in 2024 — a record high, up from 16.5% in 2023. In the US, the figure was just 8%, up from 7.6%. Norway\'s achievement demonstrates that with consistent, long-term policy support, a virtually complete transition to electric vehicles within a national car market is entirely achievable.'),
          ],
        },
        evAdoptionChart,
        {
          _type: 'calloutBlock',
          _key: 'sm3-s6-callout',
          variant: 'quote',
          title: 'Norway\'s Deputy Transport Minister',
          body: '"I think we have already made the transition for passenger cars." — Cecilie Knibe Kroglund, Norwegian Deputy Transport Minister, January 2025',
        },
      ],
    },

    // ── SECTION 7: Case Study — Aviation Decarbonisation (PDF p. 16) ──────────
    {
      _id: 'sm3-sec-7-aviation',
      title: 'Case Study: Aviation and Net Zero',
      slug: { _type: 'slug', current: 'aviation-net-zero-case-study' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s7-hero',
          image: localImage('Images/AdobeStock_379091544.webp', 'Aviation decarbonisation — SAF and electric aircraft'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s7-text',
          content: [
            h2('sm3-s7-h1', 'Case Study: Aviation and Net Zero'),
            p('sm3-s7-p1', 'Aviation can be decarbonised by a number of different and complementary methods — spanning aircraft technology, ground operations, and fuel sources. It is one of the most technically challenging sectors to decarbonise, given the energy density requirements of flight, but significant progress is being made.'),
            h3('sm3-s7-h2', 'Aircraft Technology and Design'),
            bullet('sm3-s7-b1', 'Hybrid-Electric Aircraft: Short-haul flights can be powered by hybrid propulsion systems combining conventional engines with electric motors, significantly reducing fuel consumption per flight.'),
            bullet('sm3-s7-b2', 'Fully Electric Aircraft: Increasingly viable for small regional flights — particularly those under 500 km. Several manufacturers are developing commercially viable fully electric regional aircraft.'),
            bullet('sm3-s7-b3', 'Hydrogen-Powered Aircraft: Hydrogen offers the potential for zero-emission flight. Development programmes by Airbus and others are targeting commercial hydrogen aircraft by the mid-2030s. Explored in further detail in the Hydrogen sub-module.'),
            bullet('sm3-s7-b4', 'Ground Operations: Aircraft ground operations can also be substantially decarbonised through renewable power for buildings and hangars, and electric tugs for taxiing aircraft — reducing the need for aircraft to use their engines on the ground.'),
            h3('sm3-s7-h3', 'Sustainable Aviation Fuels (SAF)'),
            p('sm3-s7-p2', 'Sustainable Aviation Fuels (SAF) are at the forefront of near-term aviation decarbonisation, as they are compatible with existing aircraft engines and infrastructure. Types of SAF include:'),
            bullet('sm3-s7-b5', 'Biofuels — SAF derived from waste oils, purpose-grown crops, or algae that reduce lifecycle emissions compared to conventional jet fuel.'),
            bullet('sm3-s7-b6', 'Synthetic Fuels (E-fuels) — Made using green hydrogen combined with captured CO₂, producing a carbon-neutral fuel cycle.'),
            bullet('sm3-s7-b7', 'Drop-in Compatibility — SAF can be blended with conventional jet fuel and used directly in current aircraft engines without modification.'),
            h3('sm3-s7-h4', 'Government SAF Mandates'),
            p('sm3-s7-p3', 'The UK Government has introduced a SAF Mandate that started in 2025 at 2% of total UK jet fuel, increasing linearly to 10% in 2030 and 22% in 2040. The EU Parliament has approved a sustainable aviation fuel mandate from 2% in 2025 up to 70% in 2050 — representing one of the most ambitious SAF policy frameworks globally.'),
          ],
        },
      ],
    },

    // ── SECTION 8: Case Study — Steel Decarbonisation (PDF pp. 17–19) ─────────
    {
      _id: 'sm3-sec-8-steel',
      title: 'Case Study: Decarbonising Steel Production',
      slug: { _type: 'slug', current: 'steel-decarbonisation-case-study' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s8-hero',
          image: localImage('Images/AdobeStock_1360564432.webp', 'Decarbonising the steel industry'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s8-text',
          content: [
            h2('sm3-s8-h1', 'Case Study: Decarbonising Steel Production'),
            p('sm3-s8-p1', 'Steel production is one of the most carbon-intensive industries in the world, responsible for around 7–9% of global CO₂ emissions. Decarbonising steelmaking aims to transform steel manufacturing into a more sustainable process while maintaining efficiency and economic viability.'),
            h3('sm3-s8-h2', 'Traditional Steelmaking Emissions'),
            p('sm3-s8-p2', 'Conventional steel production relies on blast furnaces and basic oxygen furnaces, which burn coke (a coal derivative) to reduce iron ore, releasing significant volumes of CO₂. On average, traditional steelmaking emits 1.8–2.2 tonnes of CO₂ per tonne of steel produced.'),
            h3('sm3-s8-h3', 'Low-Carbon Steelmaking Technologies'),
            bullet('sm3-s8-b1', 'Electric Arc Furnaces (EAF): Use scrap steel and electricity, cutting emissions by up to 75% compared to traditional steelmaking. Effectiveness is directly tied to the carbon intensity of the electricity grid.'),
            bullet('sm3-s8-b2', 'Hydrogen-Based Direct Reduction (H₂-DRI): Uses green hydrogen instead of coke to reduce iron ore, producing water (H₂O) instead of CO₂. A transformative technology when powered by renewable-generated hydrogen.'),
            bullet('sm3-s8-b3', 'Carbon Capture, Utilisation and Storage (CCUS): Can be used to capture and store CO₂ emissions from existing steel plants — a bridge technology while cleaner alternatives are scaled up.'),
            h3('sm3-s8-h4', 'Direct Electrolysis'),
            p('sm3-s8-p3', 'Direct electrolysis in steelmaking is a low-carbon process where iron ore is directly reduced into iron using electricity, without the need for carbon-based reducing agents like coke. Iron ore is dissolved in an electrolyte; an electric current passes through, reducing iron ore into pure iron at the cathode; and oxygen is released at the anode instead of CO₂. The solid iron is then collected and processed into steel.'),
            p('sm3-s8-p4', 'Advantages include zero carbon emissions (when powered by renewables), scalability with clean electricity, and higher purity iron. Key challenges include high energy demand, electrode stability, and the infrastructure investment required for industry-wide adoption.'),
            h3('sm3-s8-h5', 'Challenges and Global Initiatives'),
            bullet('sm3-s8-b4', 'High Costs: Green hydrogen and CCUS are expensive, requiring government incentives and further technological advancement.'),
            bullet('sm3-s8-b5', 'Infrastructure Needs: Expanding hydrogen supply chains and renewable energy capacity is essential for scaling H₂-DRI.'),
            bullet('sm3-s8-b6', 'Scrap Steel Availability: Expanded EAF use depends on a steady, high-quality supply of recycled scrap steel.'),
            bullet('sm3-s8-b7', 'EU Carbon Border Adjustment Mechanism (CBAM): Will penalise high-carbon steel imports, increasing the economic viability of green steel production.'),
            bullet('sm3-s8-b8', 'Pioneer Projects: Countries including Sweden (HYBRIT project) and Germany (H2 Green Steel) are leading green steel development. Industry-wide commitments to Net-Zero steel by 2050 are driving innovation and investment globally.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-s8-callout',
          variant: 'key-fact',
          title: 'Steel Emissions at a Glance',
          body: 'Steel production accounts for approximately 7–9% of global CO₂ emissions. Traditional blast furnaces emit 1.8–2.2 tonnes of CO₂ per tonne of steel. Electric Arc Furnaces using clean electricity can reduce this by up to 75%. Full decarbonisation via hydrogen-based direct reduction could eliminate CO₂ from the reduction process entirely.',
        },
      ],
    },

    // ── SECTION 9: Dispatchable vs Non-Dispatchable (PDF pp. 20–21) ───────────
    {
      _id: 'sm3-sec-9-dispatch',
      title: 'Dispatchable vs Non-Dispatchable Power',
      slug: { _type: 'slug', current: 'dispatchable-vs-non-dispatchable' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm3-s9-text',
          content: [
            h2('sm3-s9-h1', 'Dispatchable vs Non-Dispatchable Power'),
            p('sm3-s9-p1', 'A core challenge of the energy transition is balancing electricity supply and demand — particularly with the rise of variable renewable energy (VRE) sources such as wind and solar. These are classified as either dispatchable or non-dispatchable.'),
            h3('sm3-s9-h2', 'Dispatchable Power Sources'),
            p('sm3-s9-p2', 'Dispatchable power sources can be turned on or off, or adjusted, to match electricity demand in real time. They give grid operators direct control over output. Dispatchable sources include:'),
            bullet('sm3-s9-b1', 'Fossil fuel power plants (coal, gas, oil) — historically the dominant form of dispatchable generation.'),
            bullet('sm3-s9-b2', 'Nuclear power — provides continuous, stable baseload generation; not easily ramped up or down quickly.'),
            bullet('sm3-s9-b3', 'Hydroelectric dams (with reservoirs) — can respond rapidly to demand changes; also used for pumped-storage.'),
            bullet('sm3-s9-b4', 'Battery storage — increasingly important; can respond in milliseconds to sudden changes in grid frequency.'),
            bullet('sm3-s9-b5', 'Demand-side response mechanisms — reducing consumption in response to grid signals, effectively acting as virtual dispatchable capacity.'),
            h3('sm3-s9-h3', 'Non-Dispatchable Power Sources'),
            p('sm3-s9-p3', 'Non-dispatchable energy sources have output that depends on weather conditions and time of day. Their generation cannot be directly controlled by grid operators. They include:'),
            bullet('sm3-s9-b6', 'Solar PV — output depends on sunlight intensity; peaks midday and is zero at night.'),
            bullet('sm3-s9-b7', 'Wind (onshore and offshore) — output depends on wind speed; variable throughout the day and across seasons.'),
            bullet('sm3-s9-b8', 'Run-of-river hydro — output depends on river flow rates and seasonal water availability.'),
            p('sm3-s9-p4', 'The integration of non-dispatchable renewables requires careful planning. Solutions include geographic dispersion of assets, grid interconnections, improved forecasting, and hybrid systems that combine renewables with dispatchable sources. For example, solar generation supported by battery storage or gas peaking plants can ensure consistent supply even when solar output drops.'),
            p('sm3-s9-p5', 'A transition to a predominantly renewable grid will depend on enhancing the dispatchability of clean technologies through innovations in storage, demand management, and flexible generation. This is one of the central engineering and policy challenges of the energy transition.'),
          ],
        },
        {
          _type: 'dispatchableVsNonDispatchableDiagram',
          _key: 'sm3-s9-dispatch-diagram',
        },
      ],
    },

    // ── SECTION 10: Grid Modernisation (PDF pp. 22–23) ────────────────────────
    {
      _id: 'sm3-sec-10-grid',
      title: 'Grid Modernisation',
      slug: { _type: 'slug', current: 'grid-modernisation' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s10-hero',
          image: localImage('Images/AdobeStock_897283117.webp', 'Smart grid modernisation for renewable energy integration'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s10-text',
          content: [
            h2('sm3-s10-h1', 'Grid Modernisation'),
            p('sm3-s10-p1', 'Modernising electrical grids is essential for supporting the widespread integration of renewable energy sources. Traditional grid systems were originally designed to facilitate one-way power flow from large, centralised fossil fuel power stations to end-users. These legacy grids functioned under relatively stable and predictable generation conditions, with limited flexibility or real-time control. The increasing share of renewable energy — particularly from decentralised and variable sources such as solar and wind — has fundamentally altered the requirements of energy networks.'),
            h3('sm3-s10-h2', 'Smart Grids'),
            p('sm3-s10-p2', 'To accommodate these changes, energy infrastructure must evolve into more flexible, intelligent, and resilient systems — often referred to as smart grids. These utilise advanced digital technologies, including sensors, automated controls, and real-time communication tools, to enable a two-way flow of electricity and data. Smart grids improve the visibility and management of both supply and demand across the network, helping to balance loads, prevent outages, and optimise energy use.'),
            p('sm3-s10-p3', 'Key features of smart grids include dynamic pricing mechanisms, which incentivise consumers to use electricity during off-peak periods, and automated demand response systems, which adjust consumption in real-time based on grid conditions. Integrated energy storage — such as batteries and pumped hydro — can also help store surplus renewable generation and discharge it when demand is high, further enhancing grid flexibility.'),
            h3('sm3-s10-h3', 'Physical Infrastructure Investment'),
            p('sm3-s10-p4', 'In addition to digital upgrades, physical infrastructure investments are critical. This includes the development of High-Voltage Direct Current (HVDC) transmission lines, which can efficiently transport electricity over long distances with minimal losses, and interconnectors that link grids between regions and even countries. These connections improve energy security, support cross-border energy trade, and help stabilise national grids by sharing resources across a wider area.'),
            p('sm3-s10-p5', 'As more renewable projects are sited in remote or offshore locations — such as floating wind farms or solar farms in sparsely populated regions — extending and reinforcing grid infrastructure becomes a central enabler of the energy transition. Modern grids are not merely technical upgrades: they are foundational to achieving a low-carbon, reliable, and inclusive energy future.'),
          ],
        },
      ],
    },

    // ── SECTION 11: Energy Storage (PDF p. 24) ────────────────────────────────
    {
      _id: 'sm3-sec-11-storage',
      title: 'Energy Storage Solutions',
      slug: { _type: 'slug', current: 'energy-storage-solutions' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s11-hero',
          image: localImage('Images/AdobeStock_1364961006.webp', 'Energy storage — batteries and pumped hydro'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s11-text',
          content: [
            h2('sm3-s11-h1', 'Energy Storage Solutions'),
            p('sm3-s11-p1', 'Technologies such as batteries and pumped hydro store energy for use when energy generation is low. These are essential for the success of non-dispatchable renewable energy sources, which often have periods where they produce greater volumes of power than is needed, and times when they produce very little. This is why reliable baseload generation — such as nuclear — remains so important in the transition period.'),
            p('sm3-s11-p2', 'Energy storage, to smooth out the peaks and troughs of power generation in a power network, can be achieved in many ways:'),
            bullet('sm3-s11-b1', 'Batteries — both utility-scale battery storage facilities and distributed EV batteries.'),
            bullet('sm3-s11-b2', 'Pumped Hydro — moving water between reservoirs at different elevations to store and generate electricity.'),
            bullet('sm3-s11-b3', 'Conversion to Hydrogen — using surplus renewable electricity to produce green hydrogen for storage and later use.'),
            bullet('sm3-s11-b4', 'Gravity Storage — physical energy storage using heavy weights (e.g. over old mine shafts) that can be dropped to produce energy when needed and winched up when there is surplus power.'),
            bullet('sm3-s11-b5', 'Flywheels — large spinning masses that can smooth out very short-term variations in grid frequency and power quality.'),
            h3('sm3-s11-h2', 'Batteries'),
            p('sm3-s11-p3', 'Batteries provide rapid response to fluctuations in demand, helping stabilise grid frequency and voltage. They reduce strain during peak demand periods, lowering the need for fossil fuel-based peaking generation. Batteries can provide support to congested areas of the power network, delaying or reducing the need for expensive grid infrastructure upgrades. They can also power Microgrids — when paired with renewables, batteries can power remote or isolated microgrids independently from central networks.'),
            h3('sm3-s11-h3', 'Pumped Hydro Storage'),
            p('sm3-s11-p4', 'Pumped hydro is the world\'s most widely used form of large-scale energy storage. It works by moving water between two reservoirs at different elevations. During periods of low network power demand, excess electricity is used to pump water uphill to the upper reservoir. During peak demand, water flows back down through turbines, generating electricity. It provides fast, flexible power to balance supply and demand on the grid.'),
            p('sm3-s11-p5', 'Pumped hydro is also a long-duration storage solution — water can store energy for days or even weeks, making it ideal for managing seasonal shifts in supply and demand. Once built, it produces zero direct emissions, and modern systems can achieve round-trip efficiencies of 70–85%. Pumped hydro plants can operate for 50–100 years with proper maintenance. Its use is, however, constrained by the need for suitable terrain and large water reservoirs.'),
          ],
        },
        storageTechnologyChart,
      ],
    },

    // ── SECTION 12: Sustainable Bioenergy (PDF p. 25) ─────────────────────────
    {
      _id: 'sm3-sec-12-bioenergy',
      title: 'Sustainable Bioenergy',
      slug: { _type: 'slug', current: 'sustainable-bioenergy' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s12-hero',
          image: localImage('Images/AdobeStock_514357757.webp', 'Sustainable bioenergy — biomass and biofuels'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s12-text',
          content: [
            h2('sm3-s12-h1', 'Sustainable Bioenergy'),
            p('sm3-s12-p1', 'Sustainable bioenergy refers to the generation of energy from biological materials, including organic waste, wood, agricultural residues, and purpose-grown energy crops. It plays a complementary role within the broader renewable energy mix, particularly in sectors that are harder to electrify, such as heavy industry, aviation, and heating.'),
            h3('sm3-s12-h2', 'Key Advantage: Dispatchable Renewable Power'),
            p('sm3-s12-p2', 'A key advantage of bioenergy lies in its potential for dispatchable power generation. Unlike wind and solar, bioenergy can be stored and deployed on demand — which contributes to energy system flexibility and security. Technologies range from direct combustion of biomass for heat and power, to advanced biofuels derived from waste oils and lignocellulosic materials for use in transport.'),
            h3('sm3-s12-h3', 'Sustainability Considerations'),
            p('sm3-s12-p3', 'The sustainability of bioenergy is highly dependent on feedstock type, sourcing practices, and lifecycle emissions. Unsustainable land-use change, deforestation, and competition with food production can undermine its environmental benefits and even increase net emissions. Effective governance is therefore crucial.'),
            p('sm3-s12-p4', 'Certification schemes, rigorous emissions accounting, and land-use policies are needed to ensure that bioenergy contributes meaningfully to emissions reductions without causing adverse ecological or social outcomes.'),
            h3('sm3-s12-h4', 'Best Uses of Bioenergy'),
            p('sm3-s12-p5', 'In a decarbonised energy system, sustainable bioenergy is most effective when deployed in sectors where alternatives are limited — such as aviation, shipping, and high-temperature industrial processes. When combined with carbon capture technologies (BECCS — Bioenergy with Carbon Capture and Storage), bioenergy can even deliver net-negative emissions — actively removing CO₂ from the atmosphere while generating energy.'),
          ],
        },
      ],
    },

    // ── SECTION 13: Economic Impacts (PDF pp. 26–29) ──────────────────────────
    {
      _id: 'sm3-sec-13-economics',
      title: 'Economic Impacts of the Energy Transition',
      slug: { _type: 'slug', current: 'economic-impacts-energy-transition' },
      estimatedMinutes: 5,
      content: [
        reEmploymentByTechChart,
        {
          _type: 'richText',
          _key: 'sm3-s13-text',
          content: [
            h2('sm3-s13-h1', 'Economic Impacts of the Energy Transition'),
            p('sm3-s13-p1', 'The global transition to renewable energy is reshaping economies worldwide. At its heart is the movement away from fossil fuels to sustainable energy sources — bringing profound changes to multiple sectors and labour markets.'),
            h3('sm3-s13-h2', 'Decline of Fossil Fuel Industries'),
            p('sm3-s13-p2', 'One of the most direct economic impacts is the decline of fossil fuel industries. Coal, oil, and natural gas sectors are losing market share and investment. As a result, jobs in traditional energy industries are at risk. Companies are not employing new people and many of their existing workforces are looking to regions where fossil fuels will continue for longer periods. Regions dependent on fossil fuel extraction face economic uncertainty — as employment falls, towns begin to decline, with knock-on effects to hospitality, leisure, real estate, and the academic professions. Fossil fuel employers begin to struggle to recruit the workforce required, due to a lack of skilled workers and a growing reluctance among young people to join a sector perceived as \'dying.\''),
            h3('sm3-s13-h3', 'Growth of Renewable Energy Jobs'),
            p('sm3-s13-p3', 'However, renewable energy development is creating new opportunities. Wind farms, solar plants, and battery storage projects are expanding rapidly — demanding a wide range of skilled workers. Jobs in construction, installation, and maintenance are growing at pace. The International Renewable Energy Agency (IRENA) estimates millions of new jobs will be created in the coming decades. In 2022/23, over 13 million people were employed in the renewable energy sector globally. In 2023/24, this figure grew to 16.2 million — showing rapid worldwide acceleration.'),
            h3('sm3-s13-h4', 'Impacts on Energy-Intensive Industries'),
            p('sm3-s13-p4', 'The clean energy transition is also reshaping energy-intensive industries. Sectors like steel, cement, and chemicals are decarbonising — requiring new technologies and retraining workers. This is increasing demand for green hydrogen, electrified processes, and the workforce to provide them. In time, carbon capture is likely to be another substantial employer.'),
            h3('sm3-s13-h5', 'Supply Chains and Critical Materials'),
            p('sm3-s13-p5', 'Supply chains are adapting to support clean technologies. Lithium, cobalt, and rare earth mining are growing significantly due to battery demand. This creates economic opportunity in resource-rich nations — but also raises concerns about labour conditions and sustainability that must be actively managed.'),
            h3('sm3-s13-h6', 'The Service Sector and Finance'),
            p('sm3-s13-p6', 'The service sector is also evolving. Energy efficiency consulting, ESG compliance, and sustainability planning are growing fields. Financial institutions are redirecting capital to green projects, reshaping investment portfolios and banking services. Energy transition can also reduce energy import dependency, improving national energy security and altering a nation\'s balance of payments.'),
            h3('sm3-s13-h7', 'The Scale of the Green Economy'),
            p('sm3-s13-p7', 'The transition also stimulates innovation and entrepreneurship. Start-ups in clean tech, energy storage, and digital grids are booming. As the global green economy is projected to exceed $10 trillion by 2030, it is a question of "when" not "if" there will be a transformative effect on local economies and job markets. Countries that lead the transition can gain competitive advantages through innovation, exports, and productivity gains.'),
          ],
        },
        renewableJobsChart,
        reEmploymentSnapshot2023Chart,
        energyInvestmentProjectionChart,
      ],
    },

    // ── SECTION 14: Social and Environmental Justice (PDF pp. 30–31) ──────────
    {
      _id: 'sm3-sec-14-justice',
      title: 'Social and Environmental Justice',
      slug: { _type: 'slug', current: 'social-environmental-justice' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm3-s14-hero',
          image: localImage('Images/AdobeStock_418335450.webp', 'Social and environmental justice in the energy transition'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm3-s14-text',
          content: [
            h2('sm3-s14-h1', 'Social and Environmental Justice in the Energy Transition'),
            p('sm3-s14-p1', 'In order for there to be a truly just transition to a low-carbon economy, a number of factors need to be addressed and actively implemented. The transition must be designed in a way that ensures benefits are shared broadly and that no community is left behind.'),
            h3('sm3-s14-h2', 'Macroeconomic and Structural Considerations'),
            p('sm3-s14-p2', 'Macroeconomic trends, driven by governments, need to ensure that new investment — likely from both governmental and private sources — stimulates growth that benefits the societies that are funding it. The clean energy sector is currently growing faster than traditional industries, so it is important that these sectors coexist, allowing individuals the opportunity to move between sectors and share in the benefits available.'),
            h3('sm3-s14-h3', 'Economic Diversification and Energy Cost Volatility'),
            p('sm3-s14-p3', 'Economic diversification helps geographical areas reduce their dependency on volatile fossil fuel markets and creates the opportunity to move into clean energy industries. Industry and individuals need to benefit from a decrease in energy cost volatility — renewable energy\'s low operating costs can translate into lower long-term energy prices for all of society.'),
            h3('sm3-s14-h4', 'Jobs: Creation, Losses, and Reskilling'),
            p('sm3-s14-p4', 'Any jobs created by renewable energy generation should benefit local populations where possible — in operations, construction, and manufacturing. Declines in coal, gas, and oil employment should not lead to regional unemployment. Where possible, workers from fossil fuel industries need reskilling pathways to transition into clean tech roles — in green hydrogen, carbon capture, sustainable transport, and renewable energy operations.'),
            h3('sm3-s14-h5', 'Decentralisation of Energy Generation'),
            p('sm3-s14-p5', 'Decentralisation of energy generation can provide significant community benefits. Small local businesses benefit from decentralised systems as there is no single large centre of production that concentrates economic benefit. Regions that currently have insufficient energy infrastructure can thrive from local generation — and the additional investment and employment that comes with energy generation can support whole communities.'),
            h3('sm3-s14-h6', 'Carbon Pricing and Community Benefits'),
            p('sm3-s14-p6', 'Income from carbon pricing can be reinvested in public services and job creation. Clean energy draws significant corporate investment into areas, benefiting manufacturing and other sectors. Less air pollution means fewer healthcare costs, and lower GHG emissions reduce future economic damage from climate change.'),
            p('sm3-s14-p7', 'With good management, renewable energy can benefit communities that are not currently centred around energy production, while also ensuring that traditional fossil fuel-focused areas do not experience the negative effects of transition without support. Balancing growth with equity is key to a successful and inclusive energy future.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-s14-callout',
          variant: 'key-fact',
          title: 'The $10 Trillion Green Economy',
          body: 'The global green economy is projected to exceed $10 trillion by 2030. Countries that lead the energy transition can gain competitive advantages through innovation, exports, and rising productivity. The question is not whether communities will be affected by the transition — but whether they will be positioned to benefit from it.',
        },
      ],
    },
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm3-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'energy-transition-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm3-conc-text',
          content: [
            h2('sm3-conc-h1', 'Sub-Module Summary'),
            p('sm3-conc-p1', 'This sub-module has provided a comprehensive overview of the energy transition — the fundamental shift away from fossil fuels towards low-carbon energy systems. The scale of the challenge is vast: over 850 million people still lack access to reliable electricity, while global energy demand continues to grow. Renewables now account for 26% of global electricity generation (IEA, 2024), and falling costs are accelerating deployment across wind, solar, and storage technologies.'),
            p('sm3-conc-p2', 'Hard-to-abate sectors remain the central decarbonisation challenge. The case studies on aviation — where Sustainable Aviation Fuel mandates are beginning to bite — and steel production — where Electric Arc Furnaces and hydrogen-based direct reduction are reshaping manufacturing — illustrate how decarbonisation requires sector-specific innovation rather than a one-size-fits-all solution. Energy efficiency, grid modernisation, and flexible storage are the infrastructure layer that makes high renewable penetration possible.'),
            p('sm3-conc-p3', 'Crucially, the energy transition is not only a technical challenge but a social and economic one. A just transition — one that creates new employment, supports affected communities, and shares the benefits of clean energy broadly — is both a moral imperative and a political prerequisite for the pace of change needed. Norway\'s EV adoption story, the growth of the global green economy towards $10 trillion by 2030, and the rise of renewable energy employment (16.2 million jobs globally) all demonstrate that the transition is already generating tangible economic opportunity alongside environmental benefit.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm3-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 3',
          body: 'You now understand the breadth and depth of the energy transition — from energy access and renewable deployment to grid modernisation, hard-to-abate sectors, and the just transition imperative. The subsequent sub-modules explore individual renewable technologies in depth.',
        },
      ],
    },
    {
      _id: 'sm3-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'energy-transition-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm3-col-quiz',
          subModuleSlug: 'energy-transition',
          moduleId: 'module-1',
        },
      ],
    },
  ],
}
