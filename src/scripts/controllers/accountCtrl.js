import moment from 'moment';

var fapp = angular.module('financier').controller('accountCtrl', function ($translate, $timeout, $document, $element, $scope, $rootScope, $stateParams, data, transaction, payee, myBudget, budgetRecord, Hotkeys, $filter, clipboard) {
  const that = this;

  const Transaction = transaction($stateParams.budgetId);
  const Payee = payee($stateParams.budgetId);
  $rootScope.dbCtrl = $scope.dbCtrl;
  $rootScope.actCtrl = this; 
  const { manager } = data;
  $rootScope.sumBalance = 0;
  $rootScope.selectedBalance = 0;
  var sum = $rootScope.selectedBalance;
  this.accountId = $stateParams.accountId;
  
  //addition
  $rootScope.all = [];


  if ($stateParams.accountId) {
    this.account = manager.getAccount($stateParams.accountId);

    Object.defineProperty(this, 'checkNumber', {
      get: () => {
        return this.account.checkNumber;
      },
      set: c => {
        this.account.checkNumber = c;
      }
    });
  } else {
    this.account = manager.allAccounts;

    Object.defineProperty(this, 'checkNumber', {
      get: () => {
        return budgetRecord.checkNumber;
      },
      set: c => {
        budgetRecord.checkNumber = c;
      }
    });
  }


  // Filter transactions by account
  this.manager = manager;
  this.myBudget = myBudget;

  this.reconcileCollapsed = true;

  if (this.accountId) {
    $scope.transactions = manager.getAccount(this.accountId).transactions;
  } else {
    $scope.transactions = manager.allAccounts.transactions;
  }

  this.openSplit = (trans, $event) => {
    $event.stopPropagation();

    trans.splitOpen = !trans.splitOpen;

    // TODO: This should be triggered whenever the split height can change
    // (e.g. when other device updates # of splits, etc)
    $rootScope.$broadcast('vsRepeatTrigger');
  };

  this.transactionNeedsCategory = trans => {
    if (trans) {
      const tranAcc = manager.getAccount(trans.account);

      if (tranAcc && !tranAcc.onBudget) {
        return false;
      }

      if (trans.transfer) {
        const transferTranAcc = manager.getAccount(trans.transfer.account);

        if (tranAcc && tranAcc.onBudget && transferTranAcc && transferTranAcc.onBudget) {
          return false;
        }
      }


      return true;
    }
  };

  // Sort the default order to prevent initial page flash
  $scope.transactions.sort((a, b) => {
    // TODO this sort isn't perfect -- equal dates/values will jump in order
    // Should make order determinable based off persisted UUID or something.
    return (b.date.getTime() + b.value) - (a.date.getTime() + a.value);
  });

  this.finishReconciliation = () => {
    for (let i = 0; i < this.account.transactions.length; i++) {
      const transaction = this.account.transactions[i];

      if (transaction.cleared) {
        transaction.reconciled = true;
      }
    }

    this.reconcileCollapsed = true;
  };

  this.reconcile = () => {
    let payee = $scope.dbCtrl.payees['reconciled'];

    if (!payee) {
      payee = new Payee({
        name: $translate.instant('RECONCILED_BALANCE_ADJUSTMENT'),
        autosuggest: false,
        internal: true,
        _id: `${Payee.prefix}reconciled`
      });

      $scope.dbCtrl.payees[payee.id] = payee;

      myBudget.put(payee);
    }

    const trans = new Transaction({
      value: this.reconcileAmount - this.account.cache.clearedBalance,
      cleared: true,
      reconciled: true,
      date: moment().format('YYYY-MM-DD'),
      account: this.accountId,
      payee: payee.id,
      category: 'income'
    });

    this.manager.addTransaction(trans);
    myBudget.put(trans);

    this.finishReconciliation();
  };

  that.selectedTransactionIndexes = [];
  that.selectedTransactions = [];

  this.createTransaction = () => {
    this.editingTransaction = null;
    this.selectedTransactions = [];

    const oldTransaction = this.newTransaction;
    this.newTransaction = null;

    const createNew = () => {
      this.newTransaction = new Transaction({
        account: this.accountId || null
      });
      this.newTransaction.date = oldTransaction ? angular.copy(oldTransaction.date) : new Date();

      this.newTransaction.addTransaction = t => this.manager.addTransaction(t);
      this.newTransaction.removeTransaction = t => this.manager.removeTransaction(t);

      $timeout(() => {
        if (this.accountId) {
          $scope.$broadcast('transaction:date:focus');
        } else {
          $scope.$broadcast('transaction:account:focus');
        }
      });

      $rootScope.$broadcast('vsRepeatTrigger');
    };

    if (oldTransaction) {
      $timeout(() => {
        createNew();
      });
    } else {
      createNew();
    }

  };

  $scope.$on('transaction:create', () => {
    this.createTransaction();
  });

  this.setCleared = (event, trans) => {
    $scope.dbCtrl.stopPropagation(event);

    let cleared = trans.cleared;

    if (this.selectedTransactions.indexOf(trans) === -1) {
      that.selectedTransactions = [trans];
    }


    for (let i = 0; i < that.selectedTransactions.length; i++) {
      that.selectedTransactions[i].cleared = !cleared;
    }
  };

  this.toggleCleared = () => {
    // Determine what the majority of selected transactions are
    const amountCleared = that.selectedTransactions.reduce((count, t) => {
      return count + (t.cleared ? 1 : 0);
    }, 0);

    let cleared = true;
    if (amountCleared === that.selectedTransactions.length) {
      cleared = false;
    }

    for (let i = 0; i < that.selectedTransactions.length; i++) {
      that.selectedTransactions[i].cleared = cleared;
    }
  };

  $scope.$watch('displayedTransactions', () => {
    // console.log('inside sumDisplayedTransactions')
    // debugger;
    let sumBalance = 0;
    angular.forEach($scope.displayedTransactions, function(item) {
       if (item.inflow) {
          if( typeof item.inflow != 'undefined') {
            sumBalance += parseInt((item.inflow || 0));
          }     
        }
        if (item.outflow) {
          if( typeof item.outflow != 'undefined') {
            sumBalance -= parseInt((item.outflow || 0));
          }    
        }
    })
    $rootScope.sumBalance = sumBalance;
  })

  this.selectAll = () => {     

    this.selectedTransactions = $scope.displayedTransactions;
    // console.log(`(all) selectedTransactions: ${this.selectedTransactions}`)
    //selected Balance logic
    sum = 0;
    angular.forEach(this.selectedTransactions, function (item) { 
     var outFlowIntCurrency = $filter('intCurrency')(item.outflow, true, 0);
     var inFlowIntCurrency = $filter('intCurrency')(item.inflow, true, 0);               
                 (outFlowIntCurrency != undefined ? sum -=  parseFloat(outFlowIntCurrency) : 0);
                  (inFlowIntCurrency != undefined ? sum +=  parseFloat(inFlowIntCurrency) : 0);  
            });
    // console.log(`(all) sum is: ${sum}`)
    $rootScope.selectedBalance = sum;
  };

  $scope.tempdata = [];

  this.isAllSelected = val => {   
    if (angular.isDefined(val)) {
      if (val) {        
        this.selectAll();
      } else {
        // console.log("deselected all")
        $rootScope.selectedBalance = 0;         
        this.selectedTransactions = [];
      }
    }

    return this.selectedTransactions.length === ($scope.displayedTransactions || []).length;
  };

  const documentClickHandler = () => {   
    that.selectedTransactions = [];
    that.selectedTransactionIndexes = [];
    this.editingTransaction = null;
    this.newTransaction = null;

    $rootScope.$broadcast('vsRepeatTrigger');
  };

  $scope.$on('account:deselectTransactions', documentClickHandler);


  const selectAllKeyCombos = ['meta+a', 'ctrl+a'];
  $document.bind('click', () => {
    documentClickHandler();
    $scope.$digest();
  });
  const hotkeys = Hotkeys.createHotkey({
      key: selectAllKeyCombos,
      callback: event => {
        if (event.target.tagName === 'INPUT') {
          return;
        }

        // Stop default behavior => selecting all text
        event.preventDefault();
        event.stopPropagation();

        this.selectAll();
      }
  });
  Hotkeys.registerHotkey(hotkeys);

  // Do before $destroy (since both states can exist at once, 'cause animations)
  $scope.$on('$stateChangeStart', () => {
    $document.unbind('click');

    Hotkeys.deregisterHotkey(hotkeys);
  });

  this.copyToClipboard = (input)  => {
    var text = "";
    angular.forEach(input, function (item) {             
                var i = '';              
                if (item.transfer && item.transfer.account) {
                    i = item.transfer.account;
                }                 
                var account = $rootScope.actCtrl.manager.getAccount(item.account).name || 'No account';
                var date =  $filter('date')(item._data.date ? item._data.date : "", "shortDate"); 
                var payee = $rootScope.dbCtrl.getAccountName(i) || $rootScope.dbCtrl.getPayeeName(item.payee);
                var category = $rootScope.dbCtrl.getCategoryName(item.category, item.date) || ($rootScope.actCtrl.transactionNeedsCategory(item) ? 'No Category' : '');
                var memo = item._data.memo ? item._data.memo : "";               
                
                var inflow = $filter('intCurrency')(item.inflow ? item.inflow : "", true, 2);
                var infl =  $filter('currency')(inflow, '$', 2); 

                var outflow = $filter('intCurrency')(item.outflow ? item.outflow : "", true, 2);
                var out =  $filter('currency')(outflow, '$', 2);

                text +=  account + "\t"+ date+ "\t"+ payee+ "\t"+ category+ "\t"+ memo+ "\t"+ out+ "\t"+ infl +"\n";                               
            });    
    clipboard.copyText(text); 
    $rootScope.selectedBalance = 0;
  }

  this.stopEditing = () => {
    if (this.newTransaction) {
      this.newTransaction = null;
    } else {
      this.selectedTransactions = [this.editingTransaction];
      this.editingTransaction = null;

      $rootScope.$broadcast('vsRepeatTrigger');
    }
  };

  this.selectRow = function (event, rowIndex) {     
    $scope.dbCtrl.stopPropagation(event);

    this.editingTransaction = null;
    that.newTransaction = null;

    // Cannot select anything when adding a new transaction
    if (that.newTransaction) {
      return;
    }

    that.selectedTransactionIndexes = that.selectedTransactions.map(trans => {
      for (let i = 0; i < $scope.displayedTransactions.length; i++) {
        if (trans === $scope.displayedTransactions[i]) {
          // console.log(`Selected transaction is: ${JSON.stringify($scope.displayedTransactions[i], null, 4)}`)
          return i;
        }
      }
    });

    if (that.selectedTransactionIndexes.length === 1 &&
       that.selectedTransactionIndexes[0] === rowIndex) {
      that.editingTransaction = $scope.displayedTransactions[rowIndex];
      that.selectedTransactionIndexes = [];

      let [clickFromField, index] = (getFocusName(event.target) || '').split('-');

      if (window.isNaN(+index)) {
        index = undefined;
      } else {
        index = +index;
      }
      
      $timeout(() => {
        $scope.$broadcast(`transaction:${clickFromField}:focus`, { index });
      });
    } else {
      if (event.ctrlKey || event.metaKey) { // mac is metaKey
          changeSelectionStatus(rowIndex);
      } else if (event.shiftKey) {
          selectWithShift(rowIndex);
      } else {
          that.selectedTransactionIndexes = [rowIndex];
      }
    }

    that.selectedTransactions = that.selectedTransactionIndexes.map(i => $scope.displayedTransactions[i]);

     //selected Balance logic
    sum = 0;
    angular.forEach(this.selectedTransactions, function (item) { 
      var outFlowIntCurrency = $filter('intCurrency')(item.outflow, true, 0);
      var inFlowIntCurrency = $filter('intCurrency')(item.inflow, true, 0);               
      (outFlowIntCurrency != undefined ? sum -=  parseFloat(outFlowIntCurrency) : 0);
      (inFlowIntCurrency != undefined ? sum +=  parseFloat(inFlowIntCurrency) : 0);  
    });
    $rootScope.selectedBalance = sum;

    $rootScope.$broadcast('vsRepeatTrigger');
  };

  function getFocusName(el) {
    if (!el || !el.getAttribute) {
      return '';
    }

    const name = el.getAttribute('transaction-field-focus-name');

    if (name) {
      return name;
    }

    return getFocusName(el.parentNode);
  }

  this.isTransactionSelected = function (trans) {
    return that.selectedTransactions.indexOf(trans) > -1;
  };

  function isRowSelected(index) {
    return that.selectedTransactionIndexes.indexOf(index) > -1;
  }

  function selectWithShift(rowIndex) {
    var lastSelectedRowIndexInSelectedRowsList = that.selectedTransactionIndexes.length - 1;
    var lastSelectedRowIndex = that.selectedTransactionIndexes[lastSelectedRowIndexInSelectedRowsList];
    var selectFromIndex = Math.min(rowIndex, lastSelectedRowIndex);
    var selectToIndex = Math.max(rowIndex, lastSelectedRowIndex);
    selectRows(selectFromIndex, selectToIndex);

  }

  function selectRows(selectFromIndex, selectToIndex) {

    for (var rowToSelect = selectFromIndex; rowToSelect <= selectToIndex; rowToSelect++) {
      select(rowToSelect);
    }
  }  

  function changeSelectionStatus(rowIndex) {   
    // console.log(`Inside changeSelectionStatus with rowIndex: ${rowIndex}`)
    // console.log(`$scope.displayedTransactions[rowIndex].outflow is: ${$scope.displayedTransactions[rowIndex].outflow}`)
    // console.log(`$scope.displayedTransactions[rowIndex].inflow is: ${$scope.displayedTransactions[rowIndex].inflow}`)
    var outFlowIntCurrency = $filter('intCurrency')($scope.displayedTransactions[rowIndex].outflow, true, 0);
    var inFlowIntCurrency = $filter('intCurrency')($scope.displayedTransactions[rowIndex].inflow, true, 0);     
    
    // console.log(`outFlowIntCurrency is: ${outFlowIntCurrency}`)
    // console.log(`inFlowIntCurrency is: ${inFlowIntCurrency}`)
    // console.log(`sum before changes is: ${sum}`)
    if (isRowSelected(rowIndex)) {
        // row was de-selected, so we want to subtract any inflows and add any outflows
         (outFlowIntCurrency != undefined ? sum +=  parseFloat(outFlowIntCurrency) : 0);
         (inFlowIntCurrency != undefined ? sum -=  parseFloat(inFlowIntCurrency) : 0);
        unselect(rowIndex);
    } else { 
        // row was selected, so we want to add inflows to total and subtract outflows
          (outFlowIntCurrency != undefined ? sum -=  parseFloat(outFlowIntCurrency) : 0);
          (inFlowIntCurrency != undefined ? sum +=  parseFloat(inFlowIntCurrency) : 0);          
        select(rowIndex);
    } 
    // console.log(`sum at end is: ${sum}`)
    $rootScope.selectedBalance = sum;
    // console.log(`selectedBalance is: ${$rootScope.selectedBalance}`)
  }

  function select(rowIndex) {
    if (!isRowSelected(rowIndex)) {
        that.selectedTransactionIndexes.push(rowIndex);
    }
  }

  function unselect(rowIndex) {
    var rowIndexInSelectedRowsList = that.selectedTransactionIndexes.indexOf(rowIndex);
    var unselectOnlyOneRow = 1;
    that.selectedTransactionIndexes.splice(rowIndexInSelectedRowsList, unselectOnlyOneRow);
  }

  function isValidDate(dateString) {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    return dateString.match(regEx) != null;
  }

  this.toggle = (index, event) => {
    $scope.dbCtrl.stopPropagation(event);

    // Cannot select anything when adding a new transaction
    if (that.newTransaction) {
      return;
    }

    that.selectedTransactionIndexes = that.selectedTransactions.map(trans => {
      for (let i = 0; i < $scope.displayedTransactions.length; i++) {
        if (trans === $scope.displayedTransactions[i]) {
          return i;
        }
      }
    });

    changeSelectionStatus(index);

    that.selectedTransactions = that.selectedTransactionIndexes.map(i => $scope.displayedTransactions[i]);
  };

  that.selectGetterSetter = trans => {
    return val => {
      if (angular.isUndefined(val)) {
        return that.isTransactionSelected(trans);
      }
    };
  };

  const clearedHotkeys = Hotkeys.createHotkey({
      key: 'c',
      callback: () => {
        this.toggleCleared();
      }
  });

  // Register hotkeys object
  Hotkeys.registerHotkey(clearedHotkeys);

  $scope.$on('$destroy', () => {
    Hotkeys.deregisterHotkey(clearedHotkeys);
  });
});

