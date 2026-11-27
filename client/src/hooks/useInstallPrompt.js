import { useEffect, useState } from 'react';

// Browsers that can install the site as an app announce it with an event. Returns a function
// that shows the browser's install dialog, or null when installing is not on offer (already
// installed, or a browser such as Safari that only installs from its own share menu).
export const useInstallPrompt = () => {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const onPrompt = (event) => {
      // Keep the browser's own banner back; the site offers the button instead.
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return async () => {
    prompt.prompt();
    await prompt.userChoice;
    // The event can only be used once.
    setPrompt(null);
  };
};
