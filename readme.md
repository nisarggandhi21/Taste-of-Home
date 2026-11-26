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
