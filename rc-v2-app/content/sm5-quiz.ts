// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 5 — Confirmation of Learning Questions
// Topic: Floating Offshore Wind  |  slug: 'floating-offshore-wind'
//
// Each question links to the most relevant section in SM5 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm5ColQuestions: ColQuestion[] = [
  {
    id: 'sm5-q1',
    question: 'Why is floating offshore wind (FLOW) considered such a significant advance over fixed-bottom offshore wind?',
    options: [
      'FLOW turbines are larger and more powerful than any fixed-bottom equivalent',
      'Around 80% of the world\'s offshore wind resource lies in waters too deep for fixed foundations — FLOW unlocks this potential',
      'FLOW eliminates the need for subsea cables, transmitting electricity wirelessly to shore',
      'FLOW farms can be relocated to different locations to follow seasonal wind patterns',
    ],
    correctIndex: 1,
    explanation:
      'Around 80% of the world\'s offshore wind resource lies in waters too deep for fixed-bottom foundations to be economically viable. Fixed foundations become unviable beyond approximately 60 metres depth. Floating offshore wind removes this constraint entirely, unlocking vast deep-water wind resources — particularly off the coasts of countries with limited shallow continental shelf such as Japan, the US West Coast, Norway, and parts of the UK.',
    wrongExplanation:
      'That is not the primary reason FLOW is significant. The key advantage is geographic: approximately 80% of the world\'s offshore wind resource sits in waters too deep for fixed foundations (beyond around 60 metres). Floating structures remove this depth constraint, accessing much stronger and more consistent deep-water winds.',
    reviewSectionId: 'sm5-sec-1-intro',
    reviewSectionTitle: 'Introduction to Floating Offshore Wind',
  },
  {
    id: 'sm5-q2',
    question: 'What does the Global Wind Energy Council (GWEC) estimate floating offshore wind capacity could reach by 2040?',
    options: [
      '10 GW by 2040, largely confined to European pilot projects',
      '35 GW by 2040, primarily in deep-water sites around Japan and Norway',
      '70 GW by 2040, with the potential to power over 12 million homes globally',
      '150 GW by 2040, surpassing fixed offshore wind in total installed capacity',
    ],
    correctIndex: 2,
    explanation:
      'The Global Wind Energy Council estimates that floating wind capacity could reach 70 GW by 2040, with the potential to power over 12 million homes globally by 2030. This growth is driven by falling costs as the technology matures, ambitious national targets from countries including Japan, South Korea, the United States, and several European nations, and major project announcements from initiatives such as ScotWind in Scotland.',
    wrongExplanation:
      'That is not the GWEC estimate. According to the Global Wind Energy Council, floating offshore wind capacity could reach 70 GW by 2040 — with the potential to power over 12 million homes globally by 2030. This growth trajectory depends on continued cost reductions and the translation of project pipeline into operational capacity.',
    reviewSectionId: 'sm5-sec-1-intro',
    reviewSectionTitle: 'Introduction to Floating Offshore Wind',
  },
  {
    id: 'sm5-q3',
    question: 'At approximately what water depth do fixed-bottom foundations become unviable, making floating foundations the preferred option?',
    options: [
      'Around 20 metres — fixed foundations are generally unviable beyond this depth',
      'Around 40 metres — this is where monopile foundations reach their practical limit',
      'Around 60 metres — fixed foundations are increasingly unviable beyond this depth',
      'Around 120 metres — ultra-deep water beyond all conventional foundation types',
    ],
    correctIndex: 2,
    explanation:
      'Fixed-bottom foundations — including monopiles, jackets, and tripods — become increasingly unviable technically or economically beyond approximately 60 metres of water depth. This is the threshold at which floating foundations become the preferred option. Large areas of deeper seabed (50–200 metres) around the UK and globally are now being targeted for floating offshore wind development.',
    wrongExplanation:
      'That depth is not correct. Fixed-bottom offshore wind foundations become increasingly unviable beyond approximately 60 metres of water depth — at which point floating foundations become the preferred option. This depth threshold is why floating wind is essential for accessing the vast majority of the world\'s offshore wind resource.',
    reviewSectionId: 'sm5-sec-2-why',
    reviewSectionTitle: 'Why Floating Offshore Wind?',
  },
  {
    id: 'sm5-q4',
    question: 'Which floating platform type uses a large vertical buoyant cylinder ballasted from the bottom, and typically requires deployment at depths greater than 100 metres?',
    options: [
      'Semi-submersible — multiple columns and pontoons with catenary spread mooring',
      'Tension Leg Platform (TLP) — columns and pontoons with vertical taut-leg mooring',
      'Spar-buoy — a deep-draft vertical cylinder, ballasted from below and moored with catenary lines',
      'Barge-type — a flat-bottomed hull kept in place by spread mooring anchors',
    ],
    correctIndex: 2,
    explanation:
      'The Spar-buoy design consists of a large vertical buoyant cylinder, ballasted from the bottom end with a deep draft, which minimises motion in response to wind and waves. Its tall structure requires deployment at water depths greater than 100 metres. It is kept in place with catenary spread mooring lines and drag or suction anchors. Its relative simplicity makes it cost-effective from a manufacturing perspective.',
    wrongExplanation:
      'That is a different floating platform type. The Spar-buoy is the design that uses a large vertical cylinder ballasted from below with a deep draft — requiring depths greater than 100 metres. Semi-submersibles use multiple columns and pontoons and can be deployed from 60 metres; TLPs use vertical taut-leg mooring systems.',
    reviewSectionId: 'sm5-sec-5-platforms',
    reviewSectionTitle: 'Floating Platform Types',
  },
  {
    id: 'sm5-q5',
    question: 'How many people live within 100 km of the world\'s coastlines — making floating offshore wind directly relevant to a significant share of the global population?',
    options: [
      'Around 800 million people',
      'Around 1.2 billion people',
      'Around 2.4 billion people',
      'Around 4.1 billion people',
    ],
    correctIndex: 2,
    explanation:
      '2.4 billion people — nearly a third of the world\'s population — live within 100 km of the shoreline. This proximity means that floating offshore wind, which accesses deep-water sites near coastlines, has the potential to deliver major-scale clean power directly to densely populated coastal markets, without the need for extensive inland transmission infrastructure.',
    wrongExplanation:
      'That figure is not correct. Approximately 2.4 billion people live within 100 km of the world\'s coastlines. This means floating offshore wind — which accesses deep-water sites close to shore — has the potential to deliver clean electricity directly to a very large share of the global population with relatively short transmission distances.',
    reviewSectionId: 'sm5-sec-1-intro',
    reviewSectionTitle: 'Introduction to Floating Offshore Wind',
  },
  {
    id: 'sm5-q6',
    question: 'What is the key stability mechanism of a semi-submersible floating wind platform?',
    options: [
      'A deep-draft ballasted cylinder that keeps the centre of gravity well below the centre of buoyancy',
      'Vertical taut-leg moorings that hold the platform rigidly in place and prevent heave movement',
      'Multiple columns and pontoons with restoring movement kept in place by catenary spread mooring lines and anchors',
      'A single-point mooring system that allows the platform to rotate freely around a central anchor',
    ],
    correctIndex: 2,
    explanation:
      'Semi-submersible platforms achieve stability through multiple columns and pontoons, with buoyancy distributed across the structure. Stability is maintained through the restoring movement of the columns, and the platform is kept on station by catenary spread mooring lines connected to drag or suction anchors on the seabed. The centre of gravity is above the centre of buoyancy — stability comes from the geometry and water plane area rather than deep ballast.',
    wrongExplanation:
      'That describes a different platform type. Semi-submersibles achieve stability through multiple columns and pontoons, kept in place by catenary spread mooring lines and drag or suction anchors. The deep-draft ballasted cylinder describes the Spar-buoy; vertical taut-leg moorings describe the Tension Leg Platform (TLP).',
    reviewSectionId: 'sm5-sec-5-platforms',
    reviewSectionTitle: 'Floating Platform Types',
  },
  {
    id: 'sm5-q7',
    question: 'What unique engineering challenge do dynamic cables solve in floating offshore wind arrays?',
    options: [
      'They provide structural support to the floating platform, preventing excessive pitch and roll',
      'They transmit electricity from the floating turbines to the offshore substation while accommodating the constant motion of the floating platforms',
      'They act as mooring lines, anchoring the floating structure to the seabed while also carrying power',
      'They connect multiple floating platforms together to form a rigid array that moves as a single unit',
    ],
    correctIndex: 1,
    explanation:
      'Dynamic cables are a specialised type of subsea cable that can flex and move continuously without fatigue failure. In a floating offshore wind farm, the platforms move constantly in response to waves, wind, and current. Dynamic cables transmit the generated electricity from these moving platforms to the offshore substation (or shore) while accommodating this constant motion — unlike conventional static subsea cables which would fail under repeated flexing.',
    wrongExplanation:
      'That is not what dynamic cables do. Dynamic cables are specifically engineered to transmit electricity from floating platforms to the substation or shore while withstanding the constant movement of floating structures. Standard static subsea cables cannot tolerate repeated flexing without fatigue failure — dynamic cables are designed to flex continuously throughout their operational life.',
    reviewSectionId: 'sm5-sec-7-cables',
    reviewSectionTitle: 'Dynamic Cables',
  },
  {
    id: 'sm5-q8',
    question: 'Which mooring system characteristic is described as keeping a floating platform on station using lines that hang in a natural curve between the platform and seabed anchors?',
    options: [
      'Taut-leg mooring — near-vertical lines under high tension that minimise platform movement',
      'Catenary mooring — lines that follow a curved path between the platform and drag or suction anchors on the seabed',
      'Rigid-link mooring — a direct structural connection between the platform and a fixed seabed pile',
      'Tensioned buoy mooring — uses intermediate buoys to redirect mooring line forces',
    ],
    correctIndex: 1,
    explanation:
      'Catenary mooring uses lines that hang in a natural curve (the catenary curve) between the floating platform and anchors on the seabed. As the platform moves, the shape of the catenary line changes, providing a restoring force that keeps the platform on station. Drag anchors or suction anchors are typically used. This approach is used in both semi-submersible and spar-buoy designs. Taut-leg mooring, by contrast, uses near-vertical lines under higher tension.',
    wrongExplanation:
      'That is not the catenary mooring description. Catenary mooring uses lines that hang in a natural curve between the floating platform and seabed anchors — the curve provides the restoring force. Taut-leg mooring uses near-vertical lines under tension (as in TLPs). The term "catenary" comes from the mathematical curve formed by a hanging chain or cable under gravity.',
    reviewSectionId: 'sm5-sec-6-anchors',
    reviewSectionTitle: 'Anchoring Systems',
  },
  {
    id: 'sm5-q9',
    question: 'Which of the following is identified as a key advantage of floating offshore wind over fixed-bottom offshore wind in terms of wind resource quality?',
    options: [
      'Floating wind sites have lower wave heights, reducing structural loading on turbines',
      'Floating platforms can be oriented to maximise wind capture in any direction without yaw systems',
      'Winds are stronger and more consistent further out to sea, giving higher generation and a higher capacity factor',
      'Floating farms can be positioned to take advantage of tidal currents as a secondary energy source',
    ],
    correctIndex: 2,
    explanation:
      'One of the key advantages of floating offshore wind is access to stronger, more consistent winds in deeper offshore waters, further from the coast. This translates into higher generation output and a higher capacity factor compared to nearshore and onshore sites. The ability to access the best wind resources — unconstrained by water depth — is central to the long-term potential of floating offshore wind.',
    wrongExplanation:
      'That is not the identified wind resource advantage. The key benefit is that winds are stronger and more consistent further out to sea — where floating platforms can be deployed. This results in higher generation and better capacity factors than nearshore or onshore wind sites. Removing the depth constraint means developers can select the most wind-rich sites rather than just the shallowest ones.',
    reviewSectionId: 'sm5-sec-2-why',
    reviewSectionTitle: 'Why Floating Offshore Wind?',
  },
  {
    id: 'sm5-q10',
    question: 'What is identified as a key cost competitiveness target for floating offshore wind technology?',
    options: [
      'To match the LCOE of onshore wind (£20–25/MWh) by 2025',
      'To become competitive with other forms of energy by the year 2030',
      'To reduce project LCOE below $50/MWh by 2035 through industrialisation of supply chains',
      'To achieve grid parity with solar PV in all major markets by 2040',
    ],
    correctIndex: 1,
    explanation:
      'A central target for the floating offshore wind industry is to achieve cost competitiveness with other forms of energy by 2030. Currently, floating wind LCOE remains significantly higher than fixed-bottom offshore wind, due to the relative immaturity of the technology and supply chain. Achieving this target requires continued innovation in platform design, mooring systems, dynamic cables, installation methods, and manufacturing scale.',
    wrongExplanation:
      'That specific target is not correct. The industry\'s stated cost competitiveness goal is for floating offshore wind to become competitive with other forms of energy by the year 2030. Achieving this requires advances in platform design, mooring and cable systems, port infrastructure, and supply chain scale — a challenging but achievable target given the pace of innovation in the sector.',
    reviewSectionId: 'sm5-sec-2-why',
    reviewSectionTitle: 'Why Floating Offshore Wind?',
  },
]
