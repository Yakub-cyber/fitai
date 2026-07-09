// Skeleton screens: пульсирующие заглушки на время генерации ИИ и загрузки данных

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="card">
      <Skeleton className="skeleton-title" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="skeleton-line" />
      ))}
    </div>
  )
}
