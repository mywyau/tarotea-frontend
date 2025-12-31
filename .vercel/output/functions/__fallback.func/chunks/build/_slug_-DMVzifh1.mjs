import { defineComponent, withAsyncContext, mergeProps, unref, withCtx, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderComponent } from 'vue/server-renderer';
import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "WordTile",
  __ssrInlineRender: true,
  props: {
    word: {},
    jyutping: {},
    meaning: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(ssrRenderComponent(_component_NuxtLink, mergeProps({
        to: `/word/${__props.word}`,
        class: "border rounded-lg p-4 hover:bg-gray-50 transition space-y-1"
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="text-xl text-center"${_scopeId}>${ssrInterpolate(__props.word)}</div><div class="text-sm text-gray-400 text-center"${_scopeId}>${ssrInterpolate(__props.jyutping)}</div><div class="text-xs text-gray-500 text-center"${_scopeId}>${ssrInterpolate(__props.meaning)}</div>`);
          } else {
            return [
              createVNode("div", { class: "text-xl text-center" }, toDisplayString(__props.word), 1),
              createVNode("div", { class: "text-sm text-gray-400 text-center" }, toDisplayString(__props.jyutping), 1),
              createVNode("div", { class: "text-xs text-gray-500 text-center" }, toDisplayString(__props.meaning), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/WordTile.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[slug]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const slug = route.params.slug;
    const { data: topic, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/index/topics/${slug}.json`,
      {
        key: `topic-${slug}`,
        server: false
      },
      "$Z94qjYcs3t"
    )), __temp = await __temp, __restore(), __temp);
    console.log(`/index/topics/${slug}.json`);
    return (_ctx, _push, _parent, _attrs) => {
      var _a;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-4xl mx-auto px-4 py-12 space-y-8" }, _attrs))}>`);
      if (unref(topic)) {
        _push(`<div><h1 class="text-3xl font-semibold">${ssrInterpolate(unref(topic).title)}</h1><p class="text-gray-600">${ssrInterpolate(unref(topic).description)}</p><!--[-->`);
        ssrRenderList(unref(topic).sections, (section) => {
          _push(`<section class="space-y-4"><h2 class="text-lg font-semibold mt-8">${ssrInterpolate(section.title)}</h2><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"><!--[-->`);
          ssrRenderList(section.items, (item) => {
            _push(ssrRenderComponent(_sfc_main$1, {
              key: item.word,
              word: item.word,
              jyutping: item.jyutping,
              meaning: item.meaning
            }, null, _parent));
          });
          _push(`<!--]--></div></section>`);
        });
        _push(`<!--]-->`);
        if ((_a = unref(topic).phrases) == null ? void 0 : _a.length) {
          _push(`<section><h2 class="text-lg font-semibold mt-8 mb-4"> Phrases </h2></section>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else if (unref(error)) {
        _push(`<div class="text-red-600"> Topic not found </div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/topics/[slug].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_slug_-DMVzifh1.mjs.map
