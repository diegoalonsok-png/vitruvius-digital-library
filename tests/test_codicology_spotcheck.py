"""Weekly codicology audit tests: no HTTP needed."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "codicology_spotcheck", ROOT / "scripts/codicology_spotcheck.py")
weekly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weekly)
base = weekly.base


class WeeklyCodicologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = base.read(base.CATALOG)
        cls.registry = base.read(base.WITNESSES)

    def test_twenty_four_works_unchanged(self):
        self.assertEqual(len(self.catalog["works"]), 222)

    def test_weekly_sample_rotates_without_network(self):
        with patch.object(weekly, "probe_head", side_effect=AssertionError("must be offline")):
            w0 = weekly.review_batch(self.catalog, self.registry,
                                     week=0, batch_size=12, remote=False)
            w1 = weekly.review_batch(self.catalog, self.registry,
                                     week=1, batch_size=12, remote=False)
        self.assertEqual(w0["summary"]["witnessesReviewed"], 12)
        self.assertEqual(w1["summary"]["witnessesReviewed"], 12)
        self.assertNotEqual(
            w0["rotation"]["selectedWitnesses"],
            w1["rotation"]["selectedWitnesses"])

    def test_all_witnesses_eventually_visited(self):
        # LCM rotation over 16 weeks for 64 witnesses, or enough for any count.
        seen = set()
        for week in range(len(self.registry["records"]) * 2):
            report = weekly.review_batch(self.catalog, self.registry,
                                         week=week, batch_size=12, remote=False)
            seen.update(report["rotation"]["selectedWitnesses"])
        self.assertEqual(seen, {r["id"] for r in self.registry["records"]})

    def test_http_denial_is_not_proof_of_bad_manuscript(self):
        from urllib.error import HTTPError
        with patch.object(weekly, "urlopen",
                          side_effect=HTTPError("https://digi.vatlib.it/view/test",
                                                403, "forbidden", None, None)):
            data = weekly.probe_head("https://digi.vatlib.it/view/test")
        self.assertEqual(data["status"], "access_indeterminate")

    def test_metadata_only_review_does_not_edit_catalogue(self):
        import json
        before = json.dumps(self.registry, sort_keys=True, ensure_ascii=False)
        weekly.review_batch(self.catalog, self.registry, week=0, remote=False)
        after = json.dumps(self.registry, sort_keys=True, ensure_ascii=False)
        self.assertEqual(before, after)

    def test_false_language_classification_is_flagged(self):
        work = {"id": "homer-odyssey", "language": "grc", "title": "Ὀδύσσεια"}
        witness = {"id": "wrong", "workIds": ["homer-odyssey"],
                   "title": "Homeri Odyssea", "language": "la",
                   "library": "Fictitious", "shelfmark": "MS 1",
                   "date": "s. XII", "coverage": "I", "record": "https://www.loc.gov/item/1"}
        rec = weekly.verify_record(work, witness, remote=False)
        self.assertIn("direct_witness_language_disagreement",
                      [e["code"] for e in rec["findings"]])
        self.assertEqual(rec["conclusion"], "blocking_record_issue")


if __name__ == "__main__":
    unittest.main()
