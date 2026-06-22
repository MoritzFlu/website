import { useState } from 'react';

// The address is kept split into parts so the full `user@domain` string never
// exists as a single literal in the JS bundle, the DOM, or any href. It is only
// assembled at runtime once the user clicks — which defeats the vast majority of
// scrapers (they don't execute JS, and don't interact).
const USER = 'moritz.fluechter';
const DOMAIN = 'uni-tuebingen.de';

export default function EmailReveal({ label = 'Email', arrow = false }) {
  const [address, setAddress] = useState(null);

  if (address) {
    return <a href={`mailto:${address}`}>{address}</a>;
  }

  return (
    <button
      type="button"
      className="email-reveal"
      onClick={() => setAddress(`${USER}@${DOMAIN}`)}
    >
      {label}{arrow ? ' ↗' : ''}
    </button>
  );
}
