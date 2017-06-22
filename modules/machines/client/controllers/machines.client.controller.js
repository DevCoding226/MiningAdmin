(function () {
  'use strict';

  angular
    .module('core')
    .controller('MachinesController', MachinesController);

  MachinesController.$inject = ['$scope', '$stateParams', '$timeout', 'MachinesService', 'Authentication', 'Notification'];

  function MachinesController($scope, $stateParams, $timeout, MachinesService, Authentication, Notification) {
    var vm = this;

    vm.timeLimit = 300 * 1000; // 300 seconds

    vm.user = Authentication.user;
    vm.machineState = $stateParams.state;
    if (vm.machineState !== 'offline' && vm.machineState !== 'online') {
      vm.machineState === 'all';
    }

    vm.getInformation = function(machines) {
      vm.dashboard.rig.onlineCount = 0;
      vm.dashboard.rig.offlineCount = 0;
      vm.dashboard.rig.totalCount = 0;
      vm.dashboard.gpu.onlineCount = 0;
      vm.dashboard.gpu.offlineCount = 0;
      vm.dashboard.gpu.totalCount = 0;
      vm.dashboard.hash.onlineCount = 0;
      vm.dashboard.hash.offlineCount = 0;
      vm.dashboard.hash.totalCount = 0;

      var now = Date.now();

      for (var i = 0; i < machines.length; i++) {
        if (!machines[i].gpu) machines[i].gpu = 0;
        if (!machines[i].hash) machines[i].hash = 0;

        if ((now - machines[i].updated) < vm.timeLimit) {
          // online
          vm.dashboard.rig.onlineCount++;
          vm.dashboard.gpu.onlineCount += machines[i].gpu;
          vm.dashboard.hash.onlineCount += machines[i].hash;
          machines[i].online = true;

        } else {
          // offline
          // vm.dashboard.rig.onlineCount++;
          vm.dashboard.gpu.offlineCount += machines[i].gpu;
          vm.dashboard.hash.offlineCount += machines[i].hash;
          machines[i].online = false;
        }

        machines[i].display = vm.getDisplayInformation(machines[i]);
      }

      vm.dashboard.rig.totalCount = machines.length;
      vm.dashboard.rig.offlineCount = vm.dashboard.rig.totalCount - vm.dashboard.rig.onlineCount;

      vm.dashboard.gpu.totalCount = vm.dashboard.gpu.onlineCount + vm.dashboard.gpu.offlineCount;
      vm.dashboard.hash.totalCount = vm.dashboard.hash.onlineCount + vm.dashboard.hash.offlineCount;

    };

    vm.getDisplayInformation = function(machine) {
      var info = machine.info;
      var display = {};

      if (machine.online === true) {
        if (!info.hash) {
          display.trClass = 'warning';
        } else if (info.overheat == 1) {
          display.trClass = 'danger';
        } else if (!info.temp) {
          display.trClass = 'warning';
        } else {
          display.trClass = 'success';
        }
      } else {
        display.trClass = 'danger';
      }

      // Name
      if (info.miner === 'silentarmy') { display.miner = 'Silent Army'; }
      if (info.miner === 'optiminer-zcash') { display.miner = 'Optiminer Zcash'; }
      if (info.miner === 'sgminer-gm') { display.miner = 'Sgminer ETH'; }
      if (info.miner === 'sgminer-gm-xmr') { display.miner = 'Sgminer XMR'; }
      if (info.miner === 'claymore') { display.miner = 'Claymore ETH'; }
      if (info.miner === 'claymore-zec') { display.miner = 'Claymore Zcash'; }
      if (info.miner === 'ethminer') { display.miner = 'Genoil ETH'; }

      display.wallet = '';
      display.pool1 = '';
      display.pool2 = '';

      if (info.group) {
        display.group = info.group;

        var pool_info = info.pool_info.split('\n');
        var pattWallet = new RegExp(`(${display.group} proxywallet)(.*)`);
        var pattPool1 = new RegExp(`(${display.group} proxypool1)(.*)`);
        var pattPool2 = new RegExp(`(${display.group} proxypool2)(.*)`);

        for (var i = 0; i < pool_info.length; i++) {
          if (pattWallet.test(pool_info[i])) {
            display.wallet = pool_info[i];
            display.wallet = display.wallet.replace(new RegExp(`${display.group} proxywallet `), '');
          } else if (pattPool1.test(pool_info[i])) {
            display.pool1 = pool_info[i];
            display.pool1 = display.pool1.replace(new RegExp(`${display.group} proxypool1 `), '');
          } else if (pattPool2.test(pool_info[i])) {
            display.pool2 = pool_info[i];
            display.pool2 = display.pool2.replace(new RegExp(`${display.group} proxypool2 `), '');
          }
        }
      } else {
        display.group = 'N/A';

        var pool_info = info.pool_info.split('\n');
        var pattWallet = /(^proxywallet)(.*)/;
        var pattPool1 = /(^proxypool1)(.*)/;
        var pattPool2 = /(^proxypool2)(.*)/;

        for (var i = 0; i < pool_info.length; i++) {
          if (pattWallet.test(pool_info[i])) {
            display.wallet = pool_info[i];
            display.wallet = display.wallet.replace(/proxywallet /, '');
          } else if (pattPool1.test(pool_info[i])) {
            display.pool1 = pool_info[i];
            display.pool1 = display.pool1.replace(/proxypool1 /, '');
          } else if (pattPool2.test(pool_info[i])) {
            display.pool2 = pool_info[i];
            display.pool2 = display.pool2.replace(/proxypool2 /, '');
          }
        }
      }

      // Status
      if (info.cpu_miner_active) {
        display.cpuMiner = 'Active';
      } else {
        display.cpuMiner = 'Not Active';
      }

      var hashes = info.miner_hashes.split(' ');
      var isHashEmpty = false;

      for (var i = 0; i < hashes.length; i++) {
        if (hashes[i] === '00.00') {
          isHashEmpty = true;
        }
      }

      if (machine.online === true) {

        if (info.overheat !== 1 && isHashEmpty !== true && info.temp && info.hash) {
          display.statusClass = 'label-success';
          display.status = 'Healthy!';
        } else if (info.overheat === 1) {
          display.statusClass = 'label-danger';
          display.status = 'Overheating!';
        } else if (!info.gpus) {
          display.statusClass = 'label-warning';
          display.status = 'HW Issues!';
        } else if (!info.temp || !info.hash) {
          display.statusClass = 'label-warning';
          display.status = 'Issues!';
        } else {
          display.statusClass = 'label-success';
          display.status = 'OK!';
        }
      } else {
        display.statusClass = 'label-danger';

        if (info.overheat !== 1 && isHashEmpty !== true) {
          display.status = 'Offline!';
        } else if (info.overheat === 1) {
          display.status = 'Overheated!';
        } else if (!info.gpus) {
          display.status = 'HW Issues!';
        } else if (isHashEmpty) {
          display.status = 'GPU(s) Failed!';
        } else {
          display.status = 'Offline!';
        }
      }

      if (info.miner === 'sgminer-gm-xmr') {
        display.hashUnit = 'Kh/s';
      } else if ((info.miner === 'optiminer-zcash') || (info.miner === 'claymore-zec')) {
        display.hashUnit = 'h/s';
      } else if ((info.miner === 'claymore') || (info.miner === 'sgminer')) {
        display.hashUnit = 'Mh/s';
      } else {
        display.hashUnit = '';
      }

      // Model

      display.model = info.models;
      display.model = display.model.replace(/(Advanced Micro Devices, Inc.|Device|rec c7|rev cf)/g, '');
      display.model = display.model.replace(/\n/g, '<br />');

      return display;
    };

    vm.reloadInterval = 5000; // 5s

    vm.init = function() {
      if (!vm.machineState) {
        vm.machineState = 'all';
      }

      vm.reloadData();
    };

    vm.reloadData = function() {
      vm.dashboard = {
        rig: {},
        gpu: {},
        hash: {}
      };

      vm.dashboard.rig.ethCount = 0;
      vm.dashboard.rig.xmrCount = 0;
      vm.dashboard.rig.zecCount = 0;

      vm.dashboard.hash.ethCount = 0;
      vm.dashboard.hash.xmrCount = 0;
      vm.dashboard.hash.zecCount = 0;

      MachinesService.getUserMachines(vm.user.username)
        .then(function(machines) {
          vm.machines = machines;
          vm.getInformation(machines);
        })
        .catch(function(err) {
          // console.log(err);
          Notification.error({ message: err.data.message, title: '<i class="glyphicon glyphicon-remove"></i> No Machine!' });
        });

      vm.timer = $timeout(vm.reloadData, vm.reloadInterval);
    }

    $scope.$on("$destroy", function() {
      if (vm.timer) {
        $timeout.cancel(vm.timer);
      }
    });

    vm.init();
  }
}());
