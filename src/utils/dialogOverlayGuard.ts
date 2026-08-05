/**
 * 修复 Dialog 的遮罩误关闭：
 * 弹窗内按下鼠标、拖到遮罩上松开时，click 的 target 是二者的最近公共祖先
 * （即 .t-dialog__position），会被 overlayAction 当成"点击遮罩"而关闭弹窗。
 * 语义对齐 tdesign-vue-next 的 useSameTarget：mousedown 与 mouseup 都落在遮罩
 * 本身才算一次有效点击。当前锁定版本（1.20.1）上游已自带该修复，此处作为版本
 * 漂移时的兜底，并与 Vue2 版 SamWafWeb 保持一致。
 * 关联 issue: https://github.com/samwafgo/SamWaf/issues/811
 */
const OVERLAY_SELECTOR = '.t-dialog__position, .t-dialog__position_fullscreen';

let mousedownTarget: EventTarget | null = null;
let mouseupTarget: EventTarget | null = null;

export function setupDialogOverlayGuard() {
  document.addEventListener(
    'mousedown',
    (e) => {
      mousedownTarget = e.target;
    },
    true,
  );
  document.addEventListener(
    'mouseup',
    (e) => {
      mouseupTarget = e.target;
    },
    true,
  );
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target as Element | null;
      if (!el || typeof el.matches !== 'function') return;
      if (!el.matches(OVERLAY_SELECTOR)) return;
      // 完整点击落在遮罩上 —— 放行，保持"点遮罩关闭"的默认行为
      if (mousedownTarget === el && mouseupTarget === el) return;
      // 起点或终点不在遮罩上（拖拽选中文字等）—— 这不是一次点击，拦掉
      e.stopPropagation();
    },
    true,
  );
}

export default setupDialogOverlayGuard;
