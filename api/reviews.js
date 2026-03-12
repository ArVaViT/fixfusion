/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion Constraction LLC.
 * Strategy: tries Places API first (new then legacy),
 * then Outscraper as fallback for SAB listings.
 * Caches response for 24 hours.
 *
 * Required env: GOOGLE_PLACES_API_KEY
 * Optional env: OUTSCRAPER_API_KEY (for SAB businesses where Places API returns no reviews)
 * Optional env: GOOGLE_PLACE_ID (override auto-detected place ID)
 *
 * ?debug=1 returns raw API responses for troubleshooting.
 */

var CACHE_SECONDS = 86400;
var FIXFUSION_PLACE_ID = 'ChIJp5Ob8l1tyYcRiOdCtl4MU_g';
var GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/rdAawirE2MsEsjn69';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  var outscraper = process.env.OUTSCRAPER_API_KEY || null;
  var placeId = process.env.GOOGLE_PLACE_ID || FIXFUSION_PLACE_ID;
  var debug = req.query && req.query.debug === '1';

  try {
    if (debug) {
      return await handleDebug(res, apiKey, outscraper, placeId);
    }

    var result = null;

    if (apiKey) {
      result = await fetchPlacesApi(apiKey, placeId);
      if (result && result.reviews.length > 0) {
        return sendJson(res, result);
      }
    }

    if (outscraper) {
      result = await fetchOutscraper(outscraper, placeId);
      if (result && result.reviews.length > 0) {
        return sendJson(res, result);
      }
    }

    return res.status(200).json({
      placeId: placeId,
      reviews: [],
      rating: null,
      totalReviews: 0,
      mapsUrl: GOOGLE_MAPS_URL
    });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

function sendJson(res, data) {
  data.mapsUrl = GOOGLE_MAPS_URL;
  res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(data);
}

async function handleDebug(res, apiKey, outscraper, placeId) {
  var output = { placeId: placeId };

  if (apiKey) {
    var rawUrl =
      'https://maps.googleapis.com/maps/api/place/details/json' +
      '?place_id=' + placeId +
      '&key=' + apiKey;
    try {
      var rawResp = await fetch(rawUrl);
      var rawData = await rawResp.json();
      output.legacyRaw = {
        status: rawData.status,
        name: rawData.result ? rawData.result.name : null,
        rating: rawData.result ? rawData.result.rating : null,
        user_ratings_total: rawData.result ? rawData.result.user_ratings_total : null,
        reviewCount: rawData.result && rawData.result.reviews ? rawData.result.reviews.length : 0,
        hasReviewsField: rawData.result ? ('reviews' in rawData.result) : false,
        allFields: rawData.result ? Object.keys(rawData.result) : []
      };
    } catch (e) { output.legacyError = e.message; }
  }

  if (outscraper) {
    try {
      var oscResult = await fetchOutscraper(outscraper, placeId);
      output.outscraper = oscResult;
    } catch (e) { output.outscraperError = e.message; }
  } else {
    output.outscraper = 'OUTSCRAPER_API_KEY not configured';
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(output);
}

async function fetchPlacesApi(apiKey, placeId) {
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
  return {
    placeId: placeId,
    reviews: (r.reviews || []).map(mapLegacyReview),
    rating: r.rating || null,
    totalReviews: r.user_ratings_total || 0,
    source: 'google'
  };
}

function mapLegacyReview(rev) {
  return {
    author: rev.author_name || 'Anonymous',
    authorPhoto: rev.profile_photo_url || null,
    rating: rev.rating || 5,
    text: rev.text || '',
    time: rev.relative_time_description || '',
    profileUrl: rev.author_url || null
  };
}

async function fetchOutscraper(apiKey, placeId) {
  var url =
    'https://api.app.outscraper.com/maps/reviews-v3' +
    '?query=' + encodeURIComponent(placeId) +
    '&reviewsLimit=10' +
    '&sort=newest' +
    '&async=false';

  var resp = await fetch(url, {
    headers: { 'X-API-KEY': apiKey }
  });

  if (!resp.ok) return null;

  var data = await resp.json();
  if (!data.data || !data.data[0]) return null;

  var place = data.data[0];
  var reviews = (place.reviews_data || []).map(function (rev) {
    return {
      author: rev.author_title || 'Anonymous',
      authorPhoto: rev.author_image || null,
      rating: rev.review_rating || 5,
      text: rev.review_text || '',
      time: rev.review_datetime_utc
        ? new Date(rev.review_datetime_utc).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : '',
      profileUrl: rev.author_link || null
    };
  });

  return {
    placeId: placeId,
    reviews: reviews,
    rating: place.rating || null,
    totalReviews: place.reviews || 0,
    source: 'outscraper'
  };
}
