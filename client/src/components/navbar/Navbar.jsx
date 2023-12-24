import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.scss";
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  const { pathname } = useLocation();

  const isActive = () => {
    window.scrollY > 0 ? setActive(true) : setActive(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", isActive);
    return () => {
      window.removeEventListener("scroll", isActive);
    };
  }, []);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await newRequest.post("/auth/logout");
      localStorage.setItem("currentUser", null);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={active || pathname !== "/" ? "navbar active" : "navbar"}>
      <div className="container">
        <div className="logo">
          <Link className="link" to="/">
            <span className="text">Taste of Home</span>
          </Link>
        </div>
        <div className="links">
          <span>Taste of Home</span>
          <span>Explore</span>
          <span>English</span>
          {!currentUser?.isSeller && <span>Become a Seller</span>}
          {currentUser ? (
            <div className="user" onClick={() => setOpen(!open)}>
              <img src={currentUser.img || "/img/noavatar.jpg"} alt="" />
              <span>{currentUser?.username}</span>
              {open && (
                <div className="options">
                  {currentUser.isSeller && (
                    <>
                      {/* <Link className="link" to="/myitems">
                        Items
                      </Link> */}
                      <Link className="link" to="/add">
                        Add New Item
                      </Link>
                    </>
                  )}
                  {/* <Link className="link" to="/orders">
                    Orders
                  </Link>
                  <Link className="link" to="/messages">
                    Messages
                  </Link> */}
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
      {(active || pathname !== "/") && (
        <>
          <hr />
          <div className="menu">
            <Link className="link menuLink" to="/">
              North
            </Link>
            <Link className="link menuLink" to="/">
              South
            </Link>
            <Link className="link menuLink" to="/">
              Pizza
            </Link>
            <Link className="link menuLink" to="/">
              Burger
            </Link>
            <Link className="link menuLink" to="/">
              Cake
            </Link>
            <Link className="link menuLink" to="/">
              Ice Cream
            </Link>
            <Link className="link menuLink" to="/">
              Sandwich
            </Link>
            <Link className="link menuLink" to="/">
              Drinks
            </Link>
            <Link className="link menuLink" to="/">
              Choclates
            </Link>
          </div>
          <hr />
        </>
      )}
    </div>
  );
}

export default Navbar;
