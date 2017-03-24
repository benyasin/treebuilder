'use strict'
joint.shapes.otree = {};

//定义多叉树基础模型
joint.shapes.otree.Model = joint.shapes.basic.Generic.extend(_.extend({}, joint.shapes.basic.PortsModelInterface, {

  markup: '<g class="rotatable"><g class="scalable body"><foreignObject/></g><g class="inPorts"/><g class="outPorts"/></g>',
  portMarkup: '<g class="port port<%= id %>"><circle class="port-body"/></g>',

  options: {
    paper: undefined,
    graph: undefined
  },

  defaults: joint.util.deepSupplement({

    type: 'otree.Model',
    size: {width: 1, height: 1},
    inPorts: [],
    outPorts: [],
    attrs: {
      '.': {magnet: false},
      '.body': {
        width: 150,
        height: 150
      },
      '.port-body': {
        'stroke-width': 3,
        r: 3,
        magnet: true,
        stroke: '#e3e5e4',
        fill: '#e3e5e4'
      }
    }

  }, joint.shapes.basic.Generic.prototype.defaults),


  initialize: function (attrs) {
    this.options = _.extend({}, _.result(this, 'options'), attrs || {});
    this.graph = this.options.graph;
    this.paper = this.options.paper;

    joint.shapes.basic.PortsModelInterface.initialize.apply(this, arguments);
  },

  /**
   * 定义port相对位置唯一途径，无public API
   * @param portName
   * @param index
   * @param total
   * @param selector
   * @param type
   * @returns {{}}
   */
  getPortAttrs: function (portName, index, total, selector, type) {

    var attrs = {};

    var portClass = 'port' + index;
    var portSelector = selector + '>.' + portClass;
    var portLabelSelector = portSelector + '>.port-label';
    var portBodySelector = portSelector + '>.port-body';

    attrs[portLabelSelector] = {text: portName};
    attrs[portBodySelector] = {port: {id: portName || _.uniqueId(type), type: type}};

    if(this.options.direction === 'R'){
      attrs[portSelector] = {ref: '.body', 'ref-y': (index + 0.5) * (1 / total)};
      if (selector === '.outPorts') {attrs[portSelector]['ref-dx'] = 0;}
    }else if(this.options.direction === 'B'){
      attrs[portSelector] = {ref: '.body', 'ref-x': (index + 0.5) * (1 / total)};
      if (selector === '.outPorts') {attrs[portSelector]['ref-dy'] = 0;}
    }

    //禁掉inPort作为source的情况
    if (selector === '.inPorts') {
      attrs[portBodySelector]['magnet'] = 'passive';
    }

    return attrs;
  },

  /**
   * 普通叶子在没有任何子节点时，称为localLeaf
   * @returns {boolean|*}
   */
  isLocalLeaf: function () {
    return this instanceof joint.shapes.otree.Node && !this.hasAnyChild();
  },

  /**
   * 没有父节点的普通节点称为localRoot
   * @returns {boolean}
   */
  isLocalRoot: function () {
    return this instanceof joint.shapes.otree.Node && _.isUndefined(this.getParent())
  },

  /**
   * 返回是否是普通节点
   * @returns {boolean}
   */
  isNode: function () {
    return this instanceof joint.shapes.otree.Node;
  },
  /**
   * 返回是否是连线
   * @returns {boolean}
   */
  isLink: function () {
    return this instanceof joint.shapes.otree.Link;
  },

  /**
   * 返回是否有一个或多个子节点
   * @returns {boolean}
   */
  hasAnyChild: function () {
    return this.getChildren().length > 0;
  },

  /**
   * 返回是否有独生子
   * @returns {boolean}
   */
  hasOnlyChild: function () {
    return !_.isUndefined(this.getOnlyChild());
  },

  /**
   * 返回是否可以拥有子节点
   * @returns {boolean}
   */
  freeForChild: function () {
    return true;
  },

  /**
   * 返回子元素数组
   * 数组的顺序是从左孩子到右孩子（如果都有）
   * @returns {Array}
   */
  getChildren: function () {
    var children = [];
    var that = this;
    this.graph.getConnectedLinks(this, {outbound: true}).forEach(function (link) {
      children.push(that.graph.getCell(link.get('target')));
    });
    return children;
  },

  /**
   * 返回父节点
   * @returns {*}
   */
  getParent: function () {
    var links = this.graph.getConnectedLinks(this, {inbound: true});
    if (_.isEmpty(links))
      return undefined;
    return this.graph.getCell(links[0].get('source').id);
  },

  /**
   * 返回节点的根
   * @returns {*}
   */
  getRoot: function () {
    var cell = this;
    var ancestors = cell.getAncestors();
    if (_.isEmpty(ancestors))
      return undefined;

    return ancestors.pop();
  },

  /**
   * 返回节点所在的树中最顶层的普通节点
   * 仅当该树不存在Root时才有localRoot
   * @returns {*}
   */
  getLocalRoot: function () {
    var cell = this;
    if (cell.isLocalRoot())
      return cell;

    var ancestors = this.getAncestors();
    if (_.isEmpty(ancestors))
      return undefined;

    var greatestAncestor = ancestors.pop();
    if (greatestAncestor instanceof joint.shapes.otree.Root)
      return undefined;

    return greatestAncestor;
  },

  /**
   * 返回节点所有祖先的数组
   * 顺序从父亲节点到离它最远的祖先
   * @param callback [可选，对结果集进行条件过滤]
   * @returns {*|Array}
   */
  getAncestors: function (callback) {
    return this._recursiveGatherParent([], callback);
  },

  /**
   * 递归某节点所有的祖先元素数组
   * @param collection
   * @param callback
   * @returns {*|Array}
   * @private
   */
  _recursiveGatherParent: function (collection, callback) {
    collection = collection || [];
    var parent = this.getParent();
    if (!_.isUndefined(parent)) {
      if (_.isFunction(callback)) {
        callback.call(this, parent) && collection.push(parent);
      } else {
        collection.push(parent);
      }
      parent._recursiveGatherParent(collection, callback);
    }
    return collection;
  },

  /**
   * 返回子孙元素的数组
   * 数组的顺序是从子元素开始到最远的孙元素
   * @param callback [可选，对结果集进行条件过滤]
   * @returns {*|Array}
   */
  getDescendants: function (callback) {
    return this._recursiveGatherChild([], callback);
  },

  /**
   * 返回当前节点左侧子节点及其孙节点的合集
   * 数组的顺序是从子元素开始到最远的孙元素
   * @param callback [可选，对结果集进行条件过滤]
   * @returns {*|Array}
   */
  getLeftDescendants: function (callback) {
    var leftChild = this.getLeftChild();
    if (_.isUndefined(leftChild))
      return [];
    return leftChild._recursiveGatherChild([leftChild], callback);
  },

  /**
   * 返回当前节点独子节点及其孙节点的合集
   * 数组的顺序是从子元素开始到最远的孙元素
   * @param callback [可选，对结果集进行条件过滤]
   * @returns {*|Array}
   */
  getOnlyDescendants: function (callback) {
    var onlyChild = this.getOnlyChild();
    if (_.isUndefined(onlyChild))
      return [];
    return onlyChild._recursiveGatherChild([onlyChild], callback);
  },

  /**
   * 递归返回某节点的所有子孙节点数组
   * @param collection
   * @param callback
   * @returns {*|Array}
   * @private
   */
  _recursiveGatherChild: function (collection, callback) {
    collection = collection || [];
    var children = this.getChildren();
    children.forEach(function (child) {
      if (_.isFunction(callback)) {
        callback.call(this, child) && collection.push(child);
      } else {
        collection.push(child);
      }
      child._recursiveGatherChild(collection, callback);
    });
    return collection;
  },

  /**
   * 返回独生子节点
   * @returns {*}
   */
  getOnlyChild: function () {
    var onlyChild, that = this;
    this.graph.getConnectedLinks(this, {outbound: true}).forEach(function (link) {
      if (link.get('source').port === 'out1') {
        onlyChild = that.graph.getCell(link.get('target').id);
      }
    });
    return onlyChild;
  },

  /**
   * 返回兄弟节点
   * @returns {*}
   */
  getSibling: function () {
    var that = this, parent = this.getParent();
    if (_.isUndefined(parent))
      return undefined;

    var children = parent.getChildren();
    if (children.length === 1)
      return undefined;

    return children.filter(function (child) {
      return child.id !== that.id
    });
  },

  /**
   * 返回节点所有的LocalLeaf数组，仅当该节点所在
   * 的子树上没有leaf时，才存在loalLeaf
   * @returns {Array}
   */
  getLocalLeaves: function () {
    return this._recursiveGatherChild([], function (cell) {
      if (cell.hasAnyChild())
        return false;
      return true;
    });
  },

  /**
   * 返回节点与另一节点间的连线
   * @param ref
   */
  getLinkWith: function (ref) {
    if (_.isUndefined(ref))
      return undefined;

    var outLinks = this.graph.getConnectedLinks(this, {outbound: true}).filter(function (link) {
      return link.get('target').id === ref.id;
    });

    if (!_.isEmpty(outLinks))
      return outLinks.pop();

    var inLinks = this.graph.getConnectedLinks(this, {inbound: true}).filter(function (link) {
      return link.get('source').id === ref.id;
    });

    if (!_.isEmpty(inLinks))
      return inLinks.pop();
  },

  /**
   * 返回节点的层级
   * 根为level1，往下以依次为level2...
   */
  getLevel: function () {
    return this.getAncestors().length;
  },

  /**
   * 返回节点的深度（节点包含的最深的树的层级）
   */
  getDepth: function () {

  },

  /**
   * 返回节点的子树的数量
   */
  getDegree: function () {

  },

  /**
   * 判断节点是否有效
   * @returns {boolean}
   */
  isActive: function () {
    return this.get('active') === true;
  },

  /**
   * 判断是游离的节点
   * 满足非根时，没有根节点的
   * @returns {boolean}
   */
  isDissociative: function () {
    return !this.isRoot() && _.isUndefined(this.getRoot());
  }

}));

