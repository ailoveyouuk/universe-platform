// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 12 — Confirmation of Learning Questions
// Topic: Carbon Capture & Storage (slug: 'carbon-capture')
//
// Each question links to the most relevant section in SM12 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm12ColQuestions: ColQuestion[] = [
  {
    id: 'sm12-q1',
    question: 'What does the acronym CCUS stand for?',
    options: [
      'Carbon Capture, Utilisation and Storage',
      'Carbon Control, Usage and Sustainability',
      'Climate Change Underpinning Strategy',
      'Carbon Capture, Use and Sequestration',
      'Carbon Conversion, Utilisation and Safety',
    ],
    correctIndex: 0,
    explanation:
      'CCUS stands for Carbon Capture, Utilisation and Storage — a suite of technologies that capture CO2 from industrial sources or the atmosphere, then either store it permanently underground or utilise it as a feedstock for products and fuels.',
    wrongExplanation:
      'CCUS stands for Carbon Capture, Utilisation and Storage. The "U" refers specifically to utilisation — using captured CO2 as a raw material — rather than simply disposing of it.',
    reviewSectionId: 'sm12-sec-1-intro',
    reviewSectionTitle: 'Introduction to Carbon Capture',
  },
  {
    id: 'sm12-q2',
    question: 'In post-combustion carbon capture, which chemical process is most commonly used to separate CO2 from flue gas?',
    options: [
      'Cryogenic distillation',
      'Amine absorption',
      'Pressure swing adsorption',
      'Membrane separation',
    ],
    correctIndex: 1,
    explanation:
      'Amine absorption is the dominant post-combustion capture process. Flue gas is passed through a liquid amine solvent that selectively binds CO2; the rich solvent is then heated to release a concentrated CO2 stream, and the solvent is recycled.',
    wrongExplanation:
      'The most common post-combustion capture method is amine absorption, not that option. Liquid amines chemically bind CO2 from flue gas and release it when heated, allowing the solvent to be reused continuously.',
    reviewSectionId: 'sm12-sec-2-how',
    reviewSectionTitle: 'How Carbon Capture Works',
  },
  {
    id: 'sm12-q3',
    question: 'Which of the following best describes the oxyfuel combustion capture method?',
    options: [
      'CO2 is captured from flue gas after normal combustion using solvents',
      'Fuel is converted to hydrogen and CO2 before combustion',
      'Fuel is burned in pure oxygen, producing a flue gas of mostly CO2 and water',
      'CO2 is extracted directly from ambient air using chemical sorbents',
    ],
    correctIndex: 2,
    explanation:
      'In oxyfuel combustion, fuel is burned in nearly pure oxygen rather than air. This produces a flue gas that is predominantly CO2 and water vapour, making CO2 separation much simpler and less energy-intensive than post-combustion methods.',
    wrongExplanation:
      'Oxyfuel combustion involves burning fuel in pure oxygen, yielding a flue gas of mostly CO2 and water vapour. This makes separation straightforward without the need for large chemical scrubbing systems.',
    reviewSectionId: 'sm12-sec-2-how',
    reviewSectionTitle: 'How Carbon Capture Works',
  },
  {
    id: 'sm12-q4',
    question: 'How does Direct Air Capture (DAC) differ from conventional point-source carbon capture?',
    options: [
      'DAC captures CO2 only from power stations, not industrial plants',
      'DAC removes CO2 directly from ambient air rather than from a concentrated emission source',
      'DAC uses biological processes such as algae, whereas point-source capture uses chemicals',
      'DAC stores CO2 in ocean sediments rather than geological formations',
    ],
    correctIndex: 1,
    explanation:
      'Unlike point-source capture, which intercepts CO2 at the flue stack of a factory or power plant, DAC fans or draws ambient air across chemical sorbents or liquid solutions, allowing CO2 to be removed from anywhere in the atmosphere regardless of where it was originally emitted.',
    wrongExplanation:
      'DAC is distinct because it captures CO2 directly from ambient air — not from a specific emission stack. This means it can theoretically remove historical emissions, but the low concentration of CO2 in air (~420 ppm) makes the process very energy-intensive.',
    reviewSectionId: 'sm12-sec-2-how',
    reviewSectionTitle: 'How Carbon Capture Works',
  },
  {
    id: 'sm12-q5',
    question: 'Which of these is a recognised long-term geological trapping mechanism for stored CO2?',
    options: [
      'Thermal venting through volcanic rock',
      'Dissolution into surface rivers and lakes',
      'Mineralisation — CO2 reacting with host rock to form stable carbonate minerals',
      'Absorption by deep-sea kelp forests',
    ],
    correctIndex: 2,
    explanation:
      'Mineralisation (or mineral trapping) is one of the most permanent storage mechanisms: injected CO2 reacts with minerals in the host rock over decades to centuries, forming solid carbonate minerals that effectively lock the carbon away permanently.',
    wrongExplanation:
      'Mineralisation is the correct answer. Over time, injected CO2 reacts chemically with the surrounding rock to form solid carbonate minerals — one of the most secure and permanent forms of geological carbon storage.',
    reviewSectionId: 'sm12-sec-2-how',
    reviewSectionTitle: 'How Carbon Capture Works',
  },
  {
    id: 'sm12-q6',
    question: 'Which project holds the distinction of being the world\'s first commercial-scale CCS operation, running continuously since 1996?',
    options: [
      'Boundary Dam, Saskatchewan, Canada',
      'Quest CCS Project, Alberta, Canada',
      'Sleipner CO2 Storage Project, Norway',
      'Gorgon LNG Project, Western Australia',
    ],
    correctIndex: 2,
    explanation:
      'The Sleipner project, operated by Equinor in the Norwegian North Sea, has been injecting approximately one million tonnes of CO2 per year into a saline aquifer beneath the seabed since 1996, making it the world\'s first and longest-running commercial CCS facility.',
    wrongExplanation:
      'The Sleipner project in Norway is correct. Since 1996 it has stored around one million tonnes of CO2 annually in a deep saline aquifer — the first commercial-scale CCS project in the world, predating all others.',
    reviewSectionId: 'sm12-sec-3-economics',
    reviewSectionTitle: 'Economics of Carbon Capture',
  },
  {
    id: 'sm12-q7',
    question: 'What is the approximate cost range for capturing one tonne of CO2 using current CCS technologies?',
    options: [
      '$5 – $15 per tonne',
      '$25 – $300+ per tonne',
      '$500 – $1,000 per tonne',
      '$1,500 – $3,000 per tonne',
    ],
    correctIndex: 1,
    explanation:
      'CCS costs vary widely depending on the capture technology and source concentration. Point-source capture from high-purity industrial streams can cost as little as $25–$50 per tonne, while Direct Air Capture currently costs $300–$1,000+ per tonne, with an overall industry range broadly quoted as $25 to $300+.',
    wrongExplanation:
      'The correct range is approximately $25 to $300+ per tonne. Costs vary enormously: capturing from concentrated industrial sources is cheaper, while Direct Air Capture remains significantly more expensive due to the very low concentration of CO2 in air.',
    reviewSectionId: 'sm12-sec-3-economics',
    reviewSectionTitle: 'Economics of Carbon Capture',
  },
  {
    id: 'sm12-q8',
    question: 'What is the US 45Q tax credit designed to incentivise?',
    options: [
      'The development of offshore wind farms in federal waters',
      'The production of green hydrogen from renewable electricity',
      'The capture and geological storage or utilisation of CO2',
      'The purchase of electric vehicles by businesses',
    ],
    correctIndex: 2,
    explanation:
      'Section 45Q of the US Internal Revenue Code provides a tax credit per tonne of CO2 that is captured and either permanently stored geologically or used in qualifying applications such as enhanced oil recovery. It is the primary federal policy mechanism driving CCS investment in the United States.',
    wrongExplanation:
      'The 45Q tax credit is specifically aimed at carbon capture. It provides a per-tonne credit to facilities that capture CO2 and store it geologically or use it in approved industrial applications, making CCS projects more economically viable.',
    reviewSectionId: 'sm12-sec-4-policy',
    reviewSectionTitle: 'Policy & Regulation',
  },
  {
    id: 'sm12-q9',
    question: 'What does BECCS stand for, and why is it considered capable of producing "negative emissions"?',
    options: [
      'Bio-Energy Carbon Capture and Storage — plants absorb CO2 as they grow, and that CO2 is then captured and stored rather than released when the biomass is burned',
      'Battery Energy Carbon Capture System — excess renewable electricity is used to electrochemically remove CO2 from the air',
      'Biomass Electricity and Carbon Cycle Storage — waste biomass is stored underground to prevent its decomposition',
      'Bio-Enhanced Carbon Capture and Sequestration — genetically modified algae absorb CO2 from industrial flue gases',
    ],
    correctIndex: 0,
    explanation:
      'BECCS (Bioenergy with Carbon Capture and Storage) combines biomass energy generation with CCS. Because the biomass absorbs CO2 from the atmosphere as it grows, and that CO2 is then captured and permanently stored rather than re-emitted, the overall process results in a net removal of CO2 from the atmosphere — so-called negative emissions.',
    wrongExplanation:
      'BECCS stands for Bioenergy with Carbon Capture and Storage. The "negative emissions" come from the fact that growing biomass draws CO2 from the air, and burning it with CCS then locks that CO2 away underground — resulting in a net removal of atmospheric carbon.',
    reviewSectionId: 'sm12-sec-2-how',
    reviewSectionTitle: 'How Carbon Capture Works',
  },
  {
    id: 'sm12-q10',
    question: 'According to the IPCC, what role must CCS play in limiting global warming to 1.5°C?',
    options: [
      'CCS is optional and can be replaced entirely by faster renewable energy deployment',
      'CCS is needed only in developing countries that cannot afford to switch to renewables',
      'Almost all IPCC 1.5°C pathways require significant deployment of CCS to remove residual and historical emissions',
      'The IPCC recommends against CCS because geological storage is considered unsafe',
    ],
    correctIndex: 2,
    explanation:
      'The IPCC\'s Sixth Assessment Report concludes that virtually all modelled pathways that limit warming to 1.5°C rely on CCS — particularly BECCS and DAC — to offset hard-to-abate emissions from sectors like cement, steel, and aviation, and to achieve net-negative emissions in the second half of the century.',
    wrongExplanation:
      'The IPCC is clear that CCS is not optional in 1.5°C scenarios. Nearly every pathway that achieves this target requires substantial carbon removal through CCS technologies to counterbalance emissions from sectors where complete decarbonisation is technically or economically impractical.',
    reviewSectionId: 'sm12-sec-4-policy',
    reviewSectionTitle: 'Policy & Regulation',
  },
]
