
function BibEditOperation(){
  /** A class representing single record operation that can be performed */
  var operationType = null;
  var tag = null;
  var fieldPosition = null;
  var fieldContent = null;

  // accessors

  this.getType = function(){
    return operationType;
  };

  this.setType = function(opType){
    operationType = opType;
  };

  this.getTag = function(){
    return tag;
  };

  this.setTag = function(opTag){
    tag = opTag;
  };


  this.getFieldContent = function(){
    return fieldContent;
  };

  this.setFieldContent = function(opFieldContent){
    fieldContent = opFieldContent;
  };

  this.getFieldPosition = function(){
    return fieldPosition;
  };

  this.setFieldPosition = function(opPosition){
    fieldPosition = opPosition;
  };
}


BibEditOperation.getAddFieldOperation = function(tag, field, position){
  /** The operation of adding a field instance
   * Arguments:
   *  position :  position of the field among all the instances of the same tag
   *  field    :  a structure describing the field structure
   *  tag      :  tag of which the field is instance
   */
  var result = new BibEditOperation();
  result.setType("add_field");
  result.setTag(tag);
  result.setFieldPosition(position);
  result.setFieldContent(field);
  return result;
};






/**
The general scheme of processing the record change

1) Single modification -> user creates a change object, passes it to the
synchronised record manager.

2) The synchronised reord manager passes the operation to the record manager

3) The synchronised record manager passes the operation to the remoteRecordManager (obtains an ajax request as a result)

4) The synchronised record manager passes the operation to the undoRedo manager together with the ajax request data and obtains the new request data

5) The synchronised record manager passes the operation to the changesManager and obtains the newest ajax handler


Use case: undo/redo operation

1) operation is retrieved from the undoManager -> the handler is taken from the undo list, put into the redo list,

2) new operation is submitted to the synchronised manager -> it gets processed by the changes manager again -> ajax handler is extended by the ajax information (isUndo / isRedo)


Use case: undo/redo a bulk operation
 (the same as above)


Use case: apply the holding pen change

1) retrieve the change from the changes manager and invalidate it there
2) pass to the normal process of applying change
3) when returning to the hp handler, include the necessary hp application information to the ajax handler

*/
