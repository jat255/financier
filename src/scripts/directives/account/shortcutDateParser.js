import DateParser from 'angular-dateParser';

angular.module('financier').directive('shortcutDateParser', () => {
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
