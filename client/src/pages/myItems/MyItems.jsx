import React, { useContext } from "react";
import { Link } from "react-router-dom";
import "./MyItems.scss";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/AuthContext";
import { itemService } from "../../services/itemService";

function MyItems() {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ["myItems"],
    queryFn: () => itemService.getItems(`?userId=${currentUser._id}`),
  });

  const mutation = useMutation({
    mutationFn: (id) => {
      return itemService.deleteItem(id);
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

export default MyItems;