//节点模型，有一个inPort和两个outPort
joint.shapes.otree.Node = joint.shapes.otree.Model.extend({

  defaults: joint.util.deepSupplement({

    type: 'otree.Node',
    size: {width: 80, height: 80},
    inPorts: ['in'],
    outPorts: ['out']

  }, joint.shapes.otree.Model.prototype.defaults)
});

//定制的Otree连线
joint.shapes.otree.Link = joint.dia.Link.extend({

  markup: [
    '<path class="connection" stroke="black"/>',
    '<path class="marker-source" fill="black" stroke="black" />',
    '<path class="marker-target" fill="black" stroke="black" />',
    '<path class="connection-wrap"/>',
    '<g class="link-tools"/>'
  ].join(''),

  toolMarkup: [
    '<g class="link-tool">',
    '<g class="tool-remove" event="remove">',
    '<circle r="11" />',
    '<path transform="scale(.8) translate(-16, -16)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z"/>',
    '</g>',
    '</g>'
  ].join(''),

  defaults: {
    type: 'otree.Link',
    attrs: {
      '.connection': {
        'stroke-width': '3px',
        'stroke': '#e3e5e4'
      }
    },
    connector: {
      name: 'rounded'
    }
  },

  initialize: function () {
    joint.dia.Link.prototype.initialize.apply(this, arguments);
  },

});

joint.shapes.otree.ModelView = joint.dia.ElementView.extend(joint.shapes.basic.PortsViewInterface);
joint.shapes.otree.NodeView = joint.shapes.otree.ModelView;

