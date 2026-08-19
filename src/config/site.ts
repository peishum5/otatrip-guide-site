/**
 * Single source of truth for site-wide constants that were previously
 * hard-coded in multiple files. Change a value here and it propagates
 * everywhere it is referenced.
 */

/** Brand name. Used in <title>, og:site_name, JSON-LD, header, and footer. */
export const SITE_NAME = 'OTAtrip Guide';

/** Public contact address. Referenced by contact, groups, footer, guest pages. */
export const CONTACT_EMAIL = 'kyoto.otatrip.guide@gmail.com';

/** Bokun booking channel UUID (booking widget). */
export const BOKUN_CHANNEL_UUID = 'a4214d32-0142-4458-a7f8-3e03401d2cb7';

/** Bokun widgets loader script src, parameterized by the channel UUID. */
export const BOKUN_LOADER_SRC =
  `https://widgets.bokun.io/assets/javascripts/apps/build/BokunWidgetsLoader.js?bookingChannelUUID=${BOKUN_CHANNEL_UUID}`;

/** GA4 measurement ID. Referenced by Analytics.astro. Do not change. */
export const GA4_MEASUREMENT_ID = 'G-7NL28Z41JD';

/** TripAdvisor review page. */
export const TRIPADVISOR_URL =
  'https://www.tripadvisor.com/Attraction_Review-g298564-d27525194-Reviews-OTAtrip_Guide-Kyoto_Kyoto_Prefecture_Kinki.html';
