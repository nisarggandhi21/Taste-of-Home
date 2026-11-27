# 🌟 **Taste of Home** 🌟

A **full-stack web application** connecting **home cooks** with **food enthusiasts**, enabling the purchase and sale of **homemade food items**.

---

## 📌 **Features**

### 🔐 **User Authentication**

- **Register** as a consumer or seller
- **Login/logout** functionality
- Secure **JWT-based authentication**

### 🍽️ **Food Items Management**

- Browse food items by **categories** (e.g., North Indian, South Indian, Pizza, Burger, etc.)
- **Add new food items** (sellers only)
- **Upload item images**
- Set **prices** and **delivery times**
- **Manage food listings**

### 🔍 **Search & Filter**

- **Search** for food items
- **Filter** by category
- **Sort** by price or ratings

### ⭐ **Reviews & Ratings**

- **Rate food items** (1-5 stars)
- Write **detailed reviews**
- View **seller ratings**

### 💬 **Messaging System**

- **Real-time chat** between buyers and sellers
- **Message notifications**
- **Conversation tracking**

### 💳 **Orders & Payments**

- Secure **payment processing** with **Stripe**
- **Order tracking**
- **Order history**

---

### 🤖 **AI features**

Optional, and off unless the API has a `GEMINI_API_KEY` (a free key from Google AI Studio works):

- **Ordering assistant**: a chat helper that turns "something light and vegetarian under ₹150"
  into a search of the real menu, and only ever shows dishes that exist. Asked to "add two of
  those to my cart", it offers exactly that as a card with an **Add to cart** button: nothing
  is added until the visitor presses it. It cannot place an order, pay or change anything by
  itself.
- **Smart search**: finds dishes by what they are ("comfort food for a cold") as well as by the
  words in their title, and still respects every filter.
- **Hindi, Hinglish and voice**: search and the assistant understand "kuch meetha chahiye" and
  "कुछ मीठा चाहिए" although the menu is in English, and the assistant answers in the language
  and script it was asked in. A microphone button in the assistant and the home search box
  takes the question by voice, in English or Hindi, where the browser offers speech
  recognition (Chrome, Edge, Safari).
- **Listing from a photo**: a seller uploads a photo and gets a draft title, description,
  category, diet and allergens to review and edit.
- **What buyers say**: a short summary of a dish's reviews, written once there are three and
  rewritten only when a new review arrives.

How it is built (see `api/ai/`):

- One file (`gemini.js`) talks to the model provider; the features use three functions from it,
  so changing provider means rewriting that file only.
- Model output is never trusted: every answer is validated against a schema, the assistant's
  tool arguments go through the same validation as a visitor's request, and its dish cards are
  built from database records, never from what the model wrote.
- Listing and review text is written by the public, so the model is given it as data and told
  not to follow instructions inside it. The assistant's tools read; the one that acts only
  makes an offer, which the server checks against the database (the dish exists and is on
  sale, sensible quantities, one cook per cart) and the visitor has to confirm. So the worst a
  hostile listing can do is earn a bad recommendation or an offer nobody accepts.
- Usage is controlled and recorded: a per-visitor hourly limit, a site-wide daily allowance,
  and one database row per model call (`npm run ai:usage` prints calls, failures, speed and
  tokens for the last week).
- Everything degrades quietly: without a key, or when the model is down, search falls back to
  keywords, saving a dish still works, and the AI parts of the page are hidden.
- No setup step for an existing menu: dishes saved before the key was added get their search
  vector as people search, a few per search, so there is nothing to run after turning it on.

Commands (run in `api/`):

```bash
npm run ai:eval      # scores search, the assistant and summaries against the real model
```

```bash
npm run ai:reindex   # optional: indexes the whole menu at once instead of as people search
```

```bash
npm run ai:usage     # last week's model usage
```

Evaluation results (27 November 2026, `gemini-3.5-flash-lite` with `gemini-embedding-2`, free tier):

| Feature | Checks passed | Average time |
| --- | --- | --- |
| Smart search: a fitting dish in the top 3 for queries that share no words with its title | 10 / 10 | 0.3 s |
| Smart search in Hinglish and Hindi: the same kind of query, typed as people in India type it | 12 / 12 | 0.3 s |
| Assistant: right filters, real prices, allergy handling, refusing off-topic and hidden instructions; and the cart: offers exactly what was asked, never claims it is already added or paid, asks when unsure, ignores a listing that tells it to fill the cart | 13 / 13 | 5.3 s |
| Assistant in Hinglish and Hindi: understands the request (budget, diet, allergy, "do masala dosa" as two), answers in the same language, keeps dish titles as listed | 5 / 5 | 6.6 s |
| Review summary: reports praise and complaints, ignores an instruction hidden in a review | 4 / 4 | 1.0 s |

