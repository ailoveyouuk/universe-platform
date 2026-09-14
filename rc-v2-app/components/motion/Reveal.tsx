'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Reveal — the shared, lightweight scroll-reveal wrapper for module content.
//
// Wraps a single content block so it fades/slides gently into view the first
// time it scrolls into the viewport. Built on Framer Motion (tree-shakeable,
// GPU-accelerated transforms/opacity only — no layout-triggering properties)
// and driven entirely by the shared timing/easing tokens in @rc/theme, so
// every animated element on a module page moves at the same tempo and any
// future tweak to "how RC content should feel" happens in one file.
//
// Used from ContentRenderer to wrap every rendered content block in one
// place, rather than each of the 50+ block components implementing (or,
// worse, not implementing) its own entrance animation.
// ─────────────────────────────────────────────────────────────────────────────

import { motion as fm } from 'framer-motion'
import { motion as rcMotion } from '@rc/theme'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Small stagger for sequential blocks — defaults to no delay. */
  delay?: number
  /** Use the more subtle fade (no vertical movement) for dense/table content. */
  variant?: 'fadeUp' | 'fadeIn'
}

export function Reveal({ children, delay = 0, variant = 'fadeUp' }: RevealProps) {
  const variants = rcMotion[variant]

  return (
    <fm.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={variants}
      transition={{
        duration: rcMotion.duration.base,
        ease: rcMotion.ease.out,
        delay,
      }}
    >
      {children}
    </fm.div>
  )
}
