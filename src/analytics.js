// Google Tag Manager (the container GTM-KZJQZDSL; the Google Analytics tag itself is set up inside
// it, at tagmanager.google.com), without cookies and so without a consent notice: consent is set to
// "denied" for everything before Google's script loads (Consent Mode), so tags that respect it store
// nothing on the visitor's device and Google receives only anonymous, cookieless pings (visits are
// then estimated, and a returning visitor is not recognised).
// While the ID is empty, nothing loads at all.
const GTM_ID = 'GTM-KZJQZDSL';
const UMAMI_ID = 'd398cd19-bb8e-4f5c-a7f4-4035dfb4c578';

// only on the published site: not on localhost (npm run dev / preview) and not in the offline file
const live = GTM_ID && import.meta.env.PROD && /^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|172\.|10\.)/.test(location.hostname);

function gtag() { window.dataLayer.push(arguments); } // (Google's scripts expect the arguments object itself)

if (live) {
  window.dataLayer = window.dataLayer || [];
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('js', new Date());
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' }); // the container's own start: its page-view triggers hang on it
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.append(s);

  // Umami (cloud.umami.is): cookieless as well; it follows the address changes by itself
  const u = document.createElement('script');
  u.defer = true;
  u.src = 'https://cloud.umami.is/script.js';
  u.dataset.websiteId = UMAMI_ID;
  document.head.append(u);
}

// the address changes without a load (a medium chosen, a work, About or the events opened or
// closed): each time it settles on another one, the container is told with the event
// `virtual_page_view` (page_location, page_title), for a trigger in Tag Manager to send a page view on
let sent = null, timer = 0, first = true;
export function pageView() {
  if (!live) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const url = location.href;
    if (url === sent) return;
    sent = url;
    if (first) { first = false; return; } // the first one is the load itself: the container counts it
    window.dataLayer.push({ event: 'virtual_page_view', page_location: url, page_title: document.title });
  }, 400);
}
pageView();
