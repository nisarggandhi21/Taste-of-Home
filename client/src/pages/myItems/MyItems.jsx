import { useContext } from 'react';
import { Link } from 'react-router-dom';
import './MyItems.scss';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { itemService } from '../../services/itemService';
import { orderService } from '../../services/orderService';

function MyItems() {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ['myItems'],
    queryFn: () => itemService.getItems({ userId: currentUser._id, limit: 100 }),
  });

  const { data: summary } = useQuery({
    queryKey: ['orderSummary'],
    queryFn: () => orderService.getSummary(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['myItems'] });

  const remove = useMutation({
    mutationFn: (id) => itemService.deleteItem(id),
    onSuccess: refresh,
  });

  const availability = useMutation({
    mutationFn: ({ id, isAvailable }) => itemService.setAvailability(id, isAvailable),
    onSuccess: refresh,
  });

  const handleDelete = (item) => {
    if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) remove.mutate(item._id);
  };

  return (
    <div className="myitems">
      {isLoading ? (
        'loading'
      ) : error ? (
        'error'
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

          {summary && (
            <div className="summary">
              <div className="stat">
                <span className="label">Earned</span>
                <strong>&#8377; {summary.earned}</strong>
                <span className="detail">
                  {summary.delivered} order{summary.delivered === 1 ? '' : 's'} delivered
                </span>
              </div>
              <div className="stat">
                <span className="label">In progress</span>
                <strong>&#8377; {summary.inProgress}</strong>
                <span className="detail">
                  {summary.active} order{summary.active === 1 ? '' : 's'} to fulfil
                </span>
              </div>
              <div className="stat">
                <span className="label">Cancelled</span>
                <strong>{summary.cancelled}</strong>
                <span className="detail">refunded to buyers</span>
              </div>
              <div className="stat">
                <span className="label">Best seller</span>
                <strong>{summary.topItems[0]?.title || '—'}</strong>
                <span className="detail">
                  {summary.topItems[0]
                    ? `${summary.topItems[0].portions} portions sold`
                    : 'No sales yet'}
                </span>
              </div>
            </div>
          )}

          {data.items.length === 0 ? (
            <p className="empty">You have not added any items yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Sales</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const isAvailable = item.isAvailable !== false;
                  return (
                    <tr key={item._id}>
                      <td>
                        <img className="image" src={item.cover} alt="" />
                      </td>
                      <td>
                        <Link className="link" to={`/item/${item._id}`}>
                          {item.title}
                        </Link>
                      </td>
                      <td>&#8377; {item.price}</td>
                      <td>{item.sales}</td>
                      <td>
                        {item.takenDownAt ? (
                          <>
                            <span className="state takenDown">Taken down</span>
                            <div className="takenDownReason">
                              By Taste of Home: {item.takenDownReason}
                            </div>
                          </>
                        ) : (
                          <span className={isAvailable ? 'state available' : 'state paused'}>
                            {isAvailable ? 'Available' : 'Paused'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="toggle"
                            disabled={availability.isPending || !!item.takenDownAt}
                            title={
                              item.takenDownAt
                                ? 'Contact us to have this listing restored'
                                : undefined
                            }
                            onClick={() =>
                              availability.mutate({ id: item._id, isAvailable: !isAvailable })
                            }
                          >
                            {isAvailable ? 'Pause' : 'Resume'}
                          </button>
                          <Link className="edit" to={`/edit/${item._id}`}>
                            Edit
                          </Link>
                          <img
                            className="delete"
                            src="/img/delete.png"
                            alt="Delete"
                            onClick={() => handleDelete(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default MyItems;
