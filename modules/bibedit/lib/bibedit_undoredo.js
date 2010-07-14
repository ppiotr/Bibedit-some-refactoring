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



function UndoRedoManager(undoList, redoList){
  /**a class managing undo and redo operations*/
  var undoList = undoList;
  var redoList = redoList;

  this.addUndoOperation = function(op){
    /** add undo operation at the beginning of the list */
    undoList.push(op);
  };

  this.addRedoOperation = function(op){
    redoList.splice(0, 0, op);
  };

  this.isUndoListEmpty = function(){
    /** Returns True if the Undo list is empty and False otherwise */
    return undoList.length === 0;
  };

  this.isRedoListEmpty = function(){
    /** Returns True if the redo list is empty and False otherwise */
    return redoList.length === 0;
  };

  this.getRedoOperation = function(){
      /** getting the operation to be redoed */
    currentElement = redoList[0];
    redoList.splice(0, 1);
    this.addUndoOperation(currentElement);
    return currentElement;
  };

  this.getUndoOperation = function(){
    /** getting the operation to be undoe */
    currentElement = undoList[undoList.length - 1];
    undoList.splice(undoList.length - 1, 1);
    this.addRedoOperation(currentElement);
    return currentElement;
  };

  this.invalidateRedo = function(){
    /** Invalidates the redo list - after some modification*/
    redoList = [];
  };


  // obsolete functions ... added just for the compatibility
  // with the existing code

  this.getUndoList = function (){
    return undoList;
  };

  this.getRedoList = function (){
    return redoList;
  };
}


UndoRedoManager.getEmpty = function(){
  /** Create a Undo/Redo manager containing empty operation lists*/
  return new UndoRedoManager([], [])
};


/////// preparation of the undo/redo handlers


UndoRedoManager.prepareUndoHandlerDeleteFields = function(toDelete){
  /*Creating Undo/Redo handler for the operation of removal of fields and/or subfields
    Arguments: toDelete - indicates fields and subfields scheduled to be deleted.
      this argument should have a following structure:
      {
        "fields" : { tag: {fieldsPosition: field_structure_similar_to_on_from_gRecord}}
        "subfields" : {tag: { fieldPosition: { subfieldPosition: [code, value]}}}
      }
  */
  var result = {};
  result.operation_type = "delete_fields";
  result.toDelete = toDelete;
  return result;
};


UndoRedoManager.prepareUndoHandlerAddSubfields = function(tag, fieldPosition, subfields){
  /**
    tag : tag of the field inside which the fields should be added
    fieldPosition: position of the field
    subfields: new subfields to be added. This argument should be a list
      of lists representing a single subfield. Each subfield is represented
      by a list, containing 2 elements. [subfield_code, subfield_value]
  */
  var result = {};
  result.operation_type = "add_subfields";
  result.tag = tag;
  result.fieldPosition = fieldPosition;
  result.newSubfields = subfields;
  return result;
};



UndoRedoManager.prepareUndoHandlerMoveField = function(tag, fieldPosition, direction){
  /** Undo handler for moving the field */
  var result = {};
  result.tag = tag;
  result.operation_type = "move_field";
  result.field_position = fieldPosition;
  result.direction = direction;
  return result;
};


UndoRedoManager.prepareUndoHandlerChangeField = function(tag, fieldPos,
  oldInd1, oldInd2, oldSubfields, oldIsControlField, oldValue,
  newInd1, newInd2, newSubfields, newIsControlField, newValue){
  /** Function building a handler allowing to undo the operation of
      changing the field structure.

      Changing can happen only if tag and position remain the same,
      Otherwise we deal with removal and adding of a field

      Arguments:
        tag - tag of a field
        fieldPos - position of a field

        oldInd1, oldInd2 - indices of the old field
        oldSubfields - subfields present int the old structure
        oldIsControlField - a boolean value indicating if the field
                            is a control field
        oldValue - a value before change in case of field being a control field.
                   if the field is normal field, this should be equal ""

        newInd1, newInd2, newSubfields, newIsControlField, newValue -
           Similar parameters describing new structure of a field
  */
  var result = {};
  result.operation_type = "change_field";
  result.tag = tag;
  result.fieldPos = fieldPos;
  result.oldInd1 = oldInd1;
  result.oldInd2 = oldInd2;
  result.oldSubfields = oldSubfields;
  result.oldIsControlField = oldIsControlField;
  result.oldValue = oldValue;
  result.newInd1 = newInd1;
  result.newInd2 = newInd2;
  result.newSubfields = newSubfields;
  result.newIsControlField = newIsControlField;
  result.newValue = newValue;
  return result;
};


