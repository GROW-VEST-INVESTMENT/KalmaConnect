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

## Partner rewards

Referrals can be recorded when a new Kalma account links an active partner code. Commission rewards are disabled by default. To enable the administrator's registration-reward controls, the backend operator must set `CONNECT_COMMISSION_POLICY_APPROVED=true` only after the commission policy has been formally approved. Deposit and savings commissions are not implemented.

Withdrawal requests are queued for staff review; staff should mark a request paid only after the payment has been completed and its reference is available. The first release does not initiate a Paystack transfer automatically.

Staff access to the management module is provisioned server-side by setting an existing account's `role` to `staff`, `admin`, or `super_admin`. Public registration never accepts a role.
