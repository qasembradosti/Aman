export const siteContent = {
  brand: {
    name: 'Amanly',
    label: 'Ecommerce Application',
  },
  navigation: [
    { label: 'About', href: '#about' },
    { label: 'Privacy', href: '#privacy' },
    { label: 'Policy', href: '#policy' },
    { label: 'Contact', href: '#contact' },
  ],
  hero: {
    kicker: 'Component-based static portfolio',
    title: 'Amanly now feels like a premium ecommerce brand presentation instead of a starter landing page.',
    description:
      'The theme has been upgraded into a warm editorial storefront style with reusable React components, richer hierarchy, and a clearer separation between product story, trust content, and support information.',
    primaryAction: { label: 'See the story', href: '#about' },
    secondaryAction: { label: 'Open contact', href: '#contact' },
    tags: ['Premium storefront theme', 'Reusable components', 'Privacy and policy included'],
    ledger: [
      { label: 'Design mode', value: 'Editorial commerce' },
      { label: 'Structure', value: 'Reusable section components' },
      { label: 'Support presence', value: 'Direct and visible' },
    ],
    showcaseTitle: 'Trusted shopping partner',
    showcaseSubtitle: 'Commerce, privacy, policy, and support framed in one branded experience.',
    showcaseStatus: 'Refined portfolio',
    showcaseNotes: [
      { label: 'Core flow', value: 'Browse, order, track' },
      { label: 'Support', value: 'Mail, phone, WhatsApp' },
    ],
    floatingTop: {
      label: 'Theme direction',
      value: 'Warm, premium, and product-led',
    },
    floatingBottom: {
      label: 'Refactor result',
      value: 'Cleaner code with reusable UI pieces',
    },
  },
  stats: [
    { value: '100+', label: 'active shoppers', note: 'Presented as a scale signal for trust.' },
    { value: '1K+', label: 'listed products', note: 'Supports a marketplace narrative.' },
    { value: '24/7', label: 'support coverage', note: 'Keeps service visible in the brand story.' },
    { value: '99%', label: 'customer-first focus', note: 'Reinforces reliability and clarity.' },
  ],
  aboutStories: [
    {
      title: 'Brand narrative',
      description:
        'Amanly is positioned as a reliable shopping environment with a polished visual voice instead of a generic app listing.',
      tone: 'clay' as const,
    },
    {
      title: 'Product clarity',
      description:
        'Reusable cards separate information into sections customers can scan quickly: hero, about, privacy, policy, and contact.',
      tone: 'sand' as const,
    },
    {
      title: 'Support confidence',
      description:
        'Visible service channels and direct policy summaries reduce hesitation and help customers trust the platform earlier.',
      tone: 'teal' as const,
    },
  ],
  highlights: [
    {
      eyebrow: 'Feature 01',
      title: 'Reusable layout blocks',
      description:
        'Section intros, metric cards, feature cards, policy cards, and contact cards are all now split into separate React components.',
      tone: 'sand' as const,
    },
    {
      eyebrow: 'Feature 02',
      title: 'Stronger visual theme',
      description:
        'The new theme uses layered surfaces, editorial typography, and warmer commerce colors to feel more intentional.',
      tone: 'clay' as const,
    },
    {
      eyebrow: 'Feature 03',
      title: 'Better content rhythm',
      description:
        'Each section opens with a consistent intro, then moves into well-framed cards that make long policy text easier to scan.',
      tone: 'teal' as const,
    },
    {
      eyebrow: 'Feature 04',
      title: 'Easy future expansion',
      description:
        'The component structure makes it straightforward to add testimonials, screenshots, download links, or FAQs later.',
      tone: 'sand' as const,
    },
  ],
  privacyItems: [
    {
      title: 'What we collect',
      points: [
        'Basic account details such as name, phone number, email address, shipping information, and support messages when customers provide them.',
        'Order history and account activity needed to manage purchases, support requests, and delivery follow-up.',
        'Limited technical information that helps with stability, security, abuse prevention, and service maintenance.',
      ],
    },
    {
      title: 'How data is used',
      points: [
        'To create accounts, process orders, coordinate delivery, and provide purchase-related updates.',
        'To answer support issues, protect the marketplace from misuse, and maintain service reliability.',
        'To send operational notifications and, where allowed, promotional communication.',
      ],
    },
    {
      title: 'Catalog and public product data',
      points: [
        'Amanly does not sell access to third-party platforms, subscriptions, or external digital services.',
        'Product names, packaging images, ingredient lists, brand references, and descriptive details may come from seller material, manufacturer packaging, or publicly available catalog information used to identify physical goods listed inside Amanly.',
        'Trademark and brand rights remain with their respective owners, and rights holders can contact support to request review, correction, or removal.',
      ],
    },
    {
      title: 'Customer choices and deletion',
      points: [
        'Customers can review and update profile details through account settings where available.',
        'Customers can request deletion inside the app from Profile > Delete Account after entering the current password.',
        'Privacy questions, data correction requests, and content ownership concerns can be sent directly to Amanly support.',
      ],
    },
  ],
  policyItems: [
    {
      title: 'Marketplace scope',
      points: [
        'Amanly is a marketplace for browsing product listings and managing orders for goods offered inside the Amanly service.',
        'The service does not resell access to third-party subscriptions, external apps, or off-platform digital services.',
        'Listings are shown to help customers identify products available through Amanly sellers and operations.',
      ],
    },
    {
      title: 'Orders and availability',
      points: [
        'Product listings remain subject to stock availability and seller participation.',
        'Orders are treated as confirmed after checkout information is completed and accepted.',
        'Cancellation is generally available within 24 hours if fulfillment has not already started.',
      ],
    },
    {
      title: 'Payments and confirmations',
      points: [
        'Accepted payment methods are shown during checkout and may vary by campaign or location.',
        'Customers receive confirmation once a purchase is successfully placed.',
        'Approved refunds are returned through the relevant original payment or wallet method where supported.',
      ],
    },
    {
      title: 'Shipping and returns',
      points: [
        'Estimated delivery timing is shared during checkout or through follow-up order communication.',
        'Order tracking updates are provided as shipment status changes.',
        'Eligible products may be returned within 30 days when unused and kept in original packaging.',
      ],
    },
    {
      title: 'Content and account conduct',
      points: [
        'Customers should understand that product reference material can include seller-provided details, packaging content, and public catalog information used to describe physical goods.',
        'Customers should provide accurate delivery, payment, and contact information.',
        'Fraud, abusive behavior, or repeated false ordering may lead to account restrictions.',
        'Support channels should be used early when disputes or policy questions appear.',
      ],
    },
  ],
  contactMethods: [
    {
      title: 'Email support',
      detail: 'support@aman-store.com',
      note: 'Customer care, privacy requests, and general service questions.',
      href: 'mailto:support@aman-store.com',
    },
    {
      title: 'Phone',
      detail: '+9647501234567',
      note: 'Direct assistance for urgent order and delivery follow-up.',
      href: 'tel:+9647501234567',
    },
    {
      title: 'WhatsApp',
      detail: '+9647501234567',
      note: 'Fast chat-based support for everyday order communication.',
      href: 'https://wa.me/9647501234567',
    },
    {
      title: 'Website',
      detail: 'aman-store.com',
      note: 'Brand updates, product-facing presence, and storefront visibility.',
      href: 'https://aman-store.com',
    },
  ],
}
