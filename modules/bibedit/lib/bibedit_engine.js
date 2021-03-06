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

/*
 * This is the main BibEdit Javascript.
 */

/* ************************* Table of contents ********************************
 *
 * 1. Global variables
 *
 * 2. Initialization
 *   - $()
 *   - initJeditable
 *   - initMisc
 *
 * 3. Ajax
 *   - initAjax
 *   - createReq
 *   - onAjaxError
 *   - onAjaxSuccess
 *
 * 4. Hash management
 *   - initStateFromHash
 *   - deserializeHash
 *   - changeAndSerializeHash
 *
 * 5. Data logic
 *   - getMARC
 *   - getFieldTag
 *   - getSubfieldTag
 *   - validMARC
 *
 * 6. Record UI
 *   - onNewRecordClick
 *   - getRecord
 *   - onGetRecordSuccess
 *   - onSubmitClick
 *   - onCancelClick
 *   - onCloneRecordClick
 *   - onDeleteRecordClick
 *   - onMergeClick
 *   - bindNewRecordHandlers
 *   - cleanUp
 *   - positionBibEditPanel
 *
 * 7. Editor UI
 *   - colorFields
 *   - reColorFields
 *   - onMARCTagsClick
 *   - onHumanTagsClick
 *   - updateTags
 *   - onFieldBoxClick
 *   - onSubfieldBoxClick
 *   - onAddFieldClick
 *   - onAddFieldControlfieldClick
 *   - onAddFieldChange
 *   - onAddFieldSave
 *   - onAddSubfieldsClick
 *   - onAddSubfieldsChange
 *   - onAddSubfieldsSave
 *   - onDoubleClick
 *   - onContentChange
 *   - onMoveSubfieldClick
 *   - onDeleteClick
 */

/*
 * **************************** 1. Global variables ****************************
 */

// the data of the currently edited record
var gRecordManager = RecordManager.getEmpty();

// Search results (record IDs)
var gResultSet = null;
// Current index in the result set
var gResultSetIndex = null;
// Tag format.
var gTagFormat = null;
// Has the record been modified?

// Last recorded cache modification time
var gCacheMTime = null;

// Are we navigating a set of records?
var gNavigatingRecordSet = false;

// The current hash (fragment part of the URL).
var gHash;
// The current hash deserialized to an object.
var gHashParsed;
// Hash check timer ID.
var gHashCheckTimerID;
// The previous and current state (this is not exactly the same as the state
// parameter, but an internal state control mechanism).
var gPrevState;
var gState;
// A current status
var gCurrentStatus;

// a global array of visible changes associated with a currently viewed record
// This array is cleared always when a new changes set is applied... then it is used
// for redrawing the change fields
// The index in this array is used when referring to a particular change [ like finding an appropriate box]

//var gHoldingPenChanges = [];
var gHoldingPenChangesManager = new ChangesManager;

// A global variable used to avoid multiple retrieving of the same changes stored in the Holding Pen
// this is the dictionary indexed by the HoldingPen entry identifiers and containing the javascript objects
// representing the records
// due to this mechanism, applying previously previewed changes, as well as previewing the change for the
// second time, can be made much faster
var gHoldingPenLoadedChanges = {};

// The changes that have been somehow processed and should not be displayed as already processed

var gDisabledHpEntries = {};

// is the read-only mode enabled ?
var gReadOnlyMode = false;

// revisions history

var gUndoRedoManager = UndoRedoManager.getEmpty();
//var gUndoList = []; // list of possible undo operations
//var gRedoList = []; // list of possible redo operations

// number of bibcirculation copies from the retrieval time
var gPhysCopiesNum = 0;
var gBibCircUrl = null;
var gDisplayBibCircPanel = false;

/*
 * **************************** 2. Initialization ******************************
 */

window.onload = function(){
  if (typeof(jQuery) == 'undefined'){
    alert('ERROR: jQuery not found!\n\n' +
    'The Record Editor requires jQuery, which does not appear to be ' +
    'installed on this server. Please alert your system ' +
    'administrator.\n\nInstructions on how to install jQuery and other ' +
    "required plug-ins can be found in CDS-Invenio's INSTALL file.");
    var imgError = document.createElement('img');
    imgError.setAttribute('src', '/img/circle_red.png');
    var txtError = document.createTextNode('jQuery missing');
    var cellIndicator = document.getElementById('cellIndicator');
    cellIndicator.replaceChild(imgError, cellIndicator.firstChild);
    var cellStatus = document.getElementById('cellStatus');
    cellStatus.replaceChild(txtError, cellStatus.firstChild);
  }
};

$(function(){
  /*
   * Initialize all components.
   */
  initMenu();
  initJeditable();
  initAjax();
  initMisc();
  initStateFromHash();
  gHashCheckTimerID = setInterval(initStateFromHash, gHASH_CHECK_INTERVAL);
  initHotkeys();
  initClipboardLibrary();
  initClipboard();
});


function failInReadOnly(){
  /** Function checking if the current BibEdit mode is read-only. In sucha a case, a warning
    dialog is displayed and true returned.
    If bibEdit is in read/write mode, false is returned
   */
  if (gReadOnlyMode === true){
    alert("It is impossible to perform this operation in the Read/Only mode. Please switch to Read-write mode before trying again");
    return true;
  }
  else{
    return false;
  }
}

function initJeditable(){
  /* Initialize Jeditable with the Autogrow extension. Used for in-place
   * content editing.
   */
  $.editable.addInputType('autogrow', {
    element: function(settings, original){
      var textarea = $('<textarea>');
      if (settings.rows){
        textarea.attr('rows', settings.rows);
      } else {
        textarea.height(settings.height);
      } if (settings.cols) {
        textarea.attr('cols', settings.cols);
      } else {
        textarea.width(settings.width);
      }
      $(this).append(textarea);
      return(textarea);
    },
    plugin: function(settings, original){
      $('textarea', this).autogrow(settings.autogrow);
    }
  });
}

function initClipboard(){
  // attaching the events -> handlers are stored in bibedit_engine.js file
  $(document).bind("copy", onPerformCopy);
  $(document).bind("paste", onPerformPaste);
}

function initMisc(){
  /*
   * Miscellaneous initialization operations.
   */
  // CERN allows for capital MARC indicators.
  if (gCERN_SITE){
    validMARC.reIndicator1 = /[\dA-Za-z]{1}/;
    validMARC.reIndicator2 = /[\dA-Za-z]{1}/;
  }

  // Warn user if BibEdit is being closed while a record is open.
  window.onbeforeunload = function(){
      if (gRecordManager.getId() && gRecordManager.isDirty()){
      return '******************** WARNING ********************\n' +
             '                  You have unsubmitted changes.\n\n' +
             'You should go back to the page and click either:\n' +
             ' * Submit (to save your changes permanently)\n      or\n' +
             ' * Cancel (to discard your changes)';
    }
  };

  //Initialising the BibCircualtion integration plugin
  $("#bibEditBibCirculationBtn").bind("click", onBibCirculationBtnClicked);

}


/*
 * **************************** 3. Ajax ****************************************
 */

function initAjax(){
  /*
   * Initialize Ajax.
   */
  $.ajaxSetup(
    {cache: false,
      dataType: 'json',
      error: onAjaxError,
      type: 'POST',
      url: '/record/edit/'
    }
  );
}

function createReq(data, onSuccess, asynchronous){
  /*
   * Create Ajax request.
   */
  if (asynchronous == undefined){
    asynchronous = true;
  }
  // Include and increment transaction ID.
  var tID = createReq.transactionID;
  createReq.transactionID+=1;
  createReq.transactions[tID] = data['requestType'];
  data.ID = tID;
  // Include cache modification time if we have it.
  if (gCacheMTime){
    data.cacheMTime = gCacheMTime;
  }
  // Send the request.
  $.ajax({data: {jsondata: JSON.stringify(data)},
           success: function(json){
                      onAjaxSuccess(json, onSuccess);
                    },
           async: asynchronous
  });
}
// Transactions data.
createReq.transactionID = 0;
createReq.transactions = [];

function createBulkReq(reqsData, onSuccess, optArgs){
  /* optArgs is a disctionary containning the optional arguments
     possible keys include:
       asynchronous : if the request should be asynchronous
       undoRedo : handler for the undo operation
  */
    // creating a bulk request ... the cache timestamp is not saved

    var data = { 'requestType' : 'applyBulkUpdates',
                 'requestsData' : reqsData,
                 'recID' : gRecordManager.getId()};
    if (optArgs.undoRedo != undefined){
        data.undoRedo = optArgs.undoRedo;
    }

    createReq(data, onSuccess, optArgs.asynchronous);
}

function onAjaxError(XHR, textStatus, errorThrown){
  /*
   * Handle Ajax request errors.
   */
  alert('Request completed with status ' + textStatus +
    '\nResult: ' + XHR.responseText +
    '\nError: ' + errorThrown);
}

function onAjaxSuccess(json, onSuccess){
  /*
   * Handle server response to Ajax requests, in particular error situations.
   * See BibEdit config for result codes.
   * If a function onSuccess is specified this will be called in the end,
   * if no error was encountered.
   */
  var resCode = json['resultCode'];
  var recID = json['recID'];

  if (resCode == 100){
    // User's session has timed out.

    gRecordManager.setId(null);
    gRecIDLoading = null;
    window.location = recID ? gSITE_URL + '/record/' + recID + '/edit/' :
	gSITE_URL + '/record/edit/';
    return;
  }
  else if ($.inArray(resCode, [101, 102, 103, 104, 105, 106, 107, 108, 109]) !=
	   -1){
    cleanUp(!gNavigatingRecordSet, null, null, true, true);
    if ($.inArray(resCode, [108, 109]) == -1)
      $('.headline').text('Record Editor: Record #' + recID);
    displayMessage(resCode);
    if (resCode == 107)
      return;
      $('#lnkGetRecord').bind('click', function(event){
        getRecord(recID);
        event.preventDefault();
      });
    updateStatus('error', gRESULT_CODES[resCode]);
  }
  else if (resCode == 110){
    displayMessage(resCode, true, [json['errors'].toString()]);
    $(document).scrollTop(0);
    updateStatus('error', gRESULT_CODES[resCode]);
  }
  else{
    var cacheOutdated = json['cacheOutdated'];
    var requestType = createReq.transactions[json['ID']];
    if (cacheOutdated && requestType == 'submit'){
      // User wants to submit, but cache is outdated. Outdated means that the
      // DB version of the record has changed after the cache was created.
      displayCacheOutdatedScreen(requestType);
      $('#lnkMergeCache').bind('click', onMergeClick);
      $('#lnkForceSubmit').bind('click', function(event){
  onSubmitClick.force = true;
  onSubmitClick();
  event.preventDefault();
      });
      $('#lnkDiscardChanges').bind('click', function(event){
  onCancelClick();
  event.preventDefault();
      });
      updateStatus('error', 'Error: Record cache is outdated');
    }
    else{
      if (requestType != 'getRecord'){
  // On getRecord requests the below actions will be performed in
  // onGetRecordSuccess (after cleanup).
  var cacheMTime = json['cacheMTime'];
  if (cacheMTime)
    // Store new cache modification time.
    gCacheMTime = cacheMTime;
  var cacheDirty = json['cacheDirty'];
  if (cacheDirty){
    // Cache is dirty. Enable submit button.
    gRecordManager.setDirty(cacheDirty);
    $('#btnSubmit').removeAttr('disabled');
    $('#btnSubmit').css('background-color', 'lightgreen');
  }
      }
      if (onSuccess)
  // No critical errors; call onSuccess function.
  onSuccess(json);
    }
  }
}

function resetBibeditState(){
  /** A function clearing the state of the bibEdit (all the panels content)
  */
  gHoldingPenLoadedChanges = {};
  gHoldingPenChanges = [];
  gHoldingPenChangesManager = new ChangesManager();
  gDisabledHpEntries = {};
  gReadOnlyMode = false;

  gRecordManager.clearRevisionsHistory();

  gUndoRedoManager = UndoRedoManager.getEmpty();

  gPhysCopiesNum = 0;
  gBibCircUrl = null;

  updateRevisionsHistory();
  updateInterfaceAccordingToMode();
  updateRevisionsHistory();
  updateUrView();
  updateBibCirculationPanel();
  holdingPenPanelRemoveEntries();
}

/*
 * **************************** 4. Hash management *****************************
 */

function initStateFromHash(){
  /*
   * Initialize or update page state from hash.
   * Any program functions changing the hash should use changeAndSerializeHash()
   * which circumvents this function, meaning this function should only run on
   * page load and when browser navigation buttons (ie. Back and Forward) are
   * clicked. Any invalid hashes entered by the user will be ignored.
   */
  if (window.location.hash == gHash)
    // Hash is the same as last time we checked, do nothing.
    return;

  gHash = window.location.hash;
  gHashParsed = deserializeHash(gHash);
  gPrevState = gState;
  var tmpState = gHashParsed.state;
  var tmpRecID = gHashParsed.recid;
  var tmpRecRev = gHashParsed.recrev;
  var tmpReadOnlyMode = gHashParsed.romode;

  // Find out which internal state the new hash leaves us with
  if (tmpState && tmpRecID){
    // We have both state and record ID.
    if ($.inArray(tmpState, ['edit', 'submit', 'cancel', 'deleteRecord']) != -1)
  gState = tmpState;
    else
      // Invalid state, fail...
      return;
  }
  else if (tmpState){
    // We only have state.
    if (tmpState == 'edit')
      gState = 'startPage';
    else if (tmpState == 'newRecord')
      gState = 'newRecord';
    else
      // Invalid state, fail... (all states but 'edit' and 'newRecord' are
      // illegal without record ID).
      return;
  }
  else
    // Invalid hash, fail...
    return;

  if (gState != gPrevState ||
     (gState == 'edit' && parseInt(tmpRecID, 10) != gRecordManager.getId()) ||
      (tmpRecRev != undefined && tmpRecRev != gRecordManager.getRevision()) ||
     (tmpRecRev == undefined &&
      gRecordManager.getRevision() != gRecordManager.getLatestRevision()) ||
     (tmpReadOnlyMode != gReadOnlyMode)){

      /* Tested cases:
	 different record number
	 different revision
	 latest revision requested but another open
	 switched between read-only and read-write modes
       */

    // We have an actual and legal change of state. Clean up and update the
    // page.
    updateStatus('updating');
    if (gRecordManager.getId() && !gRecordManager.isDirty() && !tmpReadOnlyMode)
      // If the record is unchanged, delete the cache.
	createReq({recID: gRecordManager.getId(),
		   requestType: 'deleteRecordCache'});
    switch (gState){
      case 'startPage':
        cleanUp(true, '', 'recID', true, true);
        updateStatus('ready');
        break;
      case 'edit':
	  var recID = parseInt(tmpRecID, 10);
        if (isNaN(recID)){
          // Invalid record ID.
          cleanUp(true, tmpRecID, 'recID', true);
          $('.headline').text('Record Editor: Record #' + tmpRecID);
          displayMessage(102);
          updateStatus('error', gRESULT_CODES[102]);
        }
        else{
          cleanUp(true, recID, 'recID');
          gReadOnlyMode = tmpReadOnlyMode;
            if (tmpRecRev !== undefined && tmpRecRev !== 0){
              getRecord(recID, tmpRecRev);
            } else {
              getRecord(recID);
            }
        }
      break;
    case 'newRecord':
      cleanUp(true, '', null, null, true);
      $('.headline').text('Record Editor: Create new record');
      displayNewRecordScreen();
      bindNewRecordHandlers();
      updateStatus('ready');
      break;
    case 'submit':
      cleanUp(true, '', null, true);
      $('.headline').text('Record Editor: Record #' + tmpRecID);
      displayMessage(4);
      updateStatus('ready');
      break;
    case 'cancel':
      cleanUp(true, '', null, true, true);
      updateStatus('ready');
      break;
    case 'deleteRecord':
      cleanUp(true, '', null, true);
      $('.headline').text('Record Editor: Record #' + tmpRecID);
      displayMessage(6);
      updateStatus('ready');
      break;
    default:
      break;
    }
  }
  //  else
  // What changed was not of interest, continue as if nothing happened.
}

