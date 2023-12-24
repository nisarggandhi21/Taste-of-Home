import React from "react";
import "./Featured.scss";

function Featured() {
  return (
    <div className="featured">
      <div className="container">
        <div className="left">
          <h1>
            Savor the perfection of homemade goodness with our{" "}
            <span>expert home cooks</span> – where every bite is a journey of
            flavor and warmth.
          </h1>
          <div className="search">
            <div className="searchInput">
              <img src="./img/search.png" alt="" />
              <input type="text" placeholder='Try "cake"' />
            </div>
            <button>Search</button>
          </div>
          <div className="popular">
            <span>Popular:</span>
            <button>North</button>
            <button>South</button>
            <button>Dessert</button>
            <button>Cake</button>
          </div>
        </div>
        <div className="right">
          <img src="../img/homemadefood.png" alt="" />
        </div>
      </div>
    </div>
  );
}

export default Featured;
