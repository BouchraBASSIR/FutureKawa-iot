import os
import logging
from typing import Dict, List, TypedDict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend-central-config")

class CountryBackend(TypedDict):
    id: str
    name: str
    url: str

def get_configured_countries() -> Dict[str, CountryBackend]:
    """
    Parses configured country backends from system environment variables.
    Supports a flexible comma-separated variable COUNTRIES_CONFIG:
    format: id1:name1:url1,id2:name2:url2
    
    Fallback to individual system variables:
    - COUNTRY_BRESIL_URL
    - COUNTRY_EQUATEUR_URL
    - COUNTRY_COLOMBIE_URL
    """
    countries: Dict[str, CountryBackend] = {}
    
    # Method 1: COUNTRIES_CONFIG env variable (dynamic list)
    countries_config = os.getenv("COUNTRIES_CONFIG")
    if countries_config:
        try:
            # Expected format: bresil:Brésil:http://localhost:8000,equateur:Équateur:http://localhost:8001
            parts = countries_config.split(",")
            for part in parts:
                if not part:
                    continue
                c_id, c_name, c_url = part.split(":", 2)
                countries[c_id.strip()] = {
                    "id": c_id.strip(),
                    "name": c_name.strip(),
                    "url": c_url.strip()
                }
            logger.info(f"Loaded {len(countries)} countries from COUNTRIES_CONFIG environment variable.")
            return countries
        except Exception as e:
            logger.error(f"Error parsing COUNTRIES_CONFIG: {e}. Falling back to default individual variables.")
    
    # Method 2: Fallback to standard individual system environment variables
    # Useful for Docker Compose environments
    fallbacks = [
        ("bresil", "Brésil", "COUNTRY_BRESIL_URL", "http://localhost:8000"),
        ("equateur", "Équateur", "COUNTRY_EQUATEUR_URL", "http://localhost:8001"),
        ("colombie", "Colombie", "COUNTRY_COLOMBIE_URL", "http://localhost:8002")
    ]
    
    for c_id, c_name, env_var, default_url in fallbacks:
        url = os.getenv(env_var, default_url)
        countries[c_id] = {
            "id": c_id,
            "name": c_name,
            "url": url
        }
    
    logger.info(f"Loaded {len(countries)} countries from individual environment variables / defaults.")
    return countries