function deserializeHash(aHash){
  /*
   * Deserializes a string (given as parameter or taken from the window object)
   * into the hash object.
   */
  if (aHash == undefined){
    aHash = window.location.hash;
  }
  var hash = {};
  var args = aHash.slice(1).split('&');
  var tmpArray;
  for (var i=0, n=args.length; i<n; i++){
    tmpArray = args[i].split('=');
    if (tmpArray.length == 2)
      hash[tmpArray[0]] = tmpArray[1];
  }
  return hash;
}

function changeAndSerializeHash(updateData){
  /*
   * Change the hash object to use the data from the object given as parameter.
   * Then update the hash accordingly, WITHOUT invoking initStateFromHash().
   */
  clearTimeout(gHashCheckTimerID);
  gHashParsed = {};
  for (var key in updateData){
    gHashParsed[key.toString()] = updateData[key].toString();
  }
  gHash = '#';
  for (key in gHashParsed){
    gHash += key + '=' + gHashParsed[key] + '&';
  }
  gHash = gHash.slice(0, -1);
  gState = gHashParsed.state;
  window.location.hash = gHash;
  gHashCheckTimerID = setInterval(initStateFromHash, gHASH_CHECK_INTERVAL);
}


/*
 * **************************** 5. Data logic **********************************
 */

function filterChanges(changeset){
  /*Filtering the changes list -> removing the changes related to the fields
   * that should never be changed */
  unchangableTags = {"001" : true}; // a dictionary of the fields that should not be modified
  result = [];
  for (changeInd in changeset){
    change = changeset[changeInd];
    if ((change.tag == undefined) || (!(change.tag in unchangableTags))){
      result.push(change);
    }
  }
  return result;
}

///// Functions generating easy to display changes list

function getFieldTag(MARC){
  /*
   * Get the tag name of a field in format as specified by gTagFormat.
   */
  MARC = MARC.substr(0, 5);
  if (gTagFormat == 'human'){
    var tagName = gTAG_NAMES[MARC];
    if (tagName != undefined)
     // Direct hit. Return it.
      return tagName;
    else{
      // Start looking for wildcard hits.
      if (MARC.length == 3){
  // Controlfield
  tagName = gTAG_NAMES[MARC.substr(0, 2) + '%'];
  if (tagName != undefined && tagName != MARC + 'x')
    return tagName;
      }
      else{
  // Regular field, try finding wildcard hit by shortening expression
  // gradually. Ignores wildcards which gives values like '27x'.
  var term = MARC + '%', i = 5;
  do{
    tagName = gTAG_NAMES[term];
    if (tagName != undefined){
      if (tagName != MARC.substr(0, i) + 'x')
        return tagName;
      break;
    }
    i--;
    term = MARC.substr(0, i) + '%';
  }
  while (i >= 3)
      }
    }
  }
  return MARC;
}

function getSubfieldTag(MARC){
  /*
   * Get the tag name of a subfield in format as specified by gTagFormat.
   */
  if (gTagFormat == 'human'){
    var subfieldName = gTAG_NAMES[MARC];
      if (subfieldName != undefined)
  return subfieldName;
  }
  return '$$' + MARC.charAt(5);
}

function validMARC(datatype, value){
  /*
   * Validate a value of given datatype according to the MARC standard. The
   * value should be restricted/extended to it's expected size before being
   * passed to this function.
   * Datatype can be 'ControlTag', 'Tag', 'Indicator' or 'SubfieldCode'.
   * Returns a boolean.
   */
  return eval('validMARC.re' + datatype + '.test(value)');
}
// MARC validation REs
validMARC.reControlTag = /00[1-9A-Za-z]{1}/;
validMARC.reTag = /(0([1-9A-Z][0-9A-Z])|0([1-9a-z][0-9a-z]))|(([1-9A-Z][0-9A-Z]{2})|([1-9a-z][0-9a-z]{2}))/;
validMARC.reIndicator1 = /[\da-z]{1}/;
validMARC.reIndicator2 = /[\da-z]{1}/;
//validMARC.reSubfieldCode = /[\da-z!&quot;#$%&amp;'()*+,-./:;&lt;=&gt;?{}_^`~\[\]\\]{1}/;
validMARC.reSubfieldCode = /[\da-z!&quot;#$%&amp;'()*+,-.\/:;&lt;=&gt;?{}_^`~\[\]\\]{1}/;

/*
 * **************************** 6. Record UI ***********************************
 */

function onNewRecordClick(event){
  /*
   * Handle 'New' button (new record).
   */
  updateStatus('updating');
  if (gRecordManager.isDirty()){
    if (!displayAlert('confirmLeavingChangedRecord')){
      updateStatus('ready');
      event.preventDefault();
      return;
    }
  }
  else
    // If the record is unchanged, erase the cache.
    if (gReadOnlyMode === false){
      createReq({recID: gRecordManager.getId(), requestType: 'deleteRecordCache'});
  }
  changeAndSerializeHash({state: 'newRecord'});
  cleanUp(true, '');
  $('.headline').text('Record Editor: Create new record');
  displayNewRecordScreen();
  bindNewRecordHandlers();
  updateStatus('ready');
  event.preventDefault();
}

function getRecord(recID, recRev, onSuccess){
  /* A function retrieving the bibliographic record, using an AJAX request.
   *
   * recID : the identifier of a record to be retrieved from the server
   * recRev : the revision of the record to be retrieved (0 or undefined
   *          means retrieving the newest version )
   * onSuccess : The callback to be executed upon retrieval. The default
   *             callback loads the retrieved record into the bibEdit user
   *             interface
   */

  // Temporary store the record ID by attaching it to the onGetRecordSuccess
  // function.
  if (onSuccess == undefined)
    onSuccess = onGetRecordSuccess;
  if (recRev !== undefined && recRev !== 0){
    changeAndSerializeHash({state: 'edit', recid: recID, recrev: recRev});
  }
  else{
    changeAndSerializeHash({state: 'edit', recid: recID});
  }

  gRecIDLoading = recID;

  reqData = {recID: recID,
             requestType: 'getRecord',
             deleteRecordCache:
             getRecord.deleteRecordCache,
             clonedRecord: getRecord.clonedRecord,
             inReadOnlyMode: gReadOnlyMode};

  if (recRev !== undefined && recRev !== 0){
    reqData.recordRevision = recRev;
    reqData.inReadOnlyMode = true;
  }

  resetBibeditState();
  createReq(reqData, onSuccess);

  onHoldingPenPanelRecordIdChanged(recID); // reloading the Holding Pen toolbar
  getRecord.deleteRecordCache = false;
  getRecord.clonedRecord = false;
}
// Enable this flag to delete any existing cache before fetching next record.
getRecord.deleteRecordCache = false;
// Enable this flag to tell that we are fetching a record that has just been
// cloned (enables proper feedback, highlighting).
getRecord.clonedRecord = false;


function onGetRecordSuccess(json){
  /*
   * Handle successfull 'getRecord' requests.
   */
  cleanUp(!gNavigatingRecordSet);
  // Store record data.
  gRecIDLoading = null;


// updating the record manager
// TODO: Piotr: change to be a constructor call
  gRecordManager = new RecordManager(json['recID'], json['record'],
    json['recordRevision'], json['revisionAuthor'], json['cacheDirty'],
    ((json['latestRevision'] != undefined) ? json['latestRevision'] : null),
    ((json['revisionsHistory'] != undefined) ? json['revisionsHistory'] : null));

/**  gRecID = json['recID'];
     gRecord = json['record'];
     gRecRev = json['recordRevision'];
     gRecRevAuthor = json['revisionAuthor'];
     gRecordDirty = json['cacheDirty'];
     gRecLatestRev = (json['latestRevision'] != undefined) ? json['latestRevision'] : null;
     gRecRevisionHistory = (json['revisionsHistory'] != undefined) ? json['revisionsHistory'] : null;
*/

  gPhysCopiesNum = json['numberOfCopies'];
  gBibCircUrl = json['bibCirculationUrl'];
  gDisplayBibCircPanel = json['canRecordHavePhysicalCopies'];

  var revDt = formatDateTime(getRevisionDate(gRecordManager.getRevision()));
  var recordRevInfo = "record revision: " + revDt;
  var revAuthorString = gRecordManager.getRevisionAuthor();

  $('.headline').html(
    'Record Editor: Record #<span id="spnRecID">' + gRecordManager.getId() + '</span>' +
    '<div style="margin-left: 5px; font-size: 0.5em; color: #36c;">' +
    recordRevInfo + ' ' + revAuthorString + '</div>').css('white-space', 'nowrap');


  gTagFormat = json['tagFormat'];
  gCacheMTime = json['cacheMTime'];

  if (json['cacheOutdated']){
    // User had an existing outdated cache.
    displayCacheOutdatedScreen('getRecord');
    $('#lnkMergeCache').bind('click', onMergeClick);
    $('#lnkDiscardChanges').bind('click', function(event){
      getRecord.deleteRecordCache = true;
      getRecord(gRecordManager.getId());
      event.preventDefault();
    });
    $('#lnkRemoveMsg').bind('click', function(event){
      $('#bibEditMessage').remove();
      event.preventDefault();
    });
  }

  gHoldingPenChangesManager.setChanges(json['pendingHpChanges']);
  //gHoldingPenChanges = json['pendingHpChanges'];
  gDisabledHpEntries = json['disabledHpChanges'];
  gHoldingPenLoadedChanges = {};

  adjustHPChangesetsActivity();
  updateBibCirculationPanel();

  // updating the undo/redo lists
  gUndoRedoManager = new UndoRedoManager(json['undoList'], json['redoList']);

  updateUrView();

  // Display record.
  displayRecord();
  // Activate menu record controls.
  activateRecordMenu();
  // the current mode should is indicated by the result from the server
  gReadOnlyMode = (json['inReadOnlyMode'] != undefined) ? json['inReadOnlyMode'] : false;

  updateInterfaceAccordingToMode();

  if (gRecordManager.isDirty()){
    $('#btnSubmit').removeAttr('disabled');
    $('#btnSubmit').css('background-color', 'lightgreen');
  }
  if (gTagFormat == 'MARC')
    $('#btnHumanTags').bind('click', onHumanTagsClick).removeAttr('disabled');
  else
    $('#btnMARCTags').bind('click', onMARCTagsClick).removeAttr('disabled');
  // Unfocus record selection field (to facilitate hotkeys).
  $('#txtSearchPattern').blur();
  if (json['resultCode'] == 9)
    $('#spnRecID').effect('highlight', {color: gCLONED_RECORD_COLOR},
      gCLONED_RECORD_COLOR_FADE_DURATION);
  updateStatus('report', gRESULT_CODES[json['resultCode']]);
  updateRevisionsHistory();
  adjustGeneralHPControlsVisibility();

  createReq({recID: gRecordManager.getId(), requestType: 'getTickets'}, onGetTicketsSuccess);
}

function onGetTemplateSuccess(json) {
  onGetRecordSuccess(json);
}

function onSubmitClick(){
  /*
   * Handle 'Submit' button (submit record).
   */
  updateStatus('updating');
  if (displayAlert('confirmSubmit')){
    createReq({recID: gRecordManager.getId(), requestType: 'submit',
         force: onSubmitClick.force}, function(json){
       // Submission was successful.
      changeAndSerializeHash({state: 'submit', recid: gRecordManager.getId()});
      var resCode = json['resultCode'];
      cleanUp(!gNavigatingRecordSet, '', null, true);
      updateStatus('report', gRESULT_CODES[resCode]);
      displayMessage(resCode);
      resetBibeditState();
    });
    onSubmitClick.force = false;
    resetBibeditState();
  }
  else
    updateStatus('ready');
}

// Enable this flag to force the next submission even if cache is outdated.
onSubmitClick.force = false;

function onCancelClick(){
  /*
   * Handle 'Cancel' button (cancel editing).
   */
  updateStatus('updating');
  if (!gRecordManager.isDirty() || displayAlert('confirmCancel')) {
  createReq({
    recID: gRecordManager.getId(),
    requestType: 'cancel'
  }, function(json){
    // Cancellation was successful.
      changeAndSerializeHash({
          state: 'cancel',
          recid: gRecordManager.getId()
        });
        cleanUp(!gNavigatingRecordSet, '', null, true, true);
        updateStatus('report', gRESULT_CODES[json['resultCode']]);
      });
      holdingPenPanelRemoveEntries();
      gUndoRedoManager = UndoRedoManager.getEmpty();
      gReadOnlyMode = false;
      gRecordManager.clearRevisionsHistory();
      gHoldingPenLoadedChanges = [];
      //gHoldingPenChanges = [];
      gHoldingPenChangesManager = new ChangesManager;
      gPhysCopiesNum = 0;
      gBibCircUrl = null;
      // making the changes visible
      updateBibCirculationPanel();
      updateInterfaceAccordingToMode();
      updateRevisionsHistory();
      updateUrView();

    }
    else {
      updateStatus('ready');
    }
}

function onCloneRecordClick(){
  /*
   * Handle 'Clone' button (clone record).
   */
  updateStatus('updating');
  if (!displayAlert('confirmClone')){
    updateStatus('ready');
    return;
  }
  else if (!gRecordManager.isDirty())
    // If the record is unchanged, erase the cache.
    createReq({recID: gRecordManager.getId(), requestType: 'deleteRecordCache'});
  createReq({requestType: 'newRecord', newType: 'clone', recID: gRecordManager.getId()},
    function(json){
      var newRecID = json['newRecID'];
      $('#txtSearchPattern').val(newRecID);
      getRecord.clonedRecord = true;
      getRecord(newRecID);
  });
}

function onDeleteRecordClick(){
  /*
   * Handle 'Delete record' button.
   */
  if (gPhysCopiesNum > 0){
    displayAlert('errorPhysicalCopiesExist');
    return;
  }
  if (displayAlert('confirmDeleteRecord')){
    updateStatus('updating');
    createReq({recID: gRecordManager.getId(), requestType: 'deleteRecord'}, function(json){
      // Record deletion was successful.
      changeAndSerializeHash({state: 'deleteRecord', recid: gRecordManager.getId()});
      cleanUp(!gNavigatingRecordSet, '', null, true);
      var resCode = json['resultCode'];
      // now cleaning the interface - removing holding pen entries and record history
      resetBibeditState();
      updateStatus('report', gRESULT_CODES[resCode]);
      displayMessage(resCode);
    });
  }
}

function onMergeClick(event){
  /*
   * Handle click on 'Merge' link (to merge outdated cache with current DB
   * version of record).
   */
  notImplemented(event);

  updateStatus('updating');
  createReq({recID: gRecordManager.getId(), requestType: 'prepareRecordMerge'}, function(json){
    // Null gRecID to avoid warning when leaving page.
//    gRecID = null;
    // TODO: Piotr: Verify if the merge button works
    gRecordManager = RecordManager.getEmpty();
    var recID = json['recID'];
    window.location = gSITE_URL + '/record/merge/#recid1=' + recID + '&recid2=' +
      'tmp';
  });
  event.preventDefault();
}

function bindNewRecordHandlers(){
  /*
   * Bind event handlers to links on 'Create new record' page.
   */
  $('#lnkNewEmptyRecord').bind('click', function(event){
    updateStatus('updating');
    createReq({requestType: 'newRecord', newType: 'empty'}, function(json){
      getRecord(json['newRecID']);
    });
    event.preventDefault();
  });
  for (var i=0, n=gRECORD_TEMPLATES.length; i<n; i++)
    $('#lnkNewTemplateRecord_' + i).bind('click', function(event){
      updateStatus('updating');
      var templateNo = this.id.split('_')[1];
      createReq({requestType: 'newRecord', newType: 'template',
	templateFilename: gRECORD_TEMPLATES[templateNo][0]}, function(json){
	  getRecord(json['newRecID'], 0, onGetTemplateSuccess); // recRev = 0 -> current revision
      });
      event.preventDefault();
    });
}

function cleanUp(disableRecBrowser, searchPattern, searchType,
     focusOnSearchBox, resetHeadline){
  /*
   * Clean up display and data.
   */
  // Deactivate controls.
  deactivateRecordMenu();
  if (disableRecBrowser){
    disableRecordBrowser();
    gResultSet = null;
    gResultSetIndex = null;
    gNavigatingRecordSet = false;
  }

  // Clear main content area.
  if (resetHeadline)
    $('.headline').text('Record Editor');
  $('#bibEditContent').empty();
  // Clear search area.
  if (typeof(searchPattern) == 'string' || typeof(searchPattern) == 'number')
    $('#txtSearchPattern').val(searchPattern);
  if ($.inArray(searchType, ['recID', 'reportnumber', 'anywhere']) != -1)
    $('#sctSearchType').val(searchPattern);
  if (focusOnSearchBox)
    $('#txtSearchPattern').focus();
  // Clear tickets.
  $('#tickets').empty();
  // Clear data.

//TODO: Piotr: verify taht it still works ! this functionality is a little stronger that it used to be ... though seems to be more correct too
  gRecordManager = RecordManager.getEmpty();
/*  gRecID = null;
  gRecord = null;
  gRecordDirty = false;
*/
  gTagFormat = null;

  gCacheMTime = null;
  gSelectionMode = false;
  gReadOnlyMode = false;
  gHoldingPenLoadedChanges = null;
  //gHoldingPenChanges = [];
  gHoldingPenChangesManager = new ChangesManager;
  gUndoRedoManager = UndoRedoManager.getEmpty();
  gBibCircUrl = null;
  gPhysCopiesNum = 0;
}

function positionBibEditPanel(minimalPosition){
    /*
     * Dynamically position menu based on vertical scroll distance.
     */
    var newYscroll = $(document).scrollTop();
    // Only care if there has been some major scrolling.
    if (Math.abs(newYscroll - positionMenu.yScroll) > 10){
      // If scroll distance is less then 200px, position menu in sufficient
      // distance from header.
      if (newYscroll < 200)
        $('#bibEditMenu').animate({
    'top': 220 - newYscroll}, 'fast');
      // If scroll distance has crossed 200px, fix menu 50px from top.
      else if (positionMenu.yScroll < 200 && newYscroll > 200)
        $('#bibEditMenu').animate({
    'top': 50}, 'fast');
      positionMenu.yScroll = newYscroll;
    }
  }
/*
 * **************************** 7. Editor UI ***********************************
 */

function colorFields(){
  /*
   * Color every other field (rowgroup) gray to increase readability.
   */
  $('#bibEditTable tbody[id^="rowGroup"]:even').each(function(){
    $(this).addClass('bibEditFieldColored');
  });
}

function reColorFields(){
  /*
   * Update coloring by removing existing, then recolor.
   */
  $('#bibEditTable tbody').each(function(){
    $(this).removeClass('bibEditFieldColored');
  });
  colorFields();
}

function onMARCTagsClick(event){
  /*
   * Handle 'MARC' link (MARC tags).
   */
  $(this).unbind('click').attr('disabled', 'disabled');
  createReq({recID: gRecordManager.getId(), requestType: 'changeTagFormat', tagFormat: 'MARC'});
  gTagFormat = 'MARC';
  updateTags();
  $('#btnHumanTags').bind('click', onHumanTagsClick).removeAttr('disabled');
  event.preventDefault();
}

function onHumanTagsClick(event){
  /*
   * Handle 'Human' link (Human tags).
   */
  $(this).unbind('click').attr('disabled', 'disabled');
  createReq({recID: gRecordManager.getId(), requestType: 'changeTagFormat',
       tagFormat: 'human'});
  gTagFormat = 'human';
  updateTags();
  $('#btnMARCTags').bind('click', onMARCTagsClick).removeAttr('disabled');
  event.preventDefault();
}

function updateTags(){
  /*
   * Check and update all tags (also subfield codes) against the currently
   * selected tag format.
   */
  $('.bibEditCellFieldTag').each(function(){
    var currentTag = $(this).text();
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2];
    var newTag = getFieldTag(getMARC(tag, fieldPosition));
    if (newTag != currentTag)
      $(this).text(newTag);
  });
  $('.bibEditCellSubfieldTag').each(function(){
    var currentTag = $(this).text();
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2],
      subfieldIndex = tmpArray[3];
    var newTag = getSubfieldTag(getMARC(tag, fieldPosition, subfieldIndex));
    if (newTag != currentTag)
      $(this).text(newTag);
  });
}

