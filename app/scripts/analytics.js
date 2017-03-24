var $treeModelMenu = $('#container .dropdown-menu'),  //树模型下拉菜单
  $treeModelToggle = $('.dropdown-toggle')

$(document)
//产品列表收起与展开效果
  .on('click', '#container .prods ul > li', function (e) {
    if (!$(e.target).closest('ul').parent().is('.prods')) {
      return false;
    }
    if ($(this).find('ul').is(':visible')) {
      $(this).find('ul').slideUp(300);
      $(this).find(' > span i').replaceWith('<i class="icon iconfont">&#xe645;</i>');
    } else {
      $(this).find('ul').slideDown(300);
      $(this).find(' > span i').replaceWith('<i class="icon iconfont">&#xe652;</i>');
    }
  })
  .on('click', '#container .tags ul > li', function (e) {
    if (!$(e.target).closest('ul').parent().is('.tags')) {
      return false;
    }
    if ($(this).find('ul').is(':visible')) {
      $(this).find('ul').slideUp(300);
      $(this).find(' > span i').replaceWith('<i class="icon iconfont">&#xe645;</i>');
    } else {
      $(this).find('ul').slideDown(300);
      $(this).find(' > span i').replaceWith('<i class="icon iconfont">&#xe652;</i>');
    }
  })
  //版本列表下拉
  .on('click', '#container .dropdown-toggle', function (e) {
    if ($(e.target).closest('.dropdown-menu').length === 0) {
      $treeModelMenu.slideToggle('fast')
    }
  })
  //点击空白处收起所有下拉的面板
  .on('click', function (e) {
    //收起版本列表下拉
    if ($(e.target).closest('.dropdown-toggle').length === 0 && $treeModelMenu.is(':visible')) {
      $treeModelMenu.slideUp('fast')
    }

    if ($(e.target).closest('.editable').length === 0) {
      $('.node .editable').blur();
    }
  })
  //左右branch的鼠标移入效果，js修正边框问题导致的抖动
  .on('mouseenter', '#container .branch', function (e) {
    if ($(e.target).closest('.left').length) {
      $(e.target).closest('.left').find('.distribution').css({
        'border-right': 'none'
      })
    }
    if ($(e.target).closest('.right').length) {
      $(e.target).closest('.branches').find('.left .distribution').css({
        'border-right': '1px solid transparent'
      })
    }
  })
  //左右branch的鼠标移出效果，js修正边框问题导致的抖动
  .on('mouseleave', '#container .branch', function (e) {
    if ($(e.target).closest('.left').length) {
      $(e.target).closest('.left').find('.distribution').css({
        'border-right': '1px solid #e3e5e4'
      })
    }
    if ($(e.target).closest('.right').length) {
      $(e.target).closest('.branches').find('.left .distribution').css({
        'border-right': '1px solid #e3e5e4'
      })
    }
  })
  //删除节点元素
  .on('click', '#container foreignObject i.delete', function () {
    callbacks.beforeRemove($(this).closest('g.element').attr('model-id'));
  })
  //点击分步推荐
  .on('click', '#container foreignObject .recommend', function () {
    var $cell = $(this).closest('.element');
    //inactive状态的节点不能分步推荐
    if ($cell.children('g:nth-child(1)').is('.inactive')) {
      return false;
    }

    var cellId = $cell.attr('model-id');
    var pindex = $cell.find('.recommend').index($(this));
    var jqXhr = $.ajax({
      url: './data/' + $treeModelToggle.attr('data-model') + '/add.json',
      type: 'get'
    });
    return jqXhr.done(function (data) {
      var node = data.nodes[0];
      node.id = new Date().getTime() + "";
      node.pid = cellId;
      node.pindex = pindex;
      stencil.recommendStepByStep(node, true);
    })
  })
  //点击智能分析
  .on('click', '#container .intelligence', function (e) {
    if (!$('#container .right-aside-toggle').hasClass('open')) {
      $('#container .right-aside-toggle').trigger('click');
    }

    if (!$(e.target).is('.config') && !$(e.target).closest('.dropdown-config').length) {
      var i = 0;
      var loopFunc = function queryAutoRecommend() {
        var jqXhr = $.ajax({
          url: './data/' + $treeModelToggle.attr('data-model') + '/recommend.json',
          data: {
            composeAnalysisId: $treeModelToggle.attr('data-id'),
            maxDepth: $('#depth').val(),
            minPercent: $('#coverage').val()
          },
          type: 'get'
        });
        jqXhr.done(function (ret) {
          if (ret.success) {
            i++;
            if (_.isEmpty(ret.data)) {
              if (i >= 60) {
                $('div.loading').hide();
                BsDialog.alert('后台繁忙，请稍后再试');
              } else {
                setTimeout(queryAutoRecommend, 1000);
              }
            } else {
              $('div.loading').hide();
              stencil.recommendOneKey(ret.data.nodes, true);
            }
          } else {
            $('div.loading').hide();
            BsDialog.alert(ret.msg);
          }
        })
      };
      $('div.loading').show();
      loopFunc();
    }
  })
  // 切换模型
  .on('click', '#container .dropdown-menu > li span', function () {

    graph.clear();
    var previousText = $('.dropdown-toggle label').text(),
      previousModel = $treeModelToggle.attr('data-model');
    var $that = $(this);
    $('.left-aside [data-model]').each(function () {
      $(this).attr('data-model', $that.attr('data-model') + '.node');
    });
    if ($that.attr('data-model') === 'btree') {
      $(".left-aside [data-tpl='twins']").parent().show();
      $(".left-aside [data-tpl='single']").parent().hide();
      $(".right-aside [data-field='smooth']").show();
      $(".right-aside [data-field='rouned']").hide();
    } else if ($that.attr('data-model') === 'otree') {
      $(".left-aside [data-tpl='single']").parent().show();
      $(".left-aside [data-tpl='twins']").parent().hide();
      $(".right-aside [data-field='smooth']").hide();
      $(".right-aside [data-field='rouned']").show();
    }
    $treeModelToggle.attr('data-model', $that.attr('data-model')).children('label')
      .text($that.text());
    $that.text(previousText).attr('data-model', previousModel);
    $treeModelMenu.slideUp('fast');
  })
  // 标签列表中删除事件
  .on('click', 'nav i.delete', function () {
    var context = this;
    var tagDesc = $(this).parent().attr('data-desc')
    $.post('delTag.json', {
      composeAnalysisId: $treeModelToggle.attr('data-id'),
      tagDesc: tagDesc
    }, function (data) {
      if (!data.success) {
        BsDialog.alert(data.msg);
      } else {
        var ids = [];
        var cids = [];
        $(context).closest('li').remove();
        $.each(graph.getElements(), function (i, ele) {
          if (ele.get('type') === 'btree.Leaf' && ele.get('data').desc === tagDesc) {
            ids.push(ele.id);
            cids.push(ele.cid);
          }
        });
        $.each(cids, function (i, cid) {
          stencil.removeCell(cid);
        })
      }
    });
  })
  //delete快捷键
  .on('keydown', function (e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 46) {
      var deletedIds = _.map($('.selection .selection-box'), function (s) {
        return $(s).attr('data-model');
      })
      if (!_.isEmpty(deletedIds)) {
        _.each(deletedIds, function (id) {
          stencil.removeCell(id);
        })
      }
    }
  })
  //绑定鼠标滚动事件
  .on('mousewheel', '#paper>svg', function (event, delta, deltaX, deltaY) {
    if (joint.V(document.querySelector('#paper > svg')).hasClass('mouse-move')) {
      delta > 0 ? Toolbox.enlargeHandler() : Toolbox.reduceHandler();
    }
  })
  //绑定规则文本修改事件
  .on('click', '.node .editable', function () {
    $(this).focus();
    var input = $(this)[0];
    if (window.netscape) {
      var n = input.value.length;
      input.selectionStart = n;
      input.selectionEnd = n;
    } else
      input.value = input.value;
  })


