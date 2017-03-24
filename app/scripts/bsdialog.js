+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options = options
    this.$body = $(document.body)
    this.$element = $(element)
    this.$dialog = this.$element.find('.modal-dialog')
    this.$backdrop = null
    this.isShown = null
    this.originalBodyPad = null
    this.scrollbarWidth = 0
    this.ignoreBackdropClick = false

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION = '3.3.6'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e = $.Event('show.bs.modal', {relatedTarget: _relatedTarget})

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element.addClass('in')

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', {relatedTarget: _relatedTarget})

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $(document.createElement('div'))
        .addClass('modal-backdrop ' + animate)
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this)
      var data = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this)
    var href = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option = $target.data('bs.modal') ? 'toggle' : $.extend({remote: !/#/.test(href) && href}, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);


"use strict";

/* ================================================
 * Definition of BsDialogModal.
 * Extend Bootstrap Modal and override some functions.
 * BsDialogModal === Modified Modal.
 * ================================================ */
var Modal = $.fn.modal.Constructor;
var BsDialogModal = function (element, options) {
  Modal.call(this, element, options);
};
BsDialogModal.getModalVersion = function () {
  var version = null;
  if (typeof $.fn.modal.Constructor.VERSION === 'undefined') {
    version = 'v3.1';
  } else if (/3\.2\.\d+/.test($.fn.modal.Constructor.VERSION)) {
    version = 'v3.2';
  } else if (/3\.3\.[1,2]/.test($.fn.modal.Constructor.VERSION)) {
    version = 'v3.3';  // v3.3.1, v3.3.2
  } else {
    version = 'v3.3.4';
  }

  return version;
};
BsDialogModal.ORIGINAL_BODY_PADDING = parseInt(($('body').css('padding-right') || 0), 10);
BsDialogModal.METHODS_TO_OVERRIDE = {};
BsDialogModal.METHODS_TO_OVERRIDE['v3.1'] = {};
BsDialogModal.METHODS_TO_OVERRIDE['v3.2'] = {
  hide: function (e) {
    if (e) {
      e.preventDefault();
    }
    e = $.Event('hide.bs.modal');

    this.$element.trigger(e);

    if (!this.isShown || e.isDefaultPrevented()) {
      return;
    }

    this.isShown = false;

    // Remove css class 'modal-open' when the last opened dialog is closing.
    var openedDialogs = this.getGlobalOpenedDialogs();
    if (openedDialogs.length === 0) {
      this.$body.removeClass('modal-open');
    }

    this.resetScrollbar();
    this.escape();

    $(document).off('focusin.bs.modal');

    this.$element
      .removeClass('in')
      .attr('aria-hidden', true)
      .off('click.dismiss.bs.modal');

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(300) :
      this.hideModal();
  }
};
BsDialogModal.METHODS_TO_OVERRIDE['v3.3'] = {
  /**
   * Overrided.
   *
   * @returns {undefined}
   */
  setScrollbar: function () {
    var bodyPad = BsDialogModal.ORIGINAL_BODY_PADDING;
    if (this.bodyIsOverflowing) {
      this.$body.css('padding-right', bodyPad + this.scrollbarWidth);
    }
  },
  /**
   * Overrided.
   *
   * @returns {undefined}
   */
  resetScrollbar: function () {
    var openedDialogs = this.getGlobalOpenedDialogs();
    if (openedDialogs.length === 0) {
      this.$body.css('padding-right', BsDialogModal.ORIGINAL_BODY_PADDING);
    }
  },
  /**
   * Overrided.
   *
   * @returns {undefined}
   */
  hideModal: function () {
    this.$element.hide();
    this.backdrop($.proxy(function () {
      var openedDialogs = this.getGlobalOpenedDialogs();
      if (openedDialogs.length === 0) {
        this.$body.removeClass('modal-open');
      }
      this.resetAdjustments();
      this.resetScrollbar();
      this.$element.trigger('hidden.bs.modal');
    }, this));
  }
};
BsDialogModal.METHODS_TO_OVERRIDE['v3.3.4'] = $.extend({}, BsDialogModal.METHODS_TO_OVERRIDE['v3.3']);
BsDialogModal.prototype = {
  constructor: BsDialogModal,
  /**
   * New function, to get the dialogs that opened by BsDialog.
   *
   * @returns {undefined}
   */
  getGlobalOpenedDialogs: function () {
    var openedDialogs = [];
    $.each(BsDialog.dialogs, function (id, dialogInstance) {
      if (dialogInstance.isRealized() && dialogInstance.isOpened()) {
        openedDialogs.push(dialogInstance);
      }
    });

    return openedDialogs;
  }
};

// Add compatible methods.
BsDialogModal.prototype = $.extend(BsDialogModal.prototype, Modal.prototype, BsDialogModal.METHODS_TO_OVERRIDE[BsDialogModal.getModalVersion()]);

/* ================================================
 * Definition of BsDialog.
 * ================================================ */
var BsDialog = function (options) {
  this.defaultOptions = $.extend(true, {
    id: BsDialog.newGuid(),
    buttons: [],
    data: {},
    onshow: null,
    onshown: null,
    onhide: null,
    onhidden: null
  }, BsDialog.defaultOptions);
  this.indexedButtons = {};
  this.registeredButtonHotkeys = {};
  this.draggableData = {
    isMouseDown: false,
    mouseOffset: {}
  };
  this.realized = false;
  this.opened = false;
  this.initOptions(options);
  this.holdThisInstance();
};

BsDialog.BsDialogModal = BsDialogModal;

/**
 *  Some constants.
 */
BsDialog.NAMESPACE = 'bootstrap-dialog';
BsDialog.TYPE_DEFAULT = 'type-default';
BsDialog.TYPE_INFO = 'type-info';
BsDialog.TYPE_PRIMARY = 'type-primary';
BsDialog.TYPE_SUCCESS = 'type-success';
BsDialog.TYPE_WARNING = 'type-warning';
BsDialog.TYPE_DANGER = 'type-danger';
BsDialog.DEFAULT_TEXTS = {};
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_DEFAULT] = '信息';
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_INFO] = '信息';
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_PRIMARY] = '信息';
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_SUCCESS] = '成功';
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_WARNING] = '警告';
BsDialog.DEFAULT_TEXTS[BsDialog.TYPE_DANGER] = '错误';
BsDialog.DEFAULT_TEXTS['OK'] = '好的';
BsDialog.DEFAULT_TEXTS['CANCEL'] = '取消';
BsDialog.DEFAULT_TEXTS['CONFIRM'] = '确认';
BsDialog.SIZE_NORMAL = 'size-normal';
BsDialog.SIZE_SMALL = 'size-small';
BsDialog.SIZE_WIDE = 'size-wide';    // size-wide is equal to modal-lg
BsDialog.SIZE_LARGE = 'size-large';
BsDialog.BUTTON_SIZES = {};
BsDialog.BUTTON_SIZES[BsDialog.SIZE_NORMAL] = '';
BsDialog.BUTTON_SIZES[BsDialog.SIZE_SMALL] = '';
BsDialog.BUTTON_SIZES[BsDialog.SIZE_WIDE] = '';
BsDialog.BUTTON_SIZES[BsDialog.SIZE_LARGE] = 'btn-lg';
BsDialog.ICON_SPINNER = 'glyphicon glyphicon-asterisk';

