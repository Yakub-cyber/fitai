import { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}

// Ввод продуктов тегами с автодополнением: Enter или запятая добавляет тег,
// Backspace на пустом поле удаляет последний
export function TagInput({ tags, onChange, suggestions, placeholder }: TagInputProps) {
  const [input, setInput] = useState('')

  const filtered = input
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(input.toLowerCase()) &&
            !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
        )
        .slice(0, 6)
    : []

  const addTag = (value: string) => {
    const tag = value.trim().replace(/,$/, '')
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...tags, tag])
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      <div className="tag-input-field">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button type="button" className="tag-remove" onClick={() => onChange(tags.filter((t) => t !== tag))}>
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
      {filtered.length > 0 && (
        <ul className="tag-suggestions">
          {filtered.map((s) => (
            <li key={s} onClick={() => addTag(s)}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
