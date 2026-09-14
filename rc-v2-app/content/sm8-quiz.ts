// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 8 — Confirmation of Learning Questions
// Topic: Solar Power  |  slug: 'solar'
//
// Each question links to the most relevant section in SM8 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm8ColQuestions: ColQuestion[] = [
  {
    id: 'sm8-q1',
    question: 'How does a photovoltaic (PV) cell convert sunlight into electricity?',
    options: [
      'Sunlight heats a fluid that drives a steam turbine',
      'Photons from sunlight strike semiconductor material, exciting electrons and generating a direct current',
      'Mirrors concentrate sunlight onto a receiver to create high-pressure steam',
      'Solar radiation ionises a gas, which flows through a magnetic field to generate current',
    ],
    correctIndex: 1,
    explanation:
      'A PV cell is made from semiconductor material (typically silicon). When photons from sunlight strike the cell, they transfer energy to electrons, knocking them loose and allowing them to flow as direct current (DC) electricity. An inverter then converts this DC into alternating current (AC) for use in homes and the grid.',
    wrongExplanation:
      'That describes a different solar technology. In a photovoltaic cell, photons from sunlight excite electrons in a semiconductor material such as silicon, causing them to flow as direct current. The process does not involve heat or steam — it is a direct conversion of light to electricity.',
    reviewSectionId: 'sm8-sec-1-intro',
    reviewSectionTitle: 'Introduction to Solar Power',
  },
  {
    id: 'sm8-q2',
    question: 'Which of the following correctly describes the difference between monocrystalline and polycrystalline solar panels?',
    options: [
      'Monocrystalline panels are blue; polycrystalline panels are black',
      'Monocrystalline panels are cut from a single silicon crystal and are more efficient; polycrystalline panels are made from multiple silicon fragments melded together and are generally less efficient',
      'Polycrystalline panels use thin-film technology and are the most flexible option',
      'Monocrystalline panels are cheaper to manufacture than polycrystalline panels',
    ],
    correctIndex: 1,
    explanation:
      'Monocrystalline panels are produced from a single continuous silicon crystal, giving them a uniform dark appearance and higher efficiencies (typically 18–22%). Polycrystalline panels are made by melting multiple silicon fragments together, resulting in a distinctive blue, speckled look and slightly lower efficiencies (15–18%) but at a lower production cost.',
    wrongExplanation:
      'Thin-film is a separate category. The core distinction is that monocrystalline panels come from a single silicon crystal — making them more efficient (18–22%) but more expensive to produce — while polycrystalline panels are made from multiple silicon fragments melded together, offering slightly lower efficiency at lower cost.',
    reviewSectionId: 'sm8-sec-2-types',
    reviewSectionTitle: 'Types of Solar PV Technology',
  },
  {
    id: 'sm8-q3',
    question: 'Which type of solar panel technology generally achieves the highest efficiency in standard commercial applications?',
    options: [
      'Thin-film (amorphous silicon)',
      'Polycrystalline silicon',
      'Monocrystalline silicon',
      'Cadmium telluride (CdTe)',
    ],
    correctIndex: 2,
    explanation:
      'Monocrystalline silicon panels achieve the highest commercial efficiencies, typically 18–22%, with premium models exceeding 23%. Their uniform crystal structure allows electrons to move more freely, reducing energy losses. Thin-film technologies are lower in efficiency but lighter and more flexible, making them suitable for certain applications.',
    wrongExplanation:
      'In standard commercial applications, monocrystalline silicon panels achieve the highest efficiencies — typically 18–22%. Thin-film and polycrystalline panels are less efficient but have other advantages such as lower cost or flexibility.',
    reviewSectionId: 'sm8-sec-2-types',
    reviewSectionTitle: 'Types of Solar PV Technology',
  },
  {
    id: 'sm8-q4',
    question: 'What is the main advantage of microinverters over a standard string inverter in a solar PV system?',
    options: [
      'Microinverters are significantly cheaper than string inverters',
      'Microinverters convert AC to DC more efficiently than string inverters',
      'Microinverters allow each panel to operate independently, so shading or faults on one panel do not reduce the output of the whole array',
      'Microinverters eliminate the need for any electrical wiring between panels',
    ],
    correctIndex: 2,
    explanation:
      'In a string inverter system, all panels are connected in series, so if one panel is shaded or faulty, the output of the entire string is reduced to that panel\'s level. Microinverters are fitted to each individual panel, allowing them to operate and optimise independently — significantly reducing losses caused by partial shading, soiling, or panel mismatch.',
    wrongExplanation:
      'The key advantage is panel-level independence. In a string inverter system, shading on one panel drags down the whole string. Microinverters are attached to each individual panel so that each converts DC to AC separately, meaning shading or faults on one panel have no impact on the others.',
    reviewSectionId: 'sm8-sec-3-inverters',
    reviewSectionTitle: 'Inverters and Power Electronics',
  },
  {
    id: 'sm8-q5',
    question: 'What is the primary difference between a grid-connected solar PV system and an off-grid solar PV system?',
    options: [
      'Grid-connected systems use monocrystalline panels; off-grid systems use thin-film panels',
      'Grid-connected systems export surplus electricity to the grid and draw from it when needed; off-grid systems rely on battery storage and have no connection to the public grid',
      'Off-grid systems are always larger in capacity than grid-connected systems',
      'Grid-connected systems require no inverter; off-grid systems must use a string inverter',
    ],
    correctIndex: 1,
    explanation:
      'A grid-connected system is tied to the public electricity network — surplus generation can be exported, and electricity can be imported when solar output is insufficient. An off-grid system has no connection to the grid and must rely entirely on battery storage or backup generation to cover periods of low solar output.',
    wrongExplanation:
      'The defining difference is grid connectivity. A grid-connected system can export surplus power and draw from the grid as needed. An off-grid system stands alone — it must store surplus energy in batteries and has no access to grid electricity when solar output falls short.',
    reviewSectionId: 'sm8-sec-4-grid',
    reviewSectionTitle: 'Solar and the Grid',
  },
  {
    id: 'sm8-q6',
    question: 'By approximately how much has the global LCOE of utility-scale solar PV fallen since 2010?',
    options: [
      'Around 30%',
      'Around 50%',
      'Around 70%',
      'More than 90%',
    ],
    correctIndex: 3,
    explanation:
      'The LCOE of utility-scale solar PV has fallen by more than 90% since 2010, driven by improvements in panel efficiency, manufacturing scale, supply chain maturation, and increased competition. Solar is now the cheapest source of new electricity generation in history in many parts of the world.',
    wrongExplanation:
      'The fall in solar LCOE has been far more dramatic than most options suggest. Since 2010, the global average LCOE of utility-scale solar has dropped by over 90%, making solar the cheapest source of new electricity generation in history across much of the world.',
    reviewSectionId: 'sm8-sec-1-intro',
    reviewSectionTitle: 'Introduction to Solar Power',
  },
  {
    id: 'sm8-q7',
    question: 'What is Building-Integrated Photovoltaics (BIPV)?',
    options: [
      'Solar panels mounted on frames on top of a building\'s roof',
      'Solar PV technology incorporated directly into building materials such as roof tiles, facades, or glazing, replacing conventional materials',
      'A planning framework requiring all new commercial buildings to install solar panels',
      'PV systems installed in large solar farms adjacent to buildings to supply them with power',
    ],
    correctIndex: 1,
    explanation:
      'BIPV refers to solar PV materials that are integrated into the building envelope itself — replacing conventional materials such as roof tiles, cladding, or glazing. Unlike standard rooftop panels that are added on top of existing structures, BIPV elements serve a dual function as both building material and electricity generator.',
    wrongExplanation:
      'Standard rooftop panels are a separate category called Building-Applied PV (BAPV). BIPV specifically means solar technology that is embedded into the building fabric itself — such as solar roof tiles, photovoltaic facades, or solar glass — replacing rather than sitting on top of conventional building materials.',
    reviewSectionId: 'sm8-sec-2-types',
    reviewSectionTitle: 'Types of Solar PV Technology',
  },
  {
    id: 'sm8-q8',
    question: 'Which of the following is NOT a recognised application segment for solar PV?',
    options: [
      'Utility-scale ground-mounted solar farms',
      'Floating solar PV on reservoirs and lakes',
      'Concentrated Solar Thermal (CST) for domestic hot water',
      'Commercial and industrial rooftop solar',
    ],
    correctIndex: 2,
    explanation:
      'Concentrated Solar Thermal (CST) systems use mirrors or lenses to focus sunlight to heat a fluid — they are a distinct technology from photovoltaics and do not use PV cells. The recognised PV application segments include utility-scale farms, floating solar, commercial and industrial rooftops, and residential systems.',
    wrongExplanation:
      'Concentrated Solar Thermal (CST) is a separate technology from PV — it uses mirrors or lenses to concentrate sunlight to generate heat, not electricity from photovoltaic cells. The core solar PV segments are utility-scale farms, floating solar, commercial and industrial rooftops, and residential installations.',
    reviewSectionId: 'sm8-sec-2-types',
    reviewSectionTitle: 'Types of Solar PV Technology',
  },
  {
    id: 'sm8-q9',
    question: 'Which country has the largest installed solar PV capacity in the world?',
    options: [
      'United States',
      'Germany',
      'India',
      'China',
    ],
    correctIndex: 3,
    explanation:
      'China has by far the largest installed solar PV capacity in the world, accounting for over a third of global cumulative capacity. China is also the world\'s dominant manufacturer of solar panels. The USA, EU countries, Japan, and India are other major markets but trail China considerably in total installed capacity.',
    wrongExplanation:
      'China leads the world in installed solar PV capacity by a significant margin, accounting for over a third of global total. It is also the dominant manufacturer of solar panels globally. The USA, EU, India, and Japan are large markets but are considerably behind China.',
    reviewSectionId: 'sm8-sec-6-people',
    reviewSectionTitle: 'Solar — People and Communities',
  },
  {
    id: 'sm8-q10',
    question: 'What is perovskite solar technology and why is it significant?',
    options: [
      'A type of thin-film panel made from cadmium telluride that is cheaper than silicon',
      'A class of materials with a specific crystal structure that can achieve very high solar efficiencies and can be manufactured at low cost, potentially surpassing conventional silicon cells',
      'A bifacial panel design that captures light from both sides of the panel',
      'A solar concentrator technology that uses lenses to focus sunlight onto small high-efficiency cells',
    ],
    correctIndex: 1,
    explanation:
      'Perovskite solar cells use a class of materials characterised by a specific ABX3 crystal structure. They have demonstrated rapid efficiency improvements — exceeding 25% in laboratory conditions — and can be manufactured using low-cost processes. Perovskite-silicon tandem cells, which stack perovskite on silicon, have set new efficiency records above 30%.',
    wrongExplanation:
      'Bifacial and concentrator technologies are separate innovations. Perovskite refers to a class of crystalline materials that can be manufactured cheaply and have shown remarkable efficiency improvements in laboratory settings, already exceeding 25% and approaching 33% in tandem configurations with silicon.',
    reviewSectionId: 'sm8-sec-5-innovation',
    reviewSectionTitle: 'Innovation in Solar Technology',
  },
]