function onFieldBoxClick(box){
  /*
   * Handle field select boxes.
   */
  // Check/uncheck all subfield boxes, add/remove selected class.
  var rowGroup = $('#rowGroup_' + box.id.slice(box.id.indexOf('_')+1));
  if (box.checked){
    $(rowGroup).find('td[id^=content]').andSelf().addClass('bibEditSelected');
    if (gReadOnlyMode === false){
      $('#btnDeleteSelected').removeAttr('disabled');
    }
  }
  else{
    $(rowGroup).find('td[id^=content]').andSelf().removeClass(
      'bibEditSelected');
    if (!$('.bibEditSelected').length)
      // Nothing is selected, disable "Delete selected"-button.
      $('#btnDeleteSelected').attr('disabled', 'disabled');
  }
  $(rowGroup).find('input[type="checkbox"]').attr('checked', box.checked);
}

function onSubfieldBoxClick(box){
  /*
   * Handle subfield select boxes.
   */
  var tmpArray = box.id.split('_');
  var tag = tmpArray[1], fieldPosition = tmpArray[2],
    subfieldIndex = tmpArray[3];
  var fieldID = tag + '_' + fieldPosition;
  var subfieldID = fieldID + '_' + subfieldIndex;
  // If uncheck, uncheck field box and remove selected class.
  if (!box.checked){
    $('#content_' + subfieldID).removeClass('bibEditSelected');
    $('#boxField_' + fieldID).attr('checked', false);
    $('#rowGroup_' + fieldID).removeClass('bibEditSelected');
    if (!$('.bibEditSelected').length)
      // Nothing is selected, disable "Delete selected"-button.
      $('#btnDeleteSelected').attr('disabled', 'disabled');
  }
  // If check and all other subfield boxes checked, check field box, add
  // selected class.
  else{
    $('#content_' + subfieldID).addClass('bibEditSelected');
    var field = gRecordManager.getFields(tag)[fieldPosition];
    if (field[0].length == $(
      '#rowGroup_' + fieldID + ' input[type=checkbox]' +
      '[class=bibEditBoxSubfield]:checked').length){
      $('#boxField_' + fieldID).attr('checked', true);
      $('#rowGroup_' + fieldID).addClass('bibEditSelected');
    }
    $('#btnDeleteSelected').removeAttr('disabled');
  }
}

function addFieldGatherInformations(fieldTmpNo){
  /** Gathering the information about a current form
      returns [template_num, data]
      This funcion saves the state of a form -> saving the template name and values only would
      not be enough. we want to know what has been modified in last-chosen template !
      data is in the same format as teh templates data.
  */
  var templateNum = $('#selectAddFieldTemplate_' + fieldTmpNo).attr("value");
  var tag = $("#txtAddFieldTag_" + fieldTmpNo).attr("value");

  // now checking if this is a controlfield ... controlfield if ind1 box is invisible
  if ($("#txtAddFieldInd1_" + fieldTmpNo + ":visible").length == 1){
    var ind1 = $("#txtAddFieldInd1_" + fieldTmpNo).attr("value");
    var ind2 = $("#txtAddFieldInd2_" + fieldTmpNo).attr("value");
    var subfieldTmpNo = $('#rowGroupAddField_' + fieldTmpNo).data('freeSubfieldTmpNo');
    var subfields = [];
    for (i=0;i<subfieldTmpNo;i++){
      var subfieldCode = $('#txtAddFieldSubfieldCode_' + fieldTmpNo + '_' + i).attr("value");
      var subfieldValue = $('#txtAddFieldValue_' + fieldTmpNo + '_' + i).attr("value");
      subfields.push([subfieldCode, subfieldValue]);
    }

    data = {
      "name": "nonexisting template - values taken from the field",
      "description": "The description of a template",
      "tag" : tag,
      "ind1" : ind1,
      "ind2" : ind2,
      "subfields" : subfields,
      "isControlfield" : false
    };
  } else {
    cfValue = $("#txtAddFieldValue_" + fieldTmpNo + "_0").attr("value");
    data = {
      "name": "nonexisting template - values taken from the field",
      "description": "The description of a template",
      "tag" : tag,
      "value" : cfValue,
      "isControlfield" : true
    };
  }

  return [templateNum, data];
}

function addFieldAddSubfieldEditor(jQRowGroupID, fieldTmpNo, defaultCode, defaultValue){
  /**
     Adding a subfield input control into the editor
     optional parameters:

     defaultCode - the subfield code that will be displayed
     defaultValue - the value that will be displayed by default in the editor
  */
  var subfieldTmpNo = $(jQRowGroupID).data('freeSubfieldTmpNo');
  $(jQRowGroupID).data('freeSubfieldTmpNo', subfieldTmpNo+1);

  var addFieldRows = $(jQRowGroupID + ' tr');

  $(addFieldRows).eq(addFieldRows.length-1).before(createAddFieldRow(
    fieldTmpNo, subfieldTmpNo, defaultCode, defaultValue));
  $('#txtAddFieldSubfieldCode_' + fieldTmpNo + '_' + subfieldTmpNo).bind(
    'keyup', onAddFieldChange);
  $('#btnAddFieldRemove_' + fieldTmpNo + '_' + subfieldTmpNo).bind('click', function(){
    $('#rowAddField_' + this.id.slice(this.id.indexOf('_')+1)).remove();
  });
  $('#txtAddFieldValue_' + fieldTmpNo + '_' + subfieldTmpNo).bind(
    'focus', function(){
      if ($(this).hasClass('bibEditVolatileSubfield')){
        $(this).select();
        $(this).removeClass("bibEditVolatileSubfield");
      }
    });
  var contentEditorId = '#txtAddFieldValue_' + fieldTmpNo + '_' + subfieldTmpNo;
  $(contentEditorId).bind('keyup', function(e){
    onAddFieldValueKeyPressed(e, jQRowGroupID, fieldTmpNo, subfieldTmpNo);
  });

}

function onAddFieldJumpToNextSubfield(jQRowGroupID, fieldTmpNo, subfieldTmpNo){
  // checking, how many subfields are there and if last, submitting the form
  var numberOfSubfields = $(jQRowGroupID).data('freeSubfieldTmpNo');
  if (subfieldTmpNo < (numberOfSubfields - 1)){
    var elementCode = "#txtAddFieldSubfieldCode_" + fieldTmpNo + "_" + (subfieldTmpNo + 1);
    $(elementCode)[0].focus();
  }
  else{
    addFieldSave(fieldTmpNo);
  }
}

function applyFieldTemplate(jQRowGroupID, formData, fieldTmpNo){
  /** A function that applies a template
      formNo is the number of addfield form that is treated at teh moment
      formData is the data of the field template
  */

  // first cleaning the existing fields

  $(jQRowGroupID).data('isControlfield', formData.isControlfield);
  if (formData.isControlfield){
    changeFieldToControlfield(fieldTmpNo);
    $("#txtAddFieldTag_" + fieldTmpNo).attr("value", formData.tag);
    $("#txtAddFieldInd1_" + fieldTmpNo).attr("value", '');
    $("#txtAddFieldInd2_" + fieldTmpNo).attr("value", '');
    $("#txtAddFieldValue_" + fieldTmpNo + "_0").attr("value", formData.value);
  }
  else
  {
    changeFieldToDatafield(fieldTmpNo);
    var subfieldTmpNo = $(jQRowGroupID).data('freeSubfieldTmpNo');
    $(jQRowGroupID).data('freeSubfieldTmpNo', 0);

    for (i=subfieldTmpNo-1; i>=0; i--){
      $('#rowAddField_' + fieldTmpNo + '_' + i).remove();
    }

    for (subfieldInd in formData.subfields){
      subfield = formData.subfields[subfieldInd];
      addFieldAddSubfieldEditor(jQRowGroupID, fieldTmpNo, subfield[0], subfield[1]);
    }

    // now changing the main field properties
    $("#txtAddFieldTag_" + fieldTmpNo).attr("value", formData.tag);
    $("#txtAddFieldInd1_" + fieldTmpNo).attr("value", formData.ind1);
    $("#txtAddFieldInd2_" + fieldTmpNo).attr("value", formData.ind2);
  }
}

function createAddFieldInterface(initialContent, initialTemplateNo){
  // Create form and scroll close to the top of the table.
  $(document).scrollTop(0);
  var fieldTmpNo = onAddFieldClick.addFieldFreeTmpNo;
  onAddFieldClick.addFieldFreeTmpNo += 1;
  var jQRowGroupID = '#rowGroupAddField_' + fieldTmpNo;
  $('#bibEditColFieldTag').css('width', '90px');
  var tbodyElements = $('#bibEditTable tbody');
  var insertionPoint = (tbodyElements.length >= 4) ? 3 : tbodyElements.length-1;
  $('#bibEditTable tbody').eq(insertionPoint).after(
    createAddFieldForm(fieldTmpNo, initialTemplateNo));
  $(jQRowGroupID).data('freeSubfieldTmpNo', 1);

  // Bind event handlers.
  $('#btnAddFieldAddSubfield_' + fieldTmpNo).bind('click', function(){
    addFieldAddSubfieldEditor(jQRowGroupID, fieldTmpNo, "", "");
  });
  $('#txtAddFieldTag_' + fieldTmpNo).bind('keyup', onAddFieldChange);
  $('#txtAddFieldInd1_' + fieldTmpNo).bind('keyup', onAddFieldChange);
  $('#txtAddFieldInd2_' + fieldTmpNo).bind('keyup', onAddFieldChange);
  $('#txtAddFieldSubfieldCode_' + fieldTmpNo + '_0').bind('keyup',
							  onAddFieldChange);
  $('#txtAddFieldValue_' + fieldTmpNo + '_0').bind('keyup', function (e){
    onAddFieldValueKeyPressed(e, jQRowGroupID, fieldTmpNo, 0);
  });

  $('#selectAddFieldTemplate_' + fieldTmpNo).bind('change', function(e){
      value = $('#selectAddFieldTemplate_' + fieldTmpNo).attr("value");
      applyFieldTemplate(jQRowGroupID, fieldTemplates[value], fieldTmpNo);
  });
  $('#selectAddSimilarFields_' + fieldTmpNo).bind('click', function(e){
    var data = addFieldGatherInformations(fieldTmpNo);
    var numRepetitions = parseInt($('#selectAddFieldTemplateTimes_' +
      fieldTmpNo).attr('value'), 10);
    for (var i=0; i< numRepetitions; i++){
      createAddFieldInterface(data[1], data[0]);
    }
  });

  if (initialContent != undefined){
    applyFieldTemplate(jQRowGroupID, initialContent , fieldTmpNo);
  }else{
    $(jQRowGroupID).data('isControlfield', false);
  }

  reColorFields();
  $('#txtAddFieldTag_' + fieldTmpNo).focus();
  // Color the new form for a short period.
  $(jQRowGroupID).effect('highlight', {color: gNEW_ADD_FIELD_FORM_COLOR},
    gNEW_ADD_FIELD_FORM_COLOR_FADE_DURATION);

}

