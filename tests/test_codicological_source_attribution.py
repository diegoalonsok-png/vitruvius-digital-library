"""Regression for catalogue-attributed codicological claims. No images are downloaded."""
import json
import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
DOC=ROOT/"data/classics-corpus/tei-codicology-research-matrix-89.json"
class InstitutionalWitnesses(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads(DOC.read_text(encoding="utf8"))
        cls.by_id={r["witnessId"]:r for r in cls.data["records"]}
    def test_number_and_keys(self):
        self.assertEqual(len(self.by_id),len(self.data["records"]))
        self.assertEqual(len(self.by_id),106)
    def test_clarke_39(self):
        w=self.by_id["plato-clarke-39"]
        self.assertIn("24 diálogos",w["fields"]["text"]["coverage"]["value"])
        for group,key in [("scribal","script"),("scribal","hands"),("paratext","scholia"),("history","origin"),("history","provenance"),("text","coverage")]:
            f=w["fields"][group][key]
            self.assertEqual(f["status"],"institutional_aggregator_verified")
            self.assertTrue(f["sourceUrl"].startswith("https://iiif.biblissima.fr/"))
        self.assertIn("NO incluye República",w["fields"]["text"]["coverage"]["value"])
    def test_cicero_folios_and_lacunae(self):
        a=self.by_id["cicero-de-oratore-harley2736"]
        self.assertIn("ff. 17–24",a["fields"]["text"]["transpositions"]["value"])
        self.assertIn("dos cuadernos",a["fields"]["text"]["lacunae"]["value"])
        b=self.by_id["cicero-catilina-add47678"]
        self.assertIn("ff. 28r–39v",b["fields"]["text"]["coverage"]["value"])
        self.assertIn("imperfectos",b["fields"]["text"]["coverage"]["value"])
        for w in (a,b):
            for group in w["fields"].values():
                for field in group.values():
                    if field["status"]=="institutional_catalogue_verified":
                        self.assertTrue(field.get("sourceUrl",w["repositoryUrl"]).startswith("https://"))
    def test_missing_totals_recomputed(self):
        fields=[f for rec in self.data["records"] for group in rec["fields"].values() for f in group.values()]
        missing=sum(not str(f.get("value") or "").strip() for f in fields)
        self.assertEqual(sum(row["missing"] for row in self.data["globalMissing"]),missing)
        integrity=json.loads((ROOT/"data/academic-integrity.json").read_text(encoding="utf8"))
        self.assertEqual(integrity["codicology"]["pendingFieldSlots"],missing)
        self.assertEqual(integrity["codicology"]["filledFieldSlots"],len(fields)-missing)
if __name__=="__main__":unittest.main()
