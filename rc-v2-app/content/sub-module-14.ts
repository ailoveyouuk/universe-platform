// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 14: Skills & Roles in Renewable Energy
// Source: MOD1_SUB14_SKILLS & ROLES.pdf pages 3–25
//
// Phase 1 images served from /public/images/sm14/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  renewableJobsChart,
  workforceGrowthChart,
  skillsGapChart,
  transferableSkillsChart,
} from './sm14-charts'

function p(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function h2(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'h2' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function bullet(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'normal' as const, listItem: 'bullet' as const, level: 1,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function h3(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'h3' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}
function localImage(filename: string, alt: string): ImageAsset {
  return { _type: 'image', asset: { _ref: `/images/sm14/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm14/${filename}` }
}

export const subModule14: SubModule = {
  _id: 'sm-14',
  title: 'SM 14 - Skills & Roles',
  slug: { _type: 'slug', current: 'skills-roles' },
  orderIndex: 14,
  estimatedHours: 2,
  learningObjectives: [
    'Identify the key workforce roles required across the renewable energy project lifecycle: design, manufacturing, construction, and operations',
    'Describe the skills and training required for maintenance technician roles in wind, solar, and other renewable technologies',
    'Recognise the emerging roles created by the energy transition, including energy storage specialists and AI/data roles',
    'Assess the current skills gaps across the renewable energy sector and understand why they matter',
    'Evaluate the policy frameworks, education pathways, and apprenticeship programmes supporting renewable energy workforce development',
    'Understand the importance of diversity and inclusion in building the renewable energy workforce of the future',
    'Describe the impact of automation, drones, and AI on renewable energy jobs',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction & Design/Planning Workforce ───────────────────
    {
      _id: 'sm14-sec-1-intro',
      title: 'Introduction to the Renewable Energy Workforce',
      slug: { _type: 'slug', current: 'skills-introduction' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm14-s1-hero',
          image: localImage('Images/AdobeStock_1047864133.webp', 'Diverse team of renewable energy professionals'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm14-s1-text',
          content: [
            h2('sm14-s1-h1', 'The Scale of Renewable Energy Employment'),
            p('sm14-s1-p1', 'The renewable energy sector is one of the fastest-growing employers in the world. There are already over 16 million people working in renewable energy worldwide -- a number projected to grow to 38 million by 2030. The move towards renewable energy is increasingly causing changes in the types of skills needed and the roles available across the entire energy sector.'),
            p('sm14-s1-p2', 'Effective communication, an integrated approach to renewable energy development (rather than isolated technologies), and the ability to work across complex multi-stakeholder environments are increasingly valued alongside traditional technical skills. The renewable energy workforce spans an enormous range of roles -- from marine engineers installing offshore turbines to financial analysts structuring project finance, from environmental consultants assessing biodiversity impacts to software developers building grid management systems.'),
            h2('sm14-s1-h2', 'Workforce Requirements for Designing & Planning'),
            p('sm14-s1-p3', 'Designing and planning renewable energy systems requires a specialised workforce with diverse skills. From concept to completion, key roles include:'),
            bullet('sm14-s1-b1', 'Project Developers & Managers: Coordinate teams, manage budgets, ensure timelines are met, and liaise with government authorities, local communities, landowners, and environmental bodies. They are responsible for steering projects from initial concept through to financial close and delivery.'),
            bullet('sm14-s1-b2', 'Environmental Consultants: Assess the potential environmental impacts of projects. They analyse ecosystems, wildlife, and habitats to ensure compliance with environmental regulations and licensing requirements.'),
            bullet('sm14-s1-b3', 'Planners & GIS Specialists: Help in site selection and design, working with geographic information systems to identify optimal locations and ensure compliance with planning and zoning requirements.'),
            bullet('sm14-s1-b4', 'Financial Analysts & Economists: Provide expertise in the financial viability of projects, calculating return on investment, structuring debt and equity, and managing offtake negotiations.'),
            bullet('sm14-s1-b5', 'Legal Professionals: Navigate planning law, land rights, grid connection agreements, power purchase agreements, and the complex regulatory frameworks governing renewable energy projects.'),
            bullet('sm14-plan-consenting', 'Consenting Specialists and Advisers: Navigate the complex legal and regulatory approval processes required to bring renewable energy projects to construction. They coordinate Environmental Impact Assessments, manage public consultation processes, liaise with statutory consultees such as planning authorities and nature agencies, and ensure all necessary permits and licences are secured. This is a highly specialised role that sits at the intersection of law, planning, and environmental science.'),
            bullet('sm14-plan-energy-analyst', 'Energy Analysts: Forecast energy outputs for proposed projects using wind or solar resource data, modelling tools, and site-specific assessments. They optimise site layouts, assess the impact of grid connection constraints on revenue, and produce the energy yield assessments that underpin project financing.'),
            bullet('sm14-plan-planning-officer', 'Planning Officers: Evaluate development proposals against local, regional, and national planning policies. They consult with stakeholders, assess the potential impacts of proposed developments, and make recommendations to planning authorities on whether projects should be approved, modified, or refused.'),
          ],
        },
        renewableJobsChart,
        workforceGrowthChart,
      ],
    },

    // ── SECTION 2: Manufacturing, Construction & Maintenance ──────────────────
    {
      _id: 'sm14-sec-2-technical',
      title: 'Manufacturing, Construction & Maintenance Roles',
      slug: { _type: 'slug', current: 'skills-technical-roles' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm14-s2-hero',
          image: localImage('Images/AdobeStock_1032483776.webp', 'Wind turbine maintenance technician climbing a tower'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm14-s2-text',
          content: [
            h2('sm14-s2-h1', 'Manufacturing Workforce'),
            p('sm14-s2-p1', 'The manufacturing of renewable energy equipment requires a skilled workforce with expertise across a range of disciplines. Key roles include:'),
            bullet('sm14-s2-b1', 'Mechanical & Electrical Engineers: Focus on designing and manufacturing generators, turbine components, and power electronics. They ensure systems such as solar inverters and wind turbine generators function reliably.'),
            bullet('sm14-s2-b2', 'Materials Scientists: Develop and test advanced materials for blades, towers, and solar panels -- increasingly focusing on recyclability and end-of-life management.'),
            bullet('sm14-s2-b3', 'Quality Control Technicians: Ensure manufactured components meet exacting standards for performance, reliability, and safety throughout the production process.'),
            h2('sm14-s2-h2', 'Construction Workforce'),
            p('sm14-s2-p2', 'The workforce requirements for construction of renewable energy infrastructure are vast, requiring a blend of technical, engineering, and practical skills:'),
            bullet('sm14-s2-b4', 'Civil Engineers: Design and oversee foundations, access roads, cabling routes, and grid connection infrastructure. Offshore projects require specialist geotechnical and marine civil engineering expertise.'),
            bullet('sm14-s2-b5', 'Mechanical Engineers: Focus on turbine and mechanical component installation, ensuring efficient assembly and commissioning of generation equipment.'),
            bullet('sm14-s2-b6', 'Electricians: Wire and integrate renewable energy systems into local grids or standalone structures. High voltage expertise is increasingly required.'),
            bullet('sm14-s2-b7', 'Welders & Fabricators: Join structural components for turbine towers, substations, and offshore foundations. Specialist underwater welding skills are needed for offshore projects.'),
            bullet('sm14-s2-b8', 'Marine Workers: Offshore renewable projects require vessel crew, marine surveyors, divers, and ROV (remotely operated vehicle) operators.'),
            h3('sm14-const-nuclear-h1', 'The Nuclear Construction Skills Gap'),
            p('sm14-const-nuclear-p1', 'Nuclear construction projects face a particularly acute skills challenge. Large nuclear builds such as the European Pressurised Reactor (EPR) projects at Flamanville in France, Olkiluoto in Finland, and Hinkley Point C in the UK have all faced significant construction delays and cost overruns — partly attributable to the erosion of a specialised nuclear construction workforce following decades of limited new-build activity.'),
            bullet('sm14-const-nuclear-b1', 'Specialised Craft Skills: Nuclear construction requires welders, pipe-fitters, electricians, and civil construction workers with specific nuclear-grade qualifications and experience. These skills are scarce because nuclear construction has been intermittent in most Western countries since the 1980s.'),
            bullet('sm14-const-nuclear-b2', 'Centres of Excellence: In response, several European countries have adopted a "centres of excellence" model, establishing dedicated training facilities that pre-qualify workers for nuclear construction sites. These centres ensure that the workforce entering nuclear construction sites meets the high standards required for safety-critical nuclear work.'),
            bullet('sm14-const-nuclear-b3', 'SMR Opportunity: Small Modular Reactors (SMRs), with their factory-based manufacturing approach, may help address the nuclear construction skills challenge by moving more work into controlled factory environments and reducing the need for the largest-scale site-based civil engineering.'),
            h2('sm14-s2-h3', 'Maintenance Technician Roles'),
            p('sm14-s2-p3', 'Maintenance technicians for renewable energy systems play a crucial role in ensuring the continuous operation, safety, and efficiency of energy generation. Key skills and responsibilities include:'),
            bullet('sm14-s2-b9', 'Preventive Maintenance: Regular inspections and scheduled maintenance to minimise downtime and extend the lifespan of renewable energy infrastructure.'),
            bullet('sm14-s2-b10', 'Electrical Systems: Diagnosing and repairing faults in high-voltage electrical systems, inverters, and power electronics.'),
            bullet('sm14-s2-b11', 'Hydraulic Systems: For wind turbines, understanding and maintaining hydraulic pitch and brake systems is essential.'),
            bullet('sm14-s2-b12', 'Safety & Height Work: Working at height on wind turbines -- towers of 80-150m -- requires specialised training in personal protective equipment, fall protection, and emergency procedures.'),
            bullet('sm14-s2-b13', 'Data & Monitoring: Using SCADA systems and predictive maintenance software to monitor performance, identify anomalies, and plan maintenance interventions.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm14-s2-callout',
          variant: 'info',
          title: 'Wind Turbine Technician: One of the Fastest-Growing Jobs',
          body: 'Wind turbine service technician is consistently ranked among the fastest-growing job categories. In the US, employment in this role is projected to grow by 60% through 2032. The role combines electrical, mechanical, and IT skills with the unique physical demands of working at height in exposed environments -- typically requiring a GWO (Global Wind Organisation) basic safety training certificate.',
        },
      ],
    },

    // ── SECTION: Operations Workforce ────────────────────────────────────────
    {
      _id: 'sm14-sec-operations',
      title: 'Operations Workforce',
      slug: { _type: 'slug', current: 'renewables-operations-workforce' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'richText',
          _key: 'sm14-ops-text',
          content: [
            h2('sm14-ops-h1', 'Workforce Requirements for Operating Renewable Energy Facilities'),
            p('sm14-ops-p1', 'Once a renewable energy facility is commissioned, a dedicated operations workforce is required to ensure it runs safely, efficiently, and reliably throughout its operational life — which can span 25 to 30 years or more for wind and solar assets, and much longer for hydropower. The operations workforce encompasses a broad range of technical and managerial roles.'),
            h3('sm14-ops-h2', 'Core Operations Roles'),
            bullet('sm14-ops-b1', 'Operations Manager: Oversees the day-to-day running of a facility, managing staff, budgets, and performance targets. Responsible for ensuring compliance with health, safety, and environmental regulations, and for reporting performance to asset owners.'),
            bullet('sm14-ops-b2', 'Control Room Operators: Monitor facility performance in real time from a centralised control room, responding to alarms, adjusting operational parameters, and coordinating with grid operators. In large wind farms and solar parks, control room operators manage multiple assets simultaneously through SCADA systems.'),
            bullet('sm14-ops-b3', 'SCADA (Supervisory Control and Data Acquisition) Operators: Specialists in the digital systems that monitor and control renewable energy assets. They ensure data integrity, identify performance anomalies, and configure automated responses to changing conditions.'),
            bullet('sm14-ops-b4', 'Maintenance Planners: Develop and manage preventive maintenance schedules, ensuring that regular servicing is carried out to manufacturer specifications and that statutory inspections are completed on time. Work closely with maintenance technicians to coordinate access, parts, and resources.'),
            bullet('sm14-ops-b5', 'Instrumentation and Control (I&C) Engineers: Responsible for the sensors, control systems, and automation equipment that keep facilities running efficiently. Maintain, calibrate, and troubleshoot the instrumentation that feeds data to SCADA and monitoring systems.'),
            bullet('sm14-ops-b6', 'Supply Chain Managers: Manage procurement of spare parts, consumables, and specialist services required for ongoing operations. In the offshore wind sector, supply chain management involves coordinating marine vessel schedules, weather windows, and just-in-time parts delivery.'),
            h3('sm14-ops-h3', 'Support and Corporate Roles'),
            bullet('sm14-ops-b7', 'Finance and Budget Analysts: Track operational expenditure against budget, produce performance reports for investors and asset owners, and provide financial modelling for operational decisions such as whether to schedule a major repair or replace equipment.'),
            bullet('sm14-ops-b8', 'Human Resources and Training Coordinators: Manage workforce planning, recruitment, and training programmes for operational staff. In rapidly scaling organisations, ensuring that staff have the appropriate qualifications and certifications is a critical ongoing function.'),
            p('sm14-ops-p2', 'The operations workforce requires a combination of technical expertise, safety consciousness, and increasingly, digital literacy. As renewable energy assets become more sophisticated and connected, the ability to work effectively with data systems, automation, and remote monitoring tools is becoming as important as traditional engineering skills.'),
          ],
        },
      ],
    },

    // ── SECTION 3: Skills Gaps, Education & Emerging Roles ───────────────────
    {
      _id: 'sm14-sec-3-gaps',
      title: 'Skills Gaps, Education & Emerging Roles',
      slug: { _type: 'slug', current: 'skills-gaps-education' },
      estimatedMinutes: 20,
      content: [
        {
          _type: 'imageBlock', _key: 'sm14-s3-hero',
          image: localImage('Images/AdobeStock_1078594756.webp', 'Apprentices learning renewable energy skills'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm14-s3-text',
          content: [
            h2('sm14-s3-h1', 'Current Skills Gaps'),
            p('sm14-s3-p1', 'Already across the globe there is a shortage of individuals in several critical technical areas. The offshore wind sector faces perhaps the most acute shortages, particularly for:'),
            bullet('sm14-s3-b1', 'Marine Crew: Specialised vessels (jack-up ships, cable-laying vessels, heavy lift cranes) are in short supply, as is the crew trained to operate them.'),
            bullet('sm14-s3-b2', 'Solar PV Installers: Growing demand at all scales -- residential, commercial, and utility -- is outpacing the supply of qualified installation professionals in many countries.'),
            bullet('sm14-s3-b3', 'Grid Engineers: The rapid expansion of renewable capacity requires massive investment in grid reinforcement and new interconnectors, creating urgent demand for power systems engineers.'),
            bullet('sm14-s3-b4', 'Green Hydrogen Specialists: A rapidly emerging skills need for engineers and technicians with electrolyser, fuel cell, and hydrogen safety expertise.'),
            h2('sm14-s3-h2', 'Education & Apprenticeships'),
            p('sm14-s3-p2', 'Integrating renewable energy education into school curricula is beneficial for fostering awareness and inspiring the next generation of professionals. Extracurricular programmes such as science clubs and eco-teams can encourage students to explore renewable energy concepts practically from an early age.'),
            p('sm14-s3-p3', 'Apprenticeships provide valuable pathways for aspiring workers to gain practical, hands-on experience while earning a wage. In the solar sector, apprentices gain experience in residential and commercial PV projects, developing expertise in system design, installation, and troubleshooting. In wind energy, apprenticeships often include GWO safety training, electrical qualifications, and manufacturer-specific technical certifications.'),
            h2('sm14-s3-h3', 'Emerging Roles'),
            bullet('sm14-s3-b5', 'Energy Storage Specialists: Focus on the integration and optimisation of battery energy storage systems -- essential for managing the intermittency of wind and solar.'),
            bullet('sm14-s3-b6', 'AI & Data Analysts: Apply machine learning to turbine performance optimisation, predictive maintenance, grid forecasting, and renewable energy trading.'),
            bullet('sm14-s3-b7', 'Hydrogen Engineers: Design, build, and operate electrolysis plants, fuel cell systems, and hydrogen infrastructure.'),
            bullet('sm14-s3-b8', 'Offshore Wind Foundation Engineers: Specialist geotechnical and structural engineers for the complex foundation designs required by deepwater offshore wind projects.'),
            bullet('sm14-s3-b9', 'Corporate PPA & Energy Procurement Specialists: Structure the complex long-term contracts between renewable energy developers and corporate energy buyers.'),
            bullet('sm14-emerg-digital-twins', 'Digital Twin and Simulation Engineers: Create and maintain virtual models of renewable energy assets that replicate their real-world behaviour in real time. Simulation Engineers design the mathematical models, Data Analysts process the real-time sensor data that keeps digital twins current, and Digital Twin Developers build the software frameworks that integrate sensor data with control systems. Digital twins enable predictive maintenance, performance optimisation, and scenario testing without physical risk.'),
            bullet('sm14-emerg-smart-grid', 'Smart Grid Engineers: Design, implement, and manage the advanced electrical grid systems needed to integrate high proportions of variable renewable energy. This includes work on grid flexibility, demand response, energy storage integration, and the communications infrastructure that enables smart grid functionality.'),
            bullet('sm14-emerg-marine-bio', 'Marine Biologists: Increasingly in demand across offshore wind, wave, tidal, and marine cable projects to assess the impact of development on marine ecosystems, advise on mitigation measures, and conduct baseline and post-construction ecological surveys. Their expertise helps projects secure environmental consent and manage biodiversity obligations.'),
            bullet('sm14-emerg-sustainability', 'Sustainability Consultants: Advise organisations across the renewable energy supply chain on environmental, social, and governance (ESG) performance, circular economy practices, supply chain sustainability, biodiversity net gain, and the measurement and reporting of sustainability metrics to investors and regulators.'),
          ],
        },
        skillsGapChart,
        {
          _type: 'calloutBlock', _key: 'sm14-s3-callout',
          variant: 'warning',
          title: 'The Skills Shortage is a Real Constraint on Deployment',
          body: 'The renewable energy skills shortage is not a hypothetical future problem -- it is already constraining project delivery today. In the UK, offshore wind developers have warned that skills shortages could delay projects worth billions of pounds. In the US, the solar industry estimates it needs to double its installer workforce by 2030. Addressing this requires action now -- in schools, colleges, universities, and industry training programmes.',
        },
      ],
    },

    // ── SECTION 4: Diversity, Policy & Technology's Impact ────────────────────
    {
      _id: 'sm14-sec-4-diversity',
      title: 'Diversity, Policy & Technology\'s Impact on Jobs',
      slug: { _type: 'slug', current: 'skills-diversity-technology' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm14-s4-hero',
          image: localImage('Images/AdobeStock_1216716934.webp', 'Diverse renewable energy workforce'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm14-s4-text',
          content: [
            h2('sm14-s4-h1', 'Workforce Diversity'),
            p('sm14-s4-p1', 'Diversity in the renewable energy workforce is necessary for having sufficient resource to deliver the planned projects and to foster innovation. A diverse workforce brings together people with different perspectives, problem-solving approaches, and lived experiences -- leading to better solutions and broader community acceptance of renewable energy projects.'),
            p('sm14-s4-p2', 'The renewable energy sector has historically underrepresented women, ethnic minorities, and people from lower socioeconomic backgrounds. Active measures are required -- including targeted outreach in schools, paid apprenticeships, mentoring programmes, inclusive hiring practices, and family-friendly working arrangements. In the UK, there is a target of 33% female representation in offshore wind by 2030.'),
            h2('sm14-s4-h2', 'Policy Frameworks for Workforce Development'),
            p('sm14-s4-p3', 'Government policies for workforce development in the renewable energy sector are crucial in fostering the skilled workforce needed:'),
            bullet('sm14-s4-b1', 'National Renewable Energy Skills Strategies: Several countries have developed dedicated skills strategies to map future workforce needs, identify gaps, and coordinate training provision.'),
            bullet('sm14-s4-b2', 'Green Job Creation Initiatives: Part of broader climate policies like the EU Green Deal and the US Inflation Reduction Act, these initiatives seek to boost employment in clean energy sectors.'),
            bullet('sm14-s4-b3', 'International Collaboration: Partnerships between developed and developing countries on workforce training help build global capacity where it is most needed.'),
            h2('sm14-s4-h3', 'Technology\'s Impact on Renewable Energy Jobs'),
            p('sm14-s4-p4', 'Automation, drones, and artificial intelligence are significantly reshaping the renewable energy sector, altering the nature of jobs and the skills required. Drones are increasingly used for inspection and maintenance in wind farms and solar installations, replacing hazardous manual inspections and dramatically reducing costs. AI-driven predictive maintenance systems identify faults before they cause failures, optimising maintenance schedules.'),
            p('sm14-s4-p5', 'While automation may reduce demand for some routine manual roles, it simultaneously creates new opportunities in software development, data science, drone operation, and remote system monitoring. The net impact of technology on renewable energy employment is expected to be positive -- but the skills required are evolving rapidly, demanding continuous learning and upskilling throughout careers.'),
          ],
        },
        {
          _type: 'policyFrameworksDiagram' as const,
          _key: 'sm14-s4-policy-diagram',
          title: 'Policy Frameworks for Renewable Energy Workforce Development',
        },
        transferableSkillsChart,
        {
          _type: 'calloutBlock', _key: 'sm14-s4-callout',
          variant: 'key-fact',
          title: 'Seven Priorities for Renewable Energy Workforce Development',
          body: '1. Map and forecast skills needs. 2. Develop accessible training pathways. 3. Educate and engage young people from all backgrounds. 4. Support just transition for fossil fuel workers. 5. Attract diverse talent into the sector. 6. Invest in international cooperation. 7. Embed lifelong learning into sector culture. Addressing all seven simultaneously -- through coordinated action by industry, governments, and educational institutions -- is essential to building the workforce that the clean energy transition requires.',
        },
      ],
    },


    // ── SECTION 5: Apprenticeships, Safety Training & Global Initiatives ─────
    {
      _id: 'sm14-sec-5-training',
      title: 'Apprenticeships, Safety Training & Global Initiatives',
      slug: { _type: 'slug', current: 'skills-training-apprenticeships' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm14-s5-hero',
          image: localImage('Images/AdobeStock_1058423420.webp', 'Apprentice receiving safety training for renewable energy work'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm14-s5-text',
          content: [
            h2('sm14-s5-h1', 'Apprenticeships in Renewable Energy'),
            p('sm14-s5-p1', 'Apprenticeships in renewable energy provide a valuable pathway for aspiring workers to gain practical, hands-on experience while earning a wage. These programmes are essential for meeting the industry\'s growing demand for skilled labour, combining on-the-job training with formal education in renewable technology theory, safety regulations, and professional behaviours. Through apprenticeships, individuals can acquire the technical skills and certifications necessary to begin -- or transition into -- a career in the renewable energy sector.'),
            p('sm14-s5-p2', 'Apprenticeships typically follow a structured framework: apprentices work alongside experienced professionals in the workplace while attending classroom-based instruction at technical colleges or training centres, either as one or two days per week or in blocks of several weeks at a time. This dual approach ensures that apprentices develop both practical skills and a solid understanding of the scientific principles and safety regulations that govern the renewable energy industry.'),
            bullet('sm14-s5-b1', 'Solar PV Apprenticeships: Apprentices gain hands-on experience across residential and commercial solar projects, developing expertise in system design, installation, commissioning, and troubleshooting. Many programmes are aligned with or include the required licences to practise, ensuring apprentices are industry-ready upon completion.'),
            bullet('sm14-s5-b2', 'Wind Energy Apprenticeships: Wind apprenticeships typically include GWO (Global Wind Organisation) safety training, relevant electrical qualifications, and manufacturer-specific technical certifications. Apprentices learn to work safely at height, carry out preventive maintenance routines, and diagnose faults in mechanical and electrical systems.'),
            bullet('sm14-s5-b3', 'Just Transition Pathways: Apprenticeships provide a critical entry point for workers transitioning from traditional energy sectors -- such as oil, gas, and coal -- into greener careers. Just transition policies often emphasise apprenticeship programmes to retrain these workers, equipping them with the skills needed in the renewable energy landscape while allowing them to earn a wage during retraining.'),
            bullet('sm14-s5-b4', 'Government and Industry Partnerships: Many apprenticeship schemes are jointly developed and funded by governments and industry partners, ensuring that training content reflects real employer needs and that qualifications are directly relevant to available jobs.'),
            h2('sm14-s5-h2', 'Safety Training for Renewable Energy Workers'),
            p('sm14-s5-p3', 'Safety training for renewable energy workers is paramount, given the inherent risks involved in the installation and maintenance of renewable energy systems. Workers in the sector often operate at great heights, handle high-voltage electrical systems, and work in challenging environments -- exposed to the weather, in small teams, and in remote locations. Robust safety training is essential for minimising accidents and ensuring compliance with industry standards.'),
            h3('sm14-s5-h3', 'GWO Basic Safety Training'),
            p('sm14-s5-p4', 'The Global Wind Organisation (GWO) Basic Safety Training (BST) is the internationally recognised standard for entry-level safety competence in the wind energy sector. It is widely required by employers before workers are permitted to access wind turbines. The GWO BST covers five core modules:'),
            bullet('sm14-s5-b5', 'Working at Height: Training in personal protective equipment (PPE) including harnesses, fall arrest systems, and ropes. Covers safe climbing procedures, ladder safety, and emergency rescue from height.'),
            bullet('sm14-s5-b6', 'Sea Survival: Covers survival techniques for workers operating offshore or near open water, including donning immersion suits, liferaft operation, and helicopter underwater escape (HUEBA) awareness.'),
            bullet('sm14-s5-b7', 'First Aid: Practical first aid training covering casualty assessment, CPR, wound management, and how to manage emergencies in remote or offshore locations where medical assistance may be significantly delayed.'),
            bullet('sm14-s5-b8', 'Fire Awareness: Training in fire prevention, recognising fire hazards in turbines and substations, safe evacuation procedures, and the use of firefighting equipment appropriate for electrical and mechanical fires.'),
            bullet('sm14-s5-b9', 'Manual Handling: Safe lifting and handling techniques to prevent musculoskeletal injuries when working with heavy components in confined spaces such as turbine nacelles.'),
            h3('sm14-s5-h4', 'Offshore Safety: BOSIET Certification'),
            p('sm14-s5-p5', 'Workers accessing offshore platforms -- including offshore wind, tidal, or wave energy installations -- typically require BOSIET (Basic Offshore Safety Induction and Emergency Training) certification. BOSIET covers helicopter safety, offshore survival, firefighting, and first aid, and is mandatory across much of the offshore energy sector in Europe and beyond. For solar workers, additional training focuses on electrical safety, high-voltage systems, lockout/tagout procedures, and fall protection for roof-mounted and elevated-frame installations.'),
            {
              _type: 'calloutBlock', _key: 'sm14-s5-callout-safety',
              variant: 'warning',
              title: 'Safety is Non-Negotiable in Renewable Energy',
              body: 'Renewable energy worksites carry genuine safety risks: falls from height, electrical hazards, confined spaces, and remote offshore environments. In the wind sector, working at 80-150m above ground level without proper training and PPE is life-threatening. In the solar sector, DC electrical systems carry risks distinct from household AC. Safety training is not a box to tick -- it is a professional and legal obligation, and a prerequisite for any competent practitioner in the sector.',
            },
            h2('sm14-s5-h5', 'Global Training Initiatives'),
            p('sm14-s5-p6', 'Renewable energy global training initiatives support the building of a skilled workforce capable of addressing the growing demand for sustainable energy solutions worldwide. As the sector rapidly expands, there is increasing need for specialised knowledge across solar, wind, geothermal, and marine technologies. International programmes and collaborations play a central role in ensuring that professionals worldwide have access to the necessary training and education.'),
            bullet('sm14-s5-b10', 'IRENA\'s Global Renewable Energy Training Program: The International Renewable Energy Agency offers workshops and online courses targeting policymakers, engineers, and technicians from different countries, focusing on both technical skills and broader knowledge of energy systems, policies, and markets.'),
            bullet('sm14-s5-b11', 'Sustainable Energy for All (SEforALL): This international initiative helps bridge the gap between high-income and low-income countries by offering training programmes focused on implementing renewable energy solutions in underserved regions, enabling knowledge transfer from advanced markets to emerging ones.'),
            bullet('sm14-s5-b12', 'Just Energy Transition Partnerships (JETPs): International partnerships supporting fossil fuel-dependent economies -- such as South Africa and Indonesia -- to transition their energy sectors and workforces. South Africa\'s JETP specifically targets the retraining of coal miners and power station workers for roles in renewable energy manufacturing, installation, and operations.'),
            bullet('sm14-s5-b13', 'India\'s Solar Workforce Programmes: India has developed large-scale solar skills programmes aligned with its massive renewable energy expansion targets. Government-backed training centres and vocational programmes have trained hundreds of thousands of solar installers and technicians to support India\'s rapid solar deployment.'),
            bullet('sm14-s5-b14', 'Digital & E-Learning Platforms: Global training initiatives are adapting to technological advancements. E-learning platforms and virtual collaborations are making renewable energy education accessible to a wider audience, enabling individuals from diverse geographical locations to acquire the skills needed to contribute to the energy transition without relocating for training.'),
            p('sm14-s5-p7', 'Universities and research institutions across the world are also partnering with industry leaders to create specialised programmes that address regional energy challenges. Collaborations between developed and developing nations are particularly valuable, as they allow for technology transfer and knowledge sharing -- ensuring that the skills base for renewable energy development is truly global, not concentrated only in wealthy nations.'),
          ],
        },
        {
          _type: 'imageBlock', _key: 'sm14-s5-img2',
          image: localImage('Images/Logo_REN21.webp', 'REN21 global renewable energy network logo'),
          fullWidth: false,
        },
        {
          _type: 'calloutBlock', _key: 'sm14-s5-callout-global',
          variant: 'info',
          title: 'Training as a Tool for Just Transition',
          body: 'Apprenticeships and safety training programmes are not just about filling jobs -- they are instruments of equity. When well-designed and properly funded, they create accessible pathways into well-paid, skilled careers for people from all socioeconomic backgrounds, including workers transitioning out of fossil fuel industries. Countries that invest in inclusive, high-quality training infrastructure today will be far better positioned to deliver their renewable energy targets -- and to ensure that the benefits of the clean energy transition are widely shared.',
        },
      ],
    },

    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm14-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'skills-roles-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm14-conc-text',
          content: [
            h2('sm14-conc-h1', 'Sub-Module Summary'),
            p('sm14-conc-p1', 'This sub-module has examined the workforce dimension of the energy transition — arguably as important as the technologies themselves. IRENA projects that the renewable energy sector will employ 38 million people globally by 2030, up from 16.2 million today. This growth is unevenly distributed: wind turbine technician is among the fastest-growing job categories in the USA and Europe; solar installers, grid engineers, and battery storage specialists are in high demand across all major markets; and the offshore wind sector alone requires tens of thousands of trained marine and electrical engineers to deliver its ambitious deployment pipeline.'),
            p('sm14-conc-p2', 'The skills gap is a genuine and growing constraint on deployment speed. Manufacturing, construction, and maintenance roles require hands-on technical training that takes years to develop. Operations and asset management roles demand both engineering competence and digital literacy as turbines, solar plants, and storage assets become increasingly data-driven. The energy sector is competing for engineering graduates and technicians with automotive, digital, and defence industries — making workforce planning, pipeline development, and employer branding critical strategic priorities.'),
            p('sm14-conc-p3', 'Diversity — gender, socioeconomic, and geographic — is both a moral imperative and a practical necessity: the sector cannot meet its skills needs without attracting talent from the full breadth of society. Just transition principles require that workers from fossil fuel industries are given credible pathways into clean energy roles — oil and gas offshore technicians, for example, have highly transferable skills for the offshore wind sector. Apprenticeships, vocational training, university partnerships, and safety qualification frameworks are all essential infrastructure for building the workforce the energy transition demands. Renewables Connect exists at the heart of this challenge — developing the informed, skilled professionals who will deliver the energy future.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm14-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 14',
          body: 'You now have a thorough understanding of the renewable energy workforce — the roles, skills, gaps, diversity challenges, training pathways, and the just transition principles that must guide how we build the human capital the energy transition requires.',
        },
      ],
    },
    {
      _id: 'sm14-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'skills-roles-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm14-col-quiz',
          subModuleSlug: 'skills-roles',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
