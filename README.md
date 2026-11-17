# Kalma Connect

Kalma Connect is the separate talent and partner portal for Kalma Capital. It uses the existing Kalma Capital account and backend; it does not connect to MongoDB directly from the browser.

## Local development

1. Start the Kalma Capital backend with its existing environment and database configured.
2. Set `CONNECT_APP_URL=http://localhost:5173` in the backend environment.
3. From this repository, run `npm install` once and `npm run dev`.
4. Visit the Vite URL and create or sign in to a Kalma Capital account.

The app uses `http://localhost:5000` for API calls during local development by default. Override this with `VITE_API_URL` if the backend is hosted elsewhere.

## Deploying to Vercel

- Import this repository as a separate Vercel project. The Vite build command is `npm run build`; the output directory is `dist`.
- `vercel.json` sends `/api/*` through the same-origin proxy to `https://gwic-backend.onrender.com`, which keeps the HTTP-only session cookie on the portal's origin.
- Set the production Connect deployment URL as `CONNECT_APP_URL` on the backend, and allow it in the backend CORS configuration. Do not put database credentials or the JWT secret in Vercel's `VITE_*` variables.
- The Connect backend routes must be deployed before the portal can complete applications, referrals, or withdrawals. A frontend Vercel deployment alone does not deploy the backend.

## Account registration

Kalma Connect uses Kalma Capital accounts for applicant and partner access. Partner promo codes are not entered or claimed in Connect: customers enter a code during Kalma Capital web/mobile signup, and partner invite links open the customer signup page with `?ref=CODE`.

## Opportunity and application experience

The authenticated Opportunities feed supports saving opportunities, one reaction per user (Interested, Love this, Exciting, or Great opportunity), capacity progress, and a three-step application flow with an optional private CV/document upload. Applicants can track each submission through the Applications section, receive status and message notifications, and use the Inbox for private threads tied to their applications. The inbox loads history over HTTPS; it does not require Socket.IO.

The backend must be deployed with the Connect communication routes and indexes before reactions, inbox threads, or message notifications are available. Application messages are limited to 2,000 characters and visible only to the applicant and authorized Connect staff.

## Partner rewards

Referrals are recorded when a new Kalma Capital account is created with an active partner code. The reward schedule is ₦40 for signup, ₦60 for approved KYC, ₦200 for the first successful wallet deposit after KYC and within 60 days of signup, and ₦100 for two successful wallet deposits on separate UTC dates after KYC within those 60 days. Deposit rewards are invalidated when a qualifying deposit is refunded or reversed. The active-saver milestone measures wallet deposits, not recurring savings-plan contributions. Each reward remains pending for administrator review, and withdrawals are manual. Rewards are disabled by default; the backend operator must set `CONNECT_COMMISSION_POLICY_APPROVED=true` only after formal compliance approval and authorized rollout.

Withdrawal requests are queued for staff review; staff should mark a request paid only after the payment has been completed and its reference is available. The first release does not initiate a Paystack transfer automatically.

Staff access to the management module is provisioned server-side by setting an existing account's `role` to `staff`, `admin`, or `super_admin`. Public registration never accepts a role.
