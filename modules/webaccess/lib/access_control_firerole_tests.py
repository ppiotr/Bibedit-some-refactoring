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

"""Unit tests for the access_control_firerole library."""

__revision__ = "$Id$"

import unittest

from invenio.access_control_firerole import compile_role_definition, \
    serialize, deserialize, acc_firerole_check_user
from invenio.access_control_config import InvenioWebAccessFireroleError, \
        CFG_ACC_EMPTY_ROLE_DEFINITION_SER
from invenio.testutils import make_test_suite, run_test_suite

class AccessControlFireRoleTest(unittest.TestCase):
    """Test functions related to the firewall like role definitions."""

    def setUp(self):
        """setting up helper variables for tests"""
        self.user_info = {'email' : 'foo.bar@cern.ch',
            'group' : ['patata', 'cetriolo'], 'remote_ip' : '127.0.0.1'}

    def test_compile_role_definition_empty(self):
        """firerole - compiling empty role definitions"""
        self.assertEqual(compile_role_definition(None),
            deserialize(CFG_ACC_EMPTY_ROLE_DEFINITION_SER))

    def test_compile_role_definition_allow_any(self):
        """firerole - compiling allow any role definitions"""
        self.failUnless(serialize(compile_role_definition("allow any")))

    def test_compile_role_definition_deny_any(self):
        """firerole - compiling deny any role definitions"""
        self.failIf(serialize(compile_role_definition("deny any")))

    def test_compile_role_definition_literal_field(self):
        """firerole - compiling literal field role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow email 'cds.support@cern.ch'")))

    def test_compile_role_definition_not(self):
        """firerole - compiling not role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow not email 'cds.support@cern.ch'")))

    def test_compile_role_definition_group_field(self):
        """firerole - compiling group field role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow groups 'patata'")))

    def test_compile_role_definition_regexp_field(self):
        """firerole - compiling regexp field role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow email /.*@cern.ch/")))

    def test_compile_role_definition_literal_list(self):
        """firerole - compiling literal list role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow email 'cds.support@cern.ch', 'foo.bar@cern.ch'")))

    def test_compile_role_definition_more_rows(self):
        """firerole - compiling more rows role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow email /.*@cern.ch/\nallow groups 'patata' "
            "# a comment\ndeny any")))

    def test_compile_role_definition_complex(self):
        """firerole - compiling complex role definitions"""
        self.failUnless(serialize(compile_role_definition(
            "allow email /.*@cern.ch/\nallow groups 'patata' "
            "# a comment\ndeny remote_ip '127.0.0.0/24'\ndeny any")))

    def test_compile_role_definition_wrong(self):
        """firerole - compiling wrong role definitions"""
        self.assertRaises(InvenioWebAccessFireroleError,
            compile_role_definition, "allow al")
        self.assertRaises(InvenioWebAccessFireroleError,
            compile_role_definition, "fgdfglk  g fgk")

    def test_deserialize(self):
        """firerole - deserializing"""
        self.assertEqual(compile_role_definition("allow any"),
            (True, False, ()))

    def test_firerole_literal_email(self):
        """firerole - firerole core testing literal email matching"""
        self.failUnless(acc_firerole_check_user(self.user_info,
            compile_role_definition("allow email 'cds.support@cern.ch',"
                "'foo.bar@cern.ch'\ndeny any")))

    def test_firerole_regexp_email(self):
        """firerole - firerole core testing regexp email matching"""
        self.failUnless(acc_firerole_check_user(self.user_info,
            compile_role_definition("allow email /.*@cern.ch/\ndeny any")))

    def test_firerole_literal_group(self):
        """firerole - firerole core testing literal group matching"""
        self.failUnless(acc_firerole_check_user(self.user_info,
            compile_role_definition("allow groups 'patata'\ndeny any")))

    def test_firerole_ip_mask(self):
        """firerole - firerole core testing ip mask matching"""
        self.failUnless(acc_firerole_check_user(self.user_info,
            compile_role_definition("allow remote_ip '127.0.0.0/24'"
                "\ndeny any")))

    def test_firerole_non_existant_group(self):
        """firerole - firerole core testing non existant group matching"""
        self.failIf(acc_firerole_check_user(self.user_info,
            compile_role_definition("allow groups 'patat'\ndeny any")))

    def test_firerole_empty(self):
        """firerole - firerole core testing empty matching"""
        self.assertEqual(False, acc_firerole_check_user(self.user_info,
            compile_role_definition(None)))

TEST_SUITE = make_test_suite(AccessControlFireRoleTest,)

if __name__ == "__main__":
    run_test_suite(TEST_SUITE)