angular.module('financier').filter('transactionFilters', function($rootScope, $filter){
  return function(array, expression){
    console.log(`filter expression is: ${JSON.stringify(expression, null, 4)}`)
      return array.filter(function(val, index){
        // in this function's context, `expression` is an object with
        // the active filters entered in each field; `val` is the data
        // representation of each row of the table

        // TODO: improve this filtering to include searching on split contents
        // TODO: implement date filtering using a pop-up

        // placeholders for each field match
        let dateMatch = true;
        let accountMatch = true;
        let payeeOrTransferMatch = true;
        let checkNumberMatch = true;
        let categoryMatch = true;
        let memoMatch = true;
        let outflowMatch = true;
        let inflowMatch = true;
        let propertyToSearch;
        let uuidToSearch;
        let strToSearch;
        
        // do search on accounts if there was a value in the account filter
        if (expression.account){
          uuidToSearch = val.account  // this is the account ID in each row of the table
          strToSearch = $rootScope.dbCtrl.getAccountName(uuidToSearch).toLowerCase();  // convert to an account name (we could memoize this to improve performance)
          if (strToSearch) {
            // if the account had a name (it always should, but catch in case)
            // then check if the row's account contains the text entered in the filter field
            accountMatch = strToSearch.includes(expression.account.toLowerCase());
          } else {
            accountMatch = false;
          }
        }

        if (expression.dateRange) {
          debugger;
        }

        // search for payee or transfer, either single or in (TODO) splits
        if (expression.payee){
          if (val.payee) {
            propertyToSearch = 'payee'
            uuidToSearch = val.payee
            strToSearch = $rootScope.dbCtrl.getPayeeName(uuidToSearch).toLowerCase();
          }
          else if (val.transfer) {
            propertyToSearch = 'account'
            uuidToSearch = val.transfer.account;
            strToSearch = $rootScope.dbCtrl.getAccountName(uuidToSearch).toLowerCase();
          }

          if (strToSearch) {
            payeeOrTransferMatch = strToSearch.includes(expression.payee.toLowerCase());
          } else {
            payeeOrTransferMatch = false;
          }
        }

        if (expression.checkNumber) {
          if (val.checkNumber) {
            strToSearch = val.checkNumber.toString()
            checkNumberMatch = strToSearch.includes(expression.checkNumber)
          } else {
            checkNumberMatch = false;
          }
        }

        if (expression.category) {
          if (val.category) {
            strToSearch = $rootScope.dbCtrl.getCategoryName(val.category, val.date).toLowerCase()
            categoryMatch = strToSearch.includes(expression.category.toLowerCase())
          } else {
            categoryMatch = false;
          }
        }

        if (expression.memo) {
          if (val.memo) {
            strToSearch = val.memo.toLowerCase()
            memoMatch = strToSearch.includes(expression.memo.toLowerCase())
          } else {
            memoMatch = false;
          }
        }

        if (expression.outflow) {
          if (val.outflow) {
            let outflowFloatStr = $filter('intCurrency')(val.outflow)
            strToSearch = $filter('currency')(outflowFloatStr, '$', 2).replace(',', '')
            let strToFind = expression.outflow.replace(',', '')
            outflowMatch = strToSearch.includes(strToFind)
          } else {
            outflowMatch = false
          }
        }

        if (expression.inflow) {
          if (val.inflow) {
            let inflowFloatStr = $filter('intCurrency')(val.inflow)
            strToSearch = $filter('currency')(inflowFloatStr, '$', 2).replace(',', '')
            let strToFind = expression.inflow.replace(',', '')
            inflowMatch = strToSearch.includes(strToFind)
          } else {
            inflowMatch = false
          }
        }

        return (
          accountMatch && 
          payeeOrTransferMatch &&
          checkNumberMatch && 
          categoryMatch &&
          memoMatch &&
          outflowMatch && 
          inflowMatch
        );
    })
  }
});

