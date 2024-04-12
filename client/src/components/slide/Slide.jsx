import React from "react";
import "./Slide.scss";

const Slide = ({ children, slidesToShow }) => {
  return (
    <div className="slide">
      <div className="container">
        <div className="slider">
          {React.Children.map(children, (child, index) => (
            <div
              draggable="true"
              className={`slide-item ${index < slidesToShow ? "show" : ""}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Slide;
