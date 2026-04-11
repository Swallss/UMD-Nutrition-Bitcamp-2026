import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os
from dotenv import load_dotenv

# Grab the firebase credentials from .env
load_dotenv()
cred = credentials.Certificate(os.getenv("FIREBASE_KEY_PATH"))

# Formatting variables for the URLs to scrape
BASE_URL = "https://nutrition.umd.edu"
LOCATIONS = {
    "SOUTH": 16,
    "Y": 19,
    "251": 51
}
MEALS = ["Breakfast", "Lunch", "Dinner"]

# Be nice to the website :)
REQUEST_DELAY = 0.4
REQUEST_TIMEOUT = 20

