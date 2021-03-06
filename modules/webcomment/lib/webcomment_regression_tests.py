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

"""WebComment Regression Test Suite."""

__revision__ = "$Id$"

import unittest

from invenio.config import CFG_SITE_URL
from invenio.testutils import make_test_suite, run_test_suite, \
                              test_web_page_content, merge_error_messages

class WebCommentWebPagesAvailabilityTest(unittest.TestCase):
    """Check WebComment web pages whether they are up or not."""

    def test_your_baskets_pages_availability(self):
        """webcomment - availability of comments pages"""

        baseurl = CFG_SITE_URL + '/record/10/comments/'

        _exports = ['', 'display', 'add', 'vote', 'report']

        error_messages = []
        for url in [baseurl + page for page in _exports]:
            error_messages.extend(test_web_page_content(url))
        if error_messages:
            self.fail(merge_error_messages(error_messages))
        return

    def test_webcomment_admin_interface_availability(self):
        """webcomment - availability of WebComment Admin interface pages"""

        baseurl = CFG_SITE_URL + '/admin/webcomment/webcommentadmin.py/'

        _exports = ['', 'comments', 'delete', 'users']

        error_messages = []
        for url in [baseurl + page for page in _exports]:
            # first try as guest:
            error_messages.extend(test_web_page_content(url,
                                                        username='guest',
                                                        expected_text=
                                                        'Authorization failure'))
            # then try as admin:
            error_messages.extend(test_web_page_content(url,
                                                        username='admin'))
        if error_messages:
            self.fail(merge_error_messages(error_messages))
        return

    def test_webcomment_admin_guide_availability(self):
        """webcomment - availability of WebComment Admin Guide"""
        self.assertEqual([],
                         test_web_page_content(CFG_SITE_URL + '/help/admin/webcomment-admin-guide',
                                               expected_text="WebComment Admin Guide"))
        return

    def test_webcomment_mini_review_availability(self):
        """webcomment - availability of mini-review panel on detailed record page"""
        url = CFG_SITE_URL + '/record/12'
        error_messages = test_web_page_content(url,
                                               expected_text="(Not yet reviewed)")

TEST_SUITE = make_test_suite(WebCommentWebPagesAvailabilityTest)

if __name__ == "__main__":
    run_test_suite(TEST_SUITE, warn_user=True)
