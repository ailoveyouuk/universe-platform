// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 4: Fixed Offshore Wind
// Source: PDF pages 4–31 (verbatim text — do not edit without updating source)
//
// Phase 1 images are served from /public/images/sm4/
// Copy source files from: Platform_Dev/Module Assets/Sub-Module 4/Images/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  fowCapacityGrowthChart,
  fowCountryCapacityChart,
  fowLcoeChart,
  fowForecastChart,
  fowInvestmentChart,
  fowRegionalOutlookChart,
} from './sm4-charts'

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
    asset: { _ref: `/images/sm4/${filename}`, _type: 'reference' },
    alt,
    localSrc: `/images/sm4/${filename}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 4 Data
// ─────────────────────────────────────────────────────────────────────────────

export const subModule4: SubModule = {
  _id: 'sm-4',
  title: 'SM 4 — Fixed Offshore Wind',
  slug: { _type: 'slug', current: 'fixed-offshore-wind' },
  orderIndex: 4,
  estimatedHours: 2,
  learningObjectives: [
    'Understand what fixed offshore wind is and how an offshore wind array works',
    'Trace the modern history of offshore wind from 1991 to the present day',
    'Identify the key components of an offshore wind turbine and their functions',
    'Differentiate between the main foundation types used in fixed offshore wind',
    'Understand how offshore wind energy is transmitted to shore and integrated with the grid',
    'Assess the financial outlook, economic challenges, and environmental considerations of fixed offshore wind',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: What is Fixed Offshore Wind? (PDF pp. 4–5) ─────────────────
    {
      _id: 'sm4-sec-1-intro',
      title: 'What Is Fixed Offshore Wind?',
      slug: { _type: 'slug', current: 'what-is-fixed-offshore-wind' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm4-s1-hero',
          image: localImage('Images/AdobeStock_1087207688.webp', 'Fixed offshore wind farm at sea'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm4-s1-text',
          content: [
            h2('sm4-s1-h1', 'What Is Fixed Offshore Wind?'),
            p('sm4-s1-p1', 'The first renewable power source we will explore in depth is fixed-bottom offshore wind — commonly referred to as Fixed Offshore Wind, or FOW. Offshore wind turbines are installed in bodies of water, typically oceans or large lakes, where they capture stronger and more consistent wind than is generally available on land.'),
            p('sm4-s1-p2', 'A typical offshore wind array consists of the following key elements:'),
            bullet('sm4-s1-b1', 'An Array of Wind Turbines — individual turbines arranged across a designated sea area to maximise energy capture.'),
            bullet('sm4-s1-b2', 'Offshore Substation (OSS) — one or more offshore substations that step up voltage for efficient transmission to shore.'),
            bullet('sm4-s1-b3', 'Array Cables — the subsea cables that connect individual turbines to the offshore substation, collecting generated electricity.'),
            bullet('sm4-s1-b4', 'Export Cable(s) — one or two high-voltage subsea cables running from the offshore substation to the shore.'),
            bullet('sm4-s1-b5', 'Onshore Substation — steps down voltage on arrival at shore, making the electricity suitable for the national transmission system.'),
            bullet('sm4-s1-b6', 'Connection to the National Transmission System — the point at which offshore-generated electricity joins the wider national grid.'),
            bullet('sm4-s1-b7', 'Foundation — the structure that anchors the turbine to the seabed. Multiple foundation types exist for fixed offshore wind, explored in detail later in this sub-module.'),
          ],
        },
        {
          _type: 'offshoreWindArrayDiagram' as const,
          _key: 'sm4-s1-diag',
          title: 'Fixed Offshore Wind Array — System Overview',
          caption: 'Diagram of a fixed offshore wind array showing turbines, array cables, offshore substation, export cable, and onshore grid connection.',
        },
        {
          _type: 'richText',
          _key: 'sm4-s1-outlook-text',
          content: [
            h2('sm4-s1-h2', 'Current Outlook'),
            bullet('sm4-s1-b8', '£61.2 billion was spent globally in the offshore wind market in 2023 (fixed and floating combined).'),
            bullet('sm4-s1-b9', 'Global capacity reached 75 GW in 2023 (GWEC) and is expected to reach 86 GW by the end of 2024.'),
            bullet('sm4-s1-b10', 'The average production cost (LCOE) for fixed offshore wind reached $95 per MWh in 2023 — a 7% decrease on 2022, reflecting continued technology improvements.'),
            bullet('sm4-s1-b11', '320 GW of installed capacity is forecast by 2030 (IRENA Forecast 2023), with global forecasts suggesting 1,000 GW by 2050.'),
            bullet('sm4-s1-b12', 'Mainland China is the global leader in offshore wind capacity and will continue to dominate through to 2050 and beyond.'),
          ],
        },
        fowCapacityGrowthChart,
        fowInvestmentChart,
      ],
    },

    // ── SECTION 2: History (PDF pp. 6–8) ──────────────────────────────────────
    {
      _id: 'sm4-sec-2-history',
      title: 'Modern History of Fixed Offshore Wind',
      slug: { _type: 'slug', current: 'history-fixed-offshore-wind' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm4-s2-hero',
          image: localImage('Images/AdobeStock_536743901.webp', 'Offshore wind farm — history and growth'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm4-s2-text',
          content: [
            h2('sm4-s2-h1', 'Modern History of Fixed Offshore Wind'),
            p('sm4-s2-p1', 'Over the last three decades, fixed offshore wind has advanced its technology rapidly to become one of the most viable and competitive energy sources across the globe. Fixed offshore wind technology began in 1991 with the installation of the first offshore wind farm in Denmark. Over the past thirty years, it has grown into a key driver of the global renewable energy transition, with major contributions from Europe and China.'),
            h3('sm4-s2-h2', '1991–2009: The Pioneering Era'),
            bullet('sm4-s2-b1', '1991 — Vindeby Offshore Wind Farm (Denmark): The world\'s first offshore wind farm, marking the beginning of fixed-bottom offshore wind technology. 11 turbines, 4.95 MW total capacity.'),
            bullet('sm4-s2-b2', '2002 — Horns Rev 1 (Denmark): The first large-scale commercial offshore wind farm, with 160 MW capacity — proving the viability of offshore wind at commercial scale.'),
            bullet('sm4-s2-b3', '2007 — London Array Development Begins (UK): Signalled the UK\'s ambition to lead in offshore wind, eventually becoming the world\'s largest at the time of its commissioning.'),
            h3('sm4-s2-h3', '2010–2015: Rapid European Growth'),
            bullet('sm4-s2-b4', '2010 — Shanghai Donghai Bridge Wind Farm (China): China\'s first large-scale offshore wind farm with 102 MW capacity, marking China\'s entry into the offshore wind market.'),
            bullet('sm4-s2-b5', '2010 — Global offshore wind capacity reaches 3 GW, with European countries leading and China emerging.'),
            bullet('sm4-s2-b6', '2012 — London Array Phase 1 Commissioned (UK): Became the world\'s largest offshore wind farm at the time, with 630 MW capacity.'),
            bullet('sm4-s2-b7', '2013 — First US Offshore Wind Lease Auction: Marked the start of fixed-bottom offshore wind development in North America.'),
            bullet('sm4-s2-b8', '2015 — Global offshore wind capacity passes 8 GW, driven by projects in Europe and China\'s growing presence.'),
            h3('sm4-s2-h4', '2016–2020: China Rises to Leadership'),
            bullet('sm4-s2-b9', '2016 — Block Island Wind Farm (USA): The first commercial offshore wind farm in the US (30 MW) became operational, signalling North America\'s entry into offshore wind.'),
            bullet('sm4-s2-b10', '2017 — Walney Extension (UK): With 659 MW capacity, became the world\'s largest offshore wind farm at that time.'),
            bullet('sm4-s2-b11', '2017 — Jiangsu Rudong Offshore Wind Farm (China): The completion of this 150 MW project solidified China\'s growing offshore wind capacity.'),
            bullet('sm4-s2-b12', '2019 — China Becomes Largest Annual Installer: China overtook Europe as the largest annual installer of offshore wind, contributing 40% of new global capacity.'),
            bullet('sm4-s2-b13', '2020 — China Becomes Largest Offshore Wind Market: China surpassed the UK with over 10 GW cumulative capacity. Global offshore wind reaches 35 GW.'),
            h3('sm4-s2-h5', '2021–2023: Records and Global Expansion'),
            bullet('sm4-s2-b14', '2021 — Hornsea 2 Becomes World\'s Largest Offshore Wind Farm (UK): The Hornsea 2 project, with 1.32 GW capacity, became the world\'s largest offshore wind farm.'),
            bullet('sm4-s2-b15', '2022 — China\'s Offshore Wind Capacity Surpasses 25 GW: Reinforcing its global leadership in offshore wind.'),
            bullet('sm4-s2-b16', '2023 — Global Offshore Wind Capacity Reaches 75 GW: With China contributing 36.7 GW and Europe continuing major deployments.'),
          ],
        },
      ],
    },

    // ── SECTION 3: Case Studies (PDF pp. 9–11) ────────────────────────────────
    {
      _id: 'sm4-sec-3-casestudies',
      title: 'Case Studies: Landmark Offshore Wind Projects',
      slug: { _type: 'slug', current: 'offshore-wind-case-studies' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm4-s3-text',
          content: [
            h2('sm4-s3-h1', 'Case Studies: Landmark Offshore Wind Projects'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm4-s3-hornsea',
          variant: 'key-fact',
          title: 'Hornsea 2 — World\'s Largest Offshore Wind Farm (UK)',
          body: 'Hornsea 2, located 89 km off the Yorkshire coast in the North Sea, is the world\'s largest operational offshore wind farm as of October 2024. Capacity: 1.32 GW (1,320 MW). 165 Siemens Gamesa SG 8.0-167 DD turbines, each rated at 8 MW with a 167-metre rotor diameter. Foundation type: Monopile. Operated by Ørsted. Became fully operational August 2022.',
        },
        {
          _type: 'calloutBlock',
          _key: 'sm4-s3-vineyard',
          variant: 'key-fact',
          title: 'Vineyard Wind 1 — USA\'s First Large-Scale Offshore Wind Farm',
          body: 'Vineyard Wind 1 is the largest operational fixed-bottom offshore wind farm in the United States as of 2024. Located 15 miles off Martha\'s Vineyard, Massachusetts. Capacity: 806 MW. 62 GE Haliade-X 13 MW turbines, each with a 220-metre rotor diameter and 107-metre blade lengths. Foundation type: Monopile. A joint venture between Avangrid and Copenhagen Infrastructure Partners.',
        },
        {
          _type: 'calloutBlock',
          _key: 'sm4-s3-jiangsu',
          variant: 'key-fact',
          title: 'Jiangsu Rudong — China\'s Offshore Wind Milestone',
          body: 'The Jiangsu Rudong Offshore Wind Farm, located off the coast of Jiangsu Province in the East China Sea, represents one of the largest and most significant offshore wind installations in China. Combined project capacity exceeds 1.4 GW across multiple development phases. Uses turbines from Siemens Gamesa and Goldwind, with capacities ranging from 4 MW to 6 MW per turbine. Foundation type: Monopile.',
        },
        fowCountryCapacityChart,
      ],
    },

    // ── SECTION 4: Turbine Components (PDF pp. 12–16) ─────────────────────────
    {
      _id: 'sm4-sec-4-components',
      title: 'Wind Turbine Components',
      slug: { _type: 'slug', current: 'wind-turbine-components' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'windTurbineComponentsDiagram' as const,
          _key: 'sm4-s4-components-img',
          title: 'Fixed Offshore Wind Turbine — Key Components',
          caption: 'Key components of a fixed offshore wind turbine — from monopile foundation to rotor blades.',
        },
        {
          _type: 'richText',
          _key: 'sm4-s4-intro',
          content: [
            h2('sm4-s4-h1', 'Wind Turbine Components'),
            p('sm4-s4-p1', 'There are many key components that go into building a turbine capable of handling the harsh environment that comes with being offshore. A fixed offshore wind turbine consists of the following principal components:'),
            bullet('sm4-s4-b1', 'Rotor Blades — capture wind energy and convert it into rotational mechanical energy.'),
            bullet('sm4-s4-b2', 'Main Bearings — support the rotor shaft and reduce friction.'),
            bullet('sm4-s4-b3', 'Gearbox (in geared turbines) — increases rotational speed from the rotor shaft before it reaches the generator.'),
            bullet('sm4-s4-b4', 'Generator — converts mechanical rotational energy into electrical energy.'),
            bullet('sm4-s4-b5', 'Nacelle — the housing unit that encloses the generator, gearbox, control systems, and brake systems.'),
            bullet('sm4-s4-b6', 'Main Shaft / Low Speed Shaft — transmits rotational energy from the rotor to the generator or gearbox.'),
            bullet('sm4-s4-b7', 'High Speed Shaft — connects the gearbox to the generator in geared turbine designs.'),
            bullet('sm4-s4-b8', 'Electrical Control System — manages turbine operation, monitoring, and grid connection.'),
            bullet('sm4-s4-b9', 'Anemometer and Wind Vane — measure wind speed and direction to optimise turbine orientation.'),
            bullet('sm4-s4-b10', 'Pitch System — adjusts the angle of rotor blades to optimise energy capture or reduce loads in high winds.'),
            bullet('sm4-s4-b11', 'Yaw System — rotates the nacelle to face into the wind direction.'),
            bullet('sm4-s4-b12', 'Tower — supports the nacelle and rotor at height, typically reaching over 100 metres above sea level.'),
            bullet('sm4-s4-b13', 'Transition Piece — structural component connecting the tower to the foundation below the waterline.'),
            bullet('sm4-s4-b14', 'Foundation — the substructure anchoring the entire turbine to the seabed.'),
          ],
        },
        {
          _type: 'nacelleInternalDiagram' as const,
          _key: 'sm4-s4-nacelle-diagram',
        },
        {
          _type: 'richText',
          _key: 'sm4-s4-detail',
          content: [
            h3('sm4-s4-h2', 'The Nacelle'),
            p('sm4-s4-p2', 'The nacelle is a key component in a fixed offshore wind turbine, housing all the essential machinery that converts wind energy into electrical power. It sits at the top of the tower and contains critical elements such as the generator, gearbox, control systems, and brake systems. The nacelle is designed to protect these components from harsh marine conditions while allowing maintenance access. It is aerodynamically shaped to minimise wind resistance, and cooling systems inside the nacelle manage heat generated by the mechanical and electrical systems.'),
            h3('sm4-s4-h3', 'The Rotor Blades'),
            p('sm4-s4-p3', 'The blades capture the wind\'s kinetic energy. As the wind blows, the blades rotate, driving the rotor and converting wind energy into mechanical energy. Offshore turbine blades are aerodynamically designed for maximum efficiency in high-wind environments. They are typically made from lightweight composite materials — such as fiberglass or carbon fibre — to ensure both strength and flexibility. Offshore wind turbine blades are longer than onshore blades, often exceeding 80 metres, which allows them to capture more wind energy. Special coatings are applied to protect the blades from saltwater corrosion and varying weather conditions.'),
            h3('sm4-s4-h4', 'The Generator'),
            p('sm4-s4-p4', 'The generator converts the mechanical energy from the rotating blades into electrical energy. It is housed inside the nacelle. Offshore wind turbines often use Permanent Magnet Synchronous Generators (PMSG) or Electrically Excited Synchronous Generators (EESG). PMSG is commonly used in direct-drive systems, providing high efficiency without the need for external excitation. In direct-drive turbines, the rotor is directly connected to the generator — eliminating the need for a gearbox that was common in older turbine models.'),
            h3('sm4-s4-h5', 'The Tower'),
            p('sm4-s4-p5', 'The tower supports the nacelle and rotor at significant height above sea level, positioning the turbine in optimal wind conditions. Offshore turbine towers are typically made from steel, designed to withstand strong winds, waves, and saltwater corrosion. Offshore wind towers are generally taller than onshore counterparts, with heights reaching 100 metres or more, depending on the turbine model. They must be engineered for additional stability to withstand the dynamic forces from both wind and waves.'),
            h3('sm4-s4-h6', 'The Transition Piece'),
            p('sm4-s4-p6', 'The transition piece is a structural component that connects the tower to the foundation (such as a monopile or jacket) beneath the water. It ensures a secure and stable connection between the submerged foundation and the above-water turbine structure. Transition pieces typically include flanges and grouted connections, along with access points for maintenance personnel, internal platforms, and ladders. Since the transition piece is partly submerged, it is built with corrosion-resistant materials and cathodic protection systems to prevent saltwater damage.'),
          ],
        },
        {
          _type: 'turbineBladeDiagram' as const,
          _key: 'sm4-s4-blade-diagram',
        },
        {
          _type: 'turbineSizeComparison' as const,
          _key: 'sm4-s4-size',
          title: 'Offshore Wind Turbine Size Evolution — 1991 to Today',
          caption: 'Offshore wind turbine size evolution — from the 450 kW Vindeby turbines (1991) to modern 14–15 MW machines with tip heights exceeding 260 metres.',
        },
      ],
    },

    // ── SECTION 5: Foundation Types (PDF pp. 17–18) ───────────────────────────
    {
      _id: 'sm4-sec-5-foundations',
      title: 'Foundation Types in Fixed Offshore Wind',
      slug: { _type: 'slug', current: 'offshore-wind-foundation-types' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'fixedFoundationTypesDiagram' as const,
          _key: 'sm4-s5-fixed-foundations-diagram',
        },
        {
          _type: 'richText',
          _key: 'sm4-s5-text',
          content: [
            h2('sm4-s5-h1', 'Foundation Types in Fixed Offshore Wind'),
            p('sm4-s5-p1', 'The foundation is the substructure that anchors an offshore wind turbine to the seabed. The appropriate foundation type depends on water depth, seabed conditions, and site-specific environmental factors. There are four primary foundation types used in fixed offshore wind:'),
            h3('sm4-s5-h2', 'Monopile Foundations'),
            p('sm4-s5-p2', 'Monopile foundations consist of a single large steel pole driven deep into the seabed. These are the most common foundation type used in offshore wind farms, particularly in water depths of up to 30–50 metres. Monopiles are relatively simple and cost-effective to install — making them the foundation of choice for many projects in the North Sea and other regions. They were used in both Hornsea 2 and Vineyard Wind 1.'),
            h3('sm4-s5-h3', 'Gravity-Based Foundations (GBFs)'),
            p('sm4-s5-p3', 'Gravity-based foundations rely on their massive weight to stay anchored to the seabed. These structures are typically made from concrete and are suitable for shallower waters (up to around 30 metres). They are placed directly on the seabed without the need for driven piling. GBFs are often filled with ballast — such as sand or rocks — to increase stability and ensure they remain fixed in place under the forces of wind and wave.'),
            h3('sm4-s5-h4', 'Tripod Foundations'),
            p('sm4-s5-p4', 'Tripod foundations are three-legged structures with a central column connected to the wind turbine tower. Used in deeper waters (30–60 metres), they provide enhanced stability in areas with softer or more variable seabeds. They distribute load more evenly than monopiles, making them suitable for more challenging offshore environments.'),
            h3('sm4-s5-h5', 'Jacket Foundations'),
            p('sm4-s5-p5', 'Jacket foundations consist of a lattice structure with three or four legs fixed to the seabed — resembling an oil platform design. They are used in deep waters (greater than 50 metres), where their lighter weight and ability to distribute loads across multiple legs are advantageous. Jacket foundations are typically secured with piles driven into the seabed at the base of each leg. They offer high structural integrity and are being used increasingly as projects move into deeper waters.'),
          ],
        },
        {
          _type: 'fixedFoundationInstallationDiagram' as const,
          _key: 'sm4-s5-foundation2',
        },
      ],
    },

    // ── SECTION 6: Energy Transmission (PDF pp. 19–20) ────────────────────────
    {
      _id: 'sm4-sec-6-transmission',
      title: 'Energy Transmission and Storage',
      slug: { _type: 'slug', current: 'offshore-wind-energy-transmission' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm4-s6-hero',
          image: localImage('Images/AdobeStock_1088004794.webp', 'Offshore wind energy transmission — subsea cables and substations'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm4-s6-text',
          content: [
            h2('sm4-s6-h1', 'Transmission of Energy from Offshore Wind'),
            p('sm4-s6-p1', 'Getting electricity from offshore wind turbines to consumers onshore involves a multi-stage transmission system. Each stage is critical to minimising energy losses and ensuring reliable grid integration.'),
            h3('sm4-s6-h2', 'The Transmission Chain'),
            bullet('sm4-s6-b1', 'Array Cables: Electricity generated by each turbine flows through medium-voltage array cables to the offshore substation.'),
            bullet('sm4-s6-b2', 'Offshore Substation (OSS): The OSS steps up the voltage significantly to reduce transmission losses. It collects electricity from all turbines in the wind farm.'),
            bullet('sm4-s6-b3', 'Export Cable: A high-voltage export cable transmits electricity from the offshore substation to an onshore substation. These are typically either High-Voltage Alternating Current (HVAC) or High-Voltage Direct Current (HVDC) cables. HVDC is more efficient for long-distance transmission (typically beyond 80 km) due to significantly lower energy losses.'),
            bullet('sm4-s6-b4', 'Onshore Substation: Once the electricity reaches shore, voltage is stepped down to suitable levels for the local transmission and distribution grid.'),
            bullet('sm4-s6-b5', 'Grid Connection: After voltage transformation, the electricity is fed into the national grid and distributed to consumers.'),
            h3('sm4-s6-h3', 'Smart Grid Integration'),
            p('sm4-s6-p2', 'As renewable energy sources like offshore wind increase their share of the grid, Smart Grid technologies help manage the variability of wind power — using digital systems and advanced monitoring to adjust supply and demand in real time, preventing grid instability.'),
            h3('sm4-s6-h4', 'Energy Storage'),
            bullet('sm4-s6-b6', 'Battery Storage Systems: Offshore wind is increasingly coupled with battery storage (typically lithium-ion or flow batteries) to store excess power generated during periods of high wind, and release it when wind output is low.'),
            bullet('sm4-s6-b7', 'Green Hydrogen: Some offshore wind farms are exploring hydrogen production as a storage solution. Excess electricity powers electrolysis plants, converting water into hydrogen that can be stored and used later as a fuel or re-electrified when grid supply from wind is low.'),
          ],
        },
      ],
    },

    // ── SECTION 7: Technological Innovations (PDF p. 21) ─────────────────────
    {
      _id: 'sm4-sec-7-tech',
      title: 'Technological Innovations in Turbine Technology',
      slug: { _type: 'slug', current: 'offshore-wind-turbine-innovations' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm4-s7-text',
          content: [
            h2('sm4-s7-h1', 'Bigger and Better: Technological Innovations in Offshore Wind'),
            p('sm4-s7-p1', 'Offshore Wind Energy has come a long way in a short space of time. The technology behind Wind Turbine Generators continues to make major steps forward, resulting in higher turbine capacity, longer blades, and the use of advanced materials — all helping to drive down the cost of offshore wind energy.'),
            h3('sm4-s7-h2', 'Increasing Turbine Capacity'),
            p('sm4-s7-p2', 'Offshore wind turbines have seen substantial increases in power output over the past decade. Turbines with a capacity of 15–18 MW are now being developed and deployed — a major advancement from earlier models which were typically between 3 and 6 MW. Larger turbines with high MW capacities significantly reduce the cost per MWh of electricity, as fewer turbines are needed to achieve the same total output. This also reduces maintenance costs, since fewer turbines require servicing.'),
            h3('sm4-s7-h3', 'Longer Rotor Blades'),
            p('sm4-s7-p3', 'Blade length is increasing to improve energy capture — with blades now exceeding 100 metres in length. Longer blades sweep a larger area, increasing the amount of wind energy that can be captured. The shift toward lighter composite materials, such as carbon fibre and advanced glass fibre composites, has enabled this growth in blade length without compromising structural integrity. These materials also enhance resistance to corrosion and fatigue from constant exposure to marine environments.'),
            h3('sm4-s7-h4', 'Advanced Foundations and Installation'),
            p('sm4-s7-p4', 'Innovation is also occurring in foundation design and installation efficiency. New larger installation vessels, improved pile driving techniques, and digital twin modelling of seabed conditions are all helping to reduce installation time and cost. As turbines grow larger, monopile diameter and weight are also increasing — driving demand for next-generation installation equipment.'),
          ],
        },
        fowLcoeChart,
      ],
    },

    // ── SECTION 8: Financial Aspects and Economic Challenges (PDF pp. 22–24) ──
    {
      _id: 'sm4-sec-8-finance',
      title: 'Financial Aspects and Economic Challenges',
      slug: { _type: 'slug', current: 'offshore-wind-financial-aspects' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm4-s8-hero',
          image: localImage('Images/AdobeStock_241639169.webp', 'Offshore wind financial outlook — investment and LCOE'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm4-s8-text',
          content: [
            h2('sm4-s8-h1', 'The Financial Outlook for Fixed Offshore Wind'),
            p('sm4-s8-p1', 'Fixed offshore wind projects involve significant capital investment, often ranging from hundreds of millions to billions of pounds per project. The high costs are driven by the need for specialised equipment — including large turbines, offshore substations, and installation vessels — as well as complex installation processes in challenging marine environments. Additionally, maintenance and transmission infrastructure (including subsea cables) further add to the financial burden.'),
            p('sm4-s8-p2', 'However, these projects benefit from economies of scale: larger farms with more powerful turbines help drive down the Levelised Cost of Energy (LCOE). Reducing the LCOE for renewable energy technologies such as fixed offshore wind is perhaps the most important ongoing challenge globally as the mission to reduce emissions continues.'),
            p('sm4-s8-p3', 'The market for fixed offshore wind is expanding rapidly, driven by government incentives such as Contracts for Difference (CfD), feed-in tariffs, and the growing global commitment to reducing carbon emissions. Despite the financial challenges, the sector is attracting substantial long-term investment due to its essential role in the transition to renewable energy.'),
            h3('sm4-s8-h2', 'Economic Challenges'),
            bullet('sm4-s8-b1', 'High Capital Costs (CapEx): Offshore wind farms require significant upfront investments for turbines, foundations, installation vessels, and grid connections — substantially higher than onshore wind projects.'),
            bullet('sm4-s8-b2', 'Long Payback Periods: Projects typically have payback periods of 15–20 years, making financing more complex compared to assets with quicker returns.'),
            bullet('sm4-s8-b3', 'Grid Connection Costs and Delays: Connecting offshore wind farms to national grids involves substantial investment in subsea cables and onshore infrastructure. Delays in securing grid connections can stall projects and reduce their economic viability.'),
            bullet('sm4-s8-b4', 'Uncertain Revenue Streams: Projects are heavily reliant on Power Purchase Agreements (PPAs) and government subsidies. Policy changes or subsidy reductions can create uncertainty around long-term revenues.'),
            bullet('sm4-s8-b5', 'Supply Chain Bottlenecks: Constraints in the availability of specialised components — including turbines, blades, and cables — can drive up project costs and lead to delays.'),
            bullet('sm4-s8-b6', 'Emerging Market Financing Risk: In newer markets such as Southeast Asia or Latin America, investors may be more hesitant due to limited experience in offshore wind, lack of established regulatory frameworks, and perceived political or economic uncertainty.'),
          ],
        },
      ],
    },

    // ── SECTION 9: Geographic Breakdown and Global Dispersion (PDF pp. 25–26) ─
    {
      _id: 'sm4-sec-9-geography',
      title: 'Geographic Breakdown and Global Dispersion',
      slug: { _type: 'slug', current: 'offshore-wind-geographic-breakdown' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm4-s9-hero',
          image: localImage('Images/AdobeStock_685105171.webp', 'Global offshore wind development — geographic spread'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm4-s9-text',
          content: [
            h2('sm4-s9-h1', 'Geographic Breakdown'),
            p('sm4-s9-p1', 'As of 2023, China leads the world in offshore wind power with an installed capacity of 31 GW — a significant portion of the global total. China\'s offshore wind growth is unmatched, driven by its commitment to clean energy and vast coastal regions suitable for large wind farms. By 2050, China is expected to continue leading in offshore wind capacity, with global estimates ranging from 600 GW to 2,000 GW of total offshore wind by that date.'),
            p('sm4-s9-p2', 'The United Kingdom has been a leading spender on fixed offshore wind projects. The UK has consistently invested heavily, developing major projects including the Dogger Bank Wind Farm and the Hornsea Wind Farms — two of the largest in the world. These investments have contributed to the UK\'s installed capacity of 14 GW.'),
            h3('sm4-s9-h2', 'Key Factors Driving Global Dispersion'),
            bullet('sm4-s9-b1', 'Wind Resource Availability: The most critical factor — regions with strong, stable wind patterns are ideal as they maximise energy production and capacity factors.'),
            bullet('sm4-s9-b2', 'Water Depth: Fixed offshore wind farms are typically built in waters up to 50 metres deep. Areas with a continental shelf close to the coastline allow easier installation of monopile, jacket, or other fixed foundations.'),
            bullet('sm4-s9-b3', 'Seabed Conditions: The type of seabed is essential for foundation selection. Soft seabeds may require gravity-based or jacket foundations, while hard seabeds are well-suited for monopiles.'),
            bullet('sm4-s9-b4', 'Proximity to Shore: Closer farms benefit from lower transmission costs, while those further out require more expensive high-voltage cables and specialised installation vessels.'),
            bullet('sm4-s9-b5', 'Grid Infrastructure: A strong, well-established electricity grid near the wind farm facilitates easier integration of offshore-generated electricity.'),
            bullet('sm4-s9-b6', 'Political and Economic Stability: Government policies, regulatory frameworks, and economic incentives (subsidies, tax credits, CfDs) play an essential role in determining where offshore wind projects are viable.'),
            bullet('sm4-s9-b7', 'Marine Traffic and Environmental Constraints: High levels of marine traffic or ecologically sensitive areas — such as marine reserves or habitats for protected species — can limit where offshore wind farms can be developed.'),
          ],
        },
        fowCountryCapacityChart,
      ],
    },

    // ── SECTION 10: Environmental Challenges (PDF p. 27) ─────────────────────
    {
      _id: 'sm4-sec-10-environment',
      title: 'Environmental Effects and Challenges',
      slug: { _type: 'slug', current: 'offshore-wind-environmental-challenges' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm4-s10-text',
          content: [
            h2('sm4-s10-h1', 'Environmental Effects and Challenges'),
            p('sm4-s10-p1', 'While fixed offshore wind offers substantial benefits in terms of clean energy production and reducing carbon emissions, it does come with environmental and social challenges. These must be carefully assessed and managed — which is why an offshore wind farm must go through a formal Environmental Impact Assessment (EIA) process in the UK (and under equivalent regulatory processes in other countries) before it can be approved.'),
            h3('sm4-s10-h2', 'Visual and Noise Impact'),
            p('sm4-s10-p2', 'Offshore wind farms located near coastlines can affect the visual landscape, especially for communities that rely on coastal tourism or have scenic views. The presence of large turbines, even when positioned far out at sea, can alter the aesthetic appeal of coastal areas. Turbines also generate some noise during operation, though this diminishes significantly with distance from shore.'),
            h3('sm4-s10-h3', 'Impact on Marine Ecosystems'),
            p('sm4-s10-p3', 'The construction and operation of offshore wind farms can disturb marine life, particularly during the installation of turbine foundations. Noise generated from pile driving — used to install monopile foundations — can disrupt the communication, navigation, and migration patterns of marine species, particularly cetaceans (whales and dolphins). Mitigation measures such as bubble curtains and noise monitoring are commonly deployed.'),
            h3('sm4-s10-h4', 'Seabed Disturbance'),
            p('sm4-s10-p4', 'The installation of turbines and subsea cables can lead to seabed disturbance, altering the habitats of benthic organisms (those that live on the ocean floor). This can result in changes to local biodiversity, at least during the construction phase. Over time, however, turbine foundations can act as artificial reefs, creating new habitats and actually increasing local biodiversity in many cases.'),
            h3('sm4-s10-h5', 'Fishing Industry Disruption'),
            p('sm4-s10-p5', 'Offshore wind farms can disrupt local fishing communities by limiting access to traditional fishing grounds. Construction and operation zones may be designated as restricted areas for fishing vessels — affecting the livelihoods of local fishermen. Developers increasingly engage with fishing communities to design exclusion zones and compensation arrangements.'),
            h3('sm4-s10-h6', 'Collision Risk for Migratory Birds'),
            p('sm4-s10-p6', 'Offshore wind farms present a collision risk for migratory birds, which can collide with rotating blades particularly during migration seasons. Site selection — avoiding major migration corridors — and turbine spacing design can help mitigate this risk.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm4-s10-callout',
          variant: 'info',
          title: 'The Environmental Impact Assessment (EIA)',
          body: 'Before any offshore wind farm can be constructed in UK waters, it must go through a rigorous Environmental Impact Assessment (EIA) process. This involves detailed studies of marine habitats, bird and bat populations, seabed conditions, and impacts on local communities and the fishing industry. Similar assessment frameworks apply in the EU, USA, China, and most major offshore wind markets.',
        },
      ],
    },

    // ── SECTION 11: The Future of Fixed Offshore Wind (PDF pp. 28–30) ─────────
    {
      _id: 'sm4-sec-11-future',
      title: 'The Future of Fixed Offshore Wind',
      slug: { _type: 'slug', current: 'future-fixed-offshore-wind' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm4-s11-text',
          content: [
            h2('sm4-s11-h1', 'The Future of Fixed Offshore Wind'),
            p('sm4-s11-p1', 'The outlook for global offshore wind is extremely promising. The sector is expected to expand rapidly over the next few decades. By 2030, global offshore wind capacity is forecast to reach 200–400 GW — a significant increase from the current capacity of approximately 75 GW. This growth is driven by advancements in turbine technology, falling costs, and strong governmental support in key markets including China, Europe, and the United States.'),
            h3('sm4-s11-h2', 'Key Trends Shaping the Future'),
            bullet('sm4-s11-b1', 'Increasing Turbine Sizes: Turbines with capacities of 12–15 MW are now commercially available, with some exceeding 20 MW in capacity under development. Larger turbines reduce the number of installations required per wind farm, improving efficiency and reducing overall costs.'),
            bullet('sm4-s11-b2', 'Continued Cost Reductions: Offshore wind is experiencing significant LCOE reductions, driven by economies of scale, advancements in installation technologies, and increased turbine efficiency. The LCOE for offshore wind is becoming increasingly competitive with conventional generation including natural gas and coal.'),
            bullet('sm4-s11-b3', 'Repowering of First-Generation Farms: As the first generation of offshore wind farms approach the end of their operational lives (typically 20–25 years), repowering is becoming a trend — replacing old turbines with newer, more efficient models to extend the useful life of existing sites.'),
            bullet('sm4-s11-b4', 'Recyclable Blades and End-of-Life Management: Growing attention to blade recyclability and turbine end-of-life management addresses long-term sustainability concerns and helps close the circular economy loop for offshore wind.'),
            h3('sm4-s11-h3', 'Regional Outlook'),
            bullet('sm4-s11-b5', 'China will continue to dominate and outpace Europe and other regions in offshore wind deployment through 2030 and beyond.'),
            bullet('sm4-s11-b6', 'European countries will continue steady growth, adding to global capacity while investing heavily in new technologies derived from offshore wind — particularly floating offshore wind, which is the subject of Sub-Module 5.'),
            bullet('sm4-s11-b7', 'Other regions continue to emerge — North America is accelerating after a slow start, and Asian markets outside of China (including Taiwan, South Korea, and Japan) are developing rapidly.'),
          ],
        },
        fowForecastChart,
        fowRegionalOutlookChart,
      ],
    },
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm4-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'fixed-offshore-wind-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm4-conc-text',
          content: [
            h2('sm4-conc-h1', 'Sub-Module Summary'),
            p('sm4-conc-p1', 'This sub-module has traced the development of fixed offshore wind from its origins at Vindeby, Denmark in 1991 to a global industry with over 75 GW of installed capacity. The technology has matured significantly: monopile foundations dominate in shallower waters (up to 50 metres), while jacket and tripod structures extend viability to greater depths. Turbine capacity has grown from early 450 kW machines to today\'s 15+ MW giants, driving down the Levelised Cost of Energy (LCOE) to approximately $95/MWh — a 7% year-on-year reduction — and making offshore wind increasingly cost-competitive.'),
            p('sm4-conc-p2', 'Transmission infrastructure is as critical as the turbines themselves. High Voltage Direct Current (HVDC) cables enable efficient long-distance power export from remote offshore locations to onshore grids. Yaw systems, pitch controls, and condition monitoring systems ensure turbines operate at peak efficiency regardless of wind direction. Financially, offshore wind projects remain capital-intensive — typically requiring £3–4 billion for large-scale developments — but Contract for Difference (CfD) frameworks and declining technology costs are improving project economics.'),
            p('sm4-conc-p3', 'Geographically, China overtook Europe as the global leader in offshore wind capacity in 2020 and continues to dominate new installations. The United Kingdom, Germany, the Netherlands, and Denmark remain the most mature European markets, while the USA (led by projects like Block Island) is accelerating its offshore programme. IRENA forecasts 320 GW of global capacity by 2030. Environmental considerations — particularly impacts on marine ecosystems and migratory birds — require careful site selection and ongoing monitoring, but fixed offshore wind remains one of the most powerful tools available for large-scale, reliable clean power generation.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm4-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 4',
          body: 'You now have a thorough understanding of fixed offshore wind — from its engineering components and foundation types to its financial structures, global deployment patterns, and future trajectory. The next sub-module explores floating offshore wind, which opens up the deep-water resources that fixed foundations cannot reach.',
        },
      ],
    },
    {
      _id: 'sm4-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'fixed-offshore-wind-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm4-col-quiz',
          subModuleSlug: 'fixed-offshore-wind',
          moduleId: 'module-1',
        },
      ],
    },
  ],
}