/**
 * -----------------------------
 * 已存在元素的事件绑定
 * -----------------------------
 */
  //左边栏收起与展开效果
$('#container .left-aside-toggle').on('click', function () {
  $(this).find('span').toggleClass('rotated');
  if ($(this).hasClass('open')) {
    $(this).removeClass('open');
    $('.left-aside .stretched').hide();
    $('.left-aside').animate({
      minWidth: '45px',
      width: '-=115px'
    }, 'fast')
  } else {
    $(this).addClass('open');
    $('.left-aside').animate({
      minWidth: '160px',
      width: '+=85px'
    }, 'fast', function () {
      $('.left-aside .stretched').show();
    })
  }
})
//右边栏收起与展开效果
$('#container .right-aside-toggle').on('click', function () {
  var $this = $(this);
  $this.find('span').toggleClass('rotated');

  var $decision_effect = $('.right-aside .decision-effect'),
    $node_property = $('.right-aside .node-property');

  if ($this.hasClass('open') && !$this.hasClass('clicked')) {
    $this.addClass('clicked');
    $this.removeClass('open');

    $('.right-aside .stretched').hide();
    $decision_effect.css('height', '32px');
    $decision_effect.find('.aside-title').html('<span><i class="icon iconfont">&#xe657;</i></span>');
    $node_property.find('.aside-title').html('<span><i class="icon iconfont">&#xe658;</i></span>');

    $('.right-aside').animate({
      minWidth: '50px',
      width: '-=150px'
    }, 'normal', function () {
      //重置Paper的宽高
      var paperWidth = $('#paper > svg').attr('width')
      paper.setDimensions((paperWidth * 1 + 150), $('#paper').height());
      $this.removeClass('clicked');
    })
  } else if (!$this.hasClass('open') && !$this.hasClass('clicked')) {
    $this.addClass('open');
    $this.addClass('clicked');

    $decision_effect.css('height', '260px');
    $decision_effect.find('.aside-title').html($decision_effect.find('.aside-title').attr('title'));
    $node_property.find('.aside-title').html($node_property.find('.aside-title').attr('title'));

    var paperWidth = $('#paper > svg').attr('width');
    paper.setDimensions((paperWidth * 1 - 150), $('#paper').height())

    $('.right-aside').animate({
      minWidth: '200px',
      width: '+=150px'
    }, 'normal', function () {
      $('.right-aside .stretched').show();
      stencil.checkToScaleContentToFit();
      $this.removeClass('clicked');
    })
  }
})
//重排序
$('#relayout').click(function (e) {
  var direction = $(this).val();
  var graphLayout;
  var treeModel = $('.dropdown-toggle').attr('data-model');
  if (treeModel === 'btree') {
    graphLayout = new joint.layout.TreeLayout({
      graph: graph,
      direction: direction,
      updateVertices: false
    })
  } else if (treeModel === 'otree') {
    graphLayout = new joint.layout.TreeLayout({
      graph: graph,
      direction: direction
    });
  }
  graphLayout.layout();
});
//修改连线精细
$('#range').change(function () {
  var range = $(this).val();
  console.log(range)
  graph.getLinks().forEach(function (l) {
    l.attr('.connection/stroke-width', range);
  })
});
//修改平滑
$('#smooth').click(function () {
  var checked = $(this).is(':checked');
  var connector = checked ? 'smooth' : 'normal';
  graph.getLinks().forEach(function (l) {
    l.set('connector', {name: connector});
  })
});
//修改圆角
$('#rounded').click(function () {
  var checked = $(this).is(':checked');
  var connector = checked ? 'rounded' : 'normal';
  graph.getLinks().forEach(function (l) {
    l.set('connector', {name: connector});

    var path = $('g[model-id= ' + l.id + '] .connection')[0];
    var length = path.getTotalLength();
    path.style.transition = path.style.WebkitTransition = 'none';
    path.style.strokeDasharray = length + ' ' + length;
  })
});
//修改方向
$('#direction').change(function () {
  var direction = $(this).val();
  var graphLayout;
  var treeModel = $('.dropdown-toggle').attr('data-model');
  if (treeModel === 'btree') {
    graphLayout = new joint.layout.TreeLayout({
      graph: graph,
      direction: direction,
      updateVertices: false
    })
  } else if (treeModel === 'otree') {
    graphLayout = new joint.layout.TreeLayout({
      graph: graph,
      direction: direction
    });
  }

  //重新布局magnet ports
  graph.getElements().forEach(function (e) {
    var ev = paper.findViewByModel(e);
    var core = joint.V(ev.el).findOne('foreignObject') || joint.V(ev.el).findOne('.shapes');
    var width = core.attr('width');
    var height = core.attr('height');
    var inPorts = joint.V(ev.el).findOne('.inPorts .port');
    var outPorts = joint.V(ev.el).find('.outPorts .port');
    var outPortLength = outPorts.length;
    if (direction === 'B') {
      inPorts.attr('transform', 'translate(' + width / 2 + ',0)');
      outPorts.forEach(function (o, i) {
        o.attr('transform', 'translate(' + Math.pow(0.5, outPortLength) * (2 * i + 1) * width + ',' + height + ')');
      })
    } else if (direction === 'R') {
      inPorts.attr('transform', 'translate(0,' + height / 2 + ')');
      outPorts.forEach(function (o, i) {
        o.attr('transform', 'translate(' + width + ',' + Math.pow(0.5, outPortLength) * (2 * i + 1) * height + ')');
      })
    }
  })
  _.invoke(graph.getElements(), 'set', 'direction', direction);
  graphLayout.layout();

  Toolbox.adaptHandler()

});
//放大
$('.action.enlarge').on('click', function () {
  Toolbox.enlargeHandler()
});
//缩小
$('.action.reduce').on('click', function () {
  Toolbox.reduceHandler()
})
//移动模式
$('.action.move').on('click', function () {
  joint.V(document.querySelector('#paper > svg')).removeClass('mouse-choice').addClass('mouse-move');
  selectionView.stopSelecting();
  $(this).addClass('selected');
  $('.action.choice').removeClass('selected');
})
//选择模式
$('.action.choice').on('click', function () {
  joint.V(document.querySelector('#paper > svg')).removeClass('mouse-move').addClass('mouse-choice');
  $(this).addClass('selected');
  $('.action.move').removeClass('selected');
})
//实际比例
$('.action.practical').on('click', function () {
  Toolbox.practicalHandler()
});
//适应画布
$('.action.adapt').on('click', function () {
  Toolbox.adaptHandler()
});


