import { useState, type ReactNode } from 'react'

interface AccordionProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

// Интерактивный аккордеон: заголовок с мета-информацией, разворачивающееся содержимое
export function Accordion({ title, subtitle, actions, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`accordion card ${open ? 'open' : ''}`}>
      <div className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <div className="accordion-heading">
          <div className="accordion-title">{title}</div>
          {subtitle && <div className="accordion-subtitle">{subtitle}</div>}
        </div>
        <div className="accordion-actions" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
        <span className={`accordion-chevron ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  )
}
