import { style } from '@primeuix/styles/selectbutton';
import BaseStyle from '@primevue/core/base/style';

var classes = {
  root: function root(_ref) {
    var props = _ref.props,
      instance = _ref.instance;
    return ['p-selectbutton p-component', {
      'p-invalid': instance.$invalid,
      // @todo: check
      'p-selectbutton-fluid': props.fluid
    }];
  }
};
var SelectButtonStyle = BaseStyle.extend({
  name: 'selectbutton',
  style: style,
  classes: classes
});

export { SelectButtonStyle as default };
//# sourceMappingURL=index.mjs.map
