"""Regression coverage for public remote editions and repeated source segments."""
import hashlib
import importlib.util
import io
import unittest
from unittest.mock import patch
from pathlib import Path

spec=importlib.util.spec_from_file_location('coverage',Path(__file__).with_name('audit-classics-coverage.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class CoverageSourceTests(unittest.TestCase):
    def setUp(self):
        self.raw=b'{"workId":"fixture","language":"grc","passages":[{"locus":"1","text":"alpha"}]}'
        self.entry={'workId':'fixture','language':'grc','path':'https://libros.vitruvius-digital-library.org/corpus/fixture-grc.json'}
        self.manifest={'base':'https://libros.vitruvius-digital-library.org/corpus/','obras':[{'archivo':'fixture-grc.json','workId':'fixture','language':'grc','sha256':hashlib.sha256(self.raw).hexdigest()}]}
    def test_remote_object_is_not_a_local_missing_path(self):
        with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(self.raw)):
            raw,state=module.source_bytes(self.entry,self.manifest)
        self.assertEqual(raw,self.raw);self.assertEqual(state,'remote_verified')
    def test_changed_remote_bytes_are_rejected(self):
        with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(b'changed')):
            with self.assertRaisesRegex(ValueError,'fingerprint changed'):module.source_bytes(self.entry,self.manifest)
    def test_unknown_remote_host_is_not_fetched(self):
        with patch.object(module.urllib.request,'urlopen') as fetch:
            with self.assertRaises(ValueError):module.source_bytes({**self.entry,'path':'https://example.org/source.json'},self.manifest)
            fetch.assert_not_called()
    def test_offline_never_claims_live_verification(self):
        self.assertEqual(module.source_bytes(self.entry,self.manifest,True),(None,'remote_declared_unchecked'))
    def test_preserve_distinct_consecutive_fragments(self):
        passages=[{'locus':'1','text':'alpha'},{'locus':'1','text':'beta'},{'locus':'2','text':'gamma'}]
        groups,errors=module.locus_segments(passages,'text')
        self.assertEqual(groups,[{'locus':'1','segments':2}]);self.assertEqual(errors,[]);self.assertEqual(len(passages),3)
    def test_reused_nonconsecutive_identifier_is_rejected(self):
        _,errors=module.locus_segments([{'locus':'1','text':'alpha'},{'locus':'2','text':'beta'},{'locus':'1','text':'gamma'}],'text')
        self.assertEqual(errors,['1'])
    def test_identical_duplicate_text_is_rejected(self):
        _,errors=module.locus_segments([{'locus':'1','text':'alpha'},{'locus':'1','text':'alpha'}],'text')
        self.assertEqual(errors,['1'])


reader_spec=importlib.util.spec_from_file_location('indexer',Path(__file__).with_name('indexar-perseus-lote.py'))
indexer=importlib.util.module_from_spec(reader_spec);reader_spec.loader.exec_module(indexer)

class ReaderEditionTests(unittest.TestCase):
    def test_supplied_reader_keeps_locus_query_and_anchor(self):
        from urllib.parse import parse_qs,urlsplit
        url=indexer.lector_edicion('classics-text-reader.html?work=old&locus=1.2&q=logos#passages','clement-2','grc')
        parts=urlsplit(url);params=parse_qs(parts.query)
        self.assertEqual(params,{'work':['clement-2'],'lang':['grc'],'locus':['1.2'],'q':['logos']});self.assertEqual(parts.fragment,'passages')
    def test_new_reader_always_identifies_language(self):
        self.assertIn('lang=la',indexer.lector_edicion(None,'vitruvius','la'))

if __name__=='__main__':unittest.main()
