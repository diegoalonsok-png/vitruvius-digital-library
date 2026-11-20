#!/usr/bin/env python3
"""Extraction must preserve source order, short fragments and editorial identity."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location("expansion",Path(__file__).with_name("expand-classics-r2.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
C={"id":"tlg0001.tlg001","title":"Δοκιμή","author":"Test","language":"grc","original":"https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0001/tlg001/tlg0001.tlg001.perseus-grc1.xml"}
def tei(body,licence=True,lang="grc",urn="urn:cts:greekLit:tlg0001.tlg001.perseus-grc1"):
    return f'''<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title xml:lang="grc">Δοκιμή</title><author>Test</author><editor>Editor</editor></titleStmt><publicationStmt><availability>{'<licence target="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</licence>' if licence else ''}</availability></publicationStmt><sourceDesc><bibl><title>Edition</title><editor>Editor</editor><imprint><date>1900</date></imprint></bibl></sourceDesc></fileDesc></teiHeader><text><body><div type="edition" n="{urn}" xml:lang="{lang}">{body}</div></body></text></TEI>'''.encode()

class CtsDeduplication(unittest.TestCase):
    def test_cts_edition_urn_exposes_underlying_work_code(self):
        import re
        pattern=r"urn:cts:(?:greekLit|latinLit):([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\."
        for urn,expected in [
            ("urn:cts:greekLit:tlg0385.tlg001.perseus-grc2","tlg0385.tlg001"),
            ("urn:cts:latinLit:phi0119.phi001.perseus-lat2","phi0119.phi001"),
        ]:
            match=re.search(pattern,urn)
            self.assertIsNotNone(match)
            self.assertEqual(match.group(1),expected)

class EditorialPriority(unittest.TestCase):
    def test_foundational_before_major_before_other(self):
        samples = [
            {"workId":"a", "author":"Homer", "existing":False},
            {"workId":"b", "author":"Euclides", "existing":False},
            {"workId":"c", "author":"Autor secundario", "existing":False},
        ]
        self.assertEqual([m.editorial_priority(x) for x in samples], [1,2,3])
        self.assertEqual(len(m.choose_priority_batch(samples,12,0)),3)

    def test_round_robin_without_duplicates(self):
        samples=[{"workId":str(i),"author":"Homero","existing":False} for i in range(24)]
        a=m.choose_priority_batch(samples,12,0)
        b=m.choose_priority_batch(samples,12,1)
        self.assertEqual(len(a),12)
        self.assertEqual(len({r["workId"] for r in a}),12)
        self.assertNotEqual([r["workId"] for r in a],[r["workId"] for r in b])

class Extraction(unittest.TestCase):
    def test_mixed_prose_verse_no_notes_no_double_choice(self):
        raw=tei('<div n="1"><head>Τίτλος</head><p>Ὁ λόγος <note>NOT AUTHORIAL</note><choice><sic>WRONG</sic><corr>ἀληθής</corr></choice>.</p><lg><l n="1">πρῶτος στίχος</l><l n="2">δεύτερος στίχος</l></lg><p>τέλος.</p></div>')
        meta,ps=m.extract(raw,C);text=' '.join(p['text'] for p in ps)
        self.assertEqual([p['text'] for p in ps],['Τίτλος','Ὁ λόγος ἀληθής.','πρῶτος στίχος δεύτερος στίχος','τέλος.'])
        self.assertNotIn('NOT AUTHORIAL',text);self.assertNotIn('WRONG',text)
        self.assertEqual(meta['editors'],['Editor']);self.assertTrue(meta['editionUrn'].endswith('grc1'))
    def test_short_original_is_not_discarded(self):
        _,ps=m.extract(tei('<p>λόγος ἀληθής ἐστι.</p>'),C)
        self.assertEqual(len(ps),1);self.assertIn('λόγος',ps[0]['text'])
    def test_structural_raw_text_and_tail_stay_in_source_order(self):
        _,ps=m.extract(tei('ἀρχή<div n="1"><p>μέσον κείμενον.</p></div>τελευτή'),C)
        self.assertEqual([p['text'] for p in ps],['ἀρχή','μέσον κείμενον.','τελευτή'])
    def test_apparatus_not_indexed_as_original(self):
        _,ps=m.extract(tei('<p>λέγει <app><lem>ἀληθῶς</lem><rdg wit="#x">FALSE</rdg></app> ὁ συγγραφεύς.</p>'),C)
        self.assertIn('ἀληθῶς',ps[0]['text']);self.assertNotIn('FALSE',ps[0]['text'])
    def test_no_guessed_licence_language_or_urn(self):
        for raw in [tei('<p>κείμενον δοκιμαστικόν.</p>',False),tei('<p>κείμενον δοκιμαστικόν.</p>',lang='lat'),tei('<p>κείμενον δοκιμαστικόν.</p>',urn='urn:cts:greekLit:tlg9999.tlg999.perseus-grc1')]:
            with self.assertRaises(ValueError):m.extract(raw,C)
    def test_unknown_entities_fail_without_dropping_text(self):
        with self.assertRaises((ValueError,m.ET.ParseError)):m.extract(tei('<p>κείμενον &unknown; δοκιμαστικόν.</p>'),C)
    def test_no_arbitrary_fetch(self):
        for url in ['https://example.org/text.xml','http://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/a/b/c.xml','https://raw.githubusercontent.com/untrusted/repo/master/data/a/b.xml']:
            with self.assertRaises(ValueError):m.source_url(url)
    def test_duplicate_division_numbers_are_explicitly_distinguished(self):
        _,ps=m.extract(tei('<div n="1"><p>πρῶτον κείμενον.</p></div><div n="1"><p>δεύτερον κείμενον.</p></div>'),C)
        self.assertEqual(len({p['locus'] for p in ps}),2)
        self.assertTrue(all('no locus canónico' in p['locusKind'] for p in ps))

if __name__=='__main__':unittest.main()
