// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 6 — Confirmation of Learning Questions
// Topic: Onshore Wind  |  slug: 'onshore-wind'
//
// Each question links to the most relevant section in SM6 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm6ColQuestions: ColQuestion[] = [
  {
    id: 'sm6-q1',
    question: 'Which of the following correctly describes the three-stage energy conversion process in a wind turbine?',
    options: [
      'Solar energy → thermal energy → electrical energy',
      'Kinetic energy of wind → mechanical energy → electrical energy',
      'Chemical energy → kinetic energy → electrical energy',
      'Potential energy of wind → mechanical energy → thermal energy',
    ],
    correctIndex: 1,
    explanation:
      'Wind turbines convert the kinetic energy of moving air into mechanical energy as the rotor spins, and then a generator converts that mechanical energy into electrical energy, which is fed into the grid.',
    wrongExplanation:
      'That describes a different process. Wind turbines work in three stages: the kinetic energy of wind turns the rotor blades (mechanical energy), and a generator then converts that rotational mechanical energy into electrical energy.',
    reviewSectionId: 'sm6-sec-1-intro',
    reviewSectionTitle: 'Introduction to Onshore Wind',
  },
  {
    id: 'sm6-q2',
    question: 'What is the primary function of the nacelle in a wind turbine?',
    options: [
      'To anchor the turbine to the ground and provide structural stability',
      'To house the key mechanical and electrical components including the gearbox, generator, and control systems',
      'To capture kinetic energy from the wind and convert it into rotational energy',
      'To step up voltage before transmitting electricity to the grid',
    ],
    correctIndex: 1,
    explanation:
      'The nacelle sits atop the tower and serves as the operational core of the turbine. It houses the gearbox, generator, and control systems — the components responsible for converting rotational mechanical energy into electrical energy.',
    wrongExplanation:
      'That describes a different component. The nacelle is the housing mounted at the top of the tower that contains the key mechanical and electrical components, including the gearbox, generator, and control systems.',
    reviewSectionId: 'sm6-sec-1-intro',
    reviewSectionTitle: 'Introduction to Onshore Wind',
  },
  {
    id: 'sm6-q3',
    question: 'Who built the first wind turbine to generate electricity, and in which year?',
    options: [
      'Poul la Cour, in 1903',
      'James Blyth, in 1887',
      'Charles Brush, in 1850',
      'Enercon engineers, in 1998',
    ],
    correctIndex: 1,
    explanation:
      'James Blyth, a Scottish professor, built the first wind turbine to generate electricity in 1887, using it to power his cottage. This marked a pivotal moment in the history of wind power as an electricity-generating technology.',
    wrongExplanation:
      'That is not correct. The first wind turbine to generate electricity was built by James Blyth, a Scottish professor, in 1887. Poul la Cour made important aerodynamic improvements in 1903, and Enercon introduced the first direct-drive turbine in 1998.',
    reviewSectionId: 'sm6-sec-2-history',
    reviewSectionTitle: 'History of Onshore Wind',
  },
  {
    id: 'sm6-q4',
    question: 'Which of the following best describes the key advantage of Vertical-Axis Wind Turbines (VAWTs) compared to Horizontal-Axis Wind Turbines (HAWTs)?',
    options: [
      'VAWTs have higher energy conversion efficiency and are used for most utility-scale projects',
      'VAWTs can capture wind from any direction without needing to reorient, making them suited to turbulent and urban conditions',
      'VAWTs are mounted on taller towers to access stronger, more consistent winds',
      'VAWTs use a gearbox to maximise rotational speed and electricity output',
    ],
    correctIndex: 1,
    explanation:
      'VAWTs rotate around a vertical axis, allowing them to capture wind from any direction without reorienting. This omnidirectional capability makes them well-suited to turbulent wind conditions and urban environments, though they have lower overall efficiency than HAWTs.',
    wrongExplanation:
      'That describes HAWTs rather than VAWTs. The key advantage of VAWTs is their omnidirectional nature — they do not need to face into the wind — making them suitable for turbulent or urban settings. HAWTs are the dominant technology for utility-scale projects due to higher efficiency.',
    reviewSectionId: 'sm6-sec-3-types',
    reviewSectionTitle: 'Types of Wind Turbines',
  },
  {
    id: 'sm6-q5',
    question: 'What is the standard turbine spacing recommended in the prevailing wind direction to minimise wake effects between turbines?',
    options: [
      '1–2 rotor diameters in the prevailing wind direction and 7–10 laterally',
      '3–5 rotor diameters in the prevailing wind direction and 7–10 laterally',
      '7–10 rotor diameters in the prevailing wind direction and 3–5 laterally',
      '15–20 rotor diameters in the prevailing wind direction and 10–12 laterally',
    ],
    correctIndex: 2,
    explanation:
      'To minimise wake effects — where turbulence from one turbine reduces the wind energy available to downstream turbines — standard spacing is 7–10 rotor diameters in the prevailing wind direction and 3–5 rotor diameters laterally. Computational Fluid Dynamics (CFD) modelling is also used to optimise placement.',
    wrongExplanation:
      'That spacing is incorrect. The standard recommendation is 7–10 rotor diameters in the prevailing wind direction (to allow the wake to recover) and 3–5 rotor diameters laterally. This balance maximises energy yield while making efficient use of land.',
    reviewSectionId: 'sm6-sec-4-location',
    reviewSectionTitle: 'Location, Layout & Grid Integration',
  },
  {
    id: 'sm6-q6',
    question: 'Which of the following is the largest single contributor to the Capital Expenditure (CapEx) of an onshore wind project?',
    options: [
      'Grid connection infrastructure, accounting for 65–85% of CapEx',
      'Turbine procurement — blades, towers, and associated equipment — accounting for 65–85% of CapEx',
      'Site preparation and foundation works, accounting for 65–85% of CapEx',
      'Land acquisition costs, accounting for 65–85% of CapEx',
    ],
    correctIndex: 1,
    explanation:
      'Turbine procurement — including the turbine units themselves, rotor blades, towers, and associated equipment — is by far the largest component of CapEx, typically representing 65–85% of total capital costs. This is why turbine price trends have such a major influence on the economics of wind energy.',
    wrongExplanation:
      'That is not the largest contributor. Turbine procurement (blades, nacelles, towers, and equipment) accounts for 65–85% of CapEx in a typical onshore wind project. Grid connection, site preparation, and land costs are important but significantly smaller in proportion.',
    reviewSectionId: 'sm6-sec-5-financial',
    reviewSectionTitle: 'Financial Aspects',
  },
  {
    id: 'sm6-q7',
    question: 'What was the global average Levelised Cost of Energy (LCOE) for onshore wind in 2021, and what is it projected to fall to by 2030?',
    options: [
      '£50/MWh in 2021, projected to fall to £40–45/MWh by 2030',
      '£26/MWh in 2021, projected to fall to £20–25/MWh by 2030',
      '£100/MWh in 2021, projected to fall to £60–70/MWh by 2030',
      '£15/MWh in 2021, projected to fall to £10–12/MWh by 2030',
    ],
    correctIndex: 1,
    explanation:
      'The global average LCOE for onshore wind reached £26/MWh in 2021, reflecting years of cost reductions driven by larger turbines, manufacturing efficiencies, and competitive procurement. Continuous innovation is projected to drive costs down further to £20–25/MWh by 2030, cementing onshore wind as one of the cheapest electricity sources available.',
    wrongExplanation:
      'Those figures are not correct. The global average onshore wind LCOE reached £26/MWh in 2021 — already competitive with or below many fossil fuel sources — and is projected to fall further to £20–25/MWh by 2030 as technology and scale continue to improve.',
    reviewSectionId: 'sm6-sec-5-financial',
    reviewSectionTitle: 'Financial Aspects',
  },
  {
    id: 'sm6-q8',
    question: 'Which policy mechanism offers fixed payments to wind energy producers from government, providing stable revenue over a set period?',
    options: [
      'Nationally Determined Contributions (NDCs)',
      'Renewable Portfolio Standards',
      'Feed-in Tariffs (FiTs)',
      'Production Tax Credits',
    ],
    correctIndex: 2,
    explanation:
      'Feed-in Tariffs (FiTs) guarantee a fixed price per unit of electricity generated by renewable energy producers over a set contract period. This price certainty reduces financial risk for developers and investors, making it easier to secure project financing — particularly important in the early stages of market development.',
    wrongExplanation:
      'That is a different policy tool. NDCs are climate commitments under the Paris Agreement; Renewable Portfolio Standards require utilities to source a percentage of power from renewables; Production Tax Credits are US federal tax incentives. Feed-in Tariffs (FiTs) are the mechanism that provides fixed payments directly to renewable energy producers.',
    reviewSectionId: 'sm6-sec-6-policy',
    reviewSectionTitle: 'Policy & Regulatory Frameworks',
  },
  {
    id: 'sm6-q9',
    question: 'Which of the following best describes the social and environmental trade-offs of onshore wind development?',
    options: [
      'Onshore wind has no environmental impacts and is universally welcomed by communities',
      'Onshore wind can cause habitat disruption and bird/bat mortality, and may face opposition from communities over visual impact and noise, but overall delivers significant net positive benefits',
      'The environmental damage from onshore wind outweighs its climate benefits, making it unsuitable for net-zero strategies',
      'Onshore wind only creates social challenges; it has no measurable environmental impact',
    ],
    correctIndex: 1,
    explanation:
      'Onshore wind does carry real social and environmental challenges — including habitat disruption during construction, bird and bat mortality near turbine blades, and community concerns about visual impact and noise. However, the overall assessment is net positive: it produces zero operational emissions, reduces fossil fuel dependence, and can generate economic benefits for rural communities through jobs and community benefit funds.',
    wrongExplanation:
      'That does not accurately reflect the balance. Onshore wind does have genuine impacts — including habitat disruption, bird and bat mortality, visual concerns, and noise — but these are manageable and far outweighed by its climate and economic benefits. It remains a critical tool for net-zero strategies globally.',
    reviewSectionId: 'sm6-sec-7-social-env',
    reviewSectionTitle: 'Social & Environmental Landscape',
  },
  {
    id: 'sm6-q10',
    question: 'According to the Global Wind Energy Council (GWEC), what share of global electricity demand is onshore wind expected to supply by 2030?',
    options: [
      'Up to 5% of global electricity demand',
      'Up to 15% of global electricity demand',
      'Up to 30% of global electricity demand',
      'Up to 50% of global electricity demand',
    ],
    correctIndex: 2,
    explanation:
      'The GWEC forecasts that onshore wind will supply up to 30% of global electricity demand by 2030, driven by rapidly growing installations in Asia, Africa, and Latin America, alongside repowering of older wind farms in Europe, North America, and Australia with more capable modern turbines.',
    wrongExplanation:
      'That figure is not the GWEC forecast. According to the Global Wind Energy Council, onshore wind is expected to supply up to 30% of global electricity demand by 2030 — a dramatic increase made possible by falling costs, expanding grid infrastructure, and strong policy commitments to net-zero targets.',
    reviewSectionId: 'sm6-sec-8-future',
    reviewSectionTitle: 'The Future of Onshore Wind',
  },
]
