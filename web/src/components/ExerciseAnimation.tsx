// Анимированные демонстрации техники упражнений.
// Полностью на SVG + CSS: работает офлайн, без внешних GIF и вопросов с авторскими правами,
// цвета берутся из темы (var(--accent)). Название упражнения (из мока или от нейросети)
// сопоставляется с движением по ключевым словам, для незнакомых — общая фигурка.
import '../exercise-animation.css'

type Movement =
  | 'jumpingjack'
  | 'squat'
  | 'pushup'
  | 'plank'
  | 'lunge'
  | 'highknees'
  | 'crunch'
  | 'superman'
  | 'curl'
  | 'raise'
  | 'generic'

// Сопоставление по ключевым словам (рус + англ). Порядок важен: более специфичные — выше.
const KEYWORDS: [RegExp, Movement][] = [
  [/присед|squat/i, 'squat'],
  [/планк|plank|упор л[её]жа/i, 'plank'],
  [/джампинг|jumping|jack|прыжк/i, 'jumpingjack'],
  [/выпад|lunge/i, 'lunge'],
  [/колен|high\s*knee|бег на месте|бег с|running/i, 'highknees'],
  [/скручив|пресс|crunch|sit[-\s]?up|подъ[её]м.{0,4}корпус|корпус|туловищ|велосипед/i, 'crunch'],
  [/супермен|superman|гиперэкстен|разгибан|лодочк|ласточк/i, 'superman'],
  [/отжим|push[-\s]?up|пайк|уголк|обратн|дип|dip|брусья/i, 'pushup'],
  [/сгибан|бицепс|curl|молот/i, 'curl'],
  [/подъ[её]м рук|через сторон|махи|развед|тяга|row|lateral|плеч|жим/i, 'raise'],
]

export function pickMovement(name: string): Movement {
  for (const [re, mv] of KEYWORDS) if (re.test(name)) return mv
  return 'generic'
}

// Общие пропсы группы-сустава: transform-origin в координатах viewBox.
const joint = (x: number, y: number): React.CSSProperties => ({
  transformBox: 'view-box',
  transformOrigin: `${x}px ${y}px`,
})

const GROUND = (
  <ellipse className="exd-shadow" cx="60" cy="112" rx="34" ry="4" />
)