/**
 * Default options.
 */
BsDialog.defaultOptions = {
  type: BsDialog.TYPE_PRIMARY,
  size: BsDialog.SIZE_NORMAL,
  cssClass: '',
  title: null,
  message: null,
  nl2br: false,
  closable: true,
  closeByBackdrop: true,
  closeByKeyboard: true,
  spinicon: BsDialog.ICON_SPINNER,
  autodestroy: true,
  draggable: false,
  animate: true,
  description: '',
  tabindex: -1
};

/**
 * Config default options.
 */
BsDialog.configDefaultOptions = function (options) {
  BsDialog.defaultOptions = $.extend(true, BsDialog.defaultOptions, options);
};

/**
 * Open / Close all created dialogs all at once.
 */
BsDialog.dialogs = {};
BsDialog.openAll = function () {
  $.each(BsDialog.dialogs, function (id, dialogInstance) {
    dialogInstance.open();
  });
};
BsDialog.closeAll = function () {
  $.each(BsDialog.dialogs, function (id, dialogInstance) {
    dialogInstance.close();
  });
};

/**
 * Get dialog instance by given id.
 *
 * @returns dialog instance
 */
BsDialog.getDialog = function (id) {
  var dialog = null;
  if (typeof BsDialog.dialogs[id] !== 'undefined') {
    dialog = BsDialog.dialogs[id];
  }

  return dialog;
};

/**
 * Set a dialog.
 *
 * @returns the dialog that has just been set.
 */
BsDialog.setDialog = function (dialog) {
  BsDialog.dialogs[dialog.getId()] = dialog;

  return dialog;
};

/**
 * Alias of BsDialog.setDialog(dialog)
 *
 * @param {type} dialog
 * @returns {unresolved}
 */
BsDialog.addDialog = function (dialog) {
  return BsDialog.setDialog(dialog);
};

/**
 * Move focus to next visible dialog.
 */
