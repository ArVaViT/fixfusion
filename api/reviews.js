/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion Constraction LLC.
 * Falls back to curated reviews when the Places API returns none
 * (known limitation for Service Area Businesses).
 * Caches response for 24 hours.
 */

var CACHE_SECONDS = 86400;
var FIXFUSION_PLACE_ID = 'ChIJp5Ob8l1tyYcRiOdCtl4MU_g';
var GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/rdAawirE2MsEsjn69';

var CURATED_REVIEWS = [
  {
    author: 'Sergey Mirman',
    authorPhoto: null,
    rating: 5,
    text: 'We hired this company to renovate our child\'s room, and the results were fantastic! They helped us with drywall repair, interior painting, and the quality exceeded our expectations.',
    time: '42 weeks ago',
    profileUrl: null
  },
  {
    author: 'Yulia Korablov',
    authorPhoto: null,
    rating: 5,
    text: 'I hired this company for drywall installation and interior painting, and they did an excellent job! The team was professional, punctual, and paid great attention to detail.',
    time: '42 weeks ago',
    profileUrl: null
  }
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  var placeId = process.env.GOOGLE_PLACE_ID || FIXFUSION_PLACE_ID;

  res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (apiKey) {
    try {
      var result = await fetchFromApi(apiKey, placeId);
      if (result && result.totalReviews > 0) {
        return res.status(200).json(result);
      }
    } catch (_) {}
  }

  return res.status(200).json({
    placeId: placeId,
    reviews: CURATED_REVIEWS,
    rating: 5.0,
    totalReviews: 2,
    mapsUrl: GOOGLE_MAPS_URL,
    source: 'curated'
  });
};

async function fetchFromApi(apiKey, placeId) {
  var url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?place_id=' + placeId +
    '&fields=reviews,rating,user_ratings_total' +
    '&reviews_sort=newest' +
    '&key=' + apiKey;

  var resp = await fetch(url);
  if (!resp.ok) return null;

  var data = await resp.json();
  if (!data.result) return null;

  var r = data.result;
  var reviews = (r.reviews || []).map(function (rev) {
    return {
      author: rev.author_name || 'Anonymous',
      authorPhoto: rev.profile_photo_url || null,
      rating: rev.rating || 5,
      text: rev.text || '',
      time: rev.relative_time_description || '',
      profileUrl: rev.author_url || null
    };
  });

  return {
    placeId: placeId,
    reviews: reviews,
    rating: r.rating || null,
    totalReviews: r.user_ratings_total || 0,
    mapsUrl: GOOGLE_MAPS_URL,
    source: 'api'
  };
}
