import re
import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os
import random
from datetime import date, timedelta
from dotenv import load_dotenv

# Firebase setup: load_dotenv() reads in the .env file in this directory, then we can securely use it with os.getenv()
load_dotenv()
cred = credentials.Certificate(os.getenv("FIREBASE_KEY_PATH"))

# Authenticate the program with Firebase using the service account key
firebase_admin.initialize_app(cred)

# firestore.client() returns the database to use for all reads and writes
db = firestore.client()

# Scraping URL setup
# Home landing page
BASE_URL = "https://nutrition.umd.edu"

# Numeric identifiers found in the URL for different dining locations (LocationNum=)
LOCATIONS = {
    "SOUTH": 16,
    "Y":     19,
    "251":   51,
}

# Date range to scrape
END_DATE   = date.today()
START_DATE = END_DATE - timedelta(days=3)

# Rate limiting to be nice to UMD's website :)
REQUEST_DELAY   = 0.4   # minimum seconds between requests
REQUEST_TIMEOUT = 20    # seconds before giving up on a single request

# Networking
def safe_get(url, retries=3):
    """
    Fetch a URL with automatic retries.
    Waits longer before each retry to give the server time to recover.
    Returns the Response object on success, or None if all retries fail.
    """
    for attempt in range(retries):
        try:
            resp = requests.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},  # mimic a real browser
                timeout=REQUEST_TIMEOUT,
            )
            # Raise an exception for error status codes (4xx/5xx)
            resp.raise_for_status()
            return resp
        # If an exception is raised, retry
        except requests.RequestException as e:
            wait = (2 ** attempt) + random.uniform(0, 1)
            print(f"Request failed ({e}), retrying in {wait:.1f}s...")
            time.sleep(wait)
    # Failure: return None
    print(f"Gave up after {retries} attempts: {url}")
    return None

# Menu scraping
def get_menu_item_links(location_num, date_str):
    """
    Scrape the daily menu page for a specific location and date.
    The UMD nutrition site renders the full menu as HTML on page load.
    Each food item is an <a class="menu-item-name"> tag whose href points to a
    label.aspx page containing the full nutrition facts for that item.
    Returns a list of (item_name, rec_num) tuples, where rec_num is the unique
    identifier embedded in the label URL, e.g. "XXXXXX*X".
    """
    # setup the URL to be scraped based on UMD's formatting
    url = f"{BASE_URL}/?locationNum={location_num}&dtdate={date_str}"
    resp = safe_get(url)
    # if safe_get() returns None, the request failed
    if not resp:
        return []

    # Create the scraper (resp.text is the raw HTML of the page)
    soup = BeautifulSoup(resp.text, "html.parser")

    items = []
    # The HTML uses <a class="menu-item-name" href="label.aspx?RecNumAndPort=...">
    # This prevents finding links that aren't menu item names
    for tag in soup.find_all("a", class_="menu-item-name"):
        # Get the URL associated with the menu item
        href = tag.get("href", "")

        # Special case: unexpected URL format
        if "RecNumAndPort=" not in href:
            continue

        # The URL looks like:
        # href="label.aspx?RecNumAndPort=XXXXXX*X" 
        # Thus rec_num="XXXXXX*X"
        rec_num = href.split("RecNumAndPort=")[1]
        name = tag.text.strip()
        if name and rec_num:
            items.append((name, rec_num))

    return items


# Label Page Scraping

def parse_quantity(raw):
    """
    Strip a unit suffix from a nutrition string and return a plain float.

    The label HTML encodes nutrients as combined name+value strings inside a
    single <span>, e.g. "Total Fat 10.5g" or "Sodium 307.7mg". After the
    caller splits off the nutrient name, this function receives just the
    value portion ("10.5g") and converts it to a float (10.5).

    We store floats rather than strings so the mobile app can do arithmetic —
    multiplying by serving count, summing a day's intake, comparing to goals.

    Returns None if the string is empty, whitespace-only, or non-numeric
    (e.g. a blank % DV cell rendered as "&nbsp;"), so callers can safely
    skip storing the field rather than writing a bad value.
    """
    if not raw:
        return None
    cleaned = raw.strip().lower().replace("\xa0", "")  # \xa0 is HTML &nbsp;
    # Strip unit suffixes longest-first so "mcg" is matched before "g"
    for suffix in ["mcg", "kcal", "mg", "cal", "g", "%"]:
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_nutrient_span(span_text):
    """
    Split a combined "Name Value+unit" string into (name_key, float_value).

    UMD's label page puts the nutrient name and its amount together inside a
    single <span class="nutfactstopnutrient">, e.g.:
        "Total Fat\xa010.5g"
        "    Saturated Fat 4.1g"      (indented sub-nutrients use leading spaces)
        "    Dietary Fiber 2g"

    We strip leading whitespace (the indentation is cosmetic), then split on
    the last space to separate the name from the value token. The name is
    lowercased and used as a lookup key in NUTRIENT_MAP.

    Returns (None, None) if the span doesn't contain a recognisable value.
    """
    text = span_text.strip().replace("\xa0", " ")
    # rsplit on the last space gives us everything before as the name and the
    # trailing token (e.g. "10.5g") as the raw value
    parts = text.rsplit(" ", 1)
    if len(parts) != 2:
        return None, None
    name = parts[0].strip().lower()
    value = parse_quantity(parts[1].strip())
    return name, value


