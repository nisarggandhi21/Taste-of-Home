import React from 'react';
import './Footer.scss';
import { Link } from 'react-router-dom';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { FOOTER_GROUPS, PAGES } from '../../pages/info/pages';

function Footer() {
  // Offered only where the browser can install the site as an app.
  const install = useInstallPrompt();

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
          {FOOTER_GROUPS.map((group) => (
            <div className="item" key={group.heading}>
              <h2>{group.heading}</h2>
              {group.slugs.map((slug) => (
                <Link className="link" to={`/${slug}`} key={slug}>
                  <span>{PAGES[slug].title}</span>
                </Link>
              ))}
              {group.heading === 'Company' && (
                <Link className="link" to="/register">
                  <span>Become a Seller</span>
                </Link>
              )}
            </div>
          ))}
        </div>
        <hr />
        <div className="bottom">
          <div className="left">
            <h2>Taste of Home</h2>
            <span>© Taste of Home Ltd. {new Date().getFullYear()}</span>
          </div>
          <div className="right">
            {install && (
              <button type="button" className="installApp" onClick={install}>
                Install the app
              </button>
            )}
            <span>Homemade food from cooks near you.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Footer;
