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

kbdir = $(sysconfdir)/bibconvert/KB
kb_DATA = entdec-to-latin1.kb entdec-to-utf8.kb \
          enthex-to-latin1.kb enthex-to-utf8.kb

bfxdir = $(sysconfdir)/bibconvert/config
bfx_DATA = oaidc2marcxml.bfx

xsldir = $(sysconfdir)/bibconvert/config
xsl_DATA = oaidc2marcxml.xsl oaimarc2marcxml.xsl oaiarxiv2marcxml.xsl

EXTRA_DIST = $(kb_DATA) $(bfx_DATA) $(xsl_DATA)

CLEANFILES = *~ *.tmp
