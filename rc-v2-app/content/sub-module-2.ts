// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 2: Global Race to Net Zero
// Source: PDF pages 3–25 (verbatim text — do not edit without updating source)
//
// Phase 1 images are served from /public/images/sm2/
// Copy source files from: Platform_Dev/Module Assets/Sub-Module 2/Images/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  netZeroTargetsChart,
  renewableInvestmentChart,
  evGlobalSalesChart,
  canadaTargetsChart,
} from './sm2-charts'

// ── Portable Text block helpers ───────────────────────────────────────────────

function p(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function h2(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'h2' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function h3(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'h3' as const,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

function bullet(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    listItem: 'bullet' as const,
    level: 1,
    children: [{ _type: 'span' as const, _key: `${key}s`, text, marks: [] as string[] }],
    markDefs: [] as never[],
  }
}

// ── Image helper ──────────────────────────────────────────────────────────────

function localImage(filename: string, alt: string): ImageAsset {
  return {
    _type: 'image',
    asset: { _ref: `/images/sm2/${filename}`, _type: 'reference' },
    alt,
    localSrc: `/images/sm2/${filename}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 2 Data
// ─────────────────────────────────────────────────────────────────────────────

export const subModule2: SubModule = {
  _id: 'sm-2',
  title: 'SM 2 — Global Race to Net Zero',
  slug: { _type: 'slug', current: 'global-race-to-net-zero' },
  orderIndex: 2,
  estimatedHours: 2,
  learningObjectives: [
    'Understand how governments, regions, and companies are working to reduce their carbon emissions',
    'Recognise the major international agreements and commitments attempting to limit carbon production',
    'Identify the key technologies and innovations accelerating the transition to Net Zero',
    'Describe the financial mechanisms and policy frameworks supporting the Net Zero race',
    'Understand how society — through public opinion, industry, and urban planning — is contributing to Net Zero',
    'Gain knowledge to explore individual renewable energies and why they are needed',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Introduction (PDF pp. 3–4) ─────────────────────────────────
    {
      _id: 'sm2-sec-1-intro',
      title: 'Introduction to the Global Race for Net Zero',
      slug: { _type: 'slug', current: 'introduction-global-race-net-zero' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'videoBlock', _key: 'sm2-s1-video',
          title: 'The Global Race for Net Zero — Introduction',
          azureBlobUrl: '/videos/talking-heads/The Global Race for Net Zero.mp4',
        },
        {
          _type: 'imageBlock',
          _key: 'sm2-s1-hero',
          image: localImage('Images/AdobeStock_1033564654_BLURRED.webp', 'Global Race to Net Zero'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s1-intro-text',
          content: [
            h2('sm2-s1-h1', 'Welcome to Sub-Module 2: Global Race for Net Zero'),
            p('sm2-s1-p1', 'Following on from Sub-Module 1\'s exploration of greenhouse gas emissions and their impact on our climate, this sub-module takes the next step: examining what the world is actually doing about it. The global race for Net Zero is one of the most defining challenges — and opportunities — of our era.'),
            p('sm2-s1-p2', 'Across this sub-module you will explore the commitments being made by national governments, corporations, and international organisations; the landmark agreements that have shaped the climate agenda; the technologies driving the transition; and the financial, policy, and social mechanisms that are accelerating — or in some cases, hindering — progress towards Net Zero.'),
            p('sm2-s1-p3', 'By the end of this sub-module, you should have a clear picture of the scale of ambition behind the Net Zero movement, the tools at our disposal, and the very real challenges that lie ahead.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s1-objectives',
          variant: 'info',
          title: 'Learning Objectives',
          body: 'By completing this sub-module, you should be able to: understand how governments, regions and companies are reducing emissions; recognise the key international agreements; explore the technologies and financial incentives supporting Net Zero; and understand the societal changes, including policies, urban strategies, and industry transformation, driving the race to Net Zero.',
        },
      ],
    },

    // ── SECTION 2: National Net Zero Targets (PDF pp. 5–6) ───────────────────
    {
      _id: 'sm2-sec-2-targets',
      title: 'National Net Zero Targets',
      slug: { _type: 'slug', current: 'national-net-zero-targets' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s2-hero',
          image: localImage('Images/AdobeStock_977627087.webp', 'National governments setting Net Zero targets'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s2-text',
          content: [
            h2('sm2-s2-h1', 'National Net Zero Targets'),
            p('sm2-s2-p1', 'Following the adoption of the Paris Accords in 2015, many countries around the world introduced target dates for reducing carbon emissions. The target type can vary. Some countries commit to hard, legally binding target dates — for example, Net Zero by 2050 in the US, UK, South Korea, Brazil, and Japan. Other countries have also added milestone targets, such as Canada targeting 40–45% reductions by 2030 and 100% Net Zero by 2050.'),
            p('sm2-s2-p2', 'Though many countries target Net Zero by 2050, this is not always legally binding, with some national governments choosing their own target years. Key examples include Germany, China, and India, who have pledged to achieve Net Zero by 2045, 2060, and 2070 respectively.'),
            p('sm2-s2-p3', 'Not all targets related to Net Zero commit specifically to carbon emission reductions. There are also targets directed at renewable energy generation, energy efficiency, biodiversity, climate finance, climate technology, and the adaptation of specific sectors.'),
            p('sm2-s2-p4', 'It isn\'t just national governments that set out Net Zero targets. International organisations, local governments, and corporations also set their own Net Zero targets — creating a multi-layered architecture of climate ambition.'),
          ],
        },
        netZeroTargetsChart,
        canadaTargetsChart,
        {
          _type: 'calloutBlock',
          _key: 'sm2-s2-keyfact',
          variant: 'key-fact',
          title: 'Key Fact',
          body: 'Over 130 countries have pledged to reach Net Zero by 2050. Many others have their own timelines — China by 2060 and India by 2070. The need to limit global temperature rises to 2°C below pre-industrial levels, and preferably 1.5°C, as agreed in the Paris Accords, has played a pivotal role in spurring these pledges.',
        },
      ],
    },

    // ── SECTION 3: Corporate Net Zero Pledges (PDF p. 7) ─────────────────────
    {
      _id: 'sm2-sec-3-corporate',
      title: 'Corporate Net Zero Pledges',
      slug: { _type: 'slug', current: 'corporate-net-zero-pledges' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s3-hero',
          image: localImage('Images/AdobeStock_988862679.webp', 'Corporations pledging Net Zero commitments'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s3-text',
          content: [
            h2('sm2-s3-h1', 'Corporate Net Zero Pledges'),
            p('sm2-s3-p1', 'Increasingly, corporations are pledging to shrink their own carbon footprint, reducing the emission of greenhouse gases emitted through their operational activities. As of 2024, the vast majority of the world\'s largest Transnational Corporations (TNCs) have made such pledges.'),
            h3('sm2-s3-h2', 'The GHG Protocol — Corporate Emissions Tiers'),
            p('sm2-s3-p2', 'Under what is called the \'Greenhouse Gas (GHG) Protocol,\' corporate emissions are reported through \'Tiers.\'  This system accurately measures a company\'s emissions across three distinct levels:'),
            bullet('sm2-s3-b1', 'Tier 1 — Direct Emissions: greenhouse gases directly emitted from sources owned or controlled by the company (e.g. on-site combustion, company vehicles).'),
            bullet('sm2-s3-b2', 'Tier 2 — Indirect Emissions from Energy: emissions produced through the generation of purchased electricity, heat, or steam consumed by the company.'),
            bullet('sm2-s3-b3', 'Tier 3 — Value Chain Emissions: all other indirect emissions that occur in a company\'s upstream or downstream value chain — often the largest and most complex category.'),
            p('sm2-s3-p3', 'Crucially, this Tier System helps to track a corporation\'s progress, forming a central component of their internal and external sustainability reporting. To reduce emissions at all Tier levels — and ultimately make progress towards their Net Zero pledges — corporations have introduced a wide range of implementation strategies.'),
            h3('sm2-s3-h3', 'Why Are Corporations Making These Pledges?'),
            p('sm2-s3-p4', 'There are many reasons why corporations have moved to make such pledges, ranging from increased public and governmental pressure, wider national targets, and the expansion of ESG (Environmental, Social & Governance) principles, to the commercial opportunities that \'green products\' or \'going green\' can present. Being seen as a leader in sustainability can strengthen brand reputation, attract investment, and open new markets.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s3-callout',
          variant: 'info',
          title: 'Examples of Corporate Pledges',
          body: 'Major corporations including Apple (carbon neutral across supply chain by 2030), Microsoft (carbon negative by 2030; remove all historical emissions by 2050), Amazon (Net Zero by 2040, ten years ahead of Paris targets), and Coca-Cola (reduce absolute Scope 1 and 2 emissions 50% by 2030) have all made ambitious public commitments — reflecting a broader shift in corporate responsibility.',
        },
      ],
    },

    // ── SECTION 4: Key Climate Commitments Timeline (PDF p. 8) ───────────────
    {
      _id: 'sm2-sec-4-timeline',
      title: 'Key Climate Commitments — A Global Timeline',
      slug: { _type: 'slug', current: 'key-climate-commitments-timeline' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm2-s4-text',
          content: [
            h2('sm2-s4-h1', 'Key Climate Commitments and Goals — A Global Timeline'),
            p('sm2-s4-p1', 'The international climate agenda has been shaped over more than fifty years of cooperation, negotiation, and scientific advancement. The following timeline captures the landmark agreements and initiatives that have defined the global response to climate change.'),
            h3('sm2-s4-h2', '1970s–1990s: Foundations of Global Climate Cooperation'),
            bullet('sm2-s4-b1', '1972 — UN Conference on the Human Environment: The first major international event on environmental issues, held in Stockholm. Catalysed widespread awareness of the need for coordinated environmental action.'),
            bullet('sm2-s4-b2', '1979 — World Climate Conference: The first international scientific conference focused specifically on climate change.'),
            bullet('sm2-s4-b3', '1987 — Vienna Convention for the Protection of the Ozone Layer: Established a framework for protecting the ozone layer, later operationalised by the Montreal Protocol.'),
            bullet('sm2-s4-b4', '1987 — Intergovernmental Panel on Climate Change (IPCC) established: The IPCC was founded to assess the scientific basis for climate action.'),
            bullet('sm2-s4-b5', '1991 — Global Environment Facility (GEF): Established to provide funding for environmental projects in developing countries.'),
            bullet('sm2-s4-b6', '1992 — UN Framework Convention on Climate Change (UNFCCC): The foundational international treaty on climate change. All subsequent major agreements operate under this framework.'),
            bullet('sm2-s4-b7', '1992 — Convention on Biological Diversity & Agenda 21: Commitments on biodiversity and sustainable development, signed at the Rio Earth Summit.'),
            bullet('sm2-s4-b8', '1995 — First Annual Conference of the Parties (COP 1): The beginning of the annual COP process — the primary decision-making body under the UNFCCC.'),
            h3('sm2-s4-h3', '2000s–2010s: Binding Targets and New Frameworks'),
            bullet('sm2-s4-b9', '2001 — Marrakesh Accords: Operational rules for the Kyoto Protocol adopted.'),
            bullet('sm2-s4-b10', '2008 — UN REDD+ Programme: Initiative to reduce emissions from deforestation and forest degradation in developing countries.'),
            bullet('sm2-s4-b11', '2009 — Copenhagen Accord: Though not legally binding, countries agreed on the need to limit warming to 2°C — a key milestone before Paris.'),
            bullet('sm2-s4-b12', '2010 — Cancun Agreements: Formalised the 2°C goal and established the Green Climate Fund.'),
            bullet('sm2-s4-b13', '2011 — Sustainable Energy for All initiative launched.'),
            bullet('sm2-s4-b14', '2015 — Mission Innovation: 22 governments committed to doubling clean energy R&D investment.'),
            bullet('sm2-s4-b15', '2015 — The Paris Agreement: Landmark legally binding agreement to limit warming to 1.5–2°C above pre-industrial levels.'),
            bullet('sm2-s4-b16', '2017 — Powering Past Coal Alliance: Nations and organisations committed to phasing out unabated coal power.'),
            h3('sm2-s4-h4', '2019–2023: Accelerating Action'),
            bullet('sm2-s4-b17', '2019 — The European Green Deal: The EU commits to becoming the world\'s first climate-neutral continent by 2050.'),
            bullet('sm2-s4-b18', '2020 — UN Race to Zero Campaign: A global campaign rallying businesses, cities, regions, and investors to achieve Net Zero by 2050.'),
            bullet('sm2-s4-b19', '2021 — Global Methane Pledge: Over 100 countries pledge to cut methane emissions by at least 30% by 2030 vs. 2020 levels.'),
            bullet('sm2-s4-b20', '2021 — Glasgow Climate Pact (COP26): Countries agreed to phase down coal and phase out inefficient fossil fuel subsidies.'),
            bullet('sm2-s4-b21', '2022 — Sharm el-Sheikh Implementation Plan (COP27): Focus on implementation of existing commitments and establishing a Loss and Damage fund.'),
            bullet('sm2-s4-b22', '2023 — Global Stocktake (COP28): The first global stocktake under the Paris Agreement — an assessment of collective progress towards climate goals.'),
          ],
        },
      ],
    },

    // ── SECTION 5: The Kyoto Protocol (PDF p. 9) ─────────────────────────────
    {
      _id: 'sm2-sec-5-kyoto',
      title: 'The Kyoto Protocol',
      slug: { _type: 'slug', current: 'kyoto-protocol' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s5-hero',
          image: localImage('Images/AdobeStock_238169477.webp', 'International climate agreements — Kyoto Protocol'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s5-text',
          content: [
            h2('sm2-s5-h1', 'The Kyoto Protocol'),
            p('sm2-s5-p1', 'The Kyoto Protocol, adopted in December 1997, was the third annual Conference of Parties (COP 3) under the UNFCCC — the United Nations Framework Convention on Climate Change. Held in the Japanese city of Kyoto, this was the first international treaty that committed member states to reducing their greenhouse gas emissions, following increasing public concern over the effects of global warming.'),
            p('sm2-s5-p2', 'It introduced the \'common but differentiated responsibilities\' principle. In sum, this principle recognised that developed nations, with higher levels of economic development, are the largest contributors to global greenhouse gas emissions, and therefore bear greater responsibility for addressing them.'),
            p('sm2-s5-p3', 'The protocol also introduced market mechanisms, such as the Clean Development Mechanism (CDM) and Joint Implementation (JI). These mechanisms provided economic incentives for nations to invest in clean energy projects, moving away from over-reliance on fossil fuels for industrial activities.'),
            p('sm2-s5-p4', 'Importantly, the Protocol introduced a more robust framework for monitoring and scrutiny. Member states were required to report regularly on their progress in reducing greenhouse gas emissions. Nearly 200 representatives from 200 countries attended, making it one of the most highly attended COPs to date.'),
            p('sm2-s5-p5', 'However, the commitments were not fully legally binding in practice, and the Protocol ultimately became a stepping stone. The commitments became much more stringent and binding in the Paris Accords, nearly two decades later.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s5-callout',
          variant: 'key-fact',
          title: 'The Kyoto Legacy',
          body: 'While the Kyoto Protocol was groundbreaking as the first international treaty on emissions reductions, it had limitations — most notably the exclusion of major emitters like the US (which did not ratify) and the absence of binding commitments for developing nations like China and India. These lessons directly shaped the design of the Paris Agreement in 2015.',
        },
      ],
    },

    // ── SECTION 6: The Paris Agreement (PDF p. 10) ────────────────────────────
    {
      _id: 'sm2-sec-6-paris',
      title: 'The Paris Agreement',
      slug: { _type: 'slug', current: 'paris-agreement' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s6-hero',
          image: localImage('Images/AdobeStock_891280719.webp', 'The Paris Agreement — landmark international climate accord'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s6-text',
          content: [
            h2('sm2-s6-h1', 'The Paris Agreement'),
            p('sm2-s6-p1', 'The Paris Agreement — or Paris Accords — was a landmark international agreement in climate action and in the race for achieving Net Zero. Held in Paris in December 2015, this agreement attracted representatives from 196 countries around the world.'),
            p('sm2-s6-p2', 'The major outcome from the Paris Agreement was the goal of limiting global warming below 2°C above pre-industrial levels. Ideally, this should be limited to 1.5°C above pre-industrial levels. What distinguishes this from Kyoto is: A) Numerical targets were stipulated and B) They were legally binding.'),
            p('sm2-s6-p3', 'These targets were based on extensive scientific studies, which concluded that these targets would help the planet avoid the worst impacts of climate change, including more frequent extreme weather events, sea-level rise, and ecosystem collapse.'),
            h3('sm2-s6-h2', 'Nationally Determined Contributions (NDCs)'),
            p('sm2-s6-p4', 'As part of their obligations, signatory countries were required to submit what are called \'Nationally Determined Contribution\' (NDC) plans. These plans detail exactly how each country planned to reduce greenhouse gas emissions, complying with the accords. Progress would be measured regularly, and the accords encouraged signatories to update NDCs every five years, with an expectation that ambition would increase over time.'),
            p('sm2-s6-p5', 'The Paris Agreement also stipulated that developing countries — who are lowest contributors to historical emissions but most vulnerable to climate change impacts — should receive financial and technical support from developed nations to achieve their own Net Zero transitions.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s6-callout',
          variant: 'key-fact',
          title: '196 Countries, One Goal',
          body: 'The Paris Agreement is the most comprehensive international climate accord in history. Its 1.5°C target has become the benchmark for climate ambition worldwide — and it is the target that drives almost every major policy, technology investment, and Net Zero commitment covered in this sub-module.',
        },
      ],
    },

    // ── SECTION 7: The IPCC (PDF p. 11) ──────────────────────────────────────
    {
      _id: 'sm2-sec-7-ipcc',
      title: 'The Intergovernmental Panel on Climate Change (IPCC)',
      slug: { _type: 'slug', current: 'ipcc' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm2-s7-text',
          content: [
            h2('sm2-s7-h1', 'The Intergovernmental Panel on Climate Change (IPCC)'),
            p('sm2-s7-p1', 'Established in 1988, the Intergovernmental Panel on Climate Change (IPCC) was founded by the United Nations and the World Meteorological Organisation to better understand climate change and its wider impacts worldwide. It brings together leading scientists and policymakers from around the world to better understand the causes of climate change and its global impacts, as well as producing recommendations for decision-makers around the world on various mitigation strategies.'),
            h3('sm2-s7-h2', 'Structure: Three Working Groups'),
            bullet('sm2-s7-b1', 'Working Group 1 (WG1): Physical Science of Climate Change — assessing the scientific basis of climate change and how the climate system works.'),
            bullet('sm2-s7-b2', 'Working Group 2 (WG2): Impacts, Adaptation and Vulnerability — examining how climate change affects human and natural systems and what adaptation is needed.'),
            bullet('sm2-s7-b3', 'Working Group 3 (WG3): Mitigation Options — identifying strategies and policies to reduce or prevent greenhouse gas emissions.'),
            h3('sm2-s7-h3', 'Why IPCC Reports Matter'),
            p('sm2-s7-p2', 'All reports, recommendations, and other publications are scrutinised by various governmental and scientific experts, ensuring extremely high levels of accuracy and credibility. These reports are highly influential in the context of international agreements and initiatives — IPCC reports heavily influenced both the Kyoto Protocol and the Paris Agreement by helping to guide understanding around the relationship between humans, climate change, and the maximum temperature rises that the earth could accept.'),
            p('sm2-s7-p3', 'The IPCC\'s Assessment Reports (AR), published roughly every six to seven years, represent the most authoritative synthesis of climate science available. The most recent, AR6 (2021–2023), confirmed that global warming is "unequivocally" caused by human influence, and that limiting warming to 1.5°C remains possible but requires immediate, deep, rapid, and sustained emissions reductions across all sectors.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s7-callout',
          variant: 'quote',
          title: 'IPCC AR6 (2021)',
          body: '"It is unequivocal that human influence has warmed the atmosphere, ocean and land." — IPCC Sixth Assessment Report, Working Group 1: Physical Science Basis (2021)',
        },
      ],
    },

    // ── SECTION 8: Key Technologies (PDF p. 12) ───────────────────────────────
    {
      _id: 'sm2-sec-8-technology',
      title: 'Key Technologies Accelerating the Net Zero Race',
      slug: { _type: 'slug', current: 'key-technologies-net-zero' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s8-hero',
          image: localImage('Images/AdobeStock_1082841790.webp', 'Technologies accelerating the Net Zero transition'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s8-text',
          content: [
            h2('sm2-s8-h1', 'Key Technologies Accelerating the Net Zero Race'),
            p('sm2-s8-p1', 'The race to Net Zero is being powered by a wave of technological innovation spanning energy generation, storage, transportation, and industrial processes. While many of the major renewable energy technologies — wind, solar, wave, and tidal — are explored in dedicated modules throughout this course, the following represent some of the other major technologies attracting significant financial and political interest.'),
            h3('sm2-s8-h2', 'Carbon Capture, Utilisation and Storage (CCUS)'),
            p('sm2-s8-p2', 'CCUS involves capturing carbon emissions — typically from industrial processes — that would otherwise enter the atmosphere. These captured emissions are then transported via pipeline or logistics and either stored in geological formations (such as saline aquifers or depleted oil and gas fields) or utilised for other industrial processes. CCUS is explored in greater detail in Sub-Module 13.'),
            h3('sm2-s8-h3', 'Smart Grids'),
            p('sm2-s8-p3', 'Digitally powered grids can utilise Artificial Intelligence (AI) or Internet of Things (IoT) technology to make energy distribution more efficient and cost-productive. Smart grids can be directly integrated with smaller-scale sources of renewable energy, like solar panels and small wind farms, enabling real-time balancing of supply and demand across the network.'),
            h3('sm2-s8-h4', 'Advanced Batteries'),
            p('sm2-s8-p4', 'Advanced batteries can store excess energy produced by renewable energy sources, contributing to overall supply reliability. This is especially useful at periods when generation falls (e.g. overnight or during low-wind periods). Current advances in battery technology are aimed at expanding storage capacity further and improving energy density, making batteries an increasingly important component of the clean energy system.'),
            h3('sm2-s8-h5', 'Electric Vehicles (EVs)'),
            p('sm2-s8-p5', 'Rather than traditional vehicles that use internal combustion engines to burn petrol or diesel, EVs are powered by electricity, producing no direct carbon emissions. Increasingly, charge points are being installed both domestically, at designated public charging points, and even at fuel stations. By expanding the EV market, the option to move away from emission-producing vehicles has become more feasible and appealing to consumers.'),
            h3('sm2-s8-h6', 'Green Hydrogen'),
            p('sm2-s8-p6', 'Green hydrogen is produced through a process called \'electrolysis\' — a process that uses renewable-generated electricity to separate water into hydrogen and oxygen. The final product is a zero-emission fuel with enormous potential for decarbonising industries that are difficult to electrify directly, such as heavy shipping, aviation, and high-temperature industrial processes. Green hydrogen is explored in more detail in Module 10: Preparing for a Renewable Future.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s8-callout',
          variant: 'info',
          title: 'Many More Technologies Are Emerging',
          body: 'The technologies listed above represent only a selection of the major innovations attracting investment and policy interest. The full breadth of the Net Zero technology landscape — including solar, offshore and onshore wind, geothermal, bioenergy, nuclear, and tidal — is explored in depth throughout the rest of this course.',
        },
      ],
    },

    // ── SECTION 9: Electrification of Transportation (PDF p. 13) ─────────────
    {
      _id: 'sm2-sec-9-evs',
      title: 'Electrification of Transportation',
      slug: { _type: 'slug', current: 'electrification-of-transportation' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s9-hero',
          image: localImage('Images/AdobeStock_1165490742.webp', 'Electric vehicles — the electrification of transport'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s9-text',
          content: [
            h2('sm2-s9-h1', 'Electrification of Transportation'),
            p('sm2-s9-p1', 'A key part of the global race for Net Zero is the electrification of transport. Doing this will be significant in helping to limit greenhouse gas emissions — transport currently accounts for around 24% of global energy sector emissions — and improve overall air quality in urban areas.'),
            h3('sm2-s9-h2', 'Types of Electric Vehicle'),
            bullet('sm2-s9-b1', 'Battery Electric Vehicles (BEVs): Fully electric vehicles powered entirely by on-board batteries recharged from the electricity grid. Produce zero direct tailpipe emissions.'),
            bullet('sm2-s9-b2', 'Fuel Cell Electric Vehicles (FCEVs): Vehicles powered by hydrogen fuel cells that generate electricity on-board. Emit only water vapour. Best suited for heavy transport applications.'),
            bullet('sm2-s9-b3', 'Plug-in Hybrid Electric Vehicles (PHEVs): Combine a conventional internal combustion engine with a rechargeable battery. Can operate on electricity alone for shorter journeys, reducing overall emissions compared to traditional vehicles.'),
            h3('sm2-s9-h3', 'Infrastructure and Policy Support'),
            p('sm2-s9-p2', 'In support of the proliferation of various EV types, there has been growing interest and investment in infrastructure upgrades. These include public charging points, domestic charging points, and fast chargers. Typically, the necessary infrastructure takes up much less space than traditional fuel stations.'),
            p('sm2-s9-p3', 'Governments around the world are, from a policy perspective, playing a more prominent and active role in supporting EV market expansion. Typical policy mechanisms have included tax credits, EV purchase rebates, and direct investments in charging infrastructure — all aimed at making the investment environment for the sector more attractive.'),
            h3('sm2-s9-h4', 'Challenges'),
            p('sm2-s9-p4', 'There are challenges. Upfront costs for potential consumers remain high compared to petrol- and diesel-powered vehicles. There are also growing ethical challenges — for instance, cobalt, a critical mineral for the development of car batteries, has been linked with unethical labour practices in certain mining regions. However, there are long-term efforts to bring down these costs and shift production away from areas where potentially unethical labour practices are in place.'),
          ],
        },
        evGlobalSalesChart,
      ],
    },

    // ── SECTION 10: Renewable Energy Expansion (PDF p. 14) ────────────────────
    {
      _id: 'sm2-sec-10-renewables',
      title: 'Renewable Energy Expansion',
      slug: { _type: 'slug', current: 'renewable-energy-expansion' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s10-hero',
          image: localImage('Images/AdobeStock_562587104.webp', 'Renewable energy expansion — wind and solar'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s10-text',
          content: [
            h2('sm2-s10-h1', 'Renewable Energy Expansion'),
            p('sm2-s10-p1', 'As explored throughout both this module and the course itself, there are many key innovations and technological advancements supporting the transition to Net Zero. Ultimately, they help to reduce the dependency that different countries and regions have on fossil fuels. Historically, many countries are heavily dependent on fossil fuels for energy generation. By reducing this dependency, a greater proportion of the energy being generated and consumed is derived from clean sources, thus aiding the race to Net Zero.'),
            p('sm2-s10-p2', 'Many of these innovations are taking place across the following renewable energy areas:'),
            bullet('sm2-s10-b1', 'Solar Power (photovoltaic panels and concentrated solar) — the fastest growing energy source globally, with costs falling by over 90% since 2010.'),
            bullet('sm2-s10-b2', 'Onshore Wind — the lowest-cost source of new electricity generation in many markets, explored in Sub-Module 6.'),
            bullet('sm2-s10-b3', 'Offshore Wind (Fixed and Floating) — explored in Sub-Modules 4 and 5; offering higher capacity factors than onshore wind.'),
            bullet('sm2-s10-b4', 'Hydropower — the largest single source of renewable electricity globally; also used for grid-scale energy storage.'),
            bullet('sm2-s10-b5', 'Geothermal — exploiting subsurface heat for electricity generation and direct heating applications.'),
            bullet('sm2-s10-b6', 'Bioenergy — energy derived from organic matter; applicable across power, heat, and transport fuel sectors.'),
            bullet('sm2-s10-b7', 'Tidal and Wave Energy — emerging marine energy technologies with significant long-term potential.'),
            bullet('sm2-s10-b8', 'Nuclear Energy — providing reliable low-carbon baseload power; the subject of renewed policy interest in many countries.'),
            bullet('sm2-s10-b9', 'Green Hydrogen — produced using renewable electricity for use as a zero-emission fuel in hard-to-abate sectors.'),
            p('sm2-s10-p3', 'The way each technology contributes to the path to Net Zero will be examined in much greater depth throughout this course.'),
          ],
        },
        renewableInvestmentChart,
      ],
    },

    // ── SECTION 11: Circular Economy (PDF p. 15) ──────────────────────────────
    {
      _id: 'sm2-sec-11-circular',
      title: 'The Circular Economy',
      slug: { _type: 'slug', current: 'circular-economy' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s11-hero',
          image: localImage('Images/AdobeStock_44585071.webp', 'Circular economy principles — reduce, reuse, recycle'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s11-text',
          content: [
            h2('sm2-s11-h1', 'The Circular Economy'),
            p('sm2-s11-p1', 'In short, a circular economy is an economic principle that aims to reduce waste and ensure that materials used in various products are being used for as long as possible. It represents a fundamental shift away from the traditional \'take-make-dispose\' linear model of production and consumption.'),
            h3('sm2-s11-h2', 'How Circular Economy Principles Reduce Emissions'),
            p('sm2-s11-p2', 'By using and re-using materials, the industrial processes needed — for example, for extracting resources and producing goods — are minimised. As many modern industrial processes release greenhouse gas emissions, using and re-using materials can help reduce a country\'s or industry\'s overall carbon footprint.'),
            p('sm2-s11-p3', 'Reducing the amount of waste (especially organic waste) can help reduce what are called \'landfill emissions.\' As organic waste (e.g. food waste) is broken down by bacteria in landfill sites, methane — a potent greenhouse gas — is released. A range of alternative uses — including biogas production, composting, upcycling, and animal feed production — can extend the lifespan of organic matter and significantly reduce these emissions.'),
            h3('sm2-s11-h3', 'Decarbonising Supply Chains'),
            p('sm2-s11-p4', 'Increasingly, there are pushes to incorporate circular economic principles into global supply chains, making the international processes of production cleaner, less fossil fuel dependent, and ultimately more aligned with Net Zero goals. Companies across industries are re-examining how products are designed, manufactured, distributed, used, and ultimately disposed of — seeking to close material loops at every stage.'),
            h3('sm2-s11-h4', 'Economic Opportunities'),
            p('sm2-s11-p5', 'The expansion of a circular economy in various parts of the world has also opened up significant opportunities for job creation and market expansion, making recycling and extended product use more economically attractive. Circular economy principles are increasingly recognised not just as an environmental imperative but as a driver of innovation and competitive advantage.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s11-callout',
          variant: 'info',
          title: 'Further Learning',
          body: 'To explore circular economy principles further, the Ellen MacArthur Foundation (ellenmacarthurfoundation.org) and the World Economic Forum both provide excellent resources on how circular economy principles can be applied across industries and supply chains.',
        },
      ],
    },

    // ── SECTION 12: Climate Finance (PDF p. 16) ───────────────────────────────
    {
      _id: 'sm2-sec-12-finance',
      title: 'Climate Finance',
      slug: { _type: 'slug', current: 'climate-finance' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s12-hero',
          image: localImage('Images/AdobeStock_392860629.webp', 'Climate finance — funding the green transition'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s12-text',
          content: [
            h2('sm2-s12-h1', 'Climate Finance'),
            p('sm2-s12-p1', 'Climate finance refers to the funding mechanisms of projects, technological innovations, and initiatives that limit greenhouse gas emissions, strengthen resilience against the effects of climate change, and help to drive the race to Net Zero. It encompasses a wide range of financial instruments from both public and private sources.'),
            h3('sm2-s12-h2', 'Major Climate Finance Mechanisms'),
            bullet('sm2-s12-b1', 'Carbon Pricing and Trading Schemes: Typically set up by governments and large organisations, these schemes create financial disincentives for carbon emissions. They can also incentivise companies to limit emissions through trading. For example, the European Union Emissions Trading Scheme (EU ETS) allows EU governments and businesses to effectively \'sell\' excess emission reductions to other participants — creating a market-based mechanism for reducing overall emissions.'),
            bullet('sm2-s12-b2', 'Green and Climate Bonds: These bonds help governments and organisations raise finance for clean energy projects, green infrastructure, and renewable energy investments. The green bond market has grown explosively in recent years, reflecting strong investor demand for sustainable assets.'),
            bullet('sm2-s12-b3', 'Public-Private Partnerships (PPPs): Financial collaborations between governments and the private sector to develop Net Zero projects, typically at large industrial scale. PPPs can de-risk investments and mobilise private capital that governments alone cannot provide.'),
            bullet('sm2-s12-b4', 'Government and Corporate Funds: Direct funding of carbon-reducing, Net Zero projects by governments or corporations, often forming part of that organisation\'s wider Net Zero strategy and ESG commitments.'),
            bullet('sm2-s12-b5', 'Venture Capital and Investment Banks: These can invest in carbon-reducing projects for a return. Green and climate bonds are a common instrument. Investment banks may be publicly owned, privately owned, or jointly owned, and regional development banks are playing an increasingly important role in financing renewable energy projects in emerging economies.'),
            h3('sm2-s12-h3', 'The Scale of Climate Finance Required'),
            p('sm2-s12-p2', 'The International Energy Agency estimates that achieving Net Zero by 2050 globally will require clean energy investment to rise from around $1.8 trillion per year today to over $4.5 trillion per year by the early 2030s. This represents a fundamental shift in how global capital is allocated — away from fossil fuel infrastructure and towards the clean energy systems of the future.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s12-callout',
          variant: 'key-fact',
          title: 'The $100 Billion Pledge',
          body: 'Under the Paris Agreement, developed countries pledged to mobilise $100 billion per year in climate finance for developing nations by 2020 — a target that was finally met (with some delay) by 2022. The 2023 Global Stocktake acknowledged that a new, more ambitious finance goal (the "NCQG") is needed for the post-2025 period.',
        },
      ],
    },

    // ── SECTION 13: Policy and Regulation (PDF p. 17) ────────────────────────
    {
      _id: 'sm2-sec-13-policy',
      title: 'Policy and Regulation for Net Zero',
      slug: { _type: 'slug', current: 'policy-regulation-net-zero' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s13-hero',
          image: localImage('Images/AdobeStock_447006459.webp', 'Policy and regulation driving the Net Zero transition'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s13-text',
          content: [
            h2('sm2-s13-h1', 'Policy and Regulation for Net Zero'),
            p('sm2-s13-p1', 'Policies can play a key role in both advancing or hindering the race towards Net Zero. Not only can policies and regulations provide the frameworks for industry to operate in, but they can legally enforce industry to comply with Net Zero advancing rules. The following are some of the most common policy and regulation interventions employed by governments and corporations alike.'),
            h3('sm2-s13-h2', 'Emissions Reduction Targets'),
            p('sm2-s13-p2', 'One of the more common policies pursued by governments. These are typically legally binding target dates by which key climate milestones must be achieved — for example, a specified percentage of electricity generated from renewables by a given year. The most common example is the target of reaching Net Zero by 2050, agreed by many governments and large organisations around the world.'),
            h3('sm2-s13-h3', 'Subsidies and Tax Incentives'),
            p('sm2-s13-p3', 'Closely linked to climate financing, these take the form of financial incentives that ultimately help to support the fostering of expanded sustainable enterprises — including energy efficiency schemes, electric vehicles, industrial decarbonisation, renewable energy projects, and recycling initiatives.'),
            h3('sm2-s13-h4', 'Trade and Import Regulations'),
            p('sm2-s13-p4', 'Governments can impose tariffs on products deemed carbon-intensive. This can discourage companies from selling carbon-intensive goods into particular markets, while making low or zero-carbon products more competitively attractive. However, regulations such as these can have significant implications for international trade relationships. The EU\'s Carbon Border Adjustment Mechanism (CBAM) is a leading example of this type of policy instrument.'),
            h3('sm2-s13-h5', 'Standards'),
            p('sm2-s13-p5', 'Governments can impose minimum standards across a range of sectors. Housing is a key example — governments are increasingly mandating higher energy efficiency standards throughout the design and build phases, helping to make housing a less carbon-intensive industry. Companies or developers failing to comply can suffer fines and even legal action.'),
            h3('sm2-s13-h6', 'Just Transition Strategies'),
            p('sm2-s13-p6', 'As economies move away from fossil fuels, anxieties arise around the economic status of current workers in those industries. Many governments and industry bodies are implementing \'just transition\' strategies to ensure that workers in legacy fossil fuel industries are sufficiently trained and prepared for roles in the renewable energy sector — supporting both environmental and social goals simultaneously.'),
          ],
        },
      ],
    },

    // ── SECTION 14: Public Opinion (PDF p. 18) ────────────────────────────────
    {
      _id: 'sm2-sec-14-public',
      title: 'Public Opinion and Societal Action',
      slug: { _type: 'slug', current: 'public-opinion-societal-action' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s14-hero',
          image: localImage('Images/AdobeStock_588764350.webp', 'Public opinion and grassroots action for Net Zero'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s14-text',
          content: [
            h2('sm2-s14-h1', 'Public Opinion and Societal Action'),
            p('sm2-s14-p1', 'The public can play a significant role in the transition towards Net Zero, whether directly through consumer behaviour or indirectly through pressuring organisations to embrace Net Zero initiatives.'),
            h3('sm2-s14-h2', 'Political Means'),
            p('sm2-s14-p2', 'In countries where decision-makers are elected, citizens can express their approval or disapproval of candidates\' commitment to advancing Net Zero by voting for — or indeed against — them. As a result, political candidates may wish to appear supportive of climate initiatives in order to attract voters who prioritise environmental concerns.'),
            h3('sm2-s14-h3', 'Consumer Behaviour'),
            p('sm2-s14-p3', 'Consumers can make individual choices about the products or services they purchase. For example, some people may choose to buy \'locally grown\' produce, as opposed to those imported from overseas, reducing carbon miles — the number of carbon emissions produced for the goods\' transportation. Small individual choices, at scale, can shift market incentives significantly.'),
            h3('sm2-s14-h4', 'Embracing New Technologies'),
            p('sm2-s14-p4', 'More and more, consumers and homeowners are investing in alternative technologies that promote Net Zero principles — including EV cars for transport, solar panels for their electricity, and Air Source Heat Pumps (ASHPs) for heating their homes. The more that these technologies are embraced by consumers, the more the market can mature and proliferate, driving down costs for everyone.'),
            h3('sm2-s14-h5', 'Pressure Groups and Grassroots Movements'),
            p('sm2-s14-p5', 'All over the world, environmental groups are being assembled, focusing on a range of global issues — rising sea levels, habitat loss — to local concerns such as flooding and pollution. By mobilising volunteers, fundraising, and launching social media campaigns, these groups have become increasingly influential. Some have been able to lobby local and national governments, pressuring them to implement policy change.'),
          ],
        },
      ],
    },

    // ── SECTION 15: Challenges and Opportunities (PDF pp. 19–20) ─────────────
    {
      _id: 'sm2-sec-15-challenges',
      title: 'Challenges and Opportunities',
      slug: { _type: 'slug', current: 'challenges-opportunities-net-zero' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm2-s15-text',
          content: [
            h2('sm2-s15-h1', 'Challenges in the Race to Net Zero'),
            h3('sm2-s15-h2', 'Policy Fragmentation'),
            p('sm2-s15-p1', 'Policy fragmentation may occur when policies are not — or cannot be — implemented consistently across a country\'s various regions. The populations of some regions may be more reluctant to see renewable energy projects built in their area than others. This may be exacerbated by cross-border competition for financial resources or differing political priorities.'),
            h3('sm2-s15-h3', 'Fossil Fuel Dependence'),
            p('sm2-s15-p2', 'Some regions remain reliant on the production of energy from fossil fuels. In some cases, entire communities\' and towns\' economic base — employment and growth — depends on coal mines or the operation of offshore oil rigs. Transitioning these communities requires significant investment, planning, and social support.'),
            h3('sm2-s15-h4', 'Macroeconomic Challenges'),
            p('sm2-s15-p3', 'International events — wars, pandemics, financial crises — can induce national or even international economic challenges. Economic uncertainties can reduce risk appetite, limiting investment in Net Zero projects that require long-term capital commitments.'),
            h3('sm2-s15-h5', 'Resistance to Green Taxes'),
            p('sm2-s15-p4', 'Whilst green taxes and carbon pricing have the potential to raise significant revenue for climate projects, they can have negative consequences for businesses and consumers in the short term. This can lead to increased political resistance to such policy measures.'),
            h3('sm2-s15-h6', 'Political Framework Limitations'),
            p('sm2-s15-p5', 'Some countries or local governments may lack stable regulatory frameworks in which policy can be implemented, especially in emerging economies. This can make it much more difficult for Net Zero-supportive policies to be introduced and maintained over time.'),
          ],
        },
        {
          _type: 'dividerBlock',
          _key: 'sm2-s15-divider',
        },
        {
          _type: 'richText',
          _key: 'sm2-s15-opps-text',
          content: [
            h2('sm2-s15-h7', 'Opportunities in the Race to Net Zero'),
            h3('sm2-s15-h8', 'Regional Development Banks'),
            p('sm2-s15-p6', 'In recent years, regional development banks have played an increasingly important role in climate change financing. They are increasingly proliferating in developing countries where attracting private investment is more challenging. They can directly fund renewable energy projects, low-carbon infrastructure projects, and help to de-risk green investments more generally.'),
            h3('sm2-s15-h9', 'Increased Net Zero Support and Workforce Transition'),
            p('sm2-s15-p7', 'Government bodies, large employers, and training providers have increasingly offered financial support for people transitioning from traditional energy sectors into renewable energy sectors, including training schemes, reskilling programmes, and apprenticeships — creating pathways into the growing green economy.'),
            h3('sm2-s15-h10', 'Carbon Markets'),
            p('sm2-s15-p8', 'As referenced previously, carbon markets (such as emissions trading mechanisms) are increasingly providing incentives for governments and corporations to reduce their emissions and better align their activities with wider Net Zero goals. The voluntary carbon market is also growing rapidly, allowing companies to offset residual emissions through verified carbon reduction projects.'),
            h3('sm2-s15-h11', 'Market Resilience'),
            p('sm2-s15-p9', 'Macroeconomic disruptions can have severe implications for energy markets generally. However, renewable energy markets are demonstrating increasing resilience and can even indirectly benefit from global instability. International conflicts that threaten fossil fuel supply chains have made green alternatives more attractive from an energy security perspective — accelerating transitions that might otherwise have taken longer.'),
            h3('sm2-s15-h12', 'Shifting Public Perception'),
            p('sm2-s15-p10', 'Though public perception can create difficulties for renewable energy projects — in the form of NIMBYism* and willingness-to-pay debates — climate anxiety has increased significantly across the population. Increased appetite for cleaner products and services is reflected in various exponentially expanding green markets, from EVs to plant-based food to sustainable fashion.'),
            p('sm2-s15-p11', '*NIMBYism ("Not In My Back Yard") refers to local opposition to new infrastructure projects, even when those projects are broadly supported in principle by the wider public.'),
          ],
        },
      ],
    },

    // ── SECTION 16: Decarbonising Industry (PDF p. 21) ────────────────────────
    {
      _id: 'sm2-sec-16-industry',
      title: 'Decarbonising Industry',
      slug: { _type: 'slug', current: 'decarbonising-industry' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s16-hero',
          image: localImage('Images/AdobeStock_668054451.webp', 'Decarbonising heavy industry — steel, cement, and chemicals'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s16-text',
          content: [
            h2('sm2-s16-h1', 'Decarbonising Industry'),
            p('sm2-s16-p1', 'Industrial processes account for the highest percentage of carbon emissions in the world — and are among the hardest sectors to decarbonise. Significant efforts have been made to reduce the carbon footprints of industries. The following are some of the major innovations and initiatives aiming to achieve this.'),
            h3('sm2-s16-h2', 'Electrification'),
            p('sm2-s16-p2', 'Many key industrial processes — including heating, transport, and manufacturing — are increasingly being powered through renewable electricity, rather than through traditional fossil fuels. Where grids are becoming cleaner, electrification is one of the most powerful tools available for industrial decarbonisation.'),
            h3('sm2-s16-h3', 'Low-Carbon Fuels'),
            p('sm2-s16-p3', 'Where electrification is insufficient — for example, in generating the extremely high temperatures required for some industrial processes — other fuels can be used, such as biofuels, synthetic fuels, and green hydrogen. These alternate fuel types are being used to target large polluting and emitting industries, including cement, steel, and chemicals manufacturing.'),
            h3('sm2-s16-h4', 'Efficiency and Process Optimisation'),
            p('sm2-s16-p4', 'Attempts at making industrial processes more efficient can reduce the amount of energy required to perform the same tasks — reducing emissions without necessarily changing the energy source. For example, using polymer-based additive manufacturing (3D printing) rather than cast metal in manufacturing can significantly reduce material waste and energy consumption.'),
            h3('sm2-s16-h5', 'Carbon Capture, Utilisation and Storage (CCUS)'),
            p('sm2-s16-p5', 'As explained previously, carbon capture plants can be integrated directly with heavy industrial facilities to capture, transport, store, or utilise the CO₂ produced by industrial processes — preventing it from reaching the atmosphere.'),
            h3('sm2-s16-h6', 'Innovations in Materials'),
            p('sm2-s16-p6', 'In heavy-emitting industries such as steel and cement, new materials are being developed to substitute older, more carbon-intensive ones. Key examples include low-emission (\'green\') cement — which uses supplementary cementitious materials to reduce the proportion of clinker required — and sustainable steel, produced using hydrogen instead of coking coal in the reduction process.'),
          ],
        },
      ],
    },

    // ── SECTION 17: Innovation Hubs and Urban Planning (PDF pp. 22–23) ─────────
    {
      _id: 'sm2-sec-17-innovation',
      title: 'Innovation Hubs and Urban Planning',
      slug: { _type: 'slug', current: 'innovation-hubs-urban-planning' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s17-hero',
          image: localImage('Images/AdobeStock_1080726550.webp', 'Innovation hubs and sustainable urban planning'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s17-text',
          content: [
            h2('sm2-s17-h1', 'The Role of Innovation Hubs'),
            p('sm2-s17-p1', 'Innovation hubs are a type of research and development centre that specialise in cutting-edge innovation and technology. As the global race for Net Zero continues to ramp up, more of these hubs are specialising in low-carbon technologies. They often work collaboratively with governments, businesses, and green tech start-ups.'),
            h3('sm2-s17-h2', 'Key Functions of Innovation Hubs'),
            bullet('sm2-s17-b1', 'Cross-Sector Cooperation: As hubs of innovation and expertise, they play an active role in bringing stakeholders from industry, government, the business community, and academia together to offer fresh perspectives and address key challenges.'),
            bullet('sm2-s17-b2', 'Accelerating Market Entry: With extensive infrastructural capabilities, innovation hubs can accelerate the process from early Net Zero concepts to demonstrators and ultimately into the market — a more efficient pathway than independent projects relying on fragmented funding streams.'),
            bullet('sm2-s17-b3', 'Public Education: Many innovation hubs host public events and workshops to raise awareness around their activities and sustainable practices more generally.'),
            bullet('sm2-s17-b4', 'Place-Specific Solutions: As different regions and geographies have their own environmental challenges, hubs based in these geographies can play active roles in supporting local ecosystems and communities.'),
            bullet('sm2-s17-b5', 'Supporting Green Start-Ups: With their expertise and connections, hubs can help start-ups secure vital funding, develop positive reputations, and receive advice around commercialising their products.'),
          ],
        },
        {
          _type: 'dividerBlock',
          _key: 'sm2-s17-divider',
        },
        {
          _type: 'richText',
          _key: 'sm2-s17-urban-text',
          content: [
            h2('sm2-s17-h3', 'Sustainable Urban Planning'),
            p('sm2-s17-p2', 'Sustainable urban planning involves reconsidering how towns and cities can be designed in order to limit their carbon footprints and promote more sustainable practices. There are numerous ways that town planners and policy makers are striving to achieve this.'),
            h3('sm2-s17-h4', 'Green Infrastructure'),
            p('sm2-s17-p3', 'This involves integrating natural features — such as green spaces, green roofs, and urban forests — into cities, particularly those with high population density levels. These features can act as carbon sinks, reduce urban heat island effects, and improve air quality.'),
            h3('sm2-s17-h5', 'Sustainable Transport Systems'),
            p('sm2-s17-p4', 'There are growing efforts to electrify public transport systems — mainly trains, buses, trams, and taxis. By electrifying these services, which move millions of people every day, urban transport can significantly limit its emissions footprint. Equally, by expanding the public transport options available for commuters, fewer will resort to private transport, reducing total urban emissions.'),
            h3('sm2-s17-h6', 'Promoting Sustainable Commuting'),
            p('sm2-s17-p5', 'Developing new walkways and cycling lanes is increasingly popular, making it easier for commuters to switch to zero-carbon commuting solutions. Councils also play a big part in encouraging circular economic principles — for example, through recycling programmes and even imposing penalties for not separating recyclable and non-recyclable waste.'),
            h3('sm2-s17-h7', 'Sustainable Building Design'),
            p('sm2-s17-p6', 'Many newly built buildings use more sustainable materials during the construction process, such as low-carbon cement. They are also increasingly built to better accommodate energy-efficient heating and cooling systems, utilise natural lighting and ventilation, and integrate on-site renewable energy generation such as rooftop solar panels.'),
          ],
        },
      ],
    },

    // ── SECTION 18: Global Overview (PDF pp. 24–25) ───────────────────────────
    {
      _id: 'sm2-sec-18-overview',
      title: 'Global Overview of the Net Zero Movement',
      slug: { _type: 'slug', current: 'global-overview-net-zero' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm2-s18-hero',
          image: localImage('Images/AdobeStock_966362220.webp', 'Global overview — the world\'s Net Zero movement'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm2-s18-text',
          content: [
            h2('sm2-s18-h1', 'Global Overview of the Net Zero Movement'),
            p('sm2-s18-p1', 'There is no formal \'Net Zero movement.\' Despite this, almost all countries in the world acknowledge the need to work towards Net Zero and are implementing policies, frameworks, and economic strategies to advance it. As alluded to previously, over 130 countries have pledged to reach Net Zero by 2050 — with many others pursuing their own timelines.'),
            h3('sm2-s18-h2', 'Europe'),
            p('sm2-s18-p2', 'Europe is a leading player in the Net Zero movement. The European Green Deal (founded 2020) pledged to make Europe the first continent in the world to reach Net Zero. \'Fit for 55,\' another major policy package adopted in 2023, pledges to cut emissions by 55% by 2030 relative to 1990 levels — one of the most ambitious near-term emissions targets of any major economy.'),
            h3('sm2-s18-h3', 'Asia'),
            p('sm2-s18-p3', 'As the world\'s most populous and highest-emitting continent, Asia has massively ramped up investment in renewables. China has expanded renewable capacity extensively, making it the world\'s largest producer of wind and solar energy. With high economic and population growth levels, China and the rest of Asia have a vital role in the global Net Zero movement — and the target dates they set will be decisive for global outcomes.'),
            h3('sm2-s18-h4', 'North America'),
            p('sm2-s18-p4', 'North America has, over the years, ramped up investments in clean energy. However, oil remains a significant source of energy and revenue for North American economies — particularly the United States and Canada. The political will to accelerate the transition has varied between administrations, and geopolitical decisions around domestic energy production continue to have significant implications for the region\'s Net Zero trajectory.'),
            h3('sm2-s18-h5', 'Latin America'),
            p('sm2-s18-p5', 'The unique geography of countries in Latin America has helped some transition almost entirely to renewables. With highly mountainous terrains and high levels of rainfall, countries like Costa Rica have successfully utilised hydropower, which provides over 70% of their electricity. Brazil\'s current government has pledged to reduce deforestation in the Amazon — one of the world\'s largest natural carbon sinks — marking a significant shift in policy compared to previous administrations.'),
            h3('sm2-s18-h6', 'Africa'),
            p('sm2-s18-p6', 'Significant international support is being committed for renewable and climate mitigation projects in Africa. The UN recognises that developing countries — many of which are African — contribute little to global carbon emissions historically, yet face some of the most severe climate impacts. UN member states have pledged billions in financial aid to support renewable energy projects in the continent and help develop more climate-resilient infrastructure.'),
            h3('sm2-s18-h7', 'Oceania'),
            p('sm2-s18-p7', 'Countries in Oceania — including Australia and New Zealand — have also made ambitious commitments, pledging to reach Net Zero by 2050. Both have committed to significant investments in wind and solar energy. New Zealand in particular has played a major role in making agriculture, a sector with a historically high carbon footprint, more sustainable — including introducing incentives for regenerative farming, selective breeding programmes, and including agriculture in emissions trading platforms.'),
            p('sm2-s18-p8', 'Although regional trends are important, each country — and even region within each country — may have unique and differing perspectives around Net Zero and how best to work towards it. The global transition is not uniform, and understanding these differences is essential to understanding the full complexity of the Net Zero challenge.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-s18-summary',
          variant: 'info',
          title: 'Sub-Module 2 Summary',
          body: 'Having gone through this sub-module, you should now have an excellent introductory knowledge of what is being done to reduce atmospheric carbon and other greenhouse gases globally. You should be aware of the efforts being made by governments, regions, organisations, industry, and individuals to address the production of greenhouse gases and limit production. Finally, you should know about the support available for carbon reduction and an outline of the solutions being pursued. In the subsequent sub-modules, we will explore in greater depth the solutions being used across the renewable energy sector — beginning with the energy transition itself.',
        },
      ],
    },
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm2-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'global-net-zero-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm2-conc-text',
          content: [
            h2('sm2-conc-h1', 'Sub-Module Summary'),
            p('sm2-conc-p1', 'This sub-module has explored the international frameworks, corporate commitments, and technological solutions that together form the global race to net zero. At its core, the Paris Agreement — adopted at COP21 in 2015 — established the landmark goal of limiting global temperature rise to 1.5–2°C above pre-industrial levels. Nationally Determined Contributions (NDCs) are the primary mechanism through which countries translate this ambition into binding domestic policy, with regular ratcheting cycles intended to increase ambition over time.'),
            p('sm2-conc-p2', 'The corporate response has been significant: thousands of companies have adopted science-based net zero targets, embedding emissions reduction into their governance and supply chains. Technology is a critical enabler — the rapid cost decline of renewable energy, the emergence of electric vehicles, the scaling of green hydrogen, and advances in energy storage have all accelerated the feasibility of deep decarbonisation. The Kyoto Protocol, the IPCC\'s scientific assessments, and global initiatives such as the Global Methane Pledge and Fit for 55 have collectively built the policy architecture within which the transition is occurring.'),
            p('sm2-conc-p3', 'Yet the challenges are considerable. Delivering a just transition requires that the benefits of clean energy reach all nations and communities — including those most vulnerable to climate change. Climate finance, the circular economy, and international cooperation on technology transfer will all be essential in ensuring that net zero is achieved equitably and on time. As subsequent sub-modules explore individual technologies and sectors, the policy and commercial context covered here provides the essential backdrop.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm2-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 2',
          body: 'You now have a solid understanding of the international frameworks, corporate strategies, and technological pathways driving the global race to net zero. The following sub-modules examine the specific energy technologies that are making the transition possible.',
        },
      ],
    },
    {
      _id: 'sm2-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'global-race-to-net-zero-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm2-col-quiz',
          subModuleSlug: 'global-race-to-net-zero',
          moduleId: 'module-1',
        },
      ],
    },
  ],
}
