angular.module('financier').directive('notInsaneDateValidator', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attrs, ngModel) => {
        //For DOM -> model validation
        ngModel.$validators.notInsaneDate = function (value) {
          return value === undefined || value.getFullYear() >= 1970;
        };
    }
  };
});
