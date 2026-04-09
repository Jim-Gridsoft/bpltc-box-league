import TournamentNav from "@/components/TournamentNav";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold mb-8"
          style={{ color: "var(--green-deep)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div
          className="rounded-2xl shadow-sm border p-8 md:p-12"
          style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
        >
          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--charcoal-mid)" }}>
            Last updated: April 2026
          </p>

          <div className="prose prose-sm max-w-none space-y-6" style={{ color: "var(--charcoal)" }}>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                1. Who We Are
              </h2>
              <p className="leading-relaxed">
                This privacy policy applies to the <strong>BPLTC Doubles Box League</strong> web application
                ("the App"), operated by <strong>Bramhall Park Lawn Tennis Club</strong> ("BPLTC", "we", "us", "our"),
                located in Bramhall, Stockport, UK. We are the data controller responsible for your personal data.
              </p>
              <p className="leading-relaxed mt-2">
                If you have any questions about this policy or how we handle your data, please contact us via the
                {" "}<Link href="/contact-admin" className="underline font-semibold" style={{ color: "var(--green-deep)" }}>Contact Admin</Link>{" "}
                page within the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                2. What Personal Data We Collect
              </h2>
              <p className="leading-relaxed mb-3">We collect and store the following personal data when you use the App:</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "var(--cream)" }}>
                    <th className="text-left p-2 border font-semibold" style={{ borderColor: "var(--cream-dark)" }}>Data</th>
                    <th className="text-left p-2 border font-semibold" style={{ borderColor: "var(--cream-dark)" }}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Full name", "Displayed on leaderboards and match results"],
                    ["Email address", "Account login, password reset emails, and admin notifications"],
                    ["Password (hashed)", "Secure account authentication — we never store plain-text passwords"],
                    ["Phone number (optional)", "Shared with your box-mates to arrange matches, only if you opt in"],
                    ["Match results and scores", "Calculating league standings and year-long accumulator points"],
                    ["Payment records", "Confirming your season entry fee has been paid (processed by Stripe)"],
                  ].map(([data, purpose]) => (
                    <tr key={data}>
                      <td className="p-2 border align-top font-medium" style={{ borderColor: "var(--cream-dark)" }}>{data}</td>
                      <td className="p-2 border align-top" style={{ borderColor: "var(--cream-dark)" }}>{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                3. Legal Basis for Processing
              </h2>
              <p className="leading-relaxed">
                We process your personal data on the following legal bases under UK GDPR:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Contract performance</strong> — to administer your membership of the box league competition.</li>
                <li><strong>Legitimate interests</strong> — to operate and improve the App, and to communicate with you about the competition.</li>
                <li><strong>Consent</strong> — for optional features such as sharing your phone number with box-mates (you can withdraw consent at any time in your Settings).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                4. How We Share Your Data
              </h2>
              <p className="leading-relaxed">
                We do not sell your personal data. We share data only in the following limited circumstances:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Other box members</strong> — your name, match results, and (if you opt in) phone number are visible to other players in your box.</li>
                <li><strong>Stripe</strong> — your payment is processed by Stripe, Inc. We share only the information necessary to process your entry fee. Stripe's privacy policy is available at <a href="https://stripe.com/gb/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--green-deep)" }}>stripe.com/gb/privacy</a>.</li>
                <li><strong>Resend</strong> — transactional emails (e.g. password reset) are sent via Resend. Your email address is transmitted to Resend solely for the purpose of delivering these emails.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                5. Data Retention
              </h2>
              <p className="leading-relaxed">
                We retain your account and match data for as long as you have an active account with us, and for up to
                2 years thereafter for the purpose of maintaining historical league records. Payment records are retained
                for 7 years to comply with financial record-keeping requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                6. Your Rights
              </h2>
              <p className="leading-relaxed mb-2">
                Under UK GDPR, you have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Right of access</strong> — you can request a copy of the data we hold about you.</li>
                <li><strong>Right to rectification</strong> — you can update your name, email, and phone number in your <Link href="/settings" className="underline" style={{ color: "var(--green-deep)" }}>Settings</Link> at any time.</li>
                <li><strong>Right to erasure</strong> — you can request deletion of your account and personal data by contacting us via the <Link href="/contact-admin" className="underline" style={{ color: "var(--green-deep)" }}>Contact Admin</Link> page.</li>
                <li><strong>Right to restrict processing</strong> — you can ask us to limit how we use your data.</li>
                <li><strong>Right to object</strong> — you can object to processing based on legitimate interests.</li>
                <li><strong>Right to data portability</strong> — you can request your data in a machine-readable format.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                To exercise any of these rights, please contact us via the{" "}
                <Link href="/contact-admin" className="underline font-semibold" style={{ color: "var(--green-deep)" }}>Contact Admin</Link>{" "}
                page. We will respond within 30 days. You also have the right to lodge a complaint with the
                {" "}<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--green-deep)" }}>Information Commissioner's Office (ICO)</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                7. Security
              </h2>
              <p className="leading-relaxed">
                We take reasonable technical and organisational measures to protect your data. All data is transmitted
                over HTTPS. Passwords are hashed using bcrypt and are never stored in plain text. Access to the database
                is restricted to the application server and authorised administrators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                8. Cookies
              </h2>
              <p className="leading-relaxed">
                The App uses a single, strictly necessary HTTP-only session cookie to keep you signed in. This cookie
                does not track you across other websites and is not used for advertising purposes. No third-party
                tracking or analytics cookies are used.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                9. Changes to This Policy
              </h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. Any significant changes will be communicated
                to registered members. The date at the top of this page indicates when the policy was last revised.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
