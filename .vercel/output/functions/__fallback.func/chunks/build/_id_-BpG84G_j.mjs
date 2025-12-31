import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, unref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent, ssrRenderList } from 'vue/server-renderer';
import { _ as _sfc_main$1 } from './RubyText-dq2og-Oc.mjs';
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
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const id = route.params.id;
    const { data: item, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/content/cantonese/${id}.json`,
      {
        key: `item-${id}`,
        server: false
      },
      "$3srgMVPQbg"
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      var _a;
      const _component_NuxtLink = __nuxt_component_0;
      if (unref(item)) {
        _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-2xl mx-auto px-4 py-12 space-y-10" }, _attrs))}><section class="text-center space-y-2"><h1 class="text-gray-500 text-lg py-2">${ssrInterpolate(unref(item).english)}</h1>`);
        _push(ssrRenderComponent(_sfc_main$1, {
          text: unref(item).sentence,
          ruby: unref(item).jyutping,
          textClass: "text-3xl leading-loose",
          rubyClass: "text-base text-gray-400 tracking-wide"
        }, null, _parent));
        _push(`</section><section><h2 class="text-lg font-semibold mb-3"> Usage </h2><ul class="list-disc pl-5 space-y-2 text-gray-700"><!--[-->`);
        ssrRenderList(unref(item).usage, (note) => {
          _push(`<li>${ssrInterpolate(note)}</li>`);
        });
        _push(`<!--]--></ul></section>`);
        if ((_a = unref(item).alternatives) == null ? void 0 : _a.length) {
          _push(`<section class="border-t pt-6"><h2 class="text-lg font-semibold mb-3"> Alternatives </h2><ul class="space-y-3"><!--[-->`);
          ssrRenderList(unref(item).alternatives, (alt) => {
            _push(`<li class="text-gray-700">`);
            _push(ssrRenderComponent(_sfc_main$1, {
              text: alt.sentence,
              ruby: alt.jyutping,
              textClass: "text-3xl leading-loose"
            }, null, _parent));
            _push(`<div class="text-sm text-gray-500">${ssrInterpolate(alt.note)}</div></li>`);
          });
          _push(`<!--]--></ul></section>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</main>`);
      } else if (unref(error)) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "max-w-xl mx-auto px-4 py-12 text-center space-y-4" }, _attrs))}><p class="text-red-600"> This item doesn\u2019t exist yet. </p>`);
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
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "max-w-xl mx-auto px-4 py-12 text-center text-gray-500" }, _attrs))}> Loading\u2026 </div>`);
      }
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/item/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-BpG84G_j.mjs.map