BsDialog.moveFocus = function () {
  var lastDialogInstance = null;
  $.each(BsDialog.dialogs, function (id, dialogInstance) {
    lastDialogInstance = dialogInstance;
  });
  if (lastDialogInstance !== null && lastDialogInstance.isRealized()) {
    lastDialogInstance.getModal().focus();
  }
};

BsDialog.METHODS_TO_OVERRIDE = {};
BsDialog.METHODS_TO_OVERRIDE['v3.1'] = {
  handleModalBackdropEvent: function () {
    this.getModal().on('click', {dialog: this}, function (event) {
      event.target === this && event.data.dialog.isClosable() && event.data.dialog.canCloseByBackdrop() && event.data.dialog.close();
    });

    return this;
  },
  /**
   * To make multiple opened dialogs look better.
   *
   * Will be removed in later version, after Bootstrap Modal >= 3.3.0, updating z-index is unnecessary.
   */
  updateZIndex: function () {
    var zIndexBackdrop = 1040;
    var zIndexModal = 1050;
    var dialogCount = 0;
    $.each(BsDialog.dialogs, function (dialogId, dialogInstance) {
      dialogCount++;
    });
    var $modal = this.getModal();
    var $backdrop = $modal.data('bs.modal').$backdrop;
    $modal.css('z-index', zIndexModal + (dialogCount - 1) * 20);
    $backdrop.css('z-index', zIndexBackdrop + (dialogCount - 1) * 20);

    return this;
  },
  open: function () {
    !this.isRealized() && this.realize();
    this.getModal().modal('show');
    this.updateZIndex();

    return this;
  }
};
BsDialog.METHODS_TO_OVERRIDE['v3.2'] = {
  handleModalBackdropEvent: BsDialog.METHODS_TO_OVERRIDE['v3.1']['handleModalBackdropEvent'],
  updateZIndex: BsDialog.METHODS_TO_OVERRIDE['v3.1']['updateZIndex'],
  open: BsDialog.METHODS_TO_OVERRIDE['v3.1']['open']
};
BsDialog.METHODS_TO_OVERRIDE['v3.3'] = {};
BsDialog.METHODS_TO_OVERRIDE['v3.3.4'] = $.extend({}, BsDialog.METHODS_TO_OVERRIDE['v3.1']);
BsDialog.prototype = {
  constructor: BsDialog,
  initOptions: function (options) {
    this.options = $.extend(true, this.defaultOptions, options);

    return this;
  },
  holdThisInstance: function () {
    BsDialog.addDialog(this);

    return this;
  },
  initModalStuff: function () {
    this.setModal(this.createModal())
      .setModalDialog(this.createModalDialog())
      .setModalContent(this.createModalContent())
      .setModalHeader(this.createModalHeader())
      .setModalBody(this.createModalBody())
      .setModalFooter(this.createModalFooter());

    this.getModal().append(this.getModalDialog());
    this.getModalDialog().append(this.getModalContent());
    this.getModalContent()
      .append(this.getModalHeader())
      .append(this.getModalBody())
      .append(this.getModalFooter());

    return this;
  },
  createModal: function () {
    var $modal = $('<div class="modal" role="dialog" aria-hidden="true"></div>');
    $modal.prop('id', this.getId());
    $modal.attr('aria-labelledby', this.getId() + '_title');

    return $modal;
  },
  getModal: function () {
    return this.$modal;
  },
  setModal: function ($modal) {
    this.$modal = $modal;

    return this;
  },
  createModalDialog: function () {
    return $('<div class="modal-dialog"></div>');
  },
  getModalDialog: function () {
    return this.$modalDialog;
  },
  setModalDialog: function ($modalDialog) {
    this.$modalDialog = $modalDialog;

    return this;
  },
  createModalContent: function () {
    return $('<div class="modal-content"></div>');
  },
  getModalContent: function () {
    return this.$modalContent;
  },
  setModalContent: function ($modalContent) {
    this.$modalContent = $modalContent;

    return this;
  },
  createModalHeader: function () {
    return $('<div class="modal-header"></div>');
  },
  getModalHeader: function () {
    return this.$modalHeader;
  },
  setModalHeader: function ($modalHeader) {
    this.$modalHeader = $modalHeader;

    return this;
  },
  createModalBody: function () {
    return $('<div class="modal-body"></div>');
  },
  getModalBody: function () {
    return this.$modalBody;
  },
  setModalBody: function ($modalBody) {
    this.$modalBody = $modalBody;

    return this;
  },
  createModalFooter: function () {
    return $('<div class="modal-footer"></div>');
  },
  getModalFooter: function () {
    return this.$modalFooter;
  },
  setModalFooter: function ($modalFooter) {
    this.$modalFooter = $modalFooter;

    return this;
  },
  createDynamicContent: function (rawContent) {
    var content = null;
    if (typeof rawContent === 'function') {
      content = rawContent.call(rawContent, this);
    } else {
      content = rawContent;
    }
    if (typeof content === 'string') {
      content = this.formatStringContent(content);
    }

    return content;
  },
  formatStringContent: function (content) {
    if (this.options.nl2br) {
      return content.replace(/\r\n/g, '<br />').replace(/[\r\n]/g, '<br />');
    }

    return content;
  },
  setData: function (key, value) {
    this.options.data[key] = value;

    return this;
  },
  getData: function (key) {
    return this.options.data[key];
  },
  setId: function (id) {
    this.options.id = id;

    return this;
  },
  getId: function () {
    return this.options.id;
  },
  getType: function () {
    return this.options.type;
  },
  setType: function (type) {
    this.options.type = type;
    this.updateType();

    return this;
  },
  updateType: function () {
    if (this.isRealized()) {
      var types = [BsDialog.TYPE_DEFAULT,
        BsDialog.TYPE_INFO,
        BsDialog.TYPE_PRIMARY,
        BsDialog.TYPE_SUCCESS,
        BsDialog.TYPE_WARNING,
        BsDialog.TYPE_DANGER];

      this.getModal().removeClass(types.join(' ')).addClass(this.getType());
    }

    return this;
  },
  getSize: function () {
    return this.options.size;
  },
  setSize: function (size) {
    this.options.size = size;
    this.updateSize();

    return this;
  },
  updateSize: function () {
    if (this.isRealized()) {
      var dialog = this;

      // Dialog size
      this.getModal().removeClass(BsDialog.SIZE_NORMAL)
        .removeClass(BsDialog.SIZE_SMALL)
        .removeClass(BsDialog.SIZE_WIDE)
        .removeClass(BsDialog.SIZE_LARGE);
      this.getModal().addClass(this.getSize());

      // Smaller dialog.
      this.getModalDialog().removeClass('modal-sm');
      if (this.getSize() === BsDialog.SIZE_SMALL) {
        this.getModalDialog().addClass('modal-sm');
      }

      // Wider dialog.
      this.getModalDialog().removeClass('modal-lg');
      if (this.getSize() === BsDialog.SIZE_WIDE) {
        this.getModalDialog().addClass('modal-lg');
      }

      // Button size
      $.each(this.options.buttons, function (index, button) {
        var $button = dialog.getButton(button.id);
        var buttonSizes = ['btn-lg', 'btn-sm', 'btn-xs'];
        var sizeClassSpecified = false;
        if (typeof button['cssClass'] === 'string') {
          var btnClasses = button['cssClass'].split(' ');
          $.each(btnClasses, function (index, btnClass) {
            if ($.inArray(btnClass, buttonSizes) !== -1) {
              sizeClassSpecified = true;
            }
          });
        }
        if (!sizeClassSpecified) {
          $button.removeClass(buttonSizes.join(' '));
          $button.addClass(dialog.getButtonSize());
        }
      });
    }

    return this;
  },
  getCssClass: function () {
    return this.options.cssClass;
  },
  setCssClass: function (cssClass) {
    this.options.cssClass = cssClass;

    return this;
  },
  getTitle: function () {
    return this.options.title;
  },
  setTitle: function (title) {
    this.options.title = title;
    this.updateTitle();

    return this;
  },
  updateTitle: function () {
    if (this.isRealized()) {
      var title = this.getTitle() !== null ? this.createDynamicContent(this.getTitle()) : this.getDefaultText();
      this.getModalHeader().find('.' + this.getNamespace('title')).html('').append(title).prop('id', this.getId() + '_title');
    }

    return this;
  },
  getMessage: function () {
    return this.options.message;
  },
  setMessage: function (message) {
    this.options.message = message;
    this.updateMessage();

    return this;
  },
  updateMessage: function () {
    if (this.isRealized()) {
      var message = this.createDynamicContent(this.getMessage());
      this.getModalBody().find('.' + this.getNamespace('message')).html('').append(message);
    }

    return this;
  },
  isClosable: function () {
    return this.options.closable;
  },
  setClosable: function (closable) {
    this.options.closable = closable;
    this.updateClosable();

    return this;
  },
  setCloseByBackdrop: function (closeByBackdrop) {
    this.options.closeByBackdrop = closeByBackdrop;

    return this;
  },
  canCloseByBackdrop: function () {
    return this.options.closeByBackdrop;
  },
  setCloseByKeyboard: function (closeByKeyboard) {
    this.options.closeByKeyboard = closeByKeyboard;

    return this;
  },
  canCloseByKeyboard: function () {
    return this.options.closeByKeyboard;
  },
  isAnimate: function () {
    return this.options.animate;
  },
  setAnimate: function (animate) {
    this.options.animate = animate;

    return this;
  },
  updateAnimate: function () {
    if (this.isRealized()) {
      this.getModal().toggleClass('fade', this.isAnimate());
    }

    return this;
  },
  getSpinicon: function () {
    return this.options.spinicon;
  },
  setSpinicon: function (spinicon) {
    this.options.spinicon = spinicon;

    return this;
  },
  addButton: function (button) {
    this.options.buttons.push(button);

    return this;
  },
  addButtons: function (buttons) {
    var that = this;
    $.each(buttons, function (index, button) {
      that.addButton(button);
    });

    return this;
  },
  getButtons: function () {
    return this.options.buttons;
  },
  setButtons: function (buttons) {
    this.options.buttons = buttons;
    this.updateButtons();

    return this;
  },
  /**
   * If there is id provided for a button option, it will be in dialog.indexedButtons list.
   *
   * In that case you can use dialog.getButton(id) to find the button.
   *
   * @param {type} id
   * @returns {undefined}
   */
  getButton: function (id) {
    if (typeof this.indexedButtons[id] !== 'undefined') {
      return this.indexedButtons[id];
    }

    return null;
  },
  getButtonSize: function () {
    if (typeof BsDialog.BUTTON_SIZES[this.getSize()] !== 'undefined') {
      return BsDialog.BUTTON_SIZES[this.getSize()];
    }

    return '';
  },
  updateButtons: function () {
    if (this.isRealized()) {
      if (this.getButtons().length === 0) {
        this.getModalFooter().hide();
      } else {
        this.getModalFooter().show().find('.' + this.getNamespace('footer')).html('').append(this.createFooterButtons());
      }
    }

    return this;
  },
  isAutodestroy: function () {
    return this.options.autodestroy;
  },
  setAutodestroy: function (autodestroy) {
    this.options.autodestroy = autodestroy;
  },
  getDescription: function () {
    return this.options.description;
  },
  setDescription: function (description) {
    this.options.description = description;

    return this;
  },
  setTabindex: function (tabindex) {
    this.options.tabindex = tabindex;

    return this;
  },
  getTabindex: function () {
    return this.options.tabindex;
  },
  updateTabindex: function () {
    if (this.isRealized()) {
      this.getModal().attr('tabindex', this.getTabindex());
    }

    return this;
  },
  getDefaultText: function () {
    return BsDialog.DEFAULT_TEXTS[this.getType()];
  },
  getNamespace: function (name) {
    return BsDialog.NAMESPACE + '-' + name;
  },
  createHeaderContent: function () {
    var $container = $('<div></div>');
    $container.addClass(this.getNamespace('header'));

    // title
    $container.append(this.createTitleContent());

    // Close button
    $container.prepend(this.createCloseButton());

    return $container;
  },
  createTitleContent: function () {
    var $title = $('<div></div>');
    $title.addClass(this.getNamespace('title'));

    return $title;
  },
  createCloseButton: function () {
    var $container = $('<div></div>');
    $container.addClass(this.getNamespace('close-button'));
    var $icon = $('<span class="icon iconfont close">&#xe646;</span>');
    $container.append($icon);
    $container.on('click', {dialog: this}, function (event) {
      event.data.dialog.close();
    });

    return $container;
  },
  createBodyContent: function () {
    var $container = $('<div></div>');
    $container.addClass(this.getNamespace('body'));

    // Message
    $container.append(this.createMessageContent());

    return $container;
  },
  createMessageContent: function () {
    var $message = $('<div></div>');
    $message.addClass(this.getNamespace('message'));

    return $message;
  },
  createFooterContent: function () {
    var $container = $('<div></div>');
    $container.addClass(this.getNamespace('footer'));

    return $container;
  },
  createFooterButtons: function () {
    var that = this;
    var $container = $('<div></div>');
    $container.addClass(this.getNamespace('footer-buttons'));
    this.indexedButtons = {};
    $.each(this.options.buttons, function (index, button) {
      if (!button.id) {
        button.id = BsDialog.newGuid();
      }
      var $button = that.createButton(button);
      that.indexedButtons[button.id] = $button;
      $container.append($button);
    });

    return $container;
  },
  createButton: function (button) {
    var $button = $('<button class="btn"></button>');
    $button.prop('id', button.id);
    $button.data('button', button);

    // Icon
    if (typeof button.icon !== 'undefined' && $.trim(button.icon) !== '') {
      $button.append(this.createButtonIcon(button.icon));
    }

    // Label
    if (typeof button.label !== 'undefined') {
      $button.append(button.label);
    }

    // Css class
    if (typeof button.cssClass !== 'undefined' && $.trim(button.cssClass) !== '') {
      $button.addClass(button.cssClass);
    } else {
      $button.addClass('btn-default');
    }

    // Hotkey
    if (typeof button.hotkey !== 'undefined') {
      this.registeredButtonHotkeys[button.hotkey] = $button;
    }

    // Button on click
    $button.on('click', {dialog: this, $button: $button, button: button}, function (event) {
      var dialog = event.data.dialog;
      var $button = event.data.$button;
      var button = $button.data('button');
      if (typeof button.action === 'function') {
        button.action.call($button, dialog, event);
      }

      if (button.autospin) {
        $button.toggleSpin(true);
      }
    });

    // Dynamically add extra functions to $button
    this.enhanceButton($button);

    //Initialize enabled or not
    if (typeof button.enabled !== 'undefined') {
      $button.toggleEnable(button.enabled);
    }

    return $button;
  },
  /**
   * Dynamically add extra functions to $button
   *
   * Using '$this' to reference 'this' is just for better readability.
   *
   * @param {type} $button
   * @returns {_L13.BsDialog.prototype}
   */
  enhanceButton: function ($button) {
    $button.dialog = this;

    // Enable / Disable
    $button.toggleEnable = function (enable) {
      var $this = this;
      if (typeof enable !== 'undefined') {
        $this.prop("disabled", !enable).toggleClass('disabled', !enable);
      } else {
        $this.prop("disabled", !$this.prop("disabled"));
      }

      return $this;
    };
    $button.enable = function () {
      var $this = this;
      $this.toggleEnable(true);

      return $this;
    };
    $button.disable = function () {
      var $this = this;
      $this.toggleEnable(false);

      return $this;
    };

    // Icon spinning, helpful for indicating ajax loading status.
    $button.toggleSpin = function (spin) {
      var $this = this;
      var dialog = $this.dialog;
      var $icon = $this.find('.' + dialog.getNamespace('button-icon'));
      if (typeof spin === 'undefined') {
        spin = !($button.find('.icon-spin').length > 0);
      }
      if (spin) {
        $icon.hide();
        $button.prepend(dialog.createButtonIcon(dialog.getSpinicon()).addClass('icon-spin'));
      } else {
        $icon.show();
        $button.find('.icon-spin').remove();
      }

      return $this;
    };
    $button.spin = function () {
      var $this = this;
      $this.toggleSpin(true);

      return $this;
    };
    $button.stopSpin = function () {
      var $this = this;
      $this.toggleSpin(false);

      return $this;
    };

    return this;
  },
  createButtonIcon: function (icon) {
    var $icon = $('<span></span>');
    $icon.addClass(this.getNamespace('button-icon')).addClass(icon);

    return $icon;
  },
  /**
   * Invoke this only after the dialog is realized.
   *
   * @param {type} enable
   * @returns {undefined}
   */
  enableButtons: function (enable) {
    $.each(this.indexedButtons, function (id, $button) {
      $button.toggleEnable(enable);
    });

    return this;
  },
  /**
   * Invoke this only after the dialog is realized.
   *
   * @returns {undefined}
   */
  updateClosable: function () {
    if (this.isRealized()) {
      // Close button
      this.getModalHeader().find('.' + this.getNamespace('close-button')).toggle(this.isClosable());
    }

    return this;
  },
  /**
   * Set handler for modal event 'show.bs.modal'.
   * This is a setter!
   */
  onShow: function (onshow) {
    this.options.onshow = onshow;

    return this;
  },
  /**
   * Set handler for modal event 'shown.bs.modal'.
   * This is a setter!
   */
  onShown: function (onshown) {
    this.options.onshown = onshown;

    return this;
  },
  /**
   * Set handler for modal event 'hide.bs.modal'.
   * This is a setter!
   */
  onHide: function (onhide) {
    this.options.onhide = onhide;

    return this;
  },
  /**
   * Set handler for modal event 'hidden.bs.modal'.
   * This is a setter!
   */
  onHidden: function (onhidden) {
    this.options.onhidden = onhidden;

    return this;
  },
  isRealized: function () {
    return this.realized;
  },
  setRealized: function (realized) {
    this.realized = realized;

    return this;
  },
  isOpened: function () {
    return this.opened;
  },
  setOpened: function (opened) {
    this.opened = opened;

    return this;
  },
  handleModalEvents: function () {
    this.getModal().on('show.bs.modal', {dialog: this}, function (event) {
      var dialog = event.data.dialog;
      dialog.setOpened(true);
      if (dialog.isModalEvent(event) && typeof dialog.options.onshow === 'function') {
        var openIt = dialog.options.onshow(dialog);
        if (openIt === false) {
          dialog.setOpened(false);
        }

        return openIt;
      }
    });
    this.getModal().on('shown.bs.modal', {dialog: this}, function (event) {
      var dialog = event.data.dialog;
      dialog.isModalEvent(event) && typeof dialog.options.onshown === 'function' && dialog.options.onshown(dialog);
    });
    this.getModal().on('hide.bs.modal', {dialog: this}, function (event) {
      var dialog = event.data.dialog;
      dialog.setOpened(false);
      if (dialog.isModalEvent(event) && typeof dialog.options.onhide === 'function') {
        var hideIt = dialog.options.onhide(dialog);
        if (hideIt === false) {
          dialog.setOpened(true);
        }

        return hideIt;
      }
    });
    this.getModal().on('hidden.bs.modal', {dialog: this}, function (event) {
      var dialog = event.data.dialog;
      dialog.isModalEvent(event) && typeof dialog.options.onhidden === 'function' && dialog.options.onhidden(dialog);
      if (dialog.isAutodestroy()) {
        delete BsDialog.dialogs[dialog.getId()];
        $(this).remove();
      }
      BsDialog.moveFocus();
    });

    // Backdrop, I did't find a way to change bs3 backdrop option after the dialog is popped up, so here's a new wheel.
    this.handleModalBackdropEvent();

    // ESC key support
    this.getModal().on('keyup', {dialog: this}, function (event) {
      event.which === 27 && event.data.dialog.isClosable() && event.data.dialog.canCloseByKeyboard() && event.data.dialog.close();
    });

    // Button hotkey
    this.getModal().on('keyup', {dialog: this}, function (event) {
      var dialog = event.data.dialog;
      if (typeof dialog.registeredButtonHotkeys[event.which] !== 'undefined') {
        var $button = $(dialog.registeredButtonHotkeys[event.which]);
        !$button.prop('disabled') && $button.focus().trigger('click');
      }
    });

    return this;
  },
  handleModalBackdropEvent: function () {
    this.getModal().on('click', {dialog: this}, function (event) {
      $(event.target).hasClass('modal-backdrop') && event.data.dialog.isClosable() && event.data.dialog.canCloseByBackdrop() && event.data.dialog.close();
    });

    return this;
  },
  isModalEvent: function (event) {
    return typeof event.namespace !== 'undefined' && event.namespace === 'bs.modal';
  },
  makeModalDraggable: function () {
    if (this.options.draggable) {
      this.getModalHeader().addClass(this.getNamespace('draggable')).on('mousedown', {dialog: this}, function (event) {
        var dialog = event.data.dialog;
        dialog.draggableData.isMouseDown = true;
        var dialogOffset = dialog.getModalDialog().offset();
        dialog.draggableData.mouseOffset = {
          top: event.clientY - dialogOffset.top,
          left: event.clientX - dialogOffset.left
        };
      });
      this.getModal().on('mouseup mouseleave', {dialog: this}, function (event) {
        event.data.dialog.draggableData.isMouseDown = false;
      });
      $('body').on('mousemove', {dialog: this}, function (event) {
        var dialog = event.data.dialog;
        if (!dialog.draggableData.isMouseDown) {
          return;
        }
        dialog.getModalDialog().offset({
          top: event.clientY - dialog.draggableData.mouseOffset.top,
          left: event.clientX - dialog.draggableData.mouseOffset.left
        });
      });
    }

    return this;
  },
  realize: function () {
    this.initModalStuff();
    this.getModal().addClass(BsDialog.NAMESPACE)
      .addClass(this.getCssClass());
    this.updateSize();
    if (this.getDescription()) {
      this.getModal().attr('aria-describedby', this.getDescription());
    }
    this.getModalFooter().append(this.createFooterContent());
    this.getModalHeader().append(this.createHeaderContent());
    this.getModalBody().append(this.createBodyContent());
    this.getModal().data('bs.modal', new BsDialogModal(this.getModal(), {
      backdrop: 'static',
      keyboard: false,
      show: false
    }));
    this.makeModalDraggable();
    this.handleModalEvents();
    this.setRealized(true);
    this.updateButtons();
    this.updateType();
    this.updateTitle();
    this.updateMessage();
    this.updateClosable();
    this.updateAnimate();
    this.updateSize();
    this.updateTabindex();

    return this;
  },
  open: function () {
    !this.isRealized() && this.realize();
    this.getModal().modal('show');

    return this;
  },
  close: function () {
    !this.isRealized() && this.realize();
    this.getModal().modal('hide');

    return this;
  }
};

