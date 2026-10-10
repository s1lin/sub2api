import { createElement as el, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { DatePicker, type DateRange } from '@cloudflare/kumo/components/date-picker'
import { Popover } from '@cloudflare/kumo/components/popover'
import { Button } from '@cloudflare/kumo/components/button'
import { Empty } from '@cloudflare/kumo/components/empty'
import { SkeletonLine } from '@cloudflare/kumo/components/loader'
import { Toasty, createKumoToastManager } from '@cloudflare/kumo/components/toast'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Select } from '@cloudflare/kumo/components/select'
import { zhCN, enUS } from 'react-day-picker/locale'
import { bridge, type ControlProps } from './bridge'
import { domProps, updateModel } from './controls'

function PopoverControl(props: ControlProps) {
  return el(Popover, { open: props.modelValue, onOpenChange: (open: boolean) => updateModel(props, open) },
    el(Popover.Trigger, { render: el(Button, { variant: props.variant ?? 'secondary', className: props.triggerClass, 'aria-label': props.label }) }, props.trigger?.()),
    el(Popover.Content, { className: props.className, side: props.side ?? 'bottom', align: props.align ?? 'start' }, props.children))
}

function DatePickerControl(props: ControlProps) {
  const parse = (value: string | undefined) => {
    if (!value) return undefined
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const format = (date: Date | undefined) => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
  const [month, setMonth] = useState(() => parse(props.startDate))
  useEffect(() => {
    const start = parse(props.startDate)
    if (start) setMonth(start)
  }, [props.startDate])
  return el(DatePicker, {
    mode: 'range', animate: false, selected: { from: parse(props.startDate), to: parse(props.endDate) },
    locale: props.locale === 'zh' ? zhCN : enUS,
    month, onMonthChange: setMonth, disabled: props.max ? { after: parse(props.max)! } : undefined,
    onChange: (range: DateRange | undefined, day: Date) => {
      // A complete range is replaced with two fresh clicks, rather than keeping
      // its old start date when the user begins a different selection.
      props.onRangeChange?.(props.startDate && props.endDate
        ? { start: format(day), end: '' }
        : { start: format(range?.from), end: format(range?.to) })
    },
    className: props.className,
  })
}

function ToastsControl(props: ControlProps) {
  const [manager] = useState(() => createKumoToastManager())
  const known = useRef(new Map<string, string>())
  const current = useRef(props)
  current.current = props
  useEffect(() => {
    const active = new Set<string>()
    for (const toast of props.toasts ?? []) {
      active.add(toast.id)
      if (known.current.has(toast.id)) continue
      const id = manager.add({
        title: toast.title ?? toast.message,
        description: toast.title ? toast.message : undefined,
        variant: toast.type, timeout: 0,
        onClose: () => current.current.onDismiss?.(toast.id),
      })
      known.current.set(toast.id, id)
    }
    for (const [external, id] of known.current) {
      if (!active.has(external)) { known.current.delete(external); manager.close(id) }
    }
  }, [manager, props.toasts])
  return el(Toasty, { toastManager: manager, children: null })
}

export const KumoPopover = bridge('KumoPopover', PopoverControl)
export const KumoDatePicker = bridge('KumoDatePicker', DatePickerControl)
export const KumoToasts = bridge('KumoToasts', ToastsControl)
export const KumoEmpty = bridge('KumoEmpty', props => el(Empty, {
  title: props.title, description: props.description, size: props.size,
  className: props.className, icon: props.icon?.(), contents: props.children,
}))
export const KumoSkeleton = bridge('KumoSkeleton', props => el('div', {
  className: props.className, style: props.style, 'aria-hidden': true,
}, el(SkeletonLine, { className: 'w-full', minWidth: 100, maxWidth: 100, blockHeight: '100%' })))
export const KumoTabs = bridge('KumoTabs', props => {
  const container = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const list = container.current?.querySelector('[role="tablist"]')
    if (!list) return
    for (const name of ['aria-label', 'aria-labelledby']) {
      if (props[name] != null) list.setAttribute(name, props[name])
      else list.removeAttribute(name)
    }
  })
  return el('div', { className: 'contents', ref: container }, el(Tabs as ComponentType<any>, {
  ...domProps(props), className: `platform-tabs ${props.className ?? ''}`, value: String(props.modelValue ?? props.value ?? ''),
  tabs: props.tabs?.map((tab: ControlProps) => ({ ...tab, value: String(tab.value), label: props.tab?.({ tab }) ?? tab.label, render: el('button', { id: tab.id, disabled: tab.disabled, 'data-test': tab.dataTest, 'aria-controls': tab.controls }) })),
  onValueChange: (value: string) => {
    const actual = props.tabs?.find((tab: ControlProps) => String(tab.value) === value)?.value ?? value
    updateModel(props, actual)
    props.onChange?.(actual)
  },
  }))
})

export const KumoMultiSelect = bridge('KumoMultiSelect', props => {
  const options: ControlProps[] = props.options ?? []
  let all = '__kumo_all__'
  while (options.some(option => option.value === all)) all += '_'
  const value = props.modelValue?.length ? props.modelValue : [all]
  return el(Select as ComponentType<any>, {
    multiple: true, value, className: props.className, size: props.compact ? 'sm' : 'base',
    render: el('button', { type: 'button', 'aria-label': props.label }), renderValue: () => props.summary,
    onValueChange: (next: string[]) => updateModel(props, next.includes(all) && !value.includes(all) ? [] : next.filter(item => item !== all)),
    children: [
      el(Select.Option, { value: all, key: all, children: props.allLabel }),
      ...options.map(option => el(Select.Option, {
        value: option.value, key: option.value,
        children: props.option?.({ option }) ?? option.label,
      })),
      !options.length && el('div', { key: 'empty', className: 'p-3 text-sm', role: 'status' }, props.emptyLabel),
    ],
  })
})
