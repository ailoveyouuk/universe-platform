// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 12: Carbon Capture & Storage
// Source: MOD1_SUB12_CARBONCAPTURE.pdf pages 3–27
//
// Phase 1 images served from /public/images/sm12/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  ccsCapacityChart,
  ccsCostChart,
  ccsProjectsChart,
  ccsNetZeroChart,
} from './sm12-charts'

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
function h3(key: string, text: string) {
  return {
    _type: 'block' as const, _key: key, style: 'h3' as const,
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
function localImage(filename: string, alt: string): ImageAsset {
  return { _type: 'image', asset: { _ref: `/images/sm12/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm12/${filename}` }
}

export const subModule12: SubModule = {
  _id: 'sm-12',
  title: 'SM 12 - Carbon Capture & Storage',
  slug: { _type: 'slug', current: 'carbon-capture' },
  orderIndex: 12,
  estimatedHours: 2,
  learningObjectives: [
    'Explain the purpose and role of Carbon Capture, Utilisation, and Storage (CCUS) in addressing climate change',
    'Describe how carbon capture works, including the four main capture technologies',
    'Explain the key methods of carbon storage, particularly geological storage',
    'Assess the financial viability of CCS, including capital costs, operating costs, and the role of carbon pricing',
    'Evaluate the public perceptions, policy frameworks, and regulatory landscape for CCS',
    'Understand the role of CCS in achieving net-zero goals, including Bioenergy with CCS (BECCS)',
    'Recognise the global dispersion of CCS projects and the importance of international collaboration',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction to CCS ────────────────────────────────────────
    {
      _id: 'sm12-sec-1-intro',
      title: 'Introduction to Carbon Capture & Storage',
      slug: { _type: 'slug', current: 'ccs-introduction' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'videoBlock', _key: 'sm12-s1-video',
          title: 'Carbon Capture and Storage (CCS) — Introduction',
          azureBlobUrl: '/videos/talking-heads/Carbon Capture and Storage (CCS).mp4',
        },
        {
          _type: 'imageBlock', _key: 'sm12-s1-hero',
          image: localImage('Images/AdobeStock_1033564756.webp', 'Industrial facility with carbon capture equipment'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm12-s1-text',
          content: [
            h2('sm12-s1-h1', 'What is CCUS?'),
            p('sm12-s1-p1', 'Carbon Capture, Utilisation, and Storage (CCUS) is a set of technologies that capture carbon dioxide (CO2) from industrial processes and power generation, then either store it permanently underground or utilise it to produce valuable products. CCUS is seen as a vital strategy in mitigating greenhouse gas emissions, particularly in industries with limited alternatives for decarbonisation.'),
            p('sm12-s1-p2', 'CCUS plays a crucial role in addressing climate change by significantly reducing CO2 emissions from major sources like cement factories, steel plants, chemical production facilities, and power stations. The integration of CCUS into a low-carbon future is considered essential for achieving deep emissions cuts -- complementing renewable energy sources in sectors where electrification is challenging.'),
            bullet('sm12-s1-b1', 'Direct Emissions Reduction: CCS captures CO2 at source before it enters the atmosphere, potentially reducing industrial emissions by up to 90%.'),
            bullet('sm12-s1-b2', 'Direct Air Capture (DAC): Emerging technology that removes CO2 directly from the ambient atmosphere -- enabling negative emissions and offsetting historical or dispersed sources.'),
            bullet('sm12-s1-b3', 'BECCS (Bioenergy with CCS): Combining bioenergy (which absorbs CO2 as biomass grows) with CCS creates genuine negative emissions -- actively removing CO2 from the atmosphere.'),
            h2('sm12-s1-h2', 'Why CCS is Necessary'),
            p('sm12-s1-p3', 'The IPCC consistently identifies CCS as a critical component of most cost-effective pathways to limiting global warming to 1.5 degrees C. Some industrial processes -- such as cement production (which releases CO2 as limestone is chemically transformed) and steel manufacturing -- produce CO2 from chemical reactions, not just energy use. No energy source switch can eliminate these process emissions; CCS is the only viable large-scale solution for these sectors.'),
          ],
        },
        ccsCapacityChart,
        {
          _type: 'calloutBlock', _key: 'sm12-s1-callout',
          variant: 'warning',
          title: 'Challenges in CCUS Implementation',
          body: 'Challenges in CCUS implementation include high initial capital costs, significant energy requirements (capture processes typically consume 15-30% of a power plant\'s output), public scepticism about underground storage safety, and the need for a complex regulatory and infrastructure framework. These challenges are real but are being addressed through technology development, policy support, and international collaboration.',
        },
      ],
    },

    // ── SECTION 2: How Carbon Capture Works ───────────────────────────────────
    {
      _id: 'sm12-sec-2-how',
      title: 'How Carbon Capture Works',
      slug: { _type: 'slug', current: 'ccs-how-it-works' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm12-s2-hero',
          image: localImage('Images/AdobeStock_1044492997.webp', 'Carbon capture plant diagram'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm12-s2-text',
          content: [
            h2('sm12-s2-h1', 'The CCS Process'),
            p('sm12-s2-p1', 'The CCS process has four main stages: capture, compression, transportation, and storage. Understanding each stage is essential to evaluating the technology\'s potential and limitations.'),
            h3('sm12-s2-h2', 'Stage 1: Capture'),
            p('sm12-s2-p2', 'CO2 is captured from emissions at source -- typically at large industrial facilities like power plants, cement factories, or chemical production units. There are four main capture technologies:'),
            bullet('sm12-s2-b1', 'Post-Combustion Capture: CO2 is separated from flue gases after fuel is burned. This is the most widely deployed approach and can be retrofitted to existing facilities. Amine absorption is the leading post-combustion technology, capturing up to 90% of CO2 from flue gas.'),
            bullet('sm12-s2-b2', 'Pre-Combustion Capture: Fuel is converted to a hydrogen-rich gas (syngas) before combustion, and CO2 is removed from the syngas rather than from exhaust gases. More complex but produces a clean hydrogen fuel.'),
            bullet('sm12-s2-b3', 'Oxyfuel Combustion: Fuel is burned in pure oxygen rather than air, producing a concentrated CO2 stream that is easier to capture.'),
            bullet('sm12-s2-b4', 'Direct Air Capture (DAC): CO2 is removed directly from ambient air using chemical sorbents. This is more energy-intensive than point-source capture but can offset dispersed emissions.'),
            h3('sm12-s2-h3', 'Amine Absorption in Detail'),
            p('sm12-s2-p3', 'Amine absorption is the most widely used carbon capture method for post-combustion applications. The process works in two steps: first, flue gas containing CO2 is passed through an amine solution, which chemically absorbs the CO2; then, the CO2-laden "rich" amine solution is heated in a regenerator, releasing a concentrated CO2 stream and regenerating the amine for reuse. The system can capture up to 90% of CO2 from flue gas, but requires significant heat energy for regeneration.'),
            h3('sm12-s2-h4', 'Stages 2-4: Compression, Transport & Storage'),
            p('sm12-s2-p4', 'Once captured, CO2 is compressed to a high-pressure "supercritical" state (similar to a liquid) for efficient transportation. It is then transported through pipelines -- similar to natural gas pipelines -- to a storage site. At the storage site, CO2 is injected deep underground (typically 800-3,000 metres) into geological formations such as saline aquifers or depleted oil and gas fields.'),
          ],
        },
        {
          _type: 'liquefiedCO2CarrierDiagram' as const,
          _key: 'sm12-s2-carrier',
          title: 'Liquefied CO₂ Carrier Designs — Three Pressure Regimes',
          caption: 'The three main vessel types used for maritime CO₂ transport differ in operating pressure, temperature, and tank design. Medium-pressure vessels (adapted from LPG tankers) are the most commercially mature; elevated- and low-pressure designs are in the approval pipeline.',
        },
        {
          _type: 'calloutBlock', _key: 'sm12-s2-callout',
          variant: 'info',
          title: 'Geological Storage: How Long Does it Last?',
          body: 'Geological storage is the most proven method of CO2 storage. CO2 injected into deep saline aquifers is trapped by multiple mechanisms -- structural trapping (under impermeable caprock), dissolution in brine, mineralisation (CO2 reacting with rock to form stable carbonate minerals), and capillary trapping. Once mineralised, the CO2 is effectively permanent. The Sleipner project in Norway has safely stored CO2 underground since 1996 -- the world\'s first dedicated CCS project.',
        },
      ],
    },

    // ── SECTION 3: CCUS & Financial Viability ────────────────────────────────
    {
      _id: 'sm12-sec-3-economics',
      title: 'CCUS Technologies, Economics & Case Studies',
      slug: { _type: 'slug', current: 'ccs-economics-cases' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock', _key: 'sm12-s3-hero',
          image: localImage('Images/AdobeStock_869256758.webp', 'Carbon capture economic analysis'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm12-s3-text',
          content: [
            h2('sm12-s3-h1', 'Carbon Utilisation: Converting CO2 into Products'),
            p('sm12-s3-p1', 'Carbon Utilisation focuses on converting captured CO2 into valuable products rather than simply storing it. This approach can enhance the economic viability of carbon capture by generating revenue streams:'),
            bullet('sm12-s3-b1', 'CO2-to-Fuels: Captured CO2 can be combined with green hydrogen to produce synthetic hydrocarbons -- known as e-fuels or synthetic fuels. These can serve as drop-in replacements for jet fuel, diesel, or methane.'),
            bullet('sm12-s3-b2', 'CO2-to-Building Materials: Mineralisation processes use CO2 to produce carbonate minerals that can be incorporated into concrete and other construction materials, permanently storing carbon in buildings.'),
            bullet('sm12-s3-b3', 'CO2 for Enhanced Oil Recovery (EOR): Injecting CO2 into oil reservoirs to improve oil extraction -- a controversial application that generates revenue but also more fossil fuel combustion.'),
            h2('sm12-s3-h2', 'Financial Viability of CCS'),
            p('sm12-s3-p2', 'CCS faces significant financial challenges. Capital expenditure for a CCS facility is substantial -- a large post-combustion capture plant can cost $500 million to $1 billion to install. Operating costs include the energy penalty (15-30% of power plant output), solvent replacement, monitoring, and pipeline transport. Total costs per tonne of CO2 avoided range from $25/tonne (for concentrated industrial streams) to over $300/tonne for direct air capture.'),
            p('sm12-s3-p3', 'Carbon pricing is a key enabler of CCS economics. The EU Emissions Trading System (ETS) reached carbon prices above $100/tonne CO2 in 2022-23, making CCS viable for some industrial applications. The US 45Q tax credit provides $85/tonne for geological storage and $60/tonne for utilisation. The UK and other countries are introducing similar incentives.'),
            h2('sm12-s3-h3', 'Case Study: Sleipner Gas Field'),
            p('sm12-s3-p4', 'For nearly 30 years, Equinor and partners have been separating CO2 from gas extracted at the Sleipner field in the Norwegian North Sea and injecting it into the Utsira Sand formation more than 800 metres below the seabed. After injection, the CO2 is trapped under a shale caprock which acts as a seal, preventing the CO2 from ascending. Since 1996, over 22 million tonnes of CO2 have been safely stored at Sleipner -- demonstrating the long-term viability and safety of geological CCS.'),
          ],
        },
        ccsCostChart,
        ccsProjectsChart,
      ],
    },

    // ── SECTION 4: Policy, Regulation & Net-Zero ──────────────────────────────
    {
      _id: 'sm12-sec-4-policy',
      title: 'Policy, Regulation & CCS for Net-Zero',
      slug: { _type: 'slug', current: 'ccs-policy-net-zero' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm12-s4-hero',
          image: localImage('Images/AdobeStock_1265590803.webp', 'Climate policy and net-zero goals'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm12-s4-text',
          content: [
            h2('sm12-s4-h1', 'Public Perceptions of CCS'),
            p('sm12-s4-p1', 'Public perception of CCS plays a crucial role in its adoption and implementation. Many people view CCS with scepticism due to concerns over safety, efficacy, and environmental impact. Concerns include the risk of CO2 leakage from storage sites, whether CCS will be used to justify continued fossil fuel use, and whether costs will be passed on to consumers.'),
            p('sm12-s4-p2', 'High-profile critics -- including former US climate envoy John Kerry -- have questioned whether CCS is scalable and affordable at the pace required. Building public trust requires transparent communication about storage site monitoring, long-term liability frameworks, and governance arrangements.'),
            h2('sm12-s4-h2', 'Policy Frameworks & Incentives'),
            p('sm12-s4-p3', 'Supportive policies are essential for CCS deployment. Key policy mechanisms include:'),
            bullet('sm12-s4-b1', 'EU ETS and Carbon Border Adjustment: High carbon prices in the EU ETS make CCS increasingly economically attractive for heavy industry. The EU\'s Innovation Fund provides dedicated CCS project support.'),
            bullet('sm12-s4-b2', 'US 45Q Tax Credit: Provides $85/tonne for geological CO2 storage and $60/tonne for utilisation, significantly improving CCS project economics.'),
            bullet('sm12-s4-b3', 'UK CCS Infrastructure Fund: The UK government is supporting four industrial cluster CCS projects, aiming to capture 6 Mt CO2/year by 2030.'),
            h2('sm12-s4-h3', 'CCS and Net-Zero Goals'),
            p('sm12-s4-p4', 'CCS is a crucial technology in achieving global net-zero goals. It directly addresses industries that are technically difficult to decarbonise through other means. BECCS -- bioenergy with carbon capture and storage -- creates genuinely negative emissions: biomass absorbs CO2 during growth, and when burned for energy, the CO2 is captured and stored underground rather than released.'),
            p('sm12-s4-p5', 'The IPCC AR6 report found that most 1.5 degree C scenarios rely on CCS removing 3-16 Gt of CO2 per year by 2050. Today\'s global CCS capacity of around 50 Mt/year means the world needs to scale CCS deployment by 60-300 times in the next 25 years -- an enormous but not impossible challenge given the pace of development in the sector.'),
          ],
        },
        ccsNetZeroChart,
        {
          _type: 'calloutBlock', _key: 'sm12-s4-callout',
          variant: 'info',
          title: 'International Collaboration: Essential for CCS Scale-Up',
          body: 'No country can develop all the necessary CCS expertise, geology, and markets alone. International collaboration -- through the Clean Energy Ministerial, the Global CCS Institute, Mission Innovation, and bilateral agreements -- is pooling resources, avoiding duplication, and coordinating global strategies for scaling CCS deployment. Countries with strong CCS knowledge, like Norway and the UK, are actively sharing expertise with emerging CCS markets.',
        },
      ],
    },


    // ── SECTION 5: Safety, Regulation & Public Perceptions ───────────────────
    {
      _id: 'sm12-sec-5-safety',
      title: 'Safety, Regulation & Public Perceptions',
      slug: { _type: 'slug', current: 'ccs-safety-regulation-perceptions' },
      estimatedMinutes: 30,
      content: [
        {
          _type: 'imageBlock', _key: 'sm12-s5-hero',
          image: localImage('Images/CCS EMPTY PROMISE.webp', 'Greenpeace CCS Empty Promise projection on an industrial building'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm12-s5-text',
          content: [
            h2('sm12-s5-h1', 'Public Perceptions of CCS'),
            p('sm12-s5-p1', 'Public perception of Carbon Capture and Storage plays a crucial role in its adoption and implementation. Many people view CCS with scepticism due to concerns over safety, efficacy, and environmental impact. Misconceptions often arise from a lack of understanding of how CCS works. Some fear that stored carbon dioxide could leak and cause environmental harm, while others question its ability to significantly mitigate climate change. The core challenge is that most people are simply unaware of carbon capture and cannot make an informed decision either way.'),
            p('sm12-s5-p2', 'Conservation groups see carbon capture as an excuse to slow emissions cuts and to "greenwash" continued fossil fuel use. They argue that the promise of CCS may actually be encouraging further fossil fuel investment rather than accelerating the transition away from it. Communities located near proposed capture, transport, or storage sites have raised safety concerns -- though CO₂ is a relatively inert substance, and the concerns are largely due to insufficient information rather than a well-evidenced safety risk.'),
            p('sm12-s5-p3', 'Addressing these concerns requires transparent communication from policymakers and scientists, ensuring the public understands the rigorous safety measures in place -- including geological assessments for storage sites, continuous monitoring, and long-term liability frameworks. Stakeholders must engage communities in decision-making processes, particularly those near proposed infrastructure, to build trust and address local concerns. Highlighting CCS\'s role in reducing industrial emissions that are genuinely difficult to mitigate otherwise can help shift public perception positively.'),
            h2('sm12-s5-h2', 'Safety Measures in CCS Projects'),
            p('sm12-s5-p4', 'Safety measures in CCS projects are critical, as with all large-scale industrial infrastructure. CO₂ as a gas is not poisonous, but high concentrations can displace available oxygen and cause asphyxiation in enclosed spaces. Liquid CO₂ is widely used in food preservation, fire extinguishers, and commercial food processing -- it is not considered harmful except at very low temperatures.'),
            bullet('sm12-s5-b1', 'Advanced Materials: Pipelines and storage tanks are constructed from advanced materials specifically selected to resist corrosion and mechanical failure under high-pressure CO₂ environments. Innovations such as fibre-reinforced polymers provide enhanced durability compared to conventional steel pipelines.'),
            bullet('sm12-s5-b2', 'Risk Assessment Modelling: Computational risk models are used to predict potential hazards -- including the potential migration of CO₂ to the surface or leakage into groundwater -- and to inform the selection of storage sites with adequate geological sealing capacity and structural stability.'),
            bullet('sm12-s5-b3', 'Continuous Monitoring: To ensure CO₂ is not lost to the atmosphere during capture, transport, or long-term storage, comprehensive monitoring systems are deployed at all stages. This monitoring capability, while drawing on established industrial gas monitoring practices, is still developing with significant opportunities for improvement.'),
            bullet('sm12-s5-b4', 'Emergency Response Protocols: Strict operational protocols are in place to ensure that any detected leaks or anomalies are rapidly addressed. Emergency response plans -- including evacuation procedures and containment protocols -- are established and regularly tested.'),
            bullet('sm12-s5-b5', 'International Standards: Regulatory frameworks require regular compliance audits, including adherence to international standards such as ISO 27914, which outlines requirements for long-term geological storage of CO₂.'),
            h2('sm12-s5-h3', 'Regulation of CCS'),
            p('sm12-s5-p5', 'The regulation of CCS is critical to ensuring its safe and effective deployment. CCS projects span capture, transportation, injection, and long-term storage of CO₂ -- each requiring multiple layers of regulatory oversight to ensure environmental safety, public health, and legal accountability.'),
            h3('sm12-s5-h4', 'International Regulatory Frameworks'),
            p('sm12-s5-p6', 'At the international level, organisations such as the IEA and the UNFCCC provide overarching frameworks and guidance for CCS projects. The London Protocol -- an international treaty regulating the disposal of waste into the sea -- has been amended to allow sub-seabed storage of CO₂, providing a regulatory pathway for offshore CCS projects where storage would occur in international waters.'),
            h3('sm12-s5-h5', 'EU and National Regulations'),
            bullet('sm12-s5-b6', 'European Union: The EU Directive on the Geological Storage of Carbon Dioxide (2009/31/EC) establishes requirements for the safe storage of CO₂, covering site selection, monitoring, closure procedures, environmental impact assessments, liability provisions, and public participation in decision-making.'),
            bullet('sm12-s5-b7', 'United States: The Environmental Protection Agency (EPA) oversees CCS through its Class VI Well Programme under the Safe Drinking Water Act, ensuring injected CO₂ does not contaminate underground drinking water. The Pipeline and Hazardous Materials Safety Administration (PHMSA) separately regulates CO₂ transport pipelines.'),
            bullet('sm12-s5-b8', 'Canada: CCS regulation is shared between federal and provincial governments. Alberta\'s Carbon Capture and Storage Statutes Amendment Act governs pore space ownership, liability, and monitoring -- providing legal certainty for long-term storage.'),
            bullet('sm12-s5-b9', 'Australia: The Offshore Petroleum and Greenhouse Gas Storage Act governs offshore CCS activities, with stringent monitoring and verification requirements for long-term storage integrity.'),
            bullet('sm12-s5-b10', 'Norway: CCS is regulated by a combination of national laws and EU Directive provisions, despite Norway not being an EU member. This framework has facilitated the successful operation of the Sleipner and Snøhvit projects, internationally recognised as CCS benchmarks.'),
            h2('sm12-s5-h6', 'Policy Frameworks & Incentives'),
            p('sm12-s5-p7', 'Supportive policies are essential to make CCS commercially viable. The deployment of CCS depends heavily on financial incentives that bridge the gap between CCS costs and the carbon price that industrial operators actually face.'),
            bullet('sm12-s5-b11', 'US 45Q Tax Credit: Provides $85 per tonne of CO₂ for geological storage and $60 per tonne for utilisation, making CCS financially viable for a broad range of US industrial applications and driving rapid growth in American CCS project development.'),
            bullet('sm12-s5-b12', 'EU Emissions Trading System (ETS): The EU ETS prices carbon, making CO₂ emissions economically costly for heavy industry. The EU Innovation Fund provides dedicated grant funding for large-scale CCS projects. The Carbon Border Adjustment Mechanism (CBAM) extends carbon pricing to imports, incentivising decarbonisation in global supply chains.'),
            bullet('sm12-s5-b13', 'UK CCS Support: The UK government has made £1 billion available for CCS infrastructure through a two-track process, with two industrial cluster projects financially supported in each track to unlock private investment. The UK aims to capture 6 Mt CO₂/year by 2030 through industrial clusters in the North of England and Scotland.'),
            bullet('sm12-s5-b14', 'Norway: Long-standing support through government subsidies and the national carbon tax regime has enabled flagship projects including Sleipner and the Northern Lights storage hub.'),
            bullet('sm12-s5-b15', 'Canada: Alberta and Saskatchewan lead domestically, supported by the Alberta Carbon Trunk Line as a demonstration of carbon pricing-driven CCS. Canada offers tax incentives and funding for CCS in oil sands and power generation.'),
            p('sm12-s5-p8', 'Globally, carbon pricing mechanisms are expanding. The head of the World Trade Organization has noted 78 different carbon pricing and taxation mechanisms worldwide. Income from global carbon pricing schemes surpassed $100 billion in 2023 -- a record -- providing growing financial signals for CCS investment. Countries with strong financial incentives, whether tax credits or carbon pricing, have made the most significant strides in CCS deployment.'),
          ],
        },
        {
          _type: 'carbonPriceTableDiagram' as const,
          _key: 'sm12-s5-carbon-price',
          title: 'Global Carbon Market Prices — Compliance & Voluntary Markets',
          caption: 'Carbon prices vary enormously by scheme — from under $10/tonne in the Chinese national ETS to over €60/tonne in the EU ETS. Voluntary offset prices are far lower but also far more variable. Higher carbon prices make CCS economically attractive for industrial operators.',
        },
        {
          _type: 'calloutBlock', _key: 'sm12-s5-callout',
          variant: 'warning',
          title: 'Building Trust: The Human Dimension of CCS',
          body: 'The technical and regulatory frameworks for CCS are increasingly mature. The human dimension -- building genuine public understanding and community trust -- is now one of the most important factors in project success. Communities near proposed CCS infrastructure have legitimate interests that must be addressed. Projects that engage local stakeholders early, provide transparent information, and offer genuine participation in decision-making consistently achieve better outcomes than those that treat public engagement as a regulatory checkbox. CO₂ is far safer to manage than the fossil fuels it replaces -- but that case must be made clearly and honestly.',
        },
      ],
    },

    // ── SECTION 6: CCS in the Energy Sector & Global Deployment ──────────────
    {
      _id: 'sm12-sec-6-global',
      title: 'CCS in the Energy Sector & Global Deployment',
      slug: { _type: 'slug', current: 'ccs-energy-sector-global' },
      estimatedMinutes: 35,
      content: [
        {
          _type: 'globalCCSMap', _key: 'sm12-s6-hero',
          title: 'Global Distribution of CCS Projects',
        },
        {
          _type: 'richText', _key: 'sm12-s6-text',
          content: [
            h2('sm12-s6-h1', 'CCS in the Energy Sector'),
            p('sm12-s6-p1', 'The integration of CCS with fossil fuel energy sources -- coal and natural gas power plants -- allows for the continued use of this infrastructure while minimising environmental impact. This is not simply pragmatic; it is necessary. The already-spent capital investment in global fossil fuel infrastructure, combined with the billions of people who depend on it for reliable power, means that an effective way to mitigate the emissions from existing capacity is essential during the energy transition.'),
            p('sm12-s6-p2', 'CCS can complement renewable energy by providing a reliable back-up source of power when renewable output is low due to weather conditions. This firming role enhances energy security and grid stability, allowing a higher penetration of variable renewables without compromising reliability. Most populations today still require the continuous power output that fossil fuel plants provide -- CCS allows those plants to operate with dramatically lower emissions.'),
            h3('sm12-s6-h2', 'BECCS: Creating Negative Emissions'),
            p('sm12-s6-p3', 'One of the most powerful applications of CCS in the energy sector is Bioenergy with Carbon Capture and Storage (BECCS). In BECCS, biomass (such as sustainably grown energy crops, agricultural residues, or forestry waste) absorbs CO₂ from the atmosphere as it grows. When this biomass is burned to generate electricity or heat, the CO₂ released is captured and stored permanently underground rather than returned to the atmosphere. The net result is a genuine removal of CO₂ from the atmosphere -- negative emissions -- while simultaneously producing clean energy.'),
            p('sm12-s6-p4', 'BECCS represents one of the most important negative emissions technologies identified in IPCC scenarios for limiting warming to 1.5°C. It allows CCS to go beyond merely reducing emissions -- it actively removes historical CO₂ from the atmosphere, potentially helping to reverse some of the accumulated damage of past fossil fuel use.'),
            h2('sm12-s6-h3', 'CCS and Net-Zero Goals'),
            p('sm12-s6-p5', 'CCS is a crucial technology in achieving global net-zero goals. Net-zero refers to the balance between the amount of greenhouse gases emitted and the amount removed from the atmosphere. CCS helps achieve this balance by capturing CO₂ at source -- from power plants and industrial facilities -- and storing it underground, preventing it from contributing to warming.'),
            p('sm12-s6-p6', 'The 2023 IEA Net Zero by 2050 Roadmap estimated that CCUS contributes approximately 8% of the total CO₂ mitigation needed in the energy sector by 2050. This may appear modest, but represents a vast absolute quantity of CO₂ -- and covers the most technically difficult emissions to reduce by other means. Not all sectors can fully decarbonise through electrification and renewable energy alone. Industries like cement, steel, and chemicals produce large quantities of CO₂ from chemical reactions inherent to their processes -- CCS is the only scalable solution for these residual process emissions.'),
            bullet('sm12-s6-b1', 'Hard-to-Abate Industries: CCS directly addresses cement, steel, chemical, and refinery emissions -- sectors where the CO₂ is a by-product of chemical reactions rather than energy combustion, making fuel switching insufficient on its own.'),
            bullet('sm12-s6-b2', 'Economic Stability: CCS allows countries with significant fossil fuel resources to participate in the energy transition without jeopardising economic stability, maintaining export revenues and employment while progressively reducing emissions intensity.'),
            bullet('sm12-s6-b3', 'Bridge Technology: CCS serves as a bridge between current energy systems dominated by fossil fuels and a future renewable-driven economy -- a medium-term solution that buys time for the full decarbonisation infrastructure to be built.'),
            h2('sm12-s6-h4', 'International Collaboration in CCS'),
            p('sm12-s6-p7', 'No country can effectively develop and scale CCS in isolation. The technology requires enormous capital investment, specialised geological expertise, regulatory coordination across jurisdictions, and shared infrastructure. International collaboration -- through research partnerships, shared pilot projects, and coordinated policy frameworks -- is essential to accelerating deployment and reducing costs globally.'),
            bullet('sm12-s6-b4', 'Carbon Sequestration Leadership Forum (CSLF) and Mission Innovation: International platforms that bring together governments, industry, and research institutions to share best practices, technical data, and policy approaches. These forums avoid duplication of research efforts and coordinate global strategies for scaling CCS.'),
            bullet('sm12-s6-b5', 'EU Horizon Europe: The EU funds multinational CCS research projects through Horizon Europe. The US, Canada, Norway, and Japan participate in research partnerships that contribute to a global CCS knowledge base, testing technologies under different geographical and geological conditions.'),
            bullet('sm12-s6-b6', 'Northern Lights Project: Norway is developing a CO₂ storage hub in the North Sea that will accept CO₂ from industrial facilities across multiple European countries, transported by ship. This cross-border infrastructure demonstrates how shared storage can serve countries that lack suitable geology for domestic storage.'),
            bullet('sm12-s6-b7', 'EU CO₂ Pipeline Network: Europe is developing plans for a network of CO₂ transport pipelines connecting high-emission industrial zones to geological storage sites, including shared storage in the North Sea, the Mediterranean, and the Iberian peninsula.'),
            bullet('sm12-s6-b8', 'Global CCS Institute: Works globally to disseminate research findings and provide guidance to policymakers in developing nations, ensuring that CCS knowledge is accessible to emerging economies that cannot afford to replicate costly research programmes independently.'),
            bullet('sm12-s6-b9', 'Public-Private Partnerships: Multinational energy companies collaborate with universities and national laboratories to develop advanced capture technologies and efficient storage methods, bridging the gap between academic research and commercial deployment.'),
            h2('sm12-s6-h5', 'Global Dispersion of CCS Projects'),
            p('sm12-s6-p8', 'The global deployment of CCS is highly uneven, reflecting differences in geology, industrial emissions profiles, energy policy, and financial resources. Regions with existing fossil fuel infrastructure and favourable geology are currently leading deployment, while many developing countries face significant barriers.'),
            h3('sm12-s6-h6', 'Leading Regions'),
            bullet('sm12-s6-b10', 'United States and Canada: Global leaders in CCS deployment, with extensive oil and gas industry expertise and infrastructure. The US Petra Nova coal plant in Texas and Illinois Industrial CCS Project were early large-scale initiatives. Favourable geology -- depleted oil fields and saline aquifers -- provides abundant storage capacity. The Alberta Carbon Trunk Line in Canada is a major demonstration of CO₂ transport infrastructure at scale.'),
            bullet('sm12-s6-b11', 'Norway and the UK: Norway\'s North Sea geology offers ideal CO₂ storage conditions. The Sleipner project (operational since 1996) and Snøhvit project are internationally recognised CCS benchmarks. The UK is developing carbon storage hubs in the North Sea as a cornerstone of its net-zero strategy, with the Northern Lights project providing cross-border storage capacity for European partners.'),
            bullet('sm12-s6-b12', 'China: Sees CCS as essential to achieving carbon neutrality and is investing in large-scale pilot projects in coal-fired power and steel production sectors. China had significant CCS capacity in development as of 2024, with government support through the National Development and Reform Commission.'),
            bullet('sm12-s6-b13', 'Australia: Developing CCS alongside its significant fossil fuel export sector. The Gorgon CO₂ Injection Project in Western Australia aims to store CO₂ from natural gas production in offshore reservoirs -- one of the largest CCS projects in operation globally.'),
            h3('sm12-s6-h7', 'Regions Facing Barriers'),
            p('sm12-s6-p9', 'Despite these advances, many regions face substantial barriers to CCS deployment. Developing countries often lack the financial resources, infrastructure, and technical expertise needed to implement CCS at scale. Geological suitability for CO₂ storage is not uniformly distributed globally -- some regions lack the deep saline formations or depleted oil fields necessary for safe long-term storage. Political will and robust carbon pricing are also critical enablers: regions with strong climate policies and carbon pricing consistently achieve faster CCS deployment than those without.'),
            p('sm12-s6-p10', 'Countries in Sub-Saharan Africa and Southeast Asia, which may have significant industrial CO₂ emissions, face both financial and policy barriers to CCS adoption. International cooperation, technology transfer, and financial support from developed nations and multilateral institutions will be essential to ensure that CCS can be deployed in these regions as part of a globally equitable energy transition.'),
          ],
        },
        {
          _type: 'northSeaMap', _key: 'sm12-s6-nsta',
          title: 'North Sea: Oil & Gas Fields, Wind Zones & CO₂ Storage Sites',
          caption: 'Interactive map showing key North Sea infrastructure. Toggle layers to explore oil & gas fields (NSTA), offshore wind lease areas (Crown Estate / RVO), and CO₂ storage developments (Global CCS Institute / NSTA 2024).',
        },
        {
          _type: 'imageBlock', _key: 'sm12-s6-collab',
          image: localImage('Images/INTERNATIONAL_COLLAB.webp', 'International collaboration agreement signed at the Greenhouse Gas Technology Conference'),
          fullWidth: false,
        },
        {
          _type: 'calloutBlock', _key: 'sm12-s6-callout',
          variant: 'info',
          title: 'The Scale of the Challenge: 60-300x Scale-Up Required',
          body: 'The IPCC AR6 report found that most 1.5°C scenarios rely on CCS removing 3-16 Gt of CO₂ per year by 2050. Today\'s global CCS capacity is approximately 50 Mt per year -- meaning the world needs to scale CCS deployment by 60 to 300 times in the next 25 years. This is an enormous but not unprecedented industrial scale-up challenge. Wind and solar power have achieved comparable percentage growth rates. The key ingredients -- supportive policy, sustained investment, international coordination, and technology learning curves -- are all present and accelerating.',
        },
      ],
    },

    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm12-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'carbon-capture-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm12-conc-text',
          content: [
            h2('sm12-conc-h1', 'Sub-Module Summary'),
            p('sm12-conc-p1', 'This sub-module has examined Carbon Capture, Utilisation and Storage (CCUS) — a technology cluster that most credible net-zero scenarios identify as essential, particularly for decarbonising sectors where direct substitution of fossil fuels is impractical. CCUS works by capturing CO₂ at the point of emission (post-combustion, pre-combustion, or oxy-fuel combustion), compressing and transporting it, and permanently storing it in geological formations — typically depleted oil and gas reservoirs or saline aquifers. When combined with biomass energy, BECCS can achieve negative emissions, actively removing CO₂ from the atmosphere.'),
            p('sm12-conc-p2', 'The economics of CCUS remain the primary barrier to widespread deployment. Capture costs typically range from $50 to over $300 per tonne of CO₂ depending on the application and concentration of the source stream; point-source capture from high-concentration industrial processes (cement, steel, hydrogen production) is considerably cheaper than dilute flue gas or direct air capture. The IEA estimates that CCUS capacity must grow 60–300 times from today\'s levels to meet net-zero scenarios — an enormous scale-up challenge that demands sustained policy support, carbon pricing, and infrastructure investment. The UK\'s East Coast Cluster and Norway\'s Northern Lights project represent the most advanced integrated CCUS hubs currently in development.'),
            p('sm12-conc-p3', 'Safety and public acceptance are critical dimensions of CCUS deployment. Geological storage integrity, long-term monitoring requirements, and liability frameworks must all be robustly established before communities will accept CO₂ storage beneath their land and waters. The regulatory landscape is evolving — with the London Protocol amendments enabling offshore CO₂ storage, and national frameworks being developed across Europe, the USA, and Australia. CCUS is not a substitute for reducing emissions at source, but as part of a balanced portfolio alongside rapid renewable deployment and efficiency improvement, it plays an irreplaceable role in achieving deep decarbonisation of the global economy.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm12-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 12',
          body: 'You now have a solid grounding in carbon capture and storage — how it works, its economics, the policy frameworks enabling it, safety and public acceptance considerations, and its critical role in decarbonising hard-to-abate industrial sectors.',
        },
      ],
    },
    {
      _id: 'sm12-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'carbon-capture-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm12-col-quiz',
          subModuleSlug: 'carbon-capture',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
