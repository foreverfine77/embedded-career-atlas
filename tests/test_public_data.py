from pathlib import Path
import json,re,unittest

ROOT=Path(__file__).resolve().parents[1]

class PublicDataTests(unittest.TestCase):
    def test_public_field_boundary(self):
        rows=json.loads((ROOT/'data/jobs.public.json').read_text('utf-8'))
        allowed={'id','title','company','salary','city','city_detail','direction','intern','experience_label','experienced_post','salary_low_k','salary_high_k','salary_months','annual_low_wan','annual_high_wan','daily_low','daily_high','education','eligibility','tags','notes','description'}
        self.assertTrue(rows)
        self.assertEqual(len(rows),len({r['id'] for r in rows}))
        for r in rows:
            self.assertEqual(set(r),allowed)
            self.assertIn('不是招聘方完整职位原文',r['description'])
            self.assertNotRegex(json.dumps(r,ensure_ascii=False),r'[A-Za-z]:[\\/]|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')
    def test_recomputed_statistics(self):
        rows=json.loads((ROOT/'data/jobs.public.json').read_text('utf-8'))
        stats=json.loads((ROOT/'data/statistics.json').read_text('utf-8'))
        self.assertEqual(sum(stats['cities'].values()),len(rows))
        self.assertEqual(sum(stats['directions'].values()),len(rows))
        self.assertEqual(stats['intern_count'],sum(r['intern'] for r in rows))
        for group in stats['campus_monthly_midpoints']:
            if group['n']<5:self.assertIsNone(group['median_k'])

if __name__=='__main__':unittest.main()
