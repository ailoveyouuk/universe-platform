// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 11 — Confirmation of Learning Questions
// Topic: Green Hydrogen  |  slug: 'hydrogen'
//
// Each question links to the most relevant section in SM11 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm11ColQuestions: ColQuestion[] = [
  {
    id: 'sm11-q1',
    question: 'What makes green hydrogen "green" compared to grey or blue hydrogen?',
    options: [
      'Green hydrogen is produced from natural gas using carbon capture; grey hydrogen is produced from coal',
      'Green hydrogen is produced by electrolysis powered by renewable electricity, producing no CO2 emissions; grey hydrogen is produced from natural gas via steam methane reforming without any carbon capture',
      'Green hydrogen is a naturally occurring underground gas; grey hydrogen is synthetically produced',
      'Green hydrogen is coloured with food-safe dyes to distinguish it from other hydrogen types at point of use',
    ],
    correctIndex: 1,
    explanation:
      'The colour designation reflects the production method and carbon intensity. Grey hydrogen is made from natural gas via steam methane reforming (SMR) with no carbon capture — emitting roughly 9 kg of CO2 per kg of H2. Blue hydrogen uses the same process but captures and stores most of the CO2. Green hydrogen uses renewable electricity to split water via electrolysis, emitting no CO2 during production.',
    wrongExplanation:
      'The colours are a shorthand for carbon intensity. Grey hydrogen comes from natural gas via steam methane reforming with no carbon capture. Blue hydrogen is the same but adds CCS. Green hydrogen is produced by electrolysis powered entirely by renewable energy — the only form with no direct CO2 emissions.',
    reviewSectionId: 'sm11-sec-1-intro',
    reviewSectionTitle: 'Introduction to Green Hydrogen',
  },
  {
    id: 'sm11-q2',
    question: 'What is steam methane reforming (SMR) and why is it significant in the hydrogen industry?',
    options: [
      'SMR is an electrolysis process that uses methane to split water more efficiently than conventional electrolysers',
      'SMR is the dominant hydrogen production method globally, in which natural gas reacts with steam at high temperatures to produce hydrogen and CO2',
      'SMR is a method of storing hydrogen in methane molecules for safe transport in existing pipelines',
      'SMR is a biological process in which methane-consuming bacteria produce hydrogen as a by-product',
    ],
    correctIndex: 1,
    explanation:
      'Steam methane reforming is currently responsible for around 95% of global hydrogen production. It involves reacting natural gas (methane) with high-temperature steam (700–1,000°C) in the presence of a catalyst to produce hydrogen and carbon monoxide (syngas), with subsequent conversion to CO2 via the water-gas shift reaction. Without carbon capture, SMR is a fossil fuel process that produces significant CO2 emissions.',
    wrongExplanation:
      'SMR is not an electrolysis or biological process. It is a thermochemical process — and by far the dominant global method of hydrogen production — in which natural gas reacts with steam at high temperatures to produce hydrogen and CO2. Without carbon capture, the CO2 is released to atmosphere, making it "grey" hydrogen.',
    reviewSectionId: 'sm11-sec-2-production',
    reviewSectionTitle: 'Hydrogen Production Methods',
  },
  {
    id: 'sm11-q3',
    question: 'In the electrolysis process for green hydrogen production, what happens at the electrodes?',
    options: [
      'Carbon and hydrogen are separated from methane molecules at the cathode',
      'Water molecules are split by an electric current: hydrogen gas is produced at the cathode and oxygen gas at the anode',
      'Hydrogen is oxidised at the anode to produce water and electricity',
      'Natural gas is converted to hydrogen by a platinum catalyst at both electrodes',
    ],
    correctIndex: 1,
    explanation:
      'In water electrolysis, an electric current is passed through water (H2O). At the cathode (negative electrode), hydrogen ions (H+) gain electrons and combine to form hydrogen gas (H2). At the anode (positive electrode), water molecules are oxidised and oxygen gas (O2) is released. When the electricity comes from renewable sources, the process produces zero-emission green hydrogen.',
    wrongExplanation:
      'Electrolysis splits water — not methane — using electricity. At the cathode, hydrogen ions gain electrons to form H2 gas. At the anode, water molecules are oxidised to release O2 gas. The only input is water and electricity; when the electricity is from renewables, the resulting hydrogen is "green" with no CO2 emissions.',
    reviewSectionId: 'sm11-sec-2-production',
    reviewSectionTitle: 'Hydrogen Production Methods',
  },
  {
    id: 'sm11-q4',
    question: 'What is the key operational difference between an alkaline electrolyser and a PEM (Proton Exchange Membrane) electrolyser?',
    options: [
      'Alkaline electrolysers use a liquid potassium hydroxide electrolyte and are a mature, lower-cost technology; PEM electrolysers use a solid polymer membrane and can respond rapidly to variable power inputs',
      'PEM electrolysers require seawater; alkaline electrolysers require distilled water',
      'Alkaline electrolysers can only produce green hydrogen; PEM electrolysers produce blue hydrogen',
      'PEM electrolysers operate at much higher temperatures (above 500°C); alkaline electrolysers operate at ambient temperature',
    ],
    correctIndex: 0,
    explanation:
      'Alkaline electrolysers use a liquid potassium hydroxide (KOH) electrolyte and are the most commercially mature and cost-effective technology, but they respond more slowly to power fluctuations. PEM electrolysers use a solid proton-conducting membrane, are more compact, can respond rapidly to variable renewable power inputs, and produce higher-purity hydrogen — but currently at higher cost.',
    wrongExplanation:
      'The core distinction is the electrolyte. Alkaline electrolysers use a liquid KOH electrolyte — a mature, lower-cost technology that responds slowly to power changes. PEM electrolysers use a solid polymer membrane — they are more expensive but respond rapidly to variable renewable power, making them well-suited to intermittent wind and solar generation.',
    reviewSectionId: 'sm11-sec-2-production',
    reviewSectionTitle: 'Hydrogen Production Methods',
  },
  {
    id: 'sm11-q5',
    question: 'How does a hydrogen fuel cell convert hydrogen into electricity?',
    options: [
      'Hydrogen is burned in a combustion chamber and the heat drives a turbine',
      'Hydrogen and oxygen combine electrochemically in the fuel cell, producing electricity, heat, and water as the only by-products',
      'Hydrogen is used to heat a steam boiler, which drives a conventional generator',
      'Hydrogen is mixed with natural gas and the blend is used in a gas turbine',
    ],
    correctIndex: 1,
    explanation:
      'A hydrogen fuel cell generates electricity through an electrochemical reaction — the reverse of electrolysis. Hydrogen is fed to the anode, where it is split into protons and electrons. The electrons flow through an external circuit (generating electricity), while protons pass through a membrane to combine with oxygen at the cathode, producing water and heat as the only by-products. Fuel cells are highly efficient and produce no CO2 at the point of use.',
    wrongExplanation:
      'Fuel cells do not burn hydrogen — that is combustion and would be far less efficient. A fuel cell uses an electrochemical reaction: hydrogen splits at the anode, electrons flow through an external circuit as electricity, and hydrogen ions combine with oxygen at the cathode to form water. The only outputs are electricity, useful heat, and water vapour.',
    reviewSectionId: 'sm11-sec-4-future',
    reviewSectionTitle: 'The Future of Green Hydrogen',
  },
  {
    id: 'sm11-q6',
    question: 'Which of the following is NOT a recognised method of hydrogen storage?',
    options: [
      'High-pressure compressed gas storage (typically 350–700 bar)',
      'Cryogenic liquid hydrogen (cooled to -253°C)',
      'Solid-state storage in metal hydrides or chemical carriers',
      'Storing hydrogen dissolved in seawater at ambient temperature and pressure',
    ],
    correctIndex: 3,
    explanation:
      'Hydrogen cannot be practically stored dissolved in seawater at ambient conditions. The three main hydrogen storage methods are: compressed gas (at 350–700 bar in high-pressure vessels), liquid hydrogen (cryogenically cooled to -253°C, close to absolute zero), and solid-state storage in materials such as metal hydrides or chemical hydrogen carriers like ammonia and LOHC (liquid organic hydrogen carriers).',
    wrongExplanation:
      'Hydrogen is not stored in seawater. The three main storage methods are compressed gas (350–700 bar), liquid hydrogen (cryogenically cooled to -253°C), and solid-state storage in materials such as metal hydrides or via chemical carriers like ammonia and liquid organic hydrogen carriers (LOHCs).',
    reviewSectionId: 'sm11-sec-3-storage',
    reviewSectionTitle: 'Hydrogen Storage and Transport',
  },
  {
    id: 'sm11-q7',
    question: 'Why is ammonia considered a promising medium for transporting green hydrogen internationally?',
    options: [
      'Ammonia can be used directly in existing natural gas pipelines without any modification',
      'Ammonia (NH3) has a higher hydrogen content by volume than compressed hydrogen gas and can be transported as a liquid at -33°C using existing infrastructure developed for the ammonia industry',
      'Ammonia is lighter than hydrogen gas, making it safer and cheaper to ship by air freight',
      'Ammonia converts spontaneously back to hydrogen at room temperature, making release at the destination simple',
    ],
    correctIndex: 1,
    explanation:
      'Ammonia (NH3) contains 17.6% hydrogen by weight and can be liquefied at -33°C under atmospheric pressure — far less extreme than liquid hydrogen at -253°C. Global ammonia shipping infrastructure already exists for the fertiliser industry, making ammonia an attractive hydrogen carrier for long-distance international transport. At the destination, ammonia is cracked back to hydrogen and nitrogen.',
    wrongExplanation:
      'Ammonia is favoured as a hydrogen carrier because it liquefies at the far more manageable temperature of -33°C (versus -253°C for liquid H2), has a high hydrogen density, and can leverage existing global ammonia shipping and terminal infrastructure. At the destination, it is cracked back to hydrogen and nitrogen.',
    reviewSectionId: 'sm11-sec-3-storage',
    reviewSectionTitle: 'Hydrogen Storage and Transport',
  },
  {
    id: 'sm11-q8',
    question: 'In which of the following sectors is green hydrogen expected to play the most significant decarbonisation role?',
    options: [
      'Residential central heating in all climates',
      'Passenger car personal transport as the primary replacement for petrol',
      'Hard-to-abate industries such as steel and chemicals, long-distance shipping, and heavy freight transport',
      'Consumer electronics, replacing lithium-ion batteries in smartphones and laptops',
    ],
    correctIndex: 2,
    explanation:
      'Green hydrogen is expected to be most impactful in sectors that are difficult to decarbonise with direct electrification — known as "hard-to-abate" sectors. These include green steel production (replacing coking coal), ammonia synthesis for fertilisers, long-distance maritime shipping, and heavy freight transport (hydrogen fuel cell trucks). Direct battery electrification is more efficient for passenger cars and most consumer electronics.',
    wrongExplanation:
      'Green hydrogen is not considered the optimal solution for passenger cars or consumer electronics — battery electric technology is more efficient for those applications. Its greatest value is in hard-to-abate sectors where direct electrification is impractical: steel production, chemical feedstocks, long-haul shipping, and heavy freight.',
    reviewSectionId: 'sm11-sec-4-future',
    reviewSectionTitle: 'The Future of Green Hydrogen',
  },
  {
    id: 'sm11-q9',
    question: 'What are the two principal barriers currently preventing green hydrogen from being cost-competitive with grey hydrogen?',
    options: [
      'Lack of scientific understanding of electrolysis and absence of suitable renewable energy sources',
      'The high cost of electrolysers and the relatively high cost of renewable electricity compared to natural gas',
      'Hydrogen\'s inability to be transported in any form and the absence of any commercial fuel cell technology',
      'Green hydrogen produces too little energy per kilogram to be commercially viable',
    ],
    correctIndex: 1,
    explanation:
      'Green hydrogen currently costs 3–6 times more than grey hydrogen in most markets. The two main cost drivers are: (1) the capital cost of electrolysers, which must fall significantly through manufacturing scale-up, and (2) the cost of renewable electricity, which is the largest operating cost since electrolysis is electricity-intensive. Both are falling rapidly and green hydrogen is expected to reach parity with grey hydrogen in some regions by the early 2030s.',
    wrongExplanation:
      'Electrolysis is a well-understood technology and commercial fuel cells exist. The actual barriers are economic: electrolyser capital costs remain high, and renewable electricity — while falling — still represents a significant operating cost. These combine to make green hydrogen 3–6 times more expensive than grey hydrogen in most current markets.',
    reviewSectionId: 'sm11-sec-4-future',
    reviewSectionTitle: 'The Future of Green Hydrogen',
  },
  {
    id: 'sm11-q10',
    question: 'What is the projected pathway for green hydrogen cost reduction, and what are the main drivers?',
    options: [
      'Green hydrogen costs are expected to remain stable because renewable electricity prices have plateaued',
      'Green hydrogen costs are projected to fall significantly through electrolyser manufacturing scale-up, falling renewable electricity prices, and technology learning rates similar to those seen in solar PV',
      'Green hydrogen will only become cost-competitive if governments maintain permanent high-level subsidies indefinitely',
      'Green hydrogen costs are driven solely by the price of water, which is expected to rise significantly',
    ],
    correctIndex: 1,
    explanation:
      'The pathway to green hydrogen cost reduction mirrors the solar PV story. Electrolyser costs are expected to fall by 50–80% by 2030 as manufacturing capacity scales globally, following technological learning curves. Simultaneously, renewable electricity costs continue to fall. The IEA and IRENA both project that green hydrogen could be cost-competitive with unabated grey hydrogen in some regions by the early-to-mid 2030s.',
    wrongExplanation:
      'Green hydrogen cost reduction is driven by two powerful and interconnected trends: electrolyser manufacturing scale (which is expected to reduce electrolyser costs by 50–80% by 2030) and continued falls in renewable electricity costs. Both follow learning curves similar to those seen in solar PV — suggesting cost-competitiveness with grey hydrogen in some markets by the early 2030s.',
    reviewSectionId: 'sm11-sec-4-future',
    reviewSectionTitle: 'The Future of Green Hydrogen',
  },
]
