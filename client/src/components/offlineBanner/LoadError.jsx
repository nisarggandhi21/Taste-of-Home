import { useOnline } from '../../hooks/useOnline';

// What a page shows when its content could not be loaded. Without a connection that is
// expected for anything not opened before, and worth saying plainly.
const LoadError = ({ children = 'Something went wrong!' }) => {
  const online = useOnline();
  if (online) return children;
  return (
    <p className="loadError">
      This page is not saved on your device yet. Connect to the internet and open it once, and it
      will be here the next time you are offline.
    </p>
  );
};

export default LoadError;
