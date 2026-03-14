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
```

### **Server** Environment Variables

```bash
MONGO = mongodb+srv://[username]:[password]@cluster
JWT_KEY = [your-jwt-secret]
STRIPE_SECRET_KEY = [your-stripe-secret]
CORS_URL=frontend.url
CORS_ALLOWED_ORIGINS=[url-path]
```

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

## 📑 **API Routes**

- **`/api/auth`**: Authentication routes
- **`/api/users`**: User management
- **`/api/items`**: Food item operations
- **`/api/conversations`**: Messaging system
- **`/api/messages`**: Message management
- **`/api/orders`**: Order processing
- **`/api/reviews`**: Review system
