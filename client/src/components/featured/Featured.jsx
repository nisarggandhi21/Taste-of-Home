import React, { useState } from 'react';
import './Featured.scss';
import { useNavigate } from 'react-router-dom';
import { useAiEnabled } from '../../hooks/useAiEnabled';
import MicButton from '../micButton/MicButton';

function Featured() {
  const [input, setInput] = useState('');

  const navigate = useNavigate();
  const smartSearch = useAiEnabled();
  const search = (text) => navigate(`/items?search=${encodeURIComponent(text)}`);
  const handleSubmit = () => search(input);

  const handleCategoryClick = (cat) => {
    navigate(`/items?cat=${cat.toLowerCase()}`);
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
                placeholder={smartSearch ? 'Try "something light for dinner"' : 'Try "cake"'}
                value={input}
                aria-label="Search for food"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              {/* Speaking fills the box as it is heard and searches when done. */}
              <MicButton onText={setInput} onFinal={search} />
            </div>
            <button onClick={handleSubmit}>Search</button>
          </div>
          <div className="popular">
            <span>Popular:</span>
            <button onClick={() => handleCategoryClick('north')}>North</button>
            <button onClick={() => handleCategoryClick('south')}>South</button>
            <button onClick={() => handleCategoryClick('pizza')}>Pizza</button>
            <button onClick={() => handleCategoryClick('cake')}>Cake</button>
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
