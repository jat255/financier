angular.module('financier').controller('accountCtrl', function($q, $scope, $stateParams, budget, accounts, Transaction) {
  this.transactions = [];

  for (let i = 0; i < budget.length; i++) {
    const month = budget[i];

    for (let categoryId in month.data.categories) {
      if (month.data.categories.hasOwnProperty(categoryId)) {
        const category = month.data.categories[categoryId];

        for (let j = 0; j < category.transactions.length; j++) {
          const transaction = category.transactions[i];
          b++;
          // console.log(transaction)
          this.transactions.push({
            transaction,
            month,
            categoryId
          });
        }
      }
    }
  }
});
