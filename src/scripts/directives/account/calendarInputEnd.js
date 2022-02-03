import moment from 'moment';

angular.module('financier').directive('calendarInputEnd', ($rootScope, $locale, inputDropSetup) => {
  let FIRSTDAYOFWEEK = $locale.DATETIME_FORMATS.FIRSTDAYOFWEEK;
  const shortDate = $locale.DATETIME_FORMATS.shortDate,
    plusMinusEnabled = shortDate.indexOf('-') === -1 && shortDate.indexOf('+') === -1;

  // plusMinusEnabled disables + and - to switch date if the locale requires
  // that as the shortDate separator, e.g. 'MM-dd-y'

  if ($locale.id === 'en-au') {
    FIRSTDAYOFWEEK = 0;
  }
  
  return {
    restrict: 'A',
    bindToController: {
      ngModel: '='
    },
    controllerAs: 'calendarEndCtrl',
    controller: function ($scope, $element) {
      const input = $element,
        template = require('./calendarInputEnd.html');
      const dropSetup = inputDropSetup($scope, input, template);
      $scope.$on('$destroy', () => {
        dropSetup.destroy();
      });

      $scope.thisMonthEnd = new Date();

      $scope.$watch((() => this.ngModel), m => {
        // if date is undefined, set it to today with a new Date
        if (!m){
          m = new Date();
        }
        if (m) {
          $scope.thisMonthEnd = m;
          $scope.monthEnd = $scope.generateMonthEnd(m, m);
        }
      });

      $scope.datesAreEqualToMonthEnd = (d1, d2) => {
        return d1 && d2 && (d1.getYear() === d2.getYear()) && (d1.getMonth() === d2.getMonth());
      };

      $scope.datesAreEqualToDayEnd = (d1, d2) => {
        return d1 &&
               d2 &&
               (d1.getYear() === d2.getYear()) && (d1.getMonth() === d2.getMonth()) &&
               (d1.getDate() === d2.getDate());
      };

      input.on('keydown', event => {
        // down OR (= AND SHIFT (basically + on keyboard or numpad))
        if (event.which === 38 ||
            (plusMinusEnabled && ((event.which === 187 && event.shiftKey) || event.which === 107))
        ) {
          $scope.nextDayEnd();

          event.preventDefault();

        // up OR (- (on keyboard or numpad) AND NOT SHIFT)
        } else if (event.which === 40 ||
            (plusMinusEnabled && ((event.which === 189 && !event.shiftKey) || event.which === 109))
        ) {
          $scope.previousDayEnd();

          event.preventDefault();
        } else if (event.which === 9) { // tab

          dropSetup.close();

        } else if (event.which === 13) { // enter
          dropSetup.close();
          focusNextFieldEnd();
        } else if (event.which === 34) { // pageDown
          this.ngModel = moment(this.ngModel).add(-1, 'month').toDate();

          event.preventDefault();
        } else if (event.which === 33) { // pageUp
          this.ngModel = moment(this.ngModel).add(1, 'month').toDate();

          event.preventDefault();
        } else if (event.which === 84) { // 't'
          this.ngModel = new Date();

          event.preventDefault();
        } else {
          return;
        }

        $scope.$apply();
      });

      $scope.generateMonthEnd = function (date, selectedDate) {
        var d, dateIterator, i, j, month, startingDay, today, week;
        startingDay = (function () {
          var firstDayOfMonth, month, offset, ret, year;

          year = date.getFullYear();
          month = date.getMonth();

          firstDayOfMonth = new Date(year, month, 1);
          ret = new Date(firstDayOfMonth);

          // minus one since FIRSTDAYOFWEEK starts monday, and getDay() starts Sunday
          offset = firstDayOfMonth.getDay() - 1 - (FIRSTDAYOFWEEK - 7);

          offset = offset % 7;

          if (offset === 0) {
            offset = 7;
          }

          ret.setDate(ret.getDate() - offset);
          return ret;
        })();
        today = new Date();
        dateIterator = new Date(startingDay);
        month = [];
        for (i = 0; i <= 5; i++) {
          week = [];
          for (j = 0; j <= 6; j++) {
            d = new Date(dateIterator);
            week.push({
              date: d,
              isSelected: $scope.datesAreEqualToDayEnd(d, selectedDate),
              isInMonth: $scope.datesAreEqualToMonthEnd(d, date),
              today: $scope.datesAreEqualToDayEnd(d, today)
            });
            dateIterator.setDate(dateIterator.getDate() + 1);
          }
          month.push(week);
        }
        return month;
      };

      const update = () => {
        $scope.monthEnd = $scope.generateMonthEnd($scope.thisMonthEnd, this.ngModel);
      };

      // $scope.monthEnd = $scope.generateMonthEnd($scope.thisMonthEnd, this.ngModel);
      
      $scope.nextMonthEnd = () => {
        $scope.thisMonthEnd = nextMonthEnd($scope.thisMonthEnd);
        update();
      };

      $scope.previousMonthEnd = () => {
        $scope.thisMonthEnd = previousMonthEnd($scope.thisMonthEnd);
        update();
      };

      $scope.nextYearEnd = () => {
        $scope.thisMonthEnd = nextYearEnd($scope.thisMonthEnd);
        update();
      };

      $scope.previousYearEnd = () => {
        $scope.thisMonthEnd = previousYearEnd($scope.thisMonthEnd);
        update();
      };

      $scope.nextDayEnd = () => {
        const val = nextDayEnd(this.ngModel);

        $scope.thisMonthEnd = val;
        this.ngModel = val;
        update();
      };

      $scope.previousDayEnd = () => {
        const val = previousDayEnd(this.ngModel);

        $scope.thisMonthEnd = val;
        this.ngModel = val;
        update();
      };

      $scope.selectEnd = date => {
        this.ngModel = date;
        update();
        dropSetup.close();

        focusNextFieldEnd();
      };

      $scope.$on('transaction:date:focus', () => {
        dropSetup.focus();
      });

      function focusNextFieldEnd() {
        if ($scope.$parent.accountCtrl) {
          if ($scope.$parent.accountCtrl.checkNumber) {
            $rootScope.$broadcast('transaction:check:focus');
          } else {
            $rootScope.$broadcast('transaction:payee:focus');
          }
        }
      }

      function nextMonthEnd(date) {
        if (date.getMonth() === 11) {
          return new Date(date.getFullYear() + 1, 0);
        } else {
          return new Date(date.getFullYear(), date.getMonth() + 1);
        }
      }

      function nextDayEnd(date) {
        return new Date(date.setDate(date.getDate() + 1));
      }

      function previousDayEnd(date) {
        return new Date(date.setDate(date.getDate() - 1));
      }

      function previousMonthEnd(date) {
        if (date.getMonth() === 0) {
          return new Date(date.getFullYear() - 1, 11);
        } else {
          return new Date(date.getFullYear(), date.getMonth() - 1);
        }
      }

      function nextYearEnd(date) {
        var d;
        d = new Date(date);
        d.setFullYear(d.getFullYear() + 1);
        return d;
      }

      function previousYearEnd(date) {
        var d;
        d = new Date(date);
        d.setFullYear(d.getFullYear() - 1);
        return d;
      }
    }
  };
});
