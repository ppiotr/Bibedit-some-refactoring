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

"""
HTTP Test web interface. This is the place where to put helpers for
regression tests related to HTTP (or WSGI or SSO).
"""

__revision__ = \
     "$Id$"

__lastupdated__ = """$Date$"""

import cgi
import os
from invenio.config import CFG_SITE_URL, CFG_SITE_LANG, CFG_SITE_NAME, CFG_SITE_NAME_INTL, CFG_SITE_LANGS
from invenio.messages import gettext_set_language
from invenio.webpage import page
from invenio.webuser import getUid
from invenio.webdoc import get_webdoc_parts, get_webdoc_topics
from invenio.webinterface_handler import wash_urlargd, WebInterfaceDirectory
from invenio.urlutils import redirect_to_url

class WebInterfaceHTTPTestPages(WebInterfaceDirectory):
    _exports = ["", "post1", "post2", "sso"]

    def __call__(self, req, form):
        redirect_to_url(req, CFG_SITE_URL + '/httptest/post1')

    index = __call__

    def sso(self, req, form):
        """ For testing single sign-on """
        req.add_common_vars()
        sso_env = {}
        for var, value in req.subprocess_env.iteritems():
            if var.startswith('HTTP_ADFS_'):
                sso_env[var] = value
        out = "<html><head><title>SSO test</title</head>"
        out += "<body><table>"
        for var, value in sso_env.iteritems():
            out += "<tr><td><strong>%s</strong></td><td>%s</td></tr>" % (var, value)
        out += "</table></body></html>"
        return out

    def post1(self, req, form):
        """
        This is used by WSGI regression test, to test if it's possible
        to upload a file and retrieve it correctly.
        """
        if req.method == 'POST':
            if 'file' in form:
                for row in form['file'].file:
                    req.write(row)
            return ''
        else:
            body = """
<form method="post" enctype="multipart/form-data">
<input type="file" name="file" />
<input type="submit" />
</form>"""
        return page("test1", body=body, req=req)

    def post2(self, req, form):
        """
        This is to test L{handle_file_post} function.
        """
        from invenio.webinterface_handler_wsgi_utils import handle_file_post
        from invenio.bibdocfile import stream_file
        if req.method != 'POST':
            body = """<p>Please send a file via POST.</p>"""
            return page("test2", body=body, req=req)
        path, mimetype = handle_file_post(req)
        return  stream_file(req, path, mime=mimetype)