def get_nutrition_label(item_name, rec_num):
    """
    Scrape the nutrition label page for a single food item and return a dict
    ready to be written to Firestore.
    
    HTML structure:

    CALORIES live inside the first <td rowspan=10> of the facts table:
        <p>Calories per serving</p>
        <p>251</p>
    The calorie value is the text of the <p> that immediately follows the
    "Calories per serving" paragraph — NOT in the main nutrient rows.

    SERVING SIZE is also in that first <td>, in a <div class="nutfactsservsize">
    that appears twice: once with the label "Serving size" and once with the
    actual value (e.g. "1 ea"). We want the second one.

    MAIN NUTRIENTS (fat, carbs, protein, sodium, etc.) are rendered as
    <span class="nutfactstopnutrient"> elements whose text contains both the
    nutrient name and its value in one string, e.g. "Total Fat 10.5g".
    Sub-nutrients (saturated fat, dietary fiber, etc.) are indented with
    leading &nbsp; characters but otherwise identical in structure.

    % DAILY VALUES appear in the adjacent align="right" <td> cell as a
    <span class="nutfactstopnutrient"><b>21%</b></span>. Blank % DV cells
    contain "&nbsp;" which parse_quantity() will correctly return None for.

    Returns None if the network request fails.
    """
    url = f"{BASE_URL}/label.aspx?RecNumAndPort={rec_num}"
    resp = safe_get(url)
    if not resp:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    nutrition = {
        "rec_num": rec_num,
        "name":    item_name,
    }

    # Serving size
    # The first <td rowspan=10> contains two <div class="nutfactsservsize">:
    #   first:  "Serving size"
    #   second: "1 ea"          
    # We grab both of them but take the last one.
    serv_divs = soup.find_all("div", class_="nutfactsservsize")
    if len(serv_divs) >= 2:
        nutrition["serving_size"] = serv_divs[-1].text.strip()

    # Calories:
    # Find the <p> whose text is "Calories per serving", then the very next
    # <p> sibling contains the numeric calorie count as plain text.
    # Use find_next_sibling("p") to not get confused with other tags
    # i.e. <hr> nodes
    cal_label = soup.find("p", string=lambda t: t and "calories per serving" in t.lower())
    if cal_label:
        cal_value_tag = cal_label.find_next_sibling("p")
        if cal_value_tag:
            nutrition["calories"] = parse_quantity(cal_value_tag.text.strip())

    # Main nutrient rows:
    # Map from the nutrient name as it appears in the span text (lowercased, stripped)
    # to the Firestore field name we store it under.
    # Include alternate wordings UMD uses for redundancy (e.g. "total carbohydrate.")
    NUTRIENT_MAP = {
        "total fat":             "total_fat_g",
        "saturated fat":         "saturated_fat_g",
        "trans fat":             "trans_fat_g",
        "cholesterol":           "cholesterol_mg",
        "sodium":                "sodium_mg",
        "total carbohydrate.":   "total_carbs_g",   
        "total carbohydrate":    "total_carbs_g",
        "total carbohydrates":   "total_carbs_g",
        "dietary fiber":         "dietary_fiber_g",
        "total sugars":          "total_sugars_g",
        "total sugar":           "total_sugars_g",
        "protein":               "protein_g",
        "iron":                  "iron_mg",
        "calcium":               "calcium_mg",
        "potassium":             "potassium_mg",
        "vitamin d":             "vitamin_d_mcg",
        "vitamin c":             "vitamin_c_mg",
        "vitamin a - re":        "vitamin_a_mcg",
    }

    # Each nutrient row in the table is a <tr> with two main content <td>s:
    #   td[0]: contains a <span class="nutfactstopnutrient"> with "Name Value"
    #   td[1] (align="right"): contains a <span> with the % DV, e.g. "21%"
    # The table has 4 columns total (nutrients are displayed in two side-by-side
    # pairs), so a single <tr> can contain up to two nutrient+%DV pairs.
    # We iterate all <span class="nutfactstopnutrient"> elements directly rather
    # than going row-by-row, which handles both the paired layout and the
    # micronutrient row (iron, calcium, etc.) that spans all columns.
    for span in soup.find_all("span", class_="nutfactstopnutrient"):
        name, value = parse_nutrient_span(span.get_text())
        if name is None or value is None:
            continue

        if name in NUTRIENT_MAP:
            field = NUTRIENT_MAP[name]
            nutrition[field] = value

            # The % DV for this nutrient is in the next right-aligned <td>'s
            # <span>. We look for the immediately following span that contains
            # a "%" character. If it's blank (&nbsp;) parse_quantity returns
            # None and we simply don't store a % DV for that nutrient.
            next_span = span.find_next("span", class_="nutfactstopnutrient")
            if next_span:
                pct_text = next_span.get_text(strip=True).replace("\xa0", "")
                if "%" in pct_text:
                    pct_field = field.rsplit("_", 1)[0] + "_pct_dv"
                    nutrition[pct_field] = parse_quantity(pct_text)

    # ── Added sugars (special case) ───────────────────────────────────────────
    # Added sugars appear in a <td align="left"> as plain text:
    #   "      Includes 0g Added Sugars"
    # This doesn't follow the span pattern, so we search for it separately.
    for td in soup.find_all("td", align="left"):
        text = td.get_text(strip=True).lower()
        if "added sugars" in text and "includes" in text:
            # Extract the number before "g added sugars"
            match = re.search(r"([\d.]+)g added sugars", text)
            if match:
                nutrition["added_sugars_g"] = float(match.group(1))
            break

    return nutrition