/**
 * 回调函数定义
 * @type {{afterConnected: Function}}
 * @type {{afterIntersected: Function}}
 * @type {{afterDisconnected: Function}}
 * @type {{beforeRemove: Function}}
 * @type {{afterRemove: Function}}
 */
var callbacks = {

  //连接两个节点时
  afterConnected: function (link) {

  },

  //将某元素拖拽到某节点某个分支上
  afterIntersected: function () {

  },

  //断开某条连线时
  afterDisconnected: function (source, target) {
    var tCell = graph.getCell(target.id);
    tCell.options.pid = '';
    tCell.options.pindex = 0;

    //清除目标节点及其下级节点的分布信息
    stencil.updateCellView(tCell.options);
  },

  //删除节点前置函数
  beforeRemove: function (nodeId) {
    var deleted = graph.getCell(nodeId);
    //如果删除的节点在计算的树上且刚是不需要再计算的
    stencil.updateCellView(deleted.options);
    stencil.removeCell(nodeId);
  },
};

var graph = new joint.dia.Graph;
var paper = new joint.dia.Paper({
  el: $('#paper'),
  model: graph,
  width: $('#paper').width(),
  height: $('#paper').height(),
  gridSize: 1,
  perpendicularLinks: true,
  snapLinks: false,
  linkPinning: false,
  markAvailable: true,
  restrictTranslate: true,
  validateConnection: function (cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
    var linkedPorts = [], links = [];
    var targetPort = cellViewT.model.id + ':' + $(magnetT).attr('port');
    var cycleLink = cellViewT.model.id + ':' + cellViewS.model.id;
    graph.getLinks().forEach(function (link) {
      links.push($(link.get('source')).attr('id') + ':' + $(link.get('target')).attr('id'));
      linkedPorts.push($(link.get('target')).attr('id') + ':' + $(link.get('target')).attr('port'));
      linkedPorts.push($(link.get('source')).attr('id') + ':' + $(link.get('source')).attr('port'));
    });
    if (cellViewS === cellViewT || magnetS === magnetT)
      return false;
    //TODO 大于两个节点的环的判定
    if ($.inArray(cycleLink, _.uniq(links)) > -1)
      return false;
    if ($.inArray(targetPort, _.uniq(linkedPorts)) > -1)
      return false;
    if ($(magnetS).parent().parent()[0].classList[0] === $(magnetT).parent().parent()[0].classList[0])
      return false;
    return true;
  },
  defaultLink: new joint.shapes.btree.Link(),
  linkView: joint.dia.LinkView.extend({
    options: _.extend({}, joint.dia.LinkView.prototype.options, {
      linkToolsOffset: 60
    })
  }),
  interactive: function () {
    return {
      vertexAdd: false
    };
  }
});

