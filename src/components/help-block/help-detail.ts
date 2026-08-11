import { defineComponent, h, type PropType } from 'vue';

type HelpItem = { k: string; v: string; tone?: 'brand' | 'danger' };
type HelpDoc = { label: string; url: string };

/**
 * 详细说明的内容体。内联面板、抽屉、影子节点三处共用同一份结构，
 * 保证「量出来的高度」就是「真正会撑开的高度」。
 * 写成 render 函数是因为同一个 SFC 里塞不下第二个组件。
 */
export default defineComponent({
  name: 'HelpDetail',
  props: {
    detail: { type: String, default: '' },
    items: { type: Array as PropType<HelpItem[]>, default: () => [] },
    note: { type: String, default: '' },
    docs: { type: Array as PropType<HelpDoc[]>, default: () => [] },
    docsLabel: { type: String, default: '' },
  },
  setup(props) {
    return () => {
      const kids = [];

      if (props.items.length) {
        kids.push(
          h(
            'div',
            { class: 'hb-grid' },
            props.items.map((it) =>
              h('div', { class: 'hb-op' }, [
                h(
                  'span',
                  {
                    class: [
                      'hb-k',
                      it.tone === 'brand' ? 'is-brand' : '',
                      it.tone === 'danger' ? 'is-danger' : '',
                    ],
                  },
                  it.k,
                ),
                h('span', { class: 'hb-v' }, it.v),
              ]),
            ),
          ),
        );
      }

      if (props.detail) kids.push(h('div', { class: 'hb-body' }, props.detail));
      if (props.note) kids.push(h('div', { class: 'hb-note' }, props.note));

      if (props.docs.length) {
        kids.push(
          h('div', { class: 'hb-docs' }, [
            h('span', { class: 'hb-docs-label' }, props.docsLabel),
            ...props.docs.map((d) =>
              h('a', { class: 'hb-doclink', href: d.url, target: '_blank', rel: 'noopener noreferrer' }, d.label),
            ),
          ]),
        );
      }

      return h('div', { class: 'hb-detail' }, kids);
    };
  },
});
