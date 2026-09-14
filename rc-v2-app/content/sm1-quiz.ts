// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 1 — Confirmation of Learning Questions
// Source: "Confirmation of learning questions SM 1-15 Quality Assured.docx"
//
// Each question links to the most relevant section in SM1 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColQuestion {
  id:                  string
  question:            string
  options:             string[]
  correctIndex:        number   // 0-based
  explanation:         string   // shown after answering (correct or wrong)
  wrongExplanation?:   string   // optional different phrasing for wrong answer
  reviewSectionId:     string   // _id of the section to deep-link back to
  reviewSectionTitle:  string   // human-readable section name for the link label
}

export const sm1ColQuestions: ColQuestion[] = [
  {
    id: 'sm1-q1',
    question: 'Which of these is NOT a primary greenhouse gas?',
    options: [
      'Carbon dioxide (CO2)',
      'Methane (CH4)',
      'Oxygen (O2)',
      'Nitrous oxide (N2O)',
      'Fluorinated gases',
      'Water vapour',
    ],
    correctIndex: 2,
    explanation:
      'Oxygen (O2) is not a greenhouse gas. Unlike CO2 and methane, it does not absorb and re-emit infrared radiation from Earth\'s surface — which is what makes a gas a greenhouse gas.',
    wrongExplanation:
      'That is actually a primary greenhouse gas. Oxygen (O2) is the odd one out — it does not absorb and re-emit infrared radiation, so it has no warming effect on the atmosphere.',
    reviewSectionId: 'sec-1-intro',
    reviewSectionTitle: 'Introduction to Global Warming',
  },
  {
    id: 'sm1-q2',
    question: 'What percentage of global greenhouse gas emissions are produced from burning waste?',
    options: ['1–2%', '2–3%', '3–4%', '4–5%'],
    correctIndex: 1,
    explanation:
      'Around 2–3% of global GHG emissions originate from waste combustion, including the open burning of municipal solid waste and other waste management practices.',
    wrongExplanation:
      'The correct figure is 2–3%. Waste combustion, including landfill burning, contributes a smaller but still significant share of global greenhouse gas emissions.',
    reviewSectionId: 'sec-2-sources',
    reviewSectionTitle: 'Sources of Greenhouse Gas Emissions',
  },
  {
    id: 'sm1-q3',
    question: 'Which of these is NOT a suitable storage site for captured carbon?',
    options: [
      'Deep saline aquifers',
      'Depleted oil and gas reservoirs',
      'Absorbed by seawater',
      'Old mines',
    ],
    correctIndex: 2,
    explanation:
      'Seawater absorption is not a controlled CCS storage method. While oceans naturally absorb CO2, relying on this process causes ocean acidification and cannot be safely managed as a deliberate long-term storage solution.',
    wrongExplanation:
      'That is actually a viable CCS storage site. Seawater absorption is the exception — while it happens naturally, it cannot be controlled and leads to harmful ocean acidification.',
    reviewSectionId: 'sec-8-technical',
    reviewSectionTitle: 'Technical Innovation',
  },
  {
    id: 'sm1-q4',
    question: 'Which of these behaviours will reduce greenhouse gas production?',
    options: [
      'Driving to work alone',
      'Complaining on social media',
      'Taking a holiday close to where you live',
      'Cutting the grass more often',
      'Buying a bigger television',
    ],
    correctIndex: 2,
    explanation:
      'Holidaying close to home dramatically cuts travel-related emissions, particularly by avoiding long-haul flights, which are among the most carbon-intensive activities an individual can undertake.',
    wrongExplanation:
      'That behaviour does not significantly reduce greenhouse gas emissions. Holidaying locally is the most impactful option here — it avoids the high carbon cost of long-haul air travel.',
    reviewSectionId: 'sec-9-behavioural',
    reviewSectionTitle: 'Behavioural Change',
  },
  {
    id: 'sm1-q5',
    question: 'What does CHP stand for?',
    options: [
      'Central Heating Performance',
      'Carbon Help Programme',
      'Combined Heat and Power',
      'Chlorofluoro Hydrogen Peroxide',
      'Consumption of Hydro Power',
    ],
    correctIndex: 2,
    explanation:
      'CHP (Combined Heat and Power) systems generate electricity and simultaneously capture waste heat for use in heating, achieving efficiencies of up to 80–90% compared to around 35% for conventional power generation.',
    wrongExplanation:
      'CHP stands for Combined Heat and Power — a highly efficient energy system that generates electricity and captures the waste heat simultaneously for use in buildings or industrial processes.',
    reviewSectionId: 'sec-8-technical',
    reviewSectionTitle: 'Technical Innovation',
  },
  {
    id: 'sm1-q6',
    question: 'Which percentage represents greenhouse gas emissions produced by changes in land use?',
    options: ['11%', '16%', '23%', '35%'],
    correctIndex: 2,
    explanation:
      'Land use change — primarily deforestation for agriculture and urban expansion — accounts for approximately 23% of global GHG emissions, making it the second largest source after energy.',
    wrongExplanation:
      'The correct figure is approximately 23%. Land use change, driven mainly by deforestation for agriculture, is a major and often underestimated source of global greenhouse gas emissions.',
    reviewSectionId: 'sec-2-sources',
    reviewSectionTitle: 'Sources of Greenhouse Gas Emissions',
  },
  {
    id: 'sm1-q7',
    question:
      'What is the CO2 equivalent (CO2e) Global Warming Potential of hydrofluorocarbons (HFCs) used in refrigeration?',
    options: ['1', '21', '140 – 11,700', '23,900'],
    correctIndex: 2,
    explanation:
      'HFCs have a GWP of 140 to 11,700 times that of CO2, meaning even small refrigerant leaks from cooling systems can have a severe and disproportionate impact on the climate.',
    wrongExplanation:
      'HFCs have a GWP range of 140 to 11,700 times that of CO2 — far higher than most people realise. This is why refrigerant management is a critical part of industrial climate strategies.',
    reviewSectionId: 'sec-1-intro',
    reviewSectionTitle: 'Introduction to Global Warming',
  },
  {
    id: 'sm1-q8',
    question:
      'Which of these future energy technologies is NOT a recognised sustainable innovation?',
    options: [
      'Small Modular Nuclear Reactors (SMRs)',
      'Use of hydrogen as an energy vector',
      'Collecting methane from agricultural animals',
      'Use of ammonia as an energy vector',
    ],
    correctIndex: 2,
    explanation:
      'Collecting and burning agricultural methane still releases CO2 and does not represent a sustainable innovation. In contrast, SMRs, hydrogen, and ammonia are genuinely zero-carbon energy vectors being developed at scale.',
    wrongExplanation:
      'That is actually a recognised sustainable innovation. Collecting methane from agricultural animals and combusting it simply converts one GHG to another — it is not classified as a truly sustainable innovation.',
    reviewSectionId: 'sec-8-technical',
    reviewSectionTitle: 'Technical Innovation',
  },
  {
    id: 'sm1-q9',
    question: 'Which of these methods is effective in monitoring GHG levels?',
    options: [
      'Speed traps on roads',
      'Monitoring the energy supply in the power network',
      'Satellite observations',
      'Water table monitoring',
    ],
    correctIndex: 2,
    explanation:
      'Satellite observations allow scientists to track atmospheric GHG concentrations at global scale with high precision, making them one of the most effective and widely used tools for monitoring greenhouse gases.',
    wrongExplanation:
      'That method is not designed for GHG monitoring. Satellite observations are the correct answer — they provide global-scale, high-precision tracking of atmospheric greenhouse gas concentrations.',
    reviewSectionId: 'sec-4-measuring',
    reviewSectionTitle: 'Measuring & Monitoring GHG Emissions',
  },
  {
    id: 'sm1-q10',
    question:
      'Which benefit of wetland restoration is NOT important to climate change adaptation?',
    options: [
      'Increased ability to store carbon',
      'Buffer against sea-level rises and storm surges',
      'Provides a nice location for people to walk their dogs',
      'Enhanced biodiversity',
    ],
    correctIndex: 2,
    explanation:
      'While wetlands are enjoyed for recreation, providing a pleasant walking environment is not a climate change adaptation benefit. The critical functions are carbon sequestration, coastal flood protection, and supporting biodiversity.',
    wrongExplanation:
      'That is actually a meaningful climate adaptation benefit of wetlands. Providing a walking area for dogs is the answer — it has recreational value but no direct relevance to climate change adaptation.',
    reviewSectionId: 'sec-6-adaptation',
    reviewSectionTitle: 'Adaptation Strategies',
  },
]
