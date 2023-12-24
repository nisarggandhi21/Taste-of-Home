import React from "react";
import "./Home.scss";
import Featured from "../../components/featured/Featured";
import Slide from "../../components/slide/Slide";
import CatCard from "../../components/catCard/CatCard";
import ProjectCard from "../../components/projectCard/ProjectCard";
import { cards, projects } from "../../data";

function Home() {
  return (
    <div className="home">
      <Featured />
      <Slide slidesToShow={5} arrowsScroll={5}>
        {cards.map((card) => (
          <CatCard key={card.id} card={card} />
        ))}
      </Slide>
      <div className="features">
        <div className="container">
          <div className="item">
            <h1>Discover a World of Home-Cooked Delights</h1>
            <div className="title">
              <img src="./img/check.png" alt="" />
              The Best for Every Palate
            </div>
            <p>
              Explore a diverse range of home-cooked meals at various price
              points. Enjoy delicious food crafted with passion and care, all
              available with project-based pricing.
            </p>
            <div className="title">
              <img src="./img/check.png" alt="" />
              Quality Cuisine, Served Quickly
            </div>
            <p>
              Connect with talented home cooks who can start preparing your
              order within minutes. Experience quality meals crafted with
              expertise and speed.
            </p>
            <div className="title">
              <img src="./img/check.png" alt="" />
              Secure Transactions Every Time
            </div>
            <p>
              Rest assured with protected payments. Your payment is held until
              you approve the delightful home-cooked dishes delivered to your
              doorstep.
            </p>
            <div className="title">
              <img src="./img/check.png" alt="" />
              24/7 Support for Your Culinary Journey
            </div>
            <p>
              Enjoy round-the-clock support for any questions or assistance you
              may need. Your satisfaction is our priority as you embark on a
              culinary adventure.
            </p>
          </div>
          <div className="item">
            <video src="./img/video.mp4" controls />
          </div>
        </div>
      </div>
      <div className="explore">
        <div className="container">
          <h1>Explore the Market</h1>
          <div className="items">
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>North</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>

              <span>South</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Pizza</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Burger</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Cake</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Ice cream</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Sandwich</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Drinks</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Choclates</span>
            </div>
            <div className="item">
              <img
                src="https://cdn.iconscout.com/icon/premium/png-512-thumb/food-1680418-1427510.png"
                alt=""
              />
              <div className="line"></div>
              <span>Other</span>
            </div>
          </div>
        </div>
      </div>
      <div className="features dark">
        <div className="container">
          <div className="item">
            <h1>Taste of home</h1>
            <h1>
              An online solution crafted for <i>food enthusiasts</i>
            </h1>
            <p>
              Elevate your dining experience with a curated platform filled with
              tools and perks dedicated to food lovers.
            </p>
            <div className="title">
              <img src="./img/check.png" alt="" />
              Connect with passionate home cooks offering proven culinary
              expertise
            </div>

            <div className="title">
              <img src="./img/check.png" alt="" />
              Discover the perfect homemade dishes with assistance from our
              culinary experts
            </div>

            <div className="title">
              <img src="./img/check.png" alt="" />
              Manage your food orders seamlessly and enhance your culinary
              journey with a user-friendly platform
            </div>
            <button>Explore Home-Cooked Delights</button>
          </div>
          <div className="item">
            <img
              src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_1002,h_600/v1678428358/portal/m/seo_web/dweb_header.png"
              alt=""
            />
          </div>
        </div>
      </div>
      <Slide slidesToShow={4} arrowsScroll={4}>
        {projects.map((card) => (
          <ProjectCard key={card.id} card={card} />
        ))}
      </Slide>
    </div>
  );
}

export default Home;