function onAddSubfieldValueKeyPressed(e, tag, fieldPosition, subfieldPosition){
  if (e.which == 13){
    // enter key pressed.
    var subfieldsNum = $('#rowGroup_' + tag + '_' + fieldPosition + ' .bibEditTxtSubfieldCode').length;
    if (subfieldPosition < (subfieldsNum - 1)){
      //jump to the next field
      $('#txtAddSubfieldsCode_' + tag + '_' + fieldPosition + '_' + (subfieldPosition + 1))[0].focus();
    } else {
      onAddSubfieldsSave(e, tag, fieldPosition);
    }
  }
  if (e.which == 27){
    // escape key pressed
    $('#rowAddSubfields_' + tag + '_' + fieldPosition + '_' + 0).nextAll().andSelf().remove();
  }
}

function onAddFieldValueKeyPressed(e, jQRowGroupID, fieldTmpNo, subfieldInd){
  if (e.which == 13){
    // enter key pressed
    onAddFieldJumpToNextSubfield(jQRowGroupID, fieldTmpNo, subfieldInd);
  }
  if (e.which == 27){
    // escape key pressed
    $(jQRowGroupID).remove();
    if (!$('#bibEditTable > [id^=rowGroupAddField]').length)
      $('#bibEditColFieldTag').css('width', '48px');
    reColorFields();
  }
}
function onAddFieldClick(){
  /*
   * Handle 'Add field' button.
   */
  if (failInReadOnly())
    return;
  createAddFieldInterface();
}

// Incrementing temporary field numbers.
onAddFieldClick.addFieldFreeTmpNo = 100000;

function changeFieldToControlfield(fieldTmpNo){
  /**
     Switching the field to be a control field
   */

  // removing additional entries
  var addFieldRows = $('#rowGroupAddField_' + fieldTmpNo + ' tr');
  $(addFieldRows).slice(2, addFieldRows.length-1).remove();

  // Clear all fields.
  var addFieldTextInput = $('#rowGroupAddField_' + fieldTmpNo +
          ' input[type=text]');
  $(addFieldTextInput).val('').removeClass('bibEditInputError');

  // Toggle hidden fields.
  var elems = $('#txtAddFieldInd1_' + fieldTmpNo + ', #txtAddFieldInd2_' +
    fieldTmpNo + ', #txtAddFieldSubfieldCode_' + fieldTmpNo + '_0,' +
    '#btnAddFieldAddSubfield_' + fieldTmpNo).hide();

  $('#txtAddFieldTag_' + fieldTmpNo).focus();
}

function changeFieldToDatafield(fieldTmpNo){
  /**
     Switching the field to be a datafield
   */
  // making the elements visible
  var elems = $('#txtAddFieldInd1_' + fieldTmpNo + ', #txtAddFieldInd2_' +
    fieldTmpNo + ', #txtAddFieldSubfieldCode_' + fieldTmpNo + '_0,' +
    '#btnAddFieldAddSubfield_' + fieldTmpNo).show();

  $('#txtAddFieldTag_' + fieldTmpNo).focus();
}

function onAddFieldChange(event){
  /*
   * Validate MARC and add or remove error class.
   */

  // first handling the case of escape key, which is a little different that others
  var fieldTmpNo = this.id.split('_')[1];

  if (event.which == 27){
    // escape key pressed
    var jQRowGroupID = "#rowGroupAddField_" + fieldTmpNo;
    $(jQRowGroupID).remove();
    if (!$('#bibEditTable > [id^=rowGroupAddField]').length)
      $('#bibEditColFieldTag').css('width', '48px');
    reColorFields();
  }
  else if (this.value.length == this.maxLength){
    var fieldType;
    if (this.id.indexOf('Tag') !== -1){
      var jQRowGroupID = "#rowGroupAddField_" + fieldTmpNo;
      fieldType = ($(jQRowGroupID).data('isControlfield')) ? 'ControlTag' : 'Tag';
    }
    else if (this.id.indexOf('Ind1') != -1)
      fieldType = 'Indicator1';
    else if (this.id.indexOf('Ind2') != -1)
      fieldType = 'Indicator2';
    else
      fieldType = 'SubfieldCode';

    var valid = (((fieldType == 'Indicator1' || fieldType == 'Indicator2') &&
     (this.value == '_' || this.value == ' ')) ||
     validMARC(fieldType, this.value));
    if (!valid && !$(this).hasClass('bibEditInputError'))
      $(this).addClass('bibEditInputError');
    else if (valid){
      if ($(this).hasClass('bibEditInputError'))
      $(this).removeClass('bibEditInputError');
      if (event.keyCode != 9 && event.keyCode != 16) {
        switch(fieldType){
          case 'ControlTag':
            $(this).parent().nextAll().eq(3).children('input').focus();
	    break;
	  case 'Tag':
          case 'Indicator1':
	    $(this).next().focus();
	    break;
	  case 'Indicator2':
            // in case the indicator is present, we can be sure this is not a
            // control field... so we can safely jump to the subfield code input
            $('#txtAddFieldSubfieldCode_' + fieldTmpNo + '_0')[0].focus();
	    break;
	  case 'SubfieldCode':
	    $(this).parent().next().children('input').focus();
	    break;
          default:
	    break;
	}
      }
    }
  }
  else {
    if ($(this).hasClass('bibEditInputError')) {
      $(this).removeClass('bibEditInputError');
    }
  }
}

function onAddFieldSave(event){
  var fieldTmpNo = this.id.split('_')[1];
  addFieldSave(fieldTmpNo);
}

function addFieldSave(fieldTmpNo)
{
  /*
   * Handle 'Save' button in add field form.
   */
  updateStatus('updating');

  var jQRowGroupID = "#rowGroupAddField_" + fieldTmpNo;
  var controlfield = $(jQRowGroupID).data('isControlfield');
  var tag = $('#txtAddFieldTag_' + fieldTmpNo).val();
  var value = $('#txtAddFieldValue_' + fieldTmpNo + '_0').val();
  var subfields = [], ind1 = ' ', ind2 = ' ';

  if (controlfield){
    // Controlfield. Validate and prepare to update.
    if (RecordManager.fieldIsProtected(tag)){
      displayAlert('alertAddProtectedField', [tag]);
      updateStatus('ready');
      return;
    }
    if (!validMARC('ControlTag', tag) || value === ''){
      displayAlert('alertCriticalInput');
      updateStatus('ready');
      return;
    }
    var field = [[], ' ', ' ', value, 0];
    var fieldPosition = gRecordManager.getFieldPositionInTag(tag, field);
  }
  else{
    // Regular field. Validate and prepare to update.
    ind1 = $('#txtAddFieldInd1_' + fieldTmpNo).val();
    ind1 = (ind1 === '' || ind1 == '_') ? ' ' : ind1;
    ind2 = $('#txtAddFieldInd2_' + fieldTmpNo).val();
    ind2 = (ind2 === '' || ind2 == '_') ? ' ' : ind2;
    var MARC = tag + ind1 + ind2;
    if (RecordManager.fieldIsProtected(MARC)){
      displayAlert('alertAddProtectedField', [MARC]);
      updateStatus('ready');
      return;
    }
    var validInd1 = (ind1 == ' ' || validMARC('Indicator1', ind1));
    var validInd2 = (ind2 == ' ' || validMARC('Indicator2', ind2));
    if (!validMARC('Tag', tag) || !validInd1 || !validInd2){
      displayAlert('alertCriticalInput');
      updateStatus('ready');
      return;
    }
    // Collect valid subfields in an array.
    var invalidOrEmptySubfields = false;
     $('#rowGroupAddField_' + fieldTmpNo + ' .bibEditTxtSubfieldCode').
      each(function(){
        var subfieldTmpNo = this.id.slice(this.id.lastIndexOf('_')+1);
        var txtValue = $('#txtAddFieldValue_' + fieldTmpNo + '_' +
    subfieldTmpNo);
        var value = $(txtValue).val();
        var isStillVolatile = txtValue.hasClass('bibEditVolatileSubfield');

        if (!$(this).hasClass('bibEditInputError') &&
          this.value !== '' &&
	  !$(txtValue).hasClass('bibEditInputError') &&
          value !== ''){
            if (!isStillVolatile){
              subfields.push([this.value, value]);
            }
        }
        else
          invalidOrEmptySubfields = true;
      });

    if (invalidOrEmptySubfields){
      if (!subfields.length){
  // No valid subfields.
  displayAlert('alertCriticalInput');
  updateStatus('ready');
  return;
      }
      else if (!displayAlert('confirmInvalidOrEmptyInput')){
  updateStatus('ready');
  return;
      }
    }

    if (subfields[0] == undefined){
      displayAlert('alertEmptySubfieldsList');
      return;
    }
    var field = [subfields, ind1, ind2, '', 0];
    var fieldPosition = gRecordManager.getFieldPositionInTag(tag, field);
  }

  // adding an undo handler
  var undoHandler = UndoRedoManager.prepareUndoHandlerAddField(tag,
                                               ind1,
                                               ind2,
                                               fieldPosition,
                                               subfields,
                                               controlfield,
                                               value);
  addUndoOperation(undoHandler);

  // Create Ajax request.
  var data = {
    recID: gRecordManager.getId(),
    requestType: 'addField',
    controlfield: controlfield,
    fieldPosition: fieldPosition,
    tag: tag,
    ind1: ind1,
    ind2: ind2,
    subfields: subfields,
    value: value,
    undoRedo: undoHandler
  };
  createReq(data, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  });

  // Continue local updating.

  // get the operation of adding a field

  var opDesc = BibEditOperation.getAddFieldOperation(tag, field, fieldPosition);
  gRecordManager.performOperation(opDesc);

//  gRecordManager.insertField(tag, fieldPosition, field);

  // Remove form.
  $('#rowGroupAddField_' + fieldTmpNo).remove();
  if (!$('#bibEditTable > [id^=rowGroupAddField]').length)
      $('#bibEditColFieldTag').css('width', '48px');
  // Redraw all fields with the same tag and recolor the full table.
  redrawFields(tag);
  reColorFields();
  // Scroll to and color the new field for a short period.
  var rowGroup = $('#rowGroup_' + tag + '_' + fieldPosition);
  $(document).scrollTop($(rowGroup).position().top - $(window).height()*0.5);
  $(rowGroup).effect('highlight', {color: gNEW_CONTENT_COLOR},
         gNEW_CONTENT_COLOR_FADE_DURATION);
}


function onAddSubfieldsClick(img){
  /*
   * Handle 'Add subfield' buttons.
   */
  var fieldID = img.id.slice(img.id.indexOf('_')+1);
  addSubfield(fieldID);
}

function addSubfield(fieldID, defSubCode, defValue) {
  /* add a subfield based on fieldID, where the first 3 digits are
   * the main tag, followed by _ and the position of the field.
   * defSubCode = the default value for subfield code
  */
  var jQRowGroupID = '#rowGroup_' + fieldID;
  var tmpArray = fieldID.split('_');
  var tag = tmpArray[0];var fieldPosition = tmpArray[1];
  if ($('#rowAddSubfieldsControls_' + fieldID).length === 0){
    // The 'Add subfields' form does not exist for this field.
    $(jQRowGroupID).append(createAddSubfieldsForm(fieldID, defSubCode, defValue));
    $(jQRowGroupID).data('freeSubfieldTmpNo', 1);
    $('#txtAddSubfieldsCode_' + fieldID + '_' + 0).bind('keyup',
      onAddSubfieldsChange);
    $('#txtAddSubfieldsValue_' + fieldID + '_0').bind('keyup', function (e){
      onAddSubfieldValueKeyPressed(e, tag, fieldPosition, 0);
    });
    $('#txtAddSubfieldsCode_' + fieldID + '_' + 0).focus();
  }
  else{
    // The 'Add subfields' form exist for this field. Just add another row.
    var subfieldTmpNo = $(jQRowGroupID).data('freeSubfieldTmpNo');
    $(jQRowGroupID).data('freeSubfieldTmpNo', subfieldTmpNo+1);
    var subfieldTmpID = fieldID + '_' + subfieldTmpNo;
    $('#rowAddSubfieldsControls_' + fieldID).before(
      createAddSubfieldsRow(fieldID, subfieldTmpNo));
    $('#txtAddSubfieldsCode_' + subfieldTmpID).bind('keyup',
      onAddSubfieldsChange);
    $('#btnAddSubfieldsRemove_' + subfieldTmpID).bind('click', function(){
      $('#rowAddSubfields_' + subfieldTmpID).remove();
    });
    $('#txtAddSubfieldsValue_' + subfieldTmpID).bind('keyup', function (e){
      onAddSubfieldValueKeyPressed(e, tag, fieldPosition, subfieldTmpNo);
    });
  }
}

function onAddSubfieldsChange(event){
  /*
   * Validate subfield code and add or remove error class.
   */
  if (this.value.length == 1){
    var valid = validMARC('SubfieldCode', this.value);
    if (!valid && !$(this).hasClass('bibEditInputError'))
      $(this).addClass('bibEditInputError');
    else if (valid){
      if ($(this).hasClass('bibEditInputError'))
  $(this).removeClass('bibEditInputError');
      if (event.keyCode != 9 && event.keyCode != 16){
  $(this).parent().next().children('input').focus();
      }
    }
  }
  else if ($(this).hasClass('bibEditInputError'))
    $(this).removeClass('bibEditInputError');
}

function onAddSubfieldsSave(event, tag, fieldPosition){
  /*
   * Handle 'Save' button in add subfields form.
   */
  updateStatus('updating');

//  var tmpArray = this.id.split('_');
//  var tag = tmpArray[1], fieldPosition = tmpArray[2];
  var fieldID = tag + '_' + fieldPosition;
  var subfields = [];
  var protectedSubfield = false, invalidOrEmptySubfields = false;
  // Collect valid fields in an array.
  $('#rowGroup_' + fieldID + ' .bibEditTxtSubfieldCode').
    each(function(){
      var MARC = getMARC(tag, fieldPosition) + this.value;
      if ($.inArray(MARC, gPROTECTED_FIELDS) != -1){
        protectedSubfield = MARC;
        return false;
      }
      var subfieldTmpNo = this.id.slice(this.id.lastIndexOf('_')+1);
      var txtValue = $('#txtAddSubfieldsValue_' + fieldID + '_' +
        subfieldTmpNo);
      var value = $(txtValue).val();
      if (!$(this).hasClass('bibEditInputError') && this.value !== '' &&
          !$(txtValue).hasClass('bibEditInputError') && value !== '')
       subfields.push([this.value, value]);
     else
       invalidOrEmptySubfields = true;
     return true;
  });

  // Report problems, like protected, empty or invalid fields.
  if (protectedSubfield){
    displayAlert('alertAddProtectedSubfield');
    updateStatus('ready');
    return;
  }
  if (invalidOrEmptySubfields && !displayAlert('confirmInvalidOrEmptyInput')){
    updateStatus('ready');
    return;
  }

  if (!(subfields.length === 0)){
     // creating the undo/redo handler
    var urHandler = UndoRedoManager.prepareUndoHandlerAddSubfields(tag, fieldPosition, subfields);
    addUndoOperation(urHandler);

    // Create Ajax request
    var data = {
      recID: gRecordManager.getId(),
      requestType: 'addSubfields',
      tag: tag,
      fieldPosition: fieldPosition,
      subfields: subfields,
      undoRedo: urHandler
    };
    createReq(data, function(json){
      updateStatus('report', gRESULT_CODES[json['resultCode']]);
    });

    // Continue local updating
    gRecordManager.insertSubfields(tag, fieldPosition, subfields);

    var rowGroup  = $('#rowGroup_' + fieldID);
    var coloredRowGroup = $(rowGroup).hasClass('bibEditFieldColored');
    $(rowGroup).replaceWith(createField(tag, field, fieldPosition));
    if (coloredRowGroup)
      $('#rowGroup_' + fieldID).addClass('bibEditFieldColored');

    // Color the new fields for a short period.
    var rows = $('#rowGroup_' + fieldID + ' tr');
    $(rows).slice(rows.length - subfields.length).effect('highlight', {
      color: gNEW_CONTENT_COLOR}, gNEW_CONTENT_COLOR_FADE_DURATION);
  }
  else{
    // No valid fields were submitted.
    $('#rowAddSubfields_' + fieldID + '_' + 0).nextAll().andSelf().remove();
    updateStatus('ready');
  }
}

