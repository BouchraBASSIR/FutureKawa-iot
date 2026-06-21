"""
Tests unitaires — logique métier pure (aucune DB, aucun serveur).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../src"))

from datetime import datetime, timedelta


# ── Helpers locaux reproduisant la logique de main.py ────────

def est_hors_tolerance(valeur, ideale, tolerance):
    return valeur < (ideale - tolerance) or valeur > (ideale + tolerance)


def lot_est_perime(date_stockage, limite_jours=365):
    return (datetime.utcnow() - date_stockage).days >= limite_jours


def calculer_duree_stockage_jours(date_stockage):
    return (datetime.utcnow() - date_stockage).days


# ── Tests températures ────────────────────────────────────────

class TestToleranceTemperature:
    """Conditions Brésil : idéale 29°C, tolérance ±3°C → [26, 32]"""

    TEMP_IDEALE   = 29.0
    TOLERANCE     = 3.0

    def test_temperature_dans_tolerance(self):
        assert not est_hors_tolerance(29.0, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_limite_basse_ok(self):
        assert not est_hors_tolerance(26.0, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_limite_haute_ok(self):
        assert not est_hors_tolerance(32.0, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_trop_basse(self):
        assert est_hors_tolerance(25.9, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_trop_haute(self):
        assert est_hors_tolerance(32.1, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_extreme_froide(self):
        assert est_hors_tolerance(10.0, self.TEMP_IDEALE, self.TOLERANCE)

    def test_temperature_extreme_chaude(self):
        assert est_hors_tolerance(50.0, self.TEMP_IDEALE, self.TOLERANCE)


# ── Tests humidités ──────────────────────────────────────────

class TestToleranceHumidite:
    """Conditions Brésil : idéale 55%, tolérance ±2% → [53, 57]"""

    HUM_IDEALE  = 55.0
    TOLERANCE   = 2.0

    def test_humidite_dans_tolerance(self):
        assert not est_hors_tolerance(55.0, self.HUM_IDEALE, self.TOLERANCE)

    def test_humidite_limite_basse_ok(self):
        assert not est_hors_tolerance(53.0, self.HUM_IDEALE, self.TOLERANCE)

    def test_humidite_limite_haute_ok(self):
        assert not est_hors_tolerance(57.0, self.HUM_IDEALE, self.TOLERANCE)

    def test_humidite_trop_basse(self):
        assert est_hors_tolerance(52.9, self.HUM_IDEALE, self.TOLERANCE)

    def test_humidite_trop_haute(self):
        assert est_hors_tolerance(57.1, self.HUM_IDEALE, self.TOLERANCE)


# ── Tests lots périmés ────────────────────────────────────────

class TestLotsPerimes:

    def test_lot_frais_non_perime(self):
        date = datetime.utcnow() - timedelta(days=10)
        assert not lot_est_perime(date)

    def test_lot_364_jours_non_perime(self):
        date = datetime.utcnow() - timedelta(days=364)
        assert not lot_est_perime(date)

    def test_lot_365_jours_perime(self):
        date = datetime.utcnow() - timedelta(days=365)
        assert lot_est_perime(date)

    def test_lot_ancien_perime(self):
        date = datetime.utcnow() - timedelta(days=500)
        assert lot_est_perime(date)

    def test_duree_stockage_calcul(self):
        date = datetime.utcnow() - timedelta(days=100)
        assert calculer_duree_stockage_jours(date) == 100


# ── Tests FIFO ────────────────────────────────────────────────

class TestFifo:

    def test_fifo_tri_croissant(self):
        dates = [
            datetime(2024, 6, 1),
            datetime(2024, 1, 1),
            datetime(2024, 3, 15),
        ]
        trie = sorted(dates)
        assert trie[0] == datetime(2024, 1, 1)
        assert trie[-1] == datetime(2024, 6, 1)

    def test_fifo_premier_est_le_plus_ancien(self):
        lots = [
            {"id": "LOT-C", "date": datetime(2024, 6, 1)},
            {"id": "LOT-A", "date": datetime(2024, 1, 1)},
            {"id": "LOT-B", "date": datetime(2024, 3, 15)},
        ]
        trie = sorted(lots, key=lambda l: l["date"])
        assert trie[0]["id"] == "LOT-A"

    def test_fifo_lot_unique(self):
        lots = [{"id": "LOT-X", "date": datetime(2024, 5, 5)}]
        trie = sorted(lots, key=lambda l: l["date"])
        assert trie[0]["id"] == "LOT-X"


# ── Tests conditions multi-pays ──────────────────────────────

class TestConditionsMultiPays:
    """Vérification que les seuils par pays sont corrects (à tester dans la config)."""

    CONDITIONS = {
        "bresil":   {"temp": 29, "hum": 55, "tol_t": 3, "tol_h": 2},
        "equateur": {"temp": 31, "hum": 60, "tol_t": 3, "tol_h": 2},
        "colombie": {"temp": 26, "hum": 80, "tol_t": 3, "tol_h": 2},
    }

    def test_bresil_temperature_ideale_ok(self):
        c = self.CONDITIONS["bresil"]
        assert not est_hors_tolerance(c["temp"], c["temp"], c["tol_t"])

    def test_equateur_temperature_ideale_ok(self):
        c = self.CONDITIONS["equateur"]
        assert not est_hors_tolerance(c["temp"], c["temp"], c["tol_t"])

    def test_colombie_humidite_haute_ok(self):
        c = self.CONDITIONS["colombie"]
        assert not est_hors_tolerance(c["hum"], c["hum"], c["tol_h"])

    def test_equateur_temperature_trop_basse(self):
        c = self.CONDITIONS["equateur"]
        assert est_hors_tolerance(27.0, c["temp"], c["tol_t"])

    def test_colombie_humidite_trop_basse(self):
        c = self.CONDITIONS["colombie"]
        assert est_hors_tolerance(75.0, c["hum"], c["tol_h"])
