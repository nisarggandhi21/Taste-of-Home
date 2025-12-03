import React, { useState } from 'react';
import './Featured.scss';
import { useNavigate } from 'react-router-dom';

function Featured() {
  const [input, setInput] = useState('');

  const navigate = useNavigate();
  const handleSubmit = () => {
    navigate(`/items?search=${input}`);
  };
  return (
    <div className="featured">
      <div className="container">
        <div className="left">
          <h1>
            Savor the perfection of homemade goodness with our <span>expert home cooks</span> –
            where every bite is a journey of flavor and warmth.
          </h1>
          <div className="search">
            <div className="searchInput">
              <img src="./img/search.png" alt="" />
              <input
                type="text"
                placeholder='Try "cake"'
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <button onClick={handleSubmit}>Search</button>
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
