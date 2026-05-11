// ══════════════════════════════════════════════════════════════════
//  config.js — AirWatch API Keys & Runtime Configuration
//  ⚠  Keep this file out of version control (.gitignore it)
//     Anyone with this file can exhaust your API quotas.
// ══════════════════════════════════════════════════════════════════

var CONFIG = {

  // ── WAQI / aqicn.org ─────────────────────────────────────────────
  // Free tier · unlimited calls · real-time ground stations
  // Manage: https://aqicn.org/data-platform/token/
  AQICN_TOKEN: 'c1c7c4ab79a22ac83780f7571de846797b6f4bea',

  // ── IQAir (AirVisual) ─────────────────────────────────────────────
  // Free tier: 10,000 calls/month
  // Manage: https://dashboard.iqair.com/
  IQAIR_KEY: '3e6d4500-d75e-4ea6-b3e6-a1708c3bf333',

  // ── IQAir Quota Budgets ───────────────────────────────────────────
  // Tune these if you upgrade/downgrade your IQAir plan
  IQAIR_MONTHLY_BUDGET: 9500,   // safety headroom below 10,000 hard limit
  IQAIR_DAILY_HARD_CAP: 200,    // absolute daily stop

  // ── Google Air Quality API ────────────────────────────────────────
  // Free tier: 1,000 calls/day · 500m resolution · India CPCB AQI included
  // Manage: https://console.cloud.google.com/ -> Air Quality API
  GOOGLE_AQ_KEY: 'AIzaSyAtbuhfA16tW0-Ua8Q2HEYei2wtcatDHWs',

  // ── NASA EarthData ────────────────────────────────────────────────
  // Free tier · MODIS/VIIRS aerosol · Sentinel-5P NO2/CO/Aerosol
  // Manage: https://urs.earthdata.nasa.gov/profile
  // ⚠ NEVER share this token — revoke and regenerate if exposed
  NASA_TOKEN: 'eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6ImFua2l0XzgwODEiLCJleHAiOjE3ODM3MDk1NjksImlhdCI6MTc3ODUyNTU2OSwiaXNzIjoiaHR0cHM6Ly91cnMuZWFydGhkYXRhLm5hc2EuZ292IiwiaWRlbnRpdHlfcHJvdmlkZXIiOiJlZGxfb3BzIiwiYWNyIjoiZWRsIiwiYXNzdXJhbmNlX2xldmVsIjozfQ.J6TD5zq1dkz6046tQ30MWcwzcAwHNxYPAYrLZTjbXM6pARXO8V1yP7Q6G9KIRgu5D2wOEEXGs2PwIsDx55RBhJJ57TGbaw3xXt2sMD5lN1c3rsg6fUjc66u4cbH3wPSCDkUEEXVK46KRSxo95SUZdlc-yLBuAzA2u8tE2ikVLDSPAuMgFGzCHCuRzWRiZ06GcuCDlZ_ejgHm0bUnd8zqMsJ9joTb8bLq0t_y3f1kMbre8C8NrEjeRIE6SNywIdLWHUGj9LZnfJEX5kVGKZFr0KzIjD5imtDWygX5cvcg-cLY1cPnQpCx7clo-D2fQEk89zXlgd1bmtlGWqk4MiVYQg',

};