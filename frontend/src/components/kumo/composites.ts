import { createElement as el, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Button } from '@cloudflare/kumo/components/button'
import { Combobox } from '@cloudflare/kumo/components/combobox'
import { Select } from '@cloudflare/kumo/components/select'
import { Pagination } from '@cloudflare/kumo/components/pagination'
import { Tooltip } from '@cloudflare/kumo/components/tooltip'
import { Popover } from '@cloudflare/kumo/components/popover'
import { XIcon, InfoIcon } from '@phosphor-icons/react'
import { bridge, type ControlProps } from './bridge'
import { updateModel } from './controls'

function DialogControl(props: ControlProps) {
  const titleId = useId()
  // A portal container gives the backdrop and panel the same stacking context,
  // including nested dialogs. Base UI manages focus trapping and scroll locks.
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const node = document.createElement('div')
    node.className = 'kumo-dialog-portal'
    document.body.appendChild(node)
    setContainer(node)
    return () => { node.remove() }
  }, [])
  useLayoutEffect(() => { if (container) container.style.zIndex = String(props.zIndex ?? 50) }, [container, props.zIndex])
  const widths: Record<string, string> = { narrow: '28rem', normal: '32rem', wide: '56rem', 'extra-wide': '72rem', full: '80rem' }
  if (!container) return null
  return el(Dialog.Root, {
    open: props.show,
    onOpenChange: (open, details) => {
      if (open) return
      if (details.reason === 'escape-key' && props.closeOnEscape === false || details.reason === 'outside-press' && !props.closeOnClickOutside) {
        details.cancel()
        return
      }
      props.onClose?.()
    },
  }, el(Dialog, {
    container, className: `platform-dialog ${props.customLayout ? 'platform-dialog-custom' : ''} ${props.drawer ? 'platform-sidebar-dialog' : ''}`,
    style: { width: props.drawer ? 'min(16rem, calc(100vw - 3rem))' : `min(${widths[props.width] ?? widths.normal}, calc(100vw - 2rem))` },
    children: props.customLayout ? [el(Dialog.Title, { id: titleId, className: 'sr-only', key: 'title' }, props.title), props.children] : [
      el('div', { className: 'modal-header', key: 'header' },
        el(Dialog.Title, { id: titleId, className: 'modal-title' }, props.title),
        props.showCloseButton !== false && el(Button, { variant: 'ghost', shape: 'square', icon: XIcon, 'aria-label': props.closeLabel, onClick: () => props.onClose?.() })),
      el('div', { className: 'modal-body', key: 'body' }, props.children),
      props.footer && el('div', { className: 'modal-footer', key: 'footer' }, props.footer()),
    ],
  }))
}

