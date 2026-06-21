"""
Configuration pytest — backend-pays
Pointe vers src/ qui est un sous-dossier du repo principal.
"""
import sys
import os

# Ajouter src/ au PYTHONPATH pour que main.py, models.py, database.py soient importables
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../src")
sys.path.insert(0, ROOT)
