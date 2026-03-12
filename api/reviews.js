/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion via Places API (New).
 * Caches response for 24 hours via Cache-Control headers.
 */

var PLACE_QUERY = 'FixFusion Constraction';
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

    var reviews = await fetchReviews(apiKey, placeId);

    res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
      placeId: placeId,
      reviews: reviews.reviews || [],
      rating: reviews.rating || null,
      totalReviews: reviews.totalReviews || 0
    });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

async function findPlaceId(apiKey) {
  var cidUrl = 'https://maps.googleapis.com/maps/api/place/details/json?cid=9300693256032829380&fields=place_id,name&key=' + apiKey;
  var cidResp = await fetch(cidUrl);
  if (cidResp.ok) {
    var cidData = await cidResp.json();
    if (cidData.result && cidData.result.place_id) {
      console.log('Found via CID:', cidData.result.name, cidData.result.place_id);
      return cidData.result.place_id;
    }
  }

  var url = 'https://places.googleapis.com/v1/places:searchText';
  var queries = [PLACE_QUERY, 'FixFusion LLC', 'FixFusion'];
  for (var i = 0; i < queries.length; i++) {
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName'
      },
      body: JSON.stringify({ textQuery: queries[i] })
    });
    if (!resp.ok) continue;
    var data = await resp.json();
    if (data.places && data.places.length > 0) return data.places[0].id;
  }
  return null;
}

async function fetchReviews(apiKey, placeId) {
  var url = 'https://places.googleapis.com/v1/places/' + placeId;
  var resp = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews,rating,userRatingCount'
    }
  });

  if (!resp.ok) {
    throw new Error('Places API returned ' + resp.status);
  }

  var data = await resp.json();
  var reviews = (data.reviews || []).map(function (r) {
    return {
      author: r.authorAttribution ? r.authorAttribution.displayName : 'Anonymous',
      authorPhoto: r.authorAttribution ? r.authorAttribution.photoUri : null,
      rating: r.rating || 5,
      text: r.text ? r.text.text : '',
      time: r.relativePublishTimeDescription || '',
      profileUrl: r.authorAttribution ? r.authorAttribution.uri : null
    };
  });

  return {
    reviews: reviews,
    rating: data.rating || null,
    totalReviews: data.userRatingCount || 0
  };
}
