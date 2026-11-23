#!/usr/bin/env python3
"""Regresión: ninguna carga automática elimina libros, versiones o ediciones."""
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
GUARD=ROOT/"scripts/check-bibliotheca-github-metadata-only.py"
spec=importlib.util.spec_from_file_location("vdl_append_only",GUARD)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class NoDeletionPolicy(unittest.TestCase):
    def verify(self,path,old,new):
        with self.assertRaisesRegex(ValueError,"NO SE BORRAN LIBROS"):
            m.forbid_book_deletions(path,old,new)

    def test_catalogued_work_cannot_disappear(self):
        p="data/bibliotheca-graeca-latina-I-bce-I-ce.json"
        self.verify(p,{"works":[{"id":"a"}]},{"works":[]})
        m.forbid_book_deletions(p,{"works":[{"id":"a"}]},{"works":[{"id":"a"},{"id":"b"}]})

    def test_registered_original_or_translation_cannot_disappear(self):
        p="data/classics-corpus/search-registry.json"
        previous={"entries":[{"workId":"a","language":"grc","path":"https://r2/original"},
                             {"workId":"a","language":"en","path":"https://r2/translation"}]}
        self.verify(p,previous,{"entries":previous["entries"][:1]})
        m.forbid_book_deletions(p,previous,{"entries":previous["entries"]})

    def test_r2_originals_and_backups_cannot_disappear(self):
        p="data/r2/classics-expansion-manifest.json"
        old={"editions":[{"workId":"a","language":"grc","url":"https://r2/a"}],
             "githubPreserved":[{"path":"archive/a","sha256":"123","r2Key":"preserved/github/123"}]}
        self.verify(p,old,{"editions":[],"githubPreserved":old["githubPreserved"]})
        self.verify(p,old,{"editions":old["editions"],"githubPreserved":[]})

    def test_r2_translation_cannot_disappear(self):
        p="data/r2/classics-translation-manifest.json"
        old={"editions":[{"workId":"a","language":"en","url":"https://r2/translation"}]}
        self.verify(p,old,{"editions":[]})

    def test_unified_catalogue_cannot_lose_supplementary_book(self):
        p="data/r2/bibliotheca-inventario-unificado.json"
        old={"works":[],"supplementaryWorks":[{"id":"a"}],"additionalWorks":[]}
        self.verify(p,old,{"works":[],"supplementaryWorks":[],"additionalWorks":[]})

    def test_declared_total_cannot_fall(self):
        p="data/cifras-corpus.json"
        self.verify(p,{"obrasTotalesDeclaradas":431},{"obrasTotalesDeclaradas":430})

    def test_no_r2_delete_api_in_acquisition_scripts(self):
        for path in [
            ROOT/"scripts/expand-classics-r2.py",
            ROOT/"scripts/ingest-r2-human-translations.py",
            ROOT/"scripts/publish-r2-expansion-index.py",
        ]:
            source=path.read_text("utf-8")
            for forbidden in (".delete_object(", ".delete_objects("):
                self.assertNotIn(forbidden,source,str(path))


if __name__=="__main__":
    unittest.main()
