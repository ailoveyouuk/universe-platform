// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 7 — Confirmation of Learning Questions
// Topic: Nuclear Energy  |  slug: 'nuclear'
//
// Each question links to the most relevant section in SM7 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm7ColQuestions: ColQuestion[] = [
  {
    id: 'sm7-q1',
    question: 'In a nuclear fission reactor, what happens during the fission process?',
    options: [
      'Two light atomic nuclei combine to release energy',
      'A heavy nucleus such as uranium-235 is split by a neutron, releasing heat and further neutrons',
      'Electrons are stripped from atoms to create a plasma',
      'Uranium is burned in a high-temperature furnace to produce steam',
    ],
    correctIndex: 1,
    explanation:
      'Nuclear fission occurs when a neutron strikes a heavy nucleus (typically uranium-235 or plutonium-239), causing it to split into smaller nuclei, release additional neutrons, and emit a large amount of heat energy — which is then used to generate steam and drive a turbine.',
    wrongExplanation:
      'That describes a different process. In fission, a neutron strikes a heavy nucleus such as uranium-235, splitting it apart and releasing heat energy along with further neutrons that sustain a chain reaction.',
    reviewSectionId: 'sm7-sec-1-intro',
    reviewSectionTitle: 'Introduction to Nuclear Energy',
  },
  {
    id: 'sm7-q2',
    question: 'Which of the following is a key difference between a Pressurised Water Reactor (PWR) and a Boiling Water Reactor (BWR)?',
    options: [
      'PWRs use heavy water as a moderator; BWRs use graphite',
      'In a PWR the coolant is kept under high pressure so it does not boil; in a BWR steam is produced directly in the reactor vessel',
      'BWRs operate at a higher temperature than PWRs',
      'PWRs can only use enriched uranium; BWRs use natural uranium',
    ],
    correctIndex: 1,
    explanation:
      'In a PWR, the primary coolant circuit is kept under high pressure (around 155 bar) to prevent boiling; heat is transferred to a secondary circuit where steam is produced. In a BWR, water boils directly inside the reactor vessel and the resulting steam drives the turbine directly.',
    wrongExplanation:
      'That is not quite right. The key distinction is that PWRs keep primary coolant pressurised to prevent boiling, while BWRs allow water to boil directly inside the reactor vessel to produce steam.',
    reviewSectionId: 'sm7-sec-2-reactor',
    reviewSectionTitle: 'How Nuclear Reactors Work',
  },
  {
    id: 'sm7-q3',
    question: 'Which of the following best describes a Small Modular Reactor (SMR)?',
    options: [
      'A nuclear reactor with an electrical output greater than 1,000 MW that is built modularly on site',
      'A reactor with an output typically below 300 MW, factory-assembled in modules and transported to site',
      'A portable fusion device designed for remote communities',
      'A micro-reactor used only in submarines and naval vessels',
    ],
    correctIndex: 1,
    explanation:
      'SMRs are defined by their smaller output — generally below 300 MW — and their factory-built, modular design. Modules are manufactured to consistent standards and shipped to site for assembly, reducing construction time and enabling deployment in locations unsuitable for large conventional reactors.',
    wrongExplanation:
      'That is not the correct definition. SMRs have an output typically below 300 MW and are distinguished by being factory-assembled as modules and transported to site, making them faster and more flexible to deploy than conventional large reactors.',
    reviewSectionId: 'sm7-sec-2-reactor',
    reviewSectionTitle: 'How Nuclear Reactors Work',
  },
  {
    id: 'sm7-q4',
    question: 'What is the fundamental difference between nuclear fusion and nuclear fission?',
    options: [
      'Fusion splits heavy atoms; fission combines light atoms',
      'Fusion combines light atomic nuclei to release energy; fission splits heavy atomic nuclei',
      'Fusion produces radioactive waste; fission does not',
      'Fusion is used in commercial power plants today; fission is still experimental',
    ],
    correctIndex: 1,
    explanation:
      'Nuclear fusion combines light nuclei (such as hydrogen isotopes deuterium and tritium) to form a heavier nucleus, releasing enormous amounts of energy in the process. Fission does the opposite — splitting heavy nuclei. Fusion is the process that powers the sun and is being pursued for commercial energy production, though no commercial fusion plant yet operates.',
    wrongExplanation:
      'Those are reversed. Fusion joins light nuclei together (as in the sun), while fission splits heavy nuclei such as uranium. Both release energy, but fusion holds promise for far lower radioactive waste and virtually unlimited fuel.',
    reviewSectionId: 'sm7-sec-3-fusion',
    reviewSectionTitle: 'Nuclear Fusion',
  },
  {
    id: 'sm7-q5',
    question: 'Which accidents have most significantly shaped public perception of nuclear energy?',
    options: [
      'Three Mile Island and Windscale',
      'Chernobyl (1986) and Fukushima Daiichi (2011)',
      'Hanford and Sellafield',
      'Browns Ferry and Davis-Besse',
    ],
    correctIndex: 1,
    explanation:
      'Chernobyl in 1986 and Fukushima Daiichi in 2011 are the two accidents that have had the most lasting impact on global public opinion. Both were rated at the maximum INES Level 7, led to significant evacuations, and triggered policy reversals in several countries including Germany and Japan.',
    wrongExplanation:
      'While other incidents have been important, Chernobyl (1986) and Fukushima Daiichi (2011) are the two events that most profoundly shaped — and in many countries severely damaged — public trust in nuclear energy. Both received the maximum INES Level 7 severity rating.',
    reviewSectionId: 'sm7-sec-4-perception',
    reviewSectionTitle: 'Public Perception and Nuclear Risk',
  },
  {
    id: 'sm7-q6',
    question: 'Which countries have the largest nuclear power programmes by share of electricity generated?',
    options: [
      'USA, China, and Germany',
      'France, Slovakia, and Ukraine',
      'Russia, India, and Brazil',
      'Japan, South Korea, and Australia',
    ],
    correctIndex: 1,
    explanation:
      'France derives approximately 70% of its electricity from nuclear power — the highest share of any large economy. Slovakia and Ukraine also rank among the highest by nuclear share. In contrast, Germany phased out its last nuclear plants in 2023, and Australia has no commercial nuclear programme.',
    wrongExplanation:
      'While the USA and China have large nuclear fleets by absolute capacity, the countries with the highest nuclear share of electricity are France (~70%), Slovakia, and Ukraine. Germany closed its last reactors in 2023, and Australia has no nuclear programme.',
    reviewSectionId: 'sm7-sec-5-regulation',
    reviewSectionTitle: 'Nuclear Policy and Regulation',
  },
  {
    id: 'sm7-q7',
    question: 'How does the Levelised Cost of Electricity (LCOE) for new nuclear compare to offshore wind and utility-scale solar?',
    options: [
      'New nuclear is consistently cheaper than offshore wind and solar',
      'New nuclear currently has a higher LCOE than offshore wind and utility-scale solar in most markets',
      'All three technologies have broadly the same LCOE',
      'New nuclear has a lower LCOE than solar but is more expensive than offshore wind',
    ],
    correctIndex: 1,
    explanation:
      'New-build large nuclear plants currently carry a higher LCOE than offshore wind and utility-scale solar in most markets, largely due to high upfront capital costs and construction delays. However, nuclear advocates argue it provides firm, dispatchable low-carbon power that renewables alone cannot, and SMRs may reduce costs through standardised manufacturing.',
    wrongExplanation:
      'In most markets, new large nuclear currently carries a higher LCOE than offshore wind and utility-scale solar, mainly because of very high upfront capital costs and long construction times. The value of nuclear lies in its firm, dispatchable generation rather than headline cost competitiveness.',
    reviewSectionId: 'sm7-sec-6-economics',
    reviewSectionTitle: 'Nuclear Economics and LCOE',
  },
  {
    id: 'sm7-q8',
    question: 'What is the correct order of stages in the nuclear decommissioning process?',
    options: [
      'Immediate dismantlement → safe enclosure → entombment',
      'Defuelling and shutdown → safe enclosure period → full dismantlement and site remediation',
      'Site remediation → defuelling → safe enclosure',
      'Entombment → defuelling → final characterisation',
    ],
    correctIndex: 1,
    explanation:
      'Decommissioning typically begins with defuelling and shutting down the reactor safely, followed by a safe enclosure (or "safestore") period of decades during which radioactivity decays to lower levels, and finally full dismantlement of structures and remediation of the site to an agreed end state.',
    wrongExplanation:
      'The correct sequence is: defuelling and shutdown first, then a safe enclosure period (often 20–85 years) to allow radioactivity to decay, and finally full dismantlement and site remediation. This staged approach is safer and more cost-effective than immediate dismantlement.',
    reviewSectionId: 'sm7-sec-7-decommissioning',
    reviewSectionTitle: 'Decommissioning Nuclear Plants',
  },
  {
    id: 'sm7-q9',
    question: 'What is the principal long-term challenge associated with high-level nuclear waste?',
    options: [
      'It must be stored safely for hundreds of thousands of years due to long radioactive half-lives',
      'It cannot be transported and must be stored permanently at the power station where it was produced',
      'It emits large quantities of CO2 as it decays',
      'It becomes more radioactive over time, increasing the storage hazard',
    ],
    correctIndex: 0,
    explanation:
      'High-level nuclear waste contains long-lived radioactive isotopes — including plutonium-239 with a half-life of ~24,000 years — meaning it must be isolated from the environment for hundreds of thousands of years. Deep geological disposal (DGD) in stable rock formations is the internationally preferred long-term solution.',
    wrongExplanation:
      'The defining challenge of high-level nuclear waste is its extremely long radioactive lifetime — isotopes such as plutonium-239 have half-lives of tens of thousands of years, requiring safe isolation for hundreds of thousands of years. Deep geological disposal is the internationally preferred solution.',
    reviewSectionId: 'sm7-sec-7-decommissioning',
    reviewSectionTitle: 'Decommissioning Nuclear Plants',
  },
  {
    id: 'sm7-q10',
    question: 'Why is nuclear energy increasingly discussed as part of net zero strategies despite its challenges?',
    options: [
      'Because it is the cheapest low-carbon electricity source available',
      'Because it provides firm, low-carbon, dispatchable generation that can complement variable renewables',
      'Because it produces no radioactive waste',
      'Because it has the fastest construction times of any large power source',
    ],
    correctIndex: 1,
    explanation:
      'Nuclear energy generates low-carbon electricity consistently, regardless of weather conditions, making it a firm, dispatchable source that can complement variable renewables like wind and solar. Many net zero scenarios from bodies such as the IEA and IPCC include a role for nuclear alongside rapid renewable growth.',
    wrongExplanation:
      'Nuclear is valued in net zero strategies not for being cheapest or fastest to build, but because it delivers firm, dispatchable, low-carbon electricity around the clock. This ability to complement variable renewables like wind and solar makes it a key option in many credible net zero pathways.',
    reviewSectionId: 'sm7-sec-9-future',
    reviewSectionTitle: 'The Future of Nuclear Energy',
  },
]
