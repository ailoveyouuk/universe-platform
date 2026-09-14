// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 15: The Future of Renewables
// Source: MOD1_SUB15_FUTURE.pdf pages 3–25
//
// Phase 1 images served from /public/images/sm15/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  energyMixChart,
  renewableGrowthChart,
  driversChart,
  technologyCostChart,
} from './sm15-charts'

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
function localImage(filename: string, alt: string): ImageAsset {
  return { _type: 'image', asset: { _ref: `/images/sm15/Images/${filename}`, _type: 'reference' }, alt, localSrc: `/images/sm15/Images/${filename}` }
}

export const subModule15: SubModule = {
  _id: 'sm-15',
  title: 'SM 15 - The Future of Renewables',
  slug: { _type: 'slug', current: 'future-renewables' },
  orderIndex: 15,
  estimatedHours: 2,
  learningObjectives: [
    'Describe the current global energy mix and the scale of the challenge in transitioning away from fossil fuels',
    'Summarise the key milestones in the historical growth of renewable energy, from the 1970s oil crisis to the Paris Agreement',
    'Identify and explain the five key drivers of renewable energy growth: environmental, economic, government policy, technology, and social',
    'Understand the main challenges that correspond to each driver of growth',
    'Evaluate current and projected global renewable energy capacity and what realistic pathways to net-zero look like',
    'Describe the role of emerging technologies -- including SMRs, hydrogen, smart grids, and battery storage -- in the future energy system',
    'Recognise the scale of change required and what it means for careers, investment, and society',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: Global Status & Introduction ────────────────────────────────
    {
      _id: 'sm15-sec-1-intro',
      title: 'Global Energy Status Today',
      slug: { _type: 'slug', current: 'future-introduction' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'imageBlock', _key: 'sm15-s1-hero',
          image: localImage('AdobeStock_1000541031.webp', 'Global renewable energy overview — solar and wind installations'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm15-s1-text',
          content: [
            h2('sm15-s1-h1', 'The Current Global Energy Mix'),
            p('sm15-s1-p1', 'Despite decades of growth in renewable energy, fossil fuels still dominate the global energy mix. As of 2023, around 80% of global primary energy consumption comes from coal, oil, and natural gas. Renewable energy -- including hydropower, wind, solar, biomass, geothermal, and marine energy -- accounts for approximately 14-15% of global primary energy, with nuclear making up the remainder.'),
            p('sm15-s1-p2', 'This picture varies dramatically by region. Countries like Norway, Iceland, and Costa Rica generate over 90% of their electricity from renewables. By contrast, many rapidly developing economies in Asia and Africa remain heavily dependent on coal for electricity and traditional biomass for heating and cooking. The transition to a clean energy system is therefore not a single global story -- it is many parallel transitions happening at different speeds across different systems.'),
            h2('sm15-s1-h2', 'The Scale of the Challenge'),
            p('sm15-s1-p3', 'To limit global warming to 1.5 degrees C, the world must reduce CO2 emissions by approximately 45% by 2030 and reach net-zero by 2050. This requires an extraordinary pace of change: the IEA estimates that by 2030, wind and solar capacity must triple globally. Every year of delay makes the eventual transition harder, more expensive, and more disruptive.'),
            bullet('sm15-s1-b1', 'Electricity is the key battleground: decarbonising electricity generation and then electrifying as much as possible (transport, heating, industrial processes) is the most cost-effective pathway to net-zero.'),
            bullet('sm15-s1-b2', 'Hard-to-abate sectors -- including cement, steel, aviation, and shipping -- will require a combination of efficiency, electrification, hydrogen, and CCS to decarbonise.'),
            bullet('sm15-s1-b3', 'Energy access remains a critical equity issue: 750 million people worldwide still lack access to electricity, predominantly in sub-Saharan Africa. The clean energy transition must also deliver energy access for all.'),
          ],
        },
        energyMixChart,
        {
          _type: 'calloutBlock', _key: 'sm15-s1-callout',
          variant: 'info',
          title: 'Rapid Change is Already Under Way',
          body: 'Despite the scale of the challenge, the pace of change is accelerating. In 2023, the world added more renewable energy capacity than ever before -- over 295 GW of solar PV alone. The share of wind and solar in global electricity generation has risen from less than 1% in 2010 to around 14% in 2023. Costs have fallen by over 90% for solar and 70% for onshore wind over the same period. The question is no longer whether renewables can compete -- it is whether the transition can happen fast enough.',
        },
      ],
    },

    // ── SECTION 2: Historical Growth of Renewables ────────────────────────────
    {
      _id: 'sm15-sec-2-history',
      title: 'Historical Growth of Renewable Energy',
      slug: { _type: 'slug', current: 'future-history' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock', _key: 'sm15-s2-hero',
          image: localImage('AdobeStock_728400241.webp', 'Historical development of renewable energy infrastructure'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm15-s2-text',
          content: [
            h2('sm15-s2-h1', 'Key Milestones in Renewable Energy Development'),
            p('sm15-s2-p1', 'The modern renewable energy industry has its roots in the energy crises of the 1970s. The 1973 Arab oil embargo triggered a sharp rise in oil prices and exposed the vulnerability of economies dependent on fossil fuel imports. Governments began investing in alternative energy sources -- particularly solar and wind -- for the first time at scale. The renewable energy journey from those early experiments to today\'s multi-trillion-dollar industry has been shaped by a series of landmark moments.'),
            bullet('sm15-s2-b1', '1972 – Stockholm Conference: The United Nations Conference on the Human Environment established the principle that environmental protection and economic development could not be separated. The first international framework for cooperation on environmental issues.'),
            bullet('sm15-s2-b2', '1992 – Rio Earth Summit: The UN Framework Convention on Climate Change (UNFCCC) was signed by 154 nations -- establishing the international architecture for climate negotiations that continues today.'),
            bullet('sm15-s2-b3', '1997 – Kyoto Protocol: The first binding international agreement to reduce greenhouse gas emissions, setting targets for developed nations. A landmark in international climate diplomacy, despite its limitations.'),
            bullet('sm15-s2-b4', '2000s – Feed-in Tariffs and the Solar Revolution: Germany\'s Erneuerbare-Energien-Gesetz (EEG) in 2000 pioneered the feed-in tariff model, triggering rapid solar deployment and driving down manufacturing costs globally through scale.'),
            bullet('sm15-s2-b5', '2009 – Copenhagen Accord: A turning point in climate negotiations -- the accord failed to produce binding commitments but established the political framework for the subsequent Paris Agreement.'),
            bullet('sm15-s2-b6', '2015 – Paris Agreement: 196 parties committed to limiting global warming to well below 2 degrees C above pre-industrial levels, with efforts to limit to 1.5 degrees C. The Paris Agreement marked a fundamental shift -- for the first time, nearly every country in the world signed up to a shared long-term climate goal.'),
            bullet('sm15-s2-b7', '2022 – US Inflation Reduction Act: The largest climate investment in US history -- $369 billion in clean energy tax credits and incentives. Triggered a wave of global clean energy investment and industrial policy competition.'),
            h2('sm15-s2-h2', 'Measuring the Growth: Key Data Points'),
            bullet('sm15-hist-data1', 'Share of Electricity from Renewables: Renewable energy\'s share of global electricity generation has grown substantially over recent decades — from 20.9% in 1985, dipping to 18.7% in 2000 as fossil fuel capacity expanded faster, recovering to 23.0% by 2015 as solar and wind began scaling rapidly, and reaching 29.4% by 2023.'),
            bullet('sm15-hist-data2', 'Share of Primary Energy Consumption: Renewables\' share of total primary energy consumption (which includes heat and transport as well as electricity) has grown from 7.3% in 1985 to 7.8% in 2000, 10.5% in 2015, and 14.6% in 2023 — reflecting that electrification of heat and transport is still in its early stages.'),
            bullet('sm15-hist-data3', 'Global Country Coverage: In 1985, only 16 countries had a renewable energy share of electricity exceeding 10%. By 2023, this had grown to 46 countries — reflecting the rapid globalisation of renewable energy deployment, particularly solar PV.'),
            h2('sm15-s2-h3', 'The Learning Curve in Action'),
            p('sm15-s2-p2', 'Perhaps the most dramatic illustration of renewable energy progress is the learning curve for solar PV. In 1977, a solar module cost $77 per watt. By 2023, the cost had fallen to under $0.30 per watt -- a reduction of over 99.6% in less than 50 years. This reflects the power of manufacturing scale, technological innovation, and cumulative learning. The same dynamic -- though less extreme -- is visible in wind, batteries, and electrolysers.'),
          ],
        },
        renewableGrowthChart,
      ],
    },

    // ── SECTION 3: Drivers of Renewable Growth ───────────────────────────────
    {
      _id: 'sm15-sec-3-drivers',
      title: 'Five Drivers of Renewable Energy Growth',
      slug: { _type: 'slug', current: 'future-drivers' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm15-s3-hero',
          image: localImage('AdobeStock_893750926.webp', 'Forces driving renewable energy expansion — wind and solar farms'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm15-s3-text',
          content: [
            h2('sm15-s3-h1', 'Five Forces Driving the Energy Transition'),
            p('sm15-s3-p1', 'The growth of renewable energy is driven by five interconnected forces. Understanding these drivers -- and the challenges associated with each -- is essential to understanding why the transition is happening at the pace it is, and what might accelerate or slow it further.'),
            h2('sm15-s3-h2', '1. Environmental Drivers'),
            p('sm15-s3-p2', 'The most fundamental driver is the physical reality of climate change. Global average temperatures have already risen by approximately 1.2 degrees C above pre-industrial levels. The consequences are becoming increasingly tangible: record heatwaves, intensifying storms, accelerating sea level rise, Arctic ice loss, and disruption to ecosystems and agriculture. The biodiversity crisis -- with species extinction rates now estimated to be 1,000 times higher than natural background rates -- adds urgency beyond climate alone.'),
            p('sm15-s3-p3', 'These environmental pressures are translating directly into action. Extreme weather events make the economic costs of inaction visible and visceral. Investors, insurers, and regulators are increasingly pricing climate risk into decision-making. Environmental impact assessments and net biodiversity gain requirements are reshaping infrastructure development across many countries.'),
            h2('sm15-s3-h3', '2. Economic Drivers'),
            p('sm15-s3-p4', 'Renewable energy is now the cheapest source of new electricity generation in most parts of the world. The levelised cost of electricity (LCOE) from solar PV has fallen by over 90% since 2010; onshore wind by over 70%; offshore wind by over 60%. In many markets, new renewable capacity is cheaper to build and operate than continuing to run existing coal or gas power stations.'),
            p('sm15-s3-p5', 'Energy security is an increasingly powerful economic driver. The Russian invasion of Ukraine in 2022 exposed the geopolitical and economic risks of dependence on fossil fuel imports. Countries that had been slow to invest in renewables accelerated their programmes dramatically -- recognising that domestic renewable generation is not only cheaper but also more strategically secure than imported gas or oil.'),
            h2('sm15-s3-h4', '3. Government & Policy Drivers'),
            p('sm15-s3-p6', 'Government policy has been instrumental in driving renewable energy deployment. Key mechanisms include carbon pricing (which internalises the cost of emissions), auctions and competitive tenders (which drive down project costs), feed-in tariffs and contracts for difference (which provide revenue certainty), and planning and permitting reform (which removes barriers to deployment).'),
            bullet('sm15-s3-b1', 'EU Green Deal: Targets 55% emissions reduction by 2030 and net-zero by 2050, backed by the REPowerEU plan to accelerate renewables deployment and reduce dependence on Russian gas.'),
            bullet('sm15-s3-b2', 'US Inflation Reduction Act (2022): $369 billion in climate incentives including production tax credits for wind and solar, investment tax credits for storage, and incentives for domestic clean energy manufacturing.'),
            bullet('sm15-s3-b3', 'China\'s 14th Five-Year Plan: Commits China to peak carbon emissions before 2030 and carbon neutrality before 2060, backed by the world\'s largest renewable energy investment programme.'),
            h2('sm15-s3-h5', '4. Technology Drivers'),
            p('sm15-s3-p7', 'Technological innovation continues to reduce costs, improve performance, and open new applications for renewable energy. In solar, bifacial panels, perovskite cells, and building-integrated PV are expanding efficiency and versatility. In wind, larger rotors and taller towers are capturing more energy from lower wind speeds. Battery storage technology is advancing rapidly, with energy density improving and costs falling year on year.'),
            p('sm15-s3-p8', 'Digitalisation -- including AI, machine learning, and advanced grid management software -- is transforming the way energy systems are operated. Smart grids can balance supply and demand across millions of distributed generators and consumers simultaneously. Predictive maintenance, powered by AI, is extending the productive life of renewable assets and reducing downtime.'),
            h2('sm15-s3-h6', '5. Social Drivers'),
            p('sm15-s3-p9', 'Public awareness of climate change has grown enormously over the past decade, driven by the visible impacts of extreme weather, the work of scientists and communicators, and movements such as Fridays for Future. This awareness is translating into changed behaviours -- growing demand for green energy tariffs, electric vehicles, and sustainable products -- and political pressure for stronger climate action.'),
            p('sm15-s3-p10', 'Community-owned renewable energy projects are demonstrating that the energy transition can be democratised -- delivering local economic benefits, community buy-in, and shared ownership of the clean energy future. In Scotland, Denmark, and Germany, community energy has become an important part of the renewable landscape.'),
          ],
        },
        driversChart,
      ],
    },

    // ── SECTION 4: Challenges to Growth ──────────────────────────────────────
    {
      _id: 'sm15-sec-4-challenges',
      title: 'Challenges to Renewable Energy Growth',
      slug: { _type: 'slug', current: 'future-challenges' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm15-s4-hero',
          image: localImage('AdobeStock_840732503.webp', 'Challenges and barriers in renewable energy deployment'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm15-s4-text',
          content: [
            h2('sm15-s4-h1', 'Challenges Matching Each Driver'),
            p('sm15-s4-p1', 'For every driver of renewable energy growth, there is a corresponding challenge that must be addressed. Understanding these challenges is not a reason for pessimism -- it is a prerequisite for effective action.'),
            h2('sm15-s4-h2', 'Environmental Challenges'),
            p('sm15-s4-p2', 'Renewable energy infrastructure itself has environmental impacts. Wind turbines affect bird and bat populations; solar farms alter land use; hydropower dams disrupt river ecosystems. The manufacturing of solar panels and batteries requires rare earth elements and critical minerals -- sourced through mining processes with their own environmental footprints. Balancing the imperative to deploy renewables at scale with genuine environmental protection requires careful planning, honest impact assessment, and continuous improvement in design and end-of-life management.'),
            h2('sm15-s4-h3', 'Economic & Investment Challenges'),
            p('sm15-s4-p3', 'While renewable energy generation costs have fallen dramatically, the broader energy transition requires enormous capital investment -- in grid infrastructure, storage, electric vehicle charging networks, building retrofits, and industrial decarbonisation. Many developing countries face significant financing constraints, with higher costs of capital making clean energy projects less viable without concessional finance or international support.'),
            p('sm15-s4-p4', 'Supply chains for critical minerals -- lithium, cobalt, nickel, rare earths -- are currently concentrated in a small number of countries, creating geopolitical risks and potential bottlenecks. Diversifying supply chains and improving recycling and circular economy practices for batteries and panels are major challenges for the decade ahead.'),
            h2('sm15-s4-h4', 'Policy & Regulatory Challenges'),
            p('sm15-s4-p5', 'Policy inconsistency -- sudden changes to subsidy regimes, retroactive alteration of contracts, or stop-start permitting processes -- creates investment uncertainty and raises the cost of capital for renewable projects. Planning and permitting processes for renewable energy projects remain slow in many countries, with grid connection queues stretching to a decade or more in some markets.'),
            h2('sm15-s4-h5', 'Technology & Grid Challenges'),
            p('sm15-s4-p6', 'The intermittency of wind and solar -- they generate when the wind blows and the sun shines, not necessarily when electricity demand peaks -- is a fundamental characteristic that must be managed. At low penetrations, existing grid flexibility (gas peakers, hydro, interconnectors) can manage this. At high penetrations (50-80% wind and solar), significant investment in storage, demand flexibility, and long-duration balancing is required.'),
            p('sm15-s4-p7', 'Cybersecurity is an increasingly important challenge as energy systems become more digital and distributed. A highly interconnected grid of millions of smart devices, EV chargers, and distributed generators creates a larger attack surface than the centralised fossil fuel systems it is replacing.'),
            h2('sm15-s4-h6', 'Social & Behavioural Challenges'),
            p('sm15-s4-p8', 'Despite growing public support for renewable energy in principle, local opposition to specific projects -- often referred to as "not in my backyard" (NIMBY) resistance -- can significantly slow deployment. Community engagement, fair distribution of benefits and impacts, and genuine participation in decision-making are essential to maintaining the social licence for renewable energy development.'),
            p('sm15-s4-p9', 'The just transition challenge -- ensuring that workers and communities in fossil fuel industries are not left behind -- is one of the most politically sensitive aspects of the energy transition. Without credible just transition plans, opposition to change can derail otherwise popular policies.'),
            bullet('sm15-chall-lockin', 'Fossil Fuel Infrastructure Lock-In: Existing energy infrastructure — including grids, pipelines, and electricity markets — was designed around fossil fuel generation and continues to be dominated by it. This makes integrating new, decentralised clean energy sources technically and commercially challenging, requiring significant investment in grid modernisation and market reform before the full potential of renewables can be realised.'),
            bullet('sm15-chall-gov-fossilfuel', 'Governments Actively Promoting Fossil Fuels: It is important to recognise that many governments around the world continue to actively drive fossil fuel growth — for economic reasons such as export revenues and jobs, energy security reasons such as domestic resource exploitation, or geo-strategic reasons relating to influence over energy-importing nations. This creates a direct political counter-force to international climate agreements and can make it harder to ratify and implement ambitious renewable energy policies.'),
            bullet('sm15-chall-misinformation', 'Misinformation and Climate Scepticism: While a minority view, some people believe that the human effects on climate change are exaggerated or even false. This position — amplified by certain media outlets and political actors — can create public and political resistance to the policy changes necessary to drive rapid renewable energy deployment, particularly in specific national contexts.'),
          ],
        },
        {
          _type: 'calloutBlock', _key: 'sm15-s4-callout',
          variant: 'warning',
          title: 'The Permitting Bottleneck',
          body: 'One of the most significant near-term constraints on renewable energy deployment is not technology or cost -- it is planning and permitting. In the EU, the average time to permit a wind farm is 8-10 years. In the US, transmission line permitting averages 10 years. The IEA estimates that 1,500 GW of renewable projects are currently stuck in grid connection queues globally. Unlocking this backlog through permitting reform and grid investment is as important as any technology breakthrough.',
        },
      ],
    },

    // ── SECTION 5: Projections & The Future ──────────────────────────────────
    {
      _id: 'sm15-sec-5-projections',
      title: 'Projections & The Future of Energy',
      slug: { _type: 'slug', current: 'future-projections' },
      estimatedMinutes: 25,
      content: [
        {
          _type: 'imageBlock', _key: 'sm15-s5-hero',
          image: localImage('AdobeStock_1241699107.webp', 'Future of renewable energy — smart grids and emerging clean technologies'),
          fullWidth: true,
        },
        {
          _type: 'richText', _key: 'sm15-s5-text',
          content: [
            h2('sm15-s5-h1', 'Global Renewable Capacity Projections'),
            p('sm15-s5-p1', 'The IEA\'s Net Zero by 2050 scenario requires global renewable electricity capacity to reach 11,000 GW by 2030 -- more than triple current levels. Solar is projected to account for the largest share of new capacity, with wind (onshore and offshore) making up most of the remainder. The pace of deployment required is unprecedented -- equivalent to installing a new large solar farm every day.'),
            p('sm15-s5-p2', 'Regional variation in the energy transition is significant. Latin America is projected to move from approximately 64% renewable electricity in 2025 to 90% by 2050, leveraging its exceptional wind, solar, and hydro resources. Europe is targeting 90%+ renewable electricity by 2040. Even regions currently dominated by fossil fuels -- the Middle East, South and Southeast Asia -- are seeing rapid renewable deployment driven by cost competitiveness and energy security.'),
            h2('sm15-s5-h2', 'Emerging Technologies Shaping the Future'),
            bullet('sm15-s5-b1', 'Small Modular Reactors (SMRs): Nuclear technology is being reimagined for the 21st century. SMRs -- reactors of less than 300 MW that can be factory-built and deployed faster than conventional nuclear -- are being developed by dozens of companies globally. They could play a significant role in providing low-carbon firm power for industrial heat, hydrogen production, and electricity in regions with limited renewables potential.'),
            bullet('sm15-s5-b2', 'Green Hydrogen at Scale: As electrolyser costs fall and renewable electricity becomes cheaper, green hydrogen is becoming increasingly viable for industrial decarbonisation, long-duration energy storage, and as a fuel for heavy transport and shipping. Green hydrogen export projects -- particularly in Australia, Chile, and Namibia -- could transform global energy trade.'),
            bullet('sm15-s5-b3', 'Long-Duration Energy Storage: Beyond lithium-ion batteries (suited for 2-4 hours of storage), technologies including flow batteries, compressed air, gravity storage, and hydrogen are being developed for multi-day or seasonal storage. These will be essential for managing the variability of wind and solar at very high penetrations.'),
            bullet('sm15-s5-b4', 'Smart Grids & Demand Flexibility: The power system of the future will be highly distributed, digital, and interactive. Millions of EVs, heat pumps, and smart appliances will respond to price signals to shift demand -- effectively acting as virtual power plants that help balance the grid. This "vehicle-to-grid" and "building-to-grid" flexibility could provide enormous balancing capability at low cost.'),
            bullet('sm15-s5-b5', 'Offshore Wind at Scale: Offshore wind is moving into deeper waters through floating foundations -- opening up vast new resource areas off the coasts of Japan, the US West Coast, and in the Mediterranean. Floating offshore wind could eventually provide several times total current global electricity generation.'),
            bullet('sm15-s5-b6', 'Next-Generation Solar: Perovskite solar cells are approaching efficiencies above 30% in the laboratory -- significantly higher than mainstream silicon panels. Tandem perovskite-silicon cells could push commercial module efficiencies well above 30% within the decade, further reducing the land area and cost per unit of energy.'),
            bullet('sm15-s5-b7', 'Bifacial Solar PV: Next-generation bifacial solar panels capture sunlight on both the front and rear surfaces of the panel. By harvesting reflected light from the ground or surface beneath the panel, bifacial panels can deliver 10–30% more energy output than conventional single-sided panels, improving project economics without requiring additional land area.'),
            h2('sm15-s5-h2b', 'Regional Projections'),
            p('sm15-regional-proj-intro', 'Regional projections for renewable energy\'s share of electricity generation show strong growth across all regions, with particular acceleration expected in Europe and Latin America:'),
            bullet('sm15-regional-proj-eu', 'Europe: Renewable energy\'s share of electricity is projected to rise from approximately 52% in 2025 to 66% by 2030, and beyond 90% by 2040 — driven by the EU\'s Renewable Energy Directive and member state net-zero commitments.'),
            bullet('sm15-regional-proj-latam', 'Latin America: Already a renewable energy leader at approximately 64% in 2025 (driven by Brazil\'s hydropower and growing wind and solar base), Latin America is projected to reach 65% by 2030 and approach 90% by 2050.'),
            bullet('sm15-regional-proj-northam', 'North America: Projected to grow from approximately 31% in 2025 to 48% by 2030, though the trajectory will be influenced by policy continuity following electoral cycles.'),
            bullet('sm15-regional-proj-africa', 'Africa: Renewable energy\'s share is projected to grow from approximately 29% in 2025 to 42% by 2030, driven by rapidly expanding solar capacity in North Africa and southern Africa, and continued hydropower development in East and Central Africa.'),
            bullet('sm15-regional-proj-asia', 'Asia-Pacific: Projected growth from 31% in 2025 to 42% by 2030, with significant variation between countries — Australia and Vietnam are growing rapidly, while the overall regional figure is weighted by coal-heavy markets.'),
            h2('sm15-s5-h2c', 'The Temperature Context'),
            p('sm15-temp-trajectory', 'The urgency of the energy transition is underscored by observed temperature trends. The Paris Agreement\'s goal is to limit global average temperature rise to 1.5°C above pre-industrial levels. However, by early 2025, global average temperatures had already exceeded this threshold on an annual basis, with temperatures likely approaching 1.75°C above pre-industrial levels. This trajectory makes the pace of renewable energy deployment — and the speed of eliminating fossil fuel use — increasingly critical if worst-case warming scenarios are to be avoided.'),
            h2('sm15-s5-h3', 'What This Means for Careers and Society'),
            p('sm15-s5-p3', 'The scale and pace of the energy transition will reshape the global economy in profound ways. Fossil fuel industries will decline; clean energy industries will grow. New supply chains, infrastructure networks, and skill sets will be required. The IEA estimates that the clean energy economy will employ 30 million people globally by 2030 -- more than offsetting job losses in fossil fuels, but requiring massive investment in retraining and workforce development.'),
            p('sm15-s5-p4', 'For anyone entering or building a career in the energy sector today, the direction of travel is clear. The skills, knowledge, and networks developed in renewable energy will be in growing demand for decades. Understanding the full breadth of the sector -- from physics and engineering to finance, policy, and community engagement -- is the foundation of a career that can make a genuine difference at one of the defining moments in human history.'),
          ],
        },
        technologyCostChart,
        {
          _type: 'calloutBlock', _key: 'sm15-s5-callout',
          variant: 'key-fact',
          title: 'The Energy Transition is Inevitable — The Pace is the Question',
          body: 'The economics, the physics, and the geopolitics all point in the same direction: towards a world powered predominantly by clean energy. The technology exists. The costs are competitive. The policy frameworks are developing. What remains is execution -- at a pace and scale that matches the urgency of the climate challenge. Every professional in the renewable energy sector has a role to play in accelerating that execution. The future of energy is renewable, and the people building it are working in this industry today.',
        },
      ],
    },


    // ── SECTION: Confirmation of Learning ────────────────────────────────────────
    // ── CONCLUSION: Sub-Module Summary ────────────────────────────────────────
    {
      _id: 'sm15-sec-conclusion',
      title: 'Sub-Module Summary',
      slug: { _type: 'slug', current: 'future-renewables-summary' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm15-conc-text',
          content: [
            h2('sm15-conc-h1', 'Sub-Module Summary'),
            p('sm15-conc-p1', 'This final sub-module has brought together the themes of the entire course by examining the trajectory of renewable energy globally — where we are today, how we got here, and where credible projections suggest we are heading. Renewables now supply over 30% of global electricity generation, with solar and wind leading the fastest cost reductions in energy history. The five key drivers of continued growth — cost competitiveness, policy commitment, energy security concerns, corporate demand, and technological innovation — are reinforcing each other to create unprecedented deployment momentum.'),
            p('sm15-conc-p2', 'The challenges are real and must not be understated. Permitting bottlenecks delay projects by years across Europe and North America. Grid infrastructure — both transmission and distribution — is not keeping pace with generation deployment, creating curtailment and connection queues. Supply chain constraints for critical minerals (lithium, cobalt, nickel, rare earths) introduce geopolitical risk and cost pressure. Capital access remains unequal: while developed markets attract competitive green finance, many developing nations with excellent renewable resources face higher cost-of-capital that slows the energy transition precisely where it is most needed.'),
            p('sm15-conc-p3', 'Despite these challenges, the direction of travel is clear and — in energy history terms — remarkable. The IEA\'s Net Zero by 2050 scenario requires renewables to supply 90% of global electricity by mid-century, with solar becoming the single largest source. Hydrogen, long-duration storage, and enhanced grids are the enabling infrastructure. International cooperation — on technology transfer, climate finance, and carbon markets — is the diplomatic prerequisite. Having completed this course, you are now equipped with the knowledge, frameworks, and sector understanding to contribute meaningfully to the energy transition: as a professional, an advocate, and an informed participant in one of the most consequential transformations in human history.'),
          ],
        },
        {
          _type: 'calloutBlock',
          _key: 'sm15-conc-callout',
          variant: 'key-fact',
          title: 'End of Sub-Module 15 — Course Complete',
          body: 'Congratulations on completing the Renewables Connect learning programme. You have covered the full spectrum of renewable and low-carbon energy technologies, the economics and policy frameworks that govern them, and the workforce and skills that will deliver the transition. The energy future needs informed, passionate professionals — and that is exactly what you now are.',
        },
      ],
    },
    {
      _id: 'sm15-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'future-renewables-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm15-col-quiz',
          subModuleSlug: 'future-renewables',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