function convertFieldIntoEditable(cell, shouldSelect){
  // chacking if the clicked field is still present int the DOM structure ... if not, we have just removed the element
  if ($(cell).parent().parent().parent()[0] == undefined){
    return;
  }
  // first we have to detach all exisiting editables ... which means detaching the event
  editEvent = 'click';
  $(cell).unbind(editEvent);

  $(cell).editable(
    function(value){
      newVal = onContentChange(value, this);
      if (newVal.substring(0,9) == "VOLATILE:"){
        $(cell).addClass("bibEditVolatileSubfield");
        newVal = newVal.substring(9);
        $(cell).addClass("bibEditVolatileSubfield");
        if (!shouldSelect){
          // the field should start selcting all the content upon the click
          convertFieldIntoEditable(cell, true);
        }
      }
      else{
        $(cell).removeClass("bibEditVolatileSubfield");
        if (shouldSelect){
          // this is a volatile field any more - clicking should not
          // select all the content inside.
          convertFieldIntoEditable(cell, false);
        }
      }

      return newVal;
    }, {
      type: 'autogrow',
      callback: function(data, settings){
        var tmpArray = this.id.split('_');
        var tag = tmpArray[1], fieldPosition = tmpArray[2],
        subfieldIndex = tmpArray[3];

// TODO: Piotr: rewrite using the changes manager ForEach function
//        for (changeNum in gHoldingPenChanges){
        for (changeNum in gHoldingPenChangesManager.getChanges()){
//          change =  gHoldingPenChanges[changeNum];
          var change =  gHoldingPenChangesManager.getChange(changeNum);
          if (change.tag == tag &&
              change.field_position == fieldPosition &&
              change.subfield_position != undefined &&
              change.subfield_position == subfieldIndex){
              addChangeControl(changeNum, true);
          }
        }
      },
      event: editEvent,
      data: function(){
        // Get the real content from the record structure (instead of
        // from the view, where HTML entities are escaped).
        var tmpArray = this.id.split('_');
        var tag = tmpArray[1], fieldPosition = tmpArray[2],
        subfieldIndex = tmpArray[3];

        var tmpResult = "";

        if (subfieldIndex == undefined) {
          // Controlfield
          tmpResult = gRecordManager.getControlFieldValue(tag, fieldPosition);
        } else {
          tmpResult = gRecordManager.getSubfieldValue(tag, fieldPosition, subfieldIndex)
        }

        if (tmpResult.substring(0,9) == "VOLATILE:"){
          tmpResult = tmpResult.substring(9);
        }
        return tmpResult;
      },
      placeholder: '',
      width: '100%',
      onblur: 'submit',
      select: shouldSelect,
      autogrow: {
        lineHeight: 16,
        minHeight: 36
      }
    });
}

function onContentClick(cell){
  /*
   * Handle click on editable content fields.
   */
  // Check if subfield is volatile subfield from a template
  var shouldSelect = false;
  if ( $(cell).hasClass('bibEditVolatileSubfield') ){
    shouldSelect = true;
  }
  if (!$(cell).hasClass('edit_area')){
    $(cell).addClass('edit_area').removeAttr('onclick');
    convertFieldIntoEditable(cell, shouldSelect);
    $(cell).trigger('click');
  }
}

function getUpdateSubfieldValueRequestData(tag, fieldPosition, subfieldIndex, subfieldCode, value, changeNo, undoDescriptor, restoreChange){
  var data = {
    recID: gRecordManager.getId(),
    requestType: 'modifyContent',
    tag: tag,
    fieldPosition: fieldPosition,
    subfieldIndex: subfieldIndex,
    subfieldCode: subfieldCode,
    value: value
  };
  if (changeNo != undefined && changeNo != -1){
    data.hpChanges = {toDisable: [changeNo]};
  }
  if (undoDescriptor != undefined && undoDescriptor !== null){
    data.undoRedo = undoDescriptor;
  }
  return data;
}

function updateSubfieldValue(tag, fieldPosition, subfieldIndex, subfieldCode,
                             value, consumedChange, undoDescriptor){
  updateStatus('updating');
  // Create Ajax request for simple updating the subfield value
  if (consumedChange == undefined || consumedChange === null){
    consumedChange = -1;
  }

  var data = getUpdateSubfieldValueRequestData(tag,
                                               fieldPosition,
                                               subfieldIndex,
                                               subfieldCode,
                                               value,
                                               consumedChange,
                                               undoDescriptor);

  createReq(data, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  });
}

/*call autosuggest, get the values, suggest them to the user*/
/*this is typically called when autosuggest key is pressed*/
function onAutosuggest(event) {
  var mytarget = event.target;
  if (event.srcElement) mytarget = event.srcElement;/*fix for IE*/
  var myparent = mytarget.parentNode;
  var mygrandparent = myparent.parentNode;
  var parentid = myparent.id;
  var value = mytarget.value;
  var mylen = value.length;
  var replacement = ""; //used by autocomplete
  var tmpArray = mygrandparent.id.split('_');
  //alert("parentid "+ parentid +" grannyid "+ mygrandparent.id);
  /*ids for autosuggest/autocomplete html elements*/
  var content_id = 'content_'+tmpArray[1]+'_'+tmpArray[2]+'_'+tmpArray[3];
  var autosuggest_id = 'autosuggest_'+tmpArray[1]+'_'+tmpArray[2]+'_'+tmpArray[3];
  var select_id = 'select_'+tmpArray[1]+'_'+tmpArray[2]+'_'+tmpArray[3];
  var maintag = tmpArray[1], fieldPosition = tmpArray[2],
	  subfieldIndex = tmpArray[3];


  var field = gRecordManager.getField(maintag, fieldPosition);
  var subfieldcode = field[0][subfieldIndex][0];
  var subtag1 = field[1];
  var subtag2 = field[2];

  //check if this an autosuggest or autocomplete field.
  var fullcode = getMARC(maintag, fieldPosition, subfieldIndex);
  var reqtype = ""; //autosuggest or autocomplete, according to tag..

  for (var i = 0; i < gAUTOSUGGEST_TAGS.length; i++) {
    if (fullcode == gAUTOSUGGEST_TAGS[i]) {
      reqtype = "autosuggest";
    }
  }

  for (var i = 0; i < gAUTOCOMPLETE_TAGS.length; i++) {
    if (fullcode == gAUTOCOMPLETE_TAGS[i]) {
      reqtype = "autocomplete";
    }
  }

  if (fullcode == gKEYWORD_TAG) {
    reqtype = "autokeyword";
  }

  if (reqtype === "") {
    return;
  }

  // Create Ajax request.
  var data = {
    recID: gRecordManager.getId(),
    maintag: maintag,
    subtag1: subtag1,
    subtag2: subtag2,
    subfieldcode: subfieldcode,
    requestType: reqtype,
    value: value
  }; //reqtype is autosuggest, autocomplete or autokeyword

  createReq(data, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
    suggestions = json[reqtype];
    if (reqtype == 'autocomplete') {
      if ((suggestions !== null) && (suggestions.length > 0)) {
        //put the first one "here"
        replacement = suggestions[0];
        var myelement = document.getElementById(mygrandparent.id);
        if (myelement !== null) {
          //put in the the gRecord
          gRecordManager.getField(maintag, fieldPosition)[0][subfieldIndex][1] = replacement;
          mytarget.value = replacement;
        }
        //for the rest, create new subfields
        for (var i=1;i<suggestions.length;i++) {
          var valuein = suggestions[i];
          var addhereID = maintag+"_"+fieldPosition;
            //an id to indicate where the new subfield goes
          addSubfield(addhereID, subfieldcode, valuein);
        }
      } else { //autocomplete, nothing found
        alert("No suggestions for your search term "+value);
      }
    } //autocomplete
    if ((reqtype == 'autosuggest') || (reqtype == 'autokeyword')) {
      if ((suggestions !== null) && (suggestions.length > 0)) {
        /*put the suggestions in the div autosuggest_xxxx*/
        //make a nice box..
        mysel = '<table width="400" border="0"><tr><td>' +
          '<span class="bibeditscrollArea"><ul>';
        //create the select items..
        for (var i = 0; i < suggestions.length; i++) {
          tmpid = select_id + "-"+suggestions[i];
          mysel = mysel +'<li onClick="onAutosuggestSelect(\''+tmpid+'\');">' +
            suggestions[i]+"</li>";
        }
        mysel = mysel + "</ul></td>";
        //add a stylish close link in case the user does not find
        //the value among the suggestions
        mysel = mysel + "<td><form><input type='button' value='close' " +
          "onClick='onAutosuggestSelect(\""+select_id+"-"+'\");></form></td>';
        mysel = mysel + "</tr></table>";
        autosugg_in = document.getElementById(autosuggest_id);
        if (autosugg_in !== null) {
           autosugg_in.innerHTML = mysel;
        }
      } else { //there were no suggestions
        alert("No suggestions for your search term "+value);
      }
    } //autosuggest
  }, false); /*NB! This function is called synchronously.*/
} //onAutoSuggest


/*put the content of the autosuggest select into the field where autoselect was lauched*/
function onAutosuggestSelect(selectidandselval){
  /*first take the selectid. It is the string before the first hyphen*/
  var tmpArray = selectidandselval.split('-');
  var selectid = tmpArray[0];
  var selval =  tmpArray[1];
  /*generate the content element id and autosuggest element id from the selectid*/
  tmpArray = selectid.split('_');
  var content_id = 'content_'+tmpArray[1]+'_'+tmpArray[2]+'_'+tmpArray[3];
  var autosuggest_id = 'autosuggest_'+tmpArray[1]+'_'+tmpArray[2]+'_'+tmpArray[3];
  var content_t = document.getElementById(content_id); //table
  var content = null; //the actual text
  //this is interesting, since if the user is browsing the list of selections by mouse,
  //the autogrown form has disapperaed and there is only the table left.. so check..
  if (content_t.innerHTML.indexOf("<form>") === 0) {
     var content_f = null; //form
     var content_ta = null; //textarea
     if (content_t) {
         content_f = content_t.firstChild; //form is the sub-elem of table
     }
     if (content_f) {
         content_ta = content_f.firstChild; //textarea is the sub-elem of form
     }
     if (!(content_ta)) { return; }
     content = content_ta;
  } else {
     content = content_t;
  }
  /*put value in place*/
  if (selval) {
      content.innerHTML = selval;
      content.value = selval;
  }
  /*remove autosuggest box*/
  var autosugg_in = document.getElementById(autosuggest_id);
  autosugg_in.innerHTML = "";
}

function onContentChange(value, th){
  /*
   * Handle 'Save' button in editable content fields.
   */
  if (failInReadOnly()){
    return null;
  }

  var tmpArray = th.id.split('_');
  var tag = tmpArray[1];
  fieldPosition = tmpArray[2];
  subfieldIndex = tmpArray[3];

  var field = gRecordManager.getField(tag, fieldPosition);
  var oldValue = "";
  value = value.replace(/\n/g, ' '); // Replace newlines with spaces.

  if (subfieldIndex == undefined){
    // Controlfield
    if (field[3] == value)
      return escapeHTML(value);
    oldValue = field[3];
    gRecordManager.setControlFieldValue(tag, fieldPosition,  value);

    subfieldIndex = null;
    var subfieldCode = null;
  }
  else{
    if (field[0][subfieldIndex][1] == value)
      return escapeHTML(value);
    // Regular field
    oldValue = field[0][subfieldIndex][1];
    gRecordManager.setSubfieldValue(tag, fieldPosition, subfieldIndex, value);
    var subfieldCode = gRecordManager.getSubfieldCode(tag, fieldPosition, subfieldIndex);
  }

  // setting the undo/redo handler
  var newValue = escapeHTML(value);

//  var code = gRecordManager.getSubfieldCode(tag, fieldPosition, subfieldIndex);
  // TODO: Piotr: this should be tested as the above line was used which might cause problems with control fields
  var code = subfieldCode;

  urHandler = UndoRedoManager.prepareUndoHandlerChangeSubfield(tag,
                                               fieldPosition,
                                               subfieldIndex,
                                               oldValue,
                                               newValue,
                                               code, code);
  addUndoOperation(urHandler);

  // generating the Ajax request

  updateSubfieldValue(tag, fieldPosition, subfieldIndex, subfieldCode, value, null, urHandler);

  setTimeout('$("#content_' + tag + '_' + fieldPosition + '_' + subfieldIndex +
      '").effect("highlight", {color: gNEW_CONTENT_COLOR}, ' +
      'gNEW_CONTENT_COLOR_FADE_DURATION)', gNEW_CONTENT_HIGHLIGHT_DELAY);

  // Return escaped value to display.
  return newValue;
}

function onMoveSubfieldClick(type, tag, fieldPosition, subfieldIndex){
  /*
   * Handle subfield moving arrows.
   */
  if (failInReadOnly()){
    return;
  }
  updateStatus('updating');

  // Check if moving is possible
  if (type == 'up') {
    if ( (parseInt(subfieldIndex, 10) - 1 )< 0) {
      updateStatus('ready', '');
      return;
    }
  }
  else {
    if ((parseInt(subfieldIndex, 10) + 1) >= gRecordManager.getField(tag,fieldPosition)[0].length) {
      updateStatus('ready', '');
      return;
    }
  }
  // creating the undoRedo Hanglers
  var undoHandler = UndoRedoManager.prepareUndoHandlerMoveSubfields(tag,
    parseInt(fieldPosition, 10), parseInt(subfieldIndex, 10), type);
  addUndoOperation(undoHandler);

  var ajaxData = performMoveSubfield(tag, fieldPosition, subfieldIndex, type, undoHandler);
  createReq(ajaxData, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  }, false);

}

function onDeleteClick(event){
  /*
   * Handle 'Delete selected' button or delete hotkeys.
   */
  if (failInReadOnly()){
    return;
  }
  updateStatus('updating');

  var toDelete = getSelectedFields();
  // Assert that no protected fields are scheduled for deletion.
  var protectedField = RecordManager.containsProtectedField(toDelete);
  if (protectedField){
    displayAlert('alertDeleteProtectedField', [protectedField]);
    updateStatus('ready');
    return;
  }
    // register the undo Handler
  var urHandler = UndoRedoManager.prepareUndoHandlerDeleteFields(toDelete);
  addUndoOperation(urHandler);
  var ajaxData = deleteFields(toDelete, urHandler);

  createReq(ajaxData, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  });
}

function onMoveFieldUp(tag, fieldPosition) {
  if (failInReadOnly()){
    return;
  }
  fieldPosition = parseInt(fieldPosition, 10);
  var thisField = gRecordManager.getField(tag, fieldPosition);
  if (fieldPosition > 0) {
    var prevField = gRecordManager.getFields(tag)[fieldPosition-1];
    // check if the previous field has the same indicators
    if ( RecordManager.cmpFields(thisField, prevField) === 0 ) {
      var undoHandler = UndoRedoManager.prepareUndoHandlerMoveField(tag, fieldPosition, "up");
      addUndoOperation(undoHandler);
      var ajaxData = performMoveField(tag, fieldPosition, "up", undoHandler);
      createReq(ajaxData, function(json){
        updateStatus('report', gRESULT_CODES[json['resultCode']]);
      }, false);
    }
  }
}

