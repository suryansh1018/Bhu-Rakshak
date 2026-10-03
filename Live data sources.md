# Live data sources

The monitor currently uses these public sources:

- **India Meteorological Department (IMD) CAP RSS:** https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
- **IMD API reference:** https://api.imd.gov.in/public/api_reference.html
- **IMD API portal:** https://mausam.imd.gov.in/responsive/apis.php
- **Open-Meteo forecast API:** https://api.open-meteo.com/v1/forecast
- **Google Maps platform proxy:** provided by the WebDev map integration at runtime.

The server fetches Open-Meteo rainfall and current weather for seven Northeast India corridor coordinates, computes a transparent corridor risk score and factor-of-safety proxy, and refreshes cached snapshots through tRPC. IMD CAP bulletins are fetched server-side and displayed in the sticky bulletin ticker. The schema and UI are prepared for Sentinel-1/InSAR observations, but no Sentinel Hub credential was available in the project connector configuration, so the interface labels that layer as connector-ready rather than presenting synthetic deformation measurements as live satellite data.

Automated SMS/WhatsApp delivery is also provider-ready: subscriptions, channel choice, consent, corridor, and phone number are persisted in `alertSubscriptions`. Citizens can immediately forward individual corridor warnings through WhatsApp click-to-chat from each route card. Server-initiated outbound delivery requires a configured SMS/WhatsApp provider credential (for example, a verified Meta WhatsApp Cloud API or Twilio sender).
