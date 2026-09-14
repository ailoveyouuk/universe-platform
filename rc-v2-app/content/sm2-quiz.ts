// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 2 — Confirmation of Learning Questions
// Topic: The Global Race to Net Zero  |  slug: 'global-race-to-net-zero'
//
// Each question links to the most relevant section in SM2 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm2ColQuestions: ColQuestion[] = [
  {
    id: 'sm2-q1',
    question: 'What was the primary climate goal established by the Paris Agreement in December 2015?',
    options: [
      'To eliminate all fossil fuel use by 2030 and reach Net Zero globally by 2040',
      'To limit global warming to well below 2°C above pre-industrial levels, ideally to 1.5°C',
      'To reduce global carbon emissions by 50% relative to 1990 levels by 2025',
      'To establish a legally binding carbon tax across all signatory nations',
    ],
    correctIndex: 1,
    explanation:
      'The Paris Agreement\'s landmark outcome was the goal of limiting global warming to well below 2°C above pre-industrial levels, with efforts to limit it to 1.5°C. These targets were based on extensive scientific studies concluding they would help avoid the worst climate impacts, including more frequent extreme weather events.',
    wrongExplanation:
      'That is not the Paris Agreement\'s central goal. The agreement, signed in December 2015, established the target of limiting global warming to well below 2°C above pre-industrial levels — and ideally to 1.5°C — based on scientific evidence about the thresholds needed to avoid the most severe climate impacts.',
    reviewSectionId: 'sm2-sec-6-paris',
    reviewSectionTitle: 'The Paris Agreement',
  },
  {
    id: 'sm2-q2',
    question: 'In the GHG Protocol\'s corporate emissions reporting framework, which tier covers value chain emissions — all indirect emissions that occur across a company\'s supply chain?',
    options: [
      'Tier 1 — Direct Emissions from sources owned or controlled by the company',
      'Tier 2 — Indirect Emissions from purchased electricity, heat, or steam',
      'Tier 3 — Value Chain Emissions: all other indirect emissions across the company\'s supply chain',
      'Tier 4 — Residual Emissions that cannot be reduced or offset',
    ],
    correctIndex: 2,
    explanation:
      'Tier 3 (Scope 3) covers all other indirect emissions that occur in a company\'s value chain — the broadest and often largest category. Tier 1 covers direct emissions from owned sources, Tier 2 covers emissions from purchased energy. Understanding all three tiers is crucial for corporations building a complete picture of their carbon footprint.',
    wrongExplanation:
      'That is a different tier. In the GHG Protocol, Tier 1 = direct emissions from owned/controlled sources; Tier 2 = indirect emissions from purchased electricity, heat, or steam; and Tier 3 = all other indirect emissions across the value chain (supply chain, business travel, product use, etc.). There is no Tier 4 in this framework.',
    reviewSectionId: 'sm2-sec-3-corporate',
    reviewSectionTitle: 'Corporate Pledges & Net Zero',
  },
  {
    id: 'sm2-q3',
    question: 'The Kyoto Protocol was adopted at which Conference of the Parties (COP), and in which year?',
    options: [
      'COP 1, held in Berlin in 1995',
      'COP 3, held in Kyoto in 1997',
      'COP 15, held in Copenhagen in 2009',
      'COP 21, held in Paris in 2015',
    ],
    correctIndex: 1,
    explanation:
      'The Kyoto Protocol was adopted at COP 3 — the third annual Conference of the Parties under the UNFCCC — held in the Japanese city of Kyoto in December 1997. It introduced legally binding emissions reduction targets for developed nations and market mechanisms such as the Clean Development Mechanism (CDM).',
    wrongExplanation:
      'That is not correct. The Kyoto Protocol was adopted at COP 3, held in Kyoto, Japan, in December 1997. COP 1 took place in Berlin in 1995; Copenhagen hosted COP 15 in 2009; and the Paris Agreement was adopted at COP 21 in 2015.',
    reviewSectionId: 'sm2-sec-5-kyoto',
    reviewSectionTitle: 'The Kyoto Protocol',
  },
  {
    id: 'sm2-q4',
    question: 'The IPCC (Intergovernmental Panel on Climate Change) was established in 1988 by which two organisations?',
    options: [
      'The World Bank and the International Energy Agency (IEA)',
      'The European Union and the United Nations Development Programme',
      'The United Nations and the World Meteorological Organisation',
      'NASA and the Global Environment Facility (GEF)',
    ],
    correctIndex: 2,
    explanation:
      'The IPCC was founded in 1988 by the United Nations and the World Meteorological Organisation to assess the scientific basis of climate change and its wider implications. Its reports — produced by three Working Groups covering physical science, impacts and adaptation, and mitigation — are the most authoritative scientific publications on climate change.',
    wrongExplanation:
      'Those are not the founding organisations. The IPCC was established in 1988 jointly by the United Nations and the World Meteorological Organisation. Its purpose was to provide rigorous, peer-reviewed scientific assessments of climate change to inform policymakers globally.',
    reviewSectionId: 'sm2-sec-7-ipcc',
    reviewSectionTitle: 'The IPCC',
  },
  {
    id: 'sm2-q5',
    question: 'What commitment did more than 100 countries make under the Global Methane Pledge at COP26 in 2021?',
    options: [
      'To eliminate methane emissions entirely from agricultural sources by 2030',
      'To cut methane emissions by at least 30% by 2030 relative to 2020 levels',
      'To reach methane neutrality by 2035 through a combination of capture and offsets',
      'To introduce mandatory methane pricing across all signatory nations by 2025',
    ],
    correctIndex: 1,
    explanation:
      'At COP26 in 2021, more than 100 countries signed the Global Methane Pledge — a commitment to reduce methane emissions by at least 30% by 2030 compared to 2020 levels. Methane is a potent greenhouse gas with a much higher short-term warming potential than CO₂, so cutting it rapidly has significant near-term climate benefits.',
    wrongExplanation:
      'That is not what the Global Methane Pledge committed to. Over 100 countries pledged to cut methane emissions by at least 30% by 2030 versus 2020 levels. Methane\'s high short-term warming potential means this reduction would have a meaningful near-term impact on the pace of global warming.',
    reviewSectionId: 'sm2-sec-4-timeline',
    reviewSectionTitle: 'International Climate Timeline',
  },
  {
    id: 'sm2-q6',
    question: 'What percentage of global greenhouse gas emissions does the transport sector currently account for?',
    options: [
      'Around 7% of global GHG emissions',
      'Around 14% of global GHG emissions',
      'Around 24% of global GHG emissions',
      'Around 40% of global GHG emissions',
    ],
    correctIndex: 2,
    explanation:
      'Transport currently accounts for around 24% of global greenhouse gas emissions — making it one of the most significant sectors to decarbonise. Electrification of transport, through battery electric vehicles (BEVs), fuel cell electric vehicles (FCEVs), and plug-in hybrid electric vehicles (PHEVs), is a key pathway to reducing these emissions, particularly as electricity grids become cleaner.',
    wrongExplanation:
      'That figure is incorrect. Transport accounts for around 24% of global GHG emissions — a substantial share that makes it one of the priority sectors for decarbonisation. Shifting to electric vehicles, powered by increasingly clean electricity grids, is one of the most impactful levers available.',
    reviewSectionId: 'sm2-sec-9-evs',
    reviewSectionTitle: 'Electric Vehicles & Transport Electrification',
  },
  {
    id: 'sm2-q7',
    question: 'What are Nationally Determined Contributions (NDCs) under the Paris Agreement?',
    options: [
      'Mandatory financial contributions developing nations must pay to a global climate fund',
      'Legally binding fines imposed on countries that fail to meet their emissions reduction targets',
      'Each signatory country\'s own national climate plan setting out how it will reduce emissions and adapt to climate change',
      'Scientific reports submitted by countries to the IPCC detailing their observed climate impacts',
    ],
    correctIndex: 2,
    explanation:
      'NDCs are each signatory country\'s own national climate plan — submitted to the UNFCCC — setting out how they intend to reduce greenhouse gas emissions and adapt to the impacts of climate change. Countries are required to update their NDCs every five years, with the expectation that each successive plan is more ambitious than the last.',
    wrongExplanation:
      'That is not what NDCs are. Under the Paris Agreement, each signatory country must submit a Nationally Determined Contribution — its own national plan for reducing emissions and adapting to climate change. NDCs are country-defined and updated every five years, with each successive plan expected to be more ambitious.',
    reviewSectionId: 'sm2-sec-6-paris',
    reviewSectionTitle: 'The Paris Agreement',
  },
  {
    id: 'sm2-q8',
    question: 'What was the EU\'s "Fit for 55" policy package, adopted in 2023, designed to achieve?',
    options: [
      'To enrol 55 million European citizens into clean energy skills training programmes',
      'To cut European emissions by 55% by 2030 relative to 1990 levels',
      'To ensure 55% of European electricity is generated from renewables by 2025',
      'To replace 55% of fossil fuel vehicles on European roads with EVs by 2030',
    ],
    correctIndex: 1,
    explanation:
      '"Fit for 55" is a major EU policy package adopted in 2023 that pledges to cut European greenhouse gas emissions by 55% by 2030, relative to 1990 levels — one of the most ambitious near-term emissions reduction targets of any major economy. It sits within the broader framework of the European Green Deal, which commits Europe to becoming the world\'s first climate-neutral continent.',
    wrongExplanation:
      'That is not what "Fit for 55" targets. The EU\'s "Fit for 55" policy package commits Europe to cutting greenhouse gas emissions by 55% by 2030 compared to 1990 levels. It is one of the most ambitious near-term climate targets set by any major economy, operating under the broader European Green Deal framework.',
    reviewSectionId: 'sm2-sec-18-overview',
    reviewSectionTitle: 'Global Net Zero — Regional Overview',
  },
  {
    id: 'sm2-q9',
    question: 'Which type of electric vehicle uses hydrogen fuel cells to generate electricity on board and emits only water vapour?',
    options: [
      'Battery Electric Vehicle (BEV) — powered entirely by on-board rechargeable batteries',
      'Plug-in Hybrid Electric Vehicle (PHEV) — combines an internal combustion engine with a battery',
      'Fuel Cell Electric Vehicle (FCEV) — powered by a hydrogen fuel cell generating electricity on board',
      'Mild Hybrid Electric Vehicle (MHEV) — uses a small motor to assist the combustion engine',
    ],
    correctIndex: 2,
    explanation:
      'Fuel Cell Electric Vehicles (FCEVs) are powered by hydrogen fuel cells that generate electricity on board — with water vapour as the only emission. They are best suited to heavy transport applications such as trucks, buses, and potentially aircraft, where long range and rapid refuelling are priorities. BEVs are fully battery-powered; PHEVs combine an engine with a battery.',
    wrongExplanation:
      'That is a different type of electric vehicle. Fuel Cell Electric Vehicles (FCEVs) use hydrogen fuel cells to generate electricity on board, emitting only water vapour. Battery Electric Vehicles (BEVs) are purely battery-powered from the grid; Plug-in Hybrids (PHEVs) combine a combustion engine with a rechargeable battery.',
    reviewSectionId: 'sm2-sec-9-evs',
    reviewSectionTitle: 'Electric Vehicles & Transport Electrification',
  },
  {
    id: 'sm2-q10',
    question: 'Which IPCC Working Group focuses specifically on identifying strategies and policies to reduce or prevent greenhouse gas emissions?',
    options: [
      'Working Group 1 (WG1) — Physical Science of Climate Change',
      'Working Group 2 (WG2) — Impacts, Adaptation and Vulnerability',
      'Working Group 3 (WG3) — Mitigation Options',
      'Working Group 4 (WG4) — Technology and Innovation',
    ],
    correctIndex: 2,
    explanation:
      'IPCC Working Group 3 (WG3) focuses on mitigation — identifying strategies and policies to reduce or prevent greenhouse gas emissions. WG1 assesses the physical science of climate change; WG2 examines impacts, adaptation, and vulnerability. There is no WG4 — the IPCC has three Working Groups.',
    wrongExplanation:
      'That is a different IPCC Working Group. WG1 covers the physical science of climate change; WG2 covers impacts, adaptation, and vulnerability. Working Group 3 (WG3) is the one dedicated to mitigation — assessing strategies and policies for reducing or preventing greenhouse gas emissions. There is no WG4.',
    reviewSectionId: 'sm2-sec-7-ipcc',
    reviewSectionTitle: 'The IPCC',
  },
]
