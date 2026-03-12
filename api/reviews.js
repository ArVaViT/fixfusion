/**
 * Vercel Serverless Function — /api/reviews
 *
 * Fetches Google reviews for FixFusion via Places API (New).
 * Caches response for 24 hours via Cache-Control headers.
 */

const PLACE_QUERY = 'FixFusion Noblesville Indiana';
const CACHE_SECONDS = 86400;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let placeId = process.env.GOOGLE_PLACE_ID || null;

    if (!placeId) {
      placeId = await findPlaceId(apiKey);
      if (!placeId) {
        return res.status(404).json({ error: 'Business not found on Google Maps' });
      }
    }

    const reviews = await fetchReviews(apiKey, placeId);

    res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
      placeId,
      reviews: reviews.reviews || [],
      rating: reviews.rating || null,
      totalReviews: reviews.totalReviews || 0
    });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

async function findPlaceId(apiKey) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName'
    },
    body: JSON.stringify({ textQuery: PLACE_QUERY })
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (data.places && data.places.length > 0) {
    return data.places[0].id;
  }
  return null;
}

async function fetchReviews(apiKey, placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews,rating,userRatingCount'
    }
  });

  if (!response.ok) {
    throw new Error('Places API returned ' + response.status);
  }

  const data = await response.json();
  const reviews = (data.reviews || []).map((r) => ({
    author: r.authorAttribution?.displayName || 'Anonymous',
    authorPhoto: r.authorAttribution?.photoUri || null,
    rating: r.rating || 5,
    text: r.text?.text || '',
    time: r.relativePublishTimeDescription || '',
    profileUrl: r.authorAttribution?.uri || null
  }));

  return {
    reviews,
    rating: data.rating || null,
    totalReviews: data.userRatingCount || 0
  };
}