var sPoint = {x: 0, y: 0};
var selection = new Backbone.Collection;

var stencil = new joint.ui.Stencil({
  graph: graph,
  paper: paper,
  /**
   * 拖拽交叉
   * @param attrs
   * @returns {*}
   */
  intersect: function (attrs) {
    var that = this;
    var jqXhr = $.ajax({
      url: './data/' + $treeModelToggle.attr('data-model') + '/add.json',
      type: "get",
    });
    jqXhr.done(function (ret) {
      var node;
      node = ret.nodes[1];
      attrs.data = node;
      var parent = that.graph.getCell(attrs.pid);
      attrs.level = parent.options.level + 1;

      stencil.layout(stencil.appendChild(attrs));
    })
  },
  //拖拽到空白处
  blankDrop: function (attrs) {
    var jqXhr = $.ajax({
      url: './data/' + $treeModelToggle.attr('data-model') + '/add.json',
      type: "get"
    });
    jqXhr.done(function (ret) {
      var node;
      node = ret.nodes[0];
      attrs.data = node;

      stencil.appendChild(attrs);
    })
  }
});
var snaplines = new joint.ui.Snaplines({paper: paper});
var selectionView = new joint.ui.SelectionView({
  paper: paper,
  graph: graph,
  model: selection,
  filter: function (model) {
    return false;
  }
});

