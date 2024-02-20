import React from "react";
import { Link } from "react-router-dom";
import "./Myitems.scss";
import newRequest from "../../utils/newRequest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function Myitems() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ["myItems"],
    queryFn: () =>
      newRequest.get(`/items?userId=${currentUser._id}`).then((res) => {
        return res.data;
      }),
  });

  const mutation = useMutation({
    mutationFn: (id) => {
      return newRequest.delete(`/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myItems"]);
    },
  });

  const handleDelete = (id) => {
    mutation.mutate(id);
  };

  return (
    <div className="myitems">
      {isLoading ? (
        "loading"
      ) : error ? (
        "error"
      ) : (
        <div className="container">
          <div className="title">
            <h1>Items</h1>
            {currentUser.isSeller && (
              <Link to="/add">
                <button>Add New Item</button>
              </Link>
            )}
          </div>
          <table>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>Sales</th>
              <th>Action</th>
            </tr>
            {data.map((item) => (
              <tr key={item._id}>
                <td>
                  <img className="image" src={item.cover} alt="" />
                </td>
                <td>{item.title}</td>
                <td>{item.price}</td>
                <td>{item.sales}</td>
                <td>
                  <img
                    className="delete"
                    src="./img/delete.png"
                    alt=""
                    onClick={() => handleDelete(item._id)}
                  />
                </td>
              </tr>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

export default Myitems;
