/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion via Places API.
 * Uses CID from Google Maps URL to resolve the correct Place ID,
 * then fetches reviews via the legacy Place Details endpoint.
 * Caches response for 24 hours via Cache-Control headers.
 */

var BUSINESS_CID = '9300693256032829380';
var CACHE_SECONDS = 86400;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    var placeId = process.env.GOOGLE_PLACE_ID || null;

    if (!placeId) {
      placeId = await findPlaceId(apiKey);
      if (!placeId) {
        return res.status(404).json({ error: 'Business not found on Google Maps' });
      }
    }

    var result = await fetchReviews(apiKey, placeId);

    res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json(result);
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

async function findPlaceId(apiKey) {
  var cidUrl =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?cid=' + BUSINESS_CID +
    '&fields=place_id,name,user_ratings_total' +
    '&key=' + apiKey;

  var resp = await fetch(cidUrl);
  if (!resp.ok) return null;

  var data = await resp.json();
  if (data.result && data.result.place_id) {
    return data.result.place_id;
  }

  var findUrl =
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
    '?input=FixFusion+Constraction+LLC' +
    '&inputtype=textquery' +
    '&locationbias=point:39.76652,-86.4412135' +
    '&fields=place_id,name,user_ratings_total' +
    '&key=' + apiKey;

  resp = await fetch(findUrl);
  if (!resp.ok) return null;

  data = await resp.json();
  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].place_id;
  }

  return null;
}

async function fetchReviews(apiKey, placeId) {
  var url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?place_id=' + placeId +
    '&fields=reviews,rating,user_ratings_total,name' +
    '&reviews_sort=newest' +
    '&key=' + apiKey;

  var resp = await fetch(url);
  if (!resp.ok) {
    throw new Error('Places API returned ' + resp.status);
  }

  var data = await resp.json();
  if (!data.result) {
    throw new Error('No result in Places API response');
  }

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
    totalReviews: r.user_ratings_total || 0
  };
}