// Add compatible methods.
BsDialog.prototype = $.extend(BsDialog.prototype, BsDialog.METHODS_TO_OVERRIDE[BsDialogModal.getModalVersion()]);

/**
 * RFC4122 version 4 compliant unique id creator.
 *
 * Added by https://github.com/tufanbarisyildirim/
 *
 *  @returns {String}
 */
BsDialog.newGuid = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/* ================================================
 * For lazy people
 * ================================================ */

/**
 * Shortcut function: show
 *
 * @param {type} options
 * @returns the created dialog instance
 */
BsDialog.show = function (options) {
  return new BsDialog(options).open();
};

/**
 * Alert window
 *
 * @returns the created dialog instance
 */
BsDialog.alert = function () {
  var options = {};
  var defaultOptions = {
    type: BsDialog.TYPE_PRIMARY,
    title: null,
    message: null,
    closable: false,
    draggable: false,
    buttonLabel: BsDialog.DEFAULT_TEXTS.OK,
    callback: null
  };

  if (typeof arguments[0] === 'object' && arguments[0].constructor === {}.constructor) {
    options = $.extend(true, defaultOptions, arguments[0]);
  } else {
    options = $.extend(true, defaultOptions, {
      message: arguments[0],
      callback: typeof arguments[1] !== 'undefined' ? arguments[1] : null
    });
  }

  return new BsDialog({
    type: options.type,
    title: options.title,
    message: options.message,
    closable: options.closable,
    draggable: options.draggable,
    data: {
      callback: options.callback
    },
    onhide: function (dialog) {
      !dialog.getData('btnClicked') && dialog.isClosable() && typeof dialog.getData('callback') === 'function' && dialog.getData('callback')(false);
    },
    buttons: [{
      label: options.buttonLabel,
      action: function (dialog) {
        dialog.setData('btnClicked', true);
        typeof dialog.getData('callback') === 'function' && dialog.getData('callback')(true);
        dialog.close();
      }
    }]
  }).open();
};

