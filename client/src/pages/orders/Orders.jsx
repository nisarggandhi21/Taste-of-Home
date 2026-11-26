import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Orders.scss';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';
import { orderService } from '../../services/orderService';
import { userService } from '../../services/userService';

const STATUS_LABELS = {
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// What the seller does next at each stage: [button label, status it moves the order to].
const NEXT_STEP = {
  placed: ['Accept order', 'accepted'],
  accepted: ['Start preparing', 'preparing'],
  preparing: ['Out for delivery', 'out_for_delivery'],
  out_for_delivery: ['Mark delivered', 'delivered'],
};

// Mirrors the API: the buyer can cancel until the seller accepts, the seller until it ships.
const CAN_CANCEL = {
  buyer: ['placed'],
  seller: ['placed', 'accepted', 'preparing'],
};

const OrderRow = ({ order, currentUser, onContact, onAdvance, onCancel, busy }) => {
  const role = order.sellerId === currentUser._id ? 'seller' : 'buyer';
  const otherUserId = role === 'seller' ? order.buyerId : order.sellerId;

  const { isLoading, error, data } = useQuery({
    queryKey: ['user', otherUserId],
    queryFn: () => userService.getUser(otherUserId),
    enabled: !!otherUserId,
  });

  const address = order.deliveryAddress;
  const nextStep = role === 'seller' && NEXT_STEP[order.status];
  const canCancel = CAN_CANCEL[role].includes(order.status);

  return (
    <tr>
      <td>
        <img className="image" src={order.img || '/img/noavatar.jpg'} alt="" />
      </td>
      <td>
        {order.title}
        {order.quantity > 1 && <span className="quantity"> &times; {order.quantity}</span>}
      </td>
      <td>&#8377; {order.price}</td>
      <td>{isLoading ? 'loading...' : error ? 'error' : data?.username}</td>
      <td className="address">
        {address ? (
          <>
            <strong>{address.name}</strong>, {address.phone}
            <br />
            {address.line1}, {address.city} {address.pincode}
            {address.notes && <em> ({address.notes})</em>}
          </>
        ) : (
          '—'
        )}
      </td>
      <td>{moment(order.createdAt).format('MMM Do YYYY, h:mm a')}</td>
      <td>
        <span className={`status ${order.status}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
        {order.status === 'cancelled' && (
          <div className="note">
            Refunded{order.cancelledBy ? ` · cancelled by ${order.cancelledBy}` : ''}
            {order.cancelReason && `: ${order.cancelReason}`}
          </div>
        )}
      </td>
      <td>
        <div className="actions">
          <img
            className="message"
            src="/img/message.png"
            alt="Message"
            onClick={() => onContact(order)}
          />
          {nextStep && (
            <button
              className="advance-btn"
              disabled={busy}
              onClick={() => onAdvance(order._id, nextStep[1])}
            >
              {nextStep[0]}
            </button>
          )}
          {canCancel && (
            <button className="cancel-btn" disabled={busy} onClick={() => onCancel(order, role)}>
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const Orders = () => {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { isLoading, error, data } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
    // Keeps the other side's progress visible without a manual refresh.
    refetchInterval: 15000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

  const advance = useMutation({
    mutationFn: ({ id, status }) => orderService.updateStatus(id, status),
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }) => orderService.cancelOrder(id, reason),
    onSettled: refresh,
  });

  const handleContact = async (order) => {
    try {
      // Returns the existing conversation with this person, or starts one.
      const conversation = await conversationService.createConversation({
        to: currentUser._id === order.sellerId ? order.buyerId : order.sellerId,
      });
      navigate(`/message/${conversation.id}`);
    } catch {
      // The request interceptor already shows the error.
    }
  };

  const handleCancel = (order, role) => {
    const question =
      role === 'seller'
        ? `Cancel this order for ${order.title}? The buyer is refunded in full.`
        : `Cancel your order for ${order.title}? You will be refunded in full.`;
    if (!window.confirm(question)) return;
    const reason =
      role === 'seller' ? window.prompt('Reason for the buyer (optional)') || undefined : undefined;
    cancel.mutate({ id: order._id, reason });
  };

  return (
    <div className="orders">
      {isLoading ? (
        'loading'
      ) : error ? (
        'error'
      ) : (
        <div className="container">
          <div className="title">
            <h1>Orders</h1>
          </div>
          {data.length === 0 ? (
            <p className="empty">No orders yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Item</th>
                  <th>Total</th>
                  <th>{currentUser.isSeller ? 'Buyer' : 'Seller'}</th>
                  <th>Deliver to</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    currentUser={currentUser}
                    onContact={handleContact}
                    onAdvance={(id, status) => advance.mutate({ id, status })}
                    onCancel={handleCancel}
                    busy={advance.isPending || cancel.isPending}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Orders;
