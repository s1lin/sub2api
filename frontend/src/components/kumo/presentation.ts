import { Children, Fragment, createContext, createElement as el, isValidElement, useContext, useLayoutEffect, useRef, type ComponentType, type ReactElement, type ReactNode } from 'react'
import { Radio } from '@cloudflare/kumo/components/radio'
import { Select } from '@cloudflare/kumo/components/select'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Badge } from '@cloudflare/kumo/components/badge'
import { Table } from '@cloudflare/kumo/components/table'
import { Loader } from '@cloudflare/kumo/components/loader'
import { bridge, type ControlProps } from './bridge'
import { domProps, useDomEvents, reactClickEvents } from './controls'

function update(props: ControlProps, value: unknown) {
  const handlers = props['onUpdate:modelValue']
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) handler?.(value)
}

const RadioItems = createContext<Map<unknown, HTMLElement> | null>(null)

function RadioGroupControl(props: ControlProps) {
  const items = useRef(new Map<unknown, HTMLElement>())
  const container = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = container.current?.querySelector('[role="radiogroup"]')
    if (!node) return
    const forwarded = Object.entries(props).filter(([name]) => name === 'id' || name.startsWith('aria-') || name.startsWith('data-'))
    for (const [name, value] of forwarded) if (value != null) node.setAttribute(name, String(value))
    return () => { for (const [name] of forwarded) node.removeAttribute(name) }
  })
  return el('div', { ref: container, className: 'contents' }, el(RadioItems.Provider, { value: items.current }, el(Radio.Group as ComponentType<any>, {
    ...domProps(props), value: props.modelValue ?? null,
    onValueChange: (value: unknown) => {
      update(props, value)
      const element = items.current.get(value)
      if (element) {
        Object.assign(element, { checked: true, value })
        element.dispatchEvent(new Event('change'))
      }
    },
  }, props.children)))
}

function RadioControl(props: ControlProps) {
  const { element, setElement } = useDomEvents(props, true)
  const items = useContext(RadioItems)
  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    // Kumo Radio.Item exposes its control ref but intentionally accepts only a
    // small prop set. Preserve existing external labels and test attributes.
    const forwarded = Object.entries(props).filter(([name]) => name === 'id' || name.startsWith('aria-') || name.startsWith('data-'))
    for (const [name, value] of forwarded) {
      if (value != null) node.setAttribute(name, String(value))
    }
    return () => { for (const [name] of forwarded) node.removeAttribute(name) }
  })
  useLayoutEffect(() => {
    if (element.current) items?.set(props.value, element.current)
    return () => { items?.delete(props.value) }
  }, [items, props.value, element])
  const { modelValue: _modelValue, value, checked, ...rest } = domProps(props)
  const item = el('span', { className: 'contents', ...reactClickEvents(props) }, el(Radio.Item as ComponentType<any>, {
    ...rest, value, ref: setElement, label: props.label ?? props.children,
  }))
  if (items) return item
  return el(Radio.Group as ComponentType<any>, {
    className: 'contents', value: props.modelValue ?? (checked ? value : undefined), name: props.name,
    onValueChange: (next: unknown) => {
      update(props, next)
      element.current?.dispatchEvent(new Event('change', { bubbles: true }))
    },
  }, item)
}

type Option = { value: unknown; label: ReactNode; disabled?: boolean }
function optionsFromChildren(children: ReactNode, disabled = false): Option[] {
  const options: Option[] = []
  Children.forEach(children, child => {
    if (!isValidElement(child)) return
    const item = child as ReactElement<ControlProps>
    if (item.type === Fragment || item.type === 'optgroup') options.push(...optionsFromChildren(item.props.children, disabled || item.props.disabled))
    if (item.type === 'option') options.push({ value: item.props.value ?? item.props.children, label: item.props.children, disabled: disabled || item.props.disabled })
  })
  return options
}

function NativeSelectControl(props: ControlProps) {
  const { element, setElement } = useDomEvents(props)
  const options = optionsFromChildren(props.children)
  const { value, children: _children, multiple, ...trigger } = domProps(props)
  return el(Select as ComponentType<any>, {
    items: options,
    placeholder: options.find(option => option.value === '' || option.value == null)?.label,
    value: props.modelValue ?? value, multiple: multiple || undefined,
    disabled: props.disabled, name: props.name, required: props.required,
    className: props.className,
    render: el('button', { ...trigger, type: 'button', ref: setElement, value: String(props.modelValue ?? value ?? ''), 'data-platform-control': 'select' }),
    onValueChange: (next: unknown) => {
      const actual = props.modelModifiers?.number && typeof next === 'string' && !Number.isNaN(parseFloat(next)) ? parseFloat(next) : next
      update(props, actual)
      if (element.current) {
        Object.assign(element.current, { value: next, selectedOptions: (Array.isArray(next) ? next : [next]).map(value => ({ value })) })
        element.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    },
    children: options.map((option, index) => el(Select.Option, { key: index, value: option.value, disabled: option.disabled, children: option.label })),
  })
}

function present(name: string, component: ComponentType<any>, className?: string) {
  return bridge(name, props => {
    const { setElement } = useDomEvents(props)
    const forwarded = domProps(props)
    return el(component, { ...forwarded, className: [className, forwarded.className].filter(Boolean).join(' '), ref: setElement }, props.children)
  })
}

export const KumoRadio = bridge('KumoRadio', RadioControl)
export const KumoRadioGroup = bridge('KumoRadioGroup', RadioGroupControl)
export const KumoNativeSelect = bridge('KumoNativeSelect', NativeSelectControl)
export const KumoSurface = present('KumoSurface', LayerCard, 'platform-surface')
export const KumoBadge = present('KumoBadge', Badge, 'platform-badge')
export const KumoTable = present('KumoTable', Table, 'platform-table')
export const KumoLoader = present('KumoLoader', Loader)
export const KumoTableHeader = present('KumoTableHeader', Table.Header)
export const KumoTableHead = present('KumoTableHead', Table.Head)
export const KumoTableBody = present('KumoTableBody', Table.Body)
export const KumoTableRow = present('KumoTableRow', Table.Row)
export const KumoTableCell = present('KumoTableCell', Table.Cell)
export const KumoTableFooter = present('KumoTableFooter', Table.Footer)
