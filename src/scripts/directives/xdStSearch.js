// taken from https://stackoverflow.com/a/47858389/1435788, this directive
// allows you to use st-search and ng-model together

/*
Usage: 

<input xd-st-search="{{searchCol}}" 
  placeholder="search for {{searchCol}}"
  class="input-sm form-control"
  ng-model="searchVal" /> */

angular.module('financier').directive('xdStSearch', ['stConfig', '$timeout', function (stConfig, $timeout) {
  return {
    require: {table: '^stTable', model: 'ngModel'},
    link: function (scope, element, attr, ctrl) {
      var tableCtrl = ctrl.table;
      var promise = null;
      var throttle = attr.stDelay || stConfig.search.delay;
      var event = attr.stInputEvent || stConfig.search.inputEvent;
      var trimSearch = attr.trimSearch || stConfig.search.trimSearch;

      attr.$observe('xdStSearch', function (newValue, oldValue) {
        var input = ctrl.model.$viewValue;
        if (newValue !== oldValue && input) {
          tableCtrl.tableState().search = {};
          input = angular.isString(input) && trimSearch ? input.trim() : input;
          tableCtrl.search(input, newValue);
        }
      });

      // view -> table state
      ctrl.model.$parsers.push(throttleSearch);
      ctrl.model.$formatters.push(throttleSearch)

      function throttleSearch(value) {
        if (promise !== null) {
          $timeout.cancel(promise);
        }    
        promise = $timeout(function () {
          var input = angular.isString(value) && trimSearch ? value.trim() : value;
          tableCtrl.search(input, attr.xdStSearch || '');
          promise = null;
        }, throttle);
        return value;
      }
    }
  };
}])