//searches by start and end date
// TODO: this doesn't work, so fix it
angular.module('financier').filter('searchByDateStartEnd', function($rootScope, $filter) {
    console.log( "search by date start end");
    return function (input, dateStart, dateEnd) {   
   
      if( typeof dateStart == 'undefined' ) {        
        return input;
      }

      if( typeof dateEnd == 'undefined' ) {        
        return input;
      }

        console.log( "datestart: " + dateStart);
        console.log( "dateEnd: " + dateEnd);

        var output = []; 
        var sumBalance = 0;

        var dateStart = $filter('date')(dateStart, "yyyy-MM-dd");
        var dateEnd = $filter('date')(dateEnd, "yyyy-MM-dd");       
        if (!dateEnd || !dateStart) {
          console.log( "date ranges are not valid");
            output = input;
        } else {
            angular.forEach(input, function (item) {
                var i = '';
                if (item._data.date >= dateStart && item._data.date <= dateEnd) {
                    output.push(item);
                }
            });
        }

        //sumBalance Logic
        for (var i in output) {
          if (output[i].inflow) {
            if( typeof output[i].inflow != 'undefined') {
              sumBalance += parseInt((output[i].inflow || 0));
            }     
          }
          if (output[i].outflow) {
            
            if( typeof output[i].outflow != 'undefined') {
              sumBalance -= parseInt((output[i].outflow || 0));
            }    
            
          }
        }
        var intCurrency = $filter('intCurrency')(sumBalance, true, 2);
        var currency = $filter('currency')(intCurrency, '$', 2);
        $rootScope.sumBalance = currency;
        
        return output;
    }
})