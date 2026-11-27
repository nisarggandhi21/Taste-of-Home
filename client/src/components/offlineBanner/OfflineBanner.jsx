import { useOnline } from '../../hooks/useOnline';
import './OfflineBanner.scss';

// Shown across the top of every page while the device has no connection.
const OfflineBanner = () => {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offlineBanner" role="status">
      You are offline. Saved dishes still open; ordering and messages need a connection.
    </div>
  );
};

export default OfflineBanner;
