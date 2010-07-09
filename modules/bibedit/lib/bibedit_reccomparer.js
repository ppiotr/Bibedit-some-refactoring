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

RecordComparer.compareIndicators = function(fieldId, indicators,
						      fields1, fields2){
   /*a helper function allowing to compare inside one indicator
    * excluded from compareRecords for the code clarity reason*/
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
  /*Compares two bibrecords, producing a list of atom changes that can be displayed
   * to the user if for example applying the Holding Pen change*/
   // 1) This is more convenient to have a different structure of the storage
  r1 = RecordManager.transformRecord(record1);
  r2 = RecordManager.transformRecord(record2);
  result = [];

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
