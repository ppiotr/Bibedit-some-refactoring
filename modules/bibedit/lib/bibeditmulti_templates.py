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

"""CDS Invenio Multiple Record Editor Templates."""

__revision__ = "$Id$"

import cgi

from invenio.config import CFG_SITE_URL
from invenio.messages import gettext_set_language


class Template:

    """MultiEdit Templates Class."""

    def __init__(self):
        """Initialize."""
        pass

    def styles(self):
        """Defines the local CSS styles"""

        styles = """
<style type="text/css">
.txtTag {
    width: 34px;
}

.txtInd {
    width: 14px;
}

.txtSubfieldCode {
    width: 14px;
}

.txtValue {
    width: 200px;
}

.msg {
    color:red;
    background-color: #E0ECFF;
    font-style: italic;
}

.tagTableRow {
    background-color: #E0ECFF;
}

.subfieldTableRow {

}

.colFieldTag {
    width: 80px;
}

.colSubfieldCode {
    width: 28px;
}

.colDeleteButton {
    width: 17px;
}

.colActionType{
    width: 150px;
    color: Green;
}

.colAddButton {
    width: 95px;
}

.linkButton {
    text-decoration: underline;
    color: Blue;
    cursor: pointer;
}

.buttonNewField{
    cursor: pointer;
}

.buttonNewSubfield{
    cursor: pointer;
}

.buttonDeleteField{
    cursor: pointer;
}

.buttonDeleteSubfield{
    cursor: pointer
}
.formbutton{
    cursor: pointer;
}

.buttonGoToFirstPage{
    cursor: pointer;
}

.buttonGoToPreviousPage{
    cursor: pointer;
}

.buttonGoToNextPage{
    cursor: pointer;
}

div .boxleft {
    text-align: left;
    margin-left: 2%;
    padding: 3px;
}

#actionsDisplayArea {
    border: solid #C3D9FF;
}

#actionsDisplayArea .header {
    background-color: #C3D9FF;
}

</style>
        """
        return styles

    def page_contents(self, language, collections):
        """Returns HTML representing the MultiEdit page"""

        _ = gettext_set_language(language)

        page_html = """\
<div class="pagebody">
<input type="hidden" value="%(language)s" id="language">

<table width="100%%" cellspacing="6" border="0">
<tr>
    <td>
        <b>%(text_choose_search_criteria)s</b> %(text_search_criteria_explanation)s
    </td>
</tr>
<tr>
    <td>
    <div class="boxleft">
    <b>%(text_search_criteria)s:&nbsp;&nbsp;</b>
    <input type="text" id="textBoxSearchCriteria"  size="46" onkeypress="onEnter(event);"> <br />
    </div>
    <div class="boxleft">
    <b>%(text_filter_collection)s:&nbsp;</b> %(collections)s <br />
    </div>
    <div class="boxleft">
    <b>%(text_output_tags)s:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b>
    <input type="text" id="textBoxOutputTags" value="All tags" size="33" onkeypress="onEnter(event);"> <i>Ex. 100, 700</i> <br/>
    </div>
    <div class="boxleft">
    <input id="buttonTestSearch" value="%(text_test_search)s" type="submit" class="formbutton"></button>
    </div>
    </td>
</tr>
<tr/>
<tr/>
<tr>
    <td align="center">
        %(actions_definition_html)s
     </td>
</tr>
<tr>
    <td>
        <div class="boxleft">
        <input id="buttonPreviewResults" value="%(text_preview_results)s" type="button" class="formbutton"></button>
        <input id="buttonSubmitChanges" value="%(text_submit_changes)s" type="button" class="formbutton"></button>
        </div>
    </td>
</tr>

</table>

<br/>
<div id="preview_area"></div>

</div>

        """% {"language" : language,
             "text_test_search" : _("Search"),
             "text_next_step" : _("Next Step"),
             "text_search_criteria" : _("Search criteria"),
             "text_output_tags" : _("Output tags"),
             "text_filter_collection": _("Filter collection"),
             "text_choose_search_criteria" : _("1. Choose search criteria"),
             "text_search_criteria_explanation" : _("""Specify the criteria you'd like to use for filtering records that will be changed. Use "Search" to see which records would have been filtered using these criteria."""),
             "actions_definition_html" : self._get_actions_definition_html(language),
             "text_preview_results" : _("Preview results"),
             "text_submit_changes" : _("Apply changes"),
             "collections" : self._get_collections(collections),
             }

        return page_html

    def _get_collections(self, collections):
        """ Returns html select for collections"""
        html = "<select id=\"collection\">"
        for collection_name in collections:
            html += '<option value="%(collection_name)s">%(collection_name)s</option>' % {'collection_name': cgi.escape(collection_name)}
        html += "</select>"
        return html

    def _get_actions_definition_html(self, language):
        """Returns the html for definition of actions"""
        _ = gettext_set_language(language)

        html = """
<!-- Area for displaying actions to the users -->

<table id="actionsDisplayArea"  width="100%%" cellspacing="0" >
<col class="colDeleteButton"/>
<col class="colFieldTag"/>
<col class="colDeleteButton"/>
<col class="colSubfieldCode"/>
<col class="colActionType"/>
<col/>
<col class="colAddButton"/>

<tbody><tr class="header"><td colspan="7">
    <b>%(text_define_changes)s</b> %(text_define_changes_explanation)s
</td><tr></tbody>

<tbody class="lastRow" valign="middle"><tr><td colspan="7" align="left">
    <img src="%(site_url)s/img/add.png" class="buttonNewField" alt="Add new"/>
    <span class="buttonNewField linkButton">%(text_define_field)s</span>
</td></tr></tbody>

</table>


<!-- Templates for displaying of actions -->

<table id="displayTemplates" width="100%%" cellspacing="0">
<col class="colDeleteButton"/>
<col class="colFieldTag"/>
<col class="colDeleteButton"/>
<col class="colSubfieldCode"/>
<col class="colActionType"/>
<col/>
<col class="colAddButton"/>

    <!-- Templates for fields -->

<tbody class="templateNewField">
    <tr class="tagTableRow">
        <td/>
        <td>%(text_field)s</td>
        <td /><td colspan="4" />
    </tr>
    <tr class="tagTableRow">
        <td />
        <td>
        <input class="textBoxFieldTag txtTag" type="Text" maxlength="3" /><input class="textBoxFieldInd1 txtInd" type="Text" maxlength="1" /><input class="textBoxFieldInd2 txtInd" type="text" maxlength="1" />
        </td>
        <td />
        <td />
        <td>
        <select class="fieldActionType")">
        <option value="0">%(text_add_field)s</option>
        <option value="1">%(text_delete_field)s</option>
        <option value="2">%(text_update_field)s</option>
        </select>
        </td>
        <td/>
        <td/>
    </tr>
    <tr class="tagTableRow"><td /><td /><td>&nbsp;</td><td /><td colspan="2">
        <input value="%(text_save)s" type="button" id="buttonSaveNewField" class="formbutton"/>
        <input value="%(text_cancel)s" type="button" id="buttonCancelNewField" class="formbutton"/>
    </td><td/></tr>
</tbody>

<tbody class="templateDisplayField" valign="middle">
    <tr class="tagTableRow">
        <td><img src="%(site_url)s/img/delete.png" class="buttonDeleteField" alt="Delete"/></td>
        <td>
            <strong>
                <span class="tag"></span><span class="ind1"></span><span class="ind2"></span>
            </strong>
        </td>
        <td />
        <td />
        <td><span class="action colActionType"></span></td>

        <td align="center">
            <img src="%(site_url)s/img/add.png" class="buttonNewSubfield" alt="Add new"/>
            <span class="buttonNewSubfield linkButton">%(text_define_subfield)s</span>
        </td>
        <td />
    </tr>
    </tbody>

    <!-- Templates for subfields -->

<tbody class="templateDisplaySubfield">
<tr class="subfieldTableRow">
    <td />
    <td />
    <td><img src="%(site_url)s/img/delete.png" class="buttonDeleteSubfield" alt="Delete" /></td>
    <td>$$<span class="subfieldCode">a</span></td>
    <td>
        <span class="action colActionType">%(text_replace_text)s</span>&nbsp;
    </td>
    <td>
        <span class="value valueParameters">value</span>&nbsp;

        <span class="newValueParameters"><strong> %(text_with)s </strong></span>
        <span class="newValue newValueParameters">new value</span>
    </td>
    <td/>
</tr>
</tbody>


<tbody class="templateNewSubfield">
    <tr>
        <td />
        <td />
        <td />
        <td><input class="txtSubfieldCode textBoxSubfieldCode" type="text" maxlength="1"/></td>
        <td>
            <select class="subfieldActionType">
                <option value="0">%(text_add_subfield)s</option>
                <option value="1">%(text_delete_subfield)s</option>
                <option value="2">%(text_replace_content)s</option>
                <option value="3">%(text_replace_text)s</option>
            </select>
        </td>
    </tr>
    <tr class="valueParameters">
        <td /><td /><td /><td />
        <td colspan="3">
            <input class="txtValue textBoxValue" type="text" value="%(text_value)s" maxlength="50"/>
        </td>
    </tr>
    <tr class="newValueParameters">
        <td /><td /><td /><td />
        <td colspan="3">
            <input class="txtValue textBoxNewValue" type="text" value="%(text_new_value)s"/>
        </td>
    </tr>
    <tr>
        <td /><td /><td /><td /><td>
            <input value="%(text_save)s" type="button" id="buttonSaveNewSubfield" class="formbutton"/>
            <input value="%(text_cancel)s" type="button" id="buttonCancelNewSubfield" class="formbutton">
        </td>
    </tr>
</tbody>

<tbody class="templateMsg">
    <tr>
        <td colspan="100"><span class="msg"></span></td>
        <td/>
        <td/>
        <td/>
        <td/>
        <td/>
        <td/>
    </tr>
</tbody>

</table>

        """% {"site_url" : CFG_SITE_URL,
              "text_define_changes" : _("2. Define changes"),
              "text_define_changes_explanation" : _("Specify fields and their subfields that should be changed in every record matching the search criteria."),
              "text_define_field" : _("Define new field action"),
              "text_define_subfield" : _("Define new subfield action"),
              "text_field" : _("Field"),
              "text_select_action" : _("Select action"),
              "text_add_field" : _("Add field"),
              "text_delete_field" : _("Delete field"),
              "text_update_field" : _("Update field"),
              "text_add_subfield" : _("Add subfield"),
              "text_delete_subfield" : _("Delete subfield"),
              "text_save" : _("Save"),
              "text_cancel" : _("Cancel"),
              "text_replace_text" : _("Replace substring"),
              "text_replace_content" : _("Replace full content"),
              "text_with" : _("with"),
              "text_new_value" : _("new value"),
              "text_value" : _("value")
             }
        return html

    def detailed_record(self, record_content, language):
        """Returns formated content of a detailed record

        @param record_content: content of the record to be displayed
        @param language: language used to display the content
        """
        _ = gettext_set_language(language)

        result = """
        <table class="searchresultsbox">
            <tr>
                <td class="searchresultsboxheader">
                    <span class="buttonBackToResults linkButton"><b><< %(text_back_to_results)s </b></span>
                </td>
                <td class="searchresultsboxheader" style="text-align: right;">
                    <span class="buttonOutputFormatMARC  linkButton">MARC</span>,
                    <span class="buttonOutputFormatHTMLBrief  linkButton">HTML Brief</span>,
                    <span class="buttonOutputFormatHTMLDetailed linkButton">HTML Detailed</span>
                </td>
            </tr>
        </table>

        %(record_content)s

        """% {"record_content" : record_content,
             "text_back_to_results" : _("Back to Results")
             }

        return result

    def _build_navigation_image(self, class_name, image_file_name, alt_text):
        """Creates html for image from the page navigation line """
        navigation_image = '<img border="0" class="%(class)s" alt="%(alt)s" src="%(site_url)s/img/%(image_file_name)s"/>' % {
                "class" : class_name,
                "alt" : alt_text,
                "site_url" : CFG_SITE_URL,
                "image_file_name" : image_file_name
            }
        return navigation_image

    def _search_results_header(self, number_of_records, current_page, records_per_page, language, output_format):
        """Returns header of the search results"""

        _ = gettext_set_language(language)

        first_page_button = self._build_navigation_image("buttonGoToFirstPage", "sb.gif", _("begin"))
        previous_page_button = self._build_navigation_image("buttonGoToPreviousPage", "sp.gif", _("previous"))
        next_page_button = self._build_navigation_image("buttonGoToNextPage", "sn.gif", _("next"))
        #for now we don't have last page button.
        last_page_button = ""#self._build_navigation_image("buttonGoToLastPage", "se.gif", _("end"))

        first_record_on_page = (current_page-1)*records_per_page + 1
        last_record_on_page = first_record_on_page + records_per_page - 1
        if last_record_on_page > number_of_records:
            last_record_on_page = number_of_records

        last_page_number = number_of_records/records_per_page+1

        if current_page == 1:
            previous_page_button = ""
        if current_page < 2:
            first_page_button = ""
        if current_page == last_page_number:
            next_page_button = ""
            last_page_button = ""

