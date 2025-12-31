import { defineComponent, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "RubyText",
  __ssrInlineRender: true,
  props: {
    text: {},
    ruby: {},
    textClass: { default: "text-lg" },
    rubyClass: { default: "text-sm text-gray-400" }
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "text-center" }, _attrs))}><div class="${ssrRenderClass(__props.rubyClass)}">${ssrInterpolate(__props.ruby)}</div><div class="${ssrRenderClass(__props.textClass)}">${ssrInterpolate(__props.text)}</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/RubyText.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as _ };
//# sourceMappingURL=RubyText-dq2og-Oc.mjs.map
