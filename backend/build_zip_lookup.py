"""Build backend/data/zip_county.csv: every Texas zip code -> its county + location.

Sources (U.S. Census, no key):
  - ZCTA-to-county relationship file: which county each zip falls in
    (a zip crossing county lines goes to the county with the most land overlap)
  - ZCTA gazetteer: center lat/lon of each zip

Run once:  python build_zip_lookup.py
"""
import io
import zipfile
from pathlib import Path

import pandas as pd
import requests

OUT = Path(__file__).resolve().parent / "data" / "zip_county.csv"
REL_URL = ("https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/"
           "tab20_zcta520_county20_natl.txt")
GAZ_URL = ("https://www2.census.gov/geo/docs/maps-data/data/gazetteer/"
           "2024_Gazetteer/2024_Gaz_zcta_national.zip")


def main():
    print("downloading zip -> county relationships")
    rel = pd.read_csv(io.StringIO(requests.get(REL_URL, timeout=120).content
                                  .decode("utf-8-sig")), sep="|", dtype=str)
    rel = rel.dropna(subset=["GEOID_ZCTA5_20"])
    rel = rel[rel["GEOID_COUNTY_20"].str.startswith("48")]  # Texas
    rel["AREALAND_PART"] = pd.to_numeric(rel["AREALAND_PART"])
    rel = (rel.sort_values("AREALAND_PART", ascending=False)
           .drop_duplicates("GEOID_ZCTA5_20"))
    out = pd.DataFrame({
        "zip": rel["GEOID_ZCTA5_20"],
        "county_code": rel["GEOID_COUNTY_20"].str[2:].astype(int),  # EPA uses the 3-digit part
        "county_name": rel["NAMELSAD_COUNTY_20"].str.replace(" County", "", regex=False),
    })

    print("downloading zip centers")
    z = zipfile.ZipFile(io.BytesIO(requests.get(GAZ_URL, timeout=120).content))
    gaz = pd.read_csv(z.open(z.namelist()[0]), sep="\t", dtype={"GEOID": str})
    gaz.columns = gaz.columns.str.strip()
    gaz = gaz.rename(columns={"GEOID": "zip", "INTPTLAT": "lat", "INTPTLONG": "lon"})
    out = out.merge(gaz[["zip", "lat", "lon"]], on="zip", how="left")

    OUT.parent.mkdir(exist_ok=True)
    out.sort_values("zip").to_csv(OUT, index=False)
    print(f"wrote {len(out)} Texas zip codes to {OUT}")


if __name__ == "__main__":
    main()
