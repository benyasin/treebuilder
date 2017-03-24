!function (a, b, c, d) {

  // a : joint,
  // b: Backbone,
  // c: _,
  // d: g
  function e(a, b, d) {
    d = c.defaults(d || {}, {
      siblingGap: 0
    }), this.width = 0, this.height = 0, this.layoutAreas = this.sortLayoutAreas(a), this.parentArea = b, this.siblingGap = d.siblingGap, this.computeSize(d)
  }

  function f(a, b, d) {
    var e = c.extend({}, d, this.getRootAttributes(a, d.attributeNames));
    c.defaults(e, {
      siblingGap: 0,
      gap: 0
    }), this.root = a, this.childAreas = b, this.siblingRank = e.siblingRank, this.rootOffset = e.rootOffset, this.gap = e.gap, this.dx = 0, this.dy = 0, this.width = 0, this.height = 0, c.invoke(b, "addParentReference", this), this.computeRelativePosition(a, b, e)
  }

  c.extend(e.prototype, {
    sortLayoutAreas: function (a) {
      var b = c.sortBy(a, "siblingRank");
      return c.each(b, function (a, b) {
        a.siblingRank = b
      }), b
    },
    move: function (a, b) {
      c.each(this.layoutAreas, function (c) {
        c.dx += a, c.dy += b
      })
    },
    exists: function () {
      return this.layoutAreas.length > 0
    },
    sumGaps: function (a) {
      var b = Math.max(this.layoutAreas.length - 1, 0);
      return b * a
    },
    getSiblingRankByPoint: function (a) {
      if (!this.exists()) return -1;
      var b = this.findAreaByPoint(a);
      return b ? b.siblingRank - 1 : this.layoutAreas.length - 1
    },
    getConnectionPoints: function (a, b) {
      if (!this.exists()) return [];
      var c = {
        dx: a.x - this.parentArea.rootCX,
        dy: a.y - this.parentArea.rootCY
      };
      return this.layoutAreas[0].getRootVertices(c, b)
    },
    getParentConnectionPoint: function () {
      var a = this.parentArea,
        b = this.proxyLayoutArea("getConnectionPoint", a.rootSize),
        c = d.point(a.rootCX, a.rootCY);
      return c.offset(b.x, b.y)
    },
    getChildConnectionPoint: function (a, b) {
      var c = this.proxyLayoutArea("getConnectionPoint", b);
      return d.point(a).difference(c)
    },
    proxyLayoutArea: function (a) {
      var b = Array.prototype.slice.call(arguments, 1);
      return f.fromDirection(this.direction).prototype[a].apply(this.parentArea, b)
    }
  }), e.extend = b.Model.extend;
  var g = e.extend({
      findAreaByPoint: function (a) {
        return c.find(this.layoutAreas, function (b) {
          return b.rootCY > a.y
        })
      },
      computeSize: function (a) {
        this.height = c.sum(this.layoutAreas, "height") + this.sumGaps(a.siblingGap), c.reduce(this.layoutAreas, function (b, c) {
          return this.width = Math.max(this.width, c.getExtendedWidth()), c.dy += b + c.height / 2, b += c.height + a.siblingGap
        }, -this.height / 2, this)
      },
      getNeighborPointFromRank: function (a) {
        var b;
        if (this.exists()) {
          var c = this.layoutAreas[a],
            d = this.layoutAreas[a + 1];
          b = c ? d ? (c.y + c.height + d.y) / 2 : c.y + c.height + this.siblingGap / 2 : d.y - this.siblingGap / 2
        } else b = this.parentArea.rootCY;
        return {
          x: this.getXTowardsParent(),
          y: b
        }
      }
    }),
    h = g.extend({
      direction: "L",
      getXTowardsParent: function () {
        var a = this.parentArea;
        return a.rootCX - a.rootSize.width - a.gap
      }
    }),
    i = g.extend({
      direction: "R",
      getXTowardsParent: function () {
        var a = this.parentArea;
        return a.rootCX + a.rootSize.width + a.gap
      }
    }),
    j = e.extend({
      findAreaByPoint: function (a) {
        return c.find(this.layoutAreas, function (b) {
          return b.rootCX > a.x
        })
      },
      computeSize: function (a) {
        this.width = c.sum(this.layoutAreas, "width") + this.sumGaps(a.siblingGap), c.reduce(this.layoutAreas, function (b, c) {
          return this.height = Math.max(this.height, c.getExtendedHeight()), c.dx += b + c.width / 2, b + c.width + a.siblingGap
        }, -this.width / 2, this)
      },
      getNeighborPointFromRank: function (a) {
        var b;
        if (this.exists()) {
          var c = this.layoutAreas[a],
            d = this.layoutAreas[a + 1];
          b = c ? d ? (c.x + c.width + d.x) / 2 : c.x + c.width + this.siblingGap / 2 : d.x - this.siblingGap / 2
        } else b = this.parentArea.rootCX;
        return {
          x: b,
          y: this.getYTowardsParent()
        }
      }
    }),
    k = j.extend({
      direction: "T",
      getYTowardsParent: function () {
        var a = this.parentArea;
        return a.rootCY - a.getLRHeight() / 2 - a.gap
      }
    }),
    l = j.extend({
      direction: "B",
      getYTowardsParent: function () {
        var a = this.parentArea;
        return a.rootCY + a.getLRHeight() / 2 + a.gap
      }
    });
  c.extend(f, {
    create: function (a, b, c, d) {
      var e = f.fromDirection(a, d);
      return new e(b, c, d)
    },
    fromDirection: function (a, b) {
      var c;
      switch (a) {
        case "L":
          c = p;
          break;
        case "T":
          c = q;
          break;
        case "R":
          c = o;
          break;
        case "B":
          c = r;
          break;
        default:
          c = f
      }
      return c
    }
  }), c.extend(f.prototype, {
    direction: null,
    getLRHeight: function () {
      return Math.max(this.rootSize.height, this.siblings.L.height, this.siblings.R.height)
    },
    getBBox: function (a) {
      var b = d.rect(this),
        c = a && a.expandBy;
      return c && b.moveAndExpand({
        x: -c,
        y: -c,
        width: 2 * c,
        height: 2 * c
      }), b
    },
    containsPoint: function (a, b) {
      return this.getBBox(b).containsPoint(a)
    },
    getLayoutSiblings: function (a) {
      return this.siblings[a]
    },
    getExtendedWidth: function () {
      return this.width + this.gap + this.rootOffset
    },
    getExtendedHeight: function () {
      return this.height + this.gap + this.rootOffset
    },
    findMinimalAreaByPoint: function (a, b) {
      if (!this.containsPoint(a, b)) return null;
      var d;
      return c.some(this.childAreas, function (c) {
        return d = c.findMinimalAreaByPoint(a, b), !!d
      }), d || this
    },
    getType: function () {
      return c.reduce(this.siblings, function (a, b, c) {
        return b.exists() ? a + c : a
      }, "")
    },
    addParentReference: function (a) {
      this.parentArea = a
    },
    getRootAttributes: function (a, b) {
      var d = a.get(b.siblingRank || "siblingRank");
      return {
        siblingRank: c.isNumber(d) ? d : null,
        rootOffset: a.get(b.offset || "offset") || 0,
        rootMargin: a.get(b.margin || "margin") || 0
      }
    },
    getRootSize: function (a, b) {
      var d = c.clone(a.get("size"));
      return d[this.marginDimension] += b, d
    },
    createSiblings: function (a, b) {
      var d = c.groupBy(a, "direction");
      return {
        L: new h(d.L, this, b),
        T: new k(d.T, this, b),
        R: new i(d.R, this, b),
        B: new l(d.B, this, b)
      }
    },
    computeSize: function (a, b) {
      var c = a.L.width + b.width + a.R.width,
        d = Math.max(a.L.height, b.height, a.R.height);
      return {
        width: Math.max(a.T.width, a.B.width, c),
        height: a.T.height + a.B.height + d
      }
    },
    computeOrigin: function () {
      return {
        x: this.rootCX - Math.max(this.siblings.L.width + this.rootSize.width / 2, this.siblings.T.width / 2, this.siblings.B.width / 2),
        y: this.rootCY - this.siblings.T.height - this.getLRHeight() / 2
      }
    },
    moveSiblings: function (a, b) {
      if (this.hasHorizontalSiblings(a)) {
        var c = b.width / 2;
        a.L.move(-c, 0), a.R.move(c, 0)
      }
      if (this.hasVerticalSiblings(a)) {
        var d = Math.max(a.L.height, b.height, a.R.height) / 2;
        a.T.move(0, -d), a.B.move(0, d)
      }
    },
    moveRootToConnectionPoint: function (a) {
      var b = this.getConnectionPoint(a);
      this.dx += b.x, this.dy += b.y
    },
    computeRelativePosition: function (a, b, d) {
      var e = this.siblings = this.createSiblings(b, {
          siblingGap: d.siblingGap
        }),
        f = this.rootSize = this.getRootSize(a, d.rootMargin);
      c.extend(this, this.computeSize(e, f)), this.moveSiblings(e, f), this.moveRootToConnectionPoint(f), this.moveRootBehindSiblings(e, f), this.moveRootFromParent(d.gap + d.rootOffset)
    },
    computeAbsolutePosition: function () {
      if (this.parentArea) this.rootCX = this.parentArea.rootCX + this.dx, this.rootCY = this.parentArea.rootCY + this.dy, this.level = this.parentArea.level + 1;
      else {
        var a = this.root.getBBox().center();
        this.rootCX = a.x, this.rootCY = a.y, this.level = 0
      }
      c.extend(this, this.computeOrigin())
    },
    hasVerticalSiblings: function (a) {
      return a.T.exists() || a.B.exists()
    },
    hasHorizontalSiblings: function (a) {
      return a.L.exists() || a.R.exists()
    },
    isSourceArea: function () {
      return !this.parentArea
    },
    isSinkArea: function () {
      return 0 === this.childAreas.length
    },
    getRootPosition: function () {
      var a = this.root.get("size");
      return {
        x: this.rootCX - a.width / 2,
        y: this.rootCY - a.height / 2
      }
    },
    getRootVertices: function (a, b) {
      if (b = b || {}, a = a || this, 0 === a[this.deltaCoordinate] || !this.parentArea) return [];
      var d, e = this.parentArea.getInnerSize();
      if (!b.ignoreSiblings && this.hasSiblingsBetweenParent()) {
        var f = this.siblings[this.oppositeDirection];
        d = this.getRelativeVerticesAvoidingSiblings(e, a, f)
      } else d = this.getRelativeVertices(e, a);
      return c.invoke(d, "offset", this.parentArea.rootCX, this.parentArea.rootCY)
    },
    getOuterSize: function () {
      return {
        width: this.width,
        height: this.height
      }
    },
    getInnerSize: function () {
      return {
        width: this.rootSize.width,
        height: this.getLRHeight()
      }
    },
    getConnectionPoint: function () {
      return null
    },
    getRelativeVertices: function () {
      return null
    },
    moveRootFromParent: function () {
    },
    moveRootBehindSiblings: function () {
    },
    hasSiblingsBetweenParent: function () {
      return !this.isSourceArea() && this.siblings[this.oppositeDirection].exists()
    }
  }), f.extend = b.Model.extend;
  var m = f.extend({
      deltaCoordinate: "dy",
      marginDimension: "width"
    }),
    n = f.extend({
      deltaCoordinate: "dx",
      marginDimension: "height"
    }),
    o = n.extend({
      direction: "R",
      oppositeDirection: "L",
      getConnectionPoint: function (a) {
        return d.point(a.width / 2, 0)
      },
      moveRootBehindSiblings: function (a, b) {
        this.dx += Math.max(a.L.width, (a.T.width - b.width) / 2, (a.B.width - b.width) / 2), this.dy += (a.T.height - a.B.height) / 2
      },
      moveRootFromParent: function (a) {
        this.dx += a
      },
      getRelativeVertices: function (a, b) {
        var c = this.getConnectionPoint(a);
        return [c.clone().offset(this.gap / 2, 0), c.clone().offset(this.gap / 2, b.dy)]
      },
      getRelativeVerticesAvoidingSiblings: function (a, b, c) {
        var d = this.getConnectionPoint(a),
          e = c.siblingGap,
          f = b.dy > 0 ? -1 : 1,
          g = c.layoutAreas.length > 1 ? 1.5 : 1,
          h = b.dy + f * (c.height + e) / 2,
          i = b.dy + f * this.rootSize.height / 4,
          j = this.gap / 2,
          k = g * j + c.width;
        return [d.clone().offset(j, 0), d.clone().offset(j, h), d.clone().offset(k, h), d.clone().offset(k, i)]
      }
    }),
    p = n.extend({
      direction: "L",
      oppositeDirection: "R",
      getConnectionPoint: function (a) {
        return d.point(-a.width / 2, 0)
      },
      moveRootBehindSiblings: function (a, b) {
        this.dx -= Math.max(a.R.width, (a.T.width - b.width) / 2, (a.B.width - b.width) / 2), this.dy += (a.T.height - a.B.height) / 2
      },
      moveRootFromParent: function (a) {
        this.dx -= a
      },
      getRelativeVertices: function (a, b) {
        var c = this.getConnectionPoint(a);
        return [c.clone().offset(-this.gap / 2, 0), c.clone().offset(-this.gap / 2, b.dy)]
      },
      getRelativeVerticesAvoidingSiblings: function (a, b, c) {
        var d = this.getConnectionPoint(a),
          e = c.siblingGap,
          f = b.dy > 0 ? -1 : 1,
          g = c.layoutAreas.length > 1 ? 1.5 : 1,
          h = b.dy + f * (c.height + e) / 2,
          i = b.dy + f * this.rootSize.height / 4,
          j = this.gap / 2,
          k = g * j + c.width;
        return [d.clone().offset(-j, 0), d.clone().offset(-j, h), d.clone().offset(-k, h), d.clone().offset(-k, i)]
      }
    }),
    q = m.extend({
      direction: "T",
      oppositeDirection: "B",
      getConnectionPoint: function (a) {
        return d.point(0, -a.height / 2)
      },
      moveRootBehindSiblings: function (a, b) {
        this.dx += (a.L.width - a.R.width) / 2, this.dy -= a.B.height, this.hasHorizontalSiblings(a) && (this.dy -= (this.getLRHeight() - b.height) / 2)
      },
      moveRootFromParent: function (a) {
        this.dy -= a
      },
      getRelativeVertices: function (a, b) {
        var c = this.getConnectionPoint(a);
        return [c.clone().offset(0, -this.gap / 2), c.clone().offset(b.dx, -this.gap / 2)]
      },
      getRelativeVerticesAvoidingSiblings: function (a, b, c) {
        var d = this.getConnectionPoint(a),
          e = c.siblingGap,
          f = b.dx > 0 ? -1 : 1,
          g = c.layoutAreas.length > 1 ? 1.5 : 1,
          h = this.gap / 2,
          i = g * h + c.height,
          j = b.dx + f * (c.width + e) / 2,
          k = b.dx + f * this.rootSize.width / 4;
        return [d.clone().offset(0, -h), d.clone().offset(j, -h), d.clone().offset(j, -i), d.clone().offset(k, -i)]
      }
    }),
    r = m.extend({
      direction: "B",
      oppositeDirection: "T",
      getConnectionPoint: function (a) {
        return d.point(0, a.height / 2)
      },
      moveRootBehindSiblings: function (a, b) {
        this.dx += (a.L.width - a.R.width) / 2, this.dy += a.T.height, this.hasHorizontalSiblings(a) && (this.dy += (this.getLRHeight() - b.height) / 2)
      },
      moveRootFromParent: function (a) {
        this.dy += a
      },
      getRelativeVertices: function (a, b) {
        var c = this.getConnectionPoint(a);
        return [c.clone().offset(0, this.gap / 2), c.clone().offset(b.dx, this.gap / 2)]
      },
      getRelativeVerticesAvoidingSiblings: function (a, b, c) {
        var d = this.getConnectionPoint(a),
          e = c.siblingGap,
          f = b.dx > 0 ? -1 : 1,
          g = c.layoutAreas.length > 1 ? 1.5 : 1,
          h = this.gap / 2,
          i = g * h + c.height,
          j = b.dx + f * (c.width + e) / 2,
          k = b.dx + f * this.rootSize.width / 4;
        return [d.clone().offset(0, h), d.clone().offset(j, h), d.clone().offset(j, i), d.clone().offset(k, i)]
      }
    }),
    s = {
      rotate: function (a) {
        var b = "LTRB",
          c = b.indexOf(a[0]) - b.indexOf(a[1]);
        return function (a) {
          var d = b.indexOf(a);
          return d >= 0 ? b[(4 + d - c) % 4] : a
        }
      },
      flip: function (a) {
        var b = a[0],
          c = a[1];
        return function (a) {
          return a === b ? c : a === c ? b : a
        }
      },
      straighten: function (a) {
        return c.constant(a[1])
      }
    },
    t = b.Model.extend({
      defaults: {
        graph: void 0,
        gap: 20,
        siblingGap: 20,
        direction: "R",
        directionRule: s.straighten,
        updatePosition: function (a, b, c) {
          a.set("position", b, c)
        },
        updateVertices: function (a, b, c) {
          a.set("vertices", b, c)
        },
        updateAttributes: null,
        filter: null,
        attributeNames: {}
      },
      initialize: function () {
        this._cacheOptions(this.attributes), this.layoutAreas = {}
      },
      layout: function (a) {
        return this.layoutAreas = {}, c.each(this.graph.getSources(), c.partial(this.layoutTree, c, a), this), this.trigger("layout:done", a), this
      },
      layoutTree: function (a, b) {
        b = b || {}, b.treeLayout = !0;
        var c = this._computeLayoutAreas(a, this.get("direction"), b);
        return this._computeAbsolutePositions(c), this._updateCells(c, b), this
      },
      getLayoutArea: function (a) {
        return this.layoutAreas[a.id || a] || null
      },
      getRootLayoutAreas: function () {
        return c.map(this.graph.getSources(), this.getLayoutArea, this)
      },
      getMinimalRootAreaByPoint: function (a) {
        var b = c.filter(this.getRootLayoutAreas(), function (b) {
          return b.containsPoint(a)
        });
        return c.isEmpty(b) ? null : c.min(b, function (a) {
          return a.width * a.height
        })
      },
      _computeLayoutAreas: function (a, b, d) {
        var e = a.get(this.getAttributeName("direction")) || b,
          g = this._getChildren(a, d),
          h = c.map(g, c.partial(this._computeLayoutAreas, c, e, d), this),
          i = f.create(e, a, h, this.attributes);
        return i.link = this.graph.getConnectedLinks(a, {
          inbound: !0
        })[0], this.layoutAreas[a.id] = i, i
      },
      _cacheOptions: function (a) {
        var b = ["updateAttributes", "updateVertices", "updatePosition", "filter"];
        c.each(b, function (b) {
          this[b] = c.isFunction(a[b]) ? a[b] : null
        }, this), this.graph = a.graph
      },
      _getChildren: function (a, b) {
        var c = this.graph.getNeighbors(a, {
          outbound: !0
        });
        return this.filter && c.length > 0 && (c = this.filter(c, a, b) || c), c
      },
      _computeAbsolutePositions: function (a) {
        a.computeAbsolutePosition(a), c.each(a.childAreas, this._computeAbsolutePositions, this)
      },
      _updateCells: function (a, b) {
        var d = a.root,
          e = a.link || null;
        e && (this.updatePosition && this.updatePosition(d, a.getRootPosition(), b), this.updateVertices && this.updateVertices(e, a.getRootVertices(), b)), this.changeSiblingRank(d, a.siblingRank, b), this.updateAttributes && this.updateAttributes(a, d, e, b), c.each(a.childAreas, c.partial(this._updateCells, c, b), this)
      },
      updateDirections: function (a, b, d) {
        d = d || {};
        var e = this.getAttributeName("direction"),
          f = this.get("directionRule")(b);
        this.graph.search(a, c.bind(function (a, b) {
          if (0 !== b) {
            var c = f(a.get(e));
            this.changeDirection(a, c, d)
          }
        }, this), {
          outbound: !0
        })
      },
      reconnectElement: function (a, b, c) {
        c = c || {};
        var d = this.getLayoutArea(a),
          e = d.link;
        if (e) {
          e.set("source", {
            id: b.id || b
          }, c);
          var f = d.direction,
            g = c.direction || f,
            h = c.siblingRank || void 0;
          return this.changeSiblingRank(a, h, c), this.changeDirection(a, g, c), f !== g && this.updateDirections(a, [f, c.direction], c), !0
        }
        return !1
      },
      changeSiblingRank: function (a, b, c) {
        a.set(this.getAttributeName("siblingRank"), b, c)
      },
      changeDirection: function (a, b, c) {
        a.set(this.getAttributeName("direction"), b, c)
      },
      getAttributeName: function (a) {
        return this.get("attributeNames")[a] || a
      },
      getAttribute: function (a, b) {
        return a.get(this.getAttributeName(b))
      }
    }, {
      directionRules: s
    });
  a.layout.TreeLayout = t
}(joint, Backbone, _, g);
