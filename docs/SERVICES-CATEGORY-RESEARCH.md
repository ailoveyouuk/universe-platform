# Services as a category: research and design (2026-10-25)

Lewis asked for services to be a category of their own, distinct from freight, including consultancy and technical assistance and advisory services, with sub-categories researched and the category enhanced.

## What the evidence says

| Source | What it shows about services |
|---|---|
| World Bank Procurement Regulations, 7th edition (Sept 2025) | Services are split into **consulting** (advisory or professional work: management, policy and communications consulting, feasibility studies, project management, engineering, finance and accounting, training and development) and **non-consulting** (output-based work with measurable standards, such as drilling or mapping). Goods and works include related services: transport, insurance, installation, commissioning, training and initial maintenance. "Technical assistance" is not a defined term; in practice it is consulting work. |
| UNSPSC (service segments) | Management and business professional and administrative services; engineering, research and technology based services; education and training; healthcare; transportation, storage and mail; environmental; financial and insurance; building and facility services; editorial, design and graphic; and others. Used here as a completeness check only; codes are not mapped (use needs a licence check). |
| UNICEF (country office page) | Procures: transport and logistics, construction works, consultancy including programme-related, borehole drilling, financial audit and assessment, editorial and printing, administrative support (cleaning, catering, car rental), courier, hardware and equipment maintenance, internet and IT support. |
| Global Fund | Procurement is delivered through **procurement service agents** (upstream supply chain management, sourcing and delivery, with published fees), alongside **quality assurance** reviews of medicines, devices, diagnostics and vector control products. |
| WHO, medical equipment maintenance programme overview | Maintenance strategy: performance and safety **inspections**, **preventive maintenance**, **corrective maintenance** (calibration is part of the routine). |
| UNFPA 2023 procurement statistics (from the catalogue analysis) | Freight, storage and customs about 6% of spend; management and evaluation services about 6%. |
| Existing catalogue analysis | CRS lists logistics and warehousing; NSPA lists biomedical servicing, diagnostic testing laboratories and medical services including evacuation; FHI 360 lists quality control. |

Limits: the USAID GHSC-PSM and Chemonics pages could not be fetched, so supply chain technical assistance (forecasting, quantification, LMIS support) rests on general practice and the World Bank's definition of consulting rather than a published category list. UNICEF's list is from one country office. Treat the sub-categories as a sound first cut to refine with real project lines.

## The design

**Services is a commodity group of its own (`SERVICES`)**, separate from goods and from freight. A service is bought by time, output or fee, so each service line carries:
- a **type of service** (`serviceCategory`, one of 22 sub-categories in 9 groups), and
- a **pricing basis** (`servicePricingBasis`): per person-day, per hour, per month, per unit of output, fixed fee, or percentage of the value of goods handled. The line's quantity then counts that basis (days, months, units) and the unit price is the cost per basis unit, before margin.

### Sub-categories
1. **Consultancy and advisory** (consulting): technical assistance and capacity building; policy, regulatory and management advisory; supply chain and procurement advisory; studies, evaluation and research; programme and project management; training and education.
2. **Quality, testing and assurance**: sampling, inspection and laboratory testing; quality and compliance audits.
3. **Equipment services**: installation, commissioning and user training; maintenance, calibration and repair.
4. **Supply chain operations (not freight)**: procurement and agent services; warehousing, storage and distribution management; customs clearance and import support; packing, labelling and kitting; cold chain monitoring and validation.
5. **Digital and data**: software, IT support and data systems.
6. **Financial and professional**: audit, financial assessment, insurance and legal.
7. **Health and field services**: field delivery and community health services.
8. **Environment and facilities**: healthcare waste management and destruction; facilities maintenance, cleaning and security.
9. **Communications and support**: communications, design and printing; translation, events, travel and administrative support.

Each sub-category records its World Bank procurement type (consulting, non-consulting, or related to goods), its usual pricing bases, a description and examples (`packages/types/src/service-categories.ts`, tested in `apps/api/test/service-categories.test.ts`).

### Boundaries
- **Freight is not a service here.** Moving goods between places is priced as the project's freight cost (per tonne and per tonne-kilometre) and appears in Distances. Customs, storage and handling around the goods are services (group 4).
- **Works** (construction) are a separate procurement type in funders' rules and are not part of this category.
- **The packaging goods group "Logistics and Services"** stays a goods group in the catalogue (pallets, cartons); it is not this category.

### In the platform
- Project Management line form: choosing the Services product category shows the type of service and the pricing basis, relabels the quantity, and hides the cargo weight. A services line gets no route, weight or CO2 figure.
- Insights: new **Services** screen (cost by type, region of delivery and movement, each in its own unit) and anonymised service cost pool (`aggregated_service_prices`), cost before margin only.

### Not done yet (needs your decision)
- **Supplier scope of supply and tender matching:** suppliers declare scope under ten product groups. Services would need their own scope group (and a line type on tenders) so a consultancy can declare "technical assistance" and tenders can match it. Today two sub-categories ("Biomedical servicing and maintenance", "Sampling, inspection and testing") sit under the Logistics and Services scope group. Adding a Services scope group touches the supplier directory, tender discovery and the catalogue filters; proposed as the next step.
- **Service catalogue or rate card:** a reference list of standard services (like the product catalogue) is not built; lines use the type and basis for now.

## Sources
- World Bank Procurement Regulations for IPF Borrowers, 7th edition: https://thedocs.worldbank.org/en/doc/c84273d1b230aeb2b0b8134de5dc8cd7-0290012025/original/Procurement-Regulations-7th-Edition-Sep-2025.pdf
- UNSPSC: https://en.wikipedia.org/wiki/UNSPSC
- UNICEF Malawi, supplies and services: https://www.unicef.org/malawi/supplies-and-services
- Global Fund, procurement services: https://www.theglobalfund.org/en/sourcing-management/health-products/procurement-services/
- WHO, Medical equipment maintenance programme overview: https://www.who.int/publications/i/item/9789241501538
- Project doc: catalogue category analysis (UNFPA 2023, CRS, NSPA, FHI 360 evidence)
