import { useEffect, useState } from 'react';

const COUNTER_URL = 'https://api.counterapi.dev/v1/voxtube-visits/global/up';

/** Real visit count from counterapi.dev, or null when it is unavailable. No offsets, no simulated values. */
export default function useVisits() {
  const [visits, setVisits] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(COUNTER_URL)
      .then((res) => res.json())
      .then((data) => { if (alive && typeof data?.count === 'number') setVisits(data.count); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return visits;
}
