type MetricCardProps = {
  value: string
  label: string
  note: string
}

export function MetricCard({ value, label, note }: MetricCardProps) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </article>
  )
}
