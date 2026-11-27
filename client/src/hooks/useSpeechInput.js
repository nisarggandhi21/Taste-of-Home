import { useEffect, useRef, useState } from 'react';

// Languages the microphone can listen in. Speech recognition has to be told which one to
// expect; Hindi speech comes back in Devanagari, which search and the assistant understand.
export const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'EN', name: 'English' },
  { code: 'hi-IN', label: 'हिं', name: 'Hindi' },
];
const STORAGE_KEY = 'voiceLanguage';

const getRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

// The browser's own speech recognition (Chrome, Edge, Safari). Firefox has none.
export const speechSupported = () => !!getRecognition();

const PROBLEMS = {
  'not-allowed': 'The microphone is blocked. Allow it for this site in your browser to speak.',
  'service-not-allowed': 'Speech recognition is switched off in this browser.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition needs a connection.',
};

const savedLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (VOICE_LANGUAGES.some((language) => language.code === saved)) return saved;
  } catch {
    // Unavailable storage: use the default.
  }
  return VOICE_LANGUAGES[0].code;
};

// Speech to text.
//   onText(text)   what has been heard so far, while the person is still speaking
//   onFinal(text)  what was said, once they stop
//   onProblem(msg) why listening could not start or was cut short
// Returns { listening, start, stop, language, nextLanguage }.
export const useSpeechInput = ({ onText, onFinal, onProblem }) => {
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState(savedLanguage);
  const recognitionRef = useRef(null);
  // The latest callbacks, so a recognition that is already running calls the current ones.
  const handlers = useRef({});
  handlers.current = { onText, onFinal, onProblem };

  // Let go of the microphone when the page that was listening goes away.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = () => {
    const Recognition = getRecognition();
    if (!Recognition || recognitionRef.current) return;

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let said = '';
    recognition.onresult = (event) => {
      said = Array.from(event.results, (result) => result[0].transcript).join('');
      handlers.current.onText?.(said);
    };
    recognition.onerror = (event) => {
      // Saying nothing, or pressing stop, is not a problem worth a message.
      const message = PROBLEMS[event.error];
      if (message) handlers.current.onProblem?.(message);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (said.trim()) handlers.current.onFinal?.(said.trim());
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  };

  const stop = () => recognitionRef.current?.stop();

  const nextLanguage = () => {
    const at = VOICE_LANGUAGES.findIndex((entry) => entry.code === language);
    const next = VOICE_LANGUAGES[(at + 1) % VOICE_LANGUAGES.length].code;
    setLanguage(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still holds for this visit.
    }
  };

  return { listening, start, stop, language, nextLanguage };
};
