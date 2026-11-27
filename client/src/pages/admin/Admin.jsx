import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminService } from '../../services/adminService';
import './Admin.scss';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'listings', label: 'Listings' },
  { id: 'orders', label: 'Orders' },
  { id: 'activity', label: 'Activity' },
];

const ACTION_LABELS = {
  suspend_user: 'Suspended',
  unsuspend_user: 'Lifted the suspension of',
  take_down_item: 'Took down',
  restore_item: 'Restored',
  refund_order: 'Refunded',
};

const ORDER_STATES = [
  ['', 'Any status'],
  ['placed', 'Placed'],
  ['accepted', 'Accepted'],
  ['preparing', 'Preparing'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
];

const rupees = (amount) => `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;
const day = (date) => moment(date).format('D MMM YYYY');

// Asks for the reason every takedown, suspension and refund has to carry.
const ReasonDialog = ({ request, busy, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const field = useRef(null);

  useEffect(() => {
    field.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = reason.trim().length >= 3;

  return (
    <div className="adminDialogBackdrop" onClick={onClose}>
      <form
        className="adminDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminDialogTitle"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onConfirm(reason.trim());
        }}
      >
        <h2 id="adminDialogTitle">{request.title}</h2>
        <p>{request.detail}</p>
        <label htmlFor="adminReason">Reason</label>
        <textarea
          id="adminReason"
          ref={field}
          rows="3"
          maxLength="300"
          placeholder={request.placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="note">{request.note}</p>
        <div className="buttons">
          <button type="button" className="quiet" onClick={onClose}>
            Keep as it is
          </button>
          <button type="submit" className="danger" disabled={!ready || busy}>
            {busy ? 'Working…' : request.confirm}
          </button>
        </div>
      </form>
    </div>
  );
};

// Search box, optional filter and pager around one of the lists.
const useList = (key, fetcher) => {
  const [search, setSearch] = useState('');
  const [typed, setTyped] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const params = { search: search || undefined, state: state || undefined, page };

  const query = useQuery({
    queryKey: ['admin', key, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    typed,
    setTyped,
    state,
    page,
    setPage,
    setState: (value) => {
      setState(value);
      setPage(1);
    },
    submit: (e) => {
      e.preventDefault();
      setSearch(typed.trim());
      setPage(1);
    },
  };
};

const Toolbar = ({ list, placeholder, states }) => (
  <form className="toolbar" onSubmit={list.submit}>
    <input
      type="search"
      aria-label="Search"
      placeholder={placeholder}
      value={list.typed}
      onChange={(e) => list.setTyped(e.target.value)}
    />
    {states && (
      <select
        aria-label="Filter"
        value={list.state}
        onChange={(e) => list.setState(e.target.value)}
      >
        {states.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    )}
    <button type="submit">Search</button>
  </form>
);

const Pager = ({ list }) =>
  list.data?.pages > 1 ? (
    <div className="pager">
      <button disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
        Previous
      </button>
      <span>
        Page {list.data.page} of {list.data.pages}
      </span>
      <button disabled={list.page >= list.data.pages} onClick={() => list.setPage(list.page + 1)}>
        Next
      </button>
    </div>
  ) : null;

const ListBody = ({ list, empty, children }) => {
  if (list.isLoading) return <p className="status">Loading…</p>;
  if (list.error) return <p className="status">Could not load this list.</p>;
  if (list.data.rows.length === 0) return <p className="status">{empty}</p>;
  return (
    <>
      <p className="count">
        {list.data.total} {list.data.total === 1 ? 'result' : 'results'}
      </p>
      <div className="tableWrap">{children}</div>
      <Pager list={list} />
    </>
  );
};

const Overview = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminService.getOverview,
  });
  if (isLoading) return <p className="status">Loading…</p>;
  if (error) return <p className="status">Could not load the overview.</p>;

  const tiles = [
    ['Users', data.users, `${data.sellers} cooks`],
    ['Suspended', data.suspended, 'accounts'],
    ['Listings on sale', data.listings, `${data.takenDown} taken down`],
    ['Open orders', data.orders.open, `${data.orders.delivered} delivered`],
    ['Paid by buyers', rupees(data.orders.paid), 'orders not refunded'],
    ['Refunded', rupees(data.orders.refunded), `${data.orders.cancelled} cancelled orders`],
  ];

  return (
    <>
      <div className="tiles">
        {tiles.map(([label, value, detail]) => (
          <div className="tile" key={label}>
            <span className="label">{label}</span>
            <strong>{value}</strong>
            <span className="detail">{detail}</span>
          </div>
        ))}
      </div>
      <h2>Latest admin activity</h2>
      {data.recent.length === 0 ? (
        <p className="status">Nothing has been done yet.</p>
      ) : (
        <ActionList actions={data.recent} />
      )}
    </>
  );
};

const ActionList = ({ actions }) => (
  <ul className="actionList">
    {actions.map((action) => (
      <li key={action._id}>
        <div>
          <strong>{action.adminName}</strong> {ACTION_LABELS[action.action]?.toLowerCase()}{' '}
          <strong>{action.targetLabel}</strong>
          {action.reason && <span className="reason"> — {action.reason}</span>}
        </div>
        <time dateTime={action.createdAt}>{moment(action.createdAt).fromNow()}</time>
      </li>
    ))}
  </ul>
);

const Users = ({ act, busy }) => {
  const list = useList('users', adminService.getUsers);
  return (
    <>
      <Toolbar
        list={list}
        placeholder="Username or email"
        states={[
          ['', 'Everyone'],
          ['sellers', 'Cooks'],
          ['suspended', 'Suspended'],
        ]}
      />
      <ListBody list={list} empty="No users match.">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Listings</th>
              <th>Open orders</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.rows.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.isAdmin ? 'Admin' : user.isSeller ? 'Cook' : 'Buyer'}</td>
                <td>{user.listings}</td>
                <td>{user.openOrders}</td>
                <td>{day(user.createdAt)}</td>
                <td>
                  {user.suspendedAt ? (
                    <span className="badge bad" title={user.suspendReason}>
                      Suspended
                    </span>
                  ) : (
                    <span className="badge good">Active</span>
                  )}
                  {user.suspendedAt && <div className="why">{user.suspendReason}</div>}
                </td>
                <td>
                  {user.isAdmin ? (
                    '—'
                  ) : user.suspendedAt ? (
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() => act.run(() => adminService.unsuspendUser(user._id))}
                    >
                      Lift suspension
                    </button>
                  ) : (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() =>
                        act.ask({
                          title: `Suspend ${user.username}?`,
                          detail:
                            'They are logged out at once, cannot log in again, and their listings are hidden.' +
                            (user.openOrders
                              ? ` They still have ${user.openOrders} open order${user.openOrders === 1 ? '' : 's'}: refund those from the Orders tab if they will not be delivered.`
                              : ''),
                          placeholder: 'e.g. Repeated complaints about food safety',
                          note: 'The reason is emailed to them and shown when they try to log in.',
                          confirm: 'Suspend account',
                          action: (reason) => adminService.suspendUser(user._id, reason),
                        })
                      }
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListBody>
    </>
  );
};

const Listings = ({ act, busy }) => {
  const list = useList('items', adminService.getItems);
  return (
    <>
      <Toolbar
        list={list}
        placeholder="Dish title"
        states={[
          ['', 'All listings'],
          ['taken_down', 'Taken down'],
        ]}
      />
      <ListBody list={list} empty="No listings match.">
        <table>
          <thead>
            <tr>
              <th>Dish</th>
              <th>Cook</th>
              <th>Price</th>
              <th>Sold</th>
              <th>Added</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.rows.map((item) => (
              <tr key={item._id}>
                <td>
                  <Link className="dish" to={`/item/${item._id}`}>
                    <img src={item.cover} alt="" />
                    {item.title}
                  </Link>
                </td>
                <td>{item.seller}</td>
                <td>{rupees(item.price)}</td>
                <td>{item.sales}</td>
                <td>{day(item.createdAt)}</td>
                <td>
                  {item.takenDownAt ? (
                    <>
                      <span className="badge bad">Taken down</span>
                      <div className="why">{item.takenDownReason}</div>
                    </>
                  ) : item.isAvailable ? (
                    <span className="badge good">On sale</span>
                  ) : (
                    <span className="badge">Paused</span>
                  )}
                </td>
                <td>
                  {item.takenDownAt ? (
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() => act.run(() => adminService.restoreItem(item._id))}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() =>
                        act.ask({
                          title: `Take down “${item.title}”?`,
                          detail:
                            'Buyers will no longer see or be able to order it, and the cook cannot put it back until you restore it.',
                          placeholder: 'e.g. The photo is not of the dish',
                          note: 'The reason is emailed to the cook and shown on their listings page.',
                          confirm: 'Take down listing',
                          action: (reason) => adminService.takeDownItem(item._id, reason),
                        })
                      }
                    >
                      Take down
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListBody>
    </>
  );
};

const Orders = ({ act, busy }) => {
  const list = useList('orders', adminService.getOrders);
  return (
    <>
      <Toolbar list={list} placeholder="Order #, person or dish" states={ORDER_STATES} />
      <ListBody list={list} empty="No orders match.">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Dishes</th>
              <th>Total</th>
              <th>Buyer</th>
              <th>Cook</th>
              <th>Placed</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.rows.map((order) => (
              <tr key={order._id}>
                <td className="ref">{order.ref}</td>
                <td>
                  {order.lines.map((line) => (
                    <div key={line.itemId}>
                      {line.quantity} × {line.title}
                    </div>
                  ))}
                </td>
                <td>{rupees(order.price)}</td>
                <td>{order.buyer}</td>
                <td>{order.seller}</td>
                <td>{day(order.createdAt)}</td>
                <td>
                  <span
                    className={`badge ${order.status === 'cancelled' ? 'bad' : order.status === 'delivered' ? 'good' : ''}`}
                  >
                    {order.status.replaceAll('_', ' ')}
                  </span>
                  {order.status === 'cancelled' && order.cancelReason && (
                    <div className="why">{order.cancelReason}</div>
                  )}
                </td>
                <td>
                  {order.status === 'cancelled' ? (
                    'Refunded'
                  ) : (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() =>
                        act.ask({
                          title: `Refund order ${order.ref}?`,
                          detail: `${order.buyer} gets ${rupees(order.price)} back in full and the order is cancelled. This cannot be undone.`,
                          placeholder: 'e.g. The buyer reported the food arrived spoiled',
                          note: 'The reason is emailed to the buyer and the cook.',
                          confirm: `Refund ${rupees(order.price)}`,
                          action: (reason) => adminService.refundOrder(order._id, reason),
                        })
                      }
                    >
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListBody>
    </>
  );
};

const Activity = () => {
  const [page, setPage] = useState(1);
  const list = {
    ...useQuery({
      queryKey: ['admin', 'actions', page],
      queryFn: () => adminService.getActions({ page }),
      placeholderData: keepPreviousData,
    }),
    page,
    setPage,
  };
  if (list.isLoading) return <p className="status">Loading…</p>;
  if (list.error) return <p className="status">Could not load the activity.</p>;
  if (list.data.rows.length === 0) return <p className="status">Nothing has been done yet.</p>;
  return (
    <>
      <ActionList actions={list.data.rows} />
      <Pager list={list} />
    </>
  );
};

const Admin = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((entry) => entry.id === params.get('tab')) ? params.get('tab') : 'overview';
  const queryClient = useQueryClient();
  // The action waiting for a reason, if any.
  const [request, setRequest] = useState(null);

  const mutation = useMutation({
    mutationFn: (work) => work(),
    onSuccess: () => {
      toast.success('Done');
      setRequest(null);
    },
    // Whatever happened, show the lists as they now are.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const act = {
    // Actions that take something away need a reason first.
    ask: setRequest,
    // Actions that give something back run straight away.
    run: (work) => mutation.mutate(work),
  };

  return (
    <div className="admin">
      <Helmet>
        <title>Admin | Taste of Home</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="container">
        <h1>Admin</h1>
        <div className="tabs" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={tab === entry.id}
              className={tab === entry.id ? 'active' : ''}
              onClick={() => setParams(entry.id === 'overview' ? {} : { tab: entry.id })}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="panel" role="tabpanel">
          {tab === 'overview' && <Overview />}
          {tab === 'users' && <Users act={act} busy={mutation.isPending} />}
          {tab === 'listings' && <Listings act={act} busy={mutation.isPending} />}
          {tab === 'orders' && <Orders act={act} busy={mutation.isPending} />}
          {tab === 'activity' && <Activity />}
        </div>
      </div>

      {request && (
        <ReasonDialog
          request={request}
          busy={mutation.isPending}
          onClose={() => !mutation.isPending && setRequest(null)}
          onConfirm={(reason) => mutation.mutate(() => request.action(reason))}
        />
      )}
    </div>
  );
};

export default Admin;
