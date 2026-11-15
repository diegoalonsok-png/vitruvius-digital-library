"""Reuse the existing legacy TEI normalization, with no network DTD lookup."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("mass_index", Path(__file__).with_name("mass-index-classics.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
normalize_tei = module.normalize_legacy_perseus_tei