function SelectControl(props: ControlProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const highlighted = useRef<{ value: unknown; reason: string }>({ value: null, reason: 'none' })
  const current = useRef(props)
  current.current = props
  const options: ControlProps[] = props.options ?? []
  const valueOf = (option: any) => typeof option === 'object' && option !== null ? option[props.valueKey ?? 'value'] : option
  const labelOf = (option: any) => String(typeof option === 'object' && option !== null ? option[props.labelKey ?? 'label'] ?? '' : option ?? '')
  const selected = options.find(option => Object.is(valueOf(option), props.modelValue)) ?? null
  const selectedLabel = selected ? labelOf(selected) : props.creatable && props.modelValue != null ? String(props.modelValue) : props.placeholder
  const searchable = props.remote || props.searchable === true || props.searchable === 'auto' && options.length > 5
  useEffect(() => {
    if (!props.remote || !open) return
    const timer = setTimeout(() => current.current.onSearch?.(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query, open, props.remote])
  const change = (value: unknown) => {
    updateModel(props, value)
    const option = filtered.find(item => Object.is(valueOf(item), value)) ?? null
    props.onChange?.(value, option)
  }
  const changeOpen = (next: boolean) => { setOpen(next); if (!next) setQuery('') }
  let filtered = searchable && query && !props.remote
    ? options.filter(option => labelOf(option).toLowerCase().includes(query.toLowerCase()) || String(option.description ?? '').toLowerCase().includes(query.toLowerCase()))
    : options
  if (props.creatable && query.trim() && !props.remote) {
    filtered = [{ [props.valueKey ?? 'value']: query.trim(), [props.labelKey ?? 'label']: `${props.creatablePrefix} "${query.trim()}"`, _creatable: true }, ...filtered]
  }
  const selectedContent = props.selected?.({ option: selected }) ?? selectedLabel
  const optionContent = (option: ControlProps) => props.option?.({ option, selected: Object.is(valueOf(option), props.modelValue) }) ?? labelOf(option)
  const triggerProps = {
    id: props.id, 'aria-label': props.ariaLabel ?? props.placeholder,
    'aria-describedby': props.ariaDescribedby, 'aria-invalid': props.error || undefined,
    className: 'select-trigger w-full justify-between', ref: props.nativeRef,
    // Lets an unselected Select match the Combobox placeholder colour.
    'data-placeholder': selected == null && selectedLabel === props.placeholder ? '' : undefined,
  }
  const clear = props.clearable && props.modelValue != null && props.modelValue !== '' && !props.disabled
    ? el(Button, { type: 'button', variant: 'ghost', shape: 'square', size: 'sm', icon: XIcon, className: 'kumo-select-clear', 'aria-label': props.clearLabel, onClick: () => { updateModel(props, null); props.onChange?.(null, null) } }) : null
  let control: ReactNode
  if (!searchable) {
    control = el(Select as ComponentType<any>, {
      value: props.modelValue ?? null, onValueChange: change, open, onOpenChange: changeOpen,
      disabled: props.disabled, placeholder: selectedLabel, 'aria-label': props.ariaLabel ?? props.placeholder,
      render: el('button', { ...triggerProps, type: 'button' }),
      renderValue: () => selectedContent,
      children: filtered.map((option, index) => option.kind === 'group'
        ? el('div', { key: index, role: 'presentation', className: 'kumo-option-group' }, optionContent(option))
        : el(Select.Option, { key: index, value: valueOf(option), disabled: option.disabled, children: optionContent(option) })),
    })
  } else {
    control = el(Combobox as ComponentType<any>, {
      value: props.modelValue ?? null, onValueChange: change, open, onOpenChange: changeOpen,
      inputValue: query, onInputValueChange: setQuery, disabled: props.disabled,
      items: filtered.filter(option => option.kind !== 'group').map(valueOf), filter: null, autoHighlight: 'always',
      onItemHighlighted: (value: unknown, details: { reason: string }) => { highlighted.current = { value, reason: details.reason } },
      itemToStringLabel: (value: unknown) => labelOf(options.find(option => Object.is(valueOf(option), value)) ?? value),
    },
    el(Combobox.TriggerValue, { render: el('button', { ...triggerProps, type: 'button' }), children: () => selectedContent }),
    el(Combobox.Content, { className: 'platform-select-popup', sideOffset: 6, collisionPadding: 8 },
      el(Combobox.Input, { placeholder: props.searchPlaceholder, 'aria-label': props.searchPlaceholder, className: 'select-search-input', autoFocus: true,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
          const enabled = filtered.filter(option => option.kind !== 'group' && !option.disabled)
          const staleHighlight = highlighted.current.reason === 'none' && !enabled.some(option => Object.is(valueOf(option), highlighted.current.value))
          if (!enabled.length || staleHighlight) {
            event.preventDefault()
            event.stopPropagation()
            ;(event as React.KeyboardEvent & { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.()
            if (enabled.length) { change(valueOf(enabled[0])); changeOpen(false) }
          }
        },
      }),
      el(Combobox.List, {}, filtered.map((option, index) => option.kind === 'group'
        ? el('div', { key: index, role: 'presentation', className: 'kumo-option-group' }, optionContent(option))
        : el(Combobox.Item, { key: index, value: valueOf(option), disabled: option.disabled }, optionContent(option))),
      filtered.length === 0 && el('div', { role: 'status', className: 'p-3 text-sm' }, props.loading ? props.loadingLabel : props.emptyText))))
  }
  return el('div', { className: `kumo-select ${clear ? 'kumo-select-clearable' : ''} ${props.className ?? ''}`, 'data-platform-control': 'select' }, control, clear)
}

/** Search field for remote results, preserving the query separately from selection. */
function SearchSelectControl(props: ControlProps) {
  const [open, setOpen] = useState(false)
  const options: ControlProps[] = props.options ?? []
  const key = props.valueKey ?? 'id'
  const label = props.labelKey ?? 'label'
  const optionFor = (value: unknown) => options.find(option => Object.is(option[key], value))
  return el(Combobox as ComponentType<any>, {
    items: options.map(option => option[key]), filter: null, autoHighlight: 'always',
    value: null, inputValue: props.modelValue ?? '', open: props.open ?? open,
    onOpenChange: (value: boolean) => {
      setOpen(value)
      props['onUpdate:open']?.(value)
    },
    onInputValueChange: (value: string, details: { reason: string }) => {
      // The selection callback owns the committed label (or clears the query
      // when adding a chip). Ignore Combobox's automatic cleanup on close.
      if (details.reason !== 'input-change') return
      updateModel(props, value)
      props.onSearch?.(value)
    },
    onValueChange: (value: unknown) => {
      const option = optionFor(value)
      if (option) props.onSelect?.(option)
    },
    itemToStringLabel: (value: unknown) => String(optionFor(value)?.[label] ?? ''),
  },
  el(Combobox.Input, {
    ...Object.fromEntries(Object.entries(props).filter(([name]) => name.startsWith('data-') || name.startsWith('aria-'))),
    id: props.id, ref: props.nativeRef, type: 'text', placeholder: props.placeholder,
    'aria-label': props['aria-label'] ?? props.placeholder, 'aria-describedby': props['aria-describedby'],
    className: props.className, disabled: props.disabled, autoComplete: 'off',
    onFocus: props.onFocus,
  }),
  el(Combobox.Content, { className: 'platform-select-popup', sideOffset: 4 },
    el(Combobox.List, {}, options.map(option => el(Combobox.Item, {
      key: option[key], value: option[key], disabled: props.isOptionDisabled?.(option) ?? option.disabled,
    }, props.option?.({ option }) ?? String(option[label] ?? ''))),
    !options.length && el('div', { role: 'status', className: 'p-3 text-sm' }, props.loading ? props.loadingLabel : props.emptyText))))
}

function PaginationControl(props: ControlProps) {
  return el(Pagination as ComponentType<any>, {
    page: props.page, perPage: props.pageSize, totalCount: props.total,
    setPage: (page: number) => props.onPage?.(page), labels: props.labels,
    className: 'platform-pagination',
  },
  el(Pagination.Info, { className: 'platform-pagination-info', children: () => props.info }),
  props.showPageSizeSelector && el(Pagination.PageSize, { value: props.pageSize, options: props.pageSizeOptions, label: props.perPageLabel, onChange: (size: number) => props.onPageSize?.(size), className: 'platform-pagination-size' }),
  el(Pagination.Controls, { controls: 'full', pageSelector: 'input' }))
}

function HelpControl(props: ControlProps) {
  const tooltipId = useId()
  const trigger = props.triggerContent?.() ?? el(InfoIcon, { size: 16 })
  const content = props.children ?? props.content
  const triggerProps = {
    ...Object.fromEntries(Object.entries(props).filter(([name]) => name === 'id' || name.startsWith('data-') || name.startsWith('aria-'))),
    className: props.className, ref: props.nativeRef, variant: 'ghost' as const, shape: 'square' as const, size: 'sm' as const, 'aria-label': props.label,
  }
  const render = el(Button, triggerProps)
  if (props.trigger === 'click') return el(Popover, {},
    el(Popover.Trigger, { render }, trigger),
    el(Popover.Content, { className: `platform-help ${props.widthClass ?? ''}`, side: 'top' }, content,
      el(Popover.Close, { render: el(Button, { variant: 'ghost', size: 'sm', shape: 'square', icon: XIcon, 'aria-label': props.closeLabel }) })))
  return el(Tooltip, {
    content: el('div', { id: tooltipId, role: 'tooltip', className: `platform-help ${props.widthClass ?? ''}` }, content),
    render: el(Button, { ...triggerProps, 'aria-describedby': tooltipId }),
    delay: 150, closeDelay: 120,
  }, trigger)
}

export const KumoDialog = bridge('KumoDialog', DialogControl)
export const KumoSelect = bridge('KumoSelect', SelectControl)
export const KumoSearchSelect = bridge('KumoSearchSelect', SearchSelectControl)
export const KumoPagination = bridge('KumoPagination', PaginationControl)
export const KumoHelp = bridge('KumoHelp', HelpControl)
export const KumoTooltip = bridge('KumoTooltip', props => {
  const tooltipId = useId()
  const triggerProps = {
    ...Object.fromEntries(Object.entries(props).filter(([name]) => name === 'id' || name === 'role' || name.startsWith('data-') || name.startsWith('aria-'))),
    className: props.triggerClass, 'aria-label': props.label, 'aria-describedby': tooltipId,
  }
  return el(Tooltip, {
    content: el('div', { id: tooltipId, role: 'tooltip', className: props.className }, props.children),
    delay: 150, closeDelay: 120, disabled: props.disabled, side: props.side, align: props.align,
    render: props.triggerTag === 'span' ? el('span', { ...triggerProps, tabIndex: 0 }) : el(Button, { variant: 'ghost', ...triggerProps }),
  }, props.trigger?.())
})