graph.on('remove', function (cell, collection, opt) {
  //如果是在一键智能分析时调graph.clear方法：令option.clear=true
  //如果是在分步式智能分析时调elements.remove方法：令option.replace=true
  if (opt.clear !== true && opt.replace !== true) {
    if (cell.isLink()) {
      var source = cell.get('source'),
        target = cell.get('target');
      //排除连线时因没connected任何元素，内部自动删除link的情况
      if (!_.isUndefined(target.port)) {
        callbacks.afterDisconnected(source, target);
      }
    }
  }
}).on('change:source change:target', function (cell) {
  var source = cell.get('source'),
    target = cell.get('target');
  //标记该link已被移动(remove与click时不会移动，只有connect时才移动)
  cell.set('moved', true);
}).on('change:position', function (cell) {
  //节点移动时,重新计算path的长度并redraw
  graph.getConnectedLinks(cell).forEach(function (l) {
    var path = $('g[model-id= ' + l.id + '] .connection')[0];
    var length = path.getTotalLength();
    path.style.transition = path.style.WebkitTransition = 'none';
    path.style.strokeDasharray = length + ' ' + length;
  })
});

paper.on('cell:pointerup', function (cellView, e, x, y) {
  var cell = cellView.model;
  if (1 === e.which) {
    if (cell.isLink()) {
      var source = cell.get('source'),
        target = cell.get('target');
      if (!_.isUndefined(source.port) && !_.isUndefined(source.id) && !_.isUndefined(target.port) && !_.isUndefined(target.id) &&
        cell.get('moved')) {
        cell.set('moved', false);
        callbacks.afterConnected(cell);
      }
    } else {
      //移动模式下，在节点上pointerup时删除标记class
      if (joint.V(document.querySelector('#paper > svg')).hasClass('mouse-move')) {
        joint.V(document.querySelector('#paper > svg')).removeClass('cell-moving');
      }
      //选择模式下，按住ctrl或meta键时，将节点放入选区
      else {
        if (e.ctrlKey || e.metaKey) {
          selection.add(cell);
          selectionView.createSelectionBox(cellView);
        }
      }
    }
  }
}).on('cell:pointerdown', function (cellView, e, x, y) {
  var cell = cellView.model;
  //左键且在移动模式下，在节点上pointerdown时添加标记class
  if (1 === e.which) {
    if (joint.V(document.querySelector('#paper > svg')).hasClass('mouse-move')) {
      if (!cell.isLink()) {
        joint.V(document.querySelector('#paper > svg')).addClass('cell-moving');
      }
    }
  }
})
  .on('blank:pointerdown', function (e) {
  //左键且在移动模式下，pointerdown时记录起始坐标
  if (1 === e.which) {
    if (joint.V(document.querySelector('#paper > svg')).hasClass('mouse-move')) {
      sPoint = {
        x: e.pageX,
        y: e.pageY
      }
    } else {
      //在选择模式下，启动选择监听
      selectionView.startSelecting(e);
    }
  }
}).on('blank:pointerup', function (e) {
  //左键且在移动模式下，pointerup时清除起始坐标
  if (1 === e.which && joint.V(document.querySelector('#paper > svg')).hasClass('mouse-move')) {
    sPoint = {x: 0, y: 0};
  }
})
;

