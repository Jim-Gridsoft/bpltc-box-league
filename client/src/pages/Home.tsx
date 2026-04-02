/**
 * DESIGN: Refined British Club Aesthetic
 * Palette: Warm cream (#faf6ee), Deep green (#1b4332), Gold (#c9a84c)
 * Fonts: Cormorant Garamond (headings), Source Sans 3 (body), Space Grotesk (labels)
 * Layout: Single-column editorial, brand cards in responsive grid
 */

import { useEffect, useRef } from "react";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663452042921/PTKxsipnFcy6SZgTVAYLQb/hero-tennis-outdoor-oWEr8SbabGmtb2VpKRiobm.webp";

// ─── Data ────────────────────────────────────────────────────────────────────

const brandContacts = [
  {
    category: "Soft Drinks & Mixers",
    brand: "Coca-Cola Europacific Partners (CCEP)",
    offerings:
      "Branded parasols, outdoor seating and tables. CCEP supplies a wide range of hospitality venues across the UK.",
    contact: "ccep.com/gb/contact-us",
    url: "https://www.cocacolaep.com/gb/contact-us/",
    tip: "Speak to a local CCEP sales representative and ask specifically about their on-trade outdoor furniture programme.",
  },
  {
    category: "Soft Drinks & Mixers",
    brand: "Fever-Tree",
    offerings:
      "Premium branded parasols and outdoor seating. Fever-Tree has a strong association with tennis, having title-sponsored the Queen's Club Championships.",
    contact: "fever-tree.com",
    url: "https://www.fever-tree.com/en_GB",
    tip: "Leverage the tennis connection — Fever-Tree is the natural choice for a tennis club sponsorship pitch.",
  },
  {
    category: "Beer & Cider",
    brand: "Heineken UK",
    offerings:
      "High-quality branded parasols and outdoor furniture. Heineken is well-known for supporting the UK pub and club trade with outdoor assets.",
    contact: "heineken.co.uk — Free Trade: 0345 878 7071",
    url: "https://www.heineken.co.uk/contact-us",
    tip: "Contact the Star Pubs & Bars team or the Free Trade line. Furniture is typically tied to a pouring agreement.",
  },
  {
    category: "Beer & Cider",
    brand: "Carlsberg Marston's Brewing Company",
    offerings:
      "Branded outdoor furniture and parasols for licensed venues. CMBC has a track record of partnering with UK sports clubs.",
    contact: "carlsbergmarstons.co.uk — +44 (0) 3457 585 685",
    url: "https://www.carlsbergmarstons.co.uk/contact/",
    tip: "Ask about their community sports club partnership programme when you call.",
  },
  {
    category: "Beer & Cider",
    brand: "Kopparberg / Rekorderlig",
    offerings:
      "Premium branded garden furniture and large parasols. Both brands are popular in UK outdoor hospitality venues.",
    contact: "Via your current drinks wholesaler",
    url: "https://www.kopparberg.co.uk",
    tip: "Approach through your existing drinks wholesaler — they can facilitate the introduction to the brand's trade team.",
  },
  {
    category: "Soft Drinks & Mixers",
    brand: "Schweppes (via CCEP)",
    offerings:
      "Schweppes is the Official Mixer of the LTA's summer grass court events, making it an ideal tennis-aligned partner for branded outdoor furniture.",
    contact: "Via Coca-Cola Europacific Partners GB",
    url: "https://www.cocacolaep.com/gb/contact-us/",
    tip: "Mention the LTA partnership when approaching — it demonstrates alignment with their existing tennis marketing strategy.",
  },
];

const grantSources = [
  {
    org: "LTA Tennis Foundation",
    amount: "Variable — recent rounds have awarded up to £1.6m across 22 organisations",
    eligibility: "Grassroots tennis clubs across Great Britain, with a focus on diverse and underserved communities",
    contact: "info@ltatennisfoundation.org.uk",
    url: "https://www.lta.org.uk/what-we-do/lta-tennis-foundation/grant-making-framework/",
  },
  {
    org: "LTA Facility Loan Scheme",
    amount: "Loans at 5% fixed rate, with discretionary 50% interest subsidy available",
    eligibility: "Tennis venues delivering projects that grow participation",
    contact: "lta.org.uk/roles-and-venues/venues/tennis-facility-funding-advice/",
    url: "https://www.lta.org.uk/roles-and-venues/venues/tennis-facility-funding-advice/facility-loan-scheme/",
  },
  {
    org: "Sport England — Movement Fund",
    amount: "Up to £15,000 in crowdfunding pledges and grants",
    eligibility: "Community projects encouraging active lifestyles; outdoor social spaces that support participation qualify",
    contact: "sportengland.org/funding-and-campaigns/our-funding/movement-fund",
    url: "https://www.sportengland.org/funding-and-campaigns/our-funding/movement-fund",
  },
  {
    org: "National Lottery Awards for All England",
    amount: "£300 to £20,000 for up to 2 years",
    eligibility: "Projects that bring people together and improve communities; tennis club facility improvements are eligible",
    contact: "tnlcommunityfund.org.uk",
    url: "https://www.tnlcommunityfund.org.uk/funding/funding-programmes/national-lottery-awards-for-all-england/",
  },
];

