// Анимированные демонстрации техники упражнений.
// Полностью на SVG + CSS: работает офлайн, без внешних GIF и вопросов с авторскими правами.
// Цвета берутся из темы (var(--accent) + var(--accent-2) через градиент exd-grad).
// Название упражнения (из мока или от нейросети) сопоставляется с движением по ключевым словам,
// для незнакомых — общая фигурка.
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

// Разделяемые градиенты и тени в defs.
const Defs = () => (
  <defs>
    <linearGradient id="exd-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="var(--accent)" />
      <stop offset="0.55" stopColor="var(--accent-3, var(--accent))" />
      <stop offset="1" stopColor="var(--accent-2)" />
    </linearGradient>
    <radialGradient id="exd-shadowGrad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
      <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
    </radialGradient>
  </defs>
)

// Тень под фигурой (пол).
const Shadow = ({ cx = 60, cy = 112, rx = 30, ry = 4 }: { cx?: number; cy?: number; rx?: number; ry?: number }) => (
  <ellipse className="exd-shadow" cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#exd-shadowGrad)" />
)

// Пол-черта (для планки/отжимания/пресса).
const GroundLine = ({ y = 108 }: { y?: number }) => (
  <line className="exd-ground" x1="10" y1={y} x2="110" y2={y} />
)

// Универсальная «стоячая» фигурка (голова + шея + торс-капсула + плечи/бёдра + двухсегментные конечности).
// Позиции пассивные — используется как фон, движение отдельные группы поверх переопределяют части.
function StandingFigure() {
  return (
    <>
      {/* голова */}
      <circle className="exd-head" cx="60" cy="22" r="7.5" />
      {/* шея */}
      <line className="exd-neck" x1="60" y1="29.5" x2="60" y2="34" />
      {/* торс капсулой */}
      <rect className="exd-torso" x="52" y="34" width="16" height="30" rx="8" />
      {/* плечи и бёдра-круги */}
      <circle className="exd-hub" cx="52" cy="36" r="2.6" />
      <circle className="exd-hub" cx="68" cy="36" r="2.6" />
      <circle className="exd-hub" cx="53" cy="62" r="2.6" />
      <circle className="exd-hub" cx="67" cy="62" r="2.6" />
    </>
  )
}

