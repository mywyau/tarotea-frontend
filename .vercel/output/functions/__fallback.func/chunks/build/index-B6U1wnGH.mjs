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
    const levels = [
      {
        id: "level-one",
        title: "Level 1",
        description: "Core beginner sentence patterns and expressions."
      },
      {
        id: "level-two",
        title: "Level  2",
        description: "Everyday usage and common expansions for more natural conversations"
      },
      {
        id: "level-three",
        title: "Level  3",
        description: "More Opinions, situations, emotions, comparison, and abstract ideas"
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-3xl mx-auto py-12 px-4" }, _attrs))}><h1 class="text-3xl font-semibold mb-4"> Words </h1><p class="text-gray-600 mb-8"> Explore Cantonese words patterns organised by Level </p><ul class="space-y-4"><!--[-->`);
      ssrRenderList(levels, (level) => {
        _push(`<li class="border rounded p-4 hover:bg-gray-50">`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/words/${level.id}`,
          class: "block"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<div class="text-lg font-medium"${_scopeId}>${ssrInterpolate(level.title)}</div><div class="text-sm text-gray-600"${_scopeId}>${ssrInterpolate(level.description)}</div>`);
            } else {
              return [
                createVNode("div", { class: "text-lg font-medium" }, toDisplayString(level.title), 1),
                createVNode("div", { class: "text-sm text-gray-600" }, toDisplayString(level.description), 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/words/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-B6U1wnGH.mjs.map
