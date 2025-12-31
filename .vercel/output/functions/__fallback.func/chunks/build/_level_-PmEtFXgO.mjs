import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
import { _ as _sfc_main$1 } from './RubyText-dq2og-Oc.mjs';
import { defineComponent, withAsyncContext, mergeProps, unref, withCtx, createVNode, toDisplayString, createTextVNode, useSSRContext } from 'vue';
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
    const level = route.params.level;
    const { data: index, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/index/level/${level}.json`,
      {
        key: `level-${level}`,
        server: false
      },
      "$NG-TuYmou-"
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      const _component_RubyText = _sfc_main$1;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-3xl mx-auto py-12 px-4" }, _attrs))}>`);
      if (unref(index)) {
        _push(`<div><h1 class="text-3xl font-semibold mb-2">${ssrInterpolate(unref(index).title)}</h1><p class="text-gray-600 mb-8">${ssrInterpolate(unref(index).description)}</p><ul class="space-y-4"><!--[-->`);
        ssrRenderList(unref(index).items, (item) => {
          _push(`<li class="border-b pb-3">`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            to: `/item/${item.id}`,
            class: "block hover:bg-gray-50 rounded p-2"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(ssrRenderComponent(_component_RubyText, {
                  text: item.sentence,
                  ruby: item.jyutping
                }, null, _parent2, _scopeId));
                _push2(`<div class="text-sm text-gray-500"${_scopeId}>${ssrInterpolate(item.english)}</div>`);
              } else {
                return [
                  createVNode(_component_RubyText, {
                    text: item.sentence,
                    ruby: item.jyutping
                  }, null, 8, ["text", "ruby"]),
                  createVNode("div", { class: "text-sm text-gray-500" }, toDisplayString(item.english), 1)
                ];
              }
            }),
            _: 2
          }, _parent));
          _push(`</li>`);
        });
        _push(`<!--]--></ul></div>`);
      } else if (unref(error)) {
        _push(`<div><p class="text-red-600"> This Level isn\u2019t available yet. </p>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/",
          class: "underline"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Go home `);
            } else {
              return [
                createTextVNode(" Go home ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<div><p class="text-gray-500">Loading\u2026</p></div>`);
      }
      _push(`</main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/levels/[level].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_level_-PmEtFXgO.mjs.map