#<span class="buttonOutputFormatMARC  linkButton">MARC</span>,
#                    <span class="buttonOutputFormatHTMLBrief  linkButton">HTML Brief</span>

        header = """
        <table class="searchresultsbox">
            <tr><td class="searchresultsboxheader">
                <strong>%(number_of_records)s</strong> %(text_records_found)s
                %(first_page_button)s %(previous_page_button)s

                %(first_record_on_page)s - %(last_record_on_page)s

                %(next_page_button)s %(last_page_button)s
            </td>
            <td class="searchresultsboxheader" style="text-align: right;">
            Output format: <select name="view_format" onchange="onSelectOutputFormatChange(this.value)">
                <option value="Marc" %(marc_selected)s>MARC</option>
                <option value="HTML Brief" %(brief_selected)s>HTML Brief</option>
                </select>
            </td>
            </tr>
        </table>

        """ % {"number_of_records" : number_of_records,
               "text_records_found" : _("records found"),
               "first_page_button" : first_page_button,
               "previous_page_button" : previous_page_button,
               "next_page_button" : next_page_button,
               "last_page_button" : last_page_button,
               "first_record_on_page" : first_record_on_page,
               "last_record_on_page" : last_record_on_page,
               "marc_selected": output_format == "hm" and "SELECTED" or "",
               "brief_selected": output_format == "hb" and "SELECTED" or ""
            }

        return header


    def search_results(self, records, number_of_records, current_page, records_per_page, language, output_format):
        """Retrurns the content of search resutls.

        @param records: list records to be displayed in the results.
        Contains tuples (record_id, formated_record)
            record_id - identifier of the record
            formated_record - content for the record ready for display

        @param language: language used to display the content
        """
        _ = gettext_set_language(language)

        result = " "

        for (record_id, record) in records:
            result += """
            <span class="resultItem" id="recordid_%(record_id)s">
            %(record)s
            </span><br><hr>
            """ % {"record_id" : record_id,
                  "record" : record
                  }

        result_header = self._search_results_header(number_of_records = number_of_records,
                                                    current_page = current_page,
                                                    records_per_page = records_per_page,
                                                    language = language,
                                                    output_format=output_format)
        result = result_header + result + result_header

        return result

    def scripts(self):
        """Returns the scripts that should be imported."""

        scripts_jquery = ["jquery.min.js",
                   "json2.js"]

        scripts = ["bibeditmulti.js"]

        result = ""

        for script in scripts_jquery:
            result += '<script type="text/javascript" src="%s/js/jquery/%s">' \
            '</script>\n' % (CFG_SITE_URL, script)

        for script in scripts:
            result += '<script type="text/javascript" src="%s/js/%s">' \
            '</script>\n' % (CFG_SITE_URL, script)

        return result

    def changes_applied(self):
        """ returns html message when changes sent to server """

        body = "Changes have been sent to the server. It will take some time before they are applied. You can <a href=%s/record/multiedit>reset </a> the editor." % (CFG_SITE_URL)

        return body
