/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion via the legacy Places API.
 * Searches for the business listing that has actual reviews,
 * then returns them sorted newest-first.
 * Caches response for 24 hours via Cache-Control headers.
 */

var CACHE_SECONDS = 86400;
var SEARCH_QUERIES = [
  'FixFusion Constraction LLC',
  'FixFusion LLC Indiana',
  'FixFusion'
];

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
    var result = null;

    if (placeId) {
      result = await fetchDetails(apiKey, placeId);
      if (result && result.totalReviews > 0) {
        return sendJson(res, result);
      }
    }

    var candidates = await findAllCandidates(apiKey);

    for (var i = 0; i < candidates.length; i++) {
      result = await fetchDetails(apiKey, candidates[i]);
      if (result && result.totalReviews > 0) {
        return sendJson(res, result);
      }
    }

    if (result) {
      return sendJson(res, result);
    }

    return res.status(404).json({ error: 'Business not found on Google Maps' });
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

async function findAllCandidates(apiKey) {
  var ids = [];
  var seen = {};

  for (var i = 0; i < SEARCH_QUERIES.length; i++) {
    var url =
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
      '?input=' + encodeURIComponent(SEARCH_QUERIES[i]) +
      '&inputtype=textquery' +
      '&fields=place_id' +
      '&key=' + apiKey;

    var resp = await fetch(url);
    if (!resp.ok) continue;

    var data = await resp.json();
    if (data.candidates) {
      for (var j = 0; j < data.candidates.length; j++) {
        var pid = data.candidates[j].place_id;
        if (pid && !seen[pid]) {
          seen[pid] = true;
          ids.push(pid);
        }
      }
    }
  }

  var textUrl =
    'https://maps.googleapis.com/maps/api/place/textsearch/json' +
    '?query=' + encodeURIComponent('FixFusion Constraction LLC') +
    '&key=' + apiKey;

  var textResp = await fetch(textUrl);
  if (textResp.ok) {
    var textData = await textResp.json();
    if (textData.results) {
      for (var k = 0; k < textData.results.length; k++) {
        var tid = textData.results[k].place_id;
        if (tid && !seen[tid]) {
          seen[tid] = true;
          ids.push(tid);
        }
      }
    }
  }

  return ids;
}

async function fetchDetails(apiKey, placeId) {
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
