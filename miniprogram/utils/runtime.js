// runtime.js - regeneratorRuntime 简化兼容版本（适用于微信小程序）
var regeneratorRuntime = (function () {
  var exports = {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    var generator = Object.create((outerFn || {}).prototype || {});
    var context = new Context(tryLocsList || []);
    generator._invoke = makeInvokeMethod(innerFn, self, context);
    return generator;
  }

  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var IteratorPrototype = {};
  IteratorPrototype[Symbol.iterator] = function () {
    return this;
  };

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);

  function makeInvokeMethod(innerFn, self, context) {
    var state = "start";

    return function invoke(method, arg) {
      if (state === "executing") {
        throw new Error("Generator is already running");
      }

      if (state === "completed") {
        if (method === "throw") {
          throw arg;
        }
        return { value: undefined, done: true };
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = tryCatch(delegate.iterator[method], delegate.iterator, arg);
          if (delegateResult.type === "throw") {
            context.delegate = null;
            method = "throw";
            arg = delegateResult.arg;
            continue;
          }
          return delegateResult;
        }

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          state = context.done ? "completed" : "start";
          return { value: record.arg, done: context.done };
        } else if (record.type === "throw") {
          state = "completed";
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  function Context(tryLocsList) {
    this.tryEntries = tryLocsList;
    this.reset();
  }

  Context.prototype = {
    reset: function () {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;
      this.method = "next";
      this.arg = undefined;
    },
  };

  exports.wrap = wrap;
  return exports;
})();

export default regeneratorRuntime;
