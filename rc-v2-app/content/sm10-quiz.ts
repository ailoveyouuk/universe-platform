// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 10 — Confirmation of Learning Questions
// Topic: Hydropower & Geothermal  |  slug: 'hydropower'
//
// Each question links to the most relevant section in SM10 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm10ColQuestions: ColQuestion[] = [
  {
    id: 'sm10-q1',
    question: 'What is the correct sequence of energy conversions in a conventional hydropower plant?',
    options: [
      'Chemical energy → thermal energy → electrical energy',
      'Kinetic energy → potential energy → electrical energy',
      'Potential energy of stored water → kinetic energy as water flows → electrical energy via a generator',
      'Solar energy → heat → steam → electrical energy',
    ],
    correctIndex: 2,
    explanation:
      'In a conventional hydropower plant, water held at height has gravitational potential energy. When released, it flows downward through penstocks, converting to kinetic energy. This kinetic energy spins a turbine connected to a generator, which converts the mechanical energy to electrical energy.',
    wrongExplanation:
      'The correct sequence is potential energy → kinetic energy → electrical energy. Water stored at height has gravitational potential energy; as it falls through penstocks it gains kinetic energy that spins a turbine, which drives a generator to produce electricity. No chemical or thermal conversion is involved.',
    reviewSectionId: 'sm10-sec-1-intro',
    reviewSectionTitle: 'Introduction to Hydropower',
  },
  {
    id: 'sm10-q2',
    question: 'Which type of hydropower plant does NOT require a reservoir and instead diverts a portion of a river\'s natural flow through a turbine?',
    options: [
      'Pumped-storage hydropower',
      'Run-of-river hydropower',
      'Tidal barrage',
      'Reservoir (impoundment) hydropower',
    ],
    correctIndex: 1,
    explanation:
      'Run-of-river hydropower plants divert part of a river\'s natural flow through a channel or pipe to a turbine, then return the water to the river downstream. They do not require a large reservoir, so their environmental and social footprint is significantly smaller than impoundment dams — though their output varies with river flow.',
    wrongExplanation:
      'Run-of-river is the correct answer. Unlike reservoir (impoundment) plants that store large volumes of water behind a dam, run-of-river plants simply divert a portion of the river\'s existing flow through a turbine. This avoids the need for a large dam and reservoir, reducing environmental and social impacts.',
    reviewSectionId: 'sm10-sec-2-types',
    reviewSectionTitle: 'Types of Hydropower',
  },
  {
    id: 'sm10-q3',
    question: 'How does pumped-storage hydropower contribute to grid stability?',
    options: [
      'It generates electricity continuously by pumping water uphill and immediately releasing it',
      'It acts as a large-scale energy store — pumping water uphill using surplus electricity when demand is low, and releasing it through turbines to generate electricity during peak demand',
      'It supplies baseload power at a constant rate regardless of grid conditions',
      'It uses solar power to pump water, creating a hybrid renewable system',
    ],
    correctIndex: 1,
    explanation:
      'Pumped-storage hydropower (PSH) is the world\'s largest form of grid-scale energy storage. During periods of low electricity demand (and low prices), surplus power is used to pump water from a lower reservoir to an upper reservoir. During peak demand, the water is released downhill through turbines to generate electricity rapidly, helping to balance the grid.',
    wrongExplanation:
      'PSH does not generate electricity continuously — it stores energy. When surplus power is available (e.g. overnight or from excess wind), it pumps water uphill. When demand peaks, it releases the water through turbines to generate electricity on demand. This makes it the most important tool for large-scale grid-balancing storage globally.',
    reviewSectionId: 'sm10-sec-2-types',
    reviewSectionTitle: 'Types of Hydropower',
  },
  {
    id: 'sm10-q4',
    question: 'Which country has the largest installed hydropower capacity in the world?',
    options: [
      'Brazil',
      'Canada',
      'United States',
      'China',
    ],
    correctIndex: 3,
    explanation:
      'China has by far the largest installed hydropower capacity in the world, led by projects such as the Three Gorges Dam — the world\'s largest power station by installed capacity at 22,500 MW. China accounts for roughly 30% of global hydropower capacity. Brazil, Canada, and the USA also have very large hydropower fleets.',
    wrongExplanation:
      'China leads the world in installed hydropower capacity, accounting for around 30% of global total. Its Three Gorges Dam alone has an installed capacity of 22,500 MW, making it the world\'s largest power station. Brazil, Canada, and the USA are also major hydropower producers but trail China significantly.',
    reviewSectionId: 'sm10-sec-3-global',
    reviewSectionTitle: 'Hydropower Around the World',
  },
  {
    id: 'sm10-q5',
    question: 'What is the primary social challenge associated with large hydropower dam projects?',
    options: [
      'Large dams are visually unappealing and reduce tourism in surrounding areas',
      'The construction of large dams frequently requires the involuntary displacement of communities from areas to be flooded by reservoirs',
      'Large dams produce significant noise pollution that affects nearby populations',
      'Large dams are incompatible with fisheries and eliminate all fishing livelihoods immediately',
    ],
    correctIndex: 1,
    explanation:
      'The flooding of reservoir areas behind large dams has historically required the displacement of communities — sometimes numbering in the millions. The Three Gorges Dam, for example, displaced approximately 1.3 million people. Affected communities often lose their homes, livelihoods, ancestral land, and cultural heritage sites, making displacement the most significant and contested social impact of large dam construction.',
    wrongExplanation:
      'The central social challenge of large dams is the involuntary displacement of people whose homes, farmland, and communities are flooded when reservoirs are created. This has affected millions of people globally — the Three Gorges Dam alone displaced approximately 1.3 million people, often with inadequate resettlement support.',
    reviewSectionId: 'sm10-sec-4-challenges',
    reviewSectionTitle: 'Challenges and Impacts of Hydropower',
  },
  {
    id: 'sm10-q6',
    question: 'Which of the following is a recognised environmental impact of large hydropower reservoirs?',
    options: [
      'Reservoirs increase river water temperature, improving conditions for all aquatic species',
      'Dams block fish migration routes and trap sediment, disrupting downstream ecosystems and delta fertility',
      'Large reservoirs reduce regional rainfall by removing water from the hydrological cycle permanently',
      'Hydropower reservoirs produce significant air pollution from evaporation of treated wastewater',
    ],
    correctIndex: 1,
    explanation:
      'Dams create physical barriers that block the upstream and downstream migration of fish species such as salmon and sturgeon. They also trap sediment that would naturally flow downstream to replenish floodplains and river deltas, reducing agricultural fertility. Decomposing organic matter in tropical reservoirs can also emit methane, a potent greenhouse gas.',
    wrongExplanation:
      'The key environmental impacts of large dams include blocking fish migration routes — preventing salmon and other migratory species from reaching spawning grounds — and trapping sediment that would otherwise replenish downstream floodplains and deltas. Tropical reservoirs can also emit significant methane from decomposing vegetation.',
    reviewSectionId: 'sm10-sec-4-challenges',
    reviewSectionTitle: 'Challenges and Impacts of Hydropower',
  },
  {
    id: 'sm10-q7',
    question: 'How is geothermal energy harnessed to generate electricity?',
    options: [
      'Heat from solar radiation is stored in ground-source heat pumps and converted to electricity',
      'Steam or hot water from geological sources within the Earth is extracted and used to drive turbines connected to generators',
      'The gravitational pull of the Earth\'s molten core is converted to rotational energy',
      'Decomposing organic matter deep underground generates heat that is captured via boreholes',
    ],
    correctIndex: 1,
    explanation:
      'Geothermal energy exploits heat stored within the Earth, originating from the planet\'s formation and radioactive decay of minerals. In geothermally active areas, steam or high-temperature water can be extracted from underground reservoirs via boreholes. This steam drives turbines to generate electricity; lower-temperature resources can also be used directly for heating.',
    wrongExplanation:
      'Geothermal energy comes from heat within the Earth itself — not from the sun or organic decomposition. In suitable geological areas, steam or very hot water is extracted from underground reservoirs and used directly to spin turbines. The steam is then often condensed and reinjected to maintain the reservoir.',
    reviewSectionId: 'sm10-sec-5-geothermal',
    reviewSectionTitle: 'Geothermal Energy',
  },
  {
    id: 'sm10-q8',
    question: 'Which type of geothermal power plant is best suited to resources where underground water temperature is moderate (typically 100–150°C) and is not hot enough to flash to steam?',
    options: [
      'Dry steam plant',
      'Flash steam plant',
      'Binary cycle plant',
      'Enhanced geothermal system (EGS)',
    ],
    correctIndex: 2,
    explanation:
      'Binary cycle plants are designed for moderate-temperature geothermal resources. The geothermal water heats a secondary working fluid (such as isobutane or isopentane) that has a lower boiling point than water. This secondary fluid vaporises and drives a turbine, while the geothermal water — never in direct contact with the turbine — is reinjected underground. This allows exploitation of resources too cool for flash or dry steam plants.',
    wrongExplanation:
      'Dry steam plants require naturally occurring steam; flash steam plants require very high-temperature water (above ~180°C). For moderate-temperature resources (100–150°C), binary cycle plants are used — they heat a secondary low-boiling-point fluid to drive the turbine, so the geothermal water never needs to flash to steam.',
    reviewSectionId: 'sm10-sec-5-geothermal',
    reviewSectionTitle: 'Geothermal Energy',
  },
  {
    id: 'sm10-q9',
    question: 'Which of the following countries gets the largest share of its electricity from geothermal energy?',
    options: [
      'France',
      'Saudi Arabia',
      'Iceland',
      'Australia',
    ],
    correctIndex: 2,
    explanation:
      'Iceland derives approximately 30% of its electricity from geothermal sources and a further 70% from hydropower, making it one of the few countries to run almost entirely on renewable energy. Iceland sits atop the Mid-Atlantic Ridge, giving it exceptional geothermal resources. Kenya and New Zealand also generate significant shares of electricity from geothermal power.',
    wrongExplanation:
      'Iceland is the world leader in geothermal electricity as a share of national supply, generating around 30% of its electricity from geothermal and virtually all of the rest from hydropower. Its location on the Mid-Atlantic Ridge provides outstanding geothermal resources. Kenya and New Zealand are other notable geothermal leaders.',
    reviewSectionId: 'sm10-sec-5-geothermal',
    reviewSectionTitle: 'Geothermal Energy',
  },
  {
    id: 'sm10-q10',
    question: 'Which of the following is a limitation of geothermal energy compared to wind and solar?',
    options: [
      'Geothermal energy is a variable resource, highly dependent on weather conditions',
      'Geothermal energy produces large quantities of CO2 when generating electricity',
      'Geothermal resources are geographically constrained to tectonically active regions, limiting where it can be deployed',
      'Geothermal energy cannot generate electricity — it can only be used for direct heating',
    ],
    correctIndex: 2,
    explanation:
      'Unlike wind and solar — which can be deployed almost anywhere with appropriate conditions — conventional geothermal power generation is largely constrained to geologically active regions near tectonic plate boundaries or volcanic hotspots, such as Iceland, Kenya, New Zealand, Indonesia, and the western USA. Enhanced Geothermal Systems (EGS) aim to extend geothermal generation to other regions by creating artificial reservoirs in hot dry rock.',
    wrongExplanation:
      'Geothermal is actually one of the most reliable renewable energy sources — it operates continuously regardless of weather. Its key limitation is geographic: conventional geothermal power requires naturally occurring high-temperature underground resources, which are concentrated near tectonic plate boundaries and volcanic zones. This restricts deployment to a relatively small number of countries.',
    reviewSectionId: 'sm10-sec-5-geothermal',
    reviewSectionTitle: 'Geothermal Energy',
  },
]
