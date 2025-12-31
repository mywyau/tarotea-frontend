import { a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, mergeProps, withCtx, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrRenderComponent, ssrInterpolate } from 'vue/server-renderer';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'ipx';
import 'vue-router';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const topics = [
      {
        id: "numbers",
        title: "Numbers",
        description: "Counting, prices, quantities, and amounts."
      },
      {
        id: "particles",
        title: "Particles",
        description: "Sentence-final particles that shape tone and meaning."
      },
      {
        id: "measure-words",
        title: "Measure Words",
        description: "Classifiers used with numbers and objects."
      },
      {
        id: "colours",
        title: "Colours",
        description: "Learn colour words and usage"
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-3xl mx-auto py-12 px-4" }, _attrs))}><header class="space-y-2 mb-4"><h1 class="text-3xl font-semibold mb-4"> Topics </h1><p class="text-gray-600 mb-8"> Explore spoken Cantonese by theme. </p></header><ul class="space-y-4"><!--[-->`);
      ssrRenderList(topics, (topic) => {
        _push(`<li class="border rounded p-4 hover:bg-gray-50">`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/topics/${topic.id}`,
          class: "block"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<div class="text-lg font-medium"${_scopeId}>${ssrInterpolate(topic.title)}</div><div class="text-sm text-gray-600"${_scopeId}>${ssrInterpolate(topic.description)}</div>`);
            } else {
              return [
                createVNode("div", { class: "text-lg font-medium" }, toDisplayString(topic.title), 1),
                createVNode("div", { class: "text-sm text-gray-600" }, toDisplayString(topic.description), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
        _push(`</li>`);
      });
      _push(`<!--]--></ul></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/topics/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-C-1lAZhk.mjs.map
