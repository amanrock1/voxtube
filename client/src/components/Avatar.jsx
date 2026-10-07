import { useState } from 'react';

/** Profile picture with a letter fallback for missing or broken images. */
export default function Avatar({ src, name }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <div className="comment-avatar comment-avatar-fallback" aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase() || '?'}</div>;
  }
  return <img className="comment-avatar" src={src} alt={name} onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
}
