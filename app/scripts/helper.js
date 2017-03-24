/**
 * handlebars工具类集合
 */
(function (h) {
  var isHelper = function () {
    var args = arguments
      , left = args[0]
      , operator = args[1]
      , right = args[2]
      , options = args[3]
      ;

    if (args.length == 2) {
      options = args[1];
      if (left) return options.fn(this);
      return options.inverse(this);
    }

    if (args.length == 3) {
      right = args[1];
      options = args[2];
      if (left == right) return options.fn(this);
      return options.inverse(this);
    }

    if (eR.call(operator, left, right)) {
      return options.fn(this);
    }
    return options.inverse(this);
  };

  var calculateLength = function (str) {
    var l = 0;
    var arr = str.split('');
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].charCodeAt(0) < 299) {
        l++;
      } else {
        l += 2;
      }
    }
    return l;
  };

  var clipString = function (str, limitL) {
    var clip = [], i;
    var len = 0;
    var arr = str.split('');
    for (i = 0; i < arr.length; i++) {
      if (arr[i].charCodeAt(0) < 299) {
        len++;
        if (len <= limitL) {
          clip.push(arr[i]);
        } else {
          break;
        }
      } else {
        len += 2;
        if (len <= limitL) {
          clip.push(arr[i]);
        } else {
          break;
        }
      }
    }
    return clip.join('');
  };

  h.registerHelper('is', isHelper);

  h.registerHelper('nl2br', function (text) {
    var nl2br = (text + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
    return new h.SafeString(nl2br);
  });

  h.registerHelper('log', function () {
    console.log(['Values:'].concat(
      Array.prototype.slice.call(arguments, 0, -1)
    ));
  });

  h.registerHelper('debug', function () {
    console.log('Context:', this);
    console.log(['Values:'].concat(
      Array.prototype.slice.call(arguments, 0, -1)
    ));
  });

  h.registerHelper('replace', function (target) {
    if (typeof target === 'undefined' || Object.prototype.toString.call(target) !== '[object String]')
      return '';
    if (target.indexOf('in|') > -1) {
      target = target.replace('in|', '');
    }
    if (target.indexOf('|') > -1) {
      target = target.replace('|', "");
    }
    return target;
  });

  h.registerHelper('escape', function (target) {
    if (typeof target === 'undefined' || Object.prototype.toString.call(target) !== '[object String]')
      return '';
    if (target.indexOf('>=|') > -1) {
      target = target.replace('>=|', "大于等于");
    }
    if (target.indexOf('>|') > -1) {
      target = target.replace('>|', "大于");
    }
    if (target.indexOf('<=|') > -1) {
      target = target.replace('<=|', "小于等于");
    }
    if (target.indexOf('<|') > -1) {
      target = target.replace('<|', "小于");
    }
    return target;
  });

  h.registerHelper('fixWidth', function (target, length) {
    if (typeof target === 'undefined')
      return '';
    if (calculateLength(target) > length) {
      target = clipString(target, length) + '..';
    }
    return target;
  });

  h.registerHelper('percent', function (value) {
    if (value === 'undefined') {
      return '';
    }
    if (value === 1) {
      return '100%';
    } else {
      value = parseFloat(value).toFixed(2) * 100 + '';
      return value.substring(0, 2) + '%';
    }
  });
})(Handlebars);


(function ($) {

  var types = ['DOMMouseScroll', 'mousewheel'];
  if ($.event.fixHooks) {
    for (var i = types.length; i;) {
      $.event.fixHooks[types[--i]] = $.event.mouseHooks;
    }
  }

  $.event.special.mousewheel = {
    setup: function () {
      if (this.addEventListener) {
        for (var i = types.length; i;) {
          this.addEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = handler;
      }
    },

    teardown: function () {
      if (this.removeEventListener) {
        for (var i = types.length; i;) {
          this.removeEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = null;
      }
    }
  };

  $.fn.extend({
    mousewheel: function (fn) {
      return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },

    unmousewheel: function (fn) {
      return this.unbind("mousewheel", fn);
    }
  });

  function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call(arguments, 1), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";

    // Old school scrollwheel delta
    if (orgEvent.wheelDelta) {
      delta = orgEvent.wheelDelta / 120;
    }
    if (orgEvent.detail) {
      delta = -orgEvent.detail / 3;
    }

    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;

    // Gecko
    if (orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
      deltaY = 0;
      deltaX = -1 * delta;
    }

    // Webkit
    if (orgEvent.wheelDeltaY !== undefined) {
      deltaY = orgEvent.wheelDeltaY / 120;
    }
    if (orgEvent.wheelDeltaX !== undefined) {
      deltaX = -1 * orgEvent.wheelDeltaX / 120;
    }

    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);

    return ($.event.dispatch || $.event.handle
    ).apply(this, args);
  }

})(jQuery);
