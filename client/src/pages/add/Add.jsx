import React from "react";
import "./Add.scss";

const Add = () => {
  return (
    <div className="add">
      <div className="container">
        <h1>Add New Item</h1>
        <div className="sections">
          <div className="info">
            <label htmlFor="">Title</label>
            <input type="text" placeholder="Food Item" />
            <label htmlFor="">Category</label>
            <select name="cats" id="cats">
              <option value="north">North</option>
              <option value="south">South</option>
              <option value="pizza">Pizza</option>
              <option value="burger">Burger</option>
              <option value="cake">Cake</option>
              <option value="icecream">Ice Cream</option>
              <option value="sandwich">Sandwich</option>
              <option value="drinks">Drinks</option>
              <option value="choclate">Choclate</option>
            </select>
            <label htmlFor="">Cover Image</label>
            <input type="file" />
            <label htmlFor="">Upload Images</label>
            <input type="file" multiple />
            <label htmlFor="">Description</label>
            <textarea
              name=""
              id=""
              placeholder="Brief descriptions of food item"
              cols="0"
              rows="16"
            ></textarea>
            <button>Create</button>
          </div>
          <div className="details">
            {/* <label htmlFor="">Service Title</label>
            <input type="text" placeholder="e.g. One-page web design" /> */}
            <label htmlFor="">Short Description</label>
            <textarea
              name=""
              id=""
              placeholder="Short description of your service"
              cols="30"
              rows="10"
            ></textarea>
            <label htmlFor="">Delivery Time (e.g. 3 hours)</label>
            <input type="number" />
            <label htmlFor="">Add Features</label>
            <input type="text" placeholder="feature 1" />
            <input type="text" placeholder="feature 2" />
            <input type="text" placeholder="feature 3" />
            <input type="text" placeholder="feature 4" />
            <label htmlFor="">Price</label>
            <input type="number" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Add;
