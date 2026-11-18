// This function is embedded into the upstream table module. Keep it independent of module scope.
export function observeBody(body: HTMLElement, setWidth: (width: number) => void) {
  const view = body.ownerDocument.defaultView;
  if (!view) return;
  const measure = () => {
    const style = view.getComputedStyle(body);
    const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const width = Math.max(0, Math.round(body.offsetWidth - body.clientWidth - borders));
    setWidth(width);
  };
  const observer = new view.ResizeObserver(measure);
  observer.observe(body);
  let content: Element | null = null;
  const bindContent = () => {
    const next = body.querySelector(':scope > table');
    if (content !== next) {
      if (content) observer.unobserve(content);
      if (next) observer.observe(next);
      content = next;
    }
    measure();
  };
  bindContent();
  const mutations = new view.MutationObserver(bindContent);
  mutations.observe(body, { childList: true });
  return () => {
    mutations.disconnect();
    observer.disconnect();
  };
}
