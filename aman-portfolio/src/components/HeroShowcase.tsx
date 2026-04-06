type HeroShowcaseProps = {
  appIcon: string
  heroIllustration: string
  title: string
  subtitle: string
  status: string
  notes: Array<{ label: string; value: string }>
  floatingTop: { label: string; value: string }
  floatingBottom: { label: string; value: string }
}

export function HeroShowcase({
  appIcon,
  heroIllustration,
  title,
  subtitle,
  status,
  notes,
  floatingTop,
  floatingBottom,
}: HeroShowcaseProps) {
  return (
    <div className="hero-stage" aria-hidden="true">
      <div className="orb orb-clay"></div>
      <div className="orb orb-teal"></div>

      <div className="showcase-frame">
        <div className="showcase-header">
          <div className="showcase-brand">
            <img className="showcase-icon" src={appIcon} alt="" />
            <div>
              <span className="mini-label">Amanly app</span>
              <strong>{title}</strong>
            </div>
          </div>
          <span className="status-chip">{status}</span>
        </div>

        <div className="showcase-screen">
          <div className="screen-copy">
            <span className="mini-label">Showcase</span>
            <strong>{subtitle}</strong>
          </div>
          <img className="showcase-illustration" src={heroIllustration} alt="" />
        </div>

        <div className="showcase-note-grid">
          {notes.map((note) => (
            <div className="showcase-note" key={note.label}>
              <span className="mini-label">{note.label}</span>
              <strong>{note.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="floating-note floating-note-top">
        <span className="mini-label">{floatingTop.label}</span>
        <strong>{floatingTop.value}</strong>
      </div>

      <div className="floating-note floating-note-bottom">
        <span className="mini-label">{floatingBottom.label}</span>
        <strong>{floatingBottom.value}</strong>
      </div>
    </div>
  )
}
