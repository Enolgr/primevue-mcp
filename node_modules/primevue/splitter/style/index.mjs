import { style } from '@primeuix/styles/splitter';
import BaseStyle from '@primevue/core/base/style';

var classes = {
  root: function root(_ref) {
    var props = _ref.props;
    return ['p-splitter p-component', 'p-splitter-' + props.layout];
  },
  gutter: 'p-splitter-gutter',
  gutterHandle: 'p-splitter-gutter-handle'
};
var SplitterStyle = BaseStyle.extend({
  name: 'splitter',
  style: style,
  classes: classes
});

export { SplitterStyle as default };
//# sourceMappingURL=index.mjs.map
