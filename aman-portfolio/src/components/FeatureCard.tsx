type FeatureCardProps = {
  eyebrow: string
  title: string
  description: string
  tone?: 'clay' | 'teal' | 'sand'
}

export function FeatureCard({
  eyebrow,
  title,
  description,
  tone = 'sand',
}: FeatureCardProps) {
  return (
    <article className={`feature-card tone-${tone}`}>
      <span className="card-eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}
