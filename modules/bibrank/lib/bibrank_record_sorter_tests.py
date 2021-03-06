# -*- coding: utf-8 -*-
##
## This file is part of CDS Invenio.
## Copyright (C) 2002, 2003, 2004, 2005, 2006, 2007, 2008 CERN.
##
## CDS Invenio is free software; you can redistribute it and/or
## modify it under the terms of the GNU General Public License as
## published by the Free Software Foundation; either version 2 of the
## License, or (at your option) any later version.
##
## CDS Invenio is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
## General Public License for more details.
##
## You should have received a copy of the GNU General Public License
## along with CDS Invenio; if not, write to the Free Software Foundation, Inc.,
## 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.

"""Unit tests for the ranking engine."""

__revision__ = "$Id$"

import unittest

from invenio import bibrank_record_sorter
from invenio.search_engine import HitSet
from invenio.testutils import make_test_suite, run_test_suite

class TestListSetOperations(unittest.TestCase):
    """Test list set operations."""

    def test_record_sorter(self):
        """bibrank record sorter - sorting records"""
        hitset = HitSet()
        hitset += (1,2,5)
        hitset2 = HitSet()
        hitset2.add(5)
        rec_termcount = {1: 1, 2: 1, 5: 1}
        (res1, res2) = bibrank_record_sorter.sort_record_relevance({1: 50, 2:30, 3:70,4:10},rec_termcount,hitset, 50,0)
        self.assertEqual(([(1, 71), (3, 100)], list(hitset2)), (res1, list(res2)))

    def test_calculate_record_relevance(self):
        """bibrank record sorter - calculating relevances"""
        hitset = HitSet()
        hitset += (1,2,5)
        self.assertEqual(({1: 7, 2: 7, 5: 5}, {1: 1, 2: 1, 5: 1}),  bibrank_record_sorter.calculate_record_relevance(("testterm", 2.0),
{"Gi":(0, 50.0), 1: (3, 4.0), 2: (4, 5.0), 5: (1, 3.5)}, hitset, {}, {}, 0, None))

TEST_SUITE = make_test_suite(TestListSetOperations,)

if __name__ == "__main__":
    run_test_suite(TEST_SUITE)
