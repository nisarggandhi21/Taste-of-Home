import { toast } from 'react-toastify';
import { registerSW } from 'virtual:pwa-register';

// Starts the service worker: the part that keeps the app, and what the visitor has looked
// at, on the device so the site opens without a connection. Only present in a built site;
// while developing this does nothing.
export const startPwa = () => {
  const update = registerSW({
    onOfflineReady() {
      toast.info('Taste of Home is ready to use without a connection.', {
        toastId: 'offline-ready',
      });
    },
    // A newer version of the site has been downloaded. It takes over when the page reloads,
    // which is left to the visitor so that nothing they are in the middle of is lost.
    onNeedRefresh() {
      toast.info(
        <div className="updateToast">
          A new version of Taste of Home is available.{' '}
          <button type="button" onClick={() => update(true)}>
            Reload
          </button>
        </div>,
        { toastId: 'update', autoClose: false, closeOnClick: false }
      );
    },
  });
};

// Forgets what was saved from the API. Called when somebody logs in or out, because the
// list of dishes differs slightly from person to person.
export const clearSavedData = () => {
  if (typeof caches === 'undefined') return;
  caches.delete('api-public').catch(() => {});
};
