import { useEffect, useState } from 'react';

export type Route = 'home' | 'activities' | 'calendar' | 'insights' | 'coach' | 'profile';
export const ROUTES: Route[] = ['home', 'activities', 'calendar', 'insights', 'coach', 'profile'];

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
  return (ROUTES as string[]).includes(h) ? (h as Route) : 'home';
}

export function navigate(r: Route) {
  const target = r === 'home' ? '#/' : `#/${r}`;
  if (window.location.hash !== target) window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
