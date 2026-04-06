type SectionIntroProps = {
  kicker: string
  title: string
  description: string
  note?: string
}

export function SectionIntro({ kicker, title, description, note }: SectionIntroProps) {
  return (
    <div className="section-intro">
      <p className="section-kicker">{kicker}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {note ? <span className="section-note">{note}</span> : null}
    </div>
  )
}
