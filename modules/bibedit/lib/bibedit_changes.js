/* This class allows the management of changes applicable to records
 */

function ChangesManager(){
  this.changesList = [];


  this.aggregatedRemovalChanges = {};
  /**
    A dictionary with removal changes aggregated by tag and sorted by
    the field position
   */

  this.updatedAddChanges = {};
  /**
    all the add changes with modified positions ->
       the position is equal to one without the removal changes applied
   */

  this.displayedChanges = {};

  this.appliedChanges = {};

}

/** Note about the change states:
    Each change managed by the change manager has a state assigned.
    There are three possible states: new, displayed, applied. Transitions
    betweens states are effect of the manager oprations

         _______________________
        |       display()      \/
     -----                   -----------
   _| new |                 | displayed |
  |  -----                   -----------
  |  /\  /\_____________________|     |
  |   |         reset()               |
  |   |                               |
  |   |                               |
  |   |                               |
  |   |                               |
  |   | undo() -------    appy()      |
  |   --------|applied|<--------------
  |            -------
  |              /\
  |_______________|
      apply()


The transitions are realised by following methods of the manager:

   reset()     ->  reset()
   apply()     ->  markChangeAsApplied()
   display()   ->  markChangeAsDisplayed()
   undo()      ->  markChangeAsNew()

another function useful while treating the changes

getRealChangePosiion(changeNo) - this function returns position of
                                 the change in the currently displayed record (considering all the consumed changes)

*/

/** Functions allowing to map changes indices to the current situation of a record */

ChangesManager.prototype.compareChangesPosition = function(a, b){
  /**A method comparing two change numbers. The criterium for the comparison
     is their tag/position. Change made to a larger tag will be always
     considered bigger than one with smaller. Within the same tag, the
     change with larger position will be considered larger

     Arguments:
       a: number of the first change
       b: number of the 2nd change */

  var changeA = this.getChange(a);
  var changeB = this.getChange(b);
  if (changeA.tag != changeB.tag){
    return changeA.tag - changeB.tag;
  }
  return changeA.field_position - changeB.field_position;

};

ChangesManager.prototype.aggregateAndSortChanges = function(changeType){
  /** aggregating all the changes of a given type*/

  var result = {};

  this.forEach(function(changenum, change){
    if (change.operation_type == changeType){
      if (result[change.tag] == undefined){
        result[change.tag] = [];
      }
      result[change.tag].append(changenum);
    }
  });

  for (tag in this.aggregatedRemovalChanges){
    // sorting changes from each tag in the increasing position order
    result[tag].sort(this.compareChangesPosition);
  }
  return result;
};

ChangesManager.prototype.calculateAggreageteRemovalChanges = function(){
  this.aggregatedRemovalChanges = this.aggregateAndSortChanges("field_removed");
};

ChangesManager.prototype.calculateUpdatedAddChanges = function(){
  /** Calculating the content of the this.updatedAddChanges array

   at the entrance, all the remove changes have to be aggregated ! */

  this.updatedAddChanges = {};
  // 1) aggregate all the add changes
  var aggregatedAddChanges = this.aggregateAndSortChanges("field_added");
  // 2) now we proceed by updating the changes ids
  for (tag in aggregatedAddChanges){
    var currentRemoveChangeInd = 0;
    this.updatedAddChanges[tag] = {};
    for (ind in aggregatedAddChanges[tag]){
      var changeNo = aggregatedAddChanges[tag][ind];
      // now we consider all the removal changes up to the current one!
      while ((currentRemoveChangeInd < this.aggregatedRemovalChanges[tag].length)
	     && (this.aggregatedRemovalChanges[tag][currentRemoveChangeInd].
		 field_position < this.getChange(changeNo).field_positin)){
        currentRemoveChangeInd++;
      }
      // now apply an appropriate shift to the change
      this.updatedAddChanges[tag][changeNo] = this.getChange(changeNo).field_position + currentRemoveChangeInd;
    }
  }
};

ChangesManager.prototype.calculateCacheData = function(){
  /** Prepare all the temporary structures
  updated variables are:
    this.aggregatedRemovalChanges
    this.updatedAddChanges
  */

};

/** Regular changes manager operations */
ChangesManager.prototype.initializeFromRecords = function(r1, r2){
    // To implement : this function initializes a changes list using two records
};

ChangesManager.prototype.setChanges = function(changesList){
    this.changesList = changesList;
};

ChangesManager.prototype.getChange = function(id){
    return this.changesList[id];
};

ChangesManager.prototype.getChanges = function(){
    // TODO: this function should not be used any more ... provided only for a smooth transition
    return this.changesList;
};

ChangesManager.prototype.forEach = function(operation){
  for (changeInd in this.changesList){
    operation(this.changesList[changeInd]);
  }
};

ChangesManager.prototype.clear = function(){
  this.changesList = [];
};

ChangesManager.prototype.addChange = function(change){
  var pos = this.changesList.length;
  this.changesList[pos] = change;
  return pos;
};