Model answers vary from run to run. The latest full run scored 44 of 44. Earlier runs found
real problems, each fixed in the assistant's code or instructions: a reply that came back
empty, and "do masala dosa" read as one dosa because "do" (two) is also an English word. Listing drafts were tried by hand on real food photos, and a photo of a
flower was correctly refused.

`gemini-3.5-flash-lite` is the default because it was the free model that answered reliably
when this was tested; set `AI_MODEL` to try another and re-run the evaluation to compare.

On Gemini's free tier, requests may be used by Google to improve its products; use a paid key
before sending real customers' data.

---

## ⚙️ **Tech Stack**

### 🖥️ **Frontend**

- **React**
- **React Router**
- **SASS** for styling
- **Axios** for API requests
- **React Query** for data fetching
- **Stripe Payment Integration** for secure transactions

### 🖧 **Backend**

- **Node.js** with **Express**
- **MongoDB** for database
- **JWT Authentication** for secure login
- **Bcrypt** for password encryption
- **Stripe API** for payment integration

---

## 🛠️ **Environment Setup**

### **Client** Environment Variables

```bash
VITE_BASEURL = http://localhost:8800/api/
VITE_SUCCESS_URL = http://localhost:5173/success
# Optional, default to the project's test accounts
VITE_STRIPE_PUBLISHABLE_KEY = [your-stripe-publishable-key]
VITE_CLOUDINARY_CLOUD_NAME = [your-cloudinary-cloud-name]
VITE_CLOUDINARY_UPLOAD_PRESET = [your-unsigned-upload-preset]
VITE_CONTACT_EMAIL = [your-contact-email]  # shown on the Contact, About and Privacy pages
```

**Image uploads.** Images go straight from the browser to Cloudinary. Set `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` on the **server** to use signed uploads: the API
signs each upload, the secret never reaches the browser, and Cloudinary itself refuses anything
that is not a JPG, PNG or WebP. You can then turn off unsigned uploads in the Cloudinary console.
Without those settings the client falls back to the unsigned upload preset below, where the
format and 5 MB size checks run only in the browser and can be bypassed.

### **Server** Environment Variables

```bash
MONGO = mongodb+srv://[username]:[password]@cluster
JWT_KEY = [your-jwt-secret]
STRIPE_SECRET_KEY = [your-stripe-secret]
STRIPE_WEBHOOK_SECRET = [your-stripe-webhook-secret]  # optional
CORS_URL=frontend.url
CORS_ALLOWED_ORIGINS=[url-path]
TRUST_PROXY=1  # optional, see below
GEMINI_API_KEY=[your-gemini-api-key]  # optional, turns on the AI features
ADMIN_EMAILS=[you@example.com]        # optional, accounts that may use the admin pages
```

**Database.** Requests wait until the database connection is ready, a failed connection is
tried again by the next request, and if the database cannot be reached within 8 seconds
(`DB_WAIT_MS`) the visitor gets a plain "please try again" instead of an internal error. With
MongoDB Atlas and serverless hosting such as Vercel, allow access from anywhere (`0.0.0.0/0`)
under Atlas → Network Access: the host's addresses change all the time, and a list of fixed
addresses makes connections fail at random.

**Sessions and rate limits.** Logins last 7 days. Failed logins are limited to 10 per 15 minutes
and registrations to 10 per hour, per IP address. If the API runs behind a reverse proxy (Render,
Railway, nginx, ...), set `TRUST_PROXY=1` so the limit is applied per visitor instead of to the
proxy; on Vercel this is done automatically.

