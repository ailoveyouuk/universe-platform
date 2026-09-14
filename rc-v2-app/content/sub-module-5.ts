// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 5: Floating Offshore Wind
// Source: PDF pages 4–38 (verbatim text — do not edit without updating source)
//
// Phase 1 images are served from /public/images/sm5/
// Copy source files from: Platform_Dev/Module Assets/Sub-Module 5/Images/
// ─────────────────────────────────────────────────────────────────────────────

import type { SubModule, ImageAsset } from '@/types'
import {
  flowLcoeComparisonChart,
  flowCapexChart,
  flowMarketChart,
  flowCapacityForecastChart,
  windLcoeProjectionChart,
  dnvOffshoreGrowthChart,
  flowRegionalForecast2050Chart,
  flowLcoeRangeChart,
} from './sm5-charts'

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
    asset: { _ref: `/images/sm5/${filename}`, _type: 'reference' },
    alt,
    localSrc: `/images/sm5/${filename}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 5 Data
// ─────────────────────────────────────────────────────────────────────────────

export const subModule5: SubModule = {
  _id: 'sm-5',
  title: 'SM 5 — Floating Offshore Wind',
  slug: { _type: 'slug', current: 'floating-offshore-wind' },
  orderIndex: 5,
  estimatedHours: 2,
  learningObjectives: [
    'Understand what floating offshore wind is and how it differs from fixed-bottom offshore wind',
    'Explain why floating technology unlocks 80% of the world\'s offshore wind resource potential',
    'Trace the historical development of FLOW from 1990s concepts through to commercial-scale deployment',
    'Identify and differentiate between the main floating platform types: Semi-Submersible, SPAR, and Tension Leg',
    'Understand mooring systems, anchor types, and cable design in the context of floating wind',
    'Assess the financial outlook, policy environment, key challenges, and growth opportunities for FLOW',
  ],
  module: { _ref: 'module-1' },
  sections: [

    // ── SECTION 1: What is Floating Offshore Wind? (PDF pp. 4–5) ─────────────
    {
      _id: 'sm5-sec-1-intro',
      title: 'What Is Floating Offshore Wind?',
      slug: { _type: 'slug', current: 'what-is-floating-offshore-wind' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm5-s1-hero',
          image: localImage('Images/MOD1_SUB5_FLOW_OFFSHORE_WIND 1.webp', 'Floating offshore wind turbine at sea'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm5-s1-text',
          content: [
            h2('sm5-s1-h1', 'What Is Floating Offshore Wind?'),
            p('sm5-s1-p1', 'We will now look at Floating offshore wind, known as FLOW. A floating offshore wind turbine is quite simply a very large offshore wind turbine mounted on a floating structure (instead of a fixed foundation), allowing it to be positioned in water depths where fixed-foundation turbines are not feasible.'),
            p('sm5-s1-p2', 'FLOW unlocks huge amounts of new renewable energy potential as around 80% of the world\'s offshore wind resources are in waters of more than 60-metre depth, where fixed-bottom offshore wind is simply not economically attractive or often not technically viable.'),
            p('sm5-s1-p3', 'It\'s attractive to go deeper, as the further from shore you go (and hence deeper water) the higher and more consistent the average wind speeds are, although it is worth noting that floating wind is not always further from shore and many early projects overlap with deeper fixed bottom technology. This means floating offshore wind farms will often have a higher capacity factor than fixed wind; put simply they can produce more energy throughout the year.'),
            h3('sm5-s1-h2', 'Key Components'),
            p('sm5-s1-p4', 'Like fixed offshore wind, a floating array shares many of the same core elements:'),
            bullet('sm5-s1-b1', 'Wind Turbines — turbines mounted on floating structures rather than fixed seabed foundations.'),
            bullet('sm5-s1-b2', 'Offshore Sub-Stations — which may also float in some project designs.'),
            bullet('sm5-s1-b3', 'Array Cables — subsea cables linking individual turbines to the substation.'),
            bullet('sm5-s1-b4', 'Export Cables — high-voltage subsea cables transmitting power from the substation to shore.'),
            bullet('sm5-s1-b5', 'Mooring Systems — for stability and safety, keeping platforms on station in deep water.'),
            bullet('sm5-s1-b6', 'Onshore Sub-Station — steps down voltage on arrival at shore for grid connection.'),
            bullet('sm5-s1-b7', 'Connection to the National Transmission System — the point at which FLOW-generated electricity joins the wider national grid.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s1-real',
          image: localImage('Images/floating offshore real 1.webp', 'Floating offshore wind turbine in operation'),
          caption: 'A floating offshore wind turbine in operation — mounted on a floating structure anchored to the seabed by mooring lines.',
        },
      ],
    },

    // ── SECTION 2: Why Floating Wind? (PDF pp. 6–7) ───────────────────────────
    {
      _id: 'sm5-sec-2-why',
      title: 'Why Floating Wind?',
      slug: { _type: 'slug', current: 'why-floating-wind' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s2-text',
          content: [
            h2('sm5-s2-h1', 'Why Floating Wind?'),
            p('sm5-s2-p1', 'The Global Wind Energy Council estimates that floating wind capacity could reach 70 GW by 2040, with the potential to power over 12 million homes globally by 2030. As the technology advances and deployment scales, this number is expected to increase substantially.'),
            p('sm5-s2-p2', 'Countries such as Japan, South Korea, the United States, and several European nations are setting ambitious targets for floating offshore wind. For example, Japan is targeting 10 GW of offshore wind by 2030, while the U.S. aims to reach 15 GW of floating capacity by 2035, all as part of their broader decarbonization and energy transition strategies.'),
            p('sm5-s2-p3', 'Recent project announcements from regions such as Europe, the U.S., and Asia-Pacific — including initiatives like ScotWind, Norway\'s Utsira Nord, and upcoming auctions in the Asia-Pacific — highlight the global drive to deploy floating wind technology. However, significant challenges remain, including supply chain limitations, regulatory hurdles, and the need for greater financing.'),
            {
              _type: 'block' as const,
              _key: 'sm5-s2-quote',
              style: 'blockquote' as const,
              children: [{ _type: 'span' as const, _key: 'sm5-s2-quotes', text: '"Floating offshore wind has the potential to unlock vast amounts of renewable energy globally, powering millions of homes while creating jobs and driving economic growth across multiple regions."', marks: [] as string[] }],
              markDefs: [] as never[],
            },
            p('sm5-s2-p4', '— Global Wind Energy Council (GWEC), 2023'),
            h3('sm5-s2-h2', 'Key Benefits'),
            bullet('sm5-s2-b1', 'Increased Reliability — removing water depth constraints allows us to select the best sites in the world.'),
            bullet('sm5-s2-b2', 'Stronger, More Consistent Winds — winds are stronger and more consistent further out to sea, giving higher generation and a higher capacity factor.'),
            bullet('sm5-s2-b3', '80% of the world\'s offshore wind resource potential is in waters deeper than 60 metres — only unlockable through floating technology.'),
            bullet('sm5-s2-b4', 'Proximity to Global Markets — 2.4 billion people live within 100 km of the shoreline, meaning FLOW can deliver major-scale power directly to global markets.'),
            bullet('sm5-s2-b5', 'Cost Competitiveness Target — the goal is that floating wind becomes competitive with other forms of energy by the year 2030.'),
            h3('sm5-s2-h3', 'But There Are Challenges'),
            bullet('sm5-s2-b6', 'Finding dynamic cable solutions to manage the movement of floating platforms.'),
            bullet('sm5-s2-b7', 'Finding manufacturing solutions to deal with the scale of the need over the next 30 years.'),
            bullet('sm5-s2-b8', 'Finding ways of manufacturing in the UK at competitive prices — sufficient steel and concrete supply.'),
            bullet('sm5-s2-b9', 'Standardisation of mooring solutions to allow for a competitive UK supply chain.'),
            bullet('sm5-s2-b10', 'Development of floating sub-station solutions for large-scale arrays.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s2-img',
          image: localImage('Images/image 2.webp', 'Why floating wind — deeper waters unlock greater wind resources'),
          caption: 'Floating offshore wind unlocks wind resources in waters deeper than 60 metres — inaccessible to fixed-bottom turbines.',
        },
      ],
    },

    // ── SECTION 3: Historical Development (PDF pp. 8–11) ─────────────────────
    {
      _id: 'sm5-sec-3-history',
      title: 'Historical Development',
      slug: { _type: 'slug', current: 'flow-historical-development' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'floatingWindTimelineDiagram' as const,
          _key: 'sm5-s3-timeline',
          title: 'Floating Offshore Wind — Historical Development',
          caption: 'Key milestones in the development of floating offshore wind, from 1990s conceptual work through prototype installations to commercial-scale deployment in the 2020s.',
        },
        {
          _type: 'richText',
          _key: 'sm5-s3-text',
          content: [
            h2('sm5-s3-h1', 'Historical Development of Floating Offshore Wind'),
            p('sm5-s3-p1', 'The historical development of floating offshore wind energy is a testament to the relentless pursuit of innovation in the quest for sustainable and efficient energy sources.'),
            p('sm5-s3-p2', 'The concept of offshore wind energy began to materialise in the 1990s, with the installation of fixed-bottom offshore wind turbines in shallow waters near the coasts of Denmark. However, it was soon recognised that the greatest wind potential lay further offshore, in deeper waters where conventional fixed-bottom designs were not viable due to economic and technical constraints.'),
            p('sm5-s3-p3', 'This realisation sparked the advent of floating offshore wind turbines, a transformative step that allowed harnessing wind energy in deep-sea environments. The first full-scale floating wind turbine was installed off the coast of Norway in 2009, representing a major breakthrough. This Hywind project by Equinor, formerly known as Statoil, marked the beginning of a new era in wind energy technology, enabling wind farms to venture into previously inaccessible locations.'),
            h3('sm5-s3-h2', '2010s: From Prototypes to Pilot Projects'),
            p('sm5-s3-p4', 'Following the initial success of early prototypes, the 2010s saw significant advancements in the design, engineering, and deployment of floating offshore wind turbines. The industry was driven by the need for renewable energy sources capable of providing substantial power without the geographical limitations of land-based or shallow-water offshore turbines.'),
            p('sm5-s3-p5', 'The design of these floating structures evolved to include semi-submersible platforms, spar-buoy designs, and tension-leg platforms, each addressing the unique challenges posed by the marine environment.'),
            p('sm5-s3-p6', 'The latter part of the decade saw a series of pilot projects around the world, including off the coasts of Scotland, Portugal, and Japan, which validated the commercial viability of floating offshore wind farms. These projects not only demonstrated technical feasibility but also provided insights into reducing costs, improving efficiency, and integrating these systems into existing energy grids.'),
            bullet('sm5-s3-b1', '2015 — Saitec presented their SATH (Swinging Around Twin Hull) platform, relying on a single mooring point system commonly used in oil & gas. This demonstrated the use of concrete in floating wind and how lessons can be learned from other sectors.'),
            bullet('sm5-s3-b2', '2018 — BW Ideol\'s Floatgen project, leveraging a concrete barge-type design, became the world\'s first floating barge designed for offshore wind.'),
            h3('sm5-s3-h3', '2020s: Commercial Scale'),
            p('sm5-s3-p7', 'As the technology matures, the 2020s are set to witness the proliferation of floating offshore wind energy on a commercial scale, with numerous large-scale projects planned or underway, signalling a promising new chapter in renewable energy.'),
            h3('sm5-s3-h4', 'UK Water Depths — An Ideal Location'),
            bullet('sm5-s3-b3', 'Large areas of sea around the UK under 50 m deep are already heavily populated with operating or future planned fixed-bottom wind farms.'),
            bullet('sm5-s3-b4', 'There is a huge amount of seabed around the UK between the depths of 50 m and 200 m — these deeper waters offer future potential FLOW development areas.'),
            bullet('sm5-s3-b5', 'With fixed offshore wind farms becoming unviable from circa 60 m upwards, floating offshore wind becomes the preferable option — making the South-West of England and Scotland ideal locations for FLOW.'),
          ],
        },
      ],
    },

    // ── SECTION 4: Design & Engineering (PDF pp. 12–14) ──────────────────────
    {
      _id: 'sm5-sec-4-design',
      title: 'Design & Engineering',
      slug: { _type: 'slug', current: 'flow-design-engineering' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm5-s4-hero',
          image: localImage('Images/design and engineering 1.webp', 'Floating offshore wind design and engineering overview'),
          fullWidth: true,
        },
        {
          _type: 'richText',
          _key: 'sm5-s4-text',
          content: [
            h2('sm5-s4-h1', 'Design & Engineering of Floating Offshore Wind'),
            p('sm5-s4-p1', 'The design and engineering of FLOW is centred around the critical components that set them apart from traditional fixed-bottom turbines and are crucial to the viability and success of floating energy projects. These turbines are designed to be mounted on floating structures that are anchored to the seabed, allowing them to be positioned in deep waters where wind speeds are higher and more consistent.'),
            p('sm5-s4-p2', 'The engineering of these turbines involves creating a stable platform that can withstand the harsh marine environment, including strong winds, waves, and currents. Innovations in design often include multiple floating bodies, such as semi-submersible platforms, spar buoys, or tension leg platforms as well as concrete barges, each offering different advantages in terms of stability, cost, and depth suitability.'),
            p('sm5-s4-p3', 'Engineers must address the dynamic behaviour of the platforms, ensuring that the motion does not negatively impact the performance of the turbines. The use of advanced materials, such as high-strength, corrosion-resistant alloys, and composites, also plays a significant role in extending the lifespan and reducing the maintenance requirements of these floating structures.'),
            p('sm5-s4-p4', 'In addition to the physical design, the engineering of floating wind turbines also includes sophisticated mooring and dynamic cable systems, which secure the turbines to the seabed and transmit the generated electricity to shore. The mooring system must be carefully designed to provide enough flexibility to allow the platform to move with the ocean\'s dynamics, but also enough restraint to keep the turbine from drifting.'),
            p('sm5-s4-p5', 'The integration of digital technologies for monitoring and control is becoming increasingly important. This includes the use of sensors and real-time data analysis to optimise turbine performance, predict maintenance needs, and ensure the safety and longevity of the floating structures.'),
            p('sm5-s4-p6', 'Overall, the design and engineering of floating wind turbines requires a multidisciplinary approach, combining marine engineering, aerodynamics, materials science, and data analytics to overcome the challenges of the marine setting and capitalise on its energy potential.'),
            h3('sm5-s4-h2', 'Key Engineering Considerations'),
            p('sm5-s4-p7', 'Beyond a certain depth of around 60 m, fixed foundations increasingly become unviable technically or economically and floating foundations become preferable. FLOW is a sector with a huge amount of ongoing innovation — the actual floating platform designs themselves are one of the most critical to further increasing the deployment of offshore wind in the UK\'s deeper territorial waters.'),
            p('sm5-s4-p8', 'However, combined wind and wave dynamic loading makes control and fatigue calculations of the structures more complex and significant cost reduction is still required to reach a competitive LCOE.'),
            h3('sm5-s4-h3', 'Floating Foundation Considerations'),
            bullet('sm5-s4-b1', 'Construction may need a deep water port.'),
            bullet('sm5-s4-b2', 'Whether to return to port for major maintenance work, or address in-field.'),
            bullet('sm5-s4-b3', 'Requirement for dynamic cable and suitable moorings.'),
            bullet('sm5-s4-b4', 'Interaction with other marine users and marine life must be evaluated.'),
            bullet('sm5-s4-b5', 'Arrays of multiple turbines moored and anchored together can impact marine traffic and local fisheries.'),
            bullet('sm5-s4-b6', 'The mooring system needs to fit into the overall economics of the wind farm, such that the project can achieve its economic objective in terms of LCOE.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s4-img2',
          image: localImage('Images/design and engineering 2.webp', 'Floating offshore wind design engineering detail'),
          caption: 'Design and engineering of floating offshore wind — combining marine engineering, aerodynamics, and materials science.',
        },
      ],
    },

    // ── SECTION 5: Platform Types (PDF pp. 15–18) ─────────────────────────────
    {
      _id: 'sm5-sec-5-platforms',
      title: 'Floating Platform Types',
      slug: { _type: 'slug', current: 'flow-platform-types' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm5-s5-hero',
          image: localImage('Images/types 1.webp', 'Overview of floating offshore wind platform types'),
          fullWidth: true,
          caption: 'The three main floating platform types used in floating offshore wind: Semi-Submersible, SPAR, and Tension Leg Platform.',
        },
        {
          _type: 'offshoreFoundationTypesDiagram' as const,
          _key: 'sm5-s5-foundation-diagram',
          title: 'Offshore Wind Foundation Types',
          caption: 'Cross-section comparison of all offshore wind foundation types — from shallow-water monopiles to deep-water floating platforms — showing the progression from fixed to floating technology with increasing water depth.',
        },
        {
          _type: 'richText',
          _key: 'sm5-s5-semi',
          content: [
            h2('sm5-s5-h1', 'Floating Platform Types'),
            h3('sm5-s5-h2', 'Semi-Submersible'),
            bullet('sm5-s5-b1', 'Consists of multiple columns and pontoons — providing stability and buoyancy.'),
            bullet('sm5-s5-b2', 'Centre of gravity above centre of buoyancy.'),
            bullet('sm5-s5-b3', 'Stability achieved through restoring movement of columns, kept in place by mooring system with catenary spread mooring lines and drag/suction anchors.'),
            bullet('sm5-s5-b4', 'Many concepts in production — typically three large float cans and steel braces.'),
            bullet('sm5-s5-b5', 'Deployed from 60 m and above.'),
            bullet('sm5-s5-b6', 'Lower anchoring cost than a Tension Leg Platform.'),
            bullet('sm5-s5-b7', 'Relatively simple transportation compared to other concepts.'),
            bullet('sm5-s5-b8', 'Wind turbine can be installed dockside in a Port or Harbour.'),
          ],
        },
        {
          _type: 'floatingPlatformTypesDiagram' as const,
          _key: 'sm5-s5-platform-types-diagram',
        },
        {
          _type: 'richText',
          _key: 'sm5-s5-spar',
          content: [
            h3('sm5-s5-h3', 'SPAR'),
            bullet('sm5-s5-b9', 'A large vertical buoyant cylinder, ballasted from the bottom end with a deep draft, minimising wind responsiveness.'),
            bullet('sm5-s5-b10', 'Kept in place with catenary spread mooring lines with drag/suction anchors — could also use drilled or driven pile anchors.'),
            bullet('sm5-s5-b11', 'Simple design compared to Tension Leg which fights its corner of being a cost-effective choice when considering manufacturing costs.'),
            bullet('sm5-s5-b12', 'Tall structure requires deployment at depth greater than 100 m.'),
            bullet('sm5-s5-b13', 'Provides challenge keeping upright during transportation through shallow water zone.'),
            bullet('sm5-s5-b14', 'Offshore installation for turbine required, as with bottom-fixed foundations.'),
          ],
        },
        {
          _type: 'richText',
          _key: 'sm5-s5-tlp',
          content: [
            h3('sm5-s5-h4', 'Tension Leg Platform (TLP)'),
            bullet('sm5-s5-b15', 'A Tension Leg Platform (TLP) normally consists of columns and pontoons.'),
            bullet('sm5-s5-b16', 'Unique mooring system with tensioned tendons to provide stability.'),
            bullet('sm5-s5-b17', 'Vertically strained to preclude vertical and rotational movements.'),
            bullet('sm5-s5-b18', 'Most stable current concept.'),
            bullet('sm5-s5-b19', 'Installable in a wide range of water depths from 70 m.'),
            bullet('sm5-s5-b20', 'This design has been less common compared to the SPAR and Semi-Submersible platforms.'),
          ],
        },
        {
          _type: 'richText',
          _key: 'sm5-s5-mooring',
          content: [
            h3('sm5-s5-h5', 'Taut Angle Mooring System'),
            bullet('sm5-s5-b21', 'The lightweight vertical taut leg mooring line system consists of anchor lines subjected to pre-tension such that they are taut, in principle utilising the tent effect. The lines radiate outwards from the floater.'),
            bullet('sm5-s5-b22', 'Compared to a tension leg anchoring system, the taut anchoring is angled from the seabed to the offshore wind foundation and takes loads both in vertical and horizontal direction.'),
            bullet('sm5-s5-b23', 'The mooring system is suitable for deep water offshore wind as the angled lines give more load sharing between the mooring lines.'),
          ],
        },
        {
          _type: 'mooringSystemsDiagram' as const,
          _key: 'sm5-s5-mooring-diagram',
        },
        {
          _type: 'richText',
          _key: 'sm5-s5-catenary',
          content: [
            h3('sm5-s5-h6', 'Catenary Mooring System'),
            bullet('sm5-s5-b24', 'The most used subsea mooring system in normal water depths. Most drilling rigs and semi-submersible based offshore oil and gas foundations use this system.'),
            bullet('sm5-s5-b25', 'The anchoring system is horizontal at the seabed and the forces to provide station keeping are generated by lifting of the chain off the seabed. Chains or heavy steel rope need to be very long compared with the water depth — fibre ropes are an alternative for parts of the catenary mooring for floating offshore wind foundations.'),
            bullet('sm5-s5-b26', 'The seabed foundation for catenary mooring systems can normally not take any vertical loading.'),
            bullet('sm5-s5-b27', 'The station keeping system uses stud-less or studded chains, polyester-based synthetic or lighter steel wire ropes for tether line materials. The mooring lines terminate at the seabed with subsea anchors — which can be suction anchors, plate anchors, fluke anchors, or deep piles.'),
          ],
        },
      ],
    },

    // ── SECTION 6: Anchor Types (PDF p. 19) ───────────────────────────────────
    {
      _id: 'sm5-sec-6-anchors',
      title: 'Anchor Types & Mooring Design',
      slug: { _type: 'slug', current: 'flow-anchor-types' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s6-text',
          content: [
            h2('sm5-s6-h1', 'Anchor Types'),
            p('sm5-s6-p1', 'A range of anchor types are used in floating offshore wind projects, selected based on the mooring system design and the seabed conditions at the site:'),
            bullet('sm5-s6-b1', 'Suction Embedded Plate Anchor (SEPLA)'),
            bullet('sm5-s6-b2', 'Drag VLA (Vertical Load Anchor)'),
            bullet('sm5-s6-b3', 'Drag Anchor'),
            bullet('sm5-s6-b4', 'Suction Anchor'),
            bullet('sm5-s6-b5', 'Driven Anchor'),
            bullet('sm5-s6-b6', 'Drilled & Grouted Anchor'),
            bullet('sm5-s6-b7', 'Gravity Anchor (clump weight)'),
          ],
        },
        {
          _type: 'anchorTypesDiagram' as const,
          _key: 'sm5-s6-anchor-diagram',
        },
        {
          _type: 'richText',
          _key: 'sm5-s6-mooring-design',
          content: [
            h2('sm5-s6-h2', 'Mooring Design Considerations'),
            p('sm5-s6-p2', 'Designing a mooring system for a floating energy production system is complex but the overall process is mature. Years of past work and project experience in offshore industries show that many factors must be considered. Factors will vary depending on the type of floating system being moored and the geographic region in which it is intended to operate.'),
            p('sm5-s6-p3', 'Key mooring design considerations include:'),
            bullet('sm5-s6-b8', 'Mooring system design, fabrication, installation, inspection, maintenance and repair requirements and applicable codes and standards to obtain and maintain regulatory classification.'),
            bullet('sm5-s6-b9', 'The floating system\'s station-keeping performance requirements to design a mooring system that will facilitate and maximise energy production and power transmission (e.g., cables, umbilicals, etc.)'),
            bullet('sm5-s6-b10', 'Availability, fabricability and maturity of the selected mooring components.'),
            bullet('sm5-s6-b11', 'Installation vessel availability, accessibility and capability.'),
            bullet('sm5-s6-b12', 'The mooring connection to the floating platform — dictates the mooring design e.g. above water, below water, central structures, edges, single point mooring module etc.'),
            bullet('sm5-s6-b13', 'The system\'s design life and long-term inspection, maintenance and repair requirements and constraints as they affect mooring component selection.'),
            bullet('sm5-s6-b14', 'Site-specific metocean environmental conditions and geotechnical properties that the mooring system and its components must withstand and can be anchored in.'),
            bullet('sm5-s6-b15', 'Local staging and mobilisation yard accessibility, availability and capability for mooring equipment and offshore operations support.'),
            bullet('sm5-s6-b16', 'Logistical requirements and constraints for shipping, importation and the receipt of mooring and installation equipment.'),
            p('sm5-s6-p4', 'Credit: Kent Longridge, Principal Engineer, InterMoor, an Acteon company'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s6-design-img',
          image: localImage('Images/design considerations.webp', 'Mooring design considerations for floating offshore wind'),
          caption: 'Mooring design considerations — a complex, multifactorial process drawing on extensive offshore industry expertise.',
        },
      ],
    },

    // ── SECTION 7: Cable Types (PDF p. 20) ────────────────────────────────────
    {
      _id: 'sm5-sec-7-cables',
      title: 'Cable Types',
      slug: { _type: 'slug', current: 'flow-cable-types' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s7-text',
          content: [
            h2('sm5-s7-h1', 'Cable Types'),
            p('sm5-s7-p1', 'Floating offshore wind requires two distinct types of subsea cable, each serving a different purpose in the electrical transmission chain:'),
            h3('sm5-s7-h2', '1. Array Cables'),
            p('sm5-s7-p2', 'Array cables link individual turbines to other turbines and then to the substation(s). These cables operate at lower voltages and are designed to be dynamic — flexing with the movement of the floating platforms. Dynamic cable design is one of the key engineering challenges in FLOW, as the repeated motion can lead to fatigue and failure if not properly engineered.'),
            h3('sm5-s7-h3', '2. Export Cables'),
            p('sm5-s7-p3', 'Export cables link the substation(s) to shore at higher voltages for long-distance transmission — typically spanning 20 to 200 km to shore. These cables must handle the output of the entire wind farm and are laid on or buried in the seabed.'),
          ],
        },
        {
          _type: 'subseaCableTypesDiagram' as const,
          _key: 'sm5-s7-cable-diagram',
        },
      ],
    },

    // ── SECTION 8: Floating vs Fixed (PDF pp. 21–22) ──────────────────────────
    {
      _id: 'sm5-sec-8-comparison',
      title: 'Floating vs Fixed Offshore Wind',
      slug: { _type: 'slug', current: 'floating-vs-fixed' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'imageBlock',
          _key: 'sm5-s8-hero',
          image: localImage('Images/floating fixed 1.webp', 'Floating vs fixed offshore wind comparison'),
          fullWidth: true,
          caption: 'Floating vs Fixed offshore wind — comparison of site suitability, cost, operational challenges, and energy potential.',
        },
        {
          _type: 'richText',
          _key: 'sm5-s8-text',
          content: [
            h2('sm5-s8-h1', 'Floating vs Fixed Offshore Wind'),
            h3('sm5-s8-h2', 'Site Suitability (Depth and Location)'),
            p('sm5-s8-p1', 'Floating Offshore Wind: Suitable for deep-water locations (>60 metres), where fixed-bottom structures are not feasible. These systems are anchored to the seabed with mooring lines, making them viable in regions with steep continental shelves or deep oceans.'),
            p('sm5-s8-p2', 'Fixed-Bottom Offshore Wind: Limited to shallow waters (typically up to 50–60 metres deep), where turbines can be supported by monopiles, jackets, or gravity-based foundations. Suitable for areas with flat seabeds.'),
            h3('sm5-s8-h3', 'Operational Challenges'),
            p('sm5-s8-p3', 'Floating: Requires advanced dynamic positioning systems and more sophisticated maintenance operations due to movement with waves and wind. Challenges include mooring line integrity and dynamic cable management.'),
            p('sm5-s8-p4', 'Fixed-Bottom: Easier maintenance access due to fixed positions. Stable platforms simplify turbine operation but may face challenges in extreme weather conditions.'),
            h3('sm5-s8-h4', 'Cost of Installation'),
            p('sm5-s8-p5', 'Floating: Generally more expensive due to the complexity of floating platforms, mooring systems, and dynamic cabling. However, advancements in technology are gradually driving costs down.'),
            p('sm5-s8-p6', 'Fixed-Bottom: Lower upfront costs in shallow waters, as foundations and installation methods are well established. Installation costs rise significantly in deeper waters.'),
            h3('sm5-s8-h5', 'Energy Potential and Scalability'),
            p('sm5-s8-p7', 'Floating: Unlocks high wind energy potential in deep offshore areas, which often have stronger and more consistent winds. Offers significant scalability for countries with deep coastal waters.'),
            p('sm5-s8-p8', 'Fixed-Bottom: Restricted to shallow waters, which may limit capacity in regions with narrow continental shelves or limited shallow areas.'),
          ],
        },
      ],
    },

    // ── SECTION 9: Geographic Breakdown (PDF pp. 23–26) ──────────────────────
    {
      _id: 'sm5-sec-9-geography',
      title: 'Geographic Breakdown',
      slug: { _type: 'slug', current: 'flow-geographic-breakdown' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s9-text',
          content: [
            h2('sm5-s9-h1', 'Geographic Breakdown'),
            p('sm5-s9-p1', 'Floating offshore wind is a truly global technology, with pioneering projects across Europe, Asia, and North America demonstrating its viability at different scales and in different marine environments.'),
            h3('sm5-s9-h2', 'Norway — 94 MW'),
            p('sm5-s9-p2', 'Norway has 94 MW of floating wind capacity (2023), making it the world leader by installed floating wind capacity. The Hywind Tampen project represents the world\'s largest floating offshore wind farm, powering oil and gas platforms in the North Sea.'),
            h3('sm5-s9-h3', 'United Kingdom — Hywind Pilot Park (30 MW)'),
            p('sm5-s9-p3', 'One of the very first floating offshore wind farms, which became operational in 2017, was the Hywind Pilot Park, off the coast of Aberdeenshire in Scotland. The farm is located 29 kilometres offshore and sited in waters ranging from 95 to 120 metres deep. The farm has five spar-type platforms that each host a 6 MW Siemens turbine, with a total capacity of 30 MW.'),
            h3('sm5-s9-h4', 'United States — Redwood Coast (100–150 MW, 2026)'),
            p('sm5-s9-p4', 'The United States has the Redwood Coast Offshore Wind Project, located in an area of Humboldt County (California). It is a pilot floating offshore farm that is expected to be operational in 2026, with a capacity of 100–150 MW.'),
            h3('sm5-s9-h5', 'Spain — DemoSATH (2 MW)'),
            p('sm5-s9-p5', 'In September 2023, Spain\'s DemoSATH Floating Wind Project became operational. The project uses a concrete twin-hull barge structure. The turbine capacity is 2 MW and the project is located 3.2 km off the coast of Bilbao at water depths of 85 m.'),
            h3('sm5-s9-h6', 'France — Provence Grand Large (25 MW)'),
            p('sm5-s9-p6', 'In 2023, EDF successfully installed three floaters of the Provence Grand Large project, which have a combined capacity of 25 MW (8.4 MW per turbine) and are located 40 kilometres west of Marseille in water depths of around 100 m.'),
            h3('sm5-s9-h7', 'China — CNOOC Guanlan (7.25 MW)'),
            p('sm5-s9-p7', 'China\'s first floating wind platform, CNOOC Guanlan, became operational in 2023 and is positioned 136 km offshore of Wenchang (Hainan Province) in waters deeper than 120 m. It has an installed capacity of 7.25 MW and can produce up to 22 GWh of electricity.'),
            h3('sm5-s9-h8', 'Japan — Goto Project (8 × 2.1 MW Hitachi)'),
            p('sm5-s9-p8', 'Japan\'s first major floating wind farm, the Goto project, was commissioned in 2018 with construction ongoing and completion delayed to January 2026. The wind farm will feature eight 2.1 MW Hitachi turbines installed on hybrid spar-type, three-point mooring floating foundations.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s9-img',
          image: localImage('Images/image 5.webp', 'Global floating offshore wind projects and locations'),
          caption: 'Global floating offshore wind projects — from Norway and the UK through to Japan, China, Spain, France, and the USA.',
        },
        flowCapacityForecastChart,
      ],
    },

    // ── SECTION 10: Financial Aspects (PDF pp. 27–29) ─────────────────────────
    {
      _id: 'sm5-sec-10-financial',
      title: 'Financial Aspects',
      slug: { _type: 'slug', current: 'flow-financial-aspects' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s10-text',
          content: [
            h2('sm5-s10-h1', 'Financial Aspects of FLOW'),
            p('sm5-s10-p1', 'The capital cost structure for a floating offshore wind project is approximately £4 billion per GW of installed capacity. The table below shows the typical cost breakdown:'),
          ],
        },
        {
          _type: 'calloutBlock' as const,
          _key: 'sm5-s10-cost-table',
          variant: 'info' as const,
          title: 'FLOW Capital Cost Breakdown (per MW)',
          body: 'Development & Project Management: £150,000/MW | Wind Turbine: £1,300,000/MW | Balance of Plant: £1,700,000/MW | Installation & Commissioning: £370,000/MW | Operations & Maintenance: £71,000/MW/year | Decommissioning: £150,000/MW | Contingency & Insurance: £270,000/MW | Total Construction: ~£4.011 billion per GW',
        },
        flowCapexChart,
        {
          _type: 'richText',
          _key: 'sm5-s10-lcoe-text',
          content: [
            h3('sm5-s10-h2', 'LCOE Outlook'),
            p('sm5-s10-p2', 'The cost of energy from FLOW is forecast to move downwards and make it competitive, according to DNV Energy Transition Report published in 2023:'),
            bullet('sm5-s10-b1', 'Currently FLOW sits at about $180 USD/MWh, with Fixed at around $77 USD/MWh and Onshore at around $46 USD/MWh.'),
            bullet('sm5-s10-b2', 'The world is expected to reach a cumulative capacity of floating offshore wind energy of almost 260 gigawatts by 2050.'),
            bullet('sm5-s10-b3', 'By this time the Levelised Cost of Energy (LCOE) is forecast to have come down to around $74 USD/MWh — approaching parity with fixed offshore wind.'),
            p('sm5-s10-p3', 'LCOE is defined as the revenue required (from whatever source) to earn a rate of return on investment equal to the discount rate (also referred to as the Weighted Average Cost of Capital, WACC) over the life of the wind farm. Tax and inflation are not modelled. In other words, it is the lifetime average cost for the energy produced, quoted in today\'s prices. LCOE is used to evaluate and compare the cost of electricity production from different technologies and at different locations.'),
          ],
        },
        windLcoeProjectionChart,
        flowLcoeComparisonChart,
        flowLcoeRangeChart,
      ],
    },

    // ── SECTION 11: Policy & Frameworks (PDF pp. 30–32) ──────────────────────
    {
      _id: 'sm5-sec-11-policy',
      title: 'Policy & Regulatory Frameworks',
      slug: { _type: 'slug', current: 'flow-policy-frameworks' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s11-text',
          content: [
            h2('sm5-s11-h1', 'Regulatory Framework & Policy Implications'),
            p('sm5-s11-p1', 'Key areas of policy and regulation that have been identified to support the growth of the FLOW industry include:'),
            bullet('sm5-s11-b1', 'Licensing & Consenting'),
            bullet('sm5-s11-b2', 'Subsidy & Grant Support (for example Ports)'),
            bullet('sm5-s11-b3', 'Supply Chain Development'),
            bullet('sm5-s11-b4', 'Grid Connection'),
            p('sm5-s11-p2', 'These areas are critical for sector growth and attracting inward investment to the sector.'),
            h3('sm5-s11-h2', 'Licensing & Consenting'),
            bullet('sm5-s11-b5', 'Efficiency: Clear and streamlined processes reduce delays, enabling projects to move forward faster.'),
            bullet('sm5-s11-b6', 'Predictability: Developers gain confidence with consistent regulations, encouraging investment.'),
            bullet('sm5-s11-b7', 'Environmental Safeguards: Policies ensure balanced development that respects marine ecosystems.'),
            h3('sm5-s11-h3', 'Subsidy & Grant Support'),
            bullet('sm5-s11-b8', 'Early Market Growth: Financial incentives help floating wind projects compete during the early stages.'),
            bullet('sm5-s11-b9', 'Infrastructure Readiness: Support for ports and related infrastructure ensures the industry can scale efficiently.'),
            bullet('sm5-s11-b10', 'Risk Mitigation: Grants lower the financial risks for developers and investors.'),
            h3('sm5-s11-h4', 'Supply Chain Development'),
            bullet('sm5-s11-b11', 'Economic Growth: Local manufacturing and services create jobs and boost regional economies.'),
            bullet('sm5-s11-b12', 'Innovation: Policies encourage technological advancements in components and processes.'),
            bullet('sm5-s11-b13', 'Global Collaboration: Coordinated frameworks optimise supply chains and reduce costs globally.'),
            h3('sm5-s11-h5', 'Grid Connection'),
            bullet('sm5-s11-b14', 'Energy Integration: Policies ensure that floating wind can connect to grids seamlessly, maximising output.'),
            bullet('sm5-s11-b15', 'Cost Reduction: Subsidised grid upgrades lower connection costs, making projects more viable.'),
            bullet('sm5-s11-b16', 'Reliability: Modernised grids ensure stable energy transmission, even with variable offshore wind output.'),
            p('sm5-s11-p3', 'In summary, the global policy and regulatory landscape for FLOW is still evolving, with a clear direction towards supporting environmental sustainability, sector growth, and the transition to renewable energy sources in alignment with Net Zero objectives.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s11-img',
          image: localImage('Images/image 7.webp', 'FLOW policy and regulatory frameworks'),
          caption: 'Policy frameworks for floating offshore wind — from licensing and consenting through to grid connection and supply chain development.',
        },
      ],
    },

    // ── SECTION 12: Challenges (PDF pp. 33–36) ────────────────────────────────
    {
      _id: 'sm5-sec-12-challenges',
      title: 'Challenges',
      slug: { _type: 'slug', current: 'flow-challenges' },
      estimatedMinutes: 10,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s12-text',
          content: [
            h2('sm5-s12-h1', 'Challenges'),
            p('sm5-s12-p1', 'The Floating Offshore Wind sector offers up many technical and commercial challenges that the industry needs to overcome if it is to achieve the undoubted potential for the future.'),
            h3('sm5-s12-h2', 'Driving Down the LCOE'),
            p('sm5-s12-p2', 'The sector needs to continue to drive down the Levelised Cost of Energy (LCOE) if it is to achieve the potential growth. At ~$180/MWh, FLOW is currently more than double the cost of fixed offshore wind and nearly four times the cost of onshore wind.'),
            h3('sm5-s12-h3', 'Construction & Installation at Scale'),
            p('sm5-s12-p3', 'The sector needs to overcome the challenge of construction, assembly and installation of FLOW at scale in the UK. Deep water port infrastructure, heavy lift vessels, and assembly facilities capable of handling the scale of commercial projects do not yet exist in sufficient numbers.'),
            h3('sm5-s12-h4', 'Dynamic Cable Solutions'),
            p('sm5-s12-p4', 'The sector needs to develop highly robust and dynamic cable solutions if it is to reduce the level of cable failure. Dynamic cabling — which must flex with the movement of floating platforms — is an area of significant ongoing R&D.'),
            h3('sm5-s12-h5', 'Skills & Workforce'),
            p('sm5-s12-p5', 'The sector needs to develop the entry routes for the required skills to enter the sector if it is to keep pace with the forecast requirements. Up to 32,000 active jobs are forecast by 2040 — attracting and training that workforce requires proactive planning now.'),
            h3('sm5-s12-h6', 'Standardisation'),
            p('sm5-s12-p6', 'The sector needs to consider the standardisation of components where this is possible — for example mooring chain size. The sector will also need to land on a few standard floating foundation designs. Currently it is estimated there are over 200 designs in one form or another "floating around" — this diversity prevents the economies of scale needed to drive down costs.'),
            h3('sm5-s12-h7', 'Supply Chain'),
            p('sm5-s12-p7', 'The UK\'s supply chain is simply not geared up to supply to the scale of the demand that is in the pipeline. Solving logistical and installation challenges that range from towing components to ensuring adequate port facilities will require significant investment and coordination across industry and government.'),
            h3('sm5-s12-h8', 'Maintenance & Accessibility'),
            p('sm5-s12-p8', 'Maintenance and accessibility becomes more challenging on floating turbines due to their remote locations and the effects of sea conditions. Unlike fixed-bottom turbines, some floating platforms can be towed to port for major maintenance, but this creates its own logistical and economic challenges.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s12-img',
          image: localImage('Images/image 12.webp', 'Floating offshore wind industry challenges'),
          caption: 'Key challenges facing the FLOW sector — from LCOE reduction and cable design to supply chain development and standardisation.',
        },
      ],
    },

    // ── SECTION 13: Opportunities (PDF pp. 37–38) ─────────────────────────────
    {
      _id: 'sm5-sec-13-opportunities',
      title: 'Opportunities & Conclusion',
      slug: { _type: 'slug', current: 'flow-opportunities' },
      estimatedMinutes: 5,
      content: [
        {
          _type: 'richText',
          _key: 'sm5-s13-text',
          content: [
            h2('sm5-s13-h1', 'Opportunities for Floating Technology'),
            bullet('sm5-s13-b1', 'The UK has a world-leading ambition to deploy up to 50 GW of offshore wind by 2030, with up to 5 GW coming from FLOW — a tough but significant target. Source: UK Government.'),
            bullet('sm5-s13-b2', 'The world has a rough cumulative capacity of floating offshore wind energy of almost 40 gigawatts by 2030. With current build-out rates this is highly unlikely from multiple perspectives.'),
            bullet('sm5-s13-b3', 'The renewable technology is forecast to grow rapidly in the next years, with the United Kingdom potentially leading the market.'),
            bullet('sm5-s13-b4', 'The global floating wind power market size was estimated at USD 1.9 billion in 2022 and is expected to hit around USD 65.37 billion by 2032, poised to grow at an impressive CAGR of 42.5% from 2023 to 2032. Source: Precedence Research.'),
          ],
        },
        flowMarketChart,
        dnvOffshoreGrowthChart,
        flowRegionalForecast2050Chart,
        {
          _type: 'richText',
          _key: 'sm5-s13-conclusion',
          content: [
            h2('sm5-s13-h2', 'Conclusion'),
            p('sm5-s13-p1', 'Floating Offshore Wind offers the world huge economic opportunities at a Government, Developer, Supply Chain, and Individual level.'),
            bullet('sm5-s13-b5', 'FLOW has the potential to stimulate growth in currently under-developed coastal regions all around the world where water depths are appropriate.'),
            bullet('sm5-s13-b6', 'The UK arguably leads the world in offshore wind. FLOW has the potential to reinforce and build on this position.'),
            bullet('sm5-s13-b7', 'FLOW has the potential to become a cornerstone in the efforts to achieve Net Zero targets and fuel the transition away from fossil fuels to renewable energy.'),
            p('sm5-s13-p2', 'But to achieve these outcomes, the sector needs to overcome the technical and commercial challenges outlined, and it needs a stable policy environment that will attract investment and stimulate growth.'),
          ],
        },
        {
          _type: 'imageBlock',
          _key: 'sm5-s13-final-img',
          image: localImage('Images/image 22.webp', 'Floating offshore wind — the future of renewable energy at scale'),
          caption: 'Floating offshore wind — unlocking deeper waters, stronger winds, and a cleaner energy future for the world.',
        },
      ],
    },
    {
      _id: 'sm5-sec-col',
      title: 'Confirmation of Learning',
      slug: { _type: 'slug', current: 'floating-offshore-wind-confirmation' },
      estimatedMinutes: 15,
      content: [
        {
          _type: 'confirmationQuizBlock' as const,
          _key: 'sm5-col-quiz',
          subModuleSlug: 'floating-offshore-wind',
          moduleId: 'module-1',
        },
      ],
    },

  ],
}
