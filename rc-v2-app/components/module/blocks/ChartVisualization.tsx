// ─────────────────────────────────────────────────────────────────────────────
// Chart Visualization Component — Mauna Loa Design Language
// Dark card aesthetic, RC green palette, inline data labels, axis titles
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { RC } from '@rc/theme'

// RC design tokens now come from @rc/theme — the single source of truth
// shared across all four apps and rc-v2-app's diagram components, so a
// future re-brand only needs to change packages/theme/src/index.ts.

// Earth-tone palette used for multi-segment doughnut / multi-dataset charts
const PALETTE = [
  RC.green,
  '#E8823A',  // terracotta
  '#DAA520',  // goldenrod
  '#4682B4',  // steel blue
  '#556B2F',  // dark olive
  '#CD853F',  // peru
  '#8B4513',  // saddle brown
  '#2F4F4F',  // dark slate
]

// ── Inline Data-Labels Plugin ─────────────────────────────────────────────────
// Implements data value labels without the external chartjs-plugin-datalabels.
// Draws labels above vertical bars, to the right of horizontal bars, and
// above data points on line charts.

const rcDataLabels = {
  id: 'rcDataLabels',
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart
    const isHBar = (chart.options as any).indexAxis === 'y'
    const isLine = (chart.config as any).type === 'line'

    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return

      meta.data.forEach((el, idx) => {
        const raw = dataset.data[idx]
        if (raw === null || raw === undefined) return

        const value = String(raw)
        const pos   = (el as any).tooltipPosition() as { x: number; y: number }

        ctx.save()
        ctx.font      = `600 11px ${RC.fontBody}`
        ctx.fillStyle = RC.white90

        if (isHBar) {
          ctx.textAlign    = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(value, pos.x + 6, pos.y)
        } else if (isLine) {
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(value, pos.x, pos.y - 10)
        } else {
          // Vertical bar
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(value, pos.x, pos.y - 6)
        }

        ctx.restore()
      })
    })
  },
}

// ── Component Props ───────────────────────────────────────────────────────────

