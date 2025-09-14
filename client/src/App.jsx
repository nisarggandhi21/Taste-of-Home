import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthContextProvider } from "./context/AuthContext";

import Add from "./pages/add/Add";
import Home from "./pages/home/Home";
import Item from "./pages/item/Item";
import Items from "./pages/items/Items";
import Login from "./pages/login/Login";
import Message from "./pages/message/Message";
import Messages from "./pages/messages/Messages";
import MyItems from "./pages/myItems/MyItems";
import Orders from "./pages/orders/Orders";
import Pay from "./pages/pay/Pay";
import Register from "./pages/register/Register";
import Success from "./pages/success/Success";

import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";

import "./app.scss";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <BrowserRouter>
          <div className="app">
            <ToastContainer />
            <Navbar />
            <Routes>
              {/* Main routes within layout */}
              <Route path="/" element={<Home />} />
              <Route path="/items" element={<Items />} />
              <Route path="/myitems" element={<MyItems />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/message/:id" element={<Message />} />
              <Route path="/add" element={<Add />} />
              <Route path="/item/:id" element={<Item />} />
              <Route path="/pay/:id" element={<Pay />} />
              <Route path="/success" element={<Success />} />

              {/* Authentication routes */}
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthContextProvider>
    </QueryClientProvider>
  );
};

export default App;
