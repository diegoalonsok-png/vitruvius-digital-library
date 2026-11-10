"""Regression tests for the self-auditing manuscript discovery pipeline."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
MOD = ROOT / "scripts/codicology_auditor.py"
spec = importlib.util.spec_from_file_location("codicology_auditor", MOD)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class CodicologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = audit.read(audit.CATALOG)
        cls.registry = audit.read(audit.WITNESSES)
        cls.by_id = {x["id"]: x for x in cls.catalog["works"]}

    def test_catalogue_222_unique(self):
        self.assertEqual(len(self.catalog["works"]), 222)
        self.assertEqual(len(self.by_id), 222)

    def test_every_witness_assigned_to_real_work(self):
        self.assertEqual(len({x["id"] for x in self.registry["records"]}),
                         len(self.registry["records"]))
        for witness in self.registry["records"]:
            self.assertTrue(witness["workIds"])
            for work_id in witness["workIds"]:
                self.assertIn(work_id, self.by_id)

    def test_odyssey_is_not_iliad(self):
        odyssey = self.by_id["homer-odyssey"]
        self.assertEqual(audit.title_match(odyssey, "Homeri Ilias — manuscript"),
                         "contradiction")
        self.assertEqual(audit.title_match(odyssey, "Homeri Odyssea — Plut. 32.24"),
                         "plausible")

    def test_papyrus_translation_is_not_automatic_greek(self):
        didache = self.by_id["didache"]
        record = {"id": "dummy", "title": "Didache — Coptic papyrus",
                  "shelfmark": "Or. 9271", "library": "British Library",
                  "language": "cop", "date": "s. IV", "coverage": "Did. 10–12",
                  "record": "https://www.loc.gov/item/test/"}
        problems = audit.audit_witness(didache, record)
        self.assertIn("language_mismatch_unclassified", [x["code"] for x in problems])
        record["witnessKind"] = "ancient_translation_coptic"
        problems = audit.audit_witness(didache, record)
        self.assertNotIn("language_mismatch_unclassified", [x["code"] for x in problems])

    def test_untrusted_links_cannot_validate(self):
        self.assertFalse(audit.trusted("http://www.loc.gov/item/1"))
        self.assertFalse(audit.trusted("https://loc.gov.evil.example/item/1"))
        self.assertTrue(audit.trusted("https://www.loc.gov/item/00279389694-jo/"))

    def test_metadata_manifest_requires_canvases(self):
        obj = {"status": "ok", "data": {"type": "Manifest", "label": "Odyssey"}}
        issues = audit.review_manifest(self.by_id["homer-odyssey"],
                                       {"shelfmark": "Plut. 32.24"}, obj)
        self.assertIn("iiif_has_no_canvas", [x["code"] for x in issues])

    def test_independent_auditor_quarantines_keyword_hit(self):
        x = {"workId": "homer-odyssey",
             "candidateTitle": "Homeri Odyssea", "provider": "Library of Congress",
             "source": "https://www.loc.gov/item/00279389694-jo/"}
        with patch.object(audit, "fetch_json_metadata", side_effect=AssertionError("no network")):
            review = audit.independent_guard([x], self.by_id)
        self.assertEqual(review[0]["secondPass"]["status"],
                         "quarantined_for_human_review")
        self.assertIn("institutional_shelfmark_missing",
                      review[0]["secondPass"]["objections"])

    def test_all_222_reports_are_read_only_and_offline(self):
        with patch.object(audit, "fetch_json_metadata", side_effect=AssertionError("offline audit used network")):
            result = audit.build_report(self.catalog, self.registry, live=False)
        self.assertEqual(result["summary"]["catalogueWorks"], 222)
        self.assertEqual(len(result["works"]), 222)
        self.assertEqual(result["quarantine"], [])
        self.assertEqual(result["summary"]["registryManuscripts"],
                         len(self.registry["records"]))

    def test_odyssey_three_folio_viewers(self):
        matches = [x for x in self.registry["records"]
                   if "homer-odyssey" in x["workIds"]]
        self.assertGreaterEqual(len(matches), 3)
        self.assertTrue(any("Plut. 32.24" in x["shelfmark"] for x in matches))
        self.assertTrue(all(x.get("viewer") and x.get("record") for x in matches))

    def test_no_storage_of_codex_images(self):
        # Tool only writes small structured reports; the registry stays untouched.
        import inspect
        src = inspect.getsource(audit)
        self.assertNotIn("image.save(", src)
        self.assertNotIn("save_image(", src)
        self.assertNotIn("read_image(", src)


if __name__ == "__main__":
    unittest.main()