function Figure({ movement }: { movement: Movement }) {
  switch (movement) {
    // ── Джампинг-джек: руки взмах вверх, ноги в стороны ─────────────
    case 'jumpingjack':
      return (
        <>
          {GROUND}
          <circle className="exd-head" cx="60" cy="24" r="7" />
          <line className="exd-body" x1="60" y1="31" x2="60" y2="66" />
          <g className="exd exd-jjArmL" style={joint(60, 43)}>
            <line className="exd-limb" x1="60" y1="43" x2="50" y2="68" />
          </g>
          <g className="exd exd-jjArmR" style={joint(60, 43)}>
            <line className="exd-limb" x1="60" y1="43" x2="70" y2="68" />
          </g>
          <g className="exd exd-jjLegL" style={joint(60, 66)}>
            <line className="exd-limb" x1="60" y1="66" x2="54" y2="106" />
          </g>
          <g className="exd exd-jjLegR" style={joint(60, 66)}>
            <line className="exd-limb" x1="60" y1="66" x2="66" y2="106" />
          </g>
        </>
      )

    // ── Присед: корпус опускается, колени сгибаются (сжатие к полу) ──
    case 'squat':
      return (
        <>
          {GROUND}
          <g className="exd exd-squat" style={joint(60, 106)}>
            <circle className="exd-head" cx="60" cy="24" r="7" />
            <line className="exd-body" x1="60" y1="31" x2="60" y2="66" />
            <line className="exd-limb" x1="60" y1="44" x2="80" y2="46" />
            <line className="exd-limb" x1="60" y1="44" x2="40" y2="46" />
            <polyline className="exd-limb" points="60,66 48,86 50,106" />
            <polyline className="exd-limb" points="60,66 72,86 70,106" />
          </g>
        </>
      )

    // ── Отжимание: тело качается к полу (сгибание рук) ───────────────
    case 'pushup':
      return (
        <>
          <line className="exd-ground" x1="18" y1="108" x2="102" y2="108" />
          <g className="exd exd-pushBody" style={joint(96, 104)}>
            <circle className="exd-head" cx="34" cy="80" r="7" />
            <line className="exd-body" x1="40" y1="82" x2="96" y2="104" />
            <line className="exd-limb" x1="96" y1="104" x2="99" y2="108" />
            <line className="exd-limb" x1="48" y1="84" x2="50" y2="108" />
          </g>
        </>
      )

    // ── Планка: удержание, лёгкое «дыхание» ──────────────────────────
    case 'plank':
      return (
        <>
          <line className="exd-ground" x1="18" y1="108" x2="102" y2="108" />
          <g className="exd exd-plank">
            <circle className="exd-head" cx="30" cy="78" r="7" />
            <line className="exd-body" x1="36" y1="80" x2="96" y2="102" />
            <line className="exd-limb" x1="46" y1="84" x2="44" y2="108" />
            <line className="exd-limb" x1="96" y1="102" x2="99" y2="108" />
          </g>
        </>
      )

    // ── Выпад: опускание в выпаде вверх-вниз ─────────────────────────
    case 'lunge':
      return (
        <>
          {GROUND}
          <g className="exd exd-lunge">
            <circle className="exd-head" cx="60" cy="26" r="7" />
            <line className="exd-body" x1="60" y1="33" x2="60" y2="64" />
            <polyline className="exd-limb" points="60,64 44,84 44,106" />
            <polyline className="exd-limb" points="60,64 78,86 84,106" />
            <line className="exd-limb" x1="60" y1="46" x2="48" y2="58" />
            <line className="exd-limb" x1="60" y1="46" x2="72" y2="58" />
          </g>
        </>
      )

    // ── Высокое поднимание колен: бёдра поочерёдно вверх ─────────────
    case 'highknees':
      return (
        <>
          {GROUND}
          <circle className="exd-head" cx="60" cy="24" r="7" />
          <line className="exd-body" x1="60" y1="31" x2="60" y2="64" />
          <g className="exd exd-hkArmL" style={joint(60, 42)}>
            <line className="exd-limb" x1="60" y1="42" x2="46" y2="54" />
          </g>
          <g className="exd exd-hkArmR" style={joint(60, 42)}>
            <line className="exd-limb" x1="60" y1="42" x2="74" y2="54" />
          </g>
          <g className="exd exd-hkLegL" style={joint(60, 64)}>
            <polyline className="exd-limb" points="60,64 54,86 56,106" />
          </g>
          <g className="exd exd-hkLegR" style={joint(60, 64)}>
            <polyline className="exd-limb" points="60,64 66,86 64,106" />
          </g>
        </>
      )

    // ── Скручивания: корпус поднимается к согнутым коленям ───────────
    case 'crunch':
      return (
        <>
          <line className="exd-ground" x1="18" y1="106" x2="102" y2="106" />
          <polyline className="exd-limb" points="60,104 74,86 92,96" />
          <g className="exd exd-crunchTorso" style={joint(58, 104)}>
            <line className="exd-body" x1="58" y1="104" x2="34" y2="92" />
            <circle className="exd-head" cx="30" cy="90" r="7" />
            <line className="exd-limb" x1="44" y1="98" x2="52" y2="82" />
          </g>
        </>
      )

    // ── Супермен: руки и ноги подъём из положения лёжа ───────────────
    case 'superman':
      return (
        <>
          <line className="exd-ground" x1="18" y1="104" x2="102" y2="104" />
          <line className="exd-body" x1="40" y1="98" x2="80" y2="98" />
          <circle className="exd-head" cx="34" cy="96" r="7" />
          <g className="exd exd-superArm exd-limb-g" style={joint(42, 98)}>
            <line className="exd-limb" x1="42" y1="98" x2="24" y2="98" />
          </g>
          <g className="exd exd-superLeg exd-limb-g" style={joint(78, 98)}>
            <line className="exd-limb" x1="78" y1="98" x2="98" y2="98" />
          </g>
        </>
      )

    // ── Сгибания рук: предплечья вверх к плечам ──────────────────────
    case 'curl':
      return (
        <>
          {GROUND}
          <circle className="exd-head" cx="60" cy="24" r="7" />
          <line className="exd-body" x1="60" y1="31" x2="60" y2="70" />
          <polyline className="exd-limb" points="60,70 52,92 54,106" />
          <polyline className="exd-limb" points="60,70 68,92 66,106" />
          <line className="exd-limb" x1="60" y1="44" x2="48" y2="62" />
          <line className="exd-limb" x1="60" y1="44" x2="72" y2="62" />
          <g className="exd exd-curlL" style={joint(48, 62)}>
            <line className="exd-limb" x1="48" y1="62" x2="50" y2="80" />
          </g>
          <g className="exd exd-curlR" style={joint(72, 62)}>
            <line className="exd-limb" x1="72" y1="62" x2="70" y2="80" />
          </g>
        </>
      )

    // ── Подъёмы рук через стороны / махи ─────────────────────────────
    case 'raise':
      return (
        <>
          {GROUND}
          <circle className="exd-head" cx="60" cy="24" r="7" />
          <line className="exd-body" x1="60" y1="31" x2="60" y2="70" />
          <line className="exd-limb" x1="60" y1="70" x2="52" y2="106" />
          <line className="exd-limb" x1="60" y1="70" x2="68" y2="106" />
          <g className="exd exd-raiseL" style={joint(60, 44)}>
            <line className="exd-limb" x1="60" y1="44" x2="44" y2="60" />
          </g>
          <g className="exd exd-raiseR" style={joint(60, 44)}>
            <line className="exd-limb" x1="60" y1="44" x2="76" y2="60" />
          </g>
        </>
      )

    // ── Общая фигурка: бодрый подскок ────────────────────────────────
    default:
      return (
        <>
          {GROUND}
          <g className="exd exd-bounce">
            <circle className="exd-head" cx="60" cy="24" r="7" />
            <line className="exd-body" x1="60" y1="31" x2="60" y2="66" />
            <line className="exd-limb" x1="60" y1="42" x2="44" y2="52" />
            <line className="exd-limb" x1="60" y1="42" x2="76" y2="52" />
            <line className="exd-limb" x1="60" y1="66" x2="50" y2="104" />
            <line className="exd-limb" x1="60" y1="66" x2="70" y2="104" />
          </g>
        </>
      )
  }
}

interface Props {
  name: string
  /** Форсировать конкретное движение (для лендинга); иначе — по названию. */
  movement?: Movement
  className?: string
}

export function ExerciseAnimation({ name, movement, className = '' }: Props) {
  const mv = movement ?? pickMovement(name)
  return (
    <svg
      className={`exdemo exdemo--${mv} ${className}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Демонстрация: ${name}`}
    >
      <Figure movement={mv} />
    </svg>
  )
}
