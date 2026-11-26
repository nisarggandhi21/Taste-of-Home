import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAiEnabled } from '../../hooks/useAiEnabled';
import { aiService } from '../../services/aiService';
import DietBadge from '../dietBadge/DietBadge';
import './Assistant.scss';

const SUGGESTIONS = ['Something light for dinner', 'Veg under ₹150', 'A sweet treat'];
// Pages where the bottom corner is needed for something else (chat box, payment).
const HIDDEN_ON = ['/message/', '/pay/', '/checkout', '/success'];
// The API accepts 12 messages; older turns are dropped from what is sent.
const MAX_SENT = 11;

const Sparkle = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M12 2l1.9 5.6a3 3 0 0 0 1.9 1.9L21.4 11l-5.6 1.9a3 3 0 0 0-1.9 1.9L12 20.4l-1.9-5.6a3 3 0 0 0-1.9-1.9L2.6 11l5.6-1.5a3 3 0 0 0 1.9-1.9L12 2z"
    />
  </svg>
);

// A chat helper that suggests dishes. It only ever shows dishes that exist on the site.
const Assistant = () => {
  const enabled = useAiEnabled();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy, open]);

  if (!enabled || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  const send = async (question) => {
    const asked = question.trim();
    if (!asked || busy) return;
    const next = [...messages, { role: 'user', text: asked }];
    setMessages(next);
    setText('');
    setBusy(true);
    try {
      const answer = await aiService.ask(
        next.slice(-MAX_SENT).map(({ role, text: body }) => ({ role, text: body }))
      );
      setMessages([...next, { role: 'assistant', text: answer.reply, items: answer.items }]);
    } catch (err) {
      const problem =
        err.response?.data?.message || 'Sorry, I could not answer that. Please try again.';
      setMessages([...next, { role: 'assistant', text: problem, failed: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="assistant">
      {open && (
        <div className="panel" role="dialog" aria-label="Food assistant">
          <div className="header">
            <div>
              <strong>Food assistant</strong>
              <span>AI suggestions from dishes on sale now</span>
            </div>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>

          <div className="chatThread" ref={listRef}>
            {messages.length === 0 && (
              <div className="welcome">
                <p>Tell me what you feel like eating and I will find it.</p>
                <div className="suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button type="button" key={suggestion} onClick={() => send(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, i) => (
              <div
                className={`chatMessage from-${message.role}${message.failed ? ' failed' : ''}`}
                key={i}
              >
                <p>{message.text}</p>
                {message.items?.length > 0 && (
                  <div className="dishes">
                    {message.items.map((item) => (
                      <Link
                        className="dish"
                        to={`/item/${item._id}`}
                        key={item._id}
                        onClick={() => setOpen(false)}
                      >
                        <img src={item.cover} alt="" />
                        <span className="name">
                          <DietBadge diet={item.diet} /> {item.title}
                        </span>
                        <strong>&#8377; {item.price}</strong>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="chatMessage from-assistant thinking" aria-live="polite">
                <p>Looking through the menu…</p>
              </div>
            )}
          </div>

          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              value={text}
              maxLength={500}
              placeholder="e.g. spicy and vegetarian"
              aria-label="Ask the food assistant"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" disabled={busy || !text.trim()}>
              Send
            </button>
          </form>
          <p className="disclaimer">
            Suggestions are made by AI. Always confirm allergens with the cook.
          </p>
        </div>
      )}

      <button
        type="button"
        className="launcher"
        aria-expanded={open}
        aria-label={open ? 'Close food assistant' : 'Open food assistant'}
        onClick={() => setOpen(!open)}
      >
        <Sparkle />
        <span>Ask</span>
      </button>
    </div>
  );
};

export default Assistant;
