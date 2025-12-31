import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, mergeProps, unref, withCtx, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderComponent } from 'vue/server-renderer';
import { u as useFetch } from './fetch-DIHYfn93.mjs';
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
import '@vue/shared';
import 'perfect-debounce';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[level]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const levelParam = route.params.level;
    const { data: index, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/index/words/level/${levelParam}.json`,
      {
        key: "level-one-characters",
        server: false
      },
      "$euv5DIJlki"
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-4xl mx-auto px-4 py-12" }, _attrs))}>`);
      if (unref(index)) {
        _push(`<div class="mb-8"><h1 class="text-3xl font-semibold mb-2">${ssrInterpolate(unref(index).title)}</h1><p class="text-gray-600">${ssrInterpolate(unref(index).description)}</p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(index)) {
        _push(`<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"><!--[-->`);
        ssrRenderList(unref(index).words, (c) => {
          _push(ssrRenderComponent(_component_NuxtLink, {
            key: c.word,
            to: `/word/${c.word}`,
            class: "border rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`<div class="text-3xl mb-1"${_scopeId}>${ssrInterpolate(c.word)}</div><div class="text-sm text-gray-400"${_scopeId}>${ssrInterpolate(c.jyutping)}</div><div class="text-xs text-gray-500 mt-1 text-center"${_scopeId}>${ssrInterpolate(c.meaning)}</div>`);
              } else {
                return [
                  createVNode("div", { class: "text-3xl mb-1" }, toDisplayString(c.word), 1),
                  createVNode("div", { class: "text-sm text-gray-400" }, toDisplayString(c.jyutping), 1),
                  createVNode("div", { class: "text-xs text-gray-500 mt-1 text-center" }, toDisplayString(c.meaning), 1)
                ];
              }
            }),
            _: 2
          }, _parent));
        });
        _push(`<!--]--></div>`);
      } else if (unref(error)) {
        _push(`<div class="text-red-600"> This page isn\u2019t available yet. </div>`);
      } else {
        _push(`<div class="text-gray-500"> Loading\u2026 </div>`);
      }
      _push(`</main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/words/[level].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_level_-dngvB5i4.mjs.map
