import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, unref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
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
  __name: "[word]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const wordParam = route.params.word;
    const { data: word, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/content/cantonese/words/${wordParam}.json`,
      {
        key: `word-${wordParam}`,
        server: false
      },
      "$kHEn9vj-O2"
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b;
      const _component_NuxtLink = __nuxt_component_0;
      if (unref(word)) {
        _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-2xl mx-auto px-4 py-12 space-y-10" }, _attrs))}><section class="text-center space-y-2"><div class="text-4xl font-medium">${ssrInterpolate(unref(word).word)}</div><div class="text-lg text-gray-400">${ssrInterpolate(unref(word).jyutping)}</div><div class="text-lg text-gray-600">${ssrInterpolate(unref(word).meaning)}</div></section>`);
        if ((_a = unref(word).usage) == null ? void 0 : _a.length) {
          _push(`<section><h2 class="text-lg font-semibold mb-3"> Usage </h2><ul class="list-disc pl-5 space-y-2 text-gray-700"><!--[-->`);
          ssrRenderList(unref(word).usage, (note) => {
            _push(`<li>${ssrInterpolate(note)}</li>`);
          });
          _push(`<!--]--></ul></section>`);
        } else {
          _push(`<!---->`);
        }
        if ((_b = unref(word).examples) == null ? void 0 : _b.length) {
          _push(`<section><h2 class="text-lg font-semibold mb-3"> Examples </h2><ul class="space-y-3"><!--[-->`);
          ssrRenderList(unref(word).examples, (ex) => {
            _push(`<li class="border-l-4 border-gray-200 pl-4">${ssrInterpolate(ex)}</li>`);
          });
          _push(`<!--]--></ul></section>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</main>`);
      } else if (unref(error)) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "max-w-xl mx-auto px-4 py-12 text-center space-y-4" }, _attrs))}><p class="text-red-600"> This word doesn\u2019t exist yet. </p>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/word/[word].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_word_-DCpimvWb.mjs.map
