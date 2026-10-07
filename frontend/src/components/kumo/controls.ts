import { createElement as el, useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode, type ComponentType } from 'react'
import { Button, LinkButton } from '@cloudflare/kumo/components/button'
import { Input, Textarea } from '@cloudflare/kumo/components/input'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Label } from '@cloudflare/kumo/components/label'
import { bridge, type ControlProps } from './bridge'

const names: Record<string, string> = { tabindex: 'tabIndex', readonly: 'readOnly', autocomplete: 'autoComplete', autofocus: 'autoFocus', maxlength: 'maxLength', minlength: 'minLength', inputmode: 'inputMode', spellcheck: 'spellCheck', for: 'htmlFor', colspan: 'colSpan', rowspan: 'rowSpan' }
const internal = new Set(['class', 'modelValue', 'modelModifiers', 'nativeRef', 'ref', 'true-value', 'false-value', 'trueValue', 'falseValue', 'compact'])

export function domProps(props: ControlProps): ControlProps {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !internal.has(key) && !/^on[A-Z]/.test(key)).map(([key, value]) => [names[key] || key, value]))
}

/** Native listeners preserve Vue's change-on-commit, .stop/.self and capture semantics. */
export function useDomEvents(props: ControlProps, reactClick = false) {
  const element = useRef<HTMLElement | null>(null)
  const current = useRef(props)
  const once = useRef(new Set<string>())
  current.current = props
  const setElement = useCallback((node: HTMLElement | null) => {
    element.current = node
    current.current.nativeRef?.(node)
  }, [])
  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    const cleanups: (() => void)[] = []
    for (const [key, callback] of Object.entries(props)) {
      if (!/^on[A-Z]/.test(key) || key.includes(':') || typeof callback !== 'function' && !Array.isArray(callback)) continue
      const options = { capture: key.includes('Capture'), once: key.includes('Once'), passive: key.includes('Passive') }
      const eventName = key.slice(2).replace(/(Capture|Once|Passive)/g, '').toLowerCase()
      if (reactClick && eventName === 'click') continue
      const handler = (event: Event) => {
        if (options.once && once.current.has(key)) return
        if (options.once) once.current.add(key)
        const callbacks = current.current[key]
        for (const fn of Array.isArray(callbacks) ? callbacks : [callbacks]) fn?.(event)
      }
      node.addEventListener(eventName, handler, options)
      cleanups.push(() => node.removeEventListener(eventName, handler, options))
    }
    return () => cleanups.forEach(cleanup => cleanup())
  })
  return { element, setElement }
}

export function reactClickEvents(props: ControlProps) {
  const once = useRef(new Set<string>())
  const invoke = (capture: boolean, event: React.MouseEvent) => {
    for (const [key, handlers] of Object.entries(props)) {
      if (!/^onClick(?:Capture|Once|Passive)*$/.test(key) || key.includes('Capture') !== capture) continue
      if (key.includes('Once') && once.current.has(key)) continue
      if (key.includes('Once')) once.current.add(key)
      for (const handler of Array.isArray(handlers) ? handlers : [handlers]) handler?.(event)
    }
  }
  return { onClick: (event: React.MouseEvent) => invoke(false, event), onClickCapture: (event: React.MouseEvent) => invoke(true, event) }
}

function buttonVariant(props: ControlProps) {
  if (props.variant) return props.variant
  const css = props.className || ''
  if (/btn-danger/.test(css)) return 'destructive'
  if (/btn-primary|brand-button/.test(css)) return 'primary'
  if (/btn-secondary/.test(css)) return 'secondary'
  return 'ghost'
}

function ButtonControl(props: ControlProps) {
  const tooltipId = useId()
  const { setElement } = useDomEvents(props)
  // Kumo accepts ReactNode titles at runtime; its HTMLAttributes intersection
  // still narrows the published title type to string.
  return el((props.href ? LinkButton : Button) as ComponentType<any>, {
    ...domProps(props), ref: setElement, type: props.type || 'button', variant: buttonVariant(props),
    ...(props.title ? {
      title: el('span', { id: tooltipId, role: 'tooltip' }, props.title),
      'aria-label': props['aria-label'] ?? (typeof props.title === 'string' ? props.title : undefined),
      'aria-describedby': [props['aria-describedby'], tooltipId].filter(Boolean).join(' '),
    } : {}),
    ...{ 'data-platform-control': 'button', 'data-platform-variant': buttonVariant(props) },
  }, props.children)
}

export function updateModel(props: ControlProps, value: unknown) {
  const handler = props['onUpdate:modelValue']
  for (const fn of Array.isArray(handler) ? handler : [handler]) fn?.(value)
}

function inputModel(props: ControlProps, value: string) {
  let next: string | number = props.modelModifiers?.trim ? value.trim() : value
  if (props.modelModifiers?.number || props.type === 'number') {
    const number = parseFloat(String(next))
    if (!Number.isNaN(number)) next = number
  }
  updateModel(props, next)
}

