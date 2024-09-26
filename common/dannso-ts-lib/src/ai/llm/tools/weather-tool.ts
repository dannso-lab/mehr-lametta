import { CallableTool } from "../services";

// See: https://nominatim.org/release-docs/develop/api/Output/
// there are more fields...
interface NominatimGeocodingResult {
  lat: string;
  lon: string;
  name: string;
  display_name: string;
}

async function nominatimGeocode(q: string) {
  const res: NominatimGeocodingResult[] = await (
    await fetch(
      `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(
        q
      )}&format=jsonv2`
    )
  ).json();
  return res;
}

const weatherCodeToHumanReadable: { [k: string]: string } = {
  "0": "clear sky",
  "1": "mainly clear",
  "2": "partly cloudy",
  "3": "overcast",
  "45": "fog",
  "48": "depositing rime fog",
  "51": "light drizzle",
  "53": "moderate drizzle",
  "55": "dense intensity drizzle",
  "56": "freezing drizzle",
  "57": "freezing drizzle with dense intensity",
  "61": "slight rain",
  "63": "moderate rain",
  "65": "heavy rain",
  "66": "light freezing rain",
  "67": "heavy freezing rain",
  "71": "slight snow fall",
  "73": "heavy snow fall",
  "75": "heavy snow fall",
  "77": "snow grains",
  "80": "slight rain showers",
  "81": "moderate rain showers",
  "82": "violent rain showers",
  "85": "slight snow showers",
  "86": "heavy snow showers",
  "95": "thunderstorm",
  "96": "thunderstorm with slight hail",
  "99": "thunderstorm with heavy hail",
};

export const weatherTool: CallableTool = {
  description: {
    type: "function",
    function: {
      name: "get_weather",
      description: "finds the current weather at the named location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description:
              "the location of the weather (district, city, country etc.)",
          },
        },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  async fn(arg: { location: string }) {
    const location = String(arg.location);
    try {
      const geocodedPlace = (await nominatimGeocode(location))[0];
      const weather = await (
        await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
            geocodedPlace.lat
          )}&longitude=${encodeURIComponent(
            geocodedPlace.lon
          )}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_days=1`
        )
      ).json();
      //console.log(weather);
      const toolResult = {
        name: "get_weather",
        location,
        current: `${weather.current.temperature_2m}${
          weather.current_units.temperature_2m
        }, ${
          weatherCodeToHumanReadable[`${weather.current.weather_code}`] || ""
        }`,
        forecast: weather.hourly.temperature_2m.map(
          (t: number, i: any) =>
            `${weather.hourly.time[i]}: ${t}${
              weather.hourly_units.temperature_2m
            }, ${
              weatherCodeToHumanReadable[`${weather.hourly.weather_code[i]}`] ||
              ""
            }`
        ),
      };
      //console.log("toolresult:", toolResult);
      return JSON.stringify(toolResult);
    } catch (e) {
      return JSON.stringify({
        name: "get_weather",
        error: `unable to retrieve data for ${location}`,
      });
    }
  },
};
