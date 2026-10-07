import { createElement as el, type ComponentType } from 'react'
import { DropdownMenu } from '@cloudflare/kumo/components/dropdown'
import { ContextMenu } from '@cloudflare/kumo/primitives/context-menu'
import { Popover } from '@cloudflare/kumo/components/popover'
import { Button } from '@cloudflare/kumo/components/button'
import { Meter } from '@cloudflare/kumo/components/meter'
import { Collapsible } from '@cloudflare/kumo/components/collapsible'
import { normalizeClass } from 'vue'
import { bridge, type ControlProps } from './bridge'
import { domProps, reactClickEvents, updateModel, useDomEvents } from './controls'

export const KumoCollapsible = bridge('KumoCollapsible', props => el(Collapsible, {
  ...domProps(props), ...{ 'data-platform-collapsible': '' }, open: props.modelValue,
  onOpenChange: (open: boolean) => updateModel(props, open),
}, props.children))
export const KumoCollapsibleTrigger = bridge('KumoCollapsibleTrigger', props => el(Collapsible.Trigger, {
  ...domProps(props), ref: props.nativeRef, ...{ 'data-platform-collapse-trigger': '' },
}, props.children))
export const KumoCollapsiblePanel = bridge('KumoCollapsiblePanel', props => el(Collapsible.Panel, {
  ...domProps(props), keepMounted: true,
}, props.children))

export const KumoDropdown = bridge('KumoDropdown', props => el(DropdownMenu, {
  open: props.modelValue, onOpenChange: (open: boolean) => updateModel(props, open), children: props.children,
}))
export const KumoContextMenu = bridge('KumoContextMenu', props => el(ContextMenu.Root, {
  open: props.modelValue, onOpenChange: (open: boolean) => updateModel(props, open), children: props.children,
}))
export const KumoContextMenuTrigger = bridge('KumoContextMenuTrigger', props => {
  const { setElement } = useDomEvents(props)
  return el(ContextMenu.Trigger, {
    ...domProps(props), ref: setElement, render: el(Button, { variant: props.variant ?? 'ghost' }),
  }, props.children)
})
export const KumoDropdownTrigger = bridge('KumoDropdownTrigger', props => el(DropdownMenu.Trigger, {
  ...domProps(props), render: el(Button, { variant: props.variant ?? 'ghost' }), ref: props.nativeRef,
}, props.children))
export const KumoDropdownContent = bridge('KumoDropdownContent', props => el(DropdownMenu.Content, {
  ...domProps(props), align: props.align ?? 'end', sideOffset: props.sideOffset ?? 6, collisionPadding: 8,
}, props.children))
export const KumoDropdownItem = bridge('KumoDropdownItem', props => {
  const { setElement } = useDomEvents(props, true)
  const Item = props.href ? DropdownMenu.LinkItem : DropdownMenu.Item
  return el(Item as ComponentType<any>, { ...domProps(props), ...reactClickEvents(props), ref: setElement }, props.children)
})
export const KumoPopoverRoot = bridge('KumoPopoverRoot', props => el(Popover, {
  open: props.modelValue, onOpenChange: (open: boolean) => updateModel(props, open), children: props.children,
}))
export const KumoPopoverTrigger = bridge('KumoPopoverTrigger', props => {
  const { setElement } = useDomEvents(props)
  return el(Popover.Trigger, {
    ...domProps(props), render: el(Button, { variant: props.variant ?? 'ghost', ref: setElement }),
  }, props.children)
})
export const KumoPopoverContent = bridge('KumoPopoverContent', props => el(Popover.Content, {
  ...domProps(props), align: props.align ?? 'end', sideOffset: props.sideOffset ?? 6,
}, props.children))
export const KumoMeter = bridge('KumoMeter', (props: ControlProps) => el(Meter, {
  ...domProps(props), label: props.label ?? '', value: Math.max(0, Math.min(Number(props.value) || 0, Number(props.max) || 100)),
  showValue: props.showValue ?? !props.compact,
  className: `${props.compact ? 'platform-meter-compact' : ''} ${props.className ?? ''}`,
  indicatorClassName: `bg-none ${normalizeClass(props.indicatorClassName)}`,
}))
