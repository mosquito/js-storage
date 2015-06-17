angular.module('storage', []).config(['$provide', function ($provide) {
	$provide.decorator(
		'$controller', [
			'$delegate',
			'$rootScope',
			'$rootElement',
			function ($delegate, $rootScope, $rootElement) {
				function storageConstructor(name, target) {
					var storage = new JSONStore(name);
					storage.bind = function (key, defaultValue, initializer) {
						initializer = initializer || function (x) { return x; };
						target.$watch(key, function (newVal) { storage.set(key, newVal); }, true);
						storage.on('change', key, function (k, value) { target[k] = initializer(value); });
						storage.on('delete', key, function (k) {
							storage.set(k, defaultValue);
							target[k] = defaultValue;
						});
						if (storage.exists(key)) {
							target[key] = initializer(storage.get(key));
						} else {
							target[key] = defaultValue;
						}
					};
					target['$storage'] = storage;
				}

				var appName = $rootElement.attr('ng-app');
				return function(constructor, locals) {
					if (!('$storage' in $rootScope)) {
						storageConstructor(appName + '.rootScope', $rootScope);
					}

					if (typeof constructor == "string") {
						storageConstructor(appName + '.' + constructor, locals.$scope);
					}

					return $delegate.apply({}, arguments);
				}
			}
		]
	);
}]);