UndoRedoManager.prepareUndoHandlerEmpty = function(){
  /** Creating an empty undo/redo handler - might be useful in some cases
      when undo operation is required but should not be registered
  */
  return {
    operation_type: "no_operation"
  };
};


UndoRedoManager.prepareUndoHandlerAddField = function(tag, ind1, ind2, fieldPosition,
						      subfields, isControlField, value ){

  /** A function creating an undo handler for the operation of affing a new
      field

    Arguments:
      tag:            tag of the field
      ind1:           first indicator (a single character string)
      ind2:           second indicator (a single character string)
      fieldPosition:  a position of the field among other fields with the same
                      tag and possibly different indicators)
      subFields:      a list of fields subfields. each subfield is decribed by
                      a pair: [code, value]
      isControlField: a boolean value indicating if the field is a control field
      value:          a value of a control field. (important in case of passing
                      iscontrolField equal true)
  */

  var result = {};
  result.operation_type = "add_field";
  result.newSubfields = subfields;
  result.tag = tag;
  result.ind1 = ind1;
  result.ind2 = ind2;
  result.fieldPosition = fieldPosition;
  result.isControlField = isControlField;
  if (isControlField){
    // value == false means that we are dealing with a control field
    result.value = value;
  } else{
    result.subfields = subfields;
  }

  return result;
};

UndoRedoManager.prepareUndoHandlerVisualizeChangeset = function(changesetNumber,
					   changesListBefore, changesListAfter){
  var result = {};
  result.operation_type = "visualize_hp_changeset";
  result.changesetNumber = changesetNumber;
  result.oldChangesList = changesListBefore;
  result.newChangesList = changesListAfter;
  return result;
};

UndoRedoManager.prepareUndoHandlerApplyHPChanges = function(changeHandlers, changesBefore){
  /** Producing the undo/redo handler associated with application of
      more than one HoldingPen change

      Arguments:
        changeHandlers - a list od undo/redo handlers associated with subsequent changes.
        changesBefore = a list of Holding Pen changes before the operation
   */

  var result = {};
  result.operation_type = "apply_hp_changes";
  result.handlers = changeHandlers;
  result.changesBefore = changesBefore;
  return result;
};


UndoRedoManager.prepareUndoHandlerRemoveAllHPChanges = function(hpChanges){
  /** A function preparing the undo handler associated with the
      removal of all the Holding Pen changes present in teh interface */
  var result = {};
  result.operation_type = "remove_all_hp_changes";
  result.old_changes_list = hpChanges;
  return result;
};

UndoRedoManager.prepareUndoHandlerBulkOperation = function(undoHandlers, handlerTitle){
  /*
    Preapring an und/redo handler allowing to treat the bulk operations
    ( like for example in case of pasting fields )
    arguments:
      undoHandlers : handlers of separate operations from the bulk
      handlerTitle : a message to be displayed in the undo menu
  */
  var result = {};

  result.operation_type = "bulk_operation";
  result.handlers = undoHandlers;
  result.title = handlerTitle;

  return result;
};

UndoRedoManager.prepareUndoHandlerChangeSubfield = function(tag, fieldPos, subfieldPos, oldVal, newVal, oldCode, newCode){
  var result = {};
  result.operation_type = "change_content";
  result.tag = tag;
  result.oldVal = oldVal;
  result.newVal = newVal;
  result.oldCode = oldCode;
  result.newCode = newCode;
  result.fieldPos = fieldPos;
  result.subfieldPos = subfieldPos;
  return result;
};

UndoRedoManager.prepareUndoHandlerMoveSubfields = function(tag, fieldPosition, subfieldPosition, direction){
  var result = {};
  result.operation_type = "move_subfield";
  result.tag = tag;
  result.field_position = fieldPosition;
  result.subfield_position = subfieldPosition;
  result.direction = direction;
  return result;
};


////// undo handlers related to the holding pen changes

UndoRedoManager.prepareUndoHandlerApplyHPChange = function(changeHandler,
							   changeNo, hpChange){
  /** changeHandler - handler of the original undo/redo handler
   *    associated with the action
   */

  var result = {};
  result.operation_type = "apply_hp_change";
  result.handler = changeHandler;
  result.changeNo = changeNo;
  result.changeType = hpChange.change_type;
  return result;
};

UndoRedoManager.prepareUndoHandlerHPRejectChange = function(changeNo, hpChange){
  /** Undo handler for the operation of removing a change without changing anything
      to the strucutre */

  var origHandler = UndoRedoManager.prepareUndoHandlerEmpty();
  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};



