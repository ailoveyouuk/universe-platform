// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 15 — Confirmation of Learning Questions
// Topic: The Future of Renewables (slug: 'future-renewables')
//
// Each question links to the most relevant section in SM15 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm15ColQuestions: ColQuestion[] = [
  {
    id: 'sm15-q1',
    question: 'Approximately what share of global primary energy currently comes from fossil fuels?',
    options: [
      'Around 40%',
      'Around 55%',
      'Around 65%',
      'Around 80%',
    ],
    correctIndex: 3,
    explanation:
      'Despite decades of renewable energy growth, fossil fuels — coal, oil, and natural gas — still supply approximately 80% of global primary energy consumption. This underlines the enormous scale of the transition required to achieve net-zero targets and explains why the pace of renewable deployment must accelerate dramatically.',
    wrongExplanation:
      'Fossil fuels still account for around 80% of global primary energy. This is the baseline that renewable energy must displace to achieve net-zero targets — a stark reminder of how much transformation remains even after years of rapid clean energy growth.',
    reviewSectionId: 'sm15-sec-1-intro',
    reviewSectionTitle: 'Introduction to the Future of Renewables',
  },
  {
    id: 'sm15-q2',
    question: 'The IEA\'s Net Zero Emissions by 2050 scenario requires global renewable energy capacity by 2030 to be what relative to current levels?',
    options: [
      'Doubled',
      'Tripled',
      'Quadrupled',
      'Increased by 50%',
    ],
    correctIndex: 1,
    explanation:
      'The IEA\'s Net Zero by 2050 roadmap requires global renewable power capacity to triple from current levels by 2030 — a commitment that world leaders formally endorsed at COP28 in Dubai in 2023. This means adding roughly 1,000 GW of new renewable capacity every year through the decade.',
    wrongExplanation:
      'The IEA requires a tripling of global renewable capacity by 2030 — not merely doubling. This commitment was adopted at COP28 in 2023 and demands an unprecedented rate of clean energy deployment equivalent to adding around 1,000 GW of renewable power every single year.',
    reviewSectionId: 'sm15-sec-5-projections',
    reviewSectionTitle: 'Projections & Scenarios',
  },
  {
    id: 'sm15-q3',
    question: 'By approximately how much did the cost of utility-scale solar PV fall between 2010 and the early 2020s?',
    options: [
      'Around 30%',
      'Around 60%',
      'Around 75%',
      'Over 90%',
    ],
    correctIndex: 3,
    explanation:
      'The levelised cost of electricity from utility-scale solar PV fell by over 90% between 2010 and the early 2020s — from roughly $0.40/kWh to under $0.04/kWh in the most competitive markets. This is one of the most dramatic cost reductions ever recorded for any energy technology and is driven by economies of scale, manufacturing improvements, and learning-by-doing.',
    wrongExplanation:
      'Solar PV costs fell by over 90% between 2010 and the early 2020s. This exceptional cost trajectory — driven by manufacturing scale, improved efficiency, and competitive procurement — transformed solar from a niche premium technology into the cheapest source of electricity in history in many regions.',
    reviewSectionId: 'sm15-sec-3-drivers',
    reviewSectionTitle: 'Drivers of Renewable Energy Growth',
  },
  {
    id: 'sm15-q4',
    question: 'What temperature limit does the Paris Agreement establish as the primary goal, with a stronger aspiration expressed alongside it?',
    options: [
      'Limit warming to 1°C, with efforts to stay below 0.5°C',
      'Limit warming to 2°C, with efforts to stay below 1°C',
      'Limit warming to well below 2°C, with efforts to limit warming to 1.5°C',
      'Limit warming to 3°C, with efforts to limit warming to 2°C',
    ],
    correctIndex: 2,
    explanation:
      'The Paris Agreement, adopted in 2015, commits parties to holding global average temperature increase to well below 2°C above pre-industrial levels and to pursuing efforts to limit the increase to 1.5°C. The 1.5°C aspiration was elevated in prominence following the IPCC\'s 2018 Special Report, which detailed the significantly worse impacts of 2°C compared to 1.5°C.',
    wrongExplanation:
      'The Paris Agreement sets a binding goal of well below 2°C with an aspirational target of 1.5°C. The 1.5°C limit gained greater political prominence after the IPCC\'s 2018 Special Report demonstrated the stark difference in impacts between the two temperature thresholds.',
    reviewSectionId: 'sm15-sec-2-history',
    reviewSectionTitle: 'History of Climate & Energy Policy',
  },
  {
    id: 'sm15-q5',
    question: 'How much climate and clean energy investment did the US Inflation Reduction Act (2022) commit over a ten-year period?',
    options: [
      'Approximately $100 billion',
      'Approximately $200 billion',
      'Approximately $369 billion',
      'Approximately $1 trillion',
    ],
    correctIndex: 2,
    explanation:
      'The Inflation Reduction Act, signed in August 2022, committed approximately $369 billion in climate and clean energy provisions over ten years — the largest climate investment in US history. It operates primarily through tax credits for clean electricity, electric vehicles, heat pumps, and clean manufacturing, and is projected to reduce US emissions by around 40% below 2005 levels by 2030.',
    wrongExplanation:
      'The Inflation Reduction Act committed approximately $369 billion to climate and clean energy — the largest such investment in US history. Its combination of technology-neutral tax credits, manufacturing incentives, and clean vehicle subsidies triggered a wave of clean energy investment well beyond the direct federal spend.',
    reviewSectionId: 'sm15-sec-3-drivers',
    reviewSectionTitle: 'Drivers of Renewable Energy Growth',
  },
  {
    id: 'sm15-q6',
    question: 'Which of the following correctly lists five key drivers of renewable energy growth?',
    options: [
      'Political lobbying, academic research, fossil fuel price volatility, media coverage, and military procurement',
      'Environmental imperatives, economic competitiveness, government policy, technological progress, and social pressure',
      'Geopolitical competition, demographic change, urbanisation, digital transformation, and consumer choice',
      'International treaties, foreign aid, carbon taxes, nuclear phase-outs, and population growth',
    ],
    correctIndex: 1,
    explanation:
      'Renewable energy growth is driven by five interconnected forces: environmental necessity (climate commitments and air quality concerns), economic factors (falling costs and energy security), government policy (subsidies, mandates, and carbon pricing), technological progress (efficiency improvements and grid integration), and social drivers (public support, corporate sustainability commitments, and investor pressure).',
    wrongExplanation:
      'The five key drivers are environmental necessity, economic competitiveness, government policy, technological progress, and social pressure. These forces reinforce each other: falling costs attract private investment, which drives further technology learning, which in turn makes policy support easier to justify politically.',
    reviewSectionId: 'sm15-sec-3-drivers',
    reviewSectionTitle: 'Drivers of Renewable Energy Growth',
  },
  {
    id: 'sm15-q7',
    question: 'What is the average time currently required to permit a new wind farm in the European Union, and why is this considered a problem?',
    options: [
      '1–2 years — fast enough but considered too costly',
      '3–5 years — acceptable for large projects but slower than solar permitting',
      '8–10 years — considered far too long given the urgency of the energy transition and climate targets',
      '15–20 years — a historical figure that has since improved significantly following EU regulatory reform',
    ],
    correctIndex: 2,
    explanation:
      'Permitting a wind farm in the EU takes an average of 8–10 years across member states, compared to as little as 2–3 years for comparable projects in the US or Australia. This bottleneck is a leading barrier to achieving Europe\'s renewable energy targets, and the EU\'s revised Renewable Energy Directive (RED III) and emergency permitting regulations aim to cut this to a maximum of 2–3 years for projects in designated go-to areas.',
    wrongExplanation:
      'The EU wind permitting process averages 8–10 years — far too long given that climate targets require thousands of wind farms to be built within the next decade. This has been identified by the European Commission as the single largest barrier to renewable energy deployment in Europe, prompting emergency regulatory reforms.',
    reviewSectionId: 'sm15-sec-4-challenges',
    reviewSectionTitle: 'Challenges for the Energy Transition',
  },
  {
    id: 'sm15-q8',
    question: 'What role is green hydrogen expected to play in the future energy system?',
    options: [
      'Green hydrogen will replace electricity as the primary energy carrier for homes and offices',
      'Green hydrogen will decarbonise hard-to-electrify sectors such as heavy industry, shipping, aviation, and long-haul transport',
      'Green hydrogen is primarily useful as a backup fuel for gas-fired power stations during renewable energy droughts',
      'Green hydrogen will be used mainly for cooking and heating in residential buildings across Europe',
    ],
    correctIndex: 1,
    explanation:
      'Green hydrogen — produced by electrolysing water using renewable electricity — is seen as a critical solution for sectors where direct electrification is impractical or too costly: steel and cement production, long-distance shipping, aviation (via e-fuels), and heavy freight. It can also serve as a long-duration energy storage medium, storing surplus renewable electricity as chemical energy.',
    wrongExplanation:
      'Green hydrogen\'s primary value in the energy transition is decarbonising hard-to-electrify sectors — heavy industry, shipping, aviation, and heavy transport — where batteries are not practical. It is not expected to replace grid electricity in homes or offices, where direct electrification through heat pumps and EVs is far more efficient.',
    reviewSectionId: 'sm15-sec-5-projections',
    reviewSectionTitle: 'Projections & Scenarios',
  },
  {
    id: 'sm15-q9',
    question: 'Which of the following is correctly identified as a long-duration energy storage technology?',
    options: [
      'Lithium-ion battery',
      'Supercapacitor',
      'Pumped hydro storage',
      'Lead-acid battery',
    ],
    correctIndex: 2,
    explanation:
      'Pumped hydro is the world\'s dominant long-duration energy storage technology, currently representing over 90% of global grid-scale storage capacity. It stores energy by pumping water uphill to a reservoir and releasing it through turbines when power is needed, with discharge durations of many hours to days. Other long-duration technologies include vanadium flow batteries, compressed air energy storage, liquid air energy storage, and gravity storage systems.',
    wrongExplanation:
      'Pumped hydro is the leading long-duration storage technology — capable of storing energy for hours or even days. Lithium-ion batteries, supercapacitors, and lead-acid batteries are better suited to short-duration applications (minutes to a few hours) and cannot economically store energy over multi-day periods at grid scale.',
    reviewSectionId: 'sm15-sec-4-challenges',
    reviewSectionTitle: 'Challenges for the Energy Transition',
  },
  {
    id: 'sm15-q10',
    question: 'How many clean energy jobs does the IEA estimate could exist globally by 2030 under its Net Zero scenario?',
    options: [
      'Around 10 million',
      'Around 20 million',
      'Around 30 million',
      'Around 50 million',
    ],
    correctIndex: 2,
    explanation:
      'The IEA\'s Net Zero by 2050 roadmap projects that clean energy sectors — including renewables, energy efficiency, electric vehicles, and clean fuels — could support around 30 million jobs globally by 2030. This represents a substantial net increase even accounting for job losses in fossil fuel industries, with solar, wind, and energy efficiency providing the largest employment opportunities.',
    wrongExplanation:
      'The IEA estimates approximately 30 million clean energy jobs by 2030 in its Net Zero scenario. This figure spans renewables manufacturing and installation, energy efficiency retrofits, EV supply chains, and clean fuels, and represents a net gain even after accounting for displacement of fossil fuel employment.',
    reviewSectionId: 'sm15-sec-5-projections',
    reviewSectionTitle: 'Projections & Scenarios',
  },
]
