(function (global) {
	var makeHash = window.md5 || function (s) {
		var hash = 0, i, chr, len;
		if (s.length == 0) {
			return hash;
		}
		for (i = 0, len = s.length; i < len; i++) {
			chr = s.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0;
		}
		return hash;
	};

	var CACHE = {};

	global.JSONStore = function (prefix) {
		var self = this;
		self.prefix = prefix || 'JSONStore-';
		self.prefixExp = new RegExp('^' + self.prefix + '@.*$');
		self.storage = window.localStorage;
		self.toHashKey = function (key) {
			return self.prefix + "@" + makeHash(JSON.stringify(key));
		};
		self.cl = [];
		self.dl = [];

		function onChange(key, value) {
			self.cl.map(function (i) {
				if (i.k === key) {
					i.cb(key, value);
				}
				if (!i.k) {
					i.cb(key, value);
				}
			});
		}

		function onDelete (key, oldValue) {
			self.dl.map(function (i) {
				if (i.k === key) { i.cb(key, oldValue); }
			});
		}

		self.pub = {
			on: function (tp, key, cb) {
				if (tp == 'change') {
					return self.cl.push({k:key, cb: cb});
				}
				if (tp == 'delete') {
					return self.dl.push({k:key, cb: cb});
				}
				return undefined;
			},
			set: function (key, value) {
				var k = self.toHashKey(key);
				CACHE[k] = value;
				self.storage[k] = JSON.stringify(value);
				onChange(key, value);
				return value;
			},
			exists: function (key) {
				return self.toHashKey(key) in self.storage;
			},
			get: function (key, def) {
				var k = self.toHashKey(key);
				if (!(k in CACHE)) {
					if (k in self.storage && self.storage[k] != 'undefined') {
						var val = JSON.parse(self.storage[k]);
						CACHE[k] = val;
					} else {
						CACHE[k] = def;
					}
				}

				return CACHE[k];
			},
			append: function (key, value) {
				var val = this.get(key, []);
				if (val instanceof Array) {
					val.push(value);
					this.set(key, val);
					onChange(key, val);
					return val;
				} else {
					return false;
				}
			},
			appendUnique: function (key, value) {
				if (this.some(key, value)) {
					onChange(key, value);
					return this.get(key, value);
				} else {
					return this.append(key, value);
				}
			},
			popItems: function (key, item) {
				var arr = this.get(key, []);
				var newArr = [];
				var out = [];
				arr.map(function (i) {
					if (i != item) {
						newArr.push(i);
					} else {
						out.push(i);
					}
				});

				this.set(key, newArr);
				return out;

			},
			pop: function (key) {
				var obj = this.get(key);
				this.remove(key);
				return obj;
			},
			setValue: function (key, objectKey, value) {
				var val = this.get(key, {});
				if (!(val instanceof Array)) {
					val[objectKey] = value;
					this.set(key, val);
					return val;
				} else {
					return false;
				}
			},
			extendValue: function (key, objectKey, value) {
				var val = this.get(key, {});
				if ((!(val instanceof Array)) && (val instanceof Object)) {
					for (var k in value) {
						if (!(objectKey in val)) {
							val[objectKey] = {};
						}
						val[objectKey][k] = value[k];
					}
					this.set(key, val);
					return val;
				} else {
					return undefined;
				}
			},
			some: function (key, value) {
				return this.get(key, []).some(function (item,idx,arr) { if (item == value) { return true; } })
			},
			popValue: function (key, objectKey) {
				var val = this.get(key, {});
				if (!(val instanceof Array)) {
					var out = val[objectKey];
					delete val[objectKey];
					this.set(key, val);
					return out;
				} else {
					return undefined;
				}
			},
			remove: function (key) {
				var k = self.toHashKey(key);
				if (k in self.storage) {
					var obj = this.get(k);
					self.storage.removeItem(k);
					onDelete(key, obj);
					return obj;
				} else {
					return false;
				}
			},
			flush: function () {
				for (var key in self.storage) {
					if (self.prefixExp.test(key)) {
						self.storage.removeItem(key);
					}
				}
				return true;
			}
		};
		return self.pub;
	};
})(this);