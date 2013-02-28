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

import os

from bibfigure_merge import merging_latex_pdf, \
                            create_MARCXML
from invenio.config import CFG_BINDIR, \
                           CFG_PDFPLOTEXTRACTOR_PATH
from invenio.bibdocfile import download_url, safe_mkstemp
from invenio.shellutils import run_shell_command


def extract_plots_from_latex_and_pdf(url_tarball, url_pdf):
    tarball = download_url(url_tarball)
    path, name = os.path.split(url_tarball)
    #run_shell_command('cp ' + tarball + ' ' + tarball + '_arxiv' + name)
    tarball_with_arxiv_extension = tarball + '_arxiv' + name
    os.rename(tarball, tarball_with_arxiv_extension)
    run_shell_command(CFG_BINDIR +'/plotextractor -t ' + tarball_with_arxiv_extension)

    pdf  = download_url(url_pdf)
    run_shell_command(CFG_PDFPLOTEXTRACTOR_PATH + ' ' + pdf)
    
    path, name = os.path.split(tarball_with_arxiv_extension)
    plotextracted_xml_path = tarball_with_arxiv_extension + '_plots/' + name + '.xml'
    plotextracted_pdf_path = pdf + '.extracted/extracted.json'
    
    return plotextracted_xml_path, plotextracted_pdf_path

def extract_plots_from_latex(url_tarball):
    tarball  = download_url(url_tarball)
    path, name = os.path.split(url_tarball)
    tarball += name

    run_shell_command(CFG_BINDIR +'/plotextractor -t ' + tarball)

    path, name = os.path.split(tarball)
    plotextracted_xml_path = tarball + '_plots/' + name + '.xml'
    return plotextracted_xml_path

def extract_plots_from_pdf(url_pdf):
    pdf  = download_url(url_pdf)
    run_shell_command(CFG_PDFPLOTEXTRACTOR_PATH + ' ' + pdf)
    
    plotextracted_pdf_path = pdf + '.extracted/extracted.json'
    return plotextracted_pdf_path

def process_pdf(pdf, id):
    write_message("process pdf")
    (exit_code, output_buffer,stderr_output_buffer) = run_shell_command(CFG_PDFPLOTEXTRACTOR_PATH + ' ' + pdf)
    plotextracted_pdf_path = pdf + ".extracted/extracted.json"
    
    (code, message, dummy, list_of_figures_from_pdf) = getFigureVectors('', plotextracted_pdf_path)
    extracted = pdf + ".extracted"
    # Create MARCXML from json file  
    # @param extracted - output file with the MARCXML  
    marc_path = create_MARCXML(list_of_figures_from_pdf, id, code, extracted, True)
    write_message("end process pdf")
    now = datetime.datetime.now()
    stderr_output_buffer = "[" + str(now) + "]: The Pdf extractor for the file " + pdf + " has an error. The traceback:\n" + stderr_output_buffer
    return (exit_code, stderr_output_buffer, plotextracted_pdf_path, marc_path)
