# WeatherWise

A responsive weather forecast dashboard built with HTML, CSS, and JavaScript. It uses the Open-Meteo forecast and geocoding APIs, so no API key is required for non-commercial use.

## Features

- Live city and postcode search
- Current conditions and seven-day forecast
- Scrollable 24-hour temperature and rain outlook
- Outdoor activity score and best-time recommendation
- Celsius and Fahrenheit support
- Browser geolocation
- Saved locations stored in local storage
- Responsive and keyboard-accessible interface

## Run locally

Serve the `dist` directory with any static web server. For example:

```bash
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Data

Weather and geocoding data are provided by [Open-Meteo](https://open-meteo.com/).
