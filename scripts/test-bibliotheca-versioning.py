#!/usr/bin/env python3
"""Pruebas sin red: dos ediciones de igual obra/autor/idioma coexisten sin reemplazos."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]

def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/filename)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

originals=module("vdl_originals_versions","expand-classics-r2.py")
translations=module("vdl_translation_versions","ingest-r2-human-translations.py")
guard=module("vdl_immutable_policy","check-bibliotheca-github-metadata-only.py")

def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False),encoding="utf-8")

def read(path):
    return json.loads(path.read_text("utf-8"))

class SameWorkMultipleVersions(unittest.TestCase):
    def test_two_greek_editions_keep_old_source_and_one_work_id(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            cat=root/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
            reg=root/"data/classics-corpus/search-registry.json"
            manifest=root/"data/r2/classics-expansion-manifest.json"
            old_url="https://libros.vitruvius-digital-library.org/corpus/known-grc-old.json"
            new_url="https://libros.vitruvius-digital-library.org/corpus/known-grc-new.json"
            old_work={"id":"known","author":"Autor clásico","title":"Obra clásica","language":"grc",
                "corpusFiles":{"grc":old_url},
                "localVersions":[{"language":"grc","path":old_url}],
                "indexedEdition":{"url":old_url}}
            old_cat={"works":[old_work]}
            old_reg={"schema":"vitruvia-classics-search-registry-v1","count":1,"works":1,
                     "entries":[{"workId":"known","language":"grc","path":old_url,
                                 "format":"json-passages","sha256":"abc"}]}
            old_manifest={"schema":"vdl-classics-expansion-manifest-v1",
                 "editions":[{"workId":"known","language":"grc","url":old_url,
                              "sha256":"abc","sources":[{"editionUrn":"urn:cts:greekLit:tlg0001.tlg001.perseus-grc1"}]}],
                 "githubPreserved":[]}
            for p,d in ((cat,old_cat),(reg,old_reg),(manifest,old_manifest)):write(p,d)
            report={"published":[{
                "workId":"known","author":"Autor clásico","title":"Obra clásica",
                "language":"grc","url":new_url,"filename":"known-grc-new.json",
                "sha256":"def","passages":10,"characters":600,"bytes":1800,
                "sources":[{"editionUrn":"urn:cts:greekLit:tlg0001.tlg001.perseus-grc2"}],
                "existing":True,"dating":"Antigüedad"}],"generated":"2026-11-22T00:00:00Z",
                "discovery":{},"deferred":[],"githubPreserved":[]}
            staging=root/"staging"
            write(staging/"prepared.json",report)
            write(staging/"index-descriptor.json",{"works":2,"passages":12})
            originals.finalize(staging,root=root)
            fresh_cat=read(cat)
            fresh_reg=read(reg)
            fresh_manifest=read(manifest)
            self.assertEqual(len(fresh_cat["works"]),1)
            self.assertEqual(fresh_cat["works"][0]["corpusFiles"]["grc"],old_url)
            self.assertEqual(fresh_cat["works"][0]["indexedEdition"]["url"],old_url)
            self.assertEqual({v["path"] for v in fresh_cat["works"][0]["localVersions"]},{old_url,new_url})
            self.assertEqual(len(fresh_reg["entries"]),2)
            self.assertEqual(len(fresh_manifest["editions"]),2)
            guard.forbid_book_deletions(
                "data/bibliotheca-graeca-latina-I-bce-I-ce.json",old_cat,fresh_cat)
            guard.forbid_book_deletions(
                "data/classics-corpus/search-registry.json",old_reg,fresh_reg)
            guard.forbid_book_deletions(
                "data/r2/classics-expansion-manifest.json",old_manifest,fresh_manifest)

    def test_two_english_translations_keep_default_and_both_urns(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            cat=root/"catalogue.json"
            reg=root/"registry.json"
            manifest=root/"translation-manifest.json"
            stage=root/"staging"
            old_url="https://libros.vitruvius-digital-library.org/corpus/known-en-first.json"
            new_url="https://libros.vitruvius-digital-library.org/corpus/known-en-second.json"
            old_urn="urn:cts:greekLit:tlg0001.tlg001.perseus-eng2"
            new_urn="urn:cts:greekLit:tlg0001.tlg001.perseus-eng4"
            old_work={"id":"known","author":"Autor clásico","title":"Obra clásica","language":"grc",
                      "corpusFiles":{"en":old_url},
                      "localVersions":[{"language":"en","path":old_url,"sourceUrn":old_urn}],
                      "humanTranslations":[{"language":"en","url":old_url,"sourceUrn":old_urn}]}
            old_cat={"works":[old_work]}
            old_reg={"entries":[{"workId":"known","language":"en","path":old_url,
                                 "format":"json-passages","sha256":"first"}],"count":1,"works":1}
            old_manifest={"schema":"vdl-classics-translation-manifest-v1",
                "editions":[{"workId":"known","language":"en","url":old_url,
                             "sourceUrn":old_urn,"sha256":"first"}]}
            for p,d in ((cat,old_cat),(reg,old_reg),(manifest,old_manifest)):write(p,d)
            write(stage/"published.json",{"published":[{
                "workId":"known","author":"Autor clásico","title":"Obra clásica",
                "language":"en","url":new_url,"sourceUrn":new_urn,
                "sha256":"second","passages":25,"translators":["Another Translator"],
                "publicationYear":1905,"license":["https://creativecommons.org/licenses/by-sa/4.0/"],
                "indexUrl":"https://libros.vitruvius-digital-library.org/corpus/indice/traducciones/new.json"
            }],"deferred":[]})
            old_settings=(translations.BASE,translations.CATALOGUE,translations.REGISTRY,translations.MANIFEST)
            try:
                translations.BASE=stage
                translations.CATALOGUE=cat
                translations.REGISTRY=reg
                translations.MANIFEST=manifest
                translations.finalize()
            finally:
                (translations.BASE,translations.CATALOGUE,translations.REGISTRY,translations.MANIFEST)=old_settings
            fresh_cat=read(cat)
            fresh_reg=read(reg)
            fresh_manifest=read(manifest)
            self.assertEqual(len(fresh_cat["works"]),1)
            self.assertEqual(fresh_cat["works"][0]["corpusFiles"]["en"],old_url)
            self.assertEqual({v["path"] for v in fresh_cat["works"][0]["localVersions"]},{old_url,new_url})
            self.assertEqual({v["sourceUrn"] for v in fresh_cat["works"][0]["humanTranslations"]},{old_urn,new_urn})
            self.assertEqual(len(fresh_reg["entries"]),2)
            self.assertEqual(len(fresh_manifest["editions"]),2)
            guard.forbid_book_deletions(
                "data/bibliotheca-graeca-latina-I-bce-I-ce.json",old_cat,fresh_cat)
            guard.forbid_book_deletions(
                "data/classics-corpus/search-registry.json",old_reg,fresh_reg)
            guard.forbid_book_deletions(
                "data/r2/classics-translation-manifest.json",old_manifest,fresh_manifest)


if __name__=="__main__":
    unittest.main()
