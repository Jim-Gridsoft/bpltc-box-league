# BPLTC Box League: Pre-Launch Readiness Assessment

This document provides a comprehensive pre-launch readiness review of the BPLTC Box League application, evaluating its suitability for a rollout to approximately 300 members. The assessment covers security, scalability, user experience, and operational readiness, highlighting both strengths and areas of concern.

## 1. Security and Data Protection

The application handles personal data (names, emails, phone numbers) and financial transactions, making security a primary concern.

**Strengths:**
- **Authentication:** The application uses secure, HTTP-only, SameSite=Lax cookies for session management, protecting against cross-site scripting (XSS) and cross-site request forgery (CSRF) attacks. Passwords are securely hashed using bcrypt with a work factor of 12.
- **Payments:** Payment processing is entirely offloaded to Stripe Checkout. The application never touches or stores raw credit card data, ensuring PCI compliance. The webhook integration correctly verifies Stripe signatures before marking entrants as paid.
- **Access Control:** The tRPC backend correctly implements `protectedProcedure` and `adminProcedure` middleware, ensuring that only authenticated users can access sensitive data and only administrators can perform destructive actions.

**Concerns & Recommendations:**
- **Open Registration:** Currently, anyone with the URL can register an account. There is no email verification step or admin approval required before an account is created. While they must pay to join a season, malicious actors could flood the database with fake accounts.
  * **Recommendation:** Implement email verification during sign-up, or restrict registration to a pre-approved list of member emails.
- **GDPR / Right to Erasure:** The application stores personal data but lacks an automated way for users to delete their accounts or request data erasure, which is a requirement under UK GDPR.
  * **Recommendation:** Add a "Delete Account" option in the new Settings page that anonymizes or removes the user's data, or provide clear instructions on how to request deletion from an administrator.
- **Missing Privacy Policy:** There is no Privacy Policy or Terms of Service page explaining how member data (especially phone numbers) will be used and stored.
  * **Recommendation:** Create a simple Privacy Policy page and link it from the footer and registration form.

## 2. Scalability and Infrastructure

The application is hosted on Heroku using a Basic web dyno and a JawsDB Kitefin MySQL database.

**Strengths:**
- **Stateless Architecture:** The Node.js/Express backend is stateless (sessions are JWT-based), meaning it can easily scale horizontally by adding more Heroku dynos if traffic spikes.
- **Efficient Queries:** The Drizzle ORM implementation uses efficient SQL queries. The application does not suffer from N+1 query problems, and the database schema is well-indexed.

**Concerns & Recommendations:**
- **Database Connection Limits:** The JawsDB Kitefin plan has a strict limit of 10 concurrent connections. With 300 users potentially logging in to check boxes or report scores simultaneously (e.g., on a Sunday evening), the application may exhaust this connection pool, leading to `Too many connections` errors.
  * **Recommendation:** Upgrade the JawsDB plan to a tier with a higher connection limit (e.g., Leopard or higher) before launch, or implement a connection pooler like PgBouncer (though native to Postgres, similar solutions exist for MySQL) or configure Drizzle/mysql2 to strictly limit its connection pool size to 9.
- **Heroku Dyno Sleep:** If the application is on an Eco or Hobby dyno, it will sleep after 30 minutes of inactivity, causing a 10-15 second delay for the next user. (The current configuration appears to be a Basic dyno, which does not sleep, but this should be verified).
  * **Recommendation:** Ensure the Heroku web dyno is set to at least the "Basic" tier ($7/mo) to prevent sleeping and ensure immediate responsiveness.

## 3. User Experience and Operations

The application must be intuitive for members of varying technical abilities and manageable for the volunteer administrators.

**Strengths:**
- **Mobile Responsiveness:** The UI is built with Tailwind CSS and is fully responsive. The Dashboard, Leaderboards, and Score Entry forms work well on mobile devices, which is crucial as players will likely report scores from their phones at the courts.
- **Automated Workflows:** The integration of Stripe for automated payment tracking and the sophisticated fixture generation algorithm significantly reduce the administrative burden.

**Concerns & Recommendations:**
- **Score Dispute Resolution:** As noted in the fairness assessment, scores are applied immediately upon submission by one player. If a typo occurs, the opponent must notice it and file a dispute. The administrator then has to manually intervene. With 300 players, this could generate significant admin overhead.
  * **Recommendation:** Implement a "Pending Confirmation" state for match results, where the opponent must click "Confirm" before the points are applied to the leaderboard.
- **Password Reset Flow:** There is currently no "Forgot Password" functionality. If any of the 300 members forget their password, they will be permanently locked out, and administrators have no UI tool to send a reset link.
  * **Recommendation:** Implement a standard password reset flow using email (e.g., via SendGrid or Resend) before launch. This is the single biggest operational risk for a smooth rollout.
- **Email Notifications:** The system currently notifies the administrator when someone pays, but it does not notify players when they are added to a box, when a match is reported against them, or when a new season starts.
  * **Recommendation:** Integrate an email service to send automated transactional emails to players to keep engagement high.

## Conclusion

The BPLTC Box League application is functionally complete and technically sound. The core mechanics—registration, payment, box generation, and scoring—work flawlessly. 

However, **it is not yet ready for a 300-person rollout** due to two critical missing features:
1. **No "Forgot Password" flow:** This will cause immediate operational headaches for administrators.
2. **Database Connection Limits:** The current JawsDB Kitefin plan (10 connections) will likely crash under the load of 300 active users.

**Immediate Pre-Launch Action Plan:**
1. Upgrade the JawsDB database plan to support at least 50 concurrent connections.
2. Implement a "Forgot Password" email flow.
3. Add a basic Privacy Policy page.
4. (Optional but highly recommended) Implement email verification on sign-up to prevent spam accounts.
