/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion Constraction LLC.
 * Tries multiple search strategies across both legacy and new Places APIs.
 * Filters results by name to avoid false positives.
 * Caches response for 24 hours via Cache-Control headers.
 *
 * Add ?debug=1 to see all candidate Place IDs.
 */

var CACHE_SECONDS = 86400;
var BUSINESS_CID = '9300693256032829380';
var NAME_PATTERN = /fix\s*fusion/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  var debug = req.query && req.query.debug === '1';

  try {
    var envPlaceId = process.env.GOOGLE_PLACE_ID || null;
    var candidates = await gatherCandidates(apiKey, envPlaceId);

    if (debug) {
      var debugInfo = [];
      for (var d = 0; d < candidates.length; d++) {
        var detail = await fetchDetailsLegacy(apiKey, candidates[d]);
        debugInfo.push({
          placeId: candidates[d],
          name: detail ? detail.name : 'FETCH_FAILED',
          totalReviews: detail ? detail.totalReviews : 0,
          nameMatch: detail ? NAME_PATTERN.test(detail.name) : false
        });
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ candidates: debugInfo });
    }

    for (var i = 0; i < candidates.length; i++) {
      var result = await fetchDetailsLegacy(apiKey, candidates[i]);
      if (result && result.totalReviews > 0 && NAME_PATTERN.test(result.name)) {
        return sendJson(res, result);
      }
    }

    for (var j = 0; j < candidates.length; j++) {
      var fallback = await fetchDetailsLegacy(apiKey, candidates[j]);
      if (fallback && NAME_PATTERN.test(fallback.name)) {
        return sendJson(res, fallback);
      }
    }

    return res.status(404).json({ error: 'Business not found' });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

function sendJson(res, data) {
  res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(data);
}

async function gatherCandidates(apiKey, envPlaceId) {
  var ids = [];
  var seen = {};

  function add(id) {
    if (id && !seen[id]) { seen[id] = true; ids.push(id); }
  }

  if (envPlaceId) add(envPlaceId);

  var cidUrl =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?cid=' + BUSINESS_CID +
    '&fields=place_id' +
    '&key=' + apiKey;
  try {
    var cidResp = await fetch(cidUrl);
    if (cidResp.ok) {
      var cidData = await cidResp.json();
      if (cidData.result) add(cidData.result.place_id);
    }
  } catch (_) {}

  var queries = [
    'FixFusion Constraction LLC',
    'FixFusion LLC',
    'FixFusion Indiana'
  ];

  for (var i = 0; i < queries.length; i++) {
    try {
      var newUrl = 'https://places.googleapis.com/v1/places:searchText';
      var newResp = await fetch(newUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName'
        },
        body: JSON.stringify({ textQuery: queries[i] })
      });
      if (newResp.ok) {
        var newData = await newResp.json();
        if (newData.places) {
          for (var p = 0; p < newData.places.length; p++) {
            add(newData.places[p].id);
          }
        }
      }
    } catch (_) {}

    try {
      var oldUrl =
        'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
        '?input=' + encodeURIComponent(queries[i]) +
        '&inputtype=textquery' +
        '&fields=place_id' +
        '&key=' + apiKey;
      var oldResp = await fetch(oldUrl);
      if (oldResp.ok) {
        var oldData = await oldResp.json();
        if (oldData.candidates) {
          for (var c = 0; c < oldData.candidates.length; c++) {
            add(oldData.candidates[c].place_id);
          }
        }
      }
    } catch (_) {}
  }

  return ids;
}

async function fetchDetailsLegacy(apiKey, placeId) {
  var url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?place_id=' + placeId +
    '&fields=reviews,rating,user_ratings_total,name' +
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
    name: r.name || '',
    reviews: reviews,
    rating: r.rating || null,
    totalReviews: r.user_ratings_total || 0
  };
}
