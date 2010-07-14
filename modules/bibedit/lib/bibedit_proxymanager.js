/** A proxy manager allowing to register other managers and pass all the operations through them
 */

function ProxyManager(){
  var managersList = [];

  this.registerManager = function(manager){
    managersList.append(manager);
  };

  this.performOperation = function(operation, ajaxRequest){
    /** A function processing thebibe operation and updating the corresponding
        ajaxRequest
     */

    for (managerInd in managersList){
      var manager = managersList[managerInd];
      manager.performOperation(operation, ajaxRequest);
    }
  };
}