# Firestore Helpers

def firestore_id(rec_num):
    """
    Sanitize a rec_num for use as a Firestore document ID;
    Firestore document IDs cannot contain forward slashes or asterisks.
    """
    return rec_num.replace("*", "_").replace("/", "-")


def upload_item_if_new(rec_num, nutrition_data, item_cache):
    """
    Upload a food item's nutrition facts to the Firestore "items" collection,
    given it has not been encountered before. item_cache tracks rec_nums handled during this run.
    This prevents unneccesary reads from Firestore. If the item is new to this run, still do one
    Firestore read to check whether it already exists in the database from a previous run.
    This prevents overwriting preexisting data.
    """

    # Skips all items already seen this run
    if rec_num in item_cache:
        return

    doc_ref = db.collection("items").document(firestore_id(rec_num))

    if not doc_ref.get().exists:
        doc_ref.set(nutrition_data)
        print(f"Uploaded: {nutrition_data['name']}")
    else:
        print(f"Exists:   {nutrition_data['name']}")

    # Add to cache regardless of whether we wrote or not in order to speed up subsequent scrapes
    item_cache.add(rec_num)

def scrape_day(date_str, item_cache):
    """
    Scrape all locations for a single date.

    For each location:
      1. Fetch the menu page to get the list of items being served
      2. For each item, fetch its nutrition label (only if not seen before)
      3. Upload the nutrition data to Firestore

    item_cache is passed in so it persists across days, preventing duplicates across the entire scrape run.
    """
    for loc_name, loc_num in LOCATIONS.items():
        print(f"{loc_name}: ")
        items = get_menu_item_links(loc_num, date_str)

        if not items:
            # The dining hall may be closed on weekends, holidays, or
            # between semesters — this is expected, not an error.
            print(f"no items; closed or no data for this location/day")
            continue

        for item_name, rec_num in items:

            # Only fetch the label page if this item is new to us.
            # Items like "Scrambled Eggs" appear nearly every day —
            # no need to re-scrape their nutrition facts each time.
            if rec_num not in item_cache:
                nutrition = get_nutrition_label(item_name, rec_num)
                if nutrition:
                    upload_item_if_new(rec_num, nutrition, item_cache)
                # Delay after each label fetch to avoid hammering the server
                time.sleep(REQUEST_DELAY + random.uniform(0, 0.3))
            else:
                item_cache.add(rec_num)

def run_full_scrape(start_date, end_date):
    """
    Performs a full scrape across a date range.

    Iterates day by day from start_date to end_date inclusive, scraping
    every location for each day.

    Progress is printed to the console for tracking and debugging.
    """
    # item_cache prevents repeat menu items from being added to the database.
    item_cache = set()

    print(f"Starting scrape: from {start_date} to {end_date}\n")

    # Perform a scape for every day within the specified date range
    current = start_date
    while current <= end_date:

        # Dates should be in MM/DD/YYYY format to match the desired URL
        date_str = current.strftime("%m/%d/%Y")
        print(f"{date_str}")

        scrape_day(date_str, item_cache)

        current += timedelta(days=1)

        # Small pause between days 
        time.sleep(0.5)


    print(f"\n✓ Scrape complete.")
    print(f"  Unique items uploaded this run: {len(item_cache)}")

# Only run this if the script is run directly; this begins the entire scraping process
if __name__ == "__main__":
    run_full_scrape(START_DATE, END_DATE)
