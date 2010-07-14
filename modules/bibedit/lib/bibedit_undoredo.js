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
}