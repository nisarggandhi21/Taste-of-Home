import React from 'react';
import './Footer.scss';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <div className="footer">
      <div className="container">
        <div className="top">
          <div className="item">
            <h2>Categories</h2>
            <Link className="link" to="/items?cat=north">
              <span>North</span>
            </Link>
            <Link className="link" to="/items?cat=south">
              <span>South</span>
            </Link>
            <Link className="link" to="/items?cat=pizza">
              <span>Pizza</span>
            </Link>
            <Link className="link" to="/items?cat=burger">
              <span>Burger</span>
            </Link>
            <Link className="link" to="/items?cat=cake">
              <span>Cake</span>
            </Link>
            <Link className="link" to="/items?cat=icecream">
              <span>Ice Cream</span>
            </Link>
            <Link className="link" to="/items?cat=sandwich">
              <span>Sandwich</span>
            </Link>
            <Link className="link" to="/items?cat=drinks">
              <span>Drinks</span>
            </Link>
            <Link className="link" to="/items?cat=chocolates">
              <span>Chocolates</span>
            </Link>
          </div>
          <div className="item">
            <h2>About</h2>
            <span>Partnerships</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Investor Relations</span>
            <span>Contact Sales</span>
          </div>
          <div className="item">
            <h2>Support</h2>
            <span>Help & Support</span>
            <span>Trust & Safety</span>
            <span>Selling on Taste of Home</span>
            <span>Buying on Taste of Home</span>
          </div>
          <div className="item">
            <h2>Community</h2>
            <span>Customer Success Stories</span>
            <span>Community hub</span>
            <span>Forum</span>
            <span>Events</span>
            <span>Blog</span>
            <span>Influencers</span>
            <span>Affiliates</span>
            <span>Invite a Friend</span>
            <span>Become a Seller</span>
            <span>Community Standards</span>
          </div>
        </div>
        <hr />
        <div className="bottom">
          <div className="left">
            <h2>Taste of Home</h2>
            <span>© Taste of Home Ltd. {new Date().getFullYear()}</span>
          </div>
          <div className="right">
            <div className="social">
              <img src="/img/twitter.png" alt="" />
              <img src="/img/facebook.png" alt="" />
              <img src="/img/linkedin.png" alt="" />
              <img src="/img/pinterest.png" alt="" />
              <img src="/img/instagram.png" alt="" />
            </div>
            <div className="link">
              <img src="/img/language.png" alt="" />
              <span>English</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Footer;
