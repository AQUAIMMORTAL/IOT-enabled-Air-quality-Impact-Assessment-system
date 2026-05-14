// ══════════════════════════════════════════════════════════════════
//  config.js — AirWatch API Keys & Runtime Configuration
//  ⚠  Keep this file out of version control (.gitignore it)
//     Anyone with this file can exhaust your API quotas.
// ══════════════════════════════════════════════════════════════════

var CONFIG = {

  // ── WAQI / aqicn.org ─────────────────────────────────────────────
  // Free tier · unlimited calls · real-time ground stations
  // Manage: https://aqicn.org/data-platform/token/
  AQICN_TOKEN: '51f8e1228af4bc94ae4e66a74c3ccf262574a869',

  // ── IQAir (AirVisual) ─────────────────────────────────────────────
  // Free tier: 10,000 calls/month
  // Manage: https://dashboard.iqair.com/
  IQAIR_KEY: '9da3e85f-979a-4d61-8ef3-cd7b4dc6b3c4',

  // ── IQAir Quota Budgets ───────────────────────────────────────────
  // Tune these if you upgrade/downgrade your IQAir plan
  IQAIR_MONTHLY_BUDGET: 9500,   // safety headroom below 10,000 hard limit
  IQAIR_DAILY_HARD_CAP: 200,    // absolute daily stop

  // ── Google Air Quality API ────────────────────────────────────────
  // Free tier: 1,000 calls/day · 500m resolution · India CPCB AQI included
  // Manage: https://console.cloud.google.com/ -> Air Quality API
  GOOGLE_AQ_KEY: 'AIzaSyBz6yl4TtE0q1MXfd2wmL5EoC5um9m8uTs',

  // ── NASA EarthData ────────────────────────────────────────────────
  // Free tier · MODIS/VIIRS aerosol · Sentinel-5P NO2/CO/Aerosol
  // Manage: https://urs.earthdata.nasa.gov/profile
  // ⚠ NEVER share this token — revoke and regenerate if exposed
  NASA_TOKEN: 'eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6ImFua2l0XzgwODEiLCJleHAiOjE3ODM5MDgzNzgsImlhdCI6MTc3ODcyNDM3OCwiaXNzIjoiaHR0cHM6Ly91cnMuZWFydGhkYXRhLm5hc2EuZ292IiwiaWRlbnRpdHlfcHJvdmlkZXIiOiJlZGxfb3BzIiwiYWNyIjoiZWRsIiwiYXNzdXJhbmNlX2xldmVsIjozfQ.U7jlIQzR8r7nKQvEiWqkpGMQEP9Y-hREVjsRqlQHUaLfWSok_Vyc-ETF2iuvUmGoBW01qjydiCPL6kURG2k-voc92HHOX4orJsg9r1LO0zy7n2_lIp2G2xnn01pqrMRAMITszygCIejLI7GtmXxZVOOXyWn62UReiqkUGxSCBqdDB76wAgOVZasxEkJkJmyfkXmu21sP4DQmRUAy6f0ek4RhEfDkdG1FG6W054bR3-kYGZlcirQJZyyuNnDKo_UK59rxglanCWpfYQ9ZcdhZdMJitxp8VukqViR_rTLOKg1XJUS2bVB-LpYhvYLgG59tLOlSaNGiYEbsMmgIw2ApUw',

  // ── Google Gemini — AeroAssist AI ─────────────────────────────────
  // Powers the in-app AI assistant (AeroAssist)
  // Free tier: 15 RPM · 1M tokens/day · gemini-2.0-flash
  // Get key: https://aistudio.google.com/app/apikey
  // Enable: Google AI Studio → Create API Key → paste below
  GEMINI_KEY: 'AIzaSyB_ViymcakP6bgV57WLelFPg38r9zME4lo',

};