const actionSteps = [
  {
    num: "01",
    title: "Audit Your Bar Suppliers",
    body: "Review the brands currently stocked in your club's bar or social area. Contact the sales representatives for these brands — especially Heineken, Coca-Cola Europacific Partners, or premium cider brands — and request branded parasols or outdoor seating as part of your ongoing supply agreement. This is the fastest route to free, high-quality furniture.",
  },
  {
    num: "02",
    title: "Survey Your Membership",
    body: "Ask club members if they or their employers would be interested in sponsoring outdoor furniture in exchange for branding rights. The LTA advises that members often have workplace contacts who may be prepared to discuss sponsorship — this is frequently the first and most productive step.",
  },
  {
    num: "03",
    title: "Draft a Sponsorship Proposal",
    body: "Create a concise, professional document outlining the cost of the furniture, the branding opportunities available (logo on parasols, website, newsletter, social media), and the demographic profile of your membership. Target local businesses such as estate agents, solicitors, car dealerships, and restaurants. Multiple smaller sponsors can be as effective as one large one.",
  },
  {
    num: "04",
    title: "Apply for Grant Funding",
    body: "Check eligibility for the LTA Tennis Foundation, Sport England Movement Fund, and National Lottery Awards for All. Framing the outdoor space upgrade as a community facility improvement — supporting social interaction and member retention — strengthens any application.",
  },
];

// ─── Intersection observer hook ──────────────────────────────────────────────

function useFadeUp(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-8">
      <span
        className="label-tag shrink-0"
        style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {num}
      </span>
      <h2
        className="text-3xl md:text-4xl font-semibold"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function BrandCard({ item }: { item: (typeof brandContacts)[0] }) {
  const ref = useFadeUp();
  return (
    <div
      ref={ref}
      className="fade-up rounded-lg p-6 flex flex-col gap-3 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: "#fff",
        borderColor: "var(--cream-dark)",
        borderTopWidth: "3px",
        borderTopColor: "var(--green-mid)",
      }}
    >
      <div>
        <span
          className="label-tag"
          style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {item.category}
        </span>
        <h3
          className="text-xl font-semibold mt-1"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
        >
          {item.brand}
        </h3>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
        {item.offerings}
      </p>
      <div
        className="rounded p-3 text-sm"
        style={{ background: "var(--cream)", color: "var(--charcoal)" }}
      >
        <span className="font-semibold" style={{ color: "var(--green-deep)" }}>
          Tip:{" "}
        </span>
        {item.tip}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="label-tag mt-auto inline-flex items-center gap-1 transition-colors"
        style={{
          color: "var(--green-mid)",
          fontFamily: "'Space Grotesk', sans-serif",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--green-mid)")}
      >
        {item.contact}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </div>
  );
}

function GrantRow({ item }: { item: (typeof grantSources)[0] }) {
  return (
    <tr
      className="border-b transition-colors"
      style={{ borderColor: "var(--cream-dark)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td className="py-4 pr-4 align-top">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-base transition-colors"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "var(--green-deep)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--green-deep)")}
        >
          {item.org}
        </a>
      </td>
      <td className="py-4 pr-4 align-top text-sm" style={{ color: "var(--charcoal-mid)" }}>
        {item.amount}
      </td>
      <td className="py-4 align-top text-sm hidden md:table-cell" style={{ color: "var(--charcoal-mid)" }}>
        {item.eligibility}
      </td>
    </tr>
  );
}

