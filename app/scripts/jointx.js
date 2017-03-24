'use strict'
joint.ui.Stencil = Backbone.View
  .extend({

    className: 'stencil',
    tagName: 'aside',
    defaults: {
      fobj: '<div>Node</div>',
      size: {
        width: 140,
        height: 60
      },
      position: {
        x: 400,
        y: 50
      },
      scale: {
        padding: 0,
        minScale: .2,
        maxScale: 1
      }
    },
    NODE_TYPE: {
      BTREE_NODE: 'btree.node',
      BTREE_LINK: 'btree.link',
      OTREE_NODE: 'otree.node',
      OTREE_LINK: 'otree.link'
    },
    idCounter: 0,

    initialize: function (options) {

      this.options = _.extend({}, _.result(this, 'options'), options || {});
      this.graph = this.options.graph;
      this.paper = this.options.paper;

      /**
       * 统一传输的数据格式
       * @type
       * {{
                     *      source: undefined,                  //drag源元素jquery对象
                     *      target: undefined,                  //drop目标元素jquery对象
                     *      fobj: string,                       //foreignObject内的html
                     *      markup: string,                     //节点标记
                     *      id: *,                              //业务元素id
                     *      position: {x: number, y: number},   //该节点摆放位置
                     *      size: {width: number, height: number}, //该节点的尺寸
                     *      type: *,                            //该节点所属类型
                     *      pid: string,                        //业务父元素的id
                     *      pindex:number                   //在父节点中的索引
                     *      active:true,                        //节点是否有效
                     *      data: object                        //json格式的数据对象
                     * }}
       */
      this.attrs = {
        graph: this.options.graph,
        paper: this.options.paper,

        source: undefined,
        target: undefined,

        fobj: '',
        markup: '',
        id: '',
        position: {x: 0, y: 0},
        size: {width: 0, height: 0},
        level: 0,
        model: '',
        template: null,

        pid: '',
        pindex: 0,
        active: true,

        data: {}
      };

      _.bindAll(this, 'dragstart', 'dragend', 'dragover', 'drop');
      this.onEvent('dragstart', 'dragend', 'dragover', 'drop');
    },

    /**
     * 绑定全局document事件
     * onEvent('A','B','C')
     */
    onEvent: function () {
      for (var i = 0; i < arguments.length; i++) {

        if (document.addEventListener) {
          document.addEventListener(arguments[i], this[arguments[i]], false);
        } else if (document.attachEvent) {
          document.attachEvent(arguments[i], this[arguments[i]]);
        }
      }
    },

    /**
     * 解绑全局document事件
     * offEvent('A','B','C')
     */
    offEvent: function () {
      for (var i = 0; i < arguments.length; i++) {

        if (document.removeEventListener) {
          document.removeEventListener(arguments[i], this[arguments[i]], false);
        } else if (document.detachEvent) {
          document.detachEvent(arguments[i], this[arguments[i]]);
        }
      }
    },

    /**
     * 拖拽开始事件
     * @param evt
     * @returns {boolean}
     */
    dragstart: function (evt) {

      var dt = evt.dataTransfer;
      //解决firefox下无拖拽阴影效果
      dt.setData('text', evt.target.innerHTML);
      var $source = $('#' + event.target.id);
      if (_.isUndefined(event.target.id) || !$source.length) {
        dt.setData('text/plain', event.target);
      } else {
        dt.setData('text/plain', event.target.id);
      }
      dt.effectAllowed = "copy";
      dt.dropEffect = "copy";
      evt.target.style.opacity = "0.4";
    },

    /**
     * 拖拽结束的效果
     * @param evt
     */
    dragend: function (evt) {
      evt.target.style.opacity = "1";
    },

    /**
     *  当被拖拽元素在目标元素上移动时触发
     *
     *  该事件是被拖拽元素在目标元素上移动一段时间后才触发
     *  事件的默认行为是不允许被拖拽元素在其他元素上释放或放置
     * （即无法触发 drop 事件），需要通过 event.preventDefault()
     *  来阻止默认行为才能触发后续的 drop 事件
     *  @param evt
     */
    dragover: function (evt) {
      evt.preventDefault();

      var attrs = _.extend({}, this.attrs, {
        target: $(evt.target),
        position: {x: evt.pageX, y: evt.pageY},
      });
      this.intersectWithPointer(attrs, function () {
        this._highlightBranch({left: true, target: attrs.target});
      }, function () {
        this._highlightBranch({right: true, target: attrs.target});
      }, function () {
        this._highlightBranch({center: true, target: attrs.target});
      }, function () {
        this._unhighlightBranch();
      })
    },

    /**
     * 当被拖拽元素在目标元素上，而且释放鼠标左键时触发
     * dragstart -> drag -> dragenter -> dragover ->  dragleave  -> drop -> dragend
     * dataTransfer.getData只在drop时期可用
     * @param evt
     */
    drop: function (evt) {
      evt.preventDefault();
      var attrs = this.parseAttrFromEvent(evt);
      if (_.isUndefined(attrs))
        return false;

      //非拖拽到面板中的情况直接返回
      var paperBbox = joint.util.getElementBBox(document.querySelector('#paper svg'));
      var paperRect = g.rect(paperBbox.x, paperBbox.y, paperBbox.width, paperBbox.height);
      if (!paperRect.containsPoint(attrs.position)) {
        return false;
      }

      this._unhighlightBranch({target: $(evt.target)});
      this.intersectWithPointer(attrs,
        function (pros) {
          return this.options.intersect.call(this, pros);
        }, function (pros) {
          return this.options.intersect.call(this, pros);
        }, function (pros) {
          return this.options.intersect.call(this, pros);
        }, function (pros) {
          return this.options.blankDrop.call(this, pros);
        })
    },

    /**
     * 加载二叉树公共接口
     * @param parameters
     * @returns {}
     */
    load: function (parameters) {
      var that = this;
      var cells = [];

      if (_.isEmpty(parameters))
        return cells;

      if (!_.isArray(parameters)) {
        cells.push(this.appendChild(this.parseAttrFromJson(parameters)));
      } else {
        parameters.forEach(function (n) {
          cells.push(that.appendChild(that.parseAttrFromJson(n)));
        });
      }
      that.layout();
      return cells;
    },

    /**
     * 动画绘制(添加)一个子节点
     * @param linkView
     * @param link
     * @param c
     */
    animatedAppendChild: function (linkView, link, c) {
      if (typeof linkView !== 'undefined') {
        V(linkView.el).attr('opacity', 1);
        this.animateDrawLink(link);
      }
      //节点动画输出:css3透明度渐显
      setTimeout(function () {
        var cellView = paper.findViewByModel(c);
        V(cellView.el).addClass('animate');
      }, 600)
    },

    /**
     * 动画绘制layout
     * @param cell
     */
    layout: function (cell) {
      var that = this;
      //按level自顶向下排序
      var elements = _.sortBy(graph.getElements(), function (o) {
        return o.options.level;
      });

      elements.forEach(function (c) {
        //如果希望每一层级的节点有顺序输出,在这里需要预设顺序值（从1开始)
        c.set('siblingRank', c.options.pindex + 1);

        var link = that.drawLink(c);
        var linkView;
        if (typeof link !== 'undefined') {
          linkView = paper.findViewByModel(link);
          linkView && V(linkView.el).attr('opacity', 0);
        }

        //逐层画出节点树,间隔0.8s画一层
        setTimeout(function () {
          that.animatedAppendChild(linkView, link, c);
        }, cell && cell.id === c.id ? 50 : c.options.level * 800)
      });

      //根据不同的tree模型,构建layout
      var modelType = elements[0].constructor.prototype.defaults.type;
      var graphLayout;
      if (modelType.toLowerCase() === this.NODE_TYPE.BTREE_NODE) {
        graphLayout = new joint.layout.TreeLayout({
          graph: graph,
          direction: 'B',
          updateVertices: false
        })
      } else if (modelType.toLowerCase() === this.NODE_TYPE.OTREE_NODE) {
        graphLayout = new joint.layout.TreeLayout({
          graph: graph,
          direction: 'R'
        });
      } else {
        graphLayout = new joint.layout.TreeLayout({
          graph: graph,
          direction: 'B',
          updateVertices: false
        })
      }
      graphLayout.layout();

      //重新计算并更新之前画好的Path的长度
      graph.getLinks().forEach(function (l) {
        var path = $('g[model-id= ' + l.id + '] .connection')[0];
        var length = path.getTotalLength();
        path.style.transition = path.style.WebkitTransition = 'none';
        path.style.strokeDasharray = length + ' ' + length;
      });

      var opt = {};
      opt.padding = 20;
      that.checkToScaleContentToFit(opt);
    },

    /**
     * 从json数据解析属性
     * @param n
     * @returns {Object}
     */
    parseAttrFromJson: function (n) {
      var position = this.defaults.position;
      if (!_.isEmpty(n.position) && n.position.indexOf(',') > -1) {
        var array = n.position.split(',');
        position = {x: array[0] * 1, y: array[1] * 1};
      }
      var attrs = _.extend({}, this.attrs, {
        id: n.id,
        pid: n.pid,
        pindex: n.pindex,
        level: n.level,
        position: position,
        active: n.active,
        model: n.model,
        template: n.template,

        data: n
      });

      return attrs;
    },

    /**
     * 从事件解析属性
     * @param evt
     * @returns {*}
     */
    parseAttrFromEvent: function (evt) {

      var transferData = evt.dataTransfer.getData('text/plain');
      var $source = $('#' + transferData).clone();
      if (_.isUndefined($source)) {
        return undefined;
      }
      //attrs是节点加工过程中传输对象，data是节点本身的数据对象
      var attrs = _.extend({}, this.attrs, {
        source: $source.attr('id'),
        target: $(evt.target),
        position: {x: evt.pageX, y: evt.pageY},
        id: this.uuid(),
        model: $source.attr('data-model'),
        template: $source.attr('data-tpl') || $source.children('svg'),

        data: {} //数据待节点成功插入返回后再reset
      });
      return attrs;
    },

    /**
     * 构建foreignObject
     * @param attrs
     * @returns {*}
     */
    buildFobj: function (attrs) {
      attrs = _.extend({}, this.attrs, attrs);
      var $tpl, template, fobj;
      try {
        if (_.isString(attrs.template)) {
          $tpl = $('#' + attrs.template);
          template = Handlebars.compile($tpl.html());
          fobj = template(attrs.data);
        } else {
          $tpl = $(attrs.template)
          fobj = attrs.template;
        }
      } catch (e) {
        console.log(e);
      }
      attrs.size = {
        width: $tpl.attr('data-width') * 1 || this.defaults.size.width,
        height: $tpl.attr('data-height') * 1 || this.defaults.size.height
      };
      attrs.fobj = fobj || this.defaults.fobj;
      return attrs;
    },


    /**
     * 创建svg标记元素
     * @param {object} attrs
     * @param {boolean} portable 是否带inPorts与outPorts，默认不带
     */
    buildMarkup: function (attrs, portable) {
      attrs = _.extend({}, this.attrs, attrs);
      var rotatable = V('g').addClass('rotatable');
      if (!_.isUndefined(attrs.active) && attrs.active === false)
        rotatable.addClass('inactive');
      var scalable = V('g').addClass('scalable'), markupStr;
      if (portable) {
        //使用port/magnet 时必须添加一个body的class属性,为port提供定位参考
        scalable.addClass('body');
      }

      if (_.isString(attrs.fobj)) {
        /*var foreignObject = V('foreignObject').attr('width', attrs.size.width).attr('height', attrs.size.height);
         var bodyNS = V('body').attr('xmlns', 'http://www.w3.org/1999/xhtml');
         V(bodyNS).append($(attrs.fobj)[0]);
         V(foreignObject).append(V(bodyNS));
         V(scalable).append(V(foreignObject));
         V(rotatable).append(V(scalable));*/
        markupStr = "<g id='" + _.uniqueId('v-') + "' class='rotatable'>" +
          "<g id='" + _.uniqueId('v-') + "' class='scalable body'>" +
          "<foreignObject id='" + _.uniqueId('v-') + "' width='" + attrs.size.width + "' height='" + attrs.size.height + "'>" +
          "<body id='" + _.uniqueId('v-') + "' xmlns='http://www.w3.org/1999/xhtml'>" +
          attrs.fobj +
          "</body>" +
          "</foreignObject>" +
          "</g>";
        if (portable) {
          markupStr += "<g id='" + _.uniqueId('v-') + "' class='inPorts'></g>" +
            "<g id='" + _.uniqueId('v-') + "' class='outPorts'></g></g>";
        }
        attrs.markup = markupStr;
      } else {
        var shape = V($(attrs.fobj).children());
        V(scalable).append(V(shape.node[0]));
        V(rotatable).append(V(scalable));
        if (portable) {
          var inPorts = V('g').addClass('inPorts');
          var outPorts = V('g').addClass('outPorts');
          V(rotatable).append(V(inPorts)).append(V(outPorts));
        }
        attrs.markup = V(rotatable).node.outerHTML;
      }
      return attrs;
    },

    /**
     * 添加二叉树节点
     * @param {object} attrs
     */
    drawCell: function (attrs) {
      var cell;
      if (_.isUndefined(attrs) || _.isUndefined(attrs.model))
        return undefined;

      switch (attrs.model) {
        case this.NODE_TYPE.BTREE_NODE:
          cell = new joint.shapes.btree.Node(attrs);
          break;
        case this.NODE_TYPE.OTREE_NODE:
          cell = new joint.shapes.otree.Node(attrs);
          break;
        default :
          cell = new joint.shapes.otree.Node(attrs);
          break;
      }
      cell.unset('z');
      this.graph.addCell(cell);
      return cell;
    },

    /**
     * 动画画线
     * @param link
     */
    animateDrawLink: function (link) {
      //连线动画输出:vml
      if (typeof link !== 'undefined') {
        var path = $('g[model-id= ' + link.id + '] .connection')[0];
        var length = path.getTotalLength();
        // 清除之前的动作
        path.style.transition = path.style.WebkitTransition = 'none';
        // 设置起始点
        path.style.strokeDasharray = length + ' ' + length;
        path.style.strokeDashoffset = length;
        // 获取一个区域，获取相关的样式，让浏览器寻找一个起始点。
        path.getBoundingClientRect();
        // 定义动作
        path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .6s ease-in-out';
        // Go!
        path.style.strokeDashoffset = '0';
      }
    },

    /**
     * 添加一个子节点，如果已经存在，则替换
     * @param attrs
     * @param callback
     */
    appendChild: function (attrs, callback) {
      attrs = _.extend({}, this.attrs, attrs);
      //节点ports方向
      attrs.direction = $('#direction').val() || 'B';

      var ready = true, cell;
      if (_.isFunction(callback)) {
        ready = callback.call(this, attrs);
      }

      if (ready) {
        var droppedInBlank = !_.isUndefined(attrs.target) && $(attrs.target).is('svg');

        //构建foreignObject
        attrs = this.buildFobj(attrs);

        //构建节点标记markup
        attrs = this.buildMarkup(attrs, true);

        //添加节点至面板
        cell = this.drawCell(attrs);
        if (!droppedInBlank) {
          var cellView = paper.findViewByModel(cell);
          V(cellView.el).attr('opacity', 0);
        }

        //如果是拖拽添加到空白区的节点（相对于page），则fix位置（相对于panel）
        if (!_.isUndefined(attrs.target)) {
          var fixedPosition = this.recalculatePosition(attrs.position);
          cell.position(fixedPosition.x, fixedPosition.y);
          cell.options.position = fixedPosition;
        }
        cell.set('active', attrs.active);
      }
      return cell;
    },


    /**
     * 修改节点的view(重新编译foreignObject对象)
     * @param attrs
     * @returns {*}
     */
    updateCellView: function (attrs) {
      attrs = _.extend({}, this.attrs, attrs);

      var that = this;
      var cell = this.graph.getCell(attrs.id);
      if (_.isUndefined(cell))
        return false;

      attrs = this.buildFobj(attrs);
      attrs = this.buildMarkup(attrs, true);
      cell.options.fobj = attrs.fobj;
      cell.options.markup = attrs.markup;
      cell.attributes.fobj = attrs.fobj;
      cell.attributes.markup = attrs.markup;

      var cellView = this.paper.findViewByModel(cell);
      V(cellView.el).findOne('body').node.innerHTML = cell.options.fobj;

      //清空所有下级节点的分布
      var descendants = cell.getDescendants();
      if (!_.isEmpty(descendants)) {
        _.each(descendants, function (d) {

          //清空节点的分布数据
          _.each(d.options.data.branches, function (b) {
            b.decision = []
          });
          _.each(d.attributes.data.branches, function (b) {
            b.decision = []
          });

          var attributes = that.buildFobj(d.options);
          attributes = that.buildMarkup(attributes, true);
          d.options.fobj = attributes.fobj;
          d.options.markup = attributes.markup;
          d.attributes.fobj = attributes.fobj;
          d.attributes.markup = attributes.markup;

          var cv = that.paper.findViewByModel(d);
          V(cv.el).findOne('body').node.innerHTML = d.options.fobj;
        })
      }
      return cellView;
    },

    /**
     * 在父子节点间添加连线
     * @param attrs
     * @param cell
     */
    drawLink: function (cell) {
      var link, attrs = cell.options;
      var parent = this.graph.getCell(attrs.pid);
      if (_.isUndefined(parent) || _.isUndefined(cell))
        return undefined;

      var defaults = cell.constructor.prototype.defaults;
      if (defaults.type.indexOf('otree') > -1) {
        link = this.connect(parent, 'out', cell, 'in');
      } else if (defaults.type.indexOf('btree') > -1) {
        switch (attrs.pindex) {
          case 0:
            link = this.connect(parent, 'out1', cell, 'in');
            break;
          case 1:
            link = this.connect(parent, 'out2', cell, 'in');
            break;
          default :
            link = this.connect(parent, 'out1', cell, 'in');
            break;
        }
      }
      return link;
    },

    /**
     * 鼠标移入移出节点的处理函数
     * 以pointer指针的方位为准
     * @param attrs 属性
     * @param ellistener 移入左分支的监听
     * @param erlistener 移入右分支的监听
     * @param elistener  移入分支的监听（在只有一个分支时使用）
     * @param llistener  移出节点的监听
     */
    intersectWithPointer: function (attrs, ellistener, erlistener, elistener, llistener) {
      var $targetG = $(attrs.target).parents('.element', 'svg');
      if (_.isEmpty($targetG)) {
        _.isFunction(llistener) && llistener.call(this, attrs);
        return false;
      }

      //移至非叶节点上
      var cell = this.graph.getCell($targetG.attr('model-id'));
      if (cell.isLink() || !cell.isActive()) {
        return false;
      }

      //判断该节点下可以添加子节点
      if (cell.freeForChild()) {

        //model.getBBox()返回的位置是相对于svg的viewport的，故这里使用相对于page的util方法计算
        var bbox = joint.util.getElementBBox($targetG[0]);
        var point = attrs.position;

        if (cell instanceof joint.shapes.otree.Node) {
          var cbbox = g.rect(bbox.x, bbox.y, bbox.width, bbox.height);
          if (cbbox.containsPoint(point)) {
            _.isFunction(elistener) && elistener.call(this, _.extend(attrs, {
              pid: cell.id,
              pindex: 0
            }));
          }
        }

        if (cell instanceof joint.shapes.btree.Node) {
          var lbbox = g.rect(bbox.x, bbox.y, bbox.width / 2, bbox.height);
          var rbbox = g.rect(bbox.x + bbox.width / 2, bbox.y, bbox.width / 2, bbox.height);

          if (lbbox.containsPoint(point) && !cell.hasLeftChild()) {
            _.isFunction(ellistener) && ellistener.call(this, _.extend(attrs, {
              pid: cell.id,
              pindex: 0
            }));
          }
          if (rbbox.containsPoint(point) && !cell.hasRightChild()) {
            _.isFunction(erlistener) && erlistener.call(this, _.extend(attrs, {
              pid: cell.id,
              pindex: 1
            }));
          }
        }
      }
    },

    /**
     * 高亮分支
     * @param opt
     * @private
     */
    _highlightBranch: function (opt) {
      opt = opt || {};
      var $parent = _.isUndefined(opt.target) ? $('.panel') : $(opt.target).parents('.branches');
      if (opt.left) {
        $('.left *', $parent).addClass('branch-hover');
        $('.right *', $parent).removeClass('branch-hover');
      } else if (opt.right) {
        $('.right *', $parent).addClass('branch-hover');
        $('.left *', $parent).removeClass('branch-hover');
      } else if (opt.center) {
        $('.center *', $parent).addClass('branch-hover');
      }
    },

    /**
     * 消除高亮的分支
     * @param opt
     * @private
     */
    _unhighlightBranch: function (opt) {
      opt = opt || {};
      var $parent = _.isUndefined(opt.target) ? $('.panel') : $(opt.target).parents('.branches');
      $('.branch *', $parent).removeClass('branch-hover');
    },

    /**
     * 高亮节点
     * @param cell
     *  `color` ... color
     *  `width`... width
     *  `blur` ... blur
     *  `opacity` ... opacity
     */
    highlightCell: function (cell) {
      var cellView = this.paper.findViewByModel(cell);
      cellView.applyFilter('.', {
        name: 'highlight', args: {
          color: '#17c0ff',
          width: 2,
          blur: 1,
          opacity: .5
        }
      });
    },


    /**
     * 去除高亮
     * @param cell
     */
    unhighlightCell: function (cell) {
      var cellView = this.paper.findViewByModel(cell);
      cellView.$el.removeAttr('filter');
    },

    /**
     * 产生唯一的uuid
     * @param prefix
     * @returns {*}
     */
    uuid: function () {
      return joint.util.uuid();
    },

    /**
     * 产生唯一的number
     * @param selector
     * @returns {*}
     */
    uniqueAttr: function (selector) {
      selector = selector || document;
      var id = ++this.idCounter;
      var array = $(selector) && $(selector).map(function (item) {
          return $.trim($(this).text() || $(this).val()) * 1;
        }).get();
      if ($.inArray(id, array) > -1)
        return this.uniqueAttr(selector);
      return id;
    },

    /**
     * 删除节点
     * @param id
     * @param callbefore
     * @param callback
     */
    removeCell: function (id, callbefore, callback) {
      var cell = this.graph.getCell(id);
      if (_.isFunction(callbefore)) {
        callbefore.call(this, id) && cell.remove();
      } else {
        cell.remove();
      }

      if (_.isFunction(callback))
        callback.call(this, id);
    },

    /**
     * 为两个节点添加连线
     * @param source
     * @param sourcePort
     * @param target
     * @param targetPort
     */
    connect: function (source, sourcePort, target, targetPort) {
      var link;
      try {
        var lacked = true;
        this.graph.getLinks().forEach(function (l) {
          var s = l.get('source');
          var t = l.get('target');
          if (s.id === source.id && s.port === sourcePort && t.id === target.id && t.port === targetPort) {
            lacked = false;
          }
        });
        if (lacked) {
          var realType = target.get('type').split('.')[0];
          if (realType === 'otree') {
            link = new joint.shapes.otree.Link({
              source: {
                id: source.id,
                selector: source.getPortSelector(sourcePort),
                port: sourcePort
              },
              target: {
                id: target.id,
                selector: target.getPortSelector(targetPort),
                port: targetPort
              }
            });
          } else if (realType === 'btree') {
            link = new joint.shapes.btree.Link({
              source: {
                id: source.id,
                selector: source.getPortSelector(sourcePort),
                port: sourcePort
              },
              target: {
                id: target.id,
                selector: target.getPortSelector(targetPort),
                port: targetPort
              }
            });
          }
          link.addTo(this.graph).reparent();
          link.attr('.connection/stroke-width', $('#range').val() || 3)
        }
      } catch (e) {
        console.log(e);
      }
      return link;
    },

    /**
     * 计算元素的在svg中的相对位置
     * @param pointer
     * @returns {{x: *, y: *}}
     */
    recalculatePosition: function (pointer) {
      var position = this.defaults.position;
      var paperOffset = $(this.paper.svg).offset();
      position.x = pointer.x - paperOffset.left;
      position.y = pointer.y - paperOffset.top;
      return {
        x: g.snapToGrid(position.x, paper.options.gridSize),
        y: g.snapToGrid(position.y, paper.options.gridSize)
      }
    },

    /**
     * 检测是否超出限额边界并执行Scale
     * @param opt
     */
    checkToScaleContentToFit: function (opt) {
      opt = opt || this.defaults.scale;
      var restrictedAreaBbox = g.rect({
        x: this.paper.el.offsetLeft,
        y: this.paper.el.offsetTop,
        width: this.paper.options.width,
        height: this.paper.options.height
      });

      var rect = this.paper.viewport.getBoundingClientRect();
      var contentBBox = g.rect($(this.paper.viewport).offset().left, $(this.paper.viewport).offset().top, rect.width, rect.height);

      //如果内容bbox超出限定区域的bbox，则执行缩放
      if (!restrictedAreaBbox.containsRect(contentBBox)) {
        this.paper.scaleContentToFit(opt);
      }

      //居中内容
      var viewPortCenterX = $(this.paper.viewport).offset().left + rect.width / 2 - opt.padding;
      var restrictedCenter = restrictedAreaBbox.center();
      V(this.paper.viewport).translate(restrictedCenter.x - viewPortCenterX);
    },

    /**
     * 一键式智能推荐
     * @param nodes
     * @param needclear
     */
    recommendOneKey: function (nodes, needclear) {
      if (_.isBoolean(needclear) && needclear) {
        this.graph.clear();
      }
      this.load(nodes)
    },

    /**
     * 分步式智能推荐
     * @param n
     * @param callback
     */
    recommendStepByStep: function (n, callback) {
      var parent = this.graph.getCell(n.pid);
      if (_.isUndefined(parent))
        throw  new Error('the method recommendStepByStep can\'t find the parent by pid(pid = ', n.pid + ')');

      //二叉树时,需要清除相应分支下的所有子孙节点
      if (parent instanceof joint.shapes.btree.Node) {
        var children = n.pindex === 1 ? parent.getRightDescendants()
          : parent.getLeftDescendants();
        children.forEach(function (child) {
          child.remove({replace: true});
        });
      }
      this.layout(this.appendChild(this.parseAttrFromJson(n)));

      if (_.isFunction(callback))
        callback.call(this, n);
    },

    /**
     * 判断是否可以不经覆盖而直接推荐下层节点
     * @param pid
     * @param pindex
     */
    freeForRecommend: function (pid, pindex) {
      var parent = this.graph.getCell(pid);
      if (_.isUndefined(parent))
        return false;

      if (parent.isRoot())
        return _.isUndefined(parent.getOnlyChild());

      if (parent.isLeaf())
        return false;

      if (pindex === 0)
        return _.isUndefined(parent.getLeftChild());
      else
        return _.isUndefined(parent.getRightChild());
    },

    /**
     * 返回所有元素的顶层祖先元素
     * @param elements
     * @returns {Array}
     */
    getGreatestAncestors: function (elements) {
      var result = [];
      if (_.isEmpty(elements))
        return result;

      result = _.uniq(_.map(elements, function (element) {
        var root = element.getRoot();
        var localRoot = element.getLocalRoot();
        if (!_.isUndefined(root))
          return root;
        if (!_.isUndefined(localRoot))
          return localRoot;
      }));

      return _.filter(result, function (r) {
        if (!_.isUndefined(r))
          return r;
      })
    }
  })
