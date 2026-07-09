import type { LogEntry } from '../api/types'

interface WeightChartProps {
  entries: LogEntry[] // записи веса, порядок любой
}

const W = 320
const H = 160
const PAD = { top: 14, right: 12, bottom: 22, left: 30 }

// Лёгкий SVG-график динамики веса без сторонних библиотек.
// Цвета — через CSS-переменные темы, поэтому график сам подстраивается под тёмный режим.
export function WeightChart({ entries }: WeightChartProps) {
  const points = entries
    .filter((e) => typeof e.weight === 'number')
    .map((e) => ({ t: new Date(e.date).getTime(), w: e.weight as number }))
    .sort((a, b) => a.t - b.t)

  if (points.length < 2) {
    return (
      <p className="muted">
        Добавьте хотя бы две записи веса, чтобы увидеть график динамики.
      </p>
    )
  }

  const weights = points.map((p) => p.w)
  const times = points.map((p) => p.t)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  // немного «воздуха» сверху/снизу, чтобы линия не липла к краям
  const padW = Math.max((maxW - minW) * 0.15, 0.5)
  const loW = minW - padW
  const hiW = maxW + padW

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const x = (t: number) => PAD.left + (maxT === minT ? plotW / 2 : ((t - minT) / (maxT - minT)) * plotW)
  const y = (w: number) => PAD.top + (1 - (w - loW) / (hiW - loW)) * plotH

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.w).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${x(maxT).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${x(minT).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`

  // 3 горизонтальные линии сетки с подписями веса
  const gridRows = [0, 0.5, 1].map((f) => {
    const w = hiW - f * (hiW - loW)
    return { y: y(w), label: w.toFixed(1) }
  })

  const fmtDate = (t: number) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="weight-chart" role="img" aria-label="График динамики веса">
      {gridRows.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} className="wc-grid" />
          <text x={PAD.left - 4} y={g.y + 3} className="wc-axis" textAnchor="end">
            {g.label}
          </text>
        </g>
      ))}

      <path d={areaPath} className="wc-area" />
      <path d={linePath} className="wc-line" />

      {points.map((p, i) => (
        <circle key={i} cx={x(p.t)} cy={y(p.w)} r={i === points.length - 1 ? 4 : 2.5} className="wc-dot" />
      ))}

      <text x={PAD.left} y={H - 6} className="wc-axis" textAnchor="start">
        {fmtDate(minT)}
      </text>
      <text x={W - PAD.right} y={H - 6} className="wc-axis" textAnchor="end">
        {fmtDate(maxT)}
      </text>
    </svg>
  )
}