function TextControl(props: ControlProps & { multiline?: boolean }) {
  const { element, setElement } = useDomEvents(props)
  const external = props.modelValue !== undefined ? props.modelValue : props.value
  const [value, setValue] = useState(external ?? '')
  const composing = useRef(false)
  useLayoutEffect(() => { setValue(external ?? '') }, [external])
  useLayoutEffect(() => {
    const node = element.current as HTMLInputElement | HTMLTextAreaElement | null
    if (!node) return
    const input = () => {
      setValue(node.value)
      if (!composing.current && !props.modelModifiers?.lazy && props.type !== 'file') inputModel(props, node.value)
    }
    const change = () => { if (props.modelModifiers?.lazy && props.type !== 'file') inputModel(props, node.value) }
    const start = () => { composing.current = true }
    const end = () => { composing.current = false; input() }
    // Vue commits v-model before user @input/@change handlers. Native capture
    // preserves that order before React's delegated event reaches its root.
    const listeners = { input, change, compositionstart: start, compositionend: end }
    for (const [type, listener] of Object.entries(listeners)) node.addEventListener(type, listener, true)
    // A Vue input handler may reject a value by restoring event.target.value.
    // Read back that accepted value after those listeners have run.
    const reflect = () => { setValue(node.value) }
    node.addEventListener('input', reflect)
    node.addEventListener('change', reflect)
    return () => {
      for (const [type, listener] of Object.entries(listeners)) node.removeEventListener(type, listener, true)
      node.removeEventListener('input', reflect)
      node.removeEventListener('change', reflect)
    }
  })
  const { multiline, ...rest } = domProps(props)
  return el((multiline ? Textarea : Input) as ComponentType<any>, {
    ...rest,
    ref: setElement,
    ...(props.type === 'file' ? {} : { value }),
    onChange: () => {},
    'data-platform-control': multiline ? 'textarea' : 'input',
  })
}

function checkboxValue(props: ControlProps): boolean {
  if (props.modelValue === undefined) return !!props.checked
  if (Array.isArray(props.modelValue)) return props.modelValue.some((value: unknown) => Object.is(value, props.value))
  if (props.modelValue instanceof Set) return props.modelValue.has(props.value)
  return Object.is(props.modelValue, props.trueValue ?? props['true-value'] ?? true)
}

function CheckboxControl(props: ControlProps) {
  const { element, setElement } = useDomEvents(props, true)
  const [checked, setChecked] = useState(checkboxValue(props))
  const external = checkboxValue(props)
  useLayoutEffect(() => { setChecked(external) }, [external])
  useLayoutEffect(() => {
    if (element.current) Object.assign(element.current, { checked, value: props.value ?? 'on' })
  }, [checked, props.value])
  return el(Checkbox, {
    ...domProps(props), ...reactClickEvents(props), ref: setElement, checked,
    onCheckedChange: (next: boolean, details) => {
      setChecked(next)
      const model = props.modelValue
      if (Array.isArray(model)) updateModel(props, next ? [...model, props.value] : model.filter(value => !Object.is(value, props.value)))
      else if (model instanceof Set) { const copy = new Set(model); if (next) copy.add(props.value); else copy.delete(props.value); updateModel(props, copy) }
      else updateModel(props, next ? props.trueValue ?? props['true-value'] ?? true : props.falseValue ?? props['false-value'] ?? false)
      if (element.current) {
        Object.assign(element.current, { checked: next, value: props.value ?? 'on' })
        element.current.dispatchEvent(new Event('change'))
        const accepted = (element.current as HTMLElement & { checked: boolean }).checked
        if (accepted !== next) { setChecked(accepted); details.cancel() }
      }
    },
    ...{ 'data-platform-control': 'checkbox' },
  })
}

function SwitchControl(props: ControlProps) {
  const { setElement } = useDomEvents(props, true)
  // Switch's custom render spreads user click handlers over Base UI's handler.
  // Listen on a transparent parent so activation runs before Vue modifiers.
  return el('span', { className: 'contents', ...reactClickEvents(props) }, el(Switch, {
    ...domProps(props), ref: setElement, checked: props.modelValue ?? props.checked,
    onCheckedChange: (value: boolean) => updateModel(props, value),
    ...{ 'data-platform-control': 'switch' },
  }))
}

function LabelControl(props: ControlProps) {
  const { element, setElement } = useDomEvents(props)
  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    const forwarded = Object.entries(props).filter(([name]) => ['id', 'title', 'role', 'tabindex', 'tabIndex'].includes(name) || name.startsWith('aria-') || name.startsWith('data-'))
    for (const [name, value] of forwarded) if (value != null) node.setAttribute(name, String(value))
    if (props.style) Object.assign(node.style, props.style)
    return () => { for (const [name] of forwarded) node.removeAttribute(name) }
  })
  // Kumo Label doesn't forward refs or arbitrary DOM attributes.
  return el('span', { className: 'contents', ref: (node: HTMLSpanElement | null) => setElement(node?.firstElementChild as HTMLElement | null) },
    el(Label as ComponentType<any>, domProps(props), props.children as ReactNode))
}

export const KumoButton = bridge('KumoButton', ButtonControl)
export const KumoInput = bridge('KumoInput', TextControl)
export const KumoTextarea = bridge('KumoTextarea', props => el(TextControl, { ...props, multiline: true }))
export const KumoCheckbox = bridge('KumoCheckbox', CheckboxControl)
export const KumoSwitch = bridge('KumoSwitch', SwitchControl)
export const KumoLabel = bridge('KumoLabel', LabelControl)
