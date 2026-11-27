import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const STREAM_URL = `${import.meta.env.VITE_BASEURL}messages/stream`;
// The server sends a sign of life every 15 seconds. Nothing for this long means the stream
// is not really delivering (for example a proxy that holds events back).
const SILENCE_MS = 40000;

// Keeps a live connection to the API open while the page is visible, and puts messages into
// the cached conversation as they arrive. Returns whether the connection is live right now,
// so a page can fall back to asking for new messages on a timer when it is not.
//
// The connection is a plain long-lived HTTP response (server-sent events), which also works
// on serverless hosting. The browser reconnects by itself whenever it ends.
export const useLiveMessages = () => {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let source;
    let silence;

    const alive = () => {
      setLive(true);
      clearTimeout(silence);
      silence = setTimeout(() => setLive(false), SILENCE_MS);
    };

    const open = () => {
      if (source) return;
      source = new EventSource(STREAM_URL, { withCredentials: true });

      // Sent each time a connection is established, the first time and after every
      // reconnect: catch up on anything sent while there was none.
      source.addEventListener('ready', () => {
        alive();
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
      source.addEventListener('ping', alive);
      source.addEventListener('message', (event) => {
        alive();
        const message = JSON.parse(event.data);
        // Only conversations that are already loaded; others are fetched when opened.
        queryClient.setQueryData(['messages', message.conversationId], (old) =>
          !old || old.some((existing) => existing._id === message._id) ? old : [...old, message]
        );
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
      // The browser retries by itself; until it is back, the page is not live.
      source.onerror = () => {
        clearTimeout(silence);
        setLive(false);
      };
    };

    const close = () => {
      clearTimeout(silence);
      source?.close();
      source = undefined;
      setLive(false);
    };

    // A tab in the background does not need a connection of its own.
    const onVisibility = () => (document.hidden ? close() : open());
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) open();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      close();
    };
  }, [queryClient]);

  return live;
};