;

joint.ui.Snaplines = Backbone.View.extend({

  options: {
    paper: undefined,
    distance: 10
  },

  className: 'snaplines',

  initialize: function (options) {

    this.options = _.extend({}, _.result(this, 'options'), options || {});
    this.graph = this.options.graph;
    this.paper = this.options.paper;

    this.$horizontal = $('<div>').addClass('snapline horizontal').appendTo(this.el);
    this.$vertical = $('<div>').addClass('snapline vertical').appendTo(this.el);

    this.$el.hide().appendTo(this.paper.el);

    this.startListening();
  },

  startListening: function () {

    this.stopListening();

    this.listenTo(this.paper, 'cell:pointerdown', this.startSnapping);
    this.listenTo(this.paper, 'cell:pointermove', this.snap);
    this.listenTo(this.paper, 'cell:pointerup', this.hide);

    // Cache filters and make them a hash table for easier and faster access.
    // `options.filter` can contain either strings in which case they are considered
    // cell types that should be filtered out or objects in which case they must
    // be cells that should be filtered out from snapping. Alternatively,
    // `options.filter` can be a function that is passed an element and must
    // return `true` if the element should be filtered out of the snapping.
    this.filterTypes = {};
    this.filterCells = {};
    this.filterFunction = undefined;

    if (_.isArray(this.options.filter)) {

      _.each(this.options.filter, function (item) {

        if (_.isString(item)) {
          this.filterTypes[item] = true;
        } else {
          this.filterCells[item.id] = true;
        }

      }, this);

    } else if (_.isFunction(this.options.filter)) {

      this.filterFunction = this.options.filter;
    }
  },

  startSnapping: function (cellView, evt, x, y) {

    if (cellView instanceof joint.dia.LinkView) return;

    var position = cellView.model.get('position');

    // store the difference between top-left corner and pointer coordinates
    this._diffX = x - position.x;
    this._diffY = y - position.y;
  },

  snap: function (cellView, evt, x, y) {

    if (cellView instanceof joint.dia.LinkView) return;

    var cell = cellView.model;
    var cellBBox = g.rect(_.extend({
      x: x - this._diffX,
      y: y - this._diffY
    }, cell.get('size')));
    var cellCenter = cellBBox.center();
    var cellBBoxRotated = cellBBox.bbox(cell.get('angle'));
    var cellTopLeft = cellBBoxRotated.origin();
    var cellBottomRight = cellBBoxRotated.corner();

    var distance = this.options.distance;
    var vertical = null;
    var horizontal = null;
    var verticalFix = 0;
    var horizontalFix = 0;

    // find vertical and horizontal lines by comparing top-left, bottom-right and center bbox points
    _.find(this.paper.model.getElements(), function (element) {

      if (element === cell ||
        element.isEmbeddedIn(cell) ||
        this.filterTypes[element.get('type')] ||
        this.filterCells[element.id] ||
        (this.filterFunction && this.filterFunction(element))) {

        return false;
      }

      var snapBBox = element.getBBox().bbox(element.get('angle'));
      var snapCenter = snapBBox.center();
      var snapTopLeft = snapBBox.origin();
      var snapBottomRight = snapBBox.corner();

      if (_.isNull(vertical)) {

        if (Math.abs(snapCenter.x - cellCenter.x) < distance) {
          vertical = snapCenter.x;
          verticalFix = 0.5;
        } else if (Math.abs(snapTopLeft.x - cellTopLeft.x) < distance) {
          vertical = snapTopLeft.x;
        } else if (Math.abs(snapTopLeft.x - cellBottomRight.x) < distance) {
          vertical = snapTopLeft.x;
          verticalFix = 1;
        } else if (Math.abs(snapBottomRight.x - cellBottomRight.x) < distance) {
          vertical = snapBottomRight.x;
          verticalFix = 1;
        } else if (Math.abs(snapBottomRight.x - cellTopLeft.x) < distance) {
          vertical = snapBottomRight.x;
        }
      }

      if (_.isNull(horizontal)) {

        if (Math.abs(snapCenter.y - cellCenter.y) < distance) {
          horizontal = snapCenter.y;
          horizontalFix = 0.5;
        } else if (Math.abs(snapTopLeft.y - cellTopLeft.y) < distance) {
          horizontal = snapTopLeft.y;
        } else if (Math.abs(snapTopLeft.y - cellBottomRight.y) < distance) {
          horizontal = snapTopLeft.y;
          horizontalFix = 1;
        } else if (Math.abs(snapBottomRight.y - cellBottomRight.y) < distance) {
          horizontal = snapBottomRight.y;
          horizontalFix = 1;
        } else if (Math.abs(snapBottomRight.y - cellTopLeft.y) < distance) {
          horizontal = snapBottomRight.y;
        }
      }

      // keeps looking until all elements processed or both vertical and horizontal line found
      return _.isNumber(vertical) && _.isNumber(horizontal);
    }, this);

    this.hide();

    if (_.isNumber(vertical) || _.isNumber(horizontal)) {

      if (_.isNumber(vertical)) {
        cellBBoxRotated.x = vertical - verticalFix * cellBBoxRotated.width;
      }

      if (_.isNumber(horizontal)) {
        cellBBoxRotated.y = horizontal - horizontalFix * cellBBoxRotated.height;
      }

      // find x and y of the unrotated cell
      var newCellCenter = cellBBoxRotated.center();
      var newX = newCellCenter.x - cellBBox.width / 2;
      var newY = newCellCenter.y - cellBBox.height / 2;

      var cellPosition = cell.get('position');
      var restrictedArea = this.paper.getRestrictedArea(this.paper);
      cell.translate(newX - cellPosition.x, newY - cellPosition.y, {
        restrictedArea: restrictedArea,
        ui: true
      });

      this.show({vertical: vertical, horizontal: horizontal});
    }
  },

  show: function (opt) {

    opt = opt || {};

    var ctm = this.paper.viewport.getCTM();
    if (opt.horizontal) {
      this.$horizontal.css('top', opt.horizontal * ctm.d + ctm.f).show();
    } else {
      this.$horizontal.hide();
    }

    if (opt.vertical) {
      this.$vertical.css('left', opt.vertical * ctm.a + ctm.e).show();
    } else {
      this.$vertical.hide();
    }

    this.$el.show();
  },

  hide: function () {

    this.$el.hide();
  }
});