function onMoveFieldDown(tag, fieldPosition) {
  if (failInReadOnly()){
    return;
  }
  fieldPosition = parseInt(fieldPosition, 10);
  var thisField = gRecordManager.getFields(tag)[fieldPosition];
  if (fieldPosition < gRecordManager.getFields(tag).length-1) {
    var nextField = gRecordManager.getFields(tag)[fieldPosition+1];
    // check if the next field has the same indicators
    if ( RecordManager.cmpFields(thisField, nextField) === 0 ) {
      var undoHandler = UndoRedoManager.prepareUndoHandlerMoveField(tag, fieldPosition, "down");
      addUndoOperation(undoHandler);
      var ajaxData = performMoveField(tag, fieldPosition, "down", undoHandler);
      createReq(ajaxData, function(json){
        updateStatus('report', gRESULT_CODES[json['resultCode']]);
      }, false);
    }
  }
}



function updateInterfaceAccordingToMode(){
  /* updates the user interface (in particular the activity of menu buttons)
     accordingly to the surrent operation mode of BibEdit.
   */
  // updating the switch button caption
  if (gReadOnlyMode){
    deactivateRecordMenu();
    $('#btnSwitchReadOnly').attr("innerHTML", "R/W");
  } else {
    activateRecordMenu();
    $('#btnSwitchReadOnly').attr("innerHTML", "Read-only");
  }
}

function switchToReadOnlyMode(){
  // Moving to the read only mode with BibEdit

  if (gRecordManager.isDirty() === true){
    alert("Please submit the record or cancel your changes before going to the read-only mode ");
    return false;
  }
  gReadOnlyMode = true;
  createReq({recID: gRecordManager.getId(), requestType: 'deleteRecordCache'});
  gCacheMTime = 0;

  updateInterfaceAccordingToMode();
  return true;
}

function canSwitchToReadWriteMode(){
  /*A function determining if at current moment, it is possible to switch to the read/write mode*/
  // If the revision is not the newest -> return false
  return true;
}

function switchToReadWriteMode(){
  // swtching to a normal editing mode of BibEdit
  if (!canSwitchToReadWriteMode()){
    alert("It is not possible to switch to the editing mode at the moment");
    return false;
  }

  gReadOnlyMode = false;
  // reading the record as if it was just opened
  getRecord(gRecordManager.getId());
  updateInterfaceAccordingToMode();
  return true;
}


function onSwitchReadOnlyMode(){
  // an event habdler being executed when user clicks on the switch to read only mode button
  if (gReadOnlyMode){
    switchToReadWriteMode();
  } else {
    switchToReadOnlyMode();
  }
}


// functions handling the revisions history

function getCompareClickedHandler(revisionId){
  return function(e){
    //document.location = "/record/merge/#recid1=" + gRecordManager.getId() + "&recid2=" + gRecordManager.getId() + "." + revisionId;
    var comparisonUrl = "/record/edit/compare_revisions?recid=" +
      gRecordManager.getId() + "&rev1=" + gRecordManager.getRevision() + "&rev2=" + revisionId;
    var newWindow = window.open(comparisonUrl);
    newWindow.focus();
    return false;
  };
}

function onRevertClick(revisionId){
  /*
   * Handle 'Revert' button (submit record).
   */
  updateStatus('updating');
  if (displayAlert('confirmRevert')){
    createReq({recID: gRecordManager.getId(), revId: revisionId, requestType: 'revert',
         force: onSubmitClick.force}, function(json){
    // Submission was successful.
      changeAndSerializeHash({state: 'submit', recid: gRecordManager.getId()});
      var resCode = json['resultCode'];
      cleanUp(!gNavigatingRecordSet, '', null, true);
      updateStatus('report', gRESULT_CODES[resCode]);
      displayMessage(resCode);
      // clear the list of record revisions
      resetBibeditState();
    });
    onSubmitClick.force = false;
  }
  else
    updateStatus('ready');
  holdingPenPanelRemoveEntries(); // clearing the holding pen entries list
}

function getRevertClickedHandler(revisionId){
  return function(e){
      onRevertClick(revisionId);
      return false;
  };
}

function updateRevisionsHistory(){
  if (gRecordManager.getRevisionsHistory() === null){
      return;
  }

  var result = "";
  var results = [];
  for (revInd in gRecordManager.getRevisionsHistory()){
    tmpResult = displayRevisionHistoryEntry(gRecordManager.getId(), gRecordManager.getRevisionsHistory()[revInd]);
    tmpResult["revisionID"] = gRecordManager.getRevisionsHistory()[revInd];
    results.push(tmpResult);
    result += tmpResult["HTML"];
  }

  $("#bibEditRevisionsHistory").attr("innerHTML", result);
  $(".bibEditRevHistoryEntryContent").bind("click", function(evt){
    var revision = $(this)[0].id.split("_")[1];
    updateStatus('updating');
    getRecord(gRecordManager.getId(), revision);
  });

  /*Attaching the actions on user interface*/
  for (resultInd in results){
    result = results[resultInd];
    $('#' + result['compareImgId']).bind("click",
      getCompareClickedHandler(result["revisionID"]));
    $('#' + result['revertImgId']).bind("click",
      getRevertClickedHandler(result["revisionID"]));
  }
}

function encodeXml(str){
  var resultString = "";
  for (var i=0;i<str.length;i++){
    var c = str.charAt(i);
    switch (c){
      case '<':
        resultString += "&lt;";
        break;
      case '>':
        resultString += "&gt;";
        break;
      case '&':
        resultString += "&amp;";
        break;
      case '"':
        resultString += "&quot;";
        break;
      case "'":
        resultString += "&apos;";
        break;
      default:
        resultString += c;
        break;
    }
  }
  return resultString;
}

function getSelectionMarcXml(){
  /*Gets the MARC XML of the current editor selection*/

  var checkedFieldBoxes = $('input[class="bibEditBoxField"]:checked'); // interesting only for the controlfields
                                                                       //  where no subfields are
  var checkedSubfieldBoxes = $('input[class="bibEditBoxSubfield"]:checked');

  // now constructing the interesting data

  var selectionNormal = {}; // a dictionary of identifiers taht have appeared already

  var selectionControlFields = [];

  var selectedFields = []; // a list of fields already selected
  var currentField = null; // a curently edited field

  // Collect subfields to be deleted in toDelete.
  var normalFieldsXml = "";
  var controlFieldsXml = "";

  $(checkedSubfieldBoxes).each(function(){
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2], subfieldIndex = tmpArray[3];
    if (currentField === null || currentField.tag != tag ||
        currentField.position != fieldPosition){
      if (currentField !== null){
        var newPos = selectedFields.length;
        selectedFields[newPos] = currentField;
        normalFieldsXml += "</datafield>";
      }
      // creating an empty field
      currentField={};
      currentField.subfields = [];
      currentField.tag = tag;
      currentField.position = fieldPosition;
      currentField.ind1 = gRecordManager.getFields(tag)[fieldPosition][1];
      currentField.ind2 = gRecordManager.getFields(tag)[fieldPosition][2];
      currentField.isControlField = false;
      selectionNormal[tag] = true;
      normalFieldsXml += "<datafield tag=\"" + currentField.tag + "\" ind1=\"" +
          currentField.ind1 + "\" ind2=\"" + currentField.ind2 + "\">";
    }

    // appending a current subfield
    var newPos = currentField.subfields.length;
    subfield = gRecordManager.getFields(tag)[fieldPosition][0][subfieldIndex];
    currentField.subfields[newPos] = subfield;
      normalFieldsXml += "<subfield code=\"" + subfield[0] + "\">" + encodeXml(subfield[1]) + "</subfield>";
  });

  if (currentField !== null){
    var newPos = selectedFields.length;
    selectedFields[newPos] = currentField;
    normalFieldsXml += "</datafield>";
  }

  // now extending by the control fields (they did not appear earlier)
  $(checkedFieldBoxes).each(function(){
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2];
    if (selectionNormal[tag] == undefined){
       // we have a control field ! otherwise, the field has been already utilised
      currentField = {};
      currentField.tag = tag;
      currentField.value = gRecordManager.getFields(tag)[fieldPosition][3];
      var newPos = selectionControlFields.length;
      selectionControlFields[newPos] = currentField;
      controlFieldsXml += "<controlfield tag=\"" + currentField.tag + "\">" + currentField.value+ "</controlfield>";
    }
  });

  return "<record>" + controlFieldsXml + normalFieldsXml + "</record>";

}

function onPerformCopy(){
  /** The handler performing the copy operation
   */
  if (document.activeElement.type == "textarea" || document.activeElement.type == "text"){
    /*we do not want to perform this in case we are in an ordinary text area*/
    return;
  }
  var valueToCopy = getSelectionMarcXml();
  clipboardCopyValue(valueToCopy);
}

function onPerformPaste(){
  /* Performing the paste operation -> retriexing the MARC XML from the clipboard,
     decoding and applying the code to the

     According to the default behaviour, the fields are appended as last of the same kind
   */

  if (document.activeElement.type == "textarea" || document.activeElement.type == "text"){
    /*we do not want to perform this in case we are in an ordinary text area*/
    return;
  }

  var clipboardContent = clipboardPasteValue();

  var record = null;
  try{
    record = decodeMarcXMLRecord(clipboardContent);
  } catch (err){
    alert("Error when parsing XML occured ... " + err.mesage);
  }

  var changesAdd = []; // the ajax requests for all the fields
  var undoHandlers = [];

  for (tag in record){
    if (gRecordManager.getFields(tag) == undefined){
//      gRecord[tag] = [];
      gRecordManager.setFields(tag, []);
    }

    // now appending the fields
    for (fieldInd in record[tag]){
      newPos = gRecordManager.getFields(tag).length;
      gRecordManager.getFields(tag)[newPos] = record[tag][fieldInd];
      // enqueue ajax add field request

      var isControlfield = record[tag][fieldInd][0].length === 0;
      var ind1 = record[tag][fieldInd][1];
      var ind2 = record[tag][fieldInd][2];
      var subfields = record[tag][fieldInd][0];
      var fieldvalue = record[tag][fieldInd][3]; // in case of a control field

      changesAdd.push({
        recID: gRecordManager.getId(),
        requestType: "addField",
        controlfield : isControlfield,
        fieldPosition : newPos,
        tag: tag,
        ind1: ind1,
        ind2: ind2,
        subfields: subfields,
        value: fieldvalue
      });

      undoHandler = UndoRedoManager.prepareUndoHandlerAddField(
          tag, ind1, ind2, newPos, subfields, isControlfield, value);
      undoHandlers.push(undoHandler);
    }
  }

  undoHandlers.reverse();
  var undoHandler = UndoRedoManager.prepareUndoHandlerBulkOperation(undoHandlers, "paste");
  addUndoOperation(undoHandler);
  // now sending the Ajax Request
  var optArgs = {
      undoRedo: undoHandler
  };

  createBulkReq(changesAdd, function(json){
      updateStatus('report', gRESULT_CODES[json['resultCode']]);
    }, optArgs);

  // tags have to be redrawn in the increasing order

  tags = [];
  for (tag in record){
    tags.push(tag);
  }
  tags.sort();
  for (tagInd in tags){
      redrawFields(tags[tagInd]);
  }
  reColorFields();
}
function addUndoOperation(operation){
  gUndoRedoManager.addUndoOperation(operation);
  gUndoRedoManager.invalidateRedo();
  updateUrView();
}

function adjustUndoRedoBtnsActivity(){
  /** Making the undo/redo buttons active/inactive according to the needs
   */
  if (!gUndoRedoManager.isUndoListEmpty()){
    $("#btnUndo").addAttribute("disabled", "");
  }
  else{
    $("#btnUndo").removeAttr("disabled");
  }

  if (!gUndoRedoManager.isRedoListEmpty()){
    $("#btnRedo").addAttribute("disabled", "");
  }
  else{
    $("#btnRedo").removeAttr("disabled");
  }
}


function undoMany(number){
  /** A function undoing many operations from the undo list

      Arguments:
        number: number of operations to undo
   */

  var undoOperations = [];
  for (i=0;i<number;i++){
    undoOperations.push(gUndoRedoManager.getUndoOperation());
  }
  performUndoOperations(undoOperations);
  updateUrView();
}




function urPerformAddSubfields(tag, fieldPosition, subfields, isUndo){
    var ajaxData = {
      recID: gRecordManager.getId(),
      requestType: 'addSubfields',
      tag: tag,
      fieldPosition: fieldPosition,
      subfields: subfields,
      undoRedo: (isUndo ? "undo": "redo")
    };

    gRecordManager.getFields(tag)[fieldPosition][0] = gRecordManager.getFields(tag)[fieldPosition][0].concat(subfields);
    redrawFields(tag);
    reColorFields();

    return ajaxData;
}

function performModifyHPChanges(changesList, isUndo){
  /** Undoing or redoing the operation of modifying the changeset
   */
  // first local updates
//  gHoldingPenChanges = changesList;
  gHoldingPenChangesManager.setChanges(changesList);
  refreshChangesControls();
  var result = prepareOtherUpdateRequest(isUndo);
  result.undoRedo = isUndo ? "undo" : "redo";
  result.hpChanges = {toOverride: changesList};
  return result;
}

function hideUndoPreview(){
  $("#undoOperationVisualisationField").addClass("bibEditHiddenElement");
  // clearing the selection !
  $(".bibEditURDescEntrySelected").removeClass("bibEditURDescEntrySelected");
}

function setAllUnselected(){
  // make all the fields and subfields deselected
  setSelectionStatusAll(false);
}

function setSelectionStatusAll(status){
  // Changing the selection status for all the fields
  subfieldBoxes = $('.bibEditBoxSubfield');
  subfieldBoxes.each(function(e){
    if (subfieldBoxes[e].checked != status){
      subfieldBoxes[e].click();
    }
  });
}

/*** Handlers for specific operations*/

function renderURList(list, idPrefix, isInverted){
  // rendering the view of undo/redo list into a human-readible HTML
  // list -> an undo or redo list
  // idPrefix -> te prefix of the DOM identifier

  var result = "";
  var isPair = false;
  var helperCnt = 0;

  var iterationBeginning = list.length - 1;
  var iterationJump = -1;
  var iterationEnd = -1;

  if (isInverted === true){
    iterationBeginning = 0;
    iterationJump = 1;
    iterationEnd = list.length;
  }

  for (entryInd = iterationBeginning ; entryInd != iterationEnd ; entryInd += iterationJump){
      result += "<div class=\"" + (isPair ? "bibEditURPairRow" : "bibEditUROddRow" )+ " bibEditURDescEntry\" id=\"" + idPrefix + "_" + helperCnt + "\">";
      result += getHumanReadableUREntry(list[entryInd]);
      result += "</div>";
      isPair = ! isPair;
      helperCnt += 1;
  }
  result += "";
  return result;
}

function prepareApplyHPChangeHandler(){
    // A handler for HoldingPen change application/rejection
    throw 'to implement';
}

function processURUntil(entry){
  // Executing the bulk undo/redo
  var idParts = $(entry).attr("id").split("_");
  var index = parseInt(idParts[1], 10);

  if (idParts[0] == "undo"){
    undoMany(index+1);
  }
  else{
    redoMany(index+1);
  }
}


function setAllSelected(){
  // make all the fields and subfields selected
  setSelectionStatusAll(true);
}

