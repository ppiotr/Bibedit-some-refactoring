/*
 * This file is part of CDS Invenio.
 * Copyright (C) 2002, 2003, 2004, 2005, 2006, 2007, 2008 2009 CERN.
 *
 * CDS Invenio is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * CDS Invenio is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with CDS Invenio; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.
 */

function RecordManager(pId, pRec, pRev, pRevAuthor, pIsDirty,
		       pLatestRev, pRevHist){
  /** A constructior for the class managing the operations on the record
      arguments:

        pId           - the record identifier
        pRec          - the content of the record
        pRev       - the revision of the record
        pRevAuthor - the author of the last revision
        pIsDirty      - a boolean value indicating if the record cache is in dirty state
        pLatestRev    - the latest available revision of the record
        pRevHist      - the list of record's revisions

   */

  // the private variables:
  if (pRevHist == undefined){
    // if the last argument is undefined that means that not all have been speified
    throw RecordManager.constructorArgumentsError;
  }

  var record = pRec; // formerly gRecord
  /** this variable describes record its structure is following:
    { tag1 : [field1, field2, field3, ...] }
    each field has a following structure:
    [list_of_subfields, ind1, ind2, value, global_index]
  */

  var recordId = pId; // formerly gRecID
  var revision = pRev; // formerly gRecRev
  var revisionAuthor = pRevAuthor; // formerly gRecRevAuthor
  var latestRevision = pLatestRev;  // formerly gRecLatestRev
  var isDirty = pIsDirty; //formerly gRecordDirty
  var revisionsHistory = pRevHist; // formerly gRecRevisionHistory

  /** Data access methods */

  this.getId = function(){
    return recordId;
  };

  this.setRecord = function(identifier, recordData){
    recordId = identifier;
    record = recordData;
    // TODO: this should also update all the internal strucures
  };

  this.isDirty = function(){
    return isDirty;
  };

  this.setDirty = function(status){
    if (status == undefined){
      isDirty = true;
    } else {
      isDirty = status;
    }
  };

  this.clearRevisionsHistory = function(){
    revisionsHistory = [];
  };

  this.getRecord = function(){
    /** OBSOLETE ? */
    return record;
  };

  this.getRevision = function(){
    return revision;
  };

  this.getLatestRevision = function(){
    return latestRevision;
  };

  this.getFields = function(tag){
      /** OBSOLETE ! */
    return record[tag];
  };

  this.getField = function(tag, position){
      /** returns a description of a field. The description consists of:
	  [list_of_subfields, ind1, ind2, field_value, global_position]

          warning: the global_position is usually 0
       */

    return record[tag][position];
  };

  this.getRevisionAuthor = function(){
    return revisionAuthor;
  };

  this.getRevisionsHistory = function(){
    return revisionsHistory;
  };

  this.deleteTag = function(tag){
    delete record[tag];
  };

  this.clearRevisionsHistory = function(){
    revisionsHistory = [];
  };

  this.setFields = function(tag, content){
      /** OBSOLETE !!!!! */
    record[tag] = content;
    // TODO: Piotr: remove this function ! It is highly temporary ( for the transition time in order to assure that everything works)

    throw RecordManager.operationShouldNotBePerformed;
  };

  this.setId = function(identifier){
    /**OBSOLETE !!!! */
    recordId = identifier;
    throw RecordManager.operationShouldNotBePerformed;
  };

  /*** data logic */

  this.getTagsSorted = function(){
     /**
     * Return field tags in sorted order.
     */
    var tags = [];
    for (var tag in record){
      tags.push(tag);
    }
    return tags.sort();
  };


  this.getFieldPositionInTag = function(tag, field){
    /**
     * Determine the local (in tag) position of a new field.
     */
    var fields = this.getFields(tag);
    if (fields != undefined){
      var fieldLength = fields.length, i = 0;
      while (i < fieldLength && RecordManager.cmpFields(field, fields[i]) != -1){
        i++;
      }
      return i;
    }
    else {
      return 0;
    }
  };

  this.getPreviousTag = function(tag){
    /**
    * Determine the previous tag in the record (if the given tag is the first
    * tag, 0 will be returned).
    */

    var tags = this.getTagsSorted();
    var tagPos = $.inArray(tag, tags);
    if (tagPos == -1){
      tags.push(tag);
      tags.sort();
      tagPos = $.inArray(tag, tags);
    }
    if (tagPos > 0){
      return tags[tagPos - 1];
    }
    return 0;
  };

  this.deleteFieldFromTag = function(tag, fieldPosition){
    /**
     * Delete a specified field.
     */
    var fields = this.getFields(tag);
    var field = fields[fieldPosition];

    fields.splice($.inArray(field, fields), 1);
    // If last field, delete tag.
    if (fields.length === 0){
      this.deleteTag(tag);
    }
  };


  this.getMARC = function(tag, fieldPosition, subfieldIndex){
    /**
     * Return the MARC representation of a field or a subfield.
     */
    var field = this.getFields(tag)[fieldPosition];
    var ind1, ind2;
    if (validMARC.reControlTag.test(tag)){
      ind1 = '';
      ind2 = '';
    }
    else {
      ind1 = (field[1] == ' ' || !field[1]) ? '_' : field[1];
      ind2 = (field[2] == ' ' || !field[2]) ? '_' : field[2];
    }
    if (subfieldIndex == undefined){
      return tag + ind1 + ind2;
    } else {
      return tag + ind1 + ind2 + field[0][subfieldIndex][0];
    }
  };

  this.insertField = function(tag, position, field){
    var fields = record[tag];
    if (fields == undefined || fields == []){
      record[tag] = [field];
    }
    else{
      fields.splice(fieldPosition, 0, field);
    }
  };

  this.insertSubfields = function(tag, position, subfields){
    /** inserting subfields at teh end of a given field
        instance */
    var field = record[tag][position];
    field[0] = field[0].concat(subfields);
  };


  this.getSubfieldValue = function(tag, fieldPos, subfieldPos){
    /** Returns the value of a subfield indexed by a field position */
    return record[tag][fieldPos][0][subfieldPos][1];
  };

  this.setSubfieldValue = function(tag, fieldPos, subfieldPos, val){
    /** Returns the value of a subfield indexed by a field position */
    record[tag][fieldPos][0][subfieldPos][1] = val;
  };

  this.getControlFieldValue = function(tag, fieldPos){
    return record[tag][fieldPos][3];
  };

  this.getSubfieldCode = function(tag, fieldPos, subfieldPos){
    return record[tag][fieldPos][0][subfieldPos][0];
  };

  this.setControlFieldValue = function(tag, fieldPos, val){
    record[tag][fieldPos][3] = val;
  };

  this.swapFieldInstances = function(tag, pos1, pos2){
    /** Exchange the positions of two field instances*/
    var subfieldsNum = record[tag].length;
    if (pos1 >= 0 && pos1 < subfieldsNum && pos1 >= 0 && pos2 < subfieldsNum && pos1 != pos2){
      var tmpField = record[tag][pos1];
      record[tag][pos1] = record[tag][pos2];
      record[tag][pos2] = tmpField;
    }
  }
}