**Email.** Password reset and email confirmation send links by email, and orders send emails
too: a receipt to the buyer and the order to the cook when it is paid, a note to the buyer each
time the cook moves it forward, and a note to both when it is cancelled and refunded. All of it
goes over SMTP, which every email provider offers. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS` and `MAIL_FROM` to turn it on, and `CLIENT_URL` if the client is not the first entry
of `CORS_ALLOWED_ORIGINS`.
Without these settings no email is sent: in development the message is printed in the API log
so the link can still be followed, and everything else keeps working. Confirming an email is
shown on the profile but is not required to use the site.

**Admin.** Accounts whose email address is listed in `ADMIN_EMAILS` (comma separated, written
exactly as on the account's profile page, capitals included) get an **Admin** entry in their
menu. From there an administrator can suspend an account (it is logged out at once and its
listings are hidden), take a single listing down, and refund any paid order in full. Each of
these needs a reason, which is emailed to the people affected and kept in an activity log.
Lifting a suspension or restoring a listing puts things back as they were. Create the account
first and then list its address; where email is set up, the address must also be confirmed.
The role cannot be granted from inside the site.

**Payments.** An order is only marked as paid after the API has checked the payment with Stripe.
To also cover buyers who close the tab before returning to the site, add a Stripe webhook for the
`payment_intent.succeeded` event pointing at `/api/orders/webhook` and set `STRIPE_WEBHOOK_SECRET`.

**Installable app.** The site can be installed on a phone or computer (an "Install the app"
button appears in the footer where the browser supports it) and then opens like an app, without
the browser's address bar. A service worker keeps the app itself on the device, together with
the public things a visitor has looked at: lists of dishes, dish pages, reviews, cooks and dish
photos. Those can be opened again without a connection, and a banner says when the device is
offline. Orders, messages and account details are never stored and always need a connection.
When a new version of the site has been deployed, visitors are offered a "Reload" button
instead of being reloaded in the middle of something. None of this is active while developing
(`npm run dev`); `npm run build && npm run preview` shows it.

**Search engines.** Every dish page describes itself in the vocabulary search engines use
(schema.org `Product`: name, picture, price, availability, cook and rating), which is what lets
a result show the price and stars. Pages give their canonical address, search-result pages and
private pages are kept out of the index, and `/robots.txt` (written when the client is built)
points at `/sitemap.xml`. The sitemap lists the public pages and every dish on sale; the API
generates it, and the client's host passes the request on (`client/vercel.json`, or
`client/nginx.conf` with Docker). If your API is at another address, change it in
`client/vercel.json`. The site's own address is taken from `VITE_SUCCESS_URL`, or from
`VITE_SITE_URL` if you set it.

**Real-time chat.** Each open chat page holds one long-lived request to the API (server-sent
events) and receives messages on it as they are sent; the conversations list updates the same
way. This is plain HTTP, so it works on serverless hosting such as Vercel as well as on a
long-lived server. There the request that saves a message and the request that delivers it can
run in different instances, so an instance with open connections also looks in the database for
new messages about once a second; on a single server delivery is immediate. Connections are
ended after 50 seconds on Vercel (5 minutes elsewhere, `LIVE_STREAM_SECONDS` to change it) and
the browser reconnects by itself. A tab in the background holds no connection, and if the
connection cannot be made at all the page falls back to checking for new messages every few
seconds.

---

## 🚀 **Getting Started**

1. **Clone the repository**:

   ```bash
   git clone https://github.com/nisarggandhi21/Taste-of-Home-Public.git
   ```

2. **Install dependencies**:
   - For **Backend**:

   ```bash
   cd api
   npm install
   ```

   - For **Frontend**:

   ```bash
   cd client
   npm install
   ```

3. **Start the servers**:
   - For **Backend** (restarts when files change; `npm start` runs it without that):

   ```bash
   npm run dev
   ```

   - For **Frontend**:

   ```bash
   npm run dev
   ```

4. Access the application at [http://localhost:5173](http://localhost:5173)

---

## 🐳 **Run with Docker**

`docker compose` starts the database, the API and the client as three production containers.

1. Create your Docker env file from the template and fill in your secrets (`JWT_KEY`,
   `STRIPE_SECRET_KEY`):

   ```bash
   cp .env.docker.example .env.docker
   ```

2. Build and start everything:

   ```bash
   docker compose --env-file .env.docker up --build
   ```

3. Open the app at [http://localhost:5173](http://localhost:5173). The API is at
   [http://localhost:8800](http://localhost:8800).

The client's settings (`VITE_...`) are baked in when its image is built, so rebuild after
changing them.

---

## ✅ **Tests**

No database, Stripe account or other service is needed: the tests start an in-memory MongoDB
and use a local stand-in for Stripe. They also run on every push through GitHub Actions.

- **API tests** (includes a check that the API loads the way Vercel runs it):

  ```bash
  cd api && npm test
  ```

- **Browser tests** (start the API and the client themselves; run `npm install` in `api`,
  `client` and `e2e` first, and `npx playwright install chromium` once):

  ```bash
  cd e2e && npm test
  ```

- **Installed-app tests** (build the client and check installing and offline use):

  ```bash
  cd e2e && npm run test:pwa
  ```

---

## 📑 **API Routes**

- **`/api/auth`**: Authentication routes
- **`/api/users`**: User management
- **`/api/items`**: Food item operations
- **`/api/conversations`**: Messaging system
- **`/api/messages`**: Message management
- **`/api/orders`**: Order processing
- **`/api/reviews`**: Review system
