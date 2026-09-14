// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 3 — Confirmation of Learning Questions
// Topic: The Energy Transition  |  slug: 'energy-transition'
//
// Each question links to the most relevant section in SM3 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm3ColQuestions: ColQuestion[] = [
  {
    id: 'sm3-q1',
    question: 'According to the International Energy Agency (IEA), approximately how many people globally still lack access to electricity?',
    options: [
      'Around 150 million people',
      'Around 400 million people',
      'Around 850 million people',
      'Around 2 billion people',
    ],
    correctIndex: 2,
    explanation:
      'The IEA reports that roughly 850 million people worldwide still lack access to reliable electricity — a stark reminder that the energy transition must address both sustainability and energy equity. Daily life without electricity means struggling with extreme temperatures, inability to cook warm meals, and lack of access to healthcare, education, and economic opportunity.',
    wrongExplanation:
      'That figure is not correct. According to the IEA, approximately 850 million people globally still lack access to electricity. This highlights that the energy transition must address both decarbonisation and energy equity — ensuring that clean energy reaches those who need it most.',
    reviewSectionId: 'sm3-sec-2-access',
    reviewSectionTitle: 'Energy Access & Equity',
  },
  {
    id: 'sm3-q2',
    question: 'In 2024, what share of new vehicles sold in Norway were electric vehicles — making it the world leader in EV adoption?',
    options: [
      '42.5% of new vehicles sold',
      '65.1% of new vehicles sold',
      '88.9% of new vehicles sold',
      '95.4% of new vehicles sold',
    ],
    correctIndex: 2,
    explanation:
      'In 2024, electric vehicles accounted for 88.9% of new vehicles sold in Norway — up from 82.4% in 2023 — making Norway the world leader in EV adoption by a significant margin. By contrast, the UK recorded 20% EV share and the US just 8% in the same year, illustrating the transformative impact of Norway\'s long-running EV incentive policies.',
    wrongExplanation:
      'That figure is not correct. In 2024, EVs accounted for 88.9% of new vehicle sales in Norway — up from 82.4% in 2023. This compares to just 20% in the UK and 8% in the US. Norway\'s success reflects decades of consistent government policy supporting EV adoption through tax incentives and charging infrastructure.',
    reviewSectionId: 'sm3-sec-6-norway',
    reviewSectionTitle: 'Norway — A Case Study in EV Transition',
  },
  {
    id: 'sm3-q3',
    question: 'What share of global CO₂ emissions does the steel industry account for, making it one of the most carbon-intensive industrial sectors?',
    options: [
      'Around 1–2% of global CO₂ emissions',
      'Around 3–4% of global CO₂ emissions',
      'Around 7–9% of global CO₂ emissions',
      'Around 15–18% of global CO₂ emissions',
    ],
    correctIndex: 2,
    explanation:
      'Steel production is responsible for around 7–9% of global CO₂ emissions — making it one of the most carbon-intensive industries in the world. Conventional steelmaking relies on blast furnaces burning coke (a coal derivative), generating on average approximately 1.85 tonnes of CO₂ per tonne of steel produced. Decarbonisation pathways include Electric Arc Furnaces (EAF), hydrogen-based direct reduction, and CCUS.',
    wrongExplanation:
      'That is not the correct figure. The steel industry accounts for around 7–9% of global CO₂ emissions — a significant share driven by conventional blast furnace steelmaking that burns coke and produces around 1.85 tonnes of CO₂ per tonne of steel. This makes decarbonising steel one of the most important industrial challenges.',
    reviewSectionId: 'sm3-sec-8-steel',
    reviewSectionTitle: 'Decarbonising Steel',
  },
  {
    id: 'sm3-q4',
    question: 'By how much can Electric Arc Furnaces (EAFs) reduce CO₂ emissions compared to traditional blast furnace steelmaking?',
    options: [
      'By up to 20%, by using scrap steel instead of iron ore',
      'By up to 45%, by reducing the need for coking coal',
      'By up to 75%, by using scrap steel and electricity instead of coke and iron ore',
      'By up to 100%, as EAFs produce no CO₂ emissions when powered by renewables',
    ],
    correctIndex: 2,
    explanation:
      'Electric Arc Furnaces (EAFs) use scrap steel and electricity — rather than iron ore and coke — cutting CO₂ emissions by up to 75% compared to traditional steelmaking. Their effectiveness is directly tied to the carbon intensity of the electricity grid: when powered by renewable energy, the emissions reduction is maximised. EAFs are currently the most commercially mature low-carbon steelmaking technology.',
    wrongExplanation:
      'That is not the correct reduction. Electric Arc Furnaces can cut CO₂ emissions by up to 75% compared to traditional blast furnace steelmaking, by using scrap steel and electricity rather than iron ore and coke. The actual reduction depends on the carbon intensity of the electricity supply — the cleaner the grid, the greater the benefit.',
    reviewSectionId: 'sm3-sec-8-steel',
    reviewSectionTitle: 'Decarbonising Steel',
  },
  {
    id: 'sm3-q5',
    question: 'What did the UK Government\'s Sustainable Aviation Fuel (SAF) Mandate, starting in 2025, require — and what does it rise to by 2030?',
    options: [
      'SAF must make up 5% of total UK jet fuel in 2025, rising to 20% by 2030',
      'SAF must make up 2% of total UK jet fuel in 2025, rising to 10% by 2030',
      'SAF must make up 10% of total UK jet fuel in 2025, rising to 30% by 2030',
      'SAF must make up 1% of total UK jet fuel in 2025, rising to 5% by 2030',
    ],
    correctIndex: 1,
    explanation:
      'The UK\'s SAF Mandate began in 2025 at 2% of total UK jet fuel, increasing linearly to 10% in 2030 and 22% in 2040. SAF — which includes biofuels, synthetic e-fuels, and drop-in compatible blends — is central to near-term aviation decarbonisation as it can be used in existing aircraft without modification.',
    wrongExplanation:
      'Those figures are not correct. The UK SAF Mandate started in 2025 at 2% of total jet fuel, rising to 10% by 2030 and 22% by 2040. Sustainable Aviation Fuels are compatible with existing aircraft engines and infrastructure, making them the most practical near-term pathway to decarbonising commercial aviation.',
    reviewSectionId: 'sm3-sec-7-aviation',
    reviewSectionTitle: 'Decarbonising Aviation',
  },
  {
    id: 'sm3-q6',
    question: 'What does Vehicle-to-Grid (V2G) technology enable that standard EV charging does not?',
    options: [
      'V2G allows EVs to charge faster by drawing from multiple grid connections simultaneously',
      'V2G enables bidirectional energy flow — EVs can store energy and discharge it back to the home or grid during peak demand',
      'V2G allows EVs to charge wirelessly without a physical cable connection',
      'V2G coordinates EV charging across a fleet to optimise battery longevity',
    ],
    correctIndex: 1,
    explanation:
      'Vehicle-to-Grid (V2G) technology enables bidirectional energy flow between electric vehicles and the electricity grid. Unlike standard charging, V2G allows EVs to charge during off-peak periods (when electricity is cheap and renewable) and discharge electricity back to homes or the grid during peak demand — acting as distributed energy storage. This makes EVs an active participant in grid balancing.',
    wrongExplanation:
      'That does not describe V2G. Vehicle-to-Grid technology enables bidirectional energy flow — EVs can not only charge from the grid, but also discharge electricity back to homes or the grid during peak periods. This transforms EVs from passive consumers into active storage assets that can help balance supply and demand.',
    reviewSectionId: 'sm3-sec-6-norway',
    reviewSectionTitle: 'Norway — A Case Study in EV Transition',
  },
  {
    id: 'sm3-q7',
    question: 'What share of global electricity generation had renewable energy reached, according to the IEA figure cited in this sub-module?',
    options: [
      '12% of global electricity generation',
      '26% of global electricity generation',
      '41% of global electricity generation',
      '58% of global electricity generation',
    ],
    correctIndex: 1,
    explanation:
      'The IEA states that renewable energy\'s share of global electricity generation had grown to 26%. While this represents meaningful progress, it also highlights that the majority of global electricity still comes from fossil fuels — underscoring the urgency of accelerating the transition and scaling renewable deployment across all regions.',
    wrongExplanation:
      'That is not the IEA figure cited in the sub-module. According to the IEA, renewable energy accounts for 26% of global electricity generation. Significant as this is, the majority of global electricity still comes from fossil fuels — reinforcing the scale of the transition still required.',
    reviewSectionId: 'sm3-sec-3-renewables',
    reviewSectionTitle: 'Renewable Energy Technologies',
  },
  {
    id: 'sm3-q8',
    question: 'What is Combined Heat and Power (CHP), and what makes it more energy-efficient than conventional electricity generation?',
    options: [
      'CHP is a solar-thermal technology that generates electricity and hot water simultaneously from sunlight',
      'CHP is a system that generates electricity while simultaneously capturing and using waste heat from the process, significantly improving overall efficiency',
      'CHP is a battery system that combines heat storage and power storage in a single unit for buildings',
      'CHP refers to the combination of heat pumps and photovoltaic panels on a single building',
    ],
    correctIndex: 1,
    explanation:
      'Combined Heat and Power (CHP) — also called cogeneration — generates electricity while simultaneously capturing and using the heat that is a by-product of electricity generation (which is otherwise wasted). This dual use dramatically improves overall energy efficiency compared to conventional power plants that only generate electricity. CHP is a key industrial energy efficiency tool.',
    wrongExplanation:
      'That is not what CHP describes. Combined Heat and Power (cogeneration) generates electricity and simultaneously captures the waste heat from that process for use in heating applications. Conventional power plants lose much of their energy as waste heat — CHP recovers this, making the overall system far more energy-efficient.',
    reviewSectionId: 'sm3-sec-4-efficiency',
    reviewSectionTitle: 'Energy Efficiency',
  },
  {
    id: 'sm3-q9',
    question: 'In hydrogen-based direct reduction steelmaking (H₂-DRI), what substance replaces coke as the reducing agent — and what is produced instead of CO₂?',
    options: [
      'Electricity replaces coke; oxygen (O₂) is produced as a by-product',
      'Green hydrogen replaces coke; water (H₂O) is produced instead of CO₂',
      'Natural gas replaces coke; a mixture of CO₂ and nitrogen is produced',
      'Ammonia replaces coke; nitrogen gas (N₂) is released instead of CO₂',
    ],
    correctIndex: 1,
    explanation:
      'In hydrogen-based Direct Reduction of Iron (H₂-DRI), green hydrogen replaces coke as the reducing agent in the iron ore reduction process. Instead of producing CO₂ (as conventional steelmaking does), H₂-DRI produces water (H₂O) as its by-product — a transformative shift when powered by renewable-generated hydrogen. It is one of the most promising pathways to near-zero-emission primary steel production.',
    wrongExplanation:
      'That is not correct. In H₂-DRI steelmaking, green hydrogen is used as the reducing agent in place of coke. Because hydrogen reacts with iron ore to produce water (H₂O) rather than carbon dioxide, this process has the potential to produce near-zero-emission steel when the hydrogen is produced from renewable energy.',
    reviewSectionId: 'sm3-sec-8-steel',
    reviewSectionTitle: 'Decarbonising Steel',
  },
  {
    id: 'sm3-q10',
    question: 'To what value is the global green economy projected to grow by 2030?',
    options: [
      'Over $1 trillion',
      'Over $5 trillion',
      'Over $10 trillion',
      'Over $25 trillion',
    ],
    correctIndex: 2,
    explanation:
      'The global green economy is projected to exceed $10 trillion by 2030. Countries that lead the energy transition can gain competitive advantages through innovation, exports, and rising productivity. This scale of economic opportunity underscores why the transition is not just an environmental imperative but also a profound economic opportunity — particularly for those nations and industries that move early.',
    wrongExplanation:
      'That figure is too low. The global green economy is projected to exceed $10 trillion by 2030 — a figure that illustrates the enormous economic opportunity embedded in the energy transition. Leading nations and industries stand to gain significant competitive advantages in exports, innovation, and productivity by moving early.',
    reviewSectionId: 'sm3-sec-13-economics',
    reviewSectionTitle: 'The Economics of the Energy Transition',
  },
]
