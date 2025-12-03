import React, { useState } from 'react';
import './Slide.scss';

const Slide = ({ children, slidesToShow }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex < React.Children.count(children) - slidesToShow ? prevIndex + 1 : prevIndex
    );
  };

  return (
    <div className="slide">
      <div className="container">
        <button className="nav-button prev" onClick={handlePrev}>
          &lt;
        </button>
        <div className="slider">
          {React.Children.map(children, (child, index) => (
            <div
              key={index}
              draggable="true"
              className={`slide-item ${index < slidesToShow ? 'show' : ''}`}
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {child}
            </div>
          ))}
        </div>
        <button className="nav-button next" onClick={handleNext}>
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Slide;