function showUndoPreview(){
  $("#undoOperationVisualisationField").removeClass("bibEditHiddenElement");
}


// Handlers to implement:

function setFieldUnselected(tag, fieldPos){
  // unselect a given field
  setSelectionStatusField(tag, fieldPos, false);
}

function urPerformRemoveField(tag, position, isUndo){
  var toDeleteData = {};
  var toDeleteTmp = {};
  toDeleteTmp[position] = [];
  toDeleteData[tag] =  toDeleteTmp;

  // first preparing the data of Ajax request

  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'deleteFields',
    toDelete: toDeleteData,
    undoRedo: (isUndo ? "undo": "redo")
  };

  // updating the local model
  gRecordManager.getFields(tag).splice(position,1);
  if (gRecordManager.getFields(tag) == []){
    gRecordManager.getFields(tag) = undefined;
  }
  redrawFields(tag);
  reColorFields();

  return ajaxData;
}

function prepareOtherUpdateRequest(isUndo){
  return {
    requestType : 'otherUpdateRequest',
    recID : gRecordManager.getId(),
      undoRedo: ((isUndo === true) ? "undo" : "redo"),
    hpChanges: {}
  };
}

function performUndoApplyHpChanges(subRequests, oldChanges){
  /**
   Arguemnts:
     subRequests - subrequests performing the appropriate undo operations
   */

  // removing all teh undo/redo informations as they should be passed globally
  for (ind in subRequests){
      subRequests[ind].undoRedo = undefined;
  }
//  var gHoldingPenChanges
  return {
    requestType: 'applyBulkUpdates',
    undoRedo: "undo",
    requestsData: subRequests,
    hpChanges: {toOverride: oldChanges}
  };
}

function performBulkOperation(subHandlers, isUndo){
  /**
   return the bulk operation
   Arguments:
     subReqs : requests performing the sub-operations
     isUndo - is current request undo or redo ?
   */
  var subReqs = [];
  if (isUndo === true){
    subReqs = preparePerformUndoOperations(subHandlers);
  } else {
    // We can not simply assign and revers as the original would be modified
    var handlers = [];
    for (handlerInd = subHandlers.length -1; handlerInd >= 0; handlerInd--){
      handlers.push(subHandlers[handlerInd]);
    }
    subReqs = preparePerformRedoOperations(handlers);
  }

  for (ind in subReqs){
    subReqs[ind].undoRedo = undefined;
  }

  return {
    requestType: 'applyBulkUpdates',
    undoRedo: (isUndo === true ? "undo" : "redo"),
    requestsData: subReqs,
    hpChanges: {}
  };
}

function preparePerformRedoOperations(operations){
  /** Redos an operation passed as an argument */
  var ajaxRequestsData = [];
  for (operationInd in operations){
    var operation = operations[operationInd];
    var ajaxData = {};
    var isMultiple = false; // is the current decription a list of descriptors ?
    switch (operation.operation_type){
    case "no_operation":
      ajaxData = prepareOtherUpdateRequest(false);
      break;
    case "change_content":
      ajaxData = urPerformChangeSubfieldContent(operation.tag,
                                     operation.fieldPos,
                                     operation.subfieldPos,
                                     operation.newCode,
                                     operation.newVal,
                                     false);
      break;
    case "add_field":
      ajaxData = urPerformAddField(operation.isControlField,
                        operation.fieldPosition,
                        operation.tag,
                        operation.ind1,
                        operation.ind2,
                        operation.subfields,
                        operation.value,
                        false);
      break;
     case "add_subfields":
       ajaxData = urPerformAddSubfields(operation.tag,
                             operation.fieldPosition,
                             operation.newSubfields,
                             false);
       break;

    case "delete_fields":
      ajaxData = urPerformDeletePositionedFieldsSubfields(operation.toDelete, false);
      break;

    case "move_field":
      ajaxData = performMoveField(operation.tag, operation.field_position, operation.direction , false);
      break;
    case "move_subfield":
      ajaxData = performMoveSubfield(operation.tag, operation.field_position, operation.subfield_position, operation.direction, false);
      break;
    case "bulk_operation":
      ajaxData = performBulkOperation(operation.handlers, false);
      break;
    case "apply_hp_change":
      removeViewedChange(operation.changeNo); // we redo the change application so the change itself gets removed
      ajaxData = preparePerformRedoOperations([operation.handler]);
      ajaxData[0].hpChange = {};
      ajaxData[0].hpChange.toDisable = [operation.changeNo]; // reactivate this change
      isMultiple = true;
      break;

    case "apply_hp_changes":
      // in this case many changes are applied at once and the list of changes is completely overriden
      ajaxData = performUndoApplyHpChanges();
      break;
    case "change_field":
      ajaxData = urPerformChangeField(operation.tag, operation.fieldPos,
                                      operation.newInd1, operation.newInd2,
                                      operation.newSubfields,
                                      operation.newIsControlField,
                                      operation.oldValue , false);
      break;
    case "visualize_hp_changeset":
      ajaxData = prepareVisualizeChangeset(operation.changesetNumber,
        operation.newChangesList, "redo");
      break;
    case "remove_all_hp_changes":
      ajaxData = performModifyHPChanges([], false);
      break;

    default:
      alert("Error: wrong operation to redo");
      break;
    }
    // now dealing with the results
    if (isMultiple){
      // in this case we have to merge lists rather than include inside
      for (elInd in ajaxData){
        ajaxRequestsData.push(ajaxData[elInd]);
      }
    }
    else{
      ajaxRequestsData.push(ajaxData);
    }
  }
  return ajaxRequestsData;
}

function performRedoOperations(operations){
  ajaxRequestsData = preparePerformRedoOperations(operations);
  // now submitting the bulk request
  var optArgs = {
//      undoRedo: "redo"
  };

  createBulkReq(ajaxRequestsData, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  }, optArgs);
}


function setSubfieldUnselected(tag, fieldPos, subfieldPos){
 // unseelcting a subfield
  setSelectionStatusSubfield(tag, fieldPos, subfieldPos, false);
}


function setFieldSelected(tag, fieldPos){
  // select a given field
  setSelectionStatusField(tag, fieldPos, true);
}

function redoMany(number){
  // redoing an indicated number of operations
  var redoOperations = [];
  for (i=0;i<number;i++){
    redoOperations.push(gUndoRedoManager.getRedoOperation());
  }
  performRedoOperations(redoOperations);
  updateUrView();
}
function urPerformAddField(controlfield, fieldPosition, tag, ind1, ind2, subfields, value, isUndo){
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'addField',
    controlfield: controlfield,
    fieldPosition: fieldPosition,
    tag: tag,
    ind1: ind1,
    ind2: ind2,
    subfields: subfields,
    value: value,
    undoRedo: (isUndo? "undo": "redo")
  };

//  createReq(data, function(json){
//    updateStatus('report', gRESULT_CODES[json['resultCode']]);
//  });

  // updating the local situation
  if (gRecordManager.getFields(tag) == undefined){
    gRecordManager.setField(tag, []);
//    gRecord[tag] = [];
  }
  var newField = [(controlfield ? [] : subfields), ind1, ind2,
                  (controlfield ? value: ""), 0];
  gRecordManager.getFields(tag).splice(fieldPosition, 0, newField);
  redrawFields(tag);
  reColorFields();

  return ajaxData;
}

function urPerformRemoveSubfields(tag, fieldPosition, subfields, isUndo){
  var toDelete = {};
  toDelete[tag] = {};
  toDelete[tag][fieldPosition] = [];
  var startingPosition = gRecordManager.getFields(tag)[fieldPosition][0].length - subfields.length;
  for (var i=startingPosition; i < gRecordManager.getFields(tag)[fieldPosition][0].length ; i++){
    toDelete[tag][fieldPosition].push(i);
  }

  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'deleteFields',
    toDelete: toDelete,
    undoRedo: (isUndo ? "undo": "redo")
  };

//  createReq(data, function(json){
//    updateStatus('report', gRESULT_CODES[json['resultCode']]);
//  });
  // modifying the client-side interface
  gRecordManager.getFields(tag)[fieldPosition][0].splice( gRecordManager.getFields(tag)[fieldPosition][0].length - subfields.length, subfields.length);
  redrawFields(tag);
  reColorFields();

  return ajaxData;
}

function updateUrView(){
  /*Updating the information box in the bibEdit menu
    (What are the current undo/redo handlers*/
  $('#undoOperationVisualisationFieldContent')[0].innerHTML =
    (gUndoRedoManager.isUndoListEmpty()) ? "(empty)" :
      renderURList(gUndoRedoManager.getUndoList(), "undo");
  $('#redoOperationVisualisationFieldContent')[0].innerHTML =
    (gUndoRedoManager.isRedoListEmpty()) ? "(empty)" :
      renderURList(gUndoRedoManager.getRedoList(), "redo", true);

  // now attaching the events ... the function is uniform for all the elements present inside the document

    var urEntries = $('.bibEditURDescEntry');
    urEntries.each(function(index){
        $(urEntries[index]).bind("mouseover", function (e){
          $(urEntries[index]).find(".bibEditURDescEntryDetails").removeClass("bibEditHiddenElement");
            urMarkSelectedUntil(urEntries[index]);
        });
        $(urEntries[index]).bind("mouseout", function(e){
          $(urEntries[index]).find(".bibEditURDescEntryDetails").addClass("bibEditHiddenElement");
        });
        $(urEntries[index]).bind("click", function(e){
            processURUntil(urEntries[index]);
        });
    });
}

function performMoveSubfield(tag, fieldPosition, subfieldIndex,
                             direction, undoRedo){
  var newSubfieldIndex = parseInt(subfieldIndex, 10) +
    (direction == "up" ? -1 : 1);
  var fieldID = tag + '_' + fieldPosition;
  var field = gRecordManager.getFields(tag)[fieldPosition];
  var subfields = field[0];

  // Create Ajax request.
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'moveSubfield',
    tag: tag,
    fieldPosition: fieldPosition,
    subfieldIndex: subfieldIndex,
    newSubfieldIndex: newSubfieldIndex,
    undoRedo: (undoRedo === true) ?  "undo" :
      ((undoRedo === false) ? "redo" : undoRedo)
  };

  // Continue local updating.
  var subfieldToSwap = subfields[newSubfieldIndex];
  subfields[newSubfieldIndex] = subfields[subfieldIndex];
  subfields[subfieldIndex] = subfieldToSwap;
  var rowGroup = $('#rowGroup_' + fieldID);
  var coloredRowGroup = $(rowGroup).hasClass('bibEditFieldColored');
  $(rowGroup).replaceWith(createField(tag, field, fieldPosition));
  if (coloredRowGroup)
    $('#rowGroup_' + fieldID).addClass('bibEditFieldColored');

  // taking care of having only the new subfield position selected
  setAllUnselected();
  setSubfieldSelected(tag, fieldPosition, newSubfieldIndex);

  return ajaxData;
}

function onRedo(evt){
  if (gUndoRedoManager.isRedoListEmpty()){
    alert("No Redo operations to process");
    return;
  }
  redoMany(1);
}

// functions related to the automatic field selection/unseletion

function hideRedoPreview(){
  $("#redoOperationVisualisationField").addClass("bibEditHiddenElement");
  // clearing the selection !
  $(".bibEditURDescEntrySelected").removeClass("bibEditURDescEntrySelected");
}

function urPerformAddPositionedFieldsSubfields(toAdd, isUndo){
  return createFields(toAdd, isUndo);
}

function setSubfieldSelected(tag, fieldPos, subfieldPos){
  // selecting a subfield
  setSelectionStatusSubfield(tag, fieldPos, subfieldPos, true);
}

function getHumanReadableUREntry(handler){
  // rendering a human readable description of an undo/redo operation
  // handler : the u/r handler to render
  var operationDescription;

  switch (handler.operation_type){
    case "move_field":
      operationDescription = "move field";
      break;
    case "change_field":
      operationDescription = "change field";
      break;
    case "move_subfield":
      operationDescription = "move subfield";
      break;
    case "change_content":
      operationDescription = "edit subfield";
      break;
    case "add_field":
      operationDescription = "add field";
      break;
    case "add_subfields":
      operationDescription = "add field";
      break;
    case "delete_fields":
      operationDescription = "delete";
      break;
    case "bulk_operation":
      operationDescription = handler.title;
      break;
    case "apply_hp_change":
      operationDescription = "holding pen";
      break;
    case "visualize_hp_changeset":
      operationDescription = "show changes";
      break;
    case "remove_all_hp_changes":
      operationDescription = "remove changes";
      break;
    default:
      operationDescription = "unknown operation";
      break;
  }

  // now rendering parameters of the handler
  var readableDescriptors = {
    'tag' : 'tag',
    'operation_type' : false,
    'field_position' : 'field position',
    'subfield_position' : 'subfield position',
    'newVal' : 'new value',
    'oldVal' : 'old value',
    'fieldPos' : 'field position',
    'toDelete' : false,
    'handlers' : false
  };

  var handlerDetails = '<table>';

  for (characteristic in handler){
    if (readableDescriptors[characteristic] !== false){
      var characteristicString = characteristic;
      if (readableDescriptors[characteristic] != undefined){
          characteristicString = readableDescriptors[characteristic];
      }
      handlerDetails += '<tr><td class="bibEditURDescChar">' +
        characteristicString + ':</td><td>' + handler[characteristic]  +
        '</td></tr>';
    }
  }

  handlerDetails += '</table>';
  // now generating the final result
  return '<div class="bibEditURDescHeader">' + operationDescription +
    '</div><div class="bibEditURDescEntryDetails bibEditHiddenElement">' +
    handlerDetails + '</div>';
}

function urMarkSelectedUntil(entry){
    // marking all the detailed entries, until a given one as selected
    //  these entries have the same prefix but a smaller number
    var identifierParts = $(entry).attr("id").split("_");
    var position = parseInt(identifierParts[1], 10);
    var potentialElements = $(".bibEditURDescEntry");
    potentialElements.each(function(index){
        var curIdentifierParts = $(potentialElements[index]).attr("id").split("_");
        if ((curIdentifierParts[0] == identifierParts[0]) &&
            (parseInt(curIdentifierParts[1], 10) <= position)){
           $(potentialElements[index]).addClass("bibEditURDescEntrySelected");
        }
        else {
           $(potentialElements[index]).removeClass("bibEditURDescEntrySelected");
        }
    });
}

function onUndo(evt){
  if (gUndoRedoManager.isUndoListEmpty()){
    alert("No Undo operations to process");
    return;
  }
  undoMany(1);
}