/** Static methods of the RecordManager*/

RecordManager.getEmpty = function(){
    /** creating an empty record manager*/
  var record = null; // formerly gRecord
  /** this variable describes record its structure is following:
    { tag1 : [field1, field2, field3, ...] }
    each field has a following structure:
    [list_of_subfields, ind1, ind2, value, global_index]
  */
  return new RecordManager(null, null, null, null, false, null, []);
  /*
  var recordId = null; // formerly gRecID
  var revision = null; // formerly gRecRev
  var revisionAuthor = null; // formerly gRecRevAuthor
  var latestRevision = null;  // formerly gRecLatestRev
  var isDirty = false; //formerly gRecordDirty
  var revisionsHistory = []; // formerly gRecRevisionHistory
  */
};

RecordManager.constructorArgumentsError = new Error("You must specify all the parameters to the constructor");

// TODO: Piotr: Ensure, this exception is never raised
RecordManager.operationShouldNotBePerformed = new Error("This operation should not be executed !!!");


/*** manager state independent operations (in another language could be static)*/
RecordManager.cmpFields = function(field1, field2){
  /**
   * Compare fields by indicators (tag assumed equal).
   */
  if (field1[1].toLowerCase() > field2[1].toLowerCase()){
    return 1;
  }
  else if (field1[1].toLowerCase() < field2[1].toLowerCase()){
    return -1;
  }
  else if (field1[2].toLowerCase() > field2[2].toLowerCase()){
    return 1;
  }
  else if (field1[2].toLowerCase() < field2[2].toLowerCase()){
    return -1;
  }
  return 0;
}

