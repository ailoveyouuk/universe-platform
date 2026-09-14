import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const myenergi = await prisma.organisation.upsert({
    where: { slug: 'myenergi' },
    update: {},
    create: {
      slug:           'myenergi',
      type:           'EMPLOYER',
      name:           'myenergi',
      brandColour:    '#76BC21',
      country:        'United Kingdom',
      city:           'Grimsby',
      website:        'https://www.myenergi.com',
      tagline:        'Renewable energy products making eco energy easy',
      overview:       `myenergi is an award-winning British designer and manufacturer of renewable energy products and EV chargers, founded in Grimsby in 2016. Starting with two co-founders, myenergi has grown to 400+ employees and shipped over 500,000 products worldwide.\n\nTheir connected ecosystem — the zappi EV charger, eddi solar diverter, libbi home battery storage, and harvi wireless energy sensor — is managed through the myenergi app, with a core mission to maximise self-consumption of self-generated green energy in the home.\n\nHeadquartered in Grimsby's Pioneer Business Park — the epicentre of green technology in the UK — myenergi operates across the UK, Ireland, Australia, Germany, the Netherlands, New Zealand, Poland, and France.`,
      heroImageUrl:   'https://www.myenergi.com/wp-content/uploads/2026/02/EV-Charger-products-zappi-glo.webp',
      galleryImages:  [
        'https://www.myenergi.com/wp-content/uploads/2026/02/Solar-energy-myenergi.webp',
        'https://www.myenergi.com/wp-content/uploads/2025/04/manage-power-app-myenergi-759x1024.png',
        'https://www.myenergi.com/wp-content/uploads/2025/04/home-install-ev-charger-zappi-myenergi--759x1024.png',
        'https://www.myenergi.com/wp-content/uploads/2025/05/HomeBatteryStorage.png',
        'https://www.myenergi.com/wp-content/uploads/2025/05/SolarHeatingPower.png',
      ],
      socialLinks: {
        twitter:   'https://twitter.com/myenergiuk',
        linkedin:  'https://www.linkedin.com/company/myenergi-ltd/',
        instagram: 'https://www.instagram.com/myenergi/',
        facebook:  'https://www.facebook.com/myenergi/',
        youtube:   'https://www.youtube.com/channel/UCAIZwAsCi2zMfrb9DekkWXQ',
      },
      sectors: [
        'EV Charging',
        'Solar Power',
        'Home Battery Storage',
        'Home Energy Management',
        'Smart Home Technology',
        'Renewable Energy Products',
      ],
      yearFounded:     2016,
      employeeCount:   '400+',
      partnershipTier: 'PARTNER',
      testimonial: {
        quote:      'We commit to pioneering a simple transition to renewable energy — creating an eco-smart home that is simple, accessible, and convenient, saving customers money and increasing their energy independence.',
        authorName: 'Lee Sutton & Jordan Brompton',
        authorRole: 'Co-Founders, myenergi',
      },
      isPublished: true,
    },
  })

  console.log(`✓ Organisation seeded: ${myenergi.name} (${myenergi.slug})`)

  await prisma.opportunity.upsert({
    where: { id: 'opp-myenergi-graduate' },
    update: {},
    create: {
      id:             'opp-myenergi-graduate',
      organisationId: myenergi.id,
      title:          'Graduate Engineering Programme',
      type:           'Graduate Programme',
      description:    'Join myenergi as a graduate engineer and help design the next generation of renewable energy products. Work across hardware, firmware, and systems engineering in our Grimsby HQ.',
      url:            'https://www.myenergi.com/careers/',
      isActive:       true,
    },
  })

  await prisma.opportunity.upsert({
    where: { id: 'opp-myenergi-apprentice' },
    update: {},
    create: {
      id:             'opp-myenergi-apprentice',
      organisationId: myenergi.id,
      title:          'Engineering Apprenticeship',
      type:           'Apprenticeship',
      description:    'Earn while you learn with a hands-on apprenticeship at one of the UK\'s fastest-growing clean energy companies.',
      url:            'https://www.myenergi.com/careers/',
      isActive:       true,
    },
  })

  console.log('✓ Opportunities seeded for myenergi')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