interface ChartVisualizationProps {
  title: string
  description?: string
  type: 'doughnut' | 'bar' | 'horizontalBar' | 'line'
  stacked?: boolean
  labels: string[]
  datasets: {
    label: string
    data: (number | null)[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    /** Dashed line pattern for Chart.js line series — e.g. [6, 3]. */
    borderDash?: number[]
    /**
     * Fill target for line series:
     *   false = no fill | true = fill to x-axis (default for single series)
     *   0, 1… = fill to that dataset index (for range/band charts)
     */
    fill?: boolean | number | string
  }[]
  source?: string
  sourceUrl?: string
  xAxisLabel?: string
  yAxisLabel?: string
  /**
   * Show inline data-value labels via rcDataLabels plugin (default: true).
   * Set false for multi-series line charts or dense band charts.
   */
  showDataLabels?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChartVisualization({
  title,
  description,
  type,
  stacked = false,
  labels,
  datasets,
  source,
  sourceUrl,
  xAxisLabel,
  yAxisLabel,
  showDataLabels = true,
}: ChartVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const isDoughnut   = type === 'doughnut'
    const isHBar       = type === 'horizontalBar'
    const isLine       = type === 'line'
    const isStacked    = stacked && !isDoughnut
    const isMultiLine  = isLine && datasets.length > 1
    const chartType    = isHBar ? 'bar' : type
    const showLegend   = isDoughnut || isStacked || isMultiLine

    // ── Prepare datasets ────────────────────────────────────────────────────
    // For multi-series line charts, each dataset can supply its own
    // borderColor. For single-series (or bar/doughnut), fall back to RC green.
    const preparedDatasets = datasets.map((ds, idx) => {
      const base = ds.backgroundColor ?? PALETTE[idx % PALETTE.length]

      // Resolve line colour: respect per-dataset borderColor when provided
      const lineColor = (isLine && ds.borderColor)
        ? (ds.borderColor as string)
        : RC.green

      const bgColor = isDoughnut
        ? (Array.isArray(base) ? base : labels.map((_, i) => PALETTE[i % PALETTE.length]))
        : isLine
          ? (ds.backgroundColor !== undefined ? ds.backgroundColor : RC.greenAlpha)
          : base

      // Resolve fill: dataset-level override takes precedence.
      // Default: fill to x-axis for line charts, no fill otherwise.
      const fillValue = isLine
        ? (ds.fill !== undefined ? ds.fill : true)
        : false

      return {
        ...ds,
        backgroundColor:      bgColor,
        borderColor:          isLine ? lineColor : 'transparent',
        borderWidth:          isLine ? 2.5 : 0,
        borderDash:           isLine ? (ds.borderDash ?? []) : [],
        fill:                 fillValue,
        tension:              isLine ? 0.4 : 0,
        pointRadius:          isLine ? 4 : 0,
        pointBackgroundColor: isLine ? lineColor : undefined,
        pointBorderColor:     isLine ? '#fff' : undefined,
        pointBorderWidth:     isLine ? 2 : 0,
        hoverBorderWidth:     isLine ? 0 : 1,
        hoverBorderColor:     isLine ? undefined : 'rgba(255,255,255,0.3)',
      }
    })

    // ── Axis configuration ──────────────────────────────────────────────────
    const axisConfig = isDoughnut
      ? {}
      : {
          x: {
            stacked: isStacked,
            grid: {
              color:       RC.grid,
              borderColor: 'transparent',
              tickColor:   'transparent',
            },
            ticks: {
              font:        { family: RC.fontBody, size: 11 },
              color:       RC.white55,
              maxRotation: isHBar ? 0 : 40,
              padding:     4,
            },
            title: {
              display: !!xAxisLabel,
              text:    xAxisLabel ?? '',
              color:   RC.white28,
              font:    { family: RC.fontBody, size: 10 },
              padding: { top: 6 },
            },
            border: { color: 'rgba(255,255,255,0.10)' },
          },
          y: {
            stacked: isStacked,
            grid: {
              color:       RC.grid,
              borderColor: 'transparent',
              tickColor:   'transparent',
            },
            ticks: {
              font:    { family: RC.fontBody, size: 11 },
              color:   RC.white55,
              padding: 6,
            },
            title: {
              display: !isHBar && !!yAxisLabel,
              text:    yAxisLabel ?? '',
              color:   RC.white28,
              font:    { family: RC.fontBody, size: 10 },
              padding: { bottom: 6 },
            },
            border: { color: 'rgba(255,255,255,0.10)' },
          },
        }

    // ── Build Chart ─────────────────────────────────────────────────────────
    // rcDataLabels is suppressed for doughnut, stacked, multi-line, or when
    // showDataLabels is explicitly false (e.g. dense band/range charts).
    const useDataLabels = showDataLabels && !isDoughnut && !isStacked && !isMultiLine

    chartRef.current = new Chart(ctx, {
      type: chartType as any,
      data: { labels, datasets: preparedDatasets },
      plugins: useDataLabels ? [rcDataLabels as any] : [],
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: isHBar ? 'y' : 'x',
        layout: {
          padding: {
            top:   isDoughnut ? 0 : (isHBar ? 8 : (isMultiLine ? 16 : 28)),
            right: isDoughnut ? 0 : (isHBar ? 52 : 20),
          },
        },
        plugins: {
          legend: {
            display:  showLegend,
            position: 'bottom' as const,
            labels: {
              font:          { family: RC.fontBody, size: 11, weight: '500' },
              color:         RC.white55,
              padding:       14,
              usePointStyle: true,
              boxWidth:      8,
              generateLabels(chart: Chart) {
                if (!isDoughnut) {
                  return Chart.defaults.plugins.legend.labels.generateLabels(chart)
                }
                return (chart.data.labels ?? []).map((label: unknown, i: number) => ({
                  text:      String(label).replace(/\n/g, ' '),
                  fillStyle: (chart.data.datasets[0].backgroundColor as string[])?.[i] ?? '#999',
                  // Chart.js's legend renderer reads fontColor straight off
                  // each returned item (ctx.fillStyle = legendItem.fontColor)
                  // rather than falling back to options.plugins.legend.labels.color
                  // for a custom generateLabels — without this the canvas
                  // context's fillStyle is left at whatever it was last set to
                  // (often black), so doughnut legend text was rendering
                  // near-invisibly dark against the dark card background.
                  fontColor: RC.white55,
                  hidden:    false,
                  index:     i,
                  lineWidth: 0,
                }))
              },
            },
          },
          tooltip: {
            backgroundColor: RC.tooltipBg,
            titleColor:      RC.tooltipText,
            bodyColor:       '#444444',
            borderColor:     RC.green,
            borderWidth:     1,
            padding:         12,
            titleFont:       { family: RC.fontHeading, size: 13, weight: 'bold' },
            bodyFont:        { family: RC.fontBody,    size: 12 },
            displayColors:   true,
            boxPadding:      6,
            cornerRadius:    8,
          },
        },
        scales: axisConfig,
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [labels, datasets, type, stacked, xAxisLabel, yAxisLabel, showDataLabels])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden"
      style={{
        background:     RC.cardBg,
        border:         `1px solid ${RC.cardBorder}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Card header */}
      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${RC.cardBorder}` }}
      >
        <div className="flex-1 min-w-0">
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90 }}
          >
            {title}
          </h3>
          {description && (
            <p
              className="text-xs mt-1.5 leading-relaxed max-w-prose"
              style={{ color: RC.white55 }}
            >
              {description}
            </p>
          )}
        </div>
        <span
          className="flex-shrink-0 text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenAlpha, color: RC.green }}
        >
          Data
        </span>
      </div>

      {/* Canvas */}
      <div className="px-6 py-5">
        <canvas ref={canvasRef} style={{ maxHeight: '380px' }} />
      </div>

      {/* Source attribution */}
      {source && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{
            borderTop: `1px solid ${RC.cardBorder}`,
            color:     RC.white28,
          }}
        >
          Source:{' '}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: RC.green }}
              className="hover:underline"
            >
              {source}
            </a>
          ) : (
            source
          )}
        </figcaption>
      )}
    </figure>
  )
}
