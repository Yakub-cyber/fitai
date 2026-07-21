// Анимация упражнения = два фото-кадра (0.jpg = старт, 1.jpg = финиш)
// из free-exercise-db (public domain), переключающиеся через CSS-crossfade.
// Ассеты лежат в web/public/exercises/<slug>/[0|1].jpg (см. scripts/fetch-exercise-images.js).
// Если по названию не нашли slug либо файл не загрузился — fallback на SVG-стикмен.
import { useMemo, useState } from 'react'
import '../exercise-animation.css'
import { StickmanFigure, type Movement, pickStickmanMovement } from './StickmanFigure'

// Русские и англ. подстроки → slug в public/exercises. Порядок важен: специфичное — выше.
const NAME_TO_SLUG: [RegExp, string][] = [
  // корпус / пресс — до "отжиманий", чтобы «планка» не съедалась
  [/русск.*твист|russian\s*twist/i, 'russian-twist'],
  [/велосипед|bicycle/i, 'bicycle-crunch'],
  [/скручив|crunch|sit[-\s]?up|подъ[её]м.{0,4}корпус/i, 'crunch'],
  [/планк|plank|упор л[её]жа/i, 'plank'],
  [/супермен|superman|гиперэкстен|лодочк|ласточк/i, 'superman'],

  // ноги
  [/присед|squat/i, 'squat'],
  [/выпад|lunge/i, 'lunge'],
  [/мост|bridge|glute|ягодич/i, 'glute-bridge'],
  [/mountain|альпин|скалолаз/i, 'high-knees'],
  [/колен|high\s*knee|бег на месте|бег с подн/i, 'high-knees'],
  [/икр|calf/i, 'calf-raise'],
  [/джампинг|jumping|jack|star\s*jump|прыжк.*раз/i, 'jumping-jack'],

  // отжимания — более специфичные впереди
  [/пайк|уголк|handstand|стойка на рук/i, 'pushup-pike'],
  [/обратн.*отжим|dip|брусья|со стул|от стул/i, 'bench-dip'],
  [/широк.*(постанов|отжим)|wide.*push/i, 'pushup-wide'],
  [/узк.*(постанов|отжим)|close.*push|алмаз/i, 'pushup-close'],
  [/отжим|push[-\s]?up/i, 'pushup'],

  // руки / плечи
  [/бицепс|сгибан.*рук|curl(?!.*calf)|молот/i, 'bicep-curl'],
  [/трицепс|tricep|разгибан.*рук/i, 'tricep-extension'],
  [/подъ[её]м рук|через сторон|махи в сторон|lateral|dumbbell.*side/i, 'lateral-raise'],
  [/жим (стоя|гантел.*стоя)|shoulder\s*press|плеч.*жим/i, 'shoulder-press'],
  [/жим (л[её]жа|на скам)|bench\s*press|chest\s*press|отжима.*штанг/i, 'chest-press'],
  [/тяга|row/i, 'row'],
]

function pickSlug(name: string): string | null {
  for (const [re, slug] of NAME_TO_SLUG) if (re.test(name)) return slug
  return null
}

// BASE_URL Vite подставляет /fitai/ на GH Pages и / локально.
const BASE = import.meta.env.BASE_URL

interface Props {
  name: string
  /** Форсировать SVG-фигурку (для лендинга). */
  movement?: Movement
  className?: string
}

export function ExerciseAnimation({ name, movement, className = '' }: Props) {
  const slug = useMemo(() => (movement ? null : pickSlug(name)), [name, movement])
  const [broken, setBroken] = useState(false)

  // Нет матча либо картинка не загрузилась — показываем стикмен.
  if (!slug || broken) {
    const mv = movement ?? pickStickmanMovement(name)
    return (
      <svg
        className={`exdemo exdemo--${mv} ${className}`}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Демонстрация: ${name}`}
      >
        <StickmanFigure movement={mv} />
      </svg>
    )
  }

  const src0 = `${BASE}exercises/${slug}/0.jpg`
  const src1 = `${BASE}exercises/${slug}/1.jpg`
  return (
    <div className={`exanim ${className}`} role="img" aria-label={`Демонстрация: ${name}`}>
      <img
        className="exanim-photo exanim-photo--a"
        src={src0}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
      <img
        className="exanim-photo exanim-photo--b"
        src={src1}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

// Reexport для тестов/лендинга.
export { pickStickmanMovement as pickMovement } from './StickmanFigure'
export type { Movement } from './StickmanFigure'
