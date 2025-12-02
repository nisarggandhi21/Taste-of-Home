import React, { useEffect, useRef, useState } from "react";
import "./Items.scss";

import ItemCard from "../../components/itemCard/ItemCard";
import { itemService } from "../../services/itemService";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

function Items() {
  const [sort, setSort] = useState("sales");
  const [open, setOpen] = useState(false);
  const minRef = useRef();
  const maxRef = useRef();

  const { search } = useLocation();

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: () => {
      // Construct the URL with query parameters
      let queryString = "";

      // Append the search parameter if it exists
      if (search) {
        queryString += `${search}&`;
      } else {
        queryString += `?`;
      }

      // Append other parameters
      queryString += `min=${minRef.current.value}&max=${maxRef.current.value}&sort=${sort}`;

      // Make the API request using the constructed URL
      return itemService.getItems(queryString);
    },
  });

  const reSort = (type) => {
    setSort(type);
    setOpen(false);
  };

  useEffect(() => {
    refetch();
  }, [sort]);

  const apply = () => {
    refetch();
  };

  return (
    <div className="items">
      <div className="container">
        {/* <span className="breadcrumbs">
          Taste of Home {">"} North {">"}
        </span> */}
        {/* <h1>North</h1> */}
        <p>Explore the Food</p>
        <div className="menu">
          <div className="left">
            <span>Budget</span>
            <input ref={minRef} type="number" placeholder="min" />
            <input ref={maxRef} type="number" placeholder="max" />
            <button onClick={apply}>Apply</button>
          </div>
          <div className="right">
            <span className="sortBy">Sort by</span>
            <span className="sortType">
              {sort === "sales" ? "Best Selling" : "Newest"}
            </span>
            <img src="./img/down.png" alt="" onClick={() => setOpen(!open)} />
            {open && (
              <div className="rightMenu">
                {sort === "sales" ? (
                  <span onClick={() => reSort("createdAt")}>Newest</span>
                ) : (
                  <span onClick={() => reSort("sales")}>Best Selling</span>
                )}
                <span onClick={() => reSort("sales")}>Popular</span>
              </div>
            )}
          </div>
        </div>
        <div className="cards">
          {isLoading
            ? "loading"
            : error
            ? "Something went wrong!"
            : data.map((item) => <ItemCard key={item._id} item={item} />)}
        </div>
      </div>
    </div>
  );
}

export default Items;