function preparePerformUndoOperations(operations){
  /** Undos an operation passed as an argument */
  var ajaxRequestsData = [];
  for (operationInd in operations){
    var operation = operations[operationInd];
    var action = null;
    var actionData = null;
    var ajaxData = {};
    var isMultiple = false; // is the current oepration handler a list
      // of operations rather than a single op ?

    switch (operation.operation_type){
    case "no_operation":
      ajaxData = prepareOtherUpdateRequest(true);
      break;
    case "change_content":
      ajaxData = urPerformChangeSubfieldContent(operation.tag,
                                     operation.fieldPos,
                                     operation.subfieldPos,
                                     operation.oldCode,
                                     operation.oldVal,
                                     true);
      break;
    case "add_field":
      ajaxData = urPerformRemoveField(operation.tag,
                            operation.fieldPosition,
                                              true);
      break;
    case "add_subfields":
      ajaxData = urPerformRemoveSubfields(operation.tag,
                               operation.fieldPosition,
                               operation.newSubfields,
                               true);
      break;

    case "delete_fields":
      ajaxData = urPerformAddPositionedFieldsSubfields(operation.toDelete, true);
      break;

    case "move_field":
      var newDirection = "up";
      var newPosition = operation.field_position + 1;
      if (operation.direction == "up"){
        newDirection = "down";
        newPosition = operation.field_position - 1;
      }

      ajaxData = performMoveField(operation.tag, newPosition, newDirection, true);
      break;
    case "move_subfield":
      var newDirection = "up";
      var newPosition = operation.subfield_position + 1;
      if (operation.direction == "up"){
        newDirection = "down";
        newPosition = operation.subfield_position - 1;
      }
      ajaxData = performMoveSubfield(operation.tag, operation.field_position,
        newPosition, newDirection, true);
      break;
    case "bulk_operation":
      ajaxData = performBulkOperation(operation.handlers, true);
      break;
    case "apply_hp_change":
      ajaxData = preparePerformUndoOperations([operation.handler]);
      ajaxData[0]["hpChange"] = {};
      ajaxData[0]["hpChange"]["toEnable"] = [operation.changeNo]; // reactivate
      isMultiple = true;
      revertViewedChange(operation.changeNo);
      break;
    case "visualize_hp_changeset":
      ajaxData = prepareUndoVisualizeChangeset(operation.changesetNumber,
        operation.oldChangesList);
      break;
    case "change_field":
      ajaxData = urPerformChangeField(operation.tag, operation.fieldPos,
                                      operation.oldInd1, operation.oldInd2,
                                      operation.oldSubfields,
                                      operation.oldIsControlField,
                                      operation.oldValue , true);
      break;
    case "remove_all_hp_changes":
      ajaxData = performModifyHPChanges(operation.old_changes_list, true);
      break;
    default:
      alert("Error: wrong operation to undo");
      break;
    }

    if (isMultiple){
      // in this case we have to merge lists rather than include inside
      for (elInd in ajaxData){
        ajaxRequestsData.push(ajaxData[elInd]);
      }
    }
    else{
      ajaxRequestsData.push(ajaxData);
    }
  }

  return ajaxRequestsData;
}

function performUndoOperations(operations){
  var ajaxRequestsData = preparePerformUndoOperations(operations);
  // now submitting the ajax request
  var optArgs={
//    undoRedo: "undo"
  };

  createBulkReq(ajaxRequestsData, function(json){
    updateStatus('report', gRESULT_CODES[json['resultCode']]);
  }, optArgs);
}



function showRedoPreview(){
  $("#redoOperationVisualisationField").removeClass("bibEditHiddenElement");
}

function deleteFields(toDeleteStruct, undoRedo){
  // a function deleting the specified fields on both client and server sides
  //
  // toDeleteFields : a structure describing fields and subfields to delete
  //   this structure is the same as for the function createFields

  var toDelete = {};

  // first we convert the data into a different format, loosing the informations about
  //   subfields of entirely removed fields

  // first the entirely deleted fields
  for (tag in toDeleteStruct.fields){
    if (toDelete[tag] == undefined){
      toDelete[tag] = {};
    }
    for (fieldPos in toDeleteStruct.fields[tag]){
      toDelete[tag][fieldPos] = [];
    }
  }

  for (tag in toDeleteStruct.subfields){
    if (toDelete[tag] == undefined){
      toDelete[tag] = {};
    }
    for (fieldPos in toDeleteStruct.subfields[tag]){
      toDelete[tag][fieldPos] = [];
      for (subfieldPos in toDeleteStruct.subfields[tag][fieldPos]){
        toDelete[tag][fieldPos].push(subfieldPos);
      }
    }
  }

  var tagsToRedraw = [];

  // reColorTable is true if any field are completely deleted.
  var reColorTable = false;

  // first we have to encode all the data in a single dictionary

  // Create Ajax request.
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'deleteFields',
    toDelete: toDelete,
    undoRedo: (undoRedo === true) ? "undo" : ((undoRedo === false) ? "redo" :
      undoRedo)
  };

  // Continue local updating.
  // Parse data structure and delete accordingly in record.
  var fieldsToDelete, subfieldIndexesToDelete, field, subfields, subfieldIndex;
  for (var tag in toDelete) {
    tagsToRedraw.push(tag);
    fieldsToDelete = toDelete[tag];
    // The fields should be treated in the decreasing order (during the removal, indices may change)
    traversingOrder = [];
    for (fieldPosition in fieldsToDelete) {
      traversingOrder.push(fieldPosition);
    }
    // normal sorting will do this in a lexycographical order ! (problems if > 10 subfields
    // function provided, allows sorting in the reversed order
    var traversingOrder = traversingOrder.sort(function(a, b){
      return b - a;
    });

    for (var fieldInd in traversingOrder) {
      var fieldPosition = traversingOrder[fieldInd];
      var fieldID = tag + '_' + fieldPosition;
      subfieldIndexesToDelete = fieldsToDelete[fieldPosition];
      if (subfieldIndexesToDelete.length === 0)
        gRecordManager.deleteFieldFromTag(tag, fieldPosition);
      else {
        // normal sorting will do this in a lexycographical order ! (problems if > 10 subfields
        subfieldIndexesToDelete.sort(function(a, b){
          return a - b;
        });
        field = gRecordManager.getFields(tag)[fieldPosition];
        subfields = field[0];
        for (var j = subfieldIndexesToDelete.length - 1; j >= 0; j--){
          subfields.splice(subfieldIndexesToDelete[j], 1);
        }
      }
    }
  }

  // If entire fields has been deleted, redraw all fields with the same tag
  // and recolor the full table.
  for (tag in tagsToRedraw)
      redrawFields(tagsToRedraw[tag]);
  reColorFields();

  return ajaxData;
}

function getSelectedFields(){
  /** Function returning a list of selected fields
    Returns all the fields and subfields that are slected.
    The structure of a result is following:
    {
      "fields" : { tag: {fieldsPosition: field_structure_similar_to_on_from_gRecord}}
      "subfields" : {tag: { fieldPosition: { subfieldPosition: [code, value]}}}
    }
  */
  var selectedFields = {};
  var selectedSubfields = {};

  var checkedFieldBoxes = $('input[class="bibEditBoxField"]:checked');
  var checkedSubfieldBoxes = $('input[class="bibEditBoxSubfield"]:checked');

  if (!checkedFieldBoxes.length && !checkedSubfieldBoxes.length)
    // No fields selected
    return null;

  // Collect fields to be deleted in toDelete.
  $(checkedFieldBoxes).each(function(){
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2];
    if (!selectedFields[tag]) {
      selectedFields[tag] = {};
    }
    selectedFields[tag][fieldPosition] = gRecordManager.getFields(tag)[fieldPosition];
  });

  // Collect subfields to be deleted in toDelete.
  $(checkedSubfieldBoxes).each(function(){
    var tmpArray = this.id.split('_');
    var tag = tmpArray[1], fieldPosition = tmpArray[2], subfieldIndex = tmpArray[3];
    if (selectedFields[tag] == undefined || selectedFields[tag][fieldPosition] == undefined){
      // this field has not been selected entirely, we can proceed with processing subfield slection
      if (!selectedSubfields[tag]) {
        selectedSubfields[tag] = {};
        selectedSubfields[tag][fieldPosition] = {};
        selectedSubfields[tag][fieldPosition][subfieldIndex] =
          gRecordManager.getFields(tag)[fieldPosition][0][subfieldIndex];
      }
      else {
        if (!selectedSubfields[tag][fieldPosition])
          selectedSubfields[tag][fieldPosition] = {};
        selectedSubfields[tag][fieldPosition][subfieldIndex] =
          gRecordManager.getFields(tag)[fieldPosition][0][subfieldIndex];
      }
    } // else - this subfield is a part of entirely selected field...
      // we have already included the information about subfields
  });
  var result={};
  result.fields = selectedFields;
  result.subfields = selectedSubfields;
  return result;
}

function urPerformChangeSubfieldContent(tag, fieldPos, subfieldPos, code, val, isUndo){
  // changing the server side model
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'modifyContent',
    tag: tag,
    fieldPosition: fieldPos,
    subfieldIndex: subfieldPos,
    subfieldCode: code,
    value: val,
    undoRedo: (isUndo ? "undo": "redo")
  };
//  createReq(data, function(json){
//    updateStatus('report', gRESULT_CODES[json['resultCode']]);
//  });

  // changing the model
  gRecordManager.getFields(tag)[fieldPos][0][subfieldPos][0] = code;
  gRecordManager.getFields(tag)[fieldPos][0][subfieldPos][1] = val;

  // changing the display .... what if being edited right now ?
  redrawFields(tag);
  reColorFields();

  return ajaxData;
}


function performChangeField(tag, fieldPos, ind1, ind2, subFields, isControlfield,
  value, undoRedo){
  /** Function changing the field structure and generating an appropriate AJAX
      request handler
      Arguments:
        tag, fieldPos, ind1, ind2, subFields, isControlfield, value - standard
          values describing a field. tag, fieldPos are used to locate the field
          instance (which has to exist) and its content is modified accordingly.
        undoRedo - a undoRedo Handler or one of the words "undo"/"redo"
   */
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: "modifyField",
    controlfield : isControlfield,
    fieldPosition : fieldPos,
    ind1: ind1,
    ind2: ind2,
    tag: tag,
    subFields: subFields,
    undoRedo : undoRedo,
    hpChanges: {}
  };

  // local changes
  var fields = gRecordManager.getFields(tag);

  fields[fieldPos][0] = subFields;
  fields[fieldPos][1] = ind1;
  fields[fieldPos][2] = ind2;
  fields[fieldPos][3] = value;
  redrawFields(tag);
  reColorFields();

  return ajaxData;
}

function urPerformChangeField(tag, fieldPos, ind1, ind2, subFields,
  isControlfield, value, isUndo){
  /**
   */
  return performChangeField(tag, fieldPos, ind1, ind2, subFields,
    isControlfield, value, (isUndo ? "undo" : "redo"));
}

function performMoveField(tag, oldFieldPosition, direction, undoRedo){
  var newFieldPosition = oldFieldPosition + (direction == "up" ? -1 : 1);
  // Create Ajax request.
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'moveField',
    tag: tag,
    fieldPosition: oldFieldPosition,
    direction: direction,
    undoRedo: (undoRedo === true) ? "undo" : ((undoRedo === false) ? "redo" : undoRedo)
  };

  //continue updating locally

  gRecordManager.swapFieldInstances(tag, oldFieldPosition, newFieldPosition);

  $('tbody#rowGroup_'+tag+'_'+(newFieldPosition)).replaceWith(
      createField(tag, gRecordManager.getFields(tag)[newFieldPosition], newFieldPosition));
  $('tbody#rowGroup_'+tag+'_'+oldFieldPosition).replaceWith(
      createField(tag, gRecordManager.getFields(tag)[oldFieldPosition], oldFieldPosition));

  reColorFields();

  // Now taking care of having the new field selected and the rest unselected
  setAllUnselected();
  setFieldSelected(tag, newFieldPosition);
//$('#boxField_'+tag+'_'+(newFieldPosition)).click();
  return ajaxData;
}

function setSelectionStatusField(tag, fieldPos, status){
  var fieldCheckbox = $('#boxField_' + tag + '_' + fieldPos);
  var subfieldCheckboxes = $('#rowGroup_' + tag + '_' + fieldPos + ' .bibEditBoxSubfield');

  fieldCheckbox.each(function(ind){
      if (fieldCheckbox[ind].checked != status)
      {
          fieldCheckbox[ind].click();
      }
  });
}

function urPerformDeletePositionedFieldsSubfields(toDelete, isUndo){
  return deleteFields(toDelete, isUndo);
}

/** General Undo/Redo treatment lists */

function setSelectionStatusSubfield(tag, fieldPos, subfieldPos, status){
  var subfieldCheckbox = $('#boxSubfield_' + tag + '_' + fieldPos + '_' + subfieldPos);
  if (subfieldCheckbox[0].checked != status)
  {
      subfieldCheckbox[0].click();
  }
}

function createFields(toCreateFields, isUndo){
  // a function adding fields.
  // toCreateFields : a structure describing fields and subfields to create
  //   this structure is the same as for the function deleteFields

  // 1) Preparing the AJAX request
  var tagsToRedraw = {};
  var ajaxData = {
    recID: gRecordManager.getId(),
    requestType: 'addFieldsSubfieldsOnPositions',
    fieldsToAdd: toCreateFields.fields,
    subfieldsToAdd: toCreateFields.subfields
  };

  if (isUndo != undefined){
    ajaxData['undoRedo'] = (isUndo ? "undo": "redo");
  }

  // 2) local processing -> creating the fields locally
  //   - first creating the missing fields so all the subsequent field indices are correcr
  for (tag in toCreateFields.fields){
    if (gRecordManager.getFields(tag) == undefined){
      gRecordManager.setFields(tag, []);
    }
    tagsToRedraw[tag] = true;
    var fieldIndices = [];
    for (fieldPos in toCreateFields.fields[tag]){
      fieldIndices.push(fieldPos);
    }
    fieldIndices.sort(); // we have to add fields in the increasing order
      for (indInd in fieldIndices){
        var fieldIndexToAdd = fieldIndices[indInd]; // index of the field index to add in the indices array
        var newField = toCreateFields.fields[tag][fieldIndexToAdd];
        gRecordManager.getFields(tag).splice(fieldIndexToAdd, 0, newField);
      }
  }

  //   - now appending the remaining subfields

  for (tag in toCreateFields.subfields){
    tagsToRedraw[tag] = true;
    for (fieldPos in toCreateFields.subfields[tag]){
      var subfieldPositions = [];
      for (subfieldPos in toCreateFields.subfields[tag][fieldPos]){
        subfieldPositions.push(subfieldPos);
      }
      subfieldPositions.sort();
      for (subfieldInd in subfieldPositions){
        subfieldPosition = subfieldPositions[subfieldInd];
        gRecordManager.getFields(tag)[fieldPos][0].splice(
          subfieldPosition, 0,
          toCreateFields.subfields[tag][fieldPos][subfieldPosition]);
      }
    }
  }

  // - redrawint the affected tags

  for (tag in tagsToRedraw){
   redrawFields(tag);
  }
  reColorFields();

  return ajaxData;
}


/* Bibcirculation Panel functions */

function isBibCirculationPanelNecessary(){
  /** A function checking if the BibCirculation connectivity panel should
      be displayed. This information is derieved from the state of the record.
      Returns true or false
  */

  if (gRecordManager.getId() === null){
    return false;
  }

  // only if the record is saved and exists in the database and belongs
  // to a particular colelction
  return gDisplayBibCircPanel;
}


function updateBibCirculationPanel(){
  /** Updates the BibCirculation panel contents and visibility
  */
  if (gDisplayBibCircPanel === false){
    // in case, the panel is present, should be hidden
    $("#bibEditBibCircConnection").addClass("bibEditHiddenElement");
  }
  else {
    // the panel must be present - we have to show it
    $(".bibEditBibCircConnection").removeClass("bibEditHiddenElement");
  }

  var interfaceElement = $("#bibEditBibCircConnection");
  if (isBibCirculationPanelNecessary()){
    interfaceElement.removeClass("bibEditHiddenElement");
  } else {
    interfaceElement.addClass("bibEditHiddenElement");
  }

  // updating the content
  var copiesCountElement = $('#bibEditBibCirculationCopies');
  copiesCountElement.attr("innerHTML", gPhysCopiesNum);
}

function bibCircIntGetEditCopyUrl(recId){
  /**A function returning the address under which, the edition of a
      given record is possible
  */

//  return "/admin/bibcirculation/bibcirculationadmin.py/get_item_details?recid=" + recId;
  return gBibCircUrl;
}


function onBibCirculationBtnClicked(e){
  /** A function redirecting the user to the BibCiculation web interface
  */
  var link = bibCircIntGetEditCopyUrl(gRecordManager.getId());
  window.open(link);
}