joint.ui.SelectionView = Backbone.View.extend({

  options: {

    paper: undefined,
    graph: undefined,
    /*boxContent: function(boxElement) {

     var tmpl =  _.template('<%= length %> elements selected.');
     return tmpl({ length: this.model.length });
     },*/
    handles: [
      //{name: 'remove', position: 'ne', events: {pointerdown: 'removeElements'}}
    ],
    useModelGeometry: false
  },

  className: 'selection',

  events: {

    'mousedown .selection-box': 'startTranslatingSelection',
    'touchstart .selection-box': 'startTranslatingSelection',
    'mousedown .handle': 'onHandlePointerDown',
    'touchstart .handle': 'onHandlePointerDown'
  },

  initialize: function (options) {

    this.options = _.extend({}, _.result(this, 'options'), options || {});

    _.bindAll(this, 'startSelecting', 'stopSelecting', 'adjustSelection', 'pointerup');

    $(document.body).on('mousemove.selectionView touchmove.selectionView', this.adjustSelection);
    $(document).on('mouseup.selectionView touchend.selectionView', this.pointerup);

    this.listenTo(this.options.graph, 'reset', this.cancelSelection);
    this.listenTo(this.options.paper, 'scale translate', this.updateSelectionBoxes);
    this.listenTo(this.options.graph, 'remove change', function (cell, opt) {
      // Do not react on changes that happened inside the selectionView.
      if (!opt['selectionView_' + this.cid]) this.updateSelectionBoxes();
    });

    this.options.paper.$el.append(this.$el);

    // A counter of existing boxes. We don't want to update selection boxes on
    // each graph change when no selection boxes exist.
    this._boxCount = 0;

    //this.createSelectionWrapper();

    // Add handles.
    this.handles = [];
    _.each(this.options.handles, this.addHandle, this);
  },

  addHandle: function (opt) {

    this.handles.push(opt);

    var $handle = $('<div/>', {
      'class': 'handle ' + (opt.position || '') + ' ' + (opt.name || ''),
      'data-action': opt.name
    });
    if (opt.icon) {
      $handle.css('background-image', 'url(' + opt.icon + ')');
    }
    $handle.html(opt.content || '');
    this.$('.selection-wrapper').append($handle);

    _.each(opt.events, function (method, event) {

      if (_.isString(method)) {

        this.on('action:' + opt.name + ':' + event, this[method], this);

      } else {
        // Otherwise, it must be a function.

        this.on('action:' + opt.name + ':' + event, method);
      }

    }, this);

    return this;
  },

  removeHandle: function (name) {

    var handleIdx = _.findIndex(this.handles, {name: name});
    var handle = this.handles[handleIdx];
    if (handle) {

      _.each(handle.events, function (method, event) {

        this.off('action:' + name + ':' + event);

      }, this);

      this.$('.handle.' + name).remove();

      this.handles.splice(handleIdx, 1);
    }

    return this;
  },

  changeHandle: function (name, opt) {

    var handle = _.findWhere(this.handles, {name: name});
    if (handle) {

      this.removeHandle(name);
      this.addHandle(_.merge({name: name}, handle, opt));
    }

    return this;
  },

  startTranslatingSelection: function (evt) {

    evt.stopPropagation();

    evt = joint.util.normalizeEvent(evt);

    this._action = 'translating';

    this.options.graph.trigger('batch:start');

    var snappedClientCoords = this.options.paper.snapToGrid(g.point(evt.clientX, evt.clientY));
    this._snappedClientX = snappedClientCoords.x;
    this._snappedClientY = snappedClientCoords.y;

    this.trigger('selection-box:pointerdown', evt);
  },

  startSelecting: function (evt) {

    evt = joint.util.normalizeEvent(evt);

    this.cancelSelection();

    this._action = 'selecting';

    this._clientX = evt.clientX;
    this._clientY = evt.clientY;

    // Normalize `evt.offsetX`/`evt.offsetY` for browsers that don't support it (Firefox).
    var paperElement = evt.target.parentElement || evt.target.parentNode;
    var paperOffset = $(paperElement).offset();
    var paperScrollLeft = paperElement.scrollLeft;
    var paperScrollTop = paperElement.scrollTop;

    this._offsetX = evt.offsetX === undefined ? evt.clientX - paperOffset.left + window.pageXOffset + paperScrollLeft : evt.offsetX;
    this._offsetY = evt.offsetY === undefined ? evt.clientY - paperOffset.top + window.pageYOffset + paperScrollTop : evt.offsetY;

    this.$el.css({width: 1, height: 1, left: this._offsetX, top: this._offsetY}).show();
  },

  adjustSelection: function (evt) {

    evt = joint.util.normalizeEvent(evt);

    var dx;
    var dy;

    switch (this._action) {

      case 'selecting':

        dx = evt.clientX - this._clientX;
        dy = evt.clientY - this._clientY;

        var width = this.$el.width();
        var height = this.$el.height();
        var left = parseInt(this.$el.css('left'), 10);
        var top = parseInt(this.$el.css('top'), 10);

        this.$el.css({

          left: dx < 0 ? this._offsetX + dx : left,
          top: dy < 0 ? this._offsetY + dy : top,
          width: Math.abs(dx),
          height: Math.abs(dy)
        });
        break;

      case 'translating':

        var snappedClientCoords = this.options.paper.snapToGrid(g.point(evt.clientX, evt.clientY));
        var snappedClientX = snappedClientCoords.x;
        var snappedClientY = snappedClientCoords.y;

        dx = snappedClientX - this._snappedClientX;
        dy = snappedClientY - this._snappedClientY;

        // This hash of flags makes sure we're not adjusting vertices of one link twice.
        // This could happen as one link can be an inbound link of one element in the selection
        // and outbound link of another at the same time.
        var processedCells = {};

        this.model.each(function (element) {

          // TODO: snap to grid.

          if (processedCells[element.id]) return;

          // Make sure that selectionView won't update itself when not necessary
          var opt = {};
          opt['selectionView_' + this.cid] = true;

          // Translate the element itself.
          element.translate(dx, dy, opt);

          _.each(element.getEmbeddedCells({deep: true}), function (embed) {
            processedCells[embed.id] = true;
          });

          // Translate link vertices as well.
          var connectedLinks = this.options.graph.getConnectedLinks(element);

          _.each(connectedLinks, function (link) {

            if (processedCells[link.id]) return;

            link.translate(dx, dy, opt);

            processedCells[link.id] = true;
          });

        }, this);

        if (dx || dy) {

          var paperScale = V(this.options.paper.viewport).scale();
          dx *= paperScale.sx;
          dy *= paperScale.sy;

          // Translate also each of the `selection-box`.
          this.$('.selection-box').each(function () {

            var left = parseFloat($(this).css('left'), 10);
            var top = parseFloat($(this).css('top'), 10);
            $(this).css({left: left + dx, top: top + dy});
          });

          var $selectionWrapper = this.$('.selection-wrapper');
          if ($selectionWrapper.length) {
            var left = parseFloat($selectionWrapper.css('left'), 10);
            var top = parseFloat($selectionWrapper.css('top'), 10);
            $selectionWrapper.css({left: left + dx, top: top + dy});
          }

          this._snappedClientX = snappedClientX;
          this._snappedClientY = snappedClientY;
        }

        this.trigger('selection-box:pointermove', evt);
        break;

      default:
        if (this._action) {
          this.pointermove(evt);
        }
        break;
    }
  },

  stopSelecting: function (evt) {

    switch (this._action) {

      case 'selecting':

        var offset = this.$el.offset();
        var width = this.$el.width();
        var height = this.$el.height();

        // Convert offset coordinates to the local point of the <svg> root element viewport.
        var localPoint = V(this.options.paper.viewport).toLocalPoint(offset.left, offset.top);

        // Take page scroll into consideration.
        localPoint.x -= window.pageXOffset;
        localPoint.y -= window.pageYOffset;

        // Convert width and height to take current viewport scale into account
        var paperScale = V(this.options.paper.viewport).scale();
        width /= paperScale.sx;
        height /= paperScale.sy;

        var elementViews = this.options.paper.findViewsInArea(g.rect(localPoint.x, localPoint.y, width, height));

        var filter = this.options.filter;
        if (_.isArray(filter)) {

          elementViews = _.reject(elementViews, function (view) {
            if (_.contains(filter, view.model) || _.contains(filter, view.model.get('type'))) {
              return true;
            }
          });

        } else if (_.isFunction(filter)) {

          elementViews = _.reject(elementViews, function (view) {
            return filter(view.model);
          });
        }

        this.model.reset(_.pluck(elementViews, 'model'));

        if (elementViews.length) {

          // Create a `selection-box` `<div>` for each element covering its bounding box area.
          _.each(elementViews, this.createSelectionBox, this);

          // The root element of the selection switches `position` to `static` when `selected`. This
          // is neccessary in order for the `selection-box` coordinates to be relative to the
          // `paper` element, not the `selection` `<div>`.
          this.$el.addClass('selected');

        } else {

          // Hide the selection box if there was no element found in the area covered by the
          // selection box.
          this.$el.hide();
        }

        break;

      case 'translating':

        this.options.graph.trigger('batch:stop');
        this.trigger('selection-box:pointerup', evt);
        // Everything else is done during the translation.
        break;

      default:
        // Hide selection if the user clicked somehwere else in the document.
        if (!this._action) {
          this.cancelSelection();
        }
        break;
    }

    delete this._action;
  },

  pointerup: function (evt) {

    if (!this._action) return;

    this.triggerAction(this._action, 'pointerup', evt);
    this.stopSelecting();

    delete this._action;
  },

  cancelSelection: function () {

    this.$el.hide();
    this.$('.selection-box').remove();
    this.$el.removeClass('selected');
    this.model.reset([]);
    this._boxCount = 0;
    this.updateSelectionWrapper();
  },

  destroySelectionBox: function (elementView) {

    this.$('[data-model="' + elementView.model.get('id') + '"]').remove();
    if (this.$('.selection-box').length === 0) {

      this.$el.hide().removeClass('selected');
    }

    this._boxCount = Math.max(0, this._boxCount - 1);

    this.updateSelectionWrapper();
  },

  createSelectionBox: function (elementView) {

    var viewBbox = elementView.getBBox({useModelGeometry: this.options.useModelGeometry});

    var $selectionBox = $('<div/>', {'class': 'selection-box', 'data-model': elementView.model.get('id')});
    $selectionBox.css({left: viewBbox.x, top: viewBbox.y, width: viewBbox.width, height: viewBbox.height});
    this.$el.append($selectionBox);

    this.$el.addClass('selected').show();

    this._boxCount++;

    this.updateSelectionWrapper();
  },

  createSelectionWrapper: function () {

    var $selectionWrapper = $('<div/>', {'class': 'selection-wrapper'});
    //var $box = $('<div/>', { 'class': 'box' });
    //$selectionWrapper.append($box);
    $selectionWrapper.attr('data-selection-length', this.model.length);
    this.$el.prepend($selectionWrapper);
  },

  updateSelectionWrapper: function () {

    // Find the position and dimension of the rectangle wrapping
    // all the element views.
    var origin = {x: Infinity, y: Infinity};
    var corner = {x: 0, y: 0};

    this.model.each(function (cell) {

      var view = this.options.paper.findViewByModel(cell);
      if (view) {
        var bbox = view.getBBox({useModelGeometry: this.options.useModelGeometry});
        origin.x = Math.min(origin.x, bbox.x);
        origin.y = Math.min(origin.y, bbox.y);
        corner.x = Math.max(corner.x, bbox.x + bbox.width);
        corner.y = Math.max(corner.y, bbox.y + bbox.height);
      }
    }, this);

    this.$('.selection-wrapper').css({

      left: origin.x,
      top: origin.y,
      width: (corner.x - origin.x + 3),
      height: (corner.y - origin.y + 3)

    }).attr('data-selection-length', this.model.length);

    if (_.isFunction(this.options.boxContent)) {

      var $box = this.$('.box');
      var content = this.options.boxContent.call(this, $box[0]);

      // don't append empty content. (the content might had been created inside boxContent()
      if (content) {
        //$box.html(content);
      }
    }
  },

  updateSelectionBoxes: function () {

    if (!this._boxCount) return;

    this.$el.hide().removeClass('selected')
      .find('.selection-box').each(_.bind(function (index, element) {

      var removedId = $(element).remove().attr('data-model');

      // try to find an element with the same id in the selection collection and
      // find the view for this model.
      var view = this.options.paper.findViewByModel(this.model.get(removedId));

      if (view) {
        // The view doesn't need to exist on the paper anymore as we use this method
        // as a handler for element removal.
        this.createSelectionBox(view);
      }

    }, this));

    this.updateSelectionWrapper();
  },

  remove: function () {

    Backbone.View.prototype.remove.apply(this, arguments);
    $(document.body).off('.selectionView');
  },

  onHandlePointerDown: function (evt) {

    this._action = $(evt.target).closest('.handle').attr('data-action');
    if (this._action) {

      evt.preventDefault();
      evt.stopPropagation();
      evt = joint.util.normalizeEvent(evt);

      this._clientX = evt.clientX;
      this._clientY = evt.clientY;
      this._startClientX = this._clientX;
      this._startClientY = this._clientY;

      this.triggerAction(this._action, 'pointerdown', evt);
    }
  },

  pointermove: function (evt) {

    if (!this._action) return;

    var clientCoords = this.options.paper.snapToGrid({x: evt.clientX, y: evt.clientY});
    var oldClientCoords = this.options.paper.snapToGrid({x: this._clientX, y: this._clientY});

    var dx = clientCoords.x - oldClientCoords.x;
    var dy = clientCoords.y - oldClientCoords.y;

    this.triggerAction(this._action, 'pointermove', evt, dx, dy, evt.clientX - this._startClientX, evt.clientY - this._startClientY);

    this._clientX = evt.clientX;
    this._clientY = evt.clientY;
  },

  // Trigger an action on the SelectionView object. `evt` is a DOM event, `eventName` is an abstracted
  // JointJS event name (pointerdown, pointermove, pointerup).
  triggerAction: function (action, eventName, evt) {

    var args = ['action:' + action + ':' + eventName].concat(_.rest(_.toArray(arguments), 2));
    this.trigger.apply(this, args);
  },

  // Handle actions.
  removeElements: function (evt) {

    // Store cells before `cancelSelection()` resets the selection collection.
    var cells = this.model.models;
    this.cancelSelection();
    this.options.graph.trigger('batch:start');
    _.invoke(cells, 'remove');
    this.options.graph.trigger('batch:stop');
  },

  startRotating: function (evt) {

    this.options.graph.trigger('batch:start');

    var bbox = this.options.graph.getBBox(this.model.models);
    this._center = bbox.center();

    //mousemove event in firefox has undefined offsetX and offsetY
    if (typeof evt.offsetX === 'undefined' || typeof evt.offsetY === 'undefined') {
      var targetOffset = $(evt.target).offset();
      evt.offsetX = evt.pageX - targetOffset.left;
      evt.offsetY = evt.pageY - targetOffset.top;
    }

    this._rotationStart = g.point(evt.offsetX + evt.target.parentNode.offsetLeft, evt.offsetY + evt.target.parentNode.offsetTop + evt.target.parentNode.offsetHeight);

    this._rotationStartAngle = {};
    this.model.each(function (cell) {
      this._rotationStartAngle[cell.id] = cell.get('angle') || 0;
    }, this);
  },

  doRotate: function (evt, dx, dy, tx, ty) {

    var p = g.point(this._rotationStart).offset(tx, ty);
    var a = p.distance(this._center);
    var b = this._center.distance(this._rotationStart);
    var c = this._rotationStart.distance(p);
    var sign = (this._center.x - this._rotationStart.x) * (p.y - this._rotationStart.y) - (this._center.y - this._rotationStart.y) * (p.x - this._rotationStart.x);

    var _angle = Math.acos((a * a + b * b - c * c) / (2 * a * b));

    // Quadrant correction.
    if (sign <= 0) {
      _angle = -_angle;
    }

    var angleDiff = -g.toDeg(_angle);

    angleDiff = g.snapToGrid(angleDiff, 15);

    this.model.each(function (cell) {
      cell.rotate(angleDiff + this._rotationStartAngle[cell.id], true, this._center);
    }, this);
  },

  stopBatch: function () {

    this.options.graph.trigger('batch:stop');
  }
});