//鼠标在paper的blank区移动时，可移动整体的面板
paper.$el.on('mousemove', function (e) {
  var vsvg = joint.V(document.querySelector('#paper > svg'));
  if (1 === e.which && vsvg.hasClass('mouse-move') && !vsvg.hasClass('cell-moving')) {
    var offsetX = sPoint.x > 0 ? (e.pageX - sPoint.x) : 0;
    var offsetY = sPoint.y > 0 ? (e.pageY - sPoint.y) : 0;
    sPoint = {
      x: e.pageX,
      y: e.pageY
    }
    joint.V(paper.viewport).translate(offsetX, offsetY)
  }
});
selectionView.on('selection-box:pointerdown', function (evt) {
  if (evt.ctrlKey || evt.metaKey) {
    var cell = selection.get($(evt.target).data('model'));
    selection.reset(selection.without(cell));
    selectionView.destroySelectionBox(paper.findViewByModel(cell));
  }
});


var ed;
var cellViewUnderEdit;

function closeEditor() {

  if (ed) {
    ed.remove();
    // Re-enable dragging after inline editing.
    if (cellViewUnderEdit) {
      cellViewUnderEdit.options.interactive = true;
    }
    ed = cellViewUnderEdit = undefined;
  }
}

paper.on('cell:mouseover', function(cellView, evt) {

  // Clean up the old text editor if there was one.
  closeEditor();

  var text = joint.ui.TextEditor.getTextElement(evt.target);
  if (text) {

    openEditor(text, function(newText) {
      var view = paper.findView(ed.options.text);
      view.model.attr('text/text', newText);
    });

    cellViewUnderEdit = cellView;
    // Prevent dragging during inline editing.
    cellViewUnderEdit.options.interactive = false;
  }
});

$(document.body).on('click', function(evt) {

  var text = joint.ui.TextEditor.getTextElement(evt.target);
  if (ed && !text) {

    closeEditor();
  }
});

function openEditor(text, onTextChange) {

  ed = new joint.ui.TextEditor({ text: text });
  ed.render(paper.el);

  // All the events the ui.TextEditor triggers:
  ed.on('text:change', function(newText) {
    console.log('Text changed: ' + newText);
    onTextChange(newText);
  });

  ed.on('select:change', function(selectionStart, selectionEnd) {
    var t = ed.getTextContent().substring(selectionStart, selectionEnd);
    console.log('Selection range: ', selectionStart, selectionEnd, 'text: ', t);
  });

  ed.on('caret:change', function(selectionStart) {
    console.log('Caret position: ', selectionStart);
  });

  // out-of-range events are special events that usually don't occur. The only
  // situation they can occur is when ui.TextEditor is used on a text
  // rendered along a path (see Vectorizer#text(str, { textPath: '' }))).
  // In this case, if the user moves his cursor outside the visible
  // text area, out-of-range event is triggered so that the programmer
  // has chance to react (if he wants to because these situations
  // are handled seamlessly in ui.TextEditor by hiding the caret).
  ed.on('caret:out-of-range', function(selectionStart) {
    console.log('Caret out of range: ', selectionStart);
  });

  ed.on('select:out-of-range', function(selectionStart, selectionEnd) {
    console.log('Selection out of range: ', selectionStart, selectionEnd);
  });
}

/**
 * 工具bar操作事件定义
 */
var Toolbox = {
  enlargeHandler: function () {
    var currentScale = joint.V(paper.viewport).scale().sx;
    if (currentScale.toFixed(2) * 1 < 2) {
      currentScale += 0.1;
      paper.scale(currentScale);
    }
    this.fitToCenter();
  },
  reduceHandler: function () {
    var currentScale = joint.V(paper.viewport).scale().sx;
    if (currentScale.toFixed(2) * 1 > 0.2) {
      currentScale -= 0.1;
      paper.scale(currentScale);
    }
    this.fitToCenter();
  },
  practicalHandler: function () {
    paper.scale(1);
    this.fitToCenter();
  },
  adaptHandler: function () {
    stencil.checkToScaleContentToFit();
    this.fitToCenter();
  },
  fitToCenter: function () {
    var restrictedAreaBbox = joint.g.rect({
      x: paper.el.offsetLeft,
      y: paper.el.offsetTop,
      width: paper.options.width,
      height: paper.options.height
    });

    var rect = paper.viewport.getBoundingClientRect();
    //居中内容
    var viewPortCenterX = $(paper.viewport).offset().left + rect.width / 2;
    var viewPortCenterY = $(paper.viewport).offset().top + rect.height / 2;
    var restrictedCenter = restrictedAreaBbox.center();
    joint.V(paper.viewport).translate(restrictedCenter.x - viewPortCenterX, restrictedCenter.y - viewPortCenterY);
  }
};
