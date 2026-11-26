import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HelmetProvider } from 'react-helmet-async';

import { AuthContextProvider } from './context/AuthContext';

import Add from './pages/add/Add';
import Favourites from './pages/favourites/Favourites';
import Home from './pages/home/Home';
import Item from './pages/item/Item';
import Items from './pages/items/Items';
import Login from './pages/login/Login';
import Message from './pages/message/Message';
import Messages from './pages/messages/Messages';
import MyItems from './pages/myItems/MyItems';
import NotFound from './pages/notFound/NotFound';
import Orders from './pages/orders/Orders';
import Pay from './pages/pay/Pay';
import Register from './pages/register/Register';
import Success from './pages/success/Success';

import Footer from './components/footer/Footer';
import RequireAuth from './components/requireAuth/RequireAuth';
import Navbar from './components/navbar/Navbar';

import './app.scss';
import './responsive.scss';

const queryClient = new QueryClient();

const needsLogin = (page) => <RequireAuth>{page}</RequireAuth>;
const needsSeller = (page) => <RequireAuth seller>{page}</RequireAuth>;

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthContextProvider>
          <BrowserRouter>
            <div className="app">
              <ToastContainer />
              <Navbar />
              <Routes>
                {/* Open to everyone */}
                <Route path="/" element={<Home />} />
                <Route path="/items" element={<Items />} />
                <Route path="/item/:id" element={<Item />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />

                {/* Need a login */}
                <Route path="/orders" element={needsLogin(<Orders />)} />
                <Route path="/messages" element={needsLogin(<Messages />)} />
                <Route path="/message/:id" element={needsLogin(<Message />)} />
                <Route path="/favourites" element={needsLogin(<Favourites />)} />
                <Route path="/pay/:id" element={needsLogin(<Pay />)} />
                <Route path="/success" element={needsLogin(<Success />)} />

                {/* Sellers only */}
                <Route path="/myitems" element={needsSeller(<MyItems />)} />
                <Route path="/add" element={needsSeller(<Add />)} />
                <Route path="/edit/:id" element={needsSeller(<Add />)} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthContextProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
