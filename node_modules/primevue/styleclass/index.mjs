import { getTargetElement, isElement, addClass, removeClass, hasClass } from '@primeuix/utils/dom';
import BaseDirective from '@primevue/core/basedirective';
import StyleClassStyle from 'primevue/styleclass/style';

var BaseStyleClass = BaseDirective.extend({
  style: StyleClassStyle
});

var StyleClass = BaseStyleClass.extend('styleclass', {
  mounted: function mounted(el, binding) {
    el.setAttribute('data-pd-styleclass', true);
    this.bind(el, binding);
  },
  unmounted: function unmounted(el) {
    this.unbind(el);
  },
  methods: {
    bind: function bind(el, binding) {
      var _this = this;
      var target = getTargetElement(binding.value.selector, el);
      this.$el = target;
      el.$_pstyleclass_clicklistener = function () {
        if (binding.value.toggleClass) {
          if (hasClass(target, binding.value.toggleClass)) removeClass(target, binding.value.toggleClass);else addClass(target, binding.value.toggleClass);
        } else {
          if (target.offsetParent === null) _this.enter(target, el, binding);else _this.leave(target, binding);
        }
      };
      el.addEventListener('click', el.$_pstyleclass_clicklistener);
    },
    unbind: function unbind(el) {
      if (el.$_pstyleclass_clicklistener) {
        el.removeEventListener('click', el.$_pstyleclass_clicklistener);
        el.$_pstyleclass_clicklistener = null;
      }
      this.unbindResizeListener(el);
      this.unbindDocumentListener(el);
    },
    enter: function enter(target, el, binding) {
      if (binding.value.enterActiveClass) {
        if (!target.$_pstyleclass_animating) {
          target.$_pstyleclass_animating = true;
          if (binding.value.enterActiveClass.includes('slidedown')) {
            target.style.height = '0px';
            removeClass(target, binding.value.hiddenClass || binding.value.enterFromClass);
            target.style.maxHeight = target.scrollHeight + 'px';
            addClass(target, binding.value.hiddenClass || binding.value.enterActiveClass);
            target.style.height = '';
          }
          addClass(target, binding.value.enterActiveClass);
          if (binding.value.enterFromClass) {
            removeClass(target, binding.value.enterFromClass);
          }
          target.$p_styleclass_enterlistener = function () {
            removeClass(target, binding.value.enterActiveClass);
            if (binding.value.enterToClass) {
              addClass(target, binding.value.enterToClass);
            }
            target.removeEventListener('animationend', target.$p_styleclass_enterlistener);
            if (binding.value.enterActiveClass.includes('slidedown')) {
              target.style.maxHeight = '';
            }
            target.$_pstyleclass_animating = false;
          };
          target.addEventListener('animationend', target.$p_styleclass_enterlistener);
        }
      } else {
        if (binding.value.enterFromClass) {
          removeClass(target, binding.value.enterFromClass);
        }
        if (binding.value.enterToClass) {
          addClass(target, binding.value.enterToClass);
        }
      }
      if (binding.value.hideOnOutsideClick) {
        this.bindDocumentListener(target, el, binding);
      }
      if (binding.value.hideOnResize) {
        this.bindResizeListener(target, el, binding);
      }
    },
    leave: function leave(target, binding) {
      if (binding.value.leaveActiveClass) {
        if (!target.$_pstyleclass_animating) {
          target.$_pstyleclass_animating = true;
          addClass(target, binding.value.leaveActiveClass);
          if (binding.value.leaveFromClass) {
            removeClass(target, binding.value.leaveFromClass);
          }
          target.$p_styleclass_leavelistener = function () {
            removeClass(target, binding.value.leaveActiveClass);
            if (binding.value.leaveToClass) {
              addClass(target, binding.value.leaveToClass);
            }
            target.removeEventListener('animationend', target.$p_styleclass_leavelistener);
            target.$_pstyleclass_animating = false;
          };
          target.addEventListener('animationend', target.$p_styleclass_leavelistener);
        }
      } else {
        if (binding.value.leaveFromClass) {
          removeClass(target, binding.value.leaveFromClass);
        }
        if (binding.value.leaveToClass) {
          addClass(target, binding.value.leaveToClass);
        }
      }
      if (binding.value.hideOnOutsideClick) {
        this.unbindDocumentListener(target);
      }
      if (binding.value.hideOnResize) {
        this.unbindResizeListener(target);
      }
    },
    bindDocumentListener: function bindDocumentListener(target, el, binding) {
      var _this2 = this;
      if (!target.$p_styleclass_documentlistener) {
        target.$p_styleclass_documentlistener = function (event) {
          if (!_this2.isVisible(target) || getComputedStyle(target).getPropertyValue('position') === 'static') {
            _this2.unbindDocumentListener(target);
          } else if (_this2.isOutsideClick(event, target, el)) {
            _this2.leave(target, binding);
          }
        };
        target.ownerDocument.addEventListener('click', target.$p_styleclass_documentlistener);
      }
    },
    unbindDocumentListener: function unbindDocumentListener(target) {
      if (target.$p_styleclass_documentlistener) {
        target.ownerDocument.removeEventListener('click', target.$p_styleclass_documentlistener);
        target.$p_styleclass_documentlistener = null;
      }
    },
    bindResizeListener: function bindResizeListener(target, el, binding) {
      var _binding$value$resize;
      target.$p_styleclass_resizeselector = getTargetElement((_binding$value$resize = binding.value.resizeSelector) !== null && _binding$value$resize !== void 0 ? _binding$value$resize : 'window');
      if (isElement(target.$p_styleclass_resizeselector)) {
        this.bindElementResizeListener(target, binding);
      } else {
        this.bindWindowResizeListener(target, binding);
      }
    },
    unbindResizeListener: function unbindResizeListener(target) {
      this.unbindWindowResizeListener(target);
      this.unbindElementResizeListener(target);
    },
    bindWindowResizeListener: function bindWindowResizeListener(target, binding) {
      var _this3 = this;
      if (!target.$p_styleclass_windowresizelistener) {
        target.$p_styleclass_windowresizelistener = function () {
          if (!_this3.isVisible(target)) {
            _this3.unbindWindowResizeListener(target);
          } else {
            _this3.leave(target, binding);
          }
        };
        target.ownerDocument.defaultView.addEventListener('resize', target.$p_styleclass_windowresizelistener);
      }
    },
    unbindWindowResizeListener: function unbindWindowResizeListener(target) {
      if (target.$p_styleclass_windowresizelistener) {
        target.ownerDocument.defaultView.removeEventListener('resize', target.$p_styleclass_windowresizelistener);
        target.$p_styleclass_windowresizelistener = null;
      }
    },
    bindElementResizeListener: function bindElementResizeListener(target, binding) {
      var _this4 = this;
      if (!target.$p_styleclass_resizeobserver && target.$p_styleclass_resizeselector) {
        var isFirstResize = true;
        target.$p_styleclass_resizeobserver = new ResizeObserver(function () {
          if (isFirstResize) {
            isFirstResize = false;
            return;
          }
          if (_this4.isVisible(target)) {
            _this4.leave(target, binding);
          }
        });
        target.$p_styleclass_resizeobserver.observe(target.$p_styleclass_resizeselector);
      }
    },
    unbindElementResizeListener: function unbindElementResizeListener(target) {
      if (target.$p_styleclass_resizeobserver) {
        target.$p_styleclass_resizeobserver.disconnect();
        target.$p_styleclass_resizeobserver = null;
      }
    },
    isVisible: function isVisible(target) {
      return target.offsetParent !== null;
    },
    isOutsideClick: function isOutsideClick(event, target, el) {
      return !el.isSameNode(event.target) && !el.contains(event.target) && !target.contains(event.target);
    }
  }
});

export { StyleClass as default };
//# sourceMappingURL=index.mjs.map