function Figure({ movement }: { movement: Movement }) {
  switch (movement) {
    // ── Джампинг-джек: подскок + широкие руки/ноги ─────────────────────
    case 'jumpingjack':
      return (
        <>
          <Shadow />
          <g className="exd exd-jjBody">
            {/* голова + шея + торс */}
            <circle className="exd-head" cx="60" cy="22" r="7.5" />
            <line className="exd-neck" x1="60" y1="29.5" x2="60" y2="34" />
            <rect className="exd-torso" x="52" y="34" width="16" height="30" rx="8" />
            {/* руки — два сегмента (плечо + предплечье), группируем для вращения */}
            <g className="exd exd-jjArmL" style={joint(52, 38)}>
              <polyline className="exd-limb" points="52,38 44,58 42,74" />
              <circle className="exd-joint" cx="44" cy="58" r="2" />
            </g>
            <g className="exd exd-jjArmR" style={joint(68, 38)}>
              <polyline className="exd-limb" points="68,38 76,58 78,74" />
              <circle className="exd-joint" cx="76" cy="58" r="2" />
            </g>
            {/* ноги — два сегмента */}
            <g className="exd exd-jjLegL" style={joint(53, 62)}>
              <polyline className="exd-limb" points="53,62 52,86 52,106" />
              <circle className="exd-joint" cx="52" cy="86" r="2" />
            </g>
            <g className="exd exd-jjLegR" style={joint(67, 62)}>
              <polyline className="exd-limb" points="67,62 68,86 68,106" />
              <circle className="exd-joint" cx="68" cy="86" r="2" />
            </g>
          </g>
        </>
      )

    // ── Присед: сгиб колен, наклон корпуса, лёгкое опускание ───────────
    case 'squat':
      return (
        <>
          <Shadow />
          <g className="exd exd-squatDrop">
            {/* корпус с лёгким наклоном вперёд */}
            <g className="exd exd-squatTorso" style={joint(60, 64)}>
              <circle className="exd-head" cx="60" cy="22" r="7.5" />
              <line className="exd-neck" x1="60" y1="29.5" x2="60" y2="34" />
              <rect className="exd-torso" x="52" y="34" width="16" height="30" rx="8" />
              {/* руки вытянуты вперёд для баланса */}
              <polyline className="exd-limb" points="52,38 44,44 30,44" />
              <polyline className="exd-limb" points="68,38 76,44 90,44" />
            </g>
            {/* ноги: бедро → колено → голень */}
            <g className="exd exd-squatLegL" style={joint(53, 62)}>
              <polyline className="exd-limb" points="53,62 44,84 48,106" />
              <circle className="exd-joint" cx="44" cy="84" r="2.2" />
            </g>
            <g className="exd exd-squatLegR" style={joint(67, 62)}>
              <polyline className="exd-limb" points="67,62 76,84 72,106" />
              <circle className="exd-joint" cx="76" cy="84" r="2.2" />
            </g>
          </g>
        </>
      )

    // ── Отжимание: горизонтальный корпус + сгиб рук (тело опускается)  ─
    case 'pushup':
      return (
        <>
          <GroundLine y={108} />
          <g className="exd exd-pushBody">
            {/* горизонтальный корпус */}
            <circle className="exd-head" cx="30" cy="76" r="7.5" />
            <line className="exd-neck" x1="34" y1="80" x2="40" y2="82" />
            <rect className="exd-torso" x="40" y="78" width="46" height="12" rx="6" />
            {/* нога-опора */}
            <polyline className="exd-limb" points="86,84 100,96 102,108" />
            <polyline className="exd-limb" points="86,86 94,100 92,108" />
            {/* руки — плечо (44,82) → локоть → кисть на полу (46,108) */}
            <g className="exd exd-pushArm" style={joint(44, 82)}>
              <polyline className="exd-limb" points="44,82 42,96 46,108" />
              <circle className="exd-joint" cx="42" cy="96" r="2.2" />
            </g>
            <g className="exd exd-pushArm" style={joint(52, 84)}>
              <polyline className="exd-limb" points="52,84 50,98 54,108" />
              <circle className="exd-joint" cx="50" cy="98" r="2.2" />
            </g>
          </g>
        </>
      )

    // ── Планка: жёсткое удержание, дыхание ─────────────────────────────
    case 'plank':
      return (
        <>
          <GroundLine y={108} />
          <g className="exd exd-plank">
            <circle className="exd-head" cx="26" cy="72" r="7.5" />
            <line className="exd-neck" x1="30" y1="76" x2="36" y2="78" />
            <rect className="exd-torso" x="36" y="76" width="52" height="12" rx="6" />
            {/* предплечья на полу */}
            <polyline className="exd-limb" points="40,80 36,96 30,108" />
            <polyline className="exd-limb" points="46,82 44,96 44,108" />
            {/* ноги */}
            <polyline className="exd-limb" points="88,82 100,96 102,108" />
            <polyline className="exd-limb" points="82,84 92,100 90,108" />
          </g>
        </>
      )

    // ── Выпад: одна нога впереди, вторая сзади, опускание ─────────────
    case 'lunge':
      return (
        <>
          <Shadow rx={38} />
          <g className="exd exd-lungeDrop">
            <circle className="exd-head" cx="60" cy="22" r="7.5" />
            <line className="exd-neck" x1="60" y1="29.5" x2="60" y2="34" />
            <rect className="exd-torso" x="52" y="34" width="16" height="30" rx="8" />
            {/* руки на бёдрах */}
            <polyline className="exd-limb" points="52,38 46,54 50,66" />
            <polyline className="exd-limb" points="68,38 74,54 70,66" />
            {/* передняя нога — согнута ~90° */}
            <polyline className="exd-limb" points="55,62 42,84 42,106" />
            <circle className="exd-joint" cx="42" cy="84" r="2.2" />
            {/* задняя нога — отставлена */}
            <polyline className="exd-limb" points="65,62 82,84 92,106" />
            <circle className="exd-joint" cx="82" cy="84" r="2.2" />
          </g>
        </>
      )

    // ── Высокое поднимание колен: чередование ног + подскок ────────────
    case 'highknees':
      return (
        <>
          <Shadow />
          <g className="exd exd-hkBounce">
            <circle className="exd-head" cx="60" cy="22" r="7.5" />
            <line className="exd-neck" x1="60" y1="29.5" x2="60" y2="34" />
            <rect className="exd-torso" x="52" y="34" width="16" height="30" rx="8" />
            {/* руки — работа противофазно к ногам */}
            <g className="exd exd-hkArmL" style={joint(52, 38)}>
              <polyline className="exd-limb" points="52,38 44,52 48,64" />
              <circle className="exd-joint" cx="44" cy="52" r="2" />
            </g>
            <g className="exd exd-hkArmR" style={joint(68, 38)}>
              <polyline className="exd-limb" points="68,38 76,52 72,64" />
              <circle className="exd-joint" cx="76" cy="52" r="2" />
            </g>
            {/* ноги — сгиб в колене, бедро поднимается */}
            <g className="exd exd-hkLegL" style={joint(53, 62)}>
              <polyline className="exd-limb" points="53,62 50,84 54,106" />
              <circle className="exd-joint" cx="50" cy="84" r="2.2" />
            </g>
            <g className="exd exd-hkLegR" style={joint(67, 62)}>
              <polyline className="exd-limb" points="67,62 70,84 66,106" />
              <circle className="exd-joint" cx="70" cy="84" r="2.2" />
            </g>
          </g>
        </>
      )

    // ── Скручивания: корпус поднимается к согнутым коленям ────────────
    case 'crunch':
      return (
        <>
          <GroundLine y={106} />
          {/* ноги согнуты, ступни на полу */}
          <polyline className="exd-limb" points="60,102 74,84 92,96" />
          <circle className="exd-joint" cx="74" cy="84" r="2.2" />
          <g className="exd exd-crunchTorso" style={joint(60, 104)}>
            {/* корпус поднимается */}
            <rect className="exd-torso" x="30" y="86" width="30" height="12" rx="6" transform="rotate(-14 45 92)" />
            <circle className="exd-head" cx="26" cy="86" r="7.5" />
            {/* руки за головой */}
            <polyline className="exd-limb" points="30,84 22,74 30,66" />
            <polyline className="exd-limb" points="34,88 26,78 34,70" />
          </g>
        </>
      )

    // ── Супермен: руки и ноги подъём из положения лёжа ────────────────
    case 'superman':
      return (
        <>
          <GroundLine y={106} />
          <rect className="exd-torso" x="40" y="92" width="40" height="10" rx="5" />
          <circle className="exd-head" cx="34" cy="92" r="7.5" />
          <g className="exd exd-superArm" style={joint(44, 96)}>
            <polyline className="exd-limb" points="44,96 30,96 20,96" />
            <circle className="exd-joint" cx="30" cy="96" r="2" />
          </g>
          <g className="exd exd-superLeg" style={joint(76, 98)}>
            <polyline className="exd-limb" points="76,98 90,100 100,102" />
            <circle className="exd-joint" cx="90" cy="100" r="2" />
          </g>
        </>
      )

    // ── Сгибания рук: предплечья вверх к плечам ───────────────────────
    case 'curl':
      return (
        <>
          <Shadow />
          <StandingFigure />
          {/* ноги — просто прямые */}
          <polyline className="exd-limb" points="53,62 48,86 52,106" />
          <polyline className="exd-limb" points="67,62 72,86 68,106" />
          {/* руки: плечо неподвижно, предплечье вращается вокруг локтя */}
          <line className="exd-limb" x1="52" y1="38" x2="46" y2="60" />
          <line className="exd-limb" x1="68" y1="38" x2="74" y2="60" />
          <g className="exd exd-curlL" style={joint(46, 60)}>
            <line className="exd-limb" x1="46" y1="60" x2="48" y2="78" />
            <circle className="exd-hub" cx="48" cy="78" r="3" />
          </g>
          <g className="exd exd-curlR" style={joint(74, 60)}>
            <line className="exd-limb" x1="74" y1="60" x2="72" y2="78" />
            <circle className="exd-hub" cx="72" cy="78" r="3" />
          </g>
        </>
      )

    // ── Подъёмы рук через стороны ─────────────────────────────────────
    case 'raise':
      return (
        <>
          <Shadow />
          <StandingFigure />
          <polyline className="exd-limb" points="53,62 48,86 52,106" />
          <polyline className="exd-limb" points="67,62 72,86 68,106" />
          <g className="exd exd-raiseL" style={joint(52, 38)}>
            <polyline className="exd-limb" points="52,38 40,52 30,58" />
            <circle className="exd-joint" cx="40" cy="52" r="2" />
          </g>
          <g className="exd exd-raiseR" style={joint(68, 38)}>
            <polyline className="exd-limb" points="68,38 80,52 90,58" />
            <circle className="exd-joint" cx="80" cy="52" r="2" />
          </g>
        </>
      )

    // ── Общая фигурка: бодрый подскок с махом рук ─────────────────────
    default:
      return (
        <>
          <Shadow />
          <g className="exd exd-bounce">
            <StandingFigure />
            <g className="exd exd-bounceArmL" style={joint(52, 38)}>
              <polyline className="exd-limb" points="52,38 44,54 40,68" />
            </g>
            <g className="exd exd-bounceArmR" style={joint(68, 38)}>
              <polyline className="exd-limb" points="68,38 76,54 80,68" />
            </g>
            <polyline className="exd-limb" points="53,62 48,86 52,106" />
            <polyline className="exd-limb" points="67,62 72,86 68,106" />
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
      <Defs />
      <Figure movement={mv} />
    </svg>
  )
}
