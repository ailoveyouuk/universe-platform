// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 4 — Confirmation of Learning Questions
// Topic: Fixed Offshore Wind  |  slug: 'fixed-offshore-wind'
//
// Each question links to the most relevant section in SM4 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm4ColQuestions: ColQuestion[] = [
  {
    id: 'sm4-q1',
    question: 'Which wind farm, built in Denmark in 1991, is recognised as the world\'s first offshore wind farm?',
    options: [
      'Horns Rev 1 — Denmark\'s first large-scale commercial offshore wind farm',
      'Vindeby Offshore Wind Farm — the world\'s first offshore wind farm, commissioned in 1991',
      'London Array Phase 1 — the UK\'s first offshore wind installation',
      'Walney Extension — which became the world\'s largest offshore wind farm in 2017',
    ],
    correctIndex: 1,
    explanation:
      'Vindeby Offshore Wind Farm, commissioned in Denmark in 1991, was the world\'s first offshore wind farm. It marked a pivotal moment in renewable energy history by demonstrating that wind turbines could be deployed in the marine environment. Horns Rev 1 followed in 2002 as the first large-scale commercial offshore wind farm, with 160 MW of capacity.',
    wrongExplanation:
      'That is not the world\'s first offshore wind farm. Vindeby Offshore Wind Farm, built in Denmark in 1991, holds that distinction. It was a pioneering demonstration project that proved offshore wind was technically feasible. Horns Rev 1 (2002) was the first at commercial scale, with 160 MW of capacity.',
    reviewSectionId: 'sm4-sec-2-history',
    reviewSectionTitle: 'History of Fixed Offshore Wind',
  },
  {
    id: 'sm4-q2',
    question: 'What was the total global installed capacity of fixed offshore wind by the end of 2023, according to the Global Wind Energy Council (GWEC)?',
    options: [
      'Approximately 25 GW globally',
      'Approximately 50 GW globally',
      'Approximately 75 GW globally',
      'Approximately 120 GW globally',
    ],
    correctIndex: 2,
    explanation:
      'Global offshore wind capacity (fixed and floating combined) reached 75 GW by the end of 2023, with China contributing 36.7 GW and Europe continuing major deployments. This represents remarkable growth from just 3 GW in 2010. The sector is forecast by IRENA to reach 320 GW by 2030 and 1,000 GW by 2050.',
    wrongExplanation:
      'That figure is not correct. Global offshore wind capacity reached 75 GW by the end of 2023, according to GWEC — with China as the leading contributor at 36.7 GW. This is expected to grow rapidly, with IRENA forecasting 320 GW by 2030 and 1,000 GW by 2050.',
    reviewSectionId: 'sm4-sec-1-intro',
    reviewSectionTitle: 'Introduction to Fixed Offshore Wind',
  },
  {
    id: 'sm4-q3',
    question: 'What was the average Levelised Cost of Energy (LCOE) for fixed offshore wind in 2023, and how did it compare to 2022?',
    options: [
      '$65/MWh in 2023 — a 20% decrease on 2022',
      '$95/MWh in 2023 — a 7% decrease on 2022',
      '$130/MWh in 2023 — a 3% increase on 2022',
      '$45/MWh in 2023 — a 15% decrease on 2022',
    ],
    correctIndex: 1,
    explanation:
      'The average production cost (LCOE) for fixed offshore wind reached $95/MWh in 2023 — a 7% decrease on 2022, reflecting continued improvements in turbine technology, manufacturing, and installation. While still higher than onshore wind and solar, offshore wind LCOE has been on a strong downward trajectory and is becoming increasingly competitive with conventional generation.',
    wrongExplanation:
      'Those figures are not correct. The average LCOE for fixed offshore wind was $95/MWh in 2023, representing a 7% decrease on 2022. This continuing decline reflects advances in turbine size and efficiency, improved installation techniques, and growing supply chain maturity.',
    reviewSectionId: 'sm4-sec-1-intro',
    reviewSectionTitle: 'Introduction to Fixed Offshore Wind',
  },
  {
    id: 'sm4-q4',
    question: 'Which foundation type is the most common in fixed offshore wind and is typically used in water depths of up to 30–50 metres?',
    options: [
      'Jacket foundations — lattice structures with three or four legs suited to deep water',
      'Gravity-based foundations — heavy concrete structures suitable for very shallow water',
      'Tripod foundations — three-legged structures for intermediate water depths',
      'Monopile foundations — single large steel poles driven deep into the seabed',
    ],
    correctIndex: 3,
    explanation:
      'Monopile foundations — consisting of a single large steel pole driven deep into the seabed — are the most common foundation type used in offshore wind farms, particularly in water depths of up to 30–50 metres. Their relative simplicity and cost-effectiveness at standard offshore depths has made them the dominant choice globally, though jacket and other foundation types are used in deeper or more complex seabeds.',
    wrongExplanation:
      'That is a different foundation type. Monopile foundations — single large steel poles driven into the seabed — are the most widely used offshore wind foundation type, accounting for the majority of installed capacity globally. They are typically used in water depths up to 30–50 metres due to their simplicity and cost-effectiveness.',
    reviewSectionId: 'sm4-sec-5-foundations',
    reviewSectionTitle: 'Foundation Types',
  },
  {
    id: 'sm4-q5',
    question: 'In which water depth range are jacket foundations — the lattice-structure type resembling an oil platform — typically used?',
    options: [
      'Up to 30 metres — shallow water, replacing gravity-based foundations',
      '30–60 metres — intermediate depths, alongside tripod foundations',
      'Greater than 50 metres — deep water where monopiles and tripods become less viable',
      'Greater than 100 metres — ultra-deep water beyond the reach of all other fixed foundations',
    ],
    correctIndex: 2,
    explanation:
      'Jacket foundations consist of a lattice structure with three or four legs fixed to the seabed — similar in concept to an oil platform design. They are used in deeper waters, generally greater than 50 metres, where their lightweight but extremely rigid structure provides the load-bearing capacity and stability required. Beyond approximately 60 metres, floating foundations begin to become the preferred option.',
    wrongExplanation:
      'That water depth is not correct for jacket foundations. Jacket foundations — the lattice-structure type — are used in deep water environments, typically greater than 50 metres, where their rigidity and load distribution provide the necessary structural performance. At shallower depths, monopile or gravity-based foundations are more economical.',
    reviewSectionId: 'sm4-sec-5-foundations',
    reviewSectionTitle: 'Foundation Types',
  },
  {
    id: 'sm4-q6',
    question: 'What is the IRENA forecast for global offshore wind installed capacity by 2030?',
    options: [
      '100 GW by 2030',
      '200 GW by 2030',
      '320 GW by 2030',
      '500 GW by 2030',
    ],
    correctIndex: 2,
    explanation:
      'IRENA (the International Renewable Energy Agency) forecasts 320 GW of global offshore wind installed capacity by 2030 — a significant increase from the 75 GW in place at the end of 2023. This growth is driven by advancements in turbine technology, falling costs, and strong governmental support in key markets including China, Europe, and the United States. By 2050, global forecasts suggest 1,000 GW.',
    wrongExplanation:
      'That is not IRENA\'s 2030 forecast. IRENA projects that global offshore wind capacity will reach 320 GW by 2030 — more than four times the 75 GW installed by end of 2023. Long-term forecasts suggest 1,000 GW by 2050, driven by continued cost reductions and strong policy support.',
    reviewSectionId: 'sm4-sec-1-intro',
    reviewSectionTitle: 'Introduction to Fixed Offshore Wind',
  },
  {
    id: 'sm4-q7',
    question: 'For long-distance offshore electricity transmission, which cable technology is preferred over HVAC and why?',
    options: [
      'HVDC (High-Voltage Direct Current) — because it has lower electrical losses over long distances and has no reactive power limitations',
      'HVAC (High-Voltage Alternating Current) — because it is cheaper to manufacture and easier to connect to onshore grids',
      'MVDC (Medium-Voltage Direct Current) — because it is more flexible for connecting multiple wind farms',
      'LVAC (Low-Voltage Alternating Current) — because it is safer for subsea installation',
    ],
    correctIndex: 0,
    explanation:
      'For long-distance transmission of offshore wind electricity, High-Voltage Direct Current (HVDC) cables are preferred over HVAC. HVDC has significantly lower electrical losses over long distances and does not suffer from the reactive power limitations that make HVAC less efficient for cables exceeding roughly 50–80 km. HVDC convertor stations are expensive but the efficiency gains make it the preferred choice for large, distant offshore projects.',
    wrongExplanation:
      'That is not correct. For long-distance offshore transmission, HVDC (High-Voltage Direct Current) is preferred because it has lower losses over distance and avoids the reactive power limitations of HVAC. HVAC is more common for shorter cable runs and is cheaper in terms of cable cost, but loses efficiency over longer distances.',
    reviewSectionId: 'sm4-sec-6-transmission',
    reviewSectionTitle: 'Transmission & Grid Connection',
  },
  {
    id: 'sm4-q8',
    question: 'Which country has been the global leader in offshore wind capacity since 2020 and is forecast to maintain this position through 2030 and beyond?',
    options: [
      'The United Kingdom — which pioneered offshore wind with the world\'s first commercial farms',
      'Germany — which leads through its aggressive Energiewende policy programme',
      'China — which surpassed the UK in 2020 with over 10 GW cumulative capacity',
      'Denmark — where offshore wind technology was first commercially demonstrated',
    ],
    correctIndex: 2,
    explanation:
      'China surpassed the UK in 2020 with over 10 GW of cumulative offshore wind capacity and has maintained its position as the global leader since. By 2023, China had 36.7 GW of offshore wind capacity — nearly half the world total of 75 GW. China is forecast to continue dominating and outpacing Europe and other regions through 2030 and beyond.',
    wrongExplanation:
      'That is not the current global leader. China surpassed the UK as the world\'s largest offshore wind market in 2020, reaching over 10 GW cumulative capacity. By 2023, China had 36.7 GW — nearly half of the global total — and is forecast to continue dominating offshore wind deployment through 2030 and beyond.',
    reviewSectionId: 'sm4-sec-2-history',
    reviewSectionTitle: 'History of Fixed Offshore Wind',
  },
  {
    id: 'sm4-q9',
    question: 'What was the first commercial offshore wind farm in the United States, which became operational in 2016?',
    options: [
      'Vineyard Wind — a 800 MW project off Massachusetts',
      'Cape Wind — a controversial project in Nantucket Sound',
      'Block Island Wind Farm — a 30 MW project that signalled North America\'s entry into offshore wind',
      'Coastal Virginia Offshore Wind — the first utility-scale project on the US East Coast',
    ],
    correctIndex: 2,
    explanation:
      'Block Island Wind Farm (30 MW), located off Rhode Island, became the first commercial offshore wind farm in the United States when it became operational in 2016. It signalled North America\'s entry into offshore wind and served as a demonstration project that proved the technology was viable in American waters, paving the way for the much larger projects now in development.',
    wrongExplanation:
      'That is not the first US commercial offshore wind farm. Block Island Wind Farm — a 30 MW project off Rhode Island — became the US\'s first commercial offshore wind installation in 2016. It was a relatively small project, but it proved the technology was viable in American waters and catalysed a wave of subsequent project development.',
    reviewSectionId: 'sm4-sec-2-history',
    reviewSectionTitle: 'History of Fixed Offshore Wind',
  },
  {
    id: 'sm4-q10',
    question: 'What is the function of the Yaw System in an offshore wind turbine?',
    options: [
      'It adjusts the angle of the rotor blades to optimise energy capture or reduce loads in high winds',
      'It rotates the nacelle to ensure the turbine faces into the wind direction at all times',
      'It controls the speed at which the generator converts mechanical energy into electricity',
      'It monitors wind speed and direction, transmitting data to the turbine\'s control system',
    ],
    correctIndex: 1,
    explanation:
      'The Yaw System rotates the entire nacelle — the housing unit containing the generator, gearbox, and control systems — to ensure the turbine is always facing into the prevailing wind direction. This maximises energy capture. It works in conjunction with the Anemometer and Wind Vane, which measure wind speed and direction. The Pitch System is the separate component that adjusts the angle of the blades.',
    wrongExplanation:
      'That describes a different system. The Yaw System is specifically responsible for rotating the nacelle to face into the wind direction, maximising energy capture. The Pitch System adjusts the blade angle; the Anemometer and Wind Vane measure wind speed and direction; the generator\'s speed is managed by the Electrical Control System.',
    reviewSectionId: 'sm4-sec-4-components',
    reviewSectionTitle: 'Turbine Components',
  },
]