/**
 * Confirm window
 *
 * @returns the created dialog instance
 */
BsDialog.confirm = function () {
  var options = {};
  var defaultOptions = {
    type: BsDialog.TYPE_PRIMARY,
    title: null,
    message: null,
    closable: false,
    draggable: false,
    btnCancelLabel: BsDialog.DEFAULT_TEXTS.CANCEL,
    btnOKLabel: BsDialog.DEFAULT_TEXTS.CONFIRM,
    btnOKClass: null,
    callback: null
  };
  if (typeof arguments[0] === 'object' && arguments[0].constructor === {}.constructor) {
    options = $.extend(true, defaultOptions, arguments[0]);
  } else {
    options = $.extend(true, defaultOptions, {
      message: arguments[0],
      closable: false,
      buttonLabel: BsDialog.DEFAULT_TEXTS.OK,
      callback: typeof arguments[1] !== 'undefined' ? arguments[1] : null
    });
  }
  if (options.btnOKClass === null) {
    options.btnOKClass = ['btn', options.type.split('-')[1]].join('-');
  }

  return new BsDialog({
    type: options.type,
    title: options.title,
    message: options.message,
    closable: options.closable,
    draggable: options.draggable,
    data: {
      callback: options.callback
    },
    buttons: [{
      label: options.btnCancelLabel,
      action: function (dialog) {
        typeof dialog.getData('callback') === 'function' && dialog.getData('callback')(false);
        dialog.close();
      }
    }, {
      label: options.btnOKLabel,
      cssClass: options.btnOKClass,
      action: function (dialog) {
        typeof dialog.getData('callback') === 'function' && dialog.getData('callback')(true);
        dialog.close();
      }
    }]
  }).open();
};

/**
 * Warning window
 *
 * @param {type} message
 * @returns the created dialog instance
 */
BsDialog.warning = function (message, callback) {
  return new BsDialog({
    type: BsDialog.TYPE_WARNING,
    message: message
  }).open();
};

/**
 * Danger window
 *
 * @param {type} message
 * @returns the created dialog instance
 */
BsDialog.danger = function (message, callback) {
  return new BsDialog({
    type: BsDialog.TYPE_DANGER,
    message: message
  }).open();
};

/**
 * Success window
 *
 * @param {type} message
 * @returns the created dialog instance
 */
BsDialog.success = function (message, callback) {
  return new BsDialog({
    type: BsDialog.TYPE_SUCCESS,
    message: message
  }).open();
};


