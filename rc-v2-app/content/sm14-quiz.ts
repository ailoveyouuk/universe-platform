// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 14 — Confirmation of Learning Questions
// Topic: Skills & Roles in Renewables (slug: 'skills-roles')
//
// Each question links to the most relevant section in SM14 for learners
// who want to review the material after an incorrect answer.
// ─────────────────────────────────────────────────────────────────────────────

import { ColQuestion } from './sm1-quiz'

export const sm14ColQuestions: ColQuestion[] = [
  {
    id: 'sm14-q1',
    question: 'Approximately how many people were employed globally in renewable energy in recent years, and what is the projected figure for 2030?',
    options: [
      '5 million currently, growing to 15 million by 2030',
      '16 million currently, growing to 38 million by 2030',
      '25 million currently, growing to 50 million by 2030',
      '10 million currently, growing to 20 million by 2030',
    ],
    correctIndex: 1,
    explanation:
      'The International Renewable Energy Agency (IRENA) reports that the renewable energy sector employs over 16 million people globally. Under accelerated transition scenarios, this is projected to grow to approximately 38 million jobs by 2030 as solar, wind, and other clean technologies scale rapidly.',
    wrongExplanation:
      'The correct figures are around 16 million current employees, growing to approximately 38 million by 2030. These IRENA projections reflect the dramatic scaling of solar PV, wind, and associated industries required to meet global climate targets.',
    reviewSectionId: 'sm14-sec-1-intro',
    reviewSectionTitle: 'Introduction to Renewable Energy Careers',
  },
  {
    id: 'sm14-q2',
    question: 'Which of these roles is most directly responsible for coordinating planning consent, stakeholder engagement, and delivery timelines for a new wind farm?',
    options: [
      'Wind turbine service technician',
      'Electrical design engineer',
      'Project development manager',
      'Environmental impact assessor',
      'Grid connection engineer',
    ],
    correctIndex: 2,
    explanation:
      'A project development manager oversees the full lifecycle of a renewable energy project from initial site selection and feasibility through planning consent, stakeholder engagement, contracting, and construction handover. They coordinate specialists including environmental consultants, legal advisers, and engineers to deliver the project on time and within budget.',
    wrongExplanation:
      'The project development manager is the central coordinating role, responsible for obtaining planning consent, managing stakeholder relationships, and keeping delivery on schedule. The other roles listed are specialist functions that report into or work alongside the development manager.',
    reviewSectionId: 'sm14-sec-2-technical',
    reviewSectionTitle: 'Technical & Professional Roles',
  },
  {
    id: 'sm14-q3',
    question: 'By how much is wind turbine service technician employment projected to grow in the United States between 2022 and 2032?',
    options: [
      'Approximately 20%',
      'Approximately 40%',
      'Approximately 60%',
      'Approximately 100%',
    ],
    correctIndex: 2,
    explanation:
      'The US Bureau of Labor Statistics projects that wind turbine service technician employment will grow by approximately 60% between 2022 and 2032 — making it one of the fastest-growing occupations in the entire US economy. This reflects the rapid expansion of both onshore and offshore wind capacity in North America.',
    wrongExplanation:
      'The US Bureau of Labor Statistics projects approximately 60% growth for wind turbine service technicians between 2022 and 2032. This is among the highest growth rates of any occupation in the US, driven by the rapid build-out of new wind capacity.',
    reviewSectionId: 'sm14-sec-2-technical',
    reviewSectionTitle: 'Technical & Professional Roles',
  },
  {
    id: 'sm14-q4',
    question: 'What is the GWO Basic Safety Training (BST) certificate, and who typically requires it?',
    options: [
      'A government-issued licence required by all offshore oil and gas workers in Europe',
      'A Global Wind Organisation standard safety training programme required for personnel working at height on or near wind turbines',
      'A university-level qualification in renewable energy systems issued by the Global Wind Organisation',
      'An optional training programme for onshore wind farm visitors and contractors',
    ],
    correctIndex: 1,
    explanation:
      'GWO BST (Global Wind Organisation Basic Safety Training) is an industry-standard certification covering first aid, manual handling, fire awareness, working at height, and sea survival. It is required by most wind energy employers and clients before personnel are permitted to work on or near wind turbines, particularly offshore.',
    wrongExplanation:
      'The GWO Basic Safety Training is a mandatory industry certification — not a government licence or academic qualification. It covers working at height, first aid, fire safety, manual handling, and sea survival, and is required by employers across the wind sector before workers can access wind turbines.',
    reviewSectionId: 'sm14-sec-2-technical',
    reviewSectionTitle: 'Technical & Professional Roles',
  },
  {
    id: 'sm14-q5',
    question: 'Which skills shortage is considered most acute in the offshore wind industry today?',
    options: [
      'Shortage of software engineers able to program SCADA systems',
      'Shortage of qualified marine crew and specialised installation vessels',
      'Shortage of environmental consultants able to conduct EIA surveys',
      'Shortage of academic researchers in wind turbine aerodynamics',
    ],
    correctIndex: 1,
    explanation:
      'The most critical bottleneck in offshore wind is the shortage of purpose-built installation and service operation vessels (SOVs, CTVs, jack-up vessels) and the qualified marine crew to operate them. With thousands of turbines planned for installation in the 2020s and 2030s, the vessel and crew supply chain is widely identified as the single largest constraint on project delivery.',
    wrongExplanation:
      'Marine crew and specialised offshore vessels represent the most acute current shortage. Installing and servicing offshore wind turbines requires specialist jack-up ships, crew transfer vessels, and trained offshore workers — and the global supply of both is insufficient for the scale of projects planned over the next decade.',
    reviewSectionId: 'sm14-sec-3-gaps',
    reviewSectionTitle: 'Skills Gaps & Shortages',
  },
  {
    id: 'sm14-q6',
    question: 'What is the primary benefit of apprenticeship programmes for the renewable energy sector?',
    options: [
      'They allow companies to pay below the minimum wage during training periods',
      'They provide a structured pathway for people to gain industry-relevant qualifications and hands-on experience without necessarily requiring prior academic study',
      'They are exclusively funded by government and place no financial burden on employers',
      'They guarantee automatic employment at the host company on completion',
    ],
    correctIndex: 1,
    explanation:
      'Apprenticeships combine on-the-job training with formal qualification frameworks, enabling people from diverse educational backgrounds to enter the renewable energy sector. They are particularly valuable for technical roles such as turbine technician or electrical installer, where practical skills are paramount and academic routes alone do not fully prepare candidates.',
    wrongExplanation:
      'Apprenticeships are valuable primarily because they combine practical, employer-led training with accredited qualifications — creating a pathway into skilled renewable energy roles that does not depend solely on academic routes. This broadens the talent pool and develops workplace-ready skills from the outset.',
    reviewSectionId: 'sm14-sec-3-gaps',
    reviewSectionTitle: 'Skills Gaps & Shortages',
  },
  {
    id: 'sm14-q7',
    question: 'What target did the UK offshore wind industry set for female representation in the workforce by 2030?',
    options: [
      '20%',
      '33%',
      '40%',
      '50%',
    ],
    correctIndex: 1,
    explanation:
      'The Offshore Wind Industry Council (OWIC) and its members committed to achieving 33% female representation across the UK offshore wind workforce by 2030, as part of a wider Diversity & Inclusion Action Plan aimed at broadening the talent pipeline and addressing the persistent gender imbalance in the energy sector.',
    wrongExplanation:
      'The UK offshore wind industry target is 33% female representation by 2030. This was set by the Offshore Wind Industry Council as part of a sector-wide Diversity & Inclusion Action Plan, recognising that gender diversity is both an equity imperative and a practical necessity for meeting workforce demand.',
    reviewSectionId: 'sm14-sec-4-diversity',
    reviewSectionTitle: 'Diversity & Inclusion in Renewables',
  },
  {
    id: 'sm14-q8',
    question: 'How are drones transforming inspection and maintenance roles in renewable energy?',
    options: [
      'Drones are replacing all human technicians for turbine blade repair',
      'Drones allow remote visual and thermal inspection of wind turbine blades and solar panels, reducing the need for risky rope-access work and cutting inspection time and cost',
      'Drones are used exclusively for security surveillance of renewable energy sites',
      'Drones can recharge themselves from wind turbines, making them self-sufficient for extended missions',
    ],
    correctIndex: 1,
    explanation:
      'Drone-based inspection using high-resolution cameras and thermal imaging sensors allows technicians to survey wind turbine blades, solar panel arrays, and transmission infrastructure far more quickly and safely than traditional methods. This reduces the need for costly rope access or scaffold work, shortens turbine downtime, and creates new roles for drone pilots and data analysts while changing (rather than eliminating) the work of field technicians.',
    wrongExplanation:
      'Drones are transforming — not replacing — inspection roles. They enable rapid visual and thermal surveys of turbine blades and solar panels without putting technicians at height. This creates demand for drone pilots and inspection data analysts while allowing field technicians to focus on identified faults rather than routine visual checks.',
    reviewSectionId: 'sm14-sec-2-technical',
    reviewSectionTitle: 'Technical & Professional Roles',
  },
  {
    id: 'sm14-q9',
    question: 'Which of the following best represents an emerging job role created specifically by the energy transition?',
    options: [
      'Mechanical fitter',
      'Project accountant',
      'Green hydrogen production engineer',
      'Health and safety officer',
    ],
    correctIndex: 2,
    explanation:
      'Green hydrogen production engineer is an emerging role that did not exist at scale before the energy transition. It involves designing, operating, and optimising electrolysis systems that use renewable electricity to produce zero-carbon hydrogen for storage, transport fuel, and industrial processes. Other new roles include battery storage systems engineer, AI energy data analyst, and virtual power plant operator.',
    wrongExplanation:
      'Green hydrogen production engineer is the emerging energy-transition role in this list. Mechanical fitters, accountants, and health and safety officers exist across many industries; hydrogen engineers are new roles created specifically by the growth of electrolysis-based green hydrogen production enabled by cheap renewable electricity.',
    reviewSectionId: 'sm14-sec-3-gaps',
    reviewSectionTitle: 'Skills Gaps & Shortages',
  },
  {
    id: 'sm14-q10',
    question: 'Which of the following is among the recognised priorities for developing the renewable energy workforce?',
    options: [
      'Restricting entry to the sector to candidates with existing fossil fuel experience',
      'Investing in reskilling and upskilling programmes to transition workers from fossil fuel industries',
      'Limiting apprenticeships to graduates of engineering universities',
      'Centralising all training provision to a single national institution in each country',
    ],
    correctIndex: 1,
    explanation:
      'Reskilling and upskilling workers from fossil fuel industries — such as offshore oil and gas, coal mining, and gas power generation — is a core priority for renewable energy workforce development. Many skills are directly transferable (mechanical engineering, electrical systems, project management), and targeted transition programmes help avoid unemployment in fossil fuel-dependent communities while rapidly building the renewable energy talent pool.',
    wrongExplanation:
      'Reskilling fossil fuel workers is a key workforce priority. Oil and gas technicians, coal plant engineers, and other fossil fuel workers possess many transferable skills, and targeted reskilling programmes allow them to transition into renewable energy roles — benefiting both individuals and the sector.',
    reviewSectionId: 'sm14-sec-3-gaps',
    reviewSectionTitle: 'Skills Gaps & Shortages',
  },
]
