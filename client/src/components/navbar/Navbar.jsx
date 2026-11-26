import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.scss';
import newRequest from '../../utils/newRequest';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import ThemeSwitcher from '../themeSwitcher/ThemeSwitcher';

function Navbar() {
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  const { pathname } = useLocation();

  const isActive = () => {
    window.scrollY > 0 ? setActive(true) : setActive(false);
  };

  useEffect(() => {
    window.addEventListener('scroll', isActive);
    return () => {
      window.removeEventListener('scroll', isActive);
    };
  }, []);

  const navigate = useNavigate();
  const { currentUser, logout } = useContext(AuthContext);
  const cart = useContext(CartContext);

  const handleLogout = async () => {
    try {
      await newRequest.post('/auth/logout');
      logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={active || pathname !== '/' ? 'navbar active' : 'navbar'}>
      <div className="container">
        <div className="logo">
          <Link className="link" to="/">
            <span className="text">Taste of Home</span>
          </Link>
        </div>
        <div className="links">
          <Link className="link" to="/">
            <span>Taste of Home</span>
          </Link>
          <Link className="link" to="/Items">
            Explore
          </Link>
          <ThemeSwitcher />
          <Link
            className="cartLink"
            to="/cart"
            aria-label={`Cart, ${cart.count} ${cart.count === 1 ? 'portion' : 'portions'}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
                <circle cx="9.5" cy="19.5" r="1.3" />
                <circle cx="17" cy="19.5" r="1.3" />
              </g>
            </svg>
            {cart.count > 0 && <span className="badge">{cart.count}</span>}
          </Link>
          {currentUser ? (
            <div className="user" onClick={() => setOpen(!open)}>
              <img src={currentUser.img || '/img/noavatar.jpg'} alt="" />
              <span>{currentUser?.username}</span>
              {open && (
                <div className="options">
                  {currentUser.isSeller && (
                    <>
                      <Link className="link" to="/myItems">
                        Items
                      </Link>
                      <Link className="link" to="/add">
                        Add New Item
                      </Link>
                    </>
                  )}
                  <Link className="link" to="/profile">
                    Profile
                  </Link>
                  <Link className="link" to="/orders">
                    Orders
                  </Link>
                  <Link className="link" to="/favourites">
                    Favourites
                  </Link>
                  <Link className="link" to="/messages">
                    Messages
                  </Link>
                  <Link className="link" onClick={handleLogout}>
                    Logout
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="link">
                Sign in
              </Link>
              <Link className="link" to="/register">
                <button>Join</button>
              </Link>
            </>
          )}
        </div>
      </div>
      {(active || pathname !== '/') && (
        <>
          <hr />
          <div className="menu">
            <Link className="link menuLink" to="/items?cat=north">
              North
            </Link>
            <Link className="link menuLink" to="/items?cat=south">
              South
            </Link>

            <Link className="link menuLink" to="/items?cat=pizza">
              Pizza
            </Link>
            <Link className="link menuLink" to="/items?cat=burger">
              Burger
            </Link>
            <Link className="link menuLink" to="/items?cat=cake">
              Cake
            </Link>
            <Link className="link menuLink" to="/items?cat=icecream">
              Ice Cream
            </Link>
            <Link className="link menuLink" to="/items?cat=sandwich">
              Sandwich
            </Link>
            <Link className="link menuLink" to="/items?cat=drinks">
              Drinks
            </Link>
            <Link className="link menuLink" to="/items?cat=chocolates">
              Chocolates
            </Link>
          </div>
          <hr />
        </>
      )}
    </div>
  );
}

export default Navbar;
