#!/usr/bin/env python3
"""Exercise a real image-only PDF page through OCR and both search indexes."""
import hashlib
from pathlib import Path
import unittest
import fitz

from classics_ingestion_bundle import pdf_pages, pdf_bundle, reading_index, json_bytes

CONCEPTS = [{"id": "casa", "la": ["domus"], "grc": ["οἶκος"],
             "modern": {"en": ["house"], "es": ["casa"], "fr": ["maison"]}}]


class Ingestion(unittest.TestCase):
    def test_image_only_page_becomes_readable_searchable_and_translatable(self):
        source = fitz.open()
        page = source.new_page()
        page.insert_text((50, 80), "The house is open. DOMUS ET ARCHITECTURA.", fontsize=21)
        image = page.get_pixmap(dpi=180)
        scanned = fitz.open()
        scanned.new_page(width=page.rect.width, height=page.rect.height).insert_image(page.rect, pixmap=image)
        self.assertEqual(scanned[0].get_text(), "")
        pages, methods = pdf_pages(scanned, "en", "en")
        self.assertIn("house", pages[0].lower())
        self.assertIn("Tesseract OCR", methods[0]["method"])
        text, index = pdf_bundle("fixture", pages, methods, "a" * 64, CONCEPTS)
        self.assertEqual(index["literal"]["house"][1], [1])
        self.assertEqual(index["semantic"]["casa"], [1])
        self.assertEqual(index["textSha256"], hashlib.sha256(json_bytes(text)).hexdigest())
        self.assertEqual(text["paginas"][0], pages[0], "The full digital page, used by the translation pane, is retained")
        scanned.close()
        source.close()

    def test_empty_text_never_becomes_a_searchable_edition(self):
        with self.assertRaises(ValueError):
            reading_index("empty", [(1, "")], CONCEPTS, "a" * 64)

    def test_semantic_candidates_keep_actual_edition_anchors(self):
        index = reading_index("tei", [("1.1", "domus"), ("2.3", "οἶκος")], CONCEPTS, "b" * 64, "tei")
        self.assertEqual(index["semantic"]["casa"], ["1.1", "2.3"])
        self.assertEqual(index["anchorKind"], "edition-locus")


if __name__ == "__main__":
    unittest.main()
