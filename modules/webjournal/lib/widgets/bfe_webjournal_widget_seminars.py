#!/usr/bin/env python

from invenio.config import cachedir
from urllib2 import urlopen
from xml.dom import minidom
import time

Cached_Filename = "webjournal_widget_seminars.xml"
Indico_Seminar_Location = "http://indico.cern.ch/tools/export.py?fid=1l7&date=today&days=1&of=xml"
Update_Frequency = 3600 # in seconds

def format(bfo):
    """
    """
    out = get_widget_HTML()
    return out

def escape_values(bfo):
    """
    """
    return 0

def get_widget_HTML():
    """
    Indico seminars of the day service
    Gets seminars of the day from CERN Indico every 60 minutes and displays
    them in a widget.
    """
    try:
        seminar_xml = minidom.parse('%s/%s' % (cachedir, Cached_Filename))
    except:
        _update_seminars()
        seminar_xml = minidom.parse('%s/%s' % (cachedir, Cached_Filename))
    try:
        timestamp = seminar_xml.firstChild.getAttribute("time")
    except:
        timestamp = time.struct_time()
    
    last_update = time.mktime(time.strptime(timestamp, "%a, %d %b %Y %H:%M:%S %Z"))
    now = time.mktime(time.gmtime())
    if last_update + Update_Frequency < now:
        _update_seminars()
        seminar_xml = minidom.parse('%s/%s' % (cachedir, Cached_Filename))

    html = ""
    seminars = seminar_xml.getElementsByTagName("seminar")
    if len(seminars) == 0:
        return "<li><i>no seminars today</i></li>"
    for seminar in seminars:
        html += "<li>"
        try:
            seminar_time = seminar.getElementsByTagName("start_time")[0].firstChild.toxml()
        except:
            seminar_time = ""
        try:
            category = seminar.getElementsByTagName("category")[0].firstChild.toxml()
        except:
            category = "Seminar"
        html += '%s %s<br/>' % (seminar_time, category)
        try:
            title = seminar.getElementsByTagName("title")[0].firstChild.toxml()
        except:
            title = ""
        try:
            url = seminar.getElementsByTagName("url")[0].firstChild.toxml()
        except:
            url = "#"
        try:
            speaker = seminar.getElementsByTagName("speaker")[0].firstChild.toxml()
        except:
            speaker = ""
        if (title != ""):
            html += '<strong><a href="%s">%s</a></strong>, %s<br/>' % (url, title, speaker)
        try:
            room = seminar.getElementsByTagName("room")[0].firstChild.toxml()
        except:
            room = ""
        html += room
        
        html += "</li>"
        
    return html.encode('utf-8')
    
def _update_seminars():
    """
    helper function that gets the xml data source from CERN Indico and creates
    a dedicated xml file in the cache for easy use in the widget.
    """
    indico_xml = urlopen(Indico_Seminar_Location)
    xml_file_handler = minidom.parseString(indico_xml.read())
    seminar_xml = ['<Indico_Seminars time="%s">' % time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime()), ]
    agenda_items = xml_file_handler.getElementsByTagName("agenda_item")
    for item in agenda_items:
        seminar_xml.extend(["<seminar>", ])
        try:
            start_time = item.getElementsByTagName("start_time")[0].firstChild.toxml()
        except:
            start_time = ""
        seminar_xml.extend(["<start_time>%s</start_time>" % start_time, ])
        try:
            category = item.getElementsByTagName("category")[0].firstChild.toxml()
            category = category.split("/")[-1]
            category = category.replace("&amp;", "")
            category = category.replace("nbsp;", "")
            category = category.replace("&nbsp;", "") 
        except:
            category = ""
        seminar_xml.extend(["<category>%s</category>" % category, ])
        try:
            title = item.getElementsByTagName("title")[0].firstChild.toxml()
        except:
            title = ""
        seminar_xml.extend(["<title>%s</title>" % title, ])
        try:
            url = item.getElementsByTagName("agenda_url")[0].firstChild.toxml()
        except:
            url = "#"
        seminar_xml.extend(["<url>%s</url>" % url, ])
        try:
            speaker = item.getElementsByTagName("speaker")[0].firstChild.toxml()
        except:
            speaker = ""
        seminar_xml.extend(["<speaker>%s</speaker>" % speaker, ])
        try:
            room = item.getElementsByTagName("room")[0].firstChild.toxml()
        except:
            room = ""
        seminar_xml.extend(["<room>%s</room>" % room, ])
        seminar_xml.extend(["</seminar>", ])
    seminar_xml.extend(["</Indico_Seminars>", ])    
    # write the created file to cache
    fptr = open("%s/%s" % (cachedir, Cached_Filename), "w")
    fptr.write(("\n".join(seminar_xml)).encode('utf-8'))
    fptr.close()
    
if __name__ == "__main__":
    get_widget_HTML()