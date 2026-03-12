/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion Constraction LLC.
 * Tries both new and legacy Places API to find reviews.
 * ?debug=1 returns diagnostic data from both APIs.
 */

var CACHE_SECONDS = 86400;
var BUSINESS_CID = '9300693256032829380';
var FIXFUSION_PLACE_ID = 'ChIJp5Ob8l1tyYcRiOdCtl4MU_g';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  var placeId = process.env.GOOGLE_PLACE_ID || FIXFUSION_PLACE_ID;
  var debug = req.query && req.query.debug === '1';

  try {
    if (debug) {
      var legacyResult = await fetchLegacy(apiKey, placeId);
      var newResult = await fetchNew(apiKey, placeId);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({
        placeId: placeId,
        legacy: legacyResult,
        newApi: newResult
      });
    }

    var result = await fetchNew(apiKey, placeId);
    if (!result || result.totalReviews === 0) {
      result = await fetchLegacy(apiKey, placeId);
    }

    if (!result) {
      return res.status(404).json({ error: 'No review data available' });
    }

    res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(result);
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

async function fetchNew(apiKey, placeId) {
  try {
    var url = 'https://places.googleapis.com/v1/places/' + placeId;
    var resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,reviews,rating,userRatingCount'
      }
    });

    if (!resp.ok) {
      var errText = await resp.text();
      return { error: 'HTTP ' + resp.status, detail: errText.substring(0, 300) };
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
      placeId: placeId,
      name: data.displayName ? data.displayName.text : '',
      reviews: reviews,
      rating: data.rating || null,
      totalReviews: data.userRatingCount || 0,
      source: 'new'
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchLegacy(apiKey, placeId) {
  try {
    var url =
      'https://maps.googleapis.com/maps/api/place/details/json' +
      '?place_id=' + placeId +
      '&fields=reviews,rating,user_ratings_total,name' +
      '&reviews_sort=newest' +
      '&key=' + apiKey;

    var resp = await fetch(url);
    if (!resp.ok) return { error: 'HTTP ' + resp.status };

    var data = await resp.json();
    if (data.status && data.status !== 'OK') {
      return { error: 'API status: ' + data.status, detail: data.error_message || '' };
    }
    if (!data.result) return { error: 'No result' };

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
      name: r.name || '',
      reviews: reviews,
      rating: r.rating || null,
      totalReviews: r.user_ratings_total || 0,
      source: 'legacy'
    };
  } catch (err) {
    return { error: err.message };
  }
}
