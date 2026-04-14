function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function wrapLongitudeDelta(delta) {
  let result = delta
  while (result > 180) result -= 360
  while (result < -180) result += 360
  return result
}

function ellipseWeight(latitude, longitude, centerLat, centerLon, radiusLat, radiusLon) {
  const dLat = (latitude - centerLat) / radiusLat
  const dLon = wrapLongitudeDelta(longitude - centerLon) / radiusLon
  const distSq = dLat * dLat + dLon * dLon
  if (distSq >= 1) return 0
  return 1 - distSq
}

function sampleContinentMask(latitude, longitude) {
  const continents = [
    [48, -102, 28, 34, 1.05],   // North America
    [16, -96, 16, 12, 0.52],    // Central America
    [-16, -60, 30, 18, 0.98],   // South America
    [74, -42, 13, 16, 0.72],    // Greenland
    [10, 22, 25, 22, 1.0],      // Africa
    [48, 22, 21, 22, 0.86],     // Europe
    [46, 82, 30, 62, 1.08],     // Eurasia
    [24, 46, 9, 12, 0.42],      // Arabia
    [21, 79, 11, 10, 0.46],     // India
    [8, 104, 12, 20, 0.54],     // Southeast Asia
    [-25, 134, 16, 18, 0.72],   // Australia
    [-41, 173, 7, 6, 0.24],     // New Zealand
    [36, 138, 10, 8, 0.26],     // Japan
  ]

  const cutouts = [
    [22, -84, 9, 8, 0.30],      // Caribbean / Gulf carve
    [58, -86, 12, 16, 0.34],    // Hudson Bay carve
    [55, 56, 16, 22, 0.22],     // Caspian / central Asia carve
    [8, 122, 10, 12, 0.24],     // Indonesia seas
    [-8, 148, 10, 12, 0.20],    // Coral / Pacific carve
  ]

  let land = 0
  for (const [lat, lon, rLat, rLon, weight] of continents) {
    land += ellipseWeight(latitude, longitude, lat, lon, rLat, rLon) * weight
  }

  for (const [lat, lon, rLat, rLon, weight] of cutouts) {
    land -= ellipseWeight(latitude, longitude, lat, lon, rLat, rLon) * weight
  }

  const waviness =
    Math.sin((longitude + latitude * 0.7) * Math.PI / 35) * 0.08 +
    Math.cos((longitude * 1.7 - latitude) * Math.PI / 50) * 0.06

  return land + waviness
}

export function getApproxEarthSurfaceColor(latitude, longitude) {
  const absLat = Math.abs(latitude)
  const landMask = sampleContinentMask(latitude, longitude)
  const isLand = landMask > 0.33

  if (absLat >= 78) {
    const ice = clamp((absLat - 78) / 12, 0, 1)
    return {
      r: 0.86 + ice * 0.12,
      g: 0.90 + ice * 0.08,
      b: 0.93 + ice * 0.07,
    }
  }

  if (!isLand) {
    const tropical = Math.max(0, 1 - absLat / 28)
    return {
      r: 0.05 + tropical * 0.03,
      g: 0.20 + tropical * 0.12,
      b: 0.48 + tropical * 0.24,
    }
  }

  const equatorialForest = Math.max(0, 1 - absLat / 18)
  const subtropicalDry = Math.max(0, 1 - Math.abs(absLat - 24) / 10)
  const temperate = Math.max(0, 1 - Math.abs(absLat - 42) / 18)

  let r = 0.26
  let g = 0.44
  let b = 0.18

  r += equatorialForest * 0.02
  g += equatorialForest * 0.24
  b += equatorialForest * 0.06

  r += subtropicalDry * 0.28
  g += subtropicalDry * 0.20
  b += subtropicalDry * 0.06

  r += temperate * 0.08
  g += temperate * 0.10
  b += temperate * 0.05

  return {
    r: clamp(r, 0, 1),
    g: clamp(g, 0, 1),
    b: clamp(b, 0, 1),
  }
}
