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

testdir = $(libdir)/webtest/invenio

test_DATA = test_bibedit_access_curator_coll.html \
            test_bibedit_access_curator_all.html \
            test_bibedit_access_curator_none.html \
            test_bibedit_basic_record_locking.html \
            test_bibeditold_access_curator_coll.html \
            test_bibeditold_access_curator_all.html \
            test_bibeditold_access_curator_none.html \
            test_bibeditold_basic_record_locking.html \
            test_bibeditold_reedit_warning.html


stylesdir=$(localstatedir)/www/css
styles_DATA = bibedit.css

EXTRA_DIST = $(doc_DATA) $(test_DATA) $(styles_DATA)

CLEANFILES = *~ *.tmp
