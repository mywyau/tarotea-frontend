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
    const modules = [
      {
        slug: "daily",
        title: "Daily Spoken Cantonese",
        description: "Essential phrases and patterns used in everyday Cantonese conversation."
      },
      {
        slug: "introductions",
        title: "Introductions & Small Talk",
        description: "Greeting people, introducing yourself, and making simple small talk."
      },
      {
        slug: "questions",
        title: "Asking Questions",
        description: "Asking questions naturally using \u54A9\u3001\u908A\u3001\u9EDE\u3001\u5E7E\u591A and common patterns."
      },
      {
        slug: "time",
        title: "Time & Timing",
        description: "Talking about now, later, schedules, and making plans with others."
      },
      {
        slug: "money",
        title: "Money & Prices",
        description: "Talking about prices, money, quantities, and costs in daily life."
      },
      {
        slug: "food",
        title: "Eating & Ordering Food",
        description: "Ordering food, talking about meals, and deciding when to eat."
      },
      {
        slug: "weather",
        title: "Weather & Conditions",
        description: "Talking about the weather, temperature, and daily conditions."
      },
      {
        slug: "emotions",
        title: "Feelings & Reactions",
        description: "Expressing emotions, reactions, and how you feel in everyday situations."
      },
      {
        slug: "travel",
        title: "Getting Around",
        description: "Directions, transport, and moving around the city with confidence."
      },
      {
        slug: "opinions",
        title: "Opinions & Preferences",
        description: "Saying what you think, like, want, or don\u2019t like in natural Cantonese."
      },
      {
        slug: "problems",
        title: "Problems & Fixes",
        description: "Explaining problems, asking for help, and finding simple solutions."
      },
      {
        slug: "work",
        title: "Work & Daily Routine",
        description: "Talking about work, jobs, schedules, and everyday routines."
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "max-w-3xl mx-auto py-12 px-4" }, _attrs))}><h1 class="text-3xl font-semibold mb-4"> Modules </h1><p class="text-gray-600 mb-8"> Browse focused collections of spoken Cantonese patterns. Pick what\u2019s useful to you. </p><ul class="space-y-4"><!--[-->`);
      ssrRenderList(modules, (module) => {
        _push(`<li class="border rounded p-4 hover:bg-gray-50">`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/module/${module.slug}`,
          class: "block"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<div class="text-lg font-medium"${_scopeId}>${ssrInterpolate(module.title)}</div><div class="text-sm text-gray-600"${_scopeId}>${ssrInterpolate(module.description)}</div>`);
            } else {
              return [
                createVNode("div", { class: "text-lg font-medium" }, toDisplayString(module.title), 1),
                createVNode("div", { class: "text-sm text-gray-600" }, toDisplayString(module.description), 1)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/modules/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-pqr0rBHZ.mjs.map