UndoRedoManager.prepareHPFieldChangedUndoHandler = function(changeNo, hpChange){
  var change = gHoldingPenChangesManager.getChange(changeNo);
  //  var tag = gHoldingPenChanges[changeNo].tag;
  //  var fieldPos = gHoldingPenChanges[changeNo].field_position;
  var tag = change.tag;
  var fieldPos = change.field_position;
  var oldInd1 = gRecordManager.getFields(tag)[fieldPos][1];
  var oldInd2 = gRecordManager.getFields(tag)[fieldPos][2];
  var oldSubfields = gRecordManager.getFields(tag)[fieldPos][0];
  var oldIsControlField = gRecordManager.getFields(tag)[fieldPos][3] !== "";
  var oldValue = gRecordManager.getFields(tag)[fieldPos][3];

  //var newInd1 = gHoldingPenChanges[changeNo].indicators[0];
  //var newInd2 = gHoldingPenChanges[changeNo].indicators[1];
  //var newSubfields = gHoldingPenChanges[changeNo].field_content;
  var newInd1 = change.indicators[0];
  var newInd2 = change.indicators[1];
  var newSubfields = change.field_content;
  var newIsControlField = false;
  var newValue = "";

  var origHandler =  UndoRedoManager.prepareUndoHandlerChangeField(tag, fieldPos,
                                                       oldInd1, oldInd2,
                                                       oldSubfields, oldIsControlField,
                                                       oldValue, newInd1,
                                                       newInd2, newSubfields,
                                                       newIsControlField, newValue);

  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};

UndoRedoManager.prepareHPSubfieldRemovedUndoHandler = function(changeNo, hpChange){
  var change = gHoldingPenChangesManager.getChange(changeNo);
  //var tag = gHoldingPenChanges[changeNo].tag;
  //var fieldPos = gHoldingPenChanges[changeNo].field_position;
  //var sfPos = gHoldingPenChanges[changeNo].subfield_position;

  var tag = change.tag;
  var fieldPos = change.field_position;
  var sfPos = change.subfield_position;


  var toDelete = {};
  var sfToDelete = {};

  sfToDelete[tag] = {};
  sfToDelete[tag][fieldPos] = {};
  sfToDelete[tag][fieldPos][sfPos] = gRecordManager.getFields(tag)[fieldPos][0][sfPos];

  toDelete.fields = {};
  toDelete.subfields = sfToDelete;

  var origHandler = UndoRedoManager.prepareUndoHandlerDeleteFields(toDelete);
  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};

UndoRedoManager.prepareHPFieldRemovedUndoHandler = function(changeNo, hpChange){
  var change = gHoldingPenChangesManager.getChange(changeNo);
  //  var tag = gHoldingPenChanges[changeNo].tag;
  //var fieldPos = gHoldingPenChanges[changeNo].field_position;
  var tag = change.tag;
  var fieldPos = change.field_position;

  var toDelete = {};
  var fToDelete = {};
  fToDelete[tag] = {};
  fToDelete[tag][fieldPos] = gRecordManager.getFields(tag)[fieldPos];

  toDelete.subfields = {};
  toDelete.fields = fToDelete;
  var origHandler = UndoRedoManager.prepareUndoHandlerDeleteFields(toDelete);
  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};

UndoRedoManager.prepareHPSubfieldAddedUndoHandler = function(changeNo, hpChange){
  var change = gHoldingPenChangesManager.getChange(changeNo);

  //  var tag = gHoldingPenChanges[changeNo]["tag"];
  //var fieldPos = gHoldingPenChanges[changeNo]["field_position"];
  //var sfCode = gHoldingPenChanges[changeNo]["subfield_code"];
  //var sfValue = gHoldingPenChanges[changeNo]["subfield_content"];
  var tag = change.tag;
  var fieldPos = change.field_position;
  var sfCode = change.subfield_code;
  var sfValue = change.subfield_content;
  var subfields =  [[sfCode, sfValue]];
  var origHandler = UndoRedoManager.prepareUndoHandlerAddSubfields(tag, fieldPos, subfields);
  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};

UndoRedoManager.prepareHPFieldAddedUndoHandler = function(changeNo, fieldPos, hpChange){
  /** A function creating the Undo/Redo handler for applying a
      change consisting of adding a new field. This handler can be
      only created after the field is really added

      Arguments:
        changeNo: a number of the Holding Pen Change
        fieldPos: a position on which the field has been inserted.
   */
  var r = getFullFieldContentFromHPChange(changeNo);

  var origHandler = UndoRedoManager.prepareUndoHandlerAddField(r.tag, r.ind1, r.ind2,
                                               fieldPos, r.subfields,
                                               r.isControlField, r.value);
  return UndoRedoManager.prepareUndoHandlerApplyHPChange(origHandler, changeNo, hpChange);
};