# -*- coding: utf-8 -*-
##
## This file is part of Invenio.
## Copyright (C) 2012 CERN.
##
## Invenio is free software; you can redistribute it and/or
## modify it under the terms of the GNU General Public License as
## published by the Free Software Foundation; either version 2 of the
## License, or (at your option) any later version.
##
## Invenio is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
## General Public License for more details.
##
## You should have received a copy of the GNU General Public License
## along with Invenio; if not, write to the Free Software Foundation, Inc.,
## 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.

"""
Refextract task

Sends references to parse through bibsched
"""

import sys
import os
import shutil
from tempfile import mkdtemp, mkstemp
from shutil import rmtree, copyfileobj

from invenio.bibdocfile import BibRecDocs, InvenioWebSubmitFileError
from invenio.shellutils import run_shell_command

from invenio.search_engine_utils import get_fieldvalues
from bibfigure_api import merging_articles, \
                          create_MARCXML
from invenio.bibtask import task_init, \
                            task_set_option, \
                            task_get_option, \
                            write_message
from invenio.config import CFG_VERSION, \
                           CFG_PDFPLOTEXTRACTOR_PATH
# Help message is the usage() print out of how to use Refextract
from invenio.docextract_task import task_run_core_wrapper

HELP_MESSAGE=""
DESCRIPTION=""

def split_ids(value):
    return [c.strip() for c in value.split(',') if c.strip()]


def check_options():
    """ Reimplement this method for having the possibility to check options
    before submitting the task, in order for example to provide default
    values. It must return False if there are errors in the options.
    """
    if not task_get_option('new') and not task_get_option('recids') \
                and not task_get_option('collections'):
        print >>sys.stderr, 'Error: No input file specified, you need' \
            ' to specify which files to run on'
        return False
    return True


def parse_option(key, value, opts, args):
    """ Must be defined for bibtask to create a task """
    if args and len(args) > 0:
        # There should be no standalone arguments for any refextract job
        # This will catch args before the job is shipped to Bibsched
        raise StandardError("Error: Unrecognised argument '%s'." % args[0])

    if key in ('-a', '--new'):
        task_set_option('new', True)
    elif key in ('-c', '--collections'):
        collections = task_get_option('collections')
        if not collections:
            collections = set()
            task_set_option('collections', collections)
        collections.update(split_ids(value))
    elif key in ('-r', '--recids'):
        recids = task_get_option('recids')
        if not recids:
            recids = set()
            task_set_option('recids', recids)
        recids.update(split_ids(value))

    return True


def look_for_fulltext(recid):
    rec_info = BibRecDocs(recid)
    docs = rec_info.list_bibdocs()

    path = False
    for doc in docs:
        try:
            path = doc.get_file('pdf').get_full_path()
        except InvenioWebSubmitFileError:
            try:
                path = doc.get_file('pdfa').get_full_path()
            except InvenioWebSubmitFileError:
                try:
                    path = doc.get_file('PDF').get_full_path()
                except InvenioWebSubmitFileError:
                    continue

    return path

def task_run_core(recid):
    pdf = look_for_fulltext(recid)
    write_message('pdf: %s' % pdf)
    if pdf:
        tmpfd, tmppath = mkstemp(prefix="plotextractor-", suffix=".pdf")
        try:
            # tmpfd is being closed by copyfileobj
            copyfileobj(open(pdf), os.fdopen(tmpfd,'w'))
            (exit_code, output_buffer,stderr_output_buffer) = run_shell_command(CFG_PDFPLOTEXTRACTOR_PATH + ' ' + tmppath)
            plotextracted_pdf_path = tmppath + ".extracted/extracted.json"
            code, output_vector, extracted = merging_articles(None, plotextracted_pdf_path)
        finally:
            os.remove(tmppath)
        try:
            id_fulltext = get_fieldvalues([recid], "037_a")[0]
        except IndexError:
            id_fulltext = ""
        create_MARCXML(output_vector, id_fulltext, code, extracted, write_file=True)
        
#        write_message("-----")
#        write_message (output_vector)
#        write_message("-----")

def main():
    """Constructs the refextract bibtask."""
    # Build and submit the task
    task_init(authorization_action='runbibfigure',
        authorization_msg="BibFigure Task Submission",
        description=DESCRIPTION,
        # get the global help_message variable imported from refextract.py
        help_specific_usage=HELP_MESSAGE,
        version="Invenio v%s" % CFG_VERSION,
        specific_params=("hVv:r:c:",
                            ["help",
                             "version",
                             "verbose=",
                             "recids=",
                             "collections=",
                             "new",
                             "modified"]),
        task_submit_elaborate_specific_parameter_fnc=parse_option,
        task_submit_check_options_fnc=check_options,
        task_run_fnc=task_run_core_wrapper('bibfigure', task_run_core))
