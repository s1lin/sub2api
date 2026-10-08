import { createRoot } from 'react-dom/client'
import { applyPureReactInVue, setVeauryOptions } from 'veaury'
import { camelize, defineComponent, getCurrentInstance, h, nextTick, onMounted, ref, normalizeClass, normalizeStyle, type Component, type ComponentPublicInstance, type DefineComponent } from 'vue'
import { Children, cloneElement, createElement, forwardRef, isValidElement, type ReactElement, type ReactNode, type ComponentType } from 'react'

// Bridge containers must not become extra flex/grid items or suppress the
// spacing classes on the actual controls.
const transparentWrapper = { style: { display: 'contents' } }
setVeauryOptions({
  react: { createRoot, componentWrapAttrs: transparentWrapper, slotWrapAttrs: transparentWrapper },
  vue: { componentWrapAttrs: transparentWrapper, slotWrapAttrs: transparentWrapper },
})

export type ControlProps = Record<string, any>
const booleanProps = new Set(['disabled', 'required', 'readonly', 'readOnly', 'multiple', 'autofocus', 'autoFocus', 'checked', 'indeterminate', 'compact', 'customLayout', 'closeOnClickOutside', 'closeOnEscape', 'showCloseButton', 'showValue', 'activateOnFocus', 'clearable', 'creatable', 'remote', 'loading'])

function normalizeContent(content: ReactNode): ReactNode {
  // Veaury spreads a keyed, text-only Vue fragment into an object (for example
  // <template v-if="currency"> {{ currency }}</template>). Restore its text
  // before React.Children inspects it, including fragments in child arrays.
  const repairTextFragment = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(repairTextFragment)
    if (value && typeof value === 'object' && !isValidElement(value)) {
      const entries = Object.entries(value)
      if (entries.some(([key]) => key === 'key') && entries.every(([key, text]) => key === 'key' || /^\d+$/.test(key) && typeof text === 'string')) {
        return entries.filter(([key]) => key !== 'key').map(([, text]) => text).join('')
      }
    }
    return value
  }
  content = repairTextFragment(content)
  return Children.map(content, child => {
    if (!isValidElement(child)) return child
    const node = child as ReactElement<ControlProps>
    const changes: ControlProps = {}
    if (typeof node.type === 'string') {
      for (const [key, value] of Object.entries(node.props)) {
        if (key.includes('-') && !/^(aria-|data-)/.test(key)) { changes[camelize(key)] = value; changes[key] = undefined }
      }
      // Veaury's pure slot conversion preserves Vue DOM props. React uses a
      // different API for v-html; the caller still owns sanitization as before.
      if (node.props.innerHTML != null) return cloneElement(node, { ...changes, innerHTML: undefined, dangerouslySetInnerHTML: { __html: node.props.innerHTML }, children: undefined })
      if (node.props.textContent != null) return cloneElement(node, { ...changes, textContent: undefined, children: node.props.textContent })
    }
    if (node.props.children != null && typeof node.props.children !== 'function') changes.children = normalizeContent(node.props.children)
    return Object.keys(changes).length ? cloneElement(node, changes) : node
  })
}

function normalizeProps(props: ControlProps): ControlProps {
  return {
    ...Object.fromEntries(Object.entries(props).map(([key, value]) => {
      const name = /^(aria-|data-)/.test(key) ? key : camelize(key)
      return [name, value === '' && booleanProps.has(name) ? true : value]
    })),
    className: normalizeClass(props.className ?? props.class),
    style: normalizeStyle([props.style]),
    nativeRef: props.nativeRef ?? props.ref,
    ...(props.children != null && typeof props.children !== 'function' ? { children: normalizeContent(props.children) } : {}),
  }
}

/** Keep Vue slots, DOM refs, attributes and native event contracts at the boundary. */
export function bridge(name: string, control: ComponentType<ControlProps>) {
  // Veaury forwards Vue refs to forwardRef components, but drops them for
  // ordinary functions. Preserve refs even when controls are nested in a pure
  // React slot, such as a dialog's OTP fields or a card's draggable link.
  const normalizedControl = forwardRef<HTMLElement, ControlProps>((props, ref) =>
    createElement(control, normalizeProps({ ...props, nativeRef: props.nativeRef ?? ref })))
  const ReactControl = applyPureReactInVue(normalizedControl)
  const component = defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      const instance = getCurrentInstance()
      const reactWrapper = ref<ComponentPublicInstance | null>(null)
      // Veaury suppresses its first slot update during mount. Reconcile once
      // after that window so synchronous onMounted results cannot be lost.
      onMounted(() => { void nextTick(() => reactWrapper.value?.$forceUpdate()) })
      let element: HTMLElement | null = null
      let pendingFocus: FocusOptions | true | null = null
      const nativeRef = (value: HTMLElement | null) => {
        element = value
        if (value && pendingFocus) { value.focus(pendingFocus === true ? undefined : pendingFocus); pendingFocus = null }
      }
      expose(new Proxy({}, {
        has(target, key) { return key in target || key === '$el' || key === 'element' || key === 'focus' || !!element && key in element },
        get(_target, key) {
          if (key in _target) return Reflect.get(_target, key)
          if (key === '$el' || key === 'element') return element
          if (key === 'focus') return (options?: FocusOptions) => { if (element) element.focus(options); else pendingFocus = options ?? true }
          const value = element?.[key as keyof HTMLElement]
          return typeof value === 'function' ? value.bind(element) : value
        },
      }))
      return () => {
        return h(ReactControl as Component, {
          ref: reactWrapper,
          ...Object.fromEntries(Object.entries(attrs).map(([key, value]) => [/^(aria-|data-)/.test(key) ? key : camelize(key), value])),
          ...(instance?.vnode.scopeId ? { [instance.vnode.scopeId]: '' } : {}),
          className: normalizeClass(attrs.class),
          style: normalizeStyle([attrs.style as any]),
          nativeRef,
        }, slots)
      }
    },
  })
  // Preserve Veaury's pure-component identity through the Vue ref facade. Its
  // slot converter then renders nested Kumo controls directly in React, without
  // inserting Vue container divs into table/label structures.
  return Object.assign(component, { originReactComponent: normalizedControl }) as unknown as DefineComponent<any>
}
