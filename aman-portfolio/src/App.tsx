import './App.css'
import heroIllustration from './assets/hero.png'
import appIcon from './assets/aman-app.png'
import { ContactCard } from './components/ContactCard'
import { FeatureCard } from './components/FeatureCard'
import { HeroShowcase } from './components/HeroShowcase'
import { MetricCard } from './components/MetricCard'
import { PolicyCard } from './components/PolicyCard'
import { SectionIntro } from './components/SectionIntro'
import { siteContent } from './data/siteContent'

function App() {
  const year = new Date().getFullYear()

  return (
    <div className="portfolio-shell">
      <header className="site-header">
        <a className="brand" href="#hero">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>{siteContent.brand.name}</strong>
            <small>{siteContent.brand.label}</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Main navigation">
          {siteContent.navigation.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="content">
        <section className="hero section" id="hero">
          <div className="hero-copy">
            <p className="hero-kicker">{siteContent.hero.kicker}</p>
            <h1>{siteContent.hero.title}</h1>
            <p className="hero-text">{siteContent.hero.description}</p>

            <div className="hero-actions">
              <a className="button button-primary" href={siteContent.hero.primaryAction.href}>
                {siteContent.hero.primaryAction.label}
              </a>
              <a className="button button-secondary" href={siteContent.hero.secondaryAction.href}>
                {siteContent.hero.secondaryAction.label}
              </a>
            </div>

            <ul className="hero-tags" aria-label="Hero tags">
              {siteContent.hero.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>

            <div className="trust-ledger">
              {siteContent.hero.ledger.map((item) => (
                <div className="ledger-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <HeroShowcase
            appIcon={appIcon}
            heroIllustration={heroIllustration}
            title={siteContent.hero.showcaseTitle}
            subtitle={siteContent.hero.showcaseSubtitle}
            status={siteContent.hero.showcaseStatus}
            notes={siteContent.hero.showcaseNotes}
            floatingTop={siteContent.hero.floatingTop}
            floatingBottom={siteContent.hero.floatingBottom}
          />
        </section>

        <section className="section section-tight">
          <div className="metric-grid">
            {siteContent.stats.map((item) => (
              <MetricCard key={item.label} value={item.value} label={item.label} note={item.note} />
            ))}
          </div>
        </section>

        <section className="section section-panel" id="about">
          <div className="section-layout">
            <SectionIntro
              kicker="About Amanly"
              title="A marketplace identity shaped like a product story, not a plain brochure."
              description="The portfolio now uses reusable components to explain the app clearly while keeping the experience visually strong and consistent."
            />

            <div className="story-grid">
              {siteContent.aboutStories.map((item, index) => (
                <FeatureCard
                  key={item.title}
                  eyebrow={`0${index + 1}`}
                  title={item.title}
                  description={item.description}
                  tone={item.tone}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <SectionIntro
            kicker="Highlights"
            title="Each section now reads like a designed product component."
            description="Hero, support, privacy, and policy content are separated into reusable cards so the site is easier to maintain and easier to extend."
          />

          <div className="feature-grid">
            {siteContent.highlights.map((item) => (
              <FeatureCard
                key={item.title}
                eyebrow={item.eyebrow}
                title={item.title}
                description={item.description}
                tone={item.tone}
              />
            ))}
          </div>
        </section>

        <section className="section section-panel" id="privacy">
          <SectionIntro
            kicker="Privacy Policy"
            title="Privacy content explains account data, catalog sources, and user controls."
            description="This section clarifies what customer data Amanly uses, how public product information can appear in listings, and how users can request account deletion."
            note="Updated May 20, 2026"
          />

          <div className="policy-grid">
            {siteContent.privacyItems.map((item) => (
              <PolicyCard key={item.title} title={item.title} points={item.points} />
            ))}
          </div>
        </section>

        <section className="section" id="policy">
          <SectionIntro
            kicker="Service Policy"
            title="Service policy keeps the marketplace scope and ordering rules explicit."
            description="Payment, shipping, returns, listing scope, and content conduct are grouped into clear policy cards so customers and reviewers can understand how Amanly operates."
            note="Updated May 20, 2026"
          />

          <div className="policy-grid">
            {siteContent.policyItems.map((item) => (
              <PolicyCard key={item.title} title={item.title} points={item.points} />
            ))}
          </div>
        </section>

        <section className="section contact-band" id="contact">
          <div className="contact-band-header">
            <SectionIntro
              kicker="Contact"
              title="Support channels stay prominent, direct, and actionable."
              description="The contact section uses reusable contact cards so it can grow with future channels like live chat, social support, or regional teams."
            />
          </div>

          <div className="contact-grid">
            {siteContent.contactMethods.map((item) => (
              <ContactCard
                key={item.title}
                title={item.title}
                detail={item.detail}
                note={item.note}
                href={item.href}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>{siteContent.brand.name} Ecommerce Application Portfolio</p>
        <small>
          Copyright {year} {siteContent.brand.name}. All rights reserved. Privacy and service policy
          content applies to the Amanly marketplace and may be updated as the service changes.
        </small>
      </footer>
    </div>
  )
}

export default App
