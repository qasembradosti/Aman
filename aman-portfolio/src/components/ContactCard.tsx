type ContactCardProps = {
  title: string
  detail: string
  note: string
  href: string
}

export function ContactCard({ title, detail, note, href }: ContactCardProps) {
  return (
    <article className="contact-card">
      <span className="contact-label">{title}</span>
      <a className="contact-link" href={href} target="_blank" rel="noreferrer">
        {detail}
      </a>
      <p>{note}</p>
    </article>
  )
}
