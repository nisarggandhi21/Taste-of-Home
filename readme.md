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
  into a search of the real menu. It can only read listings; it cannot order or change anything,
  and it only ever shows dishes that exist.
- **Smart search**: finds dishes by what they are ("comfort food for a cold") as well as by the
  words in their title, and still respects every filter.
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
  not to follow instructions inside it; the assistant has read-only tools, so the worst a
  hostile listing can do is earn a bad recommendation.
- Usage is controlled and recorded: a per-visitor hourly limit, a site-wide daily allowance,
  and one database row per model call (`npm run ai:usage` prints calls, failures, speed and
  tokens for the last week).
- Everything degrades quietly: without a key, or when the model is down, search falls back to
  keywords, saving a dish still works, and the AI parts of the page are hidden.

Commands (run in `api/`):

```bash
npm run ai:eval      # scores search, the assistant and summaries against the real model
```

```bash
npm run ai:reindex   # gives dishes created before AI was turned on a search vector
```

```bash
npm run ai:usage     # last week's model usage
```

Evaluation results (27 November 2026, `gemini-3.5-flash-lite` with `gemini-embedding-2`, free tier):

| Feature | Checks passed | Average time |
| --- | --- | --- |
| Smart search: a fitting dish in the top 3 for queries that share no words with its title | 10 / 10 | 0.3 s |
| Assistant: right filters, real prices, allergy handling, refusing off-topic and hidden instructions | 8 / 8 | 4.4 s |
| Review summary: reports praise and complaints, ignores an instruction hidden in a review | 4 / 4 | 1.0 s |

Model answers vary from run to run: across three runs, two scored 21 of 22 before the fixes
they pointed to (an assistant reply that came back empty, and one over-strict check) and the
last scored 22 of 22. Listing drafts were tried by hand on real food photos, and a photo of a
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
```

**Sessions and rate limits.** Logins last 7 days. Failed logins are limited to 10 per 15 minutes
and registrations to 10 per hour, per IP address. If the API runs behind a reverse proxy (Render,
Railway, nginx, ...), set `TRUST_PROXY=1` so the limit is applied per visitor instead of to the
proxy; on Vercel this is done automatically.

**Email.** Password reset and email confirmation send links by email over SMTP, which every
email provider offers. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` to
turn it on, and `CLIENT_URL` if the client is not the first entry of `CORS_ALLOWED_ORIGINS`.
Without these settings no email is sent: in development the message is printed in the API log
so the link can still be followed, and everything else keeps working. Confirming an email is
shown on the profile but is not required to use the site.

**Payments.** An order is only marked as paid after the API has checked the payment with Stripe.
To also cover buyers who close the tab before returning to the site, add a Stripe webhook for the
`payment_intent.succeeded` event pointing at `/api/orders/webhook` and set `STRIPE_WEBHOOK_SECRET`.

**Real-time chat.** Live message delivery uses Socket.IO and needs the API to run as a long-lived
server (Docker, Render, Railway, a VM, ...). On serverless hosting such as Vercel the chat still
works, but falls back to checking for new messages every few seconds.

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

---

## 📑 **API Routes**

- **`/api/auth`**: Authentication routes
- **`/api/users`**: User management
- **`/api/items`**: Food item operations
- **`/api/conversations`**: Messaging system
- **`/api/messages`**: Message management
- **`/api/orders`**: Order processing
- **`/api/reviews`**: Review system
