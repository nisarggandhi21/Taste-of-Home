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

      <div className="features dark">
        <div className="container">
          <div className="item">
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
