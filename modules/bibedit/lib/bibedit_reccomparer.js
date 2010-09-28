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


/** a class providing methods for record comparison and generating the changes lists
    by exchanging this class, it is possible to exchange the algorithm for comparing
    records
*/

// TODO: Piotr: implement a smarter comparer that would use the Levenstein measure

function RecordComparer(){

}

RecordComparer.compareFields = function(fieldId, indicators, fieldPos, field1, field2){
  result = [];
  for (sfPos in field2){
    if (field1[sfPos] == undefined){
      //  adding the subfield at the end of the record can be treated in a more graceful manner
      result.push(
          {"change_type" : "subfield_added",
           "tag" : fieldId,
           "indicators" : indicators,
           "field_position" : fieldPos,
           "subfield_code" : field2[sfPos][0],
           "subfield_content" : field2[sfPos][1]});
    }
    else
    {
      // the subfield exists in both the records
      if (field1[sfPos][0] != field2[sfPos][0]){
      //  a structural change ... we replace the entire field
        return [{"change_type" : "field_changed",
           "tag" : fieldId,
           "indicators" : indicators,
           "field_position" : fieldPos,
           "field_content" : field2}];
      } else
      {
        if (field1[sfPos][1] != field2[sfPos][1]){
          result.push({"change_type" : "subfield_changed",
            "tag" : fieldId,
            "indicators" : indicators,
            "field_position" : fieldPos,
             "subfield_position" : sfPos,
            "subfield_code" : field2[sfPos][0],
            "subfield_content" : field2[sfPos][1]});

        }
      }
    }
  }

  for (sfPos in field1){
    if (field2[sfPos] == undefined){
      result.push({"change_type" : "subfield_removed",
                "tag" : fieldId,
                "indicators" : indicators,
                "field_position" : fieldPos,
                "subfield_position" : sfPos});
    }
  }

  return result;
};

RecordComparer.findTheLongestCommonSubsequenceCore = function(s1, s2, l1, l2, comparer, cache){
  if (cache[l1][l2] != []){
    return cache[l1][l2];
  }

  var res = [];

  if (comparer(s1[l1-1], s2[l2-1])){
    var tmpRes = RecordComparer.findTheLongestCommonSubsequenceCore(s1, s2, l1 - 1, l2 - 1, comparer, cache);
    res = [tmpRes[0] + 1, tmpRes[1] + [l1 - 1, l2 - 1, s1[l1-1]]]; // [length, [ind1, ind2, value]]
  } else {
    var tmpRes1 = RecordComparer.findTheLongestCommonSubsequenceCore(s1, s2, l1 - 1, l2, comparer, cache);
    var tmpRes2 = RecordComparer.findTheLongestCommonSubsequenceCore(s1, s2, l1, l2 - 1, comparer, cache);
    if (tmpRes1[0] > tmpRes2[0]){
      res = tmpRes1;
    } else {
      res = tmpRes2;
    }
  }

  cache[l1][l2] = res;
  return res;
};

RecordComparer.findTheLongestCommonSubsequence = function(s1, s2, comparer){
  var cache = [];
  for (var i1 = 0 ; i1 <= s1.length; i1 ++){
    var line = [];
    for (var i2 = 0 ; i2 <= s2.length; i2 ++){
      if (i1 === 0 || i2 === 0){
        line.append([0, []]);
      } else {
        line.append([]);
      }
    }
    cache.append(line);
  }

  return RecordComparer.findTheLongestCommonSubsequenceCore(s1, s2, s1.length, s2.length, comparer, cache);
};


RecordComparer.compareTags = function(tag,
    	  		              fields1, fields2){
   /*a helper function allowing to compare inside one indicator
    * excluded from compareRecords for the code clarity reason*/

  // 1) find the longest common substring
  var longest_substring = RecordComparer.findTheLongestCommonSubsequence = function(s1, s2, comparer);

  // 2) iterate ove this list and create all the necessary changes (add/remove)

  result = [];
  for (fieldPos in fields2){
    if (fields1[fieldPos] == undefined){
      result.push({"change_type" : "field_added",
                  "tag" : fieldId,
                  "indicators" : indicators,
                  "field_content" : fields2[fieldPos][0]});
    } else { // comparing the content of the subfields
      result = result.concat(RecordComparer.compareFields(fieldId, indicators,
        fields1[fieldPos][1], fields1[fieldPos][0], fields2[fieldPos][0]));
    }
  }

  for (fieldPos in fields1){
    if (fields2[fieldPos] == undefined){
      fieldPosition = fields1[fieldPos][1];
      result.push({"change_type" : "field_removed",
             "tag" : fieldId,
             "indicators" : indicators,
             "field_position" : fieldPosition});
    }
  }
  return result;
};