RecordManager.insertFieldToRecord = function(chRecord, fieldId, ind1, ind2,
                                             subFields){
  /**
   * Inserting a new field on the client side and returning the position
   * of the newly created field
   */

  var newField = [subFields, ind1, ind2, '', 0];
  if (chRecord[fieldId] == undefined){
    chRecord[fieldId] = [newField];
    return 0;
  } else {
    chRecord[fieldId].push(newField);
    return (chRecord[fieldId].length - 1);
  }
};

RecordManager.transformRecord = function(record){
  /**Transforming a bibrecord to a form that is easier to use in several use cases
   *
   * the resulting form is a dictionary:
   * field identifier -> field indices -> fields list -> [subfields list, position in the record]
   *
   * The data is enriched with the positions inside the record in a following manner:
   * each field consists of:
   * */
  result = {};
  for (fieldId in record){
    result[fieldId] = {};
    indicesList = []; // a list of all the indices ... utilised later when determining the positions
    for (fieldIndex in record[fieldId]){

      indices =  "";
      if (record[fieldId][fieldIndex][1] == ' '){
        indices += "_";
      }else{
        indices += record[fieldId][fieldIndex][1];
      }

      if (record[fieldId][fieldIndex][2] == ' '){
        indices += "_";
      }else{
        indices += record[fieldId][fieldIndex][2];
      }

      if (result[fieldId][indices] == undefined){
        result[fieldId][indices] = []; // a future list of fields sharing the same indice
        indicesList.push(indices);
      }
      result[fieldId][indices].push([record[fieldId][fieldIndex][0], 0]);
    }

    // now calculating the positions within a field identifier ( utilised on the website )

    position = 0;

    indices = indicesList.sort();
    for (i in indices){
      for (fieldInd in result[fieldId][indices[i]]){
        result[fieldId][indices[i]][fieldInd][1] = position;
        position ++;
      }
    }
  }

  return result;
};


RecordManager.fieldIsProtected = function(MARC){
  /**
   * Determine if a MARC field is protected or part of a protected group of
   * fields.
   */
  do{
    var i = MARC.length - 1;
    if ($.inArray(MARC, gPROTECTED_FIELDS) != -1)
      return true;
    MARC = MARC.substr(0, i);
    i--;
  }
  while (i >= 1)
  return false;
};

RecordManager.containsProtectedField = function(fieldData){
  /*
   * Determine if a field data structure contains protected elements (useful
   * when checking if a deletion command is valid).
   * The data structure must be an object with the following levels
   * - Tag
   *   - Field position
   *     - Subfield index
   */
  var fieldPositions, subfieldIndexes, MARC;
  for (var tag in fieldData){
    fieldPositions = fieldData[tag];
    for (var fieldPosition in fieldPositions){
      subfieldIndexes = fieldPositions[fieldPosition];
      if (subfieldIndexes.length === 0){
  MARC = getMARC(tag, fieldPosition);
  if (fieldIsProtected(MARC))
    return MARC;
  }
      else{
  for (var i=0, n=subfieldIndexes.length; i<n; i++){
    MARC = getMARC(tag, fieldPosition, subfieldIndexes[i]);
    if (fieldIsProtected(MARC))
      return MARC;
  }
      }
    }
  }
  return false;
};
