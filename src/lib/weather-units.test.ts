import { describe, expect, it } from "vitest";
import { buildReportWeatherFields, hpaToMmHg, msToKmh, windCardinal } from "./weather-units";

describe("weather-units", () => {
  it("converts hPa to mmHg", () => {
    expect(hpaToMmHg(1013.25)).toBe(760);
  });

  it("converts m/s to km/h", () => {
    expect(msToKmh(10)).toBe(36);
  });

  it("maps wind degrees to cardinal RU", () => {
    expect(windCardinal(0)).toBe("С");
    expect(windCardinal(90)).toBe("В");
  });

  it("builds report fields without inventing GPS", () => {
    const f = buildReportWeatherFields({
      description: "пасмурно",
      tempC: 12.34,
      pressureHpa: 1013.25,
      windMs: 4.2,
      windDeg: 315,
    });
    expect(f.weather_summary).toBe("пасмурно");
    expect(f.air_temperature_c).toBe(12.3);
    expect(f.pressure_mmhg).toBe(760);
    expect(f.wind_direction).toBe("СЗ");
    expect(f.wind_speed_ms).toBe(4.2);
    expect("lat" in f).toBe(false);
  });
});
