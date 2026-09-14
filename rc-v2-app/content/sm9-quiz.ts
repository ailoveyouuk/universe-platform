// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 9 — Confirmation of Learning Questions
// Topic: Biomass & Bioenergy  |  slug: 'biomass'
//
// Each question links to the most relevant section in SM9 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm9ColQuestions: ColQuestion[] = [
  {
    id: 'sm9-q1',
    question: 'Which of the following is NOT a recognised category of biomass feedstock?',
    options: [
      'Agricultural residues such as straw and bagasse',
      'Energy crops such as miscanthus and switchgrass',
      'Municipal solid waste and landfill gas',
      'Coal-derived synthetic gas',
      'Forestry residues and wood pellets',
    ],
    correctIndex: 3,
    explanation:
      'Coal-derived synthetic gas (syngas from coal gasification) is a fossil fuel product and is not a biomass feedstock. Recognised biomass feedstocks include agricultural residues, energy crops, forestry residues, municipal solid waste, and organic waste streams from food and industry.',
    wrongExplanation:
      'Coal-derived synthetic gas is a fossil fuel product, not biomass. Biomass feedstocks must be organic and biologically derived — such as agricultural residues, energy crops (miscanthus, switchgrass), forestry residues, food waste, and municipal solid waste.',
    reviewSectionId: 'sm9-sec-1-overview',
    reviewSectionTitle: 'Overview of Biomass and Bioenergy',
  },
  {
    id: 'sm9-q2',
    question: 'Which thermal conversion process heats biomass in the complete absence of oxygen to produce bio-oil, biochar, and syngas?',
    options: [
      'Combustion',
      'Gasification',
      'Pyrolysis',
      'Anaerobic digestion',
      'Fermentation',
    ],
    correctIndex: 2,
    explanation:
      'Pyrolysis heats biomass to temperatures of 400–700°C in the complete absence of oxygen, breaking it down into three products: bio-oil (a liquid fuel), biochar (a solid carbon-rich material with soil amendment benefits), and syngas (a combustible gas). Unlike combustion, no oxygen is present so there is no direct burning.',
    wrongExplanation:
      'Anaerobic digestion and fermentation are biochemical — not thermal — processes. Combustion requires oxygen. Gasification uses a limited supply of oxygen or steam. Pyrolysis is the process that thermally decomposes biomass with no oxygen at all, producing bio-oil, biochar, and syngas.',
    reviewSectionId: 'sm9-sec-2-conversion',
    reviewSectionTitle: 'Biomass Conversion Technologies',
  },
  {
    id: 'sm9-q3',
    question: 'In the context of biomass conversion, what does anaerobic digestion produce?',
    options: [
      'Ethanol and CO2',
      'Bio-oil and biochar',
      'Biogas (primarily methane and CO2) and digestate',
      'Hydrogen and nitrogen',
    ],
    correctIndex: 2,
    explanation:
      'Anaerobic digestion (AD) uses microorganisms to break down organic material in the absence of oxygen. The main outputs are biogas — a mixture typically of 50–70% methane and 30–50% CO2 — and digestate, a nutrient-rich slurry that can be used as a fertiliser. The biogas can be used for heat, electricity, or upgraded to biomethane for grid injection.',
    wrongExplanation:
      'Ethanol and CO2 is the output of fermentation, not anaerobic digestion. Anaerobic digestion uses microorganisms to break down organic material without oxygen, producing biogas (primarily methane and CO2) and digestate. The biogas can generate heat and electricity or be upgraded to biomethane.',
    reviewSectionId: 'sm9-sec-2-conversion',
    reviewSectionTitle: 'Biomass Conversion Technologies',
  },
  {
    id: 'sm9-q4',
    question: 'What is biogas and from what sources is it typically produced?',
    options: [
      'A synthetic gas derived from coal; produced in industrial gasification plants',
      'A gas produced from the anaerobic digestion of organic matter such as food waste, agricultural slurries, sewage sludge, and energy crops',
      'Compressed natural gas extracted from biomass-rich geological formations',
      'Hydrogen produced by electrolysing water using electricity from biomass combustion',
    ],
    correctIndex: 1,
    explanation:
      'Biogas is a renewable gas produced when microorganisms break down organic material in the absence of oxygen (anaerobic digestion). Common feedstocks include food and organic waste, agricultural slurries (e.g. pig and cow manure), sewage sludge, and energy crops. Raw biogas is typically 50–70% methane and can be burned directly or upgraded to biomethane for injection into gas networks.',
    wrongExplanation:
      'Biogas is not a fossil fuel product or a form of hydrogen. It is the gas produced when organic matter — such as food waste, agricultural slurries, or sewage sludge — is broken down by microorganisms in the absence of oxygen. The resulting mixture of methane and CO2 is a versatile renewable fuel.',
    reviewSectionId: 'sm9-sec-3-fuels',
    reviewSectionTitle: 'Biofuels and Biogas',
  },
  {
    id: 'sm9-q5',
    question: 'What distinguishes second-generation biofuels from first-generation biofuels?',
    options: [
      'Second-generation biofuels are made from food crops such as corn and sugar cane; first-generation biofuels use agricultural waste',
      'Second-generation biofuels are produced from non-food lignocellulosic feedstocks such as crop residues, wood, and dedicated energy crops, avoiding competition with food production',
      'Second-generation biofuels must be blended with fossil fuels; first-generation biofuels can be used neat',
      'Second-generation biofuels are produced using nuclear heat; first-generation biofuels use solar energy',
    ],
    correctIndex: 1,
    explanation:
      'First-generation biofuels (e.g. bioethanol from corn or sugar cane, biodiesel from vegetable oils) are made from food crops and raise concerns about food vs. fuel competition and land use change. Second-generation biofuels use non-food lignocellulosic materials — such as straw, wood chips, agricultural residues, and dedicated energy crops — that do not directly compete with food production.',
    wrongExplanation:
      'That has it reversed. First-generation biofuels come from food crops (corn, sugar cane, vegetable oils), raising food security concerns. Second-generation biofuels are made from non-food lignocellulosic feedstocks — crop residues, wood, energy grasses — avoiding direct competition with food production.',
    reviewSectionId: 'sm9-sec-3-fuels',
    reviewSectionTitle: 'Biofuels and Biogas',
  },
  {
    id: 'sm9-q6',
    question: 'Which of the following is a recognised international sustainability criterion for biomass used in energy production?',
    options: [
      'Biomass must be sourced exclusively from one country to qualify as sustainable',
      'Biomass should not come from land with high carbon stocks or high biodiversity value, and must deliver genuine GHG savings over its lifecycle',
      'All biomass is inherently carbon-neutral because trees absorb CO2 when they grow',
      'Biomass must be processed within 50 km of where it is harvested',
    ],
    correctIndex: 1,
    explanation:
      'Biomass sustainability criteria — as set out in frameworks like the EU Renewable Energy Directive — require that biomass does not come from high-carbon-stock land (e.g. primary forests, wetlands), that it meets minimum GHG savings thresholds over its full lifecycle, and that it respects biodiversity protections. The claim that all biomass is automatically carbon-neutral is a misconception.',
    wrongExplanation:
      'Biomass is not automatically carbon-neutral — its lifecycle GHG performance depends heavily on feedstock, land use, processing, and transport. Internationally recognised sustainability criteria require that biomass avoids high-carbon and biodiverse land, and delivers genuine GHG savings over the full supply chain.',
    reviewSectionId: 'sm9-sec-1-overview',
    reviewSectionTitle: 'Overview of Biomass and Bioenergy',
  },
  {
    id: 'sm9-q7',
    question: 'What does BECCS stand for, and why is it significant for climate goals?',
    options: [
      'Biomass Energy Carbon Capture System — a way to increase biomass combustion efficiency',
      'Bioenergy with Carbon Capture and Storage — it can achieve negative emissions by permanently storing the CO2 absorbed by biomass during its growth',
      'Biomass Enhanced Combustion and Cooling System — a technology for reducing heat losses',
      'Biological Energy Carbon Credit Scheme — a financial mechanism for trading biomass credits',
    ],
    correctIndex: 1,
    explanation:
      'BECCS (Bioenergy with Carbon Capture and Storage) combines biomass power generation with carbon capture technology. Because the biomass absorbs CO2 from the atmosphere as it grows, and that CO2 is then permanently stored underground rather than released, BECCS can deliver net negative emissions — removing more CO2 from the atmosphere than it emits. Many net zero scenarios rely on BECCS as a key carbon removal tool.',
    wrongExplanation:
      'BECCS stands for Bioenergy with Carbon Capture and Storage. It is significant because it can deliver net negative emissions: the biomass absorbs CO2 as it grows, and instead of releasing that CO2 on combustion, it is captured and permanently stored underground — removing CO2 from the atmosphere on a net basis.',
    reviewSectionId: 'sm9-sec-5-future',
    reviewSectionTitle: 'The Future of Bioenergy',
  },
  {
    id: 'sm9-q8',
    question: 'Which region of the world is currently the largest producer of modern bioenergy?',
    options: [
      'Sub-Saharan Africa',
      'The Middle East',
      'Europe and North America',
      'Antarctica',
    ],
    correctIndex: 2,
    explanation:
      'Europe and North America are the leading regions for modern bioenergy production, with major wood pellet manufacturing in North America (particularly the US South East) and significant biogas and biomass power capacity across Europe. Brazil is also a major producer of bioethanol from sugar cane. Traditional biomass use (e.g. wood for cooking) dominates in parts of Africa and Asia.',
    wrongExplanation:
      'Europe and North America lead modern bioenergy production. North America — particularly the US South East — is a major wood pellet producer for export to Europe, while Europe has extensive biogas and biomass power capacity. Brazil leads in sugar cane bioethanol. Traditional (non-modern) biomass use is most prevalent in parts of Africa and Asia.',
    reviewSectionId: 'sm9-sec-4-geography',
    reviewSectionTitle: 'Geography of Bioenergy',
  },
  {
    id: 'sm9-q9',
    question: 'Compared to offshore wind and utility-scale solar, where does biomass electricity generation typically sit in terms of LCOE?',
    options: [
      'Biomass electricity is now the cheapest form of renewable generation',
      'Biomass electricity generally has a higher LCOE than offshore wind and solar due to feedstock procurement and logistics costs',
      'Biomass and solar have identical LCOE figures in all markets',
      'Biomass electricity is not cost-competitive with any other energy source',
    ],
    correctIndex: 1,
    explanation:
      'Biomass power generation typically carries a higher LCOE than offshore wind or utility-scale solar in most markets, primarily because of the ongoing costs of procuring, transporting, and processing feedstock. However, biomass offers dispatchable generation — it can operate on demand, unlike variable wind and solar — which provides additional value beyond a simple LCOE comparison.',
    wrongExplanation:
      'Unlike solar and wind, biomass has ongoing fuel supply costs that mean its LCOE is generally higher than these technologies in most markets. However, biomass offers a key advantage that LCOE alone does not capture: it is dispatchable — it can generate electricity on demand, regardless of weather conditions.',
    reviewSectionId: 'sm9-sec-1-overview',
    reviewSectionTitle: 'Overview of Biomass and Bioenergy',
  },
  {
    id: 'sm9-q10',
    question: 'How does bioenergy fit within a circular economy model?',
    options: [
      'Bioenergy does not fit within a circular economy because it produces waste products',
      'Bioenergy can use waste streams (food waste, agricultural residues, sewage) as feedstock, and its co-products such as digestate and biochar can be returned to land as nutrients or soil improvers',
      'A circular economy model requires bioenergy to be produced exclusively from virgin wood',
      'Bioenergy in a circular economy must be used only for transport fuels, not for heat or power',
    ],
    correctIndex: 1,
    explanation:
      'Bioenergy fits naturally within a circular economy by valorising organic waste streams — food waste, agricultural residues, municipal waste, and sewage sludge — that would otherwise go to landfill. Co-products such as digestate from anaerobic digestion and biochar from pyrolysis can be returned to agricultural land as fertilisers and soil improvers, closing nutrient loops.',
    wrongExplanation:
      'Bioenergy is well-suited to circular economy principles. It can use organic waste and residue streams as inputs rather than virgin resources, and its co-products — such as digestate from anaerobic digestion or biochar from pyrolysis — can be returned to land, closing nutrient cycles rather than creating linear waste streams.',
    reviewSectionId: 'sm9-sec-5-future',
    reviewSectionTitle: 'The Future of Bioenergy',
  },
]
