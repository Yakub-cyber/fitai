import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { DietDoc } from '../api/types'
import { Accordion } from '../components/Accordion'
import { SkeletonCard } from '../components/Skeleton'
import { TagInput } from '../components/TagInput'

const PRODUCT_SUGGESTIONS = [
  'Куриная грудка', 'Индейка', 'Говядина', 'Лосось', 'Тунец', 'Яйца', 'Творог',
  'Греческий йогурт', 'Кефир', 'Сыр', 'Молоко', 'Овсянка', 'Гречка', 'Рис',
  'Киноа', 'Макароны', 'Картофель', 'Батат', 'Хлеб цельнозерновой', 'Брокколи',
  'Цветная капуста', 'Шпинат', 'Помидоры', 'Огурцы', 'Перец болгарский',
  'Морковь', 'Кабачок', 'Авокадо', 'Яблоки', 'Бананы', 'Ягоды', 'Орехи',
  'Оливковое масло', 'Чечевица', 'Нут', 'Фасоль', 'Тофу',
]

export function DietPage() {
  const [diets, setDiets] = useState<DietDoc[] | null>(null)
  const [products, setProducts] = useState<string[]>([])
  const [goal, setGoal] = useState('Похудение')
  const [mealsPerDay, setMealsPerDay] = useState(4)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<DietDoc[]>('/diets')
      .then(setDiets)
      .catch(() => setDiets([]))
  }, [])

  const generate = async (e: FormEvent) => {
    e.preventDefault()
    if (products.length === 0) {
      setError('Добавьте хотя бы один продукт')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const diet = await api<DietDoc>('/diets/generate', {
        body: { products, goal, mealsPerDay },
      })
      setDiets((d) => [diet, ...(d ?? [])])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  const remove = async (id: string) => {
    await api(`/diets/${id}`, { method: 'DELETE' })
    setDiets((d) => (d ?? []).filter((x) => x._id !== id))
  }

  return (
    <div className="page">
      <h1>AI-Диетолог</h1>

      <form className="card generator-form" onSubmit={generate}>
        <h3>Составить план питания</h3>

        <div className="field-label">Какие продукты у вас есть?</div>
        <TagInput
          tags={products}
          onChange={setProducts}
          suggestions={PRODUCT_SUGGESTIONS}
          placeholder="Начните вводить: курица, рис, брокколи…"
        />

        <div className="form-row">
          <label>
            Цель
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option>Похудение</option>
              <option>Поддержание формы</option>
              <option>Набор мышечной массы</option>
            </select>
          </label>
          <label>
            Приёмов пищи
            <select value={mealsPerDay} onChange={(e) => setMealsPerDay(Number(e.target.value))}>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={generating}>
          {generating ? 'Составляю план…' : '🥗 Составить план'}
        </button>
      </form>

      <h2>Мои планы питания</h2>

      {generating && <SkeletonCard lines={6} />}
      {diets === null && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}
      {diets?.length === 0 && !generating && (
        <p className="muted">Планов пока нет — составьте первый выше.</p>
      )}

      {diets?.map((d) => (
        <Accordion
          key={d._id}
          title={d.plan.title}
          subtitle={`${d.plan.dailyCalories} ккал · Б ${d.plan.macros.protein} / Ж ${d.plan.macros.fat} / У ${d.plan.macros.carbs} г · ${new Date(d.createdAt).toLocaleDateString('ru-RU')}`}
          actions={
            <button className="btn btn-sm btn-danger" onClick={() => remove(d._id)}>
              Удалить
            </button>
          }
        >
          {d.plan.meals.map((meal, i) => (
            <Accordion
              key={i}
              title={`${meal.name}: ${meal.recipeTitle}`}
              subtitle={`${meal.calories} ккал · Б ${meal.protein} / Ж ${meal.fat} / У ${meal.carbs} г`}
            >
              <p>
                <strong>Ингредиенты:</strong>
              </p>
              <ul>
                {meal.ingredients.map((ing, j) => (
                  <li key={j}>{ing}</li>
                ))}
              </ul>
              <p>
                <strong>Приготовление:</strong>
              </p>
              <ol>
                {meal.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
            </Accordion>
          ))}

          {d.plan.tips.length > 0 && (
            <div className="tips">
              <strong>💡 Советы:</strong>
              <ul>
                {d.plan.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </Accordion>
      ))}
    </div>
  )
}