function ActionStep({ item, delay }: { item: (typeof actionSteps)[0]; delay: number }) {
  const ref = useFadeUp([delay]);
  return (
    <div
      ref={ref}
      className="fade-up flex gap-6"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="shrink-0 text-5xl font-bold leading-none select-none"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          color: "var(--gold-light)",
          width: "3rem",
        }}
      >
        {item.num}
      </div>
      <div>
        <h3
          className="text-xl font-semibold mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
        >
          {item.title}
        </h3>
        <p className="text-base leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
          {item.body}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const heroRef = useFadeUp();
  const introRef = useFadeUp();
  const brandsRef = useFadeUp();
  const localRef = useFadeUp();
  const grantsRef = useFadeUp();
  const actionRef = useFadeUp();

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>

      {/* ── Sticky Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(250,246,238,0.92)",
          backdropFilter: "blur(8px)",
          borderColor: "var(--cream-dark)",
        }}
      >
        <div className="container flex items-center justify-between h-14">
          <span
            className="font-semibold text-base"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Tennis Club Sponsorship Guide
          </span>
          <div className="hidden md:flex items-center gap-6">
            {[
              ["#brands", "Drinks Brands"],
              ["#local", "Local Sponsors"],
              ["#grants", "Grants"],
              ["#action", "Action Plan"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="label-tag transition-colors"
                style={{
                  color: "var(--charcoal-mid)",
                  textDecoration: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--green-deep)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--charcoal-mid)")}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative overflow-hidden" style={{ minHeight: "520px" }}>
        <img
          src={HERO_IMAGE}
          alt="British tennis club outdoor terrace with branded parasols"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Gradient overlay — left side dark for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(27,67,50,0.88) 0%, rgba(27,67,50,0.65) 45%, rgba(27,67,50,0.15) 100%)",
          }}
        />
        <div className="relative container flex flex-col justify-end pb-16 pt-24">
          <div ref={heroRef} className="fade-up max-w-xl">
            <span
              className="label-tag mb-3 inline-block"
              style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              UK Tennis Clubs — Practical Guide
            </span>
            <h1
              className="text-5xl md:text-6xl font-bold mb-4 leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf6ee" }}
            >
              Securing Sponsored Outdoor Furniture
            </h1>
            <p
              className="text-lg md:text-xl leading-relaxed"
              style={{ color: "rgba(250,246,238,0.85)", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 300 }}
            >
              A practical guide to obtaining free or heavily subsidised outdoor seating and
              umbrellas for your tennis club — through drinks brands, local sponsorship, and
              national grant funding.
            </p>
          </div>
        </div>
      </header>

      {/* ── Introduction ── */}
      <section className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container max-w-3xl">
          <div ref={introRef} className="fade-up">
            <p
              className="text-xl md:text-2xl leading-relaxed mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "var(--charcoal)",
                fontStyle: "italic",
              }}
            >
              Over £1 billion per year is invested in UK sport through sponsorship. Tennis clubs
              present an attractive proposition for brands seeking to reach an engaged, affluent
              community demographic — and the right approach can yield free, high-quality outdoor
              furniture at no cost to the club.
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
              This guide covers three complementary routes: approaching national drinks brands that
              routinely provide branded outdoor furniture as part of on-trade agreements; building a
              local business sponsorship programme; and accessing grant funding from the LTA, Sport
              England, and the National Lottery. Used together, these strategies give your club the
              best possible chance of upgrading its outdoor space at minimal cost.
            </p>
          </div>
        </div>
      </section>

      {/* ── Drinks Brands ── */}
      <section id="brands" className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container">
          <div ref={brandsRef} className="fade-up mb-10">
            <SectionHeader num="01" title="National Drinks Brands" />
            <p className="max-w-3xl text-base leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
              The most reliable source of free outdoor furniture and parasols for sports clubs in the
              UK comes from major drinks brands. These companies frequently provide branded parasols,
              tables, and seating as part of their on-trade marketing strategies, provided the club
              stocks their products in its bar or clubhouse. The provision of furniture is typically
              tied to a pouring rights agreement or a commitment to stock a certain volume of the
              brand's products.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {brandContacts.map((item) => (
              <BrandCard key={item.brand} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Local Business Sponsorship ── */}
      <section
        id="local"
        className="py-16 border-b"
        style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="container max-w-3xl">
          <div ref={localRef} className="fade-up">
            <div className="flex items-baseline gap-4 mb-8">
              <span
                className="label-tag shrink-0"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                02
              </span>
              <h2
                className="text-3xl md:text-4xl font-semibold"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
              >
                Approaching Local Businesses
              </h2>
            </div>
            <p
              className="text-lg leading-relaxed mb-6"
              style={{ color: "rgba(250,246,238,0.85)" }}
            >
              If national drinks brands are not a viable option, approaching local businesses is the
              next best strategy. The LTA advises that clubs should start by surveying their own
              members, as many will have workplace contacts or own local businesses that might be
              interested in sponsorship.
            </p>
            <p className="text-base leading-relaxed mb-8" style={{ color: "rgba(250,246,238,0.7)" }}>
              When approaching local companies — such as estate agents, solicitors, car dealerships,
              or restaurants — present a professional sponsorship proposal. For outdoor furniture,
              the package could involve printing the sponsor's logo on the new umbrellas or seating.
              In return for covering the cost, the business gains prominent, year-round visibility in
              a high-footfall community area.
            </p>
            {/* Pull quote */}
            <blockquote
              className="border-l-4 pl-6 py-2"
              style={{ borderColor: "var(--gold)" }}
            >
              <p
                className="text-xl italic"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
              >
                "It is often easier to secure smaller amounts from multiple local businesses than a
                large sum from a single sponsor — consider offering individual table or umbrella
                sponsorships."
              </p>
              <footer
                className="label-tag mt-3"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                — LTA Club Sponsorship Advice
              </footer>
            </blockquote>

            <div className="mt-10 rounded-lg p-6" style={{ background: "rgba(255,255,255,0.08)" }}>
              <h3
                className="text-xl font-semibold mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
              >
                What to Include in Your Sponsorship Proposal
              </h3>
              <ul className="space-y-3">
                {[
                  "A brief background on the tennis club and its membership size",
                  "An outline of the club's future direction and growth plans",
                  "The specific sponsorship opportunity — cost of furniture and branding placement",
                  "The potential benefit to the sponsor (audience reach, demographic profile, visibility)",
                  "The proposed next action — a meeting, site visit, or follow-up call",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: "var(--gold)", color: "var(--green-deep)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm" style={{ color: "rgba(250,246,238,0.8)" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grants ── */}
      <section id="grants" className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container">
          <div ref={grantsRef} className="fade-up mb-10">
            <SectionHeader num="03" title="Grant & Funding Opportunities" />
            <p className="max-w-3xl text-base leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
              In addition to commercial sponsorship, several grant and funding avenues are available
              to UK tennis clubs looking to improve their outdoor facilities. Upgrading a club's
              outdoor social space can be framed as a vital improvement to community facilities,
              helping to retain members and encourage social interaction around physical activity.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--cream-dark)" }}>
            <table className="w-full text-sm" style={{ background: "#fff" }}>
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "var(--cream-dark)", background: "var(--cream)" }}
                >
                  <th
                    className="text-left py-3 px-4 label-tag"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Organisation
                  </th>
                  <th
                    className="text-left py-3 px-4 label-tag"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Amount Available
                  </th>
                  <th
                    className="text-left py-3 px-4 label-tag hidden md:table-cell"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Eligibility
                  </th>
                </tr>
              </thead>
              <tbody>
                {grantSources.map((item) => (
                  <GrantRow key={item.org} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Action Plan ── */}
      <section id="action" className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container max-w-3xl">
          <div ref={actionRef} className="fade-up mb-10">
            <SectionHeader num="04" title="Recommended Action Plan" />
            <p className="text-base leading-relaxed" style={{ color: "var(--charcoal-mid)" }}>
              By combining direct requests to current suppliers with targeted local sponsorship and
              community grants, your tennis club can significantly upgrade its outdoor space at
              minimal cost to the club's reserves. Follow these steps in order for the best results.
            </p>
          </div>
          <div className="flex flex-col gap-10">
            {actionSteps.map((step, i) => (
              <ActionStep key={step.num} item={step} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10 border-t"
        style={{ borderColor: "var(--cream-dark)", background: "var(--cream-dark)" }}
      >
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p
              className="font-semibold"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              Tennis Club Outdoor Furniture Sponsorship Guide
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)" }}>
              Researched and compiled for UK tennis clubs. Information correct as of April 2026.
            </p>
          </div>
          <div className="flex gap-4 text-xs" style={{ color: "var(--charcoal-mid)" }}>
            <a
              href="https://www.lta.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--green-deep)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--charcoal-mid)")}
            >
              LTA
            </a>
            <a
              href="https://www.sportengland.org"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--green-deep)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--charcoal-mid)")}
            >
              Sport England
            </a>
            <a
              href="https://www.tnlcommunityfund.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--green-deep)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--charcoal-mid)")}
            >
              National Lottery
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