RecordComparer.compareRecords = function(record1, record2){
  var result = [];
  var tagsToCompare = {};
  for (tag in record1){
    tagsToCompare[tag] = true;
  }

  for (tag in record2){
    tagsToCompare[tag] = true;
  }

  for (tag in tagsToCompare){
    var l1 = [];
    if (record1[tag] != undefined){
      l1 = record1[tag];
    }
    var l2 = [];
    if (record2[tag] != undefined){
      l2 = record2[tag];
    }
    result += RecordComparer.compareTags(tag, l1, l2)
  }
};


/*
RecordComparer.compareIndicators = function(fieldId, indicators,
						      fields1, fields2){
   /*a helper function allowing to compare inside one indicator
    * excluded from compareRecords for the code clarity reason* /
  var result = [];
  for (fieldPos in fields2){
    if (fields1[fieldPos] == undefined){
      result.push({"change_type" : "field_added",
                  "tag" : fieldId,
                  "indicators" : indicators,
                  "field_content" : fields2[fieldPos][0]});
    } else { // comparing the content of the subfields
      result = result.concat(RecordComparer.compareFields(fieldId, indicators,
        fields1[fieldPos][1], fields1[fieldPos][0], fields2[fieldPos][0]));
    }
  }

  for (fieldPos in fields1){
    if (fields2[fieldPos] == undefined){
      fieldPosition = fields1[fieldPos][1];
      result.push({"change_type" : "field_removed",
             "tag" : fieldId,
             "indicators" : indicators,
             "field_position" : fieldPosition});
    }
  }
  return result;
};
*/

/*
RecordComparer.compareRecords = function(record1, record2){
 /*Compares two bibrecords, producing a list of atom changes that can be displayed
   * to the user if for example applying the Holding Pen change* /
   // 1) This is more convenient to have a different structure of the storage
  var r1 = RecordManager.transformRecord(record1);
  var r2 = RecordManager.transformRecord(record2);
  var result = [];

  for (fieldId in r2){
    if (r1[fieldId] == undefined){
      for (indicators in r2[fieldId]){
        for (field in r2[fieldId][indicators]){
          result.push({"change_type" : "field_added",
                        "tag" : fieldId,
                        "indicators" : indicators,
                        "field_content" : r2[fieldId][indicators][field][0]});


        }
      }
    }
    else
    {
      for (indicators in r2[fieldId]){
        if (r1[fieldId][indicators] == undefined){
          for (field in r2[fieldId][indicators]){
            result.push({"change_type" : "field_added",
                         "tag" : fieldId,
                         "indicators" : indicators,
                         "field_content" : r2[fieldId][indicators][field][0]});


          }
        }
        else{
          result = result.concat(RecordComparer.compareIndicators(fieldId, indicators,
              r1[fieldId][indicators], r2[fieldId][indicators]));
        }
      }

      for (indicators in r1[fieldId]){
        if (r2[fieldId][indicators] == undefined){
          for (fieldInd in r1[fieldId][indicators]){
            fieldPosition = r1[fieldId][indicators][fieldInd][1];
            result.push({"change_type" : "field_removed",
                 "tag" : fieldId,
                 "field_position" : fieldPosition});
          }

        }
      }

    }
  }

  for (fieldId in r1){
    if (r2[fieldId] == undefined){
      for (indicators in r1[fieldId]){
        for (field in r1[fieldId][indicators])
        {
          // field position has to be calculated here !!!
          fieldPosition = r1[fieldId][indicators][field][1]; // field position inside the mark
          result.push({"change_type" : "field_removed",
                       "tag" : fieldId,
                       "field_position" : fieldPosition});

        }
      }
    }
  }
  return result;
};
*/