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
```

**Image uploads.** Images go straight from the browser to Cloudinary through an unsigned upload
preset. The client only accepts JPG, PNG and WebP up to 5 MB, but that check can be bypassed, so
set the same limits (allowed formats, max file size) on the preset in the Cloudinary console.

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
   - For **Backend**:

   ```bash
   npm start
   ```

   - For **Frontend**:

   ```bash
   npm run dev
   ```

4. Access the application at [http://localhost:5173](http://localhost:5173)

---

## 🐳 **Run with Docker**

1. Create your Docker env file from the template:

   ```bash
   cp .env.docker.example .env.docker
   ```

2. Update `.env.docker` with your real secrets (`MONGO`, `JWT_KEY`, `STRIPE_SECRET_KEY`).

3. Build the image:

   ```bash
   docker build -t taste-of-home .
   ```

4. Run the container with env values:

   ```bash
   docker run --rm -it -p 8800:8800 -p 5173:5173 --env-file .env.docker taste-of-home
   ```

5. Open the app at [http://localhost:5173](http://localhost:5173)

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
