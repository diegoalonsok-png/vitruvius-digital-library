#!/usr/bin/env python3
"""Unit tests: only Greek/Latin scope, no arbitrary publishing cutoffs."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("r2_classics_importer", ROOT / "scripts/r2-importar-clasicos.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class AdmissionTests(unittest.TestCase):
    def edition(self, date, status="", license_url="", size="209715200"):
        meta = {"date": date}
        if status:
            meta["possible-copyright-status"] = status
        if license_url:
            meta["licenseurl"] = license_url
        return {"metadata": meta, "files": [{"name": "edition.pdf", "size": size, "format": "Text PDF"}]}

    def test_modern_openly_licensed_edition_and_large_pdf(self):
        with patch.object(mod, "get", return_value=self.edition(
                "2024", license_url="https://creativecommons.org/licenses/by/4.0/")):
            meta, pdf, year = mod.elegir_pdf("test", 1928, 1)
            self.assertEqual(year, "2024")
            self.assertEqual(pdf["name"], "edition.pdf")

    def test_public_domain_even_if_modern(self):
        with patch.object(mod, "get", return_value=self.edition(
                "2020", status="NOT_IN_COPYRIGHT")):
            self.assertEqual(mod.elegir_pdf("test", 1928, 1)[2], "2020")

    def test_unlicensed_modern_is_not_republished(self):
        with patch.object(mod, "get", return_value=self.edition("2025")):
            with self.assertRaisesRegex(ValueError, "permiso de reutilización"):
                mod.elegir_pdf("test", 1928, 1)

    def test_old_public_domain_without_status(self):
        with patch.object(mod, "get", return_value=self.edition("1910", size="512")):
            self.assertEqual(mod.elegir_pdf("test", 1928, 1)[2], "1910")

    def test_discovery_does_not_filter_year(self):
        seen_urls = []
        def fake_get(url):
            seen_urls.append(url)
            return {"response": {"docs": []}}
        with patch.object(mod, "get", side_effect=fake_get):
            mod.buscar_ia({"creador": "homer", "titulo": ["iliad"], "lengua": "grc"}, 1928)
        self.assertEqual(len(seen_urls), 2)
        self.assertTrue(all("date%3A" not in url for url in seen_urls))

if __name__ == "__main__":
    unittest.main()
