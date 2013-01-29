## BibFigure - figure processing for Invenio

from invenio.bibrecord import create_record
import simplejson as json
import re
import os
from invenio.bibtask import write_message

# The class containing the info
class Figure:
	def __init__(self, identifier=None, source_document=None, caption=None, caption_file=None, files=None, location=None, caption_location=None, annotated_image=None, status=None, text_references=None):
		self.identifier = identifier
		self.source_document = source_document
		self.caption = caption
		self.caption_file = caption_file
		self.files = files
		self.location = location
		self.caption_location = caption_location
		self.annotated_image = annotated_image
		self.status = status
		self.text_references = text_references
	
	def get_location(self, i):
		if i==0:
			return self.location
		if i==1:
			return self.caption_location
	
	def setFiles(self, files):
		self.files = files
	def setTextReferences(self, text_references):
		self.text_references = text_references

class Location:
	def __init__(self, page_num=None, page_resolution=None, boundary=None, page_scale=None):
		self.page_num = page_num
		self.page_resolution = page_resolution
		self.boundary = boundary
		self.page_scale = page_scale
		
	def add_page_num(self, p_n):
		self.page_num = p_n
	def add_page_resolution(self, p_r):
		self.page_resolution = p_r
	def add_boundary(self, p_b):
		self.boundary = p_b
	def add_page_scale(self, p_s):
		self.page_scale = p_s

class PageResolution:
	def __init__(self, width=None, height=None):
		self.width = width
		self.height = height

class Boundary:
	def __init__(self, width=None, height=None, x=None, y=None):
		self.width = width
		self.height = height
		self.x = x
		self.y = y

class File:
	def __init__(self, filetype=None, path=None):
		self.filetype = filetype
		self.path = path

	def set_file_type(self, filetype):
		self.filetype = filetype


def output_record(xml_file):
	"""
	Function that returns a record representation from a xml file
	
	@param xml_file: the file in xml format
	
	@return: the record
	"""
	xml_to_string = ''
	list_of_words = []
	f = open(xml_file)
	try:
	    for line in f:
	        words = line.split()
	        for word in words:
		        list_of_words.append(word)
	finally:
	    f.close()
	xml_to_string = ' '.join(list_of_words)
	# create_record is a function that takes a string representation of an xml and returns a dictionary
	(record, status_code, list_of_errors) = create_record(xml_to_string)
	return record

# Parse the record and create a figure containing the info
# Return the list of figures
def parse_record(record):
	"""
	Function that parse a record and creates a list of figures containing the info
	
	@param record: the dictionary representation of a record
	
	@return: the list of figures
	"""
	docnames = []
	index_matching = []
	index_all_positions = []
	list_of_figures = []

	# check if FFT is present here
	if 'FFT' in record.keys():
		complete_datafields = record['FFT']
		for complete_datafield in complete_datafields:
			subfields = complete_datafield[0]
			for subfield in subfields:
				if subfield[0] == 'n':
					docname = subfield[1]
					# the list of all documents
					docnames.append(docname)
		# one or more datafields with tag FFT can refer to one figure, so we build a index_matching list
		# to have all index positions of the datafields that refer to the same figure
		for index1 in range(len(docnames)):
			if index1 not in index_all_positions:
				index_matching.append(index1)
				index_all_positions.append(index1)
				for index2 in range(len(docnames)):
					if index2 not in index_all_positions and docnames[index1] == docnames[index2]:
						index_matching.append(index2)
						index_all_positions.append(index2)
				f = []
				text_references = []


				s = None
				t_r = None
				#combine all figures with indices from index_matching
				for index in index_matching:
					subfields = complete_datafields[index][0]
					for subfield in subfields:
						if(subfield[0] == 'n'):
							id = subfield[1]
						if(subfield[0] == 'd'):
							c = subfield[1]
						if(subfield[0] == 'a'):
							path = subfield[1]
							basename, filetype =  os.path.splitext(path)
							filetype = re.sub('^. ', '', filetype)
							a_file = File(filetype, path)
							f.append(a_file)
							if(path.endswith("context")):
								t_r = extract_text_references(path)
						if(subfield[0] == 'o'):
							s = subfield[1]
	
				figure = Figure(identifier=id, caption=c, files=f, status=s, text_references=t_r)	
				list_of_figures.append(figure)
				#f = []
				del index_matching[:]
	return list_of_figures

# Receive a Json file and output a string representation
def output_string(json_file):
	"""
	Function that receive a json file and output a string representation
	
	@param json_file: the file with json representation
	
	@return: json to string
	"""
	list_of_words = []
	f = open(json_file)
	try:
		for line in f:
			words = line.split()
			for word in words:
				list_of_words.append(word)
	finally:
		f.close()
	return ' '.join(list_of_words)

def parse_json(json_string_representation):
	"""
	Function that parses a json file and creates a list of figures from pdf source 
	
	@param json_string_representation: the string with json representation
	
	@return: the list with all files
	"""
	figures = json.loads(json_string_representation)
	
	list_of_figures_from_Json_source = []
#	figures = out['figures']
	for figure in figures:
		id =  figure['identifier']
		s_d = figure['sourceDocument']
		c = figure['caption']
		c_f = figure['captionFile']
		f = []
		for i in range(len(figure['files'])):
			key = figure['files'].keys()[i]
			path = figure['files'][key]
			f.append(File('.' + str(key), path))

		for i, field in enumerate(figure['location']):
			if field == "pageNum":
				p_n = figure['location']['pageNum']
			if field == "pageResolution":
				w = figure['location']['pageResolution']['width']
				h = figure['location']['pageResolution']['height']
				p_r = PageResolution(width = w, height = h)
			if field == "boundary":
				w = figure['location']['boundary']['width']
				h = figure['location']['boundary']['height']
				x_param = figure['location']['boundary']['x']
				y_param = figure['location']['boundary']['y']
				b = Boundary(width = w, height = h, x = x_param, y = y_param)
			if field == "pageScale":
				p_s = figure['location']['pageScale']

		l = Location(page_num = p_n, page_resolution = p_r, boundary = b, page_scale = p_s)
		
		c_l = Location()
		for i, field in enumerate(figure['captionLocation']):
			if field == "pageNum":
				p_n = figure['captionLocation']["pageNum"]
				c_l.add_page_num(p_n)
			if field == "pageResolution":
				w = figure['captionLocation']["pageResolution"]['width']
				h = figure['captionLocation']["pageResolution"]['height']
				p_r = PageResolution(width = w, height = h)
				c_l.add_page_resolution(p_r)
			if field == "boundary":
				w = figure['captionLocation']["boundary"]['width']
				h = figure['captionLocation']["boundary"]['height']
				x_param = figure['captionLocation']["boundary"]['x']
				y_param = figure['captionLocation']["boundary"]['y']
				c_b = Boundary(width = w, height = h, x = x_param, y = y_param)
				c_l.add_boundary(c_b)

		a_i = figure['annotatedImage']

		list_of_figures_from_Json_source.append(Figure(identifier=id, source_document=s_d, caption=c, caption_file=c_f, files=f, location=l, caption_location=c_l, annotated_image=a_i))
	return list_of_figures_from_Json_source

def extract_text_references(path):
	"""
	Function of extracting references
	
	@param path: the location of the file with the text references
	
	@return: the list of text references
	"""
	text_references = []
	reference=' '
	f = open(path)
	try:
		for line in f:
			if not line.strip():
				text_references.append(reference)
				reference=' '
				continue
			else:
				reference += line
	finally:
		f.close()
	return text_references
