type PolicyCardProps = {
  title: string
  points: string[]
}

export function PolicyCard({ title, points }: PolicyCardProps) {
  return (
    <article className="policy-card">
      <h3>{title}</h3>
      <ul className="policy-list">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </article>
  )
}
