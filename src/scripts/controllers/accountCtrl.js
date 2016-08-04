angular.module('financier').controller('accountCtrl', function($timeout, $document, $element, $scope, $stateParams, data, hotkeys, transaction, myBudget) {
  const that = this;

  const Transaction = transaction($stateParams.budgetId);

  const {manager, categories} = data;

  this.accountId = $stateParams.accountId;

  if ($stateParams.accountId) {
    this.account = manager.getAccount($stateParams.accountId);
  } else {
    this.account = manager.allAccounts;
  }

  // Filter transactions by account
  this.manager = manager;

  if (this.accountId) {
    $scope.transactions = manager.getAccount(this.accountId).transactions;
  } else {
    $scope.transactions = manager.allAccounts.transactions;
  }

  this.customSorts = {
    account(transaction) {
      return manager.getAccount(transaction.account).name;
    },
    date(transaction) {
      // Sort by date and then value
      return transaction.date.getTime() + transaction.value;
    }
  };

  that.selectedTransactionIndexes = [];
  that.selectedTransactions = [];

  this.createTransaction = () => {
    this.newTransaction = new Transaction({
      account: this.accountId || null
    });
    this.newTransaction.date = new Date();

    $timeout(() => {
      if (this.accountId) {
        $scope.$broadcast('transaction:date:focus');
      } else {
        $scope.$broadcast('transaction:account:focus');
      }
    });
  };

  this.cancelCreateTransaction = () => {
    this.newTransaction = null;
  };

  this.saveCreateTransaction = () => {
    myBudget.transactions.put(this.newTransaction);
    manager.addTransaction(this.newTransaction);

    this.newTransaction = null;
  };

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

  this.selectAll = () => {
    this.selectedTransactions = $scope.displayedTransactions;
  };

  this.isAllSelected = val => {
    if (angular.isDefined(val)) {
      if (val) {
        this.selectAll();
      } else {
        this.selectedTransactions = [];
      }
    }

    return this.selectedTransactions.length === ($scope.displayedTransactions || []).length;
  };

  const documentClickHandler = e => {
    that.selectedTransactions = [];
    that.selectedTransactionIndexes = [];
    this.editingTransaction = null;

    $scope.$digest();
  };


  const selectAllKeyCombos = ['mod+a', 'ctrl+a'];
  $document.bind('click', documentClickHandler);
  selectAllKeyCombos.forEach(combo => {
    hotkeys.add({
      combo,
      callback: event => {
        // Stop default behavior => selecting all text
        event.preventDefault();
        event.stopPropagation();

        this.selectAll();
      }
    });
  });

  // Do before $destroy (since both states can exist at once, 'cause animations)
  $scope.$on('$stateChangeStart', () => {
    $document.unbind('click');

    selectAllKeyCombos.forEach(combo => {
      hotkeys.del(combo);
    });
  });

  this.stopEditing = () => {
    this.selectedTransactions = [this.editingTransaction];
    this.editingTransaction = null;
  };

  this.selectRow = function(event, rowIndex) {
    $scope.dbCtrl.stopPropagation(event);

    this.editingTransaction = null;

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

    if (that.selectedTransactionIndexes.length === 1 &&
       that.selectedTransactionIndexes[0] === rowIndex) {
      that.editingTransaction = $scope.displayedTransactions[rowIndex];
      that.selectedTransactionIndexes = [];

      const clickFromField = event.target.getAttribute('transaction-field-focus-name');
      
      $timeout(() => {
        $scope.$broadcast(`transaction:${clickFromField}:focus`);
      });
    } else {
      if(event.ctrlKey || event.metaKey) { // mac is metaKey
          changeSelectionStatus(rowIndex);
      } else if(event.shiftKey) {
          selectWithShift(rowIndex);
      } else {
          that.selectedTransactionIndexes = [rowIndex];
      }
    }

    that.selectedTransactions = that.selectedTransactionIndexes.map(i => $scope.displayedTransactions[i]);

  };

  this.isTransactionSelected = function(trans) {
    return that.selectedTransactions.indexOf(trans) > -1;
  };

  function isRowSelected(index) {
    return that.selectedTransactionIndexes.indexOf(index) > -1;
  };

  function selectWithShift(rowIndex) {
    var lastSelectedRowIndexInSelectedRowsList = that.selectedTransactionIndexes.length - 1;
    var lastSelectedRowIndex = that.selectedTransactionIndexes[lastSelectedRowIndexInSelectedRowsList];
    var selectFromIndex = Math.min(rowIndex, lastSelectedRowIndex);
    var selectToIndex = Math.max(rowIndex, lastSelectedRowIndex);
    selectRows(selectFromIndex, selectToIndex);
  }

  function getSelectedRows() {
    var selectedRows = [];
    that.selectedTransactionIndexes.forEach(function(rowIndex) {
      selectedRows.push($scope.displayedTransactions[rowIndex]);
    });
    return selectedRows;
  }

  function getFirstSelectedRow() {
    var firstSelectedRowIndex = that.selectedTransactionIndexes[0];
    return $scope.displayedTransactions[firstSelectedRowIndex];
  }

  function selectRows(selectFromIndex, selectToIndex) {
    for(var rowToSelect = selectFromIndex; rowToSelect <= selectToIndex; rowToSelect++) {
      select(rowToSelect);
    }
  }

  function changeSelectionStatus(rowIndex) {
    if(isRowSelected(rowIndex)) {
        unselect(rowIndex);
    } else {
        select(rowIndex);
    }
  }

  function select(rowIndex) {
    if(!isRowSelected(rowIndex)) {
        that.selectedTransactionIndexes.push(rowIndex);
    }
  }

  function unselect(rowIndex) {
    var rowIndexInSelectedRowsList = that.selectedTransactionIndexes.indexOf(rowIndex);
    var unselectOnlyOneRow = 1;
    that.selectedTransactionIndexes.splice(rowIndexInSelectedRowsList, unselectOnlyOneRow);
  }

  function resetSelection() {
    that.selectedTransactionIndexes = [];
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
      };
    };
  };

});
