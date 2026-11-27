import { toast } from 'react-toastify';
import { VOICE_LANGUAGES, speechSupported, useSpeechInput } from '../../hooks/useSpeechInput';
import './MicButton.scss';

// A microphone button, with a small switch for the language it listens in. Renders nothing
// in browsers without speech recognition.
//
//   onText(text)   called while the person speaks, to show what is being heard
//   onFinal(text)  called once with what they said
const MicButton = ({ onText, onFinal }) => {
  const speech = useSpeechInput({
    onText,
    onFinal,
    onProblem: (message) => toast.error(message, { toastId: 'voice' }),
  });
  if (!speechSupported()) return null;

  const current = VOICE_LANGUAGES.find((entry) => entry.code === speech.language);
  const other = VOICE_LANGUAGES.find((entry) => entry.code !== speech.language);

  return (
    <span className="micButton">
      <button
        type="button"
        className={speech.listening ? 'mic listening' : 'mic'}
        aria-pressed={speech.listening}
        aria-label={speech.listening ? 'Stop listening' : `Speak in ${current.name}`}
        title={speech.listening ? 'Stop listening' : `Speak in ${current.name}`}
        onClick={speech.listening ? speech.stop : speech.start}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15zm6-3.5a1 1 0 0 0-2 0 4 4 0 0 1-8 0 1 1 0 0 0-2 0 6 6 0 0 0 5 5.9V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.6a6 6 0 0 0 5-5.9z"
          />
        </svg>
      </button>
      <button
        type="button"
        className="language"
        disabled={speech.listening}
        aria-label={`Voice language: ${current.name}. Switch to ${other.name}`}
        title={`Voice language: ${current.name}. Switch to ${other.name}`}
        onClick={speech.nextLanguage}
      >
        {current.label}
      </button>
    </span>
  );
};

export default MicButton;
