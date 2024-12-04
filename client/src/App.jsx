import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Home from "./pages/home/Home";
import Items from "./pages/items/Items";
import Item from "./pages/item/Item";
import Login from "./pages/login/Login";
import Register from "./pages/register/";
import Add from "./pages/add/Add";
import Orders from "./pages/orders/Orders";
import Messages from "./pages/messages/Messages";
import Message from "./pages/message/Message";
import MyItems from "./pages/myItems/MyItems";
import Pay from "./pages/pay/Pay";
import Success from "./pages/success/Success";

import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer";

import "./app.scss";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app">
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
    </QueryClientProvider>
  );
};

export default App;
