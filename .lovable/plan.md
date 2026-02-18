
## Internal CRM — Full Build Plan

### 1. Design System & Layout Shell
- Dark left sidebar with collapsible sections, country filter pills (ES / DE / FR / IT / UK), and role-aware nav links
- Top blue header bar with user avatar, active country badge, and logout
- Light main content area
- Responsive: sidebar collapses to icon-only on smaller screens

---

### 2. Database Schema & Migrations
Full SQL migration covering:
- **Enums**: `app_role` (admin, seller, agent), `hold_status`, `deal_status`, `country_code`
- **Tables**: `profiles`, `user_roles`, `user_countries`, `products`, `product_blocked_agents`, `holds`, `deals`, `commission_overrides`, `commission_credits`
- **DB Functions (server-enforced)**:
  - `create_hold` — enforces daily_limit, total_qty, sale window, cooldown, race-condition-safe
  - `extend_hold` — +5 min, one-time, only if < 1 min remains
  - `convert_hold_to_deal` — atomically converts hold + creates deal row
  - `expire_stale_holds` — run via cron or trigger
  - `enforce_cooldown` — 5-min block after expiry
- **Views**: `admin_sales_metrics` (sales per day + per country)
- **RLS Policies**: agents see only own rows; sellers see own products + related deals; admins see all (using `has_role` security-definer pattern — no recursive RLS)
- **Storage**: private `screenshots` bucket with RLS; signed URL access only

---

### 3. Auth & Registration
- `/login` — email/password login
- `/register` — single form: name, email, password, telegram_username, paypal, payment_details, about, recommendations, desired_countries (multi-select)
- On signup: status = `pending`, role = agent or seller (user choice)
- `/pending` — holding page shown until admin approval
- Auth state listener + protected route wrapper (redirects based on status + role)

---

### 4. Admin: User Management (`/admin/users`)
- Table of all registered users with status (pending / approved / blocked)
- Approve / Block actions (server-side via Edge Function using Service Role Key)
- Assign working countries (multi-select, editable anytime)
- Promote user to admin
- Admin seed/promotion SQL script provided

---

### 5. Products (`/products`, `/products/[id]`)
- **Create flow**: Enter Amazon URL → server-side Edge Function attempts scrape (`/api/amazon/preview`) → auto-fills title, ASIN, country, price, image
- If extraction fails → manual fields shown; saving always allowed
- Fields: title, ASIN, amazon_url, marketplace country, price (EUR), total_qty, daily_limit, start_date, end_date, commission_eur, main_image (upload to storage)
- Blocked agents: admin/seller can select agents to block per product
- **"Publish to Telegram"** button → Edge Function POSTs product card to Telegram channel via Bot API (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`)
- Paginated DataTable with image thumbnail, availability status, limit info, Reserve/Book action buttons
- Agents don't see products blocked for them (RLS enforced)

---

### 6. Holds / Bookings (`/holds`)
- Agent view: list of own active/expired holds with countdown timer (live, client-side)
- Actions per hold:
  - **Sell / Insert Order** (opens deal submission form)
  - **Extend** (+5 min, shown only if < 1 min remains and not yet extended)
  - **Cancel**
- All hold mutations go through Edge Functions (race-condition safe DB functions)
- Hold statuses shown with color badges: active (green), expired (grey), converted (blue), cancelled (red)

---

### 7. Deal / Sale Workflow
- **Step 1 — Submit order** (from hold): agent fills amazon_profile_url, customer_paypal, customer_name, customer_telegram, uploads order_screenshot (private storage) → deal status = `sold_submitted`
- **Step 2 — Upload review**: agent uploads review_link + review_screenshot → status = `review_uploaded`
- **Admin review**: approve / reject deal
- **Admin**: set `paid_to_client` → then `completed` → commission credit created

---

### 8. Deals List (`/deals`)
- Agent: own deals with status indicators and upload review action
- Admin: all deals, filter by status/country/agent, action buttons to advance status
- Seller: deals on own products

---

### 9. Commissions
- Default: `product.commission_eur` per unit
- Override table: per (agent, product) — admin-managed
- Commission credited only on `paid_to_client` / `completed`
- Admin view: totals by agent, exportable

---

### 10. Dashboards (role-based at `/dashboard`)
**Admin tiles**:
- Total deals, Deals awaiting review, Deals completed, Total commissions paid
- Sales per day (bar chart via Recharts), Sales per country (table)

**Agent tiles**:
- Active holds, Deals by status, Total commission earned

**Seller tiles**:
- My products count, Sales on my products, Blocked agents count

---

### 11. Seller Area (`/seller`)
- My Products list with edit, block-agent management, and Publish-to-Telegram
- My Deals (sales on own products)

---

### 12. Edge Functions (server-side, Service Role Key never exposed to client)
- `amazon-preview` — scrape product data from Amazon URL
- `create-hold` — enforces all limit rules atomically
- `extend-hold` — one-time extension logic
- `convert-hold` — hold → deal conversion
- `upload-screenshot` — presigned upload or proxy upload to private bucket
- `get-signed-url` — returns signed URL for viewing private files
- `admin-actions` — approve/block users, assign countries, update deal status, set paid/completed
- `telegram-publish` — posts product info to Telegram channel

---

### 13. Security Checklist
- Service Role Key only in Edge Functions via `Deno.env`
- All hold/deal mutations server-side
- RLS on every table
- `has_role` security-definer function (no recursive RLS)
- Roles stored in separate `user_roles` table (not on profiles)
- Signed URLs for all private file access
- Input validation with Zod on all forms
