#!/usr/bin/env python3
"""Test loader installation without altering historic source editions."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
spec = importlib.util.spec_from_file_location("sitewide", HERE.parent / "install-sitewide-i18n.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SitewideLanguageTests(unittest.TestCase):
    def test_injection_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "test.html").write_text("<!doctype html><html lang='es'><head></head><body>Buscar</body></html>")
            before = module.ROOT
            module.ROOT = root
            try:
                self.assertEqual(module.scan_and_patch(root / "test.html"), "linked")
                self.assertEqual(module.scan_and_patch(root / "test.html"), "already-linked")
                result = (root / "test.html").read_text()
                self.assertEqual(result.count("assets/ui-idioma.js"), 1)
                self.assertIn("Buscar", result)
            finally:
                module.ROOT = before

    def test_protect_classical_latin(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "source.html").write_text("<html lang='la'><head></head><body>De architectura</body></html>")
            before = module.ROOT
            module.ROOT = root
            try:
                self.assertEqual(module.scan_and_patch(root / "source.html"), "protected-source")
                self.assertNotIn("ui-idioma", (root / "source.html").read_text())
            finally:
                module.ROOT = before

    def test_nested_asset_path(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            inner=root/"tools"
            inner.mkdir()
            (inner/"page.html").write_text("<html lang='es'><head></head></html>")
            before=module.ROOT
            module.ROOT=root
            try:
                self.assertEqual(module.scan_and_patch(inner/"page.html"),"linked")
                self.assertIn('../assets/ui-idioma.js', (inner/"page.html").read_text())
            finally:
                module.ROOT=before

if __name__=="__main__":
    unittest.main()